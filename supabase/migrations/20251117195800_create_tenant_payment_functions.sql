-- Migration: Create tenant payment helper functions
-- Generated: 2025-11-17

-- Helper: drop functions if they already exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fetch_tenant_payment_dashboard_data'
  ) THEN
    DROP FUNCTION fetch_tenant_payment_dashboard_data(uuid);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'insert_finance_entries_batch'
  ) THEN
    DROP FUNCTION insert_finance_entries_batch(jsonb, uuid);
  END IF;
END $$;

-- Function: fetch_tenant_payment_dashboard_data
CREATE OR REPLACE FUNCTION fetch_tenant_payment_dashboard_data(p_user_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenants_payload JSONB;
  finances_payload JSONB;
BEGIN
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
  LEFT JOIN "Wohnungen" w ON m.wohnung_id = w.id
  LEFT JOIN "Haeuser" h ON w.haus_id = h.id
  WHERE m.user_id = p_user_id;

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
  WHERE f.user_id = p_user_id
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

COMMENT ON FUNCTION fetch_tenant_payment_dashboard_data(uuid) IS 'Fetches tenant + finance data for the tenant payment dashboard in a single call.';

-- Function: insert_finance_entries_batch
CREATE OR REPLACE FUNCTION insert_finance_entries_batch(p_entries JSONB, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry JSONB;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
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

      INSERT INTO "Finanzen" (
        wohnung_id,
        name,
        betrag,
        datum,
        ist_einnahmen,
        notiz,
        user_id
      ) VALUES (
        (entry->>'wohnung_id')::UUID,
        entry->>'name',
        (entry->>'betrag')::NUMERIC,
        (entry->>'datum')::DATE,
        COALESCE((entry->>'ist_einnahmen')::BOOLEAN, TRUE),
        entry->>'notiz',
        p_user_id
      );

      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
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

COMMENT ON FUNCTION insert_finance_entries_batch(JSONB, UUID) IS 'Batch inserts finance entries for the tenant payment modal with per-row validation.';
