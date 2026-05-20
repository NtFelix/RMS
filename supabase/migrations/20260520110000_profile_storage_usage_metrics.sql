-- Migration: Profile Storage Usage and Document Count Caching
-- Adds pre-calculated columns to profiles and maintains them via database triggers on Dokumente_Metadaten.
-- Optimizes calculate_storage_usage() and get_folder_contents() to read from the cached profile metrics.

-- 1. Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_count bigint NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_usage bigint NOT NULL DEFAULT 0;

-- 2. Backfill existing profiles
UPDATE public.profiles p
SET 
  document_count = COALESCE((
    SELECT count(*) 
    FROM public."Dokumente_Metadaten" d 
    WHERE d.user_id = p.id AND d.dateiname != '.keep'
  ), 0),
  storage_usage = COALESCE((
    SELECT sum(d.dateigroesse) 
    FROM public."Dokumente_Metadaten" d 
    WHERE d.user_id = p.id
  ), 0);

-- 3. Create or replace trigger function
CREATE OR REPLACE FUNCTION public.update_profile_storage_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Handle INSERT/UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    v_user_id := NEW.user_id;
    IF v_user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET 
        document_count = COALESCE((
          SELECT count(*) 
          FROM public."Dokumente_Metadaten" 
          WHERE user_id = v_user_id AND dateiname != '.keep'
        ), 0),
        storage_usage = COALESCE((
          SELECT sum(dateigroesse) 
          FROM public."Dokumente_Metadaten" 
          WHERE user_id = v_user_id
        ), 0)
      WHERE id = v_user_id;
    END IF;
  END IF;

  -- Handle UPDATE (where user_id changes) or DELETE
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id)) THEN
      v_user_id := OLD.user_id;
      IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
          document_count = COALESCE((
            SELECT count(*) 
            FROM public."Dokumente_Metadaten" 
            WHERE user_id = v_user_id AND dateiname != '.keep'
          ), 0),
          storage_usage = COALESCE((
            SELECT sum(dateigroesse) 
            FROM public."Dokumente_Metadaten" 
            WHERE user_id = v_user_id
          ), 0)
        WHERE id = v_user_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS update_profile_storage_metrics_trigger ON public."Dokumente_Metadaten";

CREATE TRIGGER update_profile_storage_metrics_trigger
AFTER INSERT OR UPDATE OR DELETE ON public."Dokumente_Metadaten"
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_storage_metrics();

-- 5. Optimize calculate_storage_usage() RPC
CREATE OR REPLACE FUNCTION public.calculate_storage_usage()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  total_size bigint;
  v_uid uuid := auth.uid();
begin
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  select coalesce(storage_usage, 0)
  into total_size
  from public.profiles
  where id = v_uid;
  
  return total_size;
end;
$$;

