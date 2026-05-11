-- Migration: Phase 2 Security Hardening for RPC and Infrastructure
-- 1. Restricts PGMQ access to service_role only.
-- 2. Hardens the second batch of high-risk RPC functions.

-- ============================================================================
-- 1. PGMQ SECURITY RESTRICTION
-- ============================================================================

-- Revoke public and authenticated access from PGMQ functions
REVOKE EXECUTE ON FUNCTION public.pgmq_send(text, jsonb, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pgmq_send(text, jsonb, integer) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.pgmq_read(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pgmq_read(text, integer, integer) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.pgmq_delete(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pgmq_delete(text, bigint) FROM authenticated;

-- Ensure service_role still has access
GRANT EXECUTE ON FUNCTION public.pgmq_send(text, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_read(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_delete(text, bigint) TO service_role;

-- Create a secure wrapper for sending messages that the frontend CAN call.
CREATE OR REPLACE FUNCTION public.send_applicant_processing_message(p_mail_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_msg_id bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the mail belongs to the user before queueing
  IF NOT EXISTS (SELECT 1 FROM "Mail_Metadaten" WHERE id = p_mail_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Mail not found or access denied';
  END IF;

  -- Send to queue using the restricted pgmq_send function
  SELECT pgmq_send(
    'applicant_ai_processing',
    jsonb_build_object(
      'mail_id', p_mail_id,
      'user_id', v_uid,
      'created_at', now()
    )
  ) INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- ============================================================================
-- 2. RPC IDENTITY HARDENING (BATCH 2)
-- ============================================================================

-- Drop old functions with user_id parameters
DROP FUNCTION IF EXISTS public.get_ablesungen_for_zaehler(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_abrechnung_calculation_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_abrechnung_modal_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_zaehler_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_zaehler_for_haus(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_folder_contents(uuid, text);
DROP FUNCTION IF EXISTS public.get_virtual_folders(uuid, text);
DROP FUNCTION IF EXISTS public.get_meter_modal_data(uuid, uuid, text[]);
DROP FUNCTION IF EXISTS public.get_email_import_stats(uuid);
DROP FUNCTION IF EXISTS public.queue_email_import(uuid, uuid, uuid, text, integer);

-- 2.1 get_ablesungen_for_zaehler
CREATE OR REPLACE FUNCTION public.get_ablesungen_for_zaehler(zaehler_id_param uuid)
 RETURNS TABLE(zaehler_data jsonb, readings jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH meter_info AS (
    SELECT jsonb_build_object(
      'id', z.id,
      'custom_id', z.custom_id,
      'wohnung_id', z.wohnung_id,
      'erstellungsdatum', z.erstellungsdatum,
      'eichungsdatum', z.eichungsdatum,
      'ist_aktiv', z.ist_aktiv,
      'zaehler_typ', z.zaehler_typ,
      'einheit', z.einheit,
      'Wohnungen', jsonb_build_object(
        'name', w.name,
        'groesse', w.groesse,
        'Haeuser', jsonb_build_object('name', h.name)
      )
    ) as data
    FROM "Zaehler" z
    LEFT JOIN "Wohnungen" w ON z.wohnung_id = w.id AND w.user_id = v_uid
    LEFT JOIN "Haeuser" h ON w.haus_id = h.id AND h.user_id = v_uid
    WHERE z.id = zaehler_id_param
      AND z.user_id = v_uid
  ),
  readings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'ablese_datum', a.ablese_datum,
        'zaehlerstand', a.zaehlerstand,
        'verbrauch', a.verbrauch,
        'user_id', a.user_id,
        'zaehler_id', a.zaehler_id,
        'kommentar', a.kommentar
      ) ORDER BY a.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" a
    WHERE a.zaehler_id = zaehler_id_param
      AND a.user_id = v_uid
  )
  SELECT 
    (SELECT data FROM meter_info) as zaehler_data,
    (SELECT data FROM readings_data) as readings;
END;
$$;

-- 2.2 get_abrechnung_calculation_data
CREATE OR REPLACE FUNCTION public.get_abrechnung_calculation_data(nebenkosten_id uuid)
 RETURNS TABLE(nebenkosten_data jsonb, tenants_with_occupancy jsonb, rechnungen jsonb, wasserzaehler_readings jsonb, wasserzaehler_meters jsonb, house_metrics jsonb, calculation_metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    target_haus_id UUID;
    start_datum DATE;
    end_datum DATE;
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get nebenkosten details
    SELECT n.haeuser_id, n.startdatum, n.enddatum
    INTO target_haus_id, start_datum, end_datum
    FROM "Nebenkosten" n
    WHERE n.id = nebenkosten_id 
    AND n.user_id = v_uid;

    IF target_haus_id IS NULL THEN
        RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
    END IF;

    RETURN QUERY
    WITH nebenkosten_info AS (
        SELECT jsonb_build_object(
            'id', n.id,
            'startdatum', n.startdatum,
            'enddatum', n.enddatum,
            'nebenkostenart', n.nebenkostenart,
            'betrag', n.betrag,
            'berechnungsart', n.berechnungsart,
            'zaehlerkosten', n.zaehlerkosten,
            'zaehlerverbrauch', n.zaehlerverbrauch,
            'haeuser_id', n.haeuser_id,
            'vorauszahlungs_art', n.vorauszahlungs_art
        ) as data
        FROM "Nebenkosten" n
        WHERE n.id = nebenkosten_id
    ),
    tenants_json AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'wohnung_id', m.wohnung_id,
                'einzug', m.einzug,
                'auszug', m.auszug,
                'nebenkosten', m.nebenkosten,
                'Wohnungen', jsonb_build_object('groesse', w.groesse, 'miete', w.miete),
                'occupancy', jsonb_build_object(
                    'totalDaysInPeriod', (n.enddatum - n.startdatum) + 1
                )
            )
        ) as data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
        CROSS JOIN "Nebenkosten" n
        WHERE w.haus_id = target_haus_id AND n.id = nebenkosten_id
          AND m.user_id = v_uid
          AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
          AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
    ),
    rechnungen_info AS (
        SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) as data
        FROM "Rechnungen" r
        WHERE r.nebenkosten_id = nebenkosten_id
          AND r.user_id = v_uid
    ),
    house_summary AS (
        SELECT jsonb_build_object(
            'totalArea', COALESCE(h.groesse, (SELECT SUM(groesse) FROM "Wohnungen" WHERE haus_id = target_haus_id AND user_id = v_uid))
        ) as data
        FROM "Haeuser" h
        WHERE h.id = target_haus_id AND h.user_id = v_uid
    ),
    relevant_meters AS (
        SELECT COALESCE(jsonb_agg(wz), '[]'::jsonb) as data
        FROM "Zaehler" wz
        WHERE wz.user_id = v_uid AND wz.wohnung_id IN (
            SELECT m.wohnung_id
            FROM "Mieter" m
            JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
            WHERE w.haus_id = target_haus_id AND m.user_id = v_uid
        )
    ),
    relevant_readings AS (
        SELECT COALESCE(jsonb_agg(wa), '[]'::jsonb) as data
        FROM "Zaehler_Ablesungen" wa
        WHERE wa.user_id = v_uid AND wa.ablese_datum >= start_datum AND wa.ablese_datum <= end_datum
    )
    SELECT
        (SELECT data FROM nebenkosten_info) as nebenkosten_data,
        (SELECT data FROM tenants_json) as tenants_with_occupancy,
        (SELECT data FROM rechnungen_info) as rechnungen,
        (SELECT data FROM relevant_readings) as wasserzaehler_readings,
        (SELECT data FROM relevant_meters) as wasserzaehler_meters,
        (SELECT data FROM house_summary) as house_metrics,
        jsonb_build_object('optimized', true) as calculation_metadata;
END;
$$;

-- 2.3 get_abrechnung_modal_data
CREATE OR REPLACE FUNCTION public.get_abrechnung_modal_data(nebenkosten_id uuid)
 RETURNS TABLE(nebenkosten_data jsonb, tenants jsonb, rechnungen jsonb, meters jsonb, readings jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  target_haus_id UUID;
  start_datum DATE;
  end_datum DATE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get nebenkosten details
  SELECT n.haeuser_id, n.startdatum, n.enddatum
  INTO target_haus_id, start_datum, end_datum
  FROM "Nebenkosten" n
  WHERE n.id = nebenkosten_id
    AND n.user_id = v_uid;

  IF target_haus_id IS NULL THEN
    RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
  END IF;

  RETURN QUERY
  WITH nebenkosten_with_house AS (
    SELECT jsonb_build_object(
      'id', n.id,
      'startdatum', n.startdatum,
      'enddatum', n.enddatum,
      'nebenkostenart', n.nebenkostenart,
      'betrag', n.betrag,
      'berechnungsart', n.berechnungsart,
      'zaehlerkosten', n.zaehlerkosten,
      'zaehlerverbrauch', n.zaehlerverbrauch,
      'haeuser_id', n.haeuser_id,
      'user_id', n.user_id,
      'vorauszahlungs_art', n.vorauszahlungs_art,
      'Haeuser', jsonb_build_object('name', h.name),
      'gesamtFlaeche', h.groesse
    ) as data
    FROM "Nebenkosten" n
    LEFT JOIN "Haeuser" h ON n.haeuser_id = h.id AND h.user_id = v_uid
    WHERE n.id = nebenkosten_id
      AND n.user_id = v_uid
  ),
  relevant_tenants AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'wohnung_id', m.wohnung_id,
        'einzug', m.einzug,
        'auszug', m.auszug,
        'nebenkosten', m.nebenkosten,
        'Wohnungen', jsonb_build_object(
          'name', w.name,
          'groesse', w.groesse,
          'miete', w.miete
        )
      )
    ) as data
    FROM "Mieter" m
    JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
    WHERE w.haus_id = target_haus_id
      AND m.user_id = v_uid
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  relevant_rechnungen AS (
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) as data
    FROM "Rechnungen" r
    WHERE r.nebenkosten_id = nebenkosten_id
      AND r.user_id = v_uid
  ),
  relevant_meters AS (
    SELECT COALESCE(jsonb_agg(wz), '[]'::jsonb) as data
    FROM "Zaehler" wz
    WHERE wz.user_id = v_uid AND wz.wohnung_id IN (
        SELECT m.wohnung_id 
        FROM "Mieter" m 
        JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
        WHERE w.haus_id = target_haus_id AND m.user_id = v_uid
    )
  ),
  relevant_readings AS (
    SELECT COALESCE(jsonb_agg(wa), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.user_id = v_uid AND wa.ablese_datum >= start_datum AND wa.ablese_datum <= end_datum
  )
  SELECT
    (SELECT data FROM nebenkosten_with_house) as nebenkosten_data,
    (SELECT data FROM relevant_tenants) as tenants,
    (SELECT data FROM relevant_rechnungen) as rechnungen,
    (SELECT data FROM relevant_meters) as meters,
    (SELECT data FROM relevant_readings) as readings;
END;
$$;

-- 2.4 get_zaehler_data
CREATE OR REPLACE FUNCTION public.get_zaehler_data(wohnung_id_param uuid)
 RETURNS TABLE(wohnung_data jsonb, meters jsonb, readings jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH apartment_data AS (
    SELECT jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'groesse', w.groesse,
      'miete', w.miete,
      'haus_id', w.haus_id,
      'Haeuser', jsonb_build_object('name', h.name)
    ) as data
    FROM "Wohnungen" w
    LEFT JOIN "Haeuser" h ON w.haus_id = h.id AND h.user_id = v_uid
    WHERE w.id = wohnung_id_param
      AND w.user_id = v_uid
  ),
  meters_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', z.id,
        'custom_id', z.custom_id,
        'wohnung_id', z.wohnung_id,
        'erstellungsdatum', z.erstellungsdatum,
        'eichungsdatum', z.eichungsdatum,
        'user_id', z.user_id,
        'ist_aktiv', z.ist_aktiv,
        'zaehler_typ', z.zaehler_typ,
        'einheit', z.einheit
      ) ORDER BY z.zaehler_typ, z.custom_id
    ), '[]'::jsonb) as data
    FROM "Zaehler" z
    WHERE z.wohnung_id = wohnung_id_param
      AND z.user_id = v_uid
  ),
  readings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'ablese_datum', a.ablese_datum,
        'zaehlerstand', a.zaehlerstand,
        'verbrauch', a.verbrauch,
        'user_id', a.user_id,
        'zaehler_id', a.zaehler_id,
        'kommentar', a.kommentar
      ) ORDER BY a.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" a
    JOIN "Zaehler" z ON a.zaehler_id = z.id AND z.user_id = v_uid
    WHERE z.wohnung_id = wohnung_id_param
      AND a.user_id = v_uid
  )
  SELECT 
    (SELECT data FROM apartment_data) as wohnung_data,
    (SELECT data FROM meters_data) as meters,
    (SELECT data FROM readings_data) as readings;
