-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_folder_contents(uuid, text);

-- Create a comprehensive RPC function that returns all folder contents
-- This replaces the fragmented logic in the TypeScript code with a single, reliable database function
CREATE OR REPLACE FUNCTION public.get_folder_contents(
  p_user_id uuid,
  p_current_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path_parts text[];
  v_depth int;
  v_user_prefix text;
  v_house_id uuid;
  v_apartment_id uuid;
  v_tenant_id uuid;
  v_uuid_pattern text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_result jsonb;
  v_folders jsonb := '[]'::jsonb;
  v_files jsonb := '[]'::jsonb;
  v_breadcrumbs jsonb := '[]'::jsonb;
  v_total_size bigint := 0;
  v_folder_record record;
  v_file_record record;
  v_breadcrumb_path text;
  v_segment text;
  v_entity_name text;
  v_breadcrumb_type text;
  i int;
BEGIN
  -- Parse path segments
  v_path_parts := string_to_array(p_current_path, '/');
  v_depth := array_length(v_path_parts, 1);
  v_user_prefix := 'user_' || p_user_id::text;
  
  -- Validate path starts with correct user prefix
  IF v_path_parts[1] != v_user_prefix THEN
    RETURN jsonb_build_object(
      'error', 'Invalid path: does not belong to user',
      'folders', '[]'::jsonb,
      'files', '[]'::jsonb,
      'breadcrumbs', '[]'::jsonb,
      'totalSize', 0
    );
  END IF;
  
  -- ============================================
  -- BUILD BREADCRUMBS
  -- ============================================
  v_breadcrumb_path := v_user_prefix;
  v_breadcrumbs := v_breadcrumbs || jsonb_build_object(
    'name', 'Cloud Storage',
    'path', v_breadcrumb_path,
    'type', 'root'
  );
  
  -- Optimization: Pre-fetch entity IDs from the path to look them up once
  -- This avoids running 3 queries for every path segment
  FOR i IN 2..v_depth LOOP
    v_segment := v_path_parts[i];
    v_breadcrumb_path := v_breadcrumb_path || '/' || v_segment;
    v_entity_name := NULL;
    
    -- Fast lookup for system names
    IF v_segment = 'Miscellaneous' THEN
      v_entity_name := 'Sonstiges';
      v_breadcrumb_type := 'category';
    ELSIF v_segment = 'house_documents' THEN
      v_entity_name := 'Hausdokumente';
      v_breadcrumb_type := 'category';
    ELSIF v_segment = 'apartment_documents' THEN
      v_entity_name := 'Wohnungsdokumente';
      v_breadcrumb_type := 'category';
    ELSIF v_segment ~ v_uuid_pattern THEN
      -- Use the depth to guide the lookup
      IF i = 2 THEN -- Should be a House
        SELECT name INTO v_entity_name FROM "Haeuser" WHERE id = v_segment::uuid AND user_id = p_user_id;
        v_breadcrumb_type := 'house';
      ELSIF i = 3 THEN -- Should be an Apartment
        SELECT name INTO v_entity_name FROM "Wohnungen" WHERE id = v_segment::uuid AND user_id = p_user_id;
        v_breadcrumb_type := 'apartment';
      ELSIF i = 4 THEN -- Should be a Tenant
        SELECT name INTO v_entity_name FROM "Mieter" WHERE id = v_segment::uuid AND user_id = p_user_id;
        v_breadcrumb_type := 'tenant';
      ELSE
        v_entity_name := v_segment;
        v_breadcrumb_type := 'category';
      END IF;
      
      -- Fallback if UUID didn't match an entity
      IF v_entity_name IS NULL THEN
        v_entity_name := v_segment;
        v_breadcrumb_type := 'category';
      END IF;
    ELSE
      v_entity_name := v_segment;
      v_breadcrumb_type := 'category';
    END IF;
    
    v_breadcrumbs := v_breadcrumbs || jsonb_build_object(
      'name', v_entity_name,
      'path', v_breadcrumb_path,
      'type', v_breadcrumb_type
    );
  END LOOP;
  
  -- ============================================
  -- GET FILES IN CURRENT PATH
  -- ============================================
  FOR v_file_record IN
    SELECT 
      id,
      dateiname as name,
      dateigroesse as size,
      mime_type,
      COALESCE(aktualisierungsdatum, erstellungsdatum, now())::text as updated_at,
      COALESCE(erstellungsdatum, now())::text as created_at,
      COALESCE(letzter_zugriff, aktualisierungsdatum, erstellungsdatum, now())::text as last_accessed_at
    FROM "Dokumente_Metadaten"
    WHERE dateipfad = p_current_path
      AND user_id = p_user_id
      AND dateiname != '.keep'
    ORDER BY dateiname ASC
  LOOP
    v_files := v_files || jsonb_build_object(
      'id', v_file_record.id,
      'name', v_file_record.name,
      'size', COALESCE(v_file_record.size, 0),
      'updated_at', v_file_record.updated_at,
      'created_at', v_file_record.created_at,
      'last_accessed_at', v_file_record.last_accessed_at,
      'metadata', jsonb_build_object('mimetype', v_file_record.mime_type, 'size', COALESCE(v_file_record.size, 0))
    );
  END LOOP;
  
  -- ============================================
  -- GET FOLDERS BASED ON CURRENT DEPTH
  -- ============================================
  
  -- DEPTH 1: Root level (user_uuid) -> Show Houses + System Folders
  IF v_depth = 1 THEN
    -- Add virtual house folders with pre-aggregated file counts
    -- Using LEFT JOIN instead of correlated subqueries for better performance
    FOR v_folder_record IN
      SELECT 
        h.id::text as id,
        h.name,
        p_current_path || '/' || h.id::text as path,
        'house' as folder_type,
        COALESCE(fc.file_count, 0) as file_count
      FROM "Haeuser" h
      LEFT JOIN (
        SELECT 
          split_part(dateipfad, '/', 2) as entity_id,
          COUNT(*) as file_count
        FROM "Dokumente_Metadaten"
        WHERE dateipfad LIKE p_current_path || '/%'
          AND user_id = p_user_id 
          AND dateiname != '.keep'
        GROUP BY split_part(dateipfad, '/', 2)
      ) fc ON fc.entity_id = h.id::text
      WHERE h.user_id = p_user_id
      ORDER BY h.name ASC
    LOOP
      v_folders := v_folders || jsonb_build_object(
        'name', v_folder_record.id,
        'path', v_folder_record.path,
        'type', v_folder_record.folder_type,
        'isEmpty', v_folder_record.file_count = 0,
        'children', '[]'::jsonb,
        'fileCount', v_folder_record.file_count,
        'displayName', v_folder_record.name
      );
    END LOOP;
    
    -- Add house_documents system folder
    v_folders := v_folders || jsonb_build_object(
      'name', 'house_documents',
      'path', p_current_path || '/house_documents',
      'type', 'category',
      'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" 
                            WHERE dateipfad = p_current_path || '/house_documents' 
                            AND user_id = p_user_id AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" 
                    WHERE dateipfad = p_current_path || '/house_documents' 
                    AND user_id = p_user_id AND dateiname != '.keep'),
      'displayName', 'Hausdokumente'
    );
    
    -- Add Miscellaneous system folder
    v_folders := v_folders || jsonb_build_object(
      'name', 'Miscellaneous',
      'path', p_current_path || '/Miscellaneous',
      'type', 'category',
      'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" 
                            WHERE dateipfad = p_current_path || '/Miscellaneous' 
                            AND user_id = p_user_id AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" 
                    WHERE dateipfad = p_current_path || '/Miscellaneous' 
                    AND user_id = p_user_id AND dateiname != '.keep'),
      'displayName', 'Sonstiges'
    );
  
  -- DEPTH 2: House level (user_uuid/house_uuid) -> Show Apartments + house_documents
  ELSIF v_depth = 2 AND v_path_parts[2] ~ v_uuid_pattern THEN
    v_house_id := v_path_parts[2]::uuid;
    
    -- Verify house belongs to user
    IF EXISTS(SELECT 1 FROM "Haeuser" WHERE id = v_house_id AND user_id = p_user_id) THEN
      -- Add house_documents folder
      v_folders := v_folders || jsonb_build_object(
        'name', 'house_documents',
        'path', p_current_path || '/house_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" 
                              WHERE dateipfad = p_current_path || '/house_documents' 
                              AND user_id = p_user_id AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" 
                      WHERE dateipfad = p_current_path || '/house_documents' 
                      AND user_id = p_user_id AND dateiname != '.keep'),
        'displayName', 'Hausdokumente'
      );
      
      -- Add virtual apartment folders with pre-aggregated file counts
      FOR v_folder_record IN
        SELECT 
          w.id::text as id,
          w.name,
          p_current_path || '/' || w.id::text as path,
          'apartment' as folder_type,
          COALESCE(fc.file_count, 0) as file_count
        FROM "Wohnungen" w
        LEFT JOIN (
          SELECT 
            split_part(dateipfad, '/', 3) as entity_id,
            COUNT(*) as file_count
          FROM "Dokumente_Metadaten"
          WHERE dateipfad LIKE p_current_path || '/%'
            AND user_id = p_user_id 
            AND dateiname != '.keep'
          GROUP BY split_part(dateipfad, '/', 3)
        ) fc ON fc.entity_id = w.id::text
        WHERE w.haus_id = v_house_id AND w.user_id = p_user_id
        ORDER BY w.name ASC
      LOOP
        v_folders := v_folders || jsonb_build_object(
          'name', v_folder_record.id,
          'path', v_folder_record.path,
          'type', v_folder_record.folder_type,
          'isEmpty', v_folder_record.file_count = 0,
          'children', '[]'::jsonb,
          'fileCount', v_folder_record.file_count,
          'displayName', v_folder_record.name
        );
      END LOOP;
    END IF;
  
  -- DEPTH 3: Apartment level (user_uuid/house_uuid/apartment_uuid) -> Show Tenants + apartment_documents
  ELSIF v_depth = 3 AND v_path_parts[2] ~ v_uuid_pattern AND v_path_parts[3] ~ v_uuid_pattern THEN
    v_house_id := v_path_parts[2]::uuid;
    v_apartment_id := v_path_parts[3]::uuid;
    
    -- Verify apartment belongs to user and house
    IF EXISTS(SELECT 1 FROM "Wohnungen" WHERE id = v_apartment_id AND haus_id = v_house_id AND user_id = p_user_id) THEN
      -- Add apartment_documents folder
      v_folders := v_folders || jsonb_build_object(
        'name', 'apartment_documents',
        'path', p_current_path || '/apartment_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" 
                              WHERE dateipfad = p_current_path || '/apartment_documents' 
                              AND user_id = p_user_id AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" 
                      WHERE dateipfad = p_current_path || '/apartment_documents' 
                      AND user_id = p_user_id AND dateiname != '.keep'),
        'displayName', 'Wohnungsdokumente'
      );
      
      -- Add virtual tenant folders with pre-aggregated file counts
      FOR v_folder_record IN
        SELECT 
          m.id::text as id,
          m.name,
          p_current_path || '/' || m.id::text as path,
          'tenant' as folder_type,
          COALESCE(fc.file_count, 0) as file_count
        FROM "Mieter" m
        LEFT JOIN (
          SELECT 
            split_part(dateipfad, '/', 4) as entity_id,
            COUNT(*) as file_count
          FROM "Dokumente_Metadaten"
          WHERE dateipfad LIKE p_current_path || '/%'
            AND user_id = p_user_id 
            AND dateiname != '.keep'
          GROUP BY split_part(dateipfad, '/', 4)
        ) fc ON fc.entity_id = m.id::text
        WHERE m.wohnung_id = v_apartment_id AND m.user_id = p_user_id
        ORDER BY m.name ASC
      LOOP
        v_folders := v_folders || jsonb_build_object(
          'name', v_folder_record.id,
          'path', v_folder_record.path,
          'type', v_folder_record.folder_type,
          'isEmpty', v_folder_record.file_count = 0,
          'children', '[]'::jsonb,
          'fileCount', v_folder_record.file_count,
          'displayName', COALESCE(v_folder_record.name, v_folder_record.id)
        );
      END LOOP;
    END IF;
  END IF;
  
  -- ============================================
  -- DISCOVER CUSTOM STORAGE FOLDERS (at any depth)
  -- These are folders created by users that exist in the metadata table
  -- Optimization: Use a single CTE to find all unique sub-folders one level deeper
  -- ============================================
  FOR v_folder_record IN
    WITH folder_stats AS (
      -- Get paths that are exactly one level deeper than current path
      SELECT 
        dateipfad,
        COUNT(*) filter (where dateiname != '.keep') as direct_file_count
      FROM "Dokumente_Metadaten"
      WHERE dateipfad LIKE p_current_path || '/%'
        AND user_id = p_user_id
      GROUP BY dateipfad
    ),
    immediate_subfolders AS (
      SELECT DISTINCT
        split_part(substring(dateipfad from length(p_current_path) + 2), '/', 1) as folder_name,
        dateipfad as target_path,
        direct_file_count
      FROM folder_stats
      WHERE length(dateipfad) > length(p_current_path) + 1
    ),
    aggregated_subfolders AS (
      SELECT 
        folder_name,
        p_current_path || '/' || folder_name as path,
        SUM(direct_file_count) filter (where target_path = p_current_path || '/' || folder_name) as file_count
      FROM immediate_subfolders
      WHERE folder_name != ''
      GROUP BY folder_name
    )
    SELECT 
      *
    FROM aggregated_subfolders
    WHERE folder_name NOT IN ('Miscellaneous', 'house_documents', 'apartment_documents')
      -- Exclude folders that are already added (houses, apartments, tenants by UUID)
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_folders) f 
        WHERE f->>'name' = folder_name
      )
  LOOP
    v_folders := v_folders || jsonb_build_object(
      'name', v_folder_record.folder_name,
      'path', v_folder_record.path,
      'type', 'storage',
      'isEmpty', COALESCE(v_folder_record.file_count, 0) = 0,
      'children', '[]'::jsonb,
      'fileCount', COALESCE(v_folder_record.file_count, 0),
      'displayName', v_folder_record.folder_name
    );
  END LOOP;
  
  -- ============================================
  -- CALCULATE TOTAL STORAGE SIZE
  -- ============================================
  -- This query is fast with individual index on user_id
  SELECT COALESCE(SUM(dateigroesse), 0) INTO v_total_size
  FROM "Dokumente_Metadaten"
  WHERE user_id = p_user_id;
  
  -- ============================================
  -- BUILD FINAL RESULT
  -- ============================================
  v_result := jsonb_build_object(
    'folders', v_folders,
    'files', v_files,
    'breadcrumbs', v_breadcrumbs,
    'totalSize', v_total_size,
    'error', null
  );
  
  RETURN v_result;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_folder_contents(uuid, text) IS 
'Unified RPC function for document navigation. Returns all folders (virtual and storage), 
files in the current path, breadcrumbs, and total storage size in a single call.
Virtual folders are created for Houses, Apartments, and Tenants based on the current depth.
Custom storage folders discovered from the Dokumente_Metadaten table are also included.';