-- 6. Optimize get_folder_contents() RPC
CREATE OR REPLACE FUNCTION public.get_folder_contents(p_current_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Parse path segments
  v_path_parts := string_to_array(p_current_path, '/');
  v_depth := array_length(v_path_parts, 1);
  v_user_prefix := 'user_' || v_uid::text;
  
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
  
  -- BUILD BREADCRUMBS
  v_breadcrumb_path := v_user_prefix;
  v_breadcrumbs := v_breadcrumbs || jsonb_build_object(
    'name', 'Cloud Storage',
    'path', v_breadcrumb_path,
    'type', 'root'
  );
  
  FOR i IN 2..v_depth LOOP
    v_segment := v_path_parts[i];
    v_breadcrumb_path := v_breadcrumb_path || '/' || v_segment;
    v_entity_name := NULL;
    
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
      IF i = 2 THEN -- House
        SELECT name INTO v_entity_name FROM public."Haeuser" WHERE id = v_segment::uuid AND user_id = v_uid;
        v_breadcrumb_type := 'house';
      ELSIF i = 3 THEN -- Apartment
        SELECT name INTO v_entity_name FROM public."Wohnungen" WHERE id = v_segment::uuid AND user_id = v_uid;
        v_breadcrumb_type := 'apartment';
      ELSIF i = 4 THEN -- Tenant
        SELECT name INTO v_entity_name FROM public."Mieter" WHERE id = v_segment::uuid AND user_id = v_uid;
        v_breadcrumb_type := 'tenant';
      ELSE
        v_entity_name := v_segment;
        v_breadcrumb_type := 'category';
      END IF;
      
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
  
  -- GET FILES IN CURRENT PATH
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', dateiname,
    'size', COALESCE(dateigroesse, 0),
    'updated_at', COALESCE(aktualisierungsdatum, erstellungsdatum, now())::text,
    'created_at', COALESCE(erstellungsdatum, now())::text,
    'last_accessed_at', COALESCE(letzter_zugriff, aktualisierungsdatum, erstellungsdatum, now())::text,
    'metadata', jsonb_build_object('mimetype', mime_type, 'size', COALESCE(dateigroesse, 0))
  ) ORDER BY dateiname ASC), '[]'::jsonb)
  INTO v_files
  FROM public."Dokumente_Metadaten"
  WHERE dateipfad = p_current_path
    AND user_id = v_uid
    AND dateiname != '.keep';
  
  -- GET FOLDERS
  IF v_depth = 1 THEN
    -- Virtual Folders for Depth 1
    SELECT COALESCE(jsonb_agg(folder_obj), '[]'::jsonb) INTO v_folders
    FROM (
      SELECT jsonb_build_object(
        'name', h.id::text,
        'path', p_current_path || '/' || h.id::text,
        'type', 'house',
        'isEmpty', COALESCE(fc.file_count, 0) = 0,
        'children', '[]'::jsonb,
        'fileCount', COALESCE(fc.file_count, 0),
        'displayName', h.name
      ) as folder_obj
      FROM public."Haeuser" h
      LEFT JOIN (
        SELECT 
          split_part(dateipfad, '/', 2) as entity_id,
          COUNT(*) as file_count
        FROM public."Dokumente_Metadaten"
        WHERE dateipfad LIKE p_current_path || '/%'
          AND user_id = v_uid 
          AND dateiname != '.keep'
        GROUP BY split_part(dateipfad, '/', 2)
      ) fc ON fc.entity_id = h.id::text
      WHERE h.user_id = v_uid
      ORDER BY h.name ASC
    ) sub;

    v_folders := v_folders || jsonb_build_object(
      'name', 'house_documents',
      'path', p_current_path || '/house_documents',
      'type', 'category',
      'isEmpty', NOT EXISTS(SELECT 1 FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
      'displayName', 'Hausdokumente'
    );
    
    v_folders := v_folders || jsonb_build_object(
      'name', 'Miscellaneous',
      'path', p_current_path || '/Miscellaneous',
      'type', 'category',
      'isEmpty', NOT EXISTS(SELECT 1 FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/Miscellaneous' AND user_id = v_uid AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/Miscellaneous' AND user_id = v_uid AND dateiname != '.keep'),
      'displayName', 'Sonstiges'
    );
  
  ELSIF v_depth = 2 AND v_path_parts[2] ~ v_uuid_pattern THEN
    v_house_id := v_path_parts[2]::uuid;
    IF EXISTS(SELECT 1 FROM public."Haeuser" WHERE id = v_house_id AND user_id = v_uid) THEN
      v_folders := v_folders || jsonb_build_object(
        'name', 'house_documents',
        'path', p_current_path || '/house_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'displayName', 'Hausdokumente'
      );
      
      v_folders := v_folders || (
        SELECT COALESCE(jsonb_agg(folder_obj), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'name', w.id::text,
            'path', p_current_path || '/' || w.id::text,
            'type', 'apartment',
            'isEmpty', COALESCE(fc.file_count, 0) = 0,
            'children', '[]'::jsonb,
            'fileCount', COALESCE(fc.file_count, 0),
            'displayName', w.name
          ) as folder_obj
          FROM public."Wohnungen" w
          LEFT JOIN (
            SELECT 
              split_part(dateipfad, '/', 3) as entity_id,
              COUNT(*) as file_count
            FROM public."Dokumente_Metadaten"
            WHERE dateipfad LIKE p_current_path || '/%'
              AND user_id = v_uid 
              AND dateiname != '.keep'
            GROUP BY split_part(dateipfad, '/', 3)
          ) fc ON fc.entity_id = w.id::text
          WHERE w.haus_id = v_house_id AND w.user_id = v_uid
          ORDER BY w.name ASC
        ) sub
      );
    END IF;
  
  ELSIF v_depth = 3 AND v_path_parts[2] ~ v_uuid_pattern AND v_path_parts[3] ~ v_uuid_pattern THEN
    v_house_id := v_path_parts[2]::uuid;
    v_apartment_id := v_path_parts[3]::uuid;
    IF EXISTS(SELECT 1 FROM public."Wohnungen" WHERE id = v_apartment_id AND haus_id = v_house_id AND user_id = v_uid) THEN
      v_folders := v_folders || jsonb_build_object(
        'name', 'apartment_documents',
        'path', p_current_path || '/apartment_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/apartment_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM public."Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/apartment_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'displayName', 'Wohnungsdokumente'
      );
      
      v_folders := v_folders || (
        SELECT COALESCE(jsonb_agg(folder_obj), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'name', m.id::text,
            'path', p_current_path || '/' || m.id::text,
            'type', 'tenant',
            'isEmpty', COALESCE(fc.file_count, 0) = 0,
            'children', '[]'::jsonb,
            'fileCount', COALESCE(fc.file_count, 0),
            'displayName', COALESCE(m.name, m.id::text)
          ) as folder_obj
          FROM public."Mieter" m
          LEFT JOIN (
            SELECT 
              split_part(dateipfad, '/', 4) as entity_id,
              COUNT(*) as file_count
            FROM public."Dokumente_Metadaten"
            WHERE dateipfad LIKE p_current_path || '/%'
              AND user_id = v_uid 
              AND dateiname != '.keep'
            GROUP BY split_part(dateipfad, '/', 4)
          ) fc ON fc.entity_id = m.id::text
          WHERE m.wohnung_id = v_apartment_id AND m.user_id = v_uid
          ORDER BY m.name ASC
        ) sub
      );
    END IF;
  END IF;
  
  -- DISCOVER CUSTOM STORAGE FOLDERS (Recursive File Count & jsonb_agg)
  v_folders := v_folders || (
    WITH folder_stats AS (
      SELECT 
        dateipfad,
        COUNT(*) filter (where dateiname != '.keep') as direct_file_count
      FROM public."Dokumente_Metadaten"
      WHERE dateipfad LIKE p_current_path || '/%'
        AND user_id = v_uid
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
        SUM(direct_file_count) as file_count -- REMOVED FILTER: Recursive count across all sub-paths
      FROM immediate_subfolders
      WHERE folder_name != ''
      GROUP BY folder_name
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', folder_name,
      'path', path,
      'type', 'storage',
      'isEmpty', COALESCE(file_count, 0) = 0,
      'children', '[]'::jsonb,
      'fileCount', COALESCE(file_count, 0),
      'displayName', folder_name
    )), '[]'::jsonb)
    FROM aggregated_subfolders
    WHERE folder_name NOT IN ('Miscellaneous', 'house_documents', 'apartment_documents')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_folders) f WHERE f->>'name' = folder_name)
  );
  
  -- Fetch total size from profiles (optimized)
  SELECT COALESCE(storage_usage, 0) INTO v_total_size
  FROM public.profiles
  WHERE id = v_uid;
  
  RETURN jsonb_build_object(
    'folders', v_folders,
    'files', v_files,
    'breadcrumbs', v_breadcrumbs,
    'totalSize', v_total_size,
    'error', null
  );
END;
$$;