END;
$$;

-- 2.5 get_zaehler_for_haus
CREATE OR REPLACE FUNCTION public.get_zaehler_for_haus(haus_id_param uuid)
 RETURNS TABLE(wohnungen jsonb, meters jsonb, readings jsonb, mieter jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH apartments AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'groesse', w.groesse,
        'miete', w.miete,
        'haus_id', w.haus_id
      ) ORDER BY w.name
    ) as data
    FROM "Wohnungen" w
    WHERE w.haus_id = haus_id_param
      AND w.user_id = v_uid
  ),
  meters_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', z.id,
        'custom_id', z.custom_id,
        'wohnung_id', z.wohnung_id,
        'erstellungsdatum', z.erstellungsdatum,
        'eichungsdatum', z.eichungsdatum,
        'user_id', z.user_id,
        'ist_aktiv', z.ist_aktiv,
        'zaehler_typ', z.zaehler_typ,
        'einheit', z.einheit
      ) ORDER BY z.zaehler_typ, z.custom_id
    ), '[]'::jsonb) as data
    FROM "Zaehler" z
    JOIN "Wohnungen" w ON z.wohnung_id = w.id AND w.user_id = v_uid
    WHERE w.haus_id = haus_id_param
      AND z.user_id = v_uid
  ),
  readings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'ablese_datum', a.ablese_datum,
        'zaehlerstand', a.zaehlerstand,
        'verbrauch', a.verbrauch,
        'user_id', a.user_id,
        'zaehler_id', a.zaehler_id,
        'kommentar', a.kommentar
      ) ORDER BY a.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" a
    JOIN "Zaehler" z ON a.zaehler_id = z.id AND z.user_id = v_uid
    JOIN "Wohnungen" w ON z.wohnung_id = w.id AND w.user_id = v_uid
    WHERE w.haus_id = haus_id_param
      AND a.user_id = v_uid
  ),
  tenants AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'wohnung_id', m.wohnung_id,
        'einzug', m.einzug,
        'auszug', m.auszug
      ) ORDER BY m.name
    ), '[]'::jsonb) as data
    FROM "Mieter" m
    JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
    WHERE w.haus_id = haus_id_param
      AND m.user_id = v_uid
  )
  SELECT 
    (SELECT data FROM apartments) as wohnungen,
    (SELECT data FROM meters_data) as meters,
    (SELECT data FROM readings_data) as readings,
    (SELECT data FROM tenants) as mieter;
