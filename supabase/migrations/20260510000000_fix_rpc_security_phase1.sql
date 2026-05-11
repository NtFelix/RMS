-- Migration: Phase 1 Security Hardening for RPC Functions
-- Fixes Data Leak vulnerabilities by enforcing auth.uid() identity checks.
-- We drop the parameter entirely to ensure no one can pass an arbitrary user_id.

-- Drop old functions that took parameters to prevent their use
DROP FUNCTION IF EXISTS public.calculate_storage_usage(uuid);
DROP FUNCTION IF EXISTS public.fetch_tenant_payment_dashboard_data(uuid);
DROP FUNCTION IF EXISTS public.get_nebenkosten_with_metrics(uuid);
DROP FUNCTION IF EXISTS public.insert_finance_entries_batch(jsonb, uuid);

-- Recreate them securely relying solely on auth.uid()

-- 1. calculate_storage_usage
CREATE OR REPLACE FUNCTION public.calculate_storage_usage()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  total_size bigint;
  v_uid uuid := auth.uid();
begin
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  select coalesce(sum(dateigroesse), 0)
  into total_size
  from public."Dokumente_Metadaten"
  where user_id = v_uid;
  
  return total_size;
end;
$$;

-- 2. fetch_tenant_payment_dashboard_data
CREATE OR REPLACE FUNCTION public.fetch_tenant_payment_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenants_payload JSONB;
  finances_payload JSONB;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Aggregate tenant/apartment data once
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'name', m.name,
      'email', m.email,
      'telefonnummer', m.telefonnummer,
      'einzug', m.einzug,
      'auszug', m.auszug,
      'nebenkosten', m.nebenkosten,
      'wohnung_id', w.id,
      'Wohnungen', jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'miete', w.miete,
        'groesse', w.groesse,
        'haus_id', w.haus_id,
        'Haeuser', jsonb_build_object(
          'id', h.id,
          'name', h.name
        )
      )
    )
  ), '[]'::jsonb)
  INTO tenants_payload
  FROM "Mieter" m
  LEFT JOIN "Wohnungen" w ON m.wohnung_id = w.id AND w.user_id = v_uid
  LEFT JOIN "Haeuser" h ON w.haus_id = h.id AND h.user_id = v_uid
  WHERE m.user_id = v_uid;

  -- Aggregate finance entries relevant for the dashboard
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'wohnung_id', f.wohnung_id,
      'name', f.name,
      'datum', f.datum,
      'betrag', f.betrag,
      'ist_einnahmen', f.ist_einnahmen,
      'notiz', f.notiz
    )
  ), '[]'::jsonb)
  INTO finances_payload
  FROM "Finanzen" f
  WHERE f.user_id = v_uid
    AND f.ist_einnahmen = TRUE
    AND (
      f.name ILIKE 'Mietzahlung %' OR
      f.name ILIKE 'Nebenkosten %'
    );

  RETURN jsonb_build_object(
    'tenants', tenants_payload,
    'finances', finances_payload
  );
END;
$$;

-- 3. get_nebenkosten_with_metrics
CREATE OR REPLACE FUNCTION public.get_nebenkosten_with_metrics()
RETURNS TABLE (
    id uuid,
    startdatum date,
    enddatum date,
    nebenkostenart text,
    betrag numeric,
    berechnungsart text,
    zaehlerkosten jsonb,
    zaehlerverbrauch jsonb,
    haeuser_id uuid,
    user_id_field uuid,
    vorauszahlungs_art text,
    haus_name text,
    gesamt_flaeche numeric,
    anzahl_wohnungen integer,
    anzahl_mieter integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH house_metrics AS (
      SELECT 
          h.id as house_id,
          h.name as house_name,
          COALESCE(h.groesse, (SELECT SUM(groesse) FROM "Wohnungen" WHERE haus_id = h.id AND user_id = v_uid)) as total_area,
          COUNT(w.id)::INTEGER as apartment_count
      FROM "Haeuser" h
      LEFT JOIN "Wohnungen" w ON h.id = w.haus_id AND w.user_id = v_uid
      WHERE h.user_id = v_uid
      GROUP BY h.id, h.name, h.groesse
  ),
  tenant_counts AS (
      SELECT 
          n.id as nebenkosten_id,
          COUNT(DISTINCT m.id)::INTEGER as tenant_count
      FROM "Nebenkosten" n
      LEFT JOIN "Wohnungen" w ON n.haeuser_id = w.haus_id AND w.user_id = v_uid
      LEFT JOIN "Mieter" m ON w.id = m.wohnung_id 
          AND m.user_id = v_uid
          AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
          AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
      WHERE n.user_id = v_uid
      GROUP BY n.id
  )
  SELECT 
      n.id,
      n.startdatum,
      n.enddatum,
      n.nebenkostenart,
      n.betrag,
      n.berechnungsart,
      n.zaehlerkosten,
      n.zaehlerverbrauch,
      n.haeuser_id,
      n.user_id as user_id_field,
      n.vorauszahlungs_art,
      COALESCE(hm.house_name, 'Unbekanntes Haus') as haus_name,
      COALESCE(hm.total_area, 0) as gesamt_flaeche,
      COALESCE(hm.apartment_count, 0) as anzahl_wohnungen,
      COALESCE(tc.tenant_count, 0) as anzahl_mieter
  FROM "Nebenkosten" n
  LEFT JOIN house_metrics hm ON n.haeuser_id = hm.house_id
  LEFT JOIN tenant_counts tc ON n.id = tc.nebenkosten_id
  WHERE n.user_id = v_uid
  ORDER BY n.startdatum DESC;
END;
$$;

-- 4. insert_finance_entries_batch
CREATE OR REPLACE FUNCTION public.insert_finance_entries_batch(p_entries jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry JSONB;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  entry_tags TEXT[];
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'entries payload must be a JSON array',
      'inserted', 0,
      'skipped', 0
    );
  END IF;

  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    BEGIN
      IF NOT (entry ? 'wohnung_id' AND entry ? 'name' AND entry ? 'betrag' AND entry ? 'datum') THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- Extract tags array from JSONB if present
      IF entry ? 'tags' AND jsonb_typeof(entry->'tags') = 'array' THEN
        SELECT ARRAY_AGG(elem::TEXT) INTO entry_tags
        FROM jsonb_array_elements_text(entry->'tags') AS elem;
      ELSE
        entry_tags := NULL;
      END IF;

      -- Verify ownership of the apartment
      IF NOT EXISTS (SELECT 1 FROM "Wohnungen" WHERE id = (entry->>'wohnung_id')::UUID AND user_id = v_uid) THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      INSERT INTO "Finanzen" (
        wohnung_id,
        name,
        betrag,
        datum,
        ist_einnahmen,
        notiz,
        tags,
        user_id
      ) VALUES (
        (entry->>'wohnung_id')::UUID,
        entry->>'name',
        (entry->>'betrag')::NUMERIC,
        (entry->>'datum')::DATE,
        COALESCE((entry->>'ist_einnahmen')::BOOLEAN, TRUE),
        entry->>'notiz',
        entry_tags,
        v_uid
      );

      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Skipping entry due to validation error for wohnung_id: %', entry->>'wohnung_id';
      skipped_count := skipped_count + 1;
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'inserted', inserted_count,
    'skipped', skipped_count
  );
END;
$$;