END;
$$;

-- 2.6 get_folder_contents
CREATE OR REPLACE FUNCTION public.get_folder_contents(p_current_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
        SELECT name INTO v_entity_name FROM "Haeuser" WHERE id = v_segment::uuid AND user_id = v_uid;
        v_breadcrumb_type := 'house';
      ELSIF i = 3 THEN -- Apartment
        SELECT name INTO v_entity_name FROM "Wohnungen" WHERE id = v_segment::uuid AND user_id = v_uid;
        v_breadcrumb_type := 'apartment';
      ELSIF i = 4 THEN -- Tenant
        SELECT name INTO v_entity_name FROM "Mieter" WHERE id = v_segment::uuid AND user_id = v_uid;
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
  FROM "Dokumente_Metadaten"
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
      FROM "Haeuser" h
      LEFT JOIN (
        SELECT 
          split_part(dateipfad, '/', 2) as entity_id,
          COUNT(*) as file_count
        FROM "Dokumente_Metadaten"
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
      'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
      'displayName', 'Hausdokumente'
    );
    
    v_folders := v_folders || jsonb_build_object(
      'name', 'Miscellaneous',
      'path', p_current_path || '/Miscellaneous',
      'type', 'category',
      'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/Miscellaneous' AND user_id = v_uid AND dateiname != '.keep'),
      'children', '[]'::jsonb,
      'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/Miscellaneous' AND user_id = v_uid AND dateiname != '.keep'),
      'displayName', 'Sonstiges'
    );
  
  ELSIF v_depth = 2 AND v_path_parts[2] ~ v_uuid_pattern THEN
    v_house_id := v_path_parts[2]::uuid;
    IF EXISTS(SELECT 1 FROM "Haeuser" WHERE id = v_house_id AND user_id = v_uid) THEN
      v_folders := v_folders || jsonb_build_object(
        'name', 'house_documents',
        'path', p_current_path || '/house_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/house_documents' AND user_id = v_uid AND dateiname != '.keep'),
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
          FROM "Wohnungen" w
          LEFT JOIN (
            SELECT 
              split_part(dateipfad, '/', 3) as entity_id,
              COUNT(*) as file_count
            FROM "Dokumente_Metadaten"
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
    IF EXISTS(SELECT 1 FROM "Wohnungen" WHERE id = v_apartment_id AND haus_id = v_house_id AND user_id = v_uid) THEN
      v_folders := v_folders || jsonb_build_object(
        'name', 'apartment_documents',
        'path', p_current_path || '/apartment_documents',
        'type', 'category',
        'isEmpty', NOT EXISTS(SELECT 1 FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/apartment_documents' AND user_id = v_uid AND dateiname != '.keep'),
        'children', '[]'::jsonb,
        'fileCount', (SELECT COUNT(*) FROM "Dokumente_Metadaten" WHERE dateipfad = p_current_path || '/apartment_documents' AND user_id = v_uid AND dateiname != '.keep'),
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
          FROM "Mieter" m
          LEFT JOIN (
            SELECT 
              split_part(dateipfad, '/', 4) as entity_id,
              COUNT(*) as file_count
            FROM "Dokumente_Metadaten"
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
      FROM "Dokumente_Metadaten"
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
  
  SELECT COALESCE(SUM(dateigroesse), 0) INTO v_total_size
  FROM "Dokumente_Metadaten"
  WHERE user_id = v_uid;
  
  RETURN jsonb_build_object(
    'folders', v_folders,
    'files', v_files,
    'breadcrumbs', v_breadcrumbs,
    'totalSize', v_total_size,
    'error', null
  );
END;
$$;

-- 2.7 get_virtual_folders
CREATE OR REPLACE FUNCTION public.get_virtual_folders(p_current_path text)
 RETURNS TABLE(id text, name text, path text, type text, file_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_path_parts text[];
  v_depth int;
  v_house_id uuid;
  v_apt_id uuid;
  v_uuid_pattern text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_path_parts := string_to_array(p_current_path, '/');
  v_depth := array_length(v_path_parts, 1);

  if v_depth = 1 then
    return query
    select 
      h.id::text,
      h.name,
      p_current_path || '/' || h.id,
      'house'::text,
      (select count(*) from "Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || h.id and dm.user_id = v_uid)
    from "Haeuser" h
    where h.user_id = v_uid;
  end if;

  if v_depth = 2 then
    if (v_path_parts)[2] ~ v_uuid_pattern then
      v_house_id := (v_path_parts)[2]::uuid;
      return query
      select 
        w.id::text,
        w.name,
        p_current_path || '/' || w.id,
        'apartment'::text,
        (select count(*) from "Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || w.id and dm.user_id = v_uid)
      from "Wohnungen" w
      where w.haus_id = v_house_id and w.user_id = v_uid;
    end if;
  end if;

  if v_depth = 3 then
    if (v_path_parts)[3] ~ v_uuid_pattern then
      v_apt_id := (v_path_parts)[3]::uuid;
      return query
      select 
        m.id::text,
        m.name,
        p_current_path || '/' || m.id,
        'tenant'::text,
        (select count(*) from "Dokumente_Metadaten" dm where dm.dateipfad = p_current_path || '/' || m.id and dm.user_id = v_uid)
      from "Mieter" m
      where m.wohnung_id = v_apt_id and m.user_id = v_uid;
    end if;
  end if;

  return;
END;
$$;

-- 2.8 get_meter_modal_data
CREATE OR REPLACE FUNCTION public.get_meter_modal_data(nebenkosten_id uuid, meter_types text[] DEFAULT ARRAY['kaltwasser'::text, 'warmwasser'::text, 'waermemengenzaehler'::text, 'strom'::text, 'gas'::text])
 RETURNS TABLE(mieter_id uuid, mieter_name text, wohnung_name text, wohnung_groesse numeric, meter_id uuid, meter_type text, custom_id text, current_reading jsonb, previous_reading jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  target_haus_id UUID;
  start_datum DATE;
  end_datum DATE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get nebenkosten details
  SELECT n.haeuser_id, n.startdatum, n.enddatum
  INTO target_haus_id, start_datum, end_datum
  FROM "Nebenkosten" n
  WHERE n.id = nebenkosten_id
    AND n.user_id = v_uid;

  IF target_haus_id IS NULL THEN
    RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
  END IF;

  RETURN QUERY
  WITH relevant_tenants AS (
    SELECT DISTINCT
      m.id as mieter_id,
      m.name as mieter_name,
      w.id as wohnung_id,
      w.name as wohnung_name,
      w.groesse as wohnung_groesse
    FROM "Mieter" m
    JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
    WHERE w.haus_id = target_haus_id
      AND m.user_id = v_uid
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  apartment_meters AS (
    SELECT
      rt.mieter_id,
      wz.id as meter_id,
      wz.zaehler_typ as meter_type,
      wz.custom_id,
      wz.wohnung_id
    FROM relevant_tenants rt
    JOIN "Zaehler" wz ON wz.wohnung_id = rt.wohnung_id AND wz.user_id = v_uid
    WHERE wz.zaehler_typ = ANY(meter_types) 
      AND wz.ist_aktiv = true
  ),
  current_readings AS (
    SELECT
      am.meter_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id AND wa.user_id = v_uid
    WHERE wa.ablese_datum >= start_datum
      AND wa.ablese_datum <= end_datum
    ORDER BY wa.ablese_datum DESC
  ),
  previous_readings AS (
    SELECT DISTINCT ON (am.meter_id)
      am.meter_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id AND wa.user_id = v_uid
    WHERE wa.ablese_datum < start_datum
    ORDER BY am.meter_id, wa.ablese_datum DESC
  )
  SELECT
    rt.mieter_id,
    rt.mieter_name,
    rt.wohnung_name,
    rt.wohnung_groesse,
    am.meter_id,
    am.meter_type,
    am.custom_id,
    (SELECT reading_data FROM current_readings cr WHERE cr.meter_id = am.meter_id LIMIT 1) as current_reading,
    (SELECT reading_data FROM previous_readings pr WHERE pr.meter_id = am.meter_id LIMIT 1) as previous_reading
  FROM relevant_tenants rt
  JOIN apartment_meters am ON rt.mieter_id = am.mieter_id
  ORDER BY rt.mieter_name, am.meter_type;
END;
$$;

-- 2.9 get_email_import_stats
CREATE OR REPLACE FUNCTION public.get_email_import_stats()
 RETURNS TABLE(queued_jobs integer, processing_jobs integer, completed_jobs integer, failed_jobs integer, total_messages_imported integer, queue_depth bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'queued')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'processing')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER,
        COALESCE(SUM(total_messages_imported), 0)::INTEGER,
        (SELECT COUNT(*) FROM pgmq.q_outlook_email_import)::BIGINT
    FROM public."Mail_Import_Jobs"
    WHERE user_id = v_uid;
END;
$$;

-- 2.10 queue_email_import
CREATE OR REPLACE FUNCTION public.queue_email_import(p_account_id uuid, p_sync_job_id uuid DEFAULT NULL::uuid, p_next_link text DEFAULT NULL::text, p_page_number integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    v_job_id UUID;
    v_message JSONB;
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Create tracking job if this is the first page
    IF p_page_number = 1 THEN
        INSERT INTO public."Mail_Import_Jobs" (
            account_id,
            user_id,
            sync_job_id,
            status
        ) VALUES (
            p_account_id,
            v_uid,
            p_sync_job_id,
            'queued'
        ) RETURNING id INTO v_job_id;
    ELSE
        -- Find existing job
        SELECT id INTO v_job_id
        FROM public."Mail_Import_Jobs"
        WHERE account_id = p_account_id
        AND sync_job_id = p_sync_job_id
        AND user_id = v_uid
        ORDER BY erstellt_am DESC
        LIMIT 1;
        
        IF v_job_id IS NULL THEN
           RAISE EXCEPTION 'Import job not found or access denied';
        END IF;
    END IF;

    -- Prepare message for PGMQ
    v_message := jsonb_build_object(
        'job_id', v_job_id,
        'account_id', p_account_id,
        'user_id', v_uid,
        'sync_job_id', p_sync_job_id,
        'next_link', p_next_link,
        'page_number', p_page_number,
        'queued_at', NOW()
    );

    -- Send to PGMQ queue
    PERFORM pgmq.send('outlook_email_import', v_message);

    RETURN v_job_id;
END;
$$;
