-- Migration: Update trigger functions to use JSONB zaehlerverbrauch
-- This aggregates meter readings by zaehler_typ into JSONB structure

-- ============================================================
-- Function: update_nebenkosten_zaehlerverbrauch
-- Triggered when Zaehler_Ablesungen are inserted, updated, or deleted
-- ============================================================
CREATE OR REPLACE FUNCTION update_nebenkosten_zaehlerverbrauch()
RETURNS TRIGGER AS $$
DECLARE
  affected_nebenkosten RECORD;
BEGIN
  -- Find all Nebenkosten entries affected by this reading change
  FOR affected_nebenkosten IN
    SELECT DISTINCT n.id, n.haeuser_id, n.startdatum, n.enddatum, n.user_id
    FROM "Nebenkosten" n
    JOIN "Wohnungen" w ON w.haus_id = n.haeuser_id
    JOIN "Zaehler" z ON z.wohnung_id = w.id
    WHERE z.id = COALESCE(NEW.zaehler_id, OLD.zaehler_id)
      AND n.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND COALESCE(NEW.ablese_datum, OLD.ablese_datum) >= n.startdatum
      AND COALESCE(NEW.ablese_datum, OLD.ablese_datum) <= n.enddatum
  LOOP
    -- Calculate total consumption grouped by zaehler_typ as JSONB
    UPDATE "Nebenkosten"
    SET zaehlerverbrauch = (
      SELECT COALESCE(
        jsonb_object_agg(zaehler_typ, total_verbrauch),
        '{}'::jsonb
      )
      FROM (
        SELECT z.zaehler_typ, COALESCE(SUM(za.verbrauch), 0) as total_verbrauch
        FROM "Zaehler_Ablesungen" za
        JOIN "Zaehler" z ON za.zaehler_id = z.id
        JOIN "Wohnungen" w ON z.wohnung_id = w.id
        WHERE w.haus_id = affected_nebenkosten.haeuser_id
          AND za.ablese_datum >= affected_nebenkosten.startdatum
          AND za.ablese_datum <= affected_nebenkosten.enddatum
          AND za.user_id = affected_nebenkosten.user_id
        GROUP BY z.zaehler_typ
      ) grouped
    )
    WHERE id = affected_nebenkosten.id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: initialize_nebenkosten_zaehlerverbrauch
-- Triggered before INSERT on Nebenkosten to set initial values
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_nebenkosten_zaehlerverbrauch()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate initial consumption grouped by zaehler_typ as JSONB
  NEW.zaehlerverbrauch := (
    SELECT COALESCE(
      jsonb_object_agg(zaehler_typ, total_verbrauch),
      '{}'::jsonb
    )
    FROM (
      SELECT z.zaehler_typ, COALESCE(SUM(za.verbrauch), 0) as total_verbrauch
      FROM "Zaehler_Ablesungen" za
      JOIN "Zaehler" z ON za.zaehler_id = z.id
      JOIN "Wohnungen" w ON z.wohnung_id = w.id
      WHERE w.haus_id = NEW.haeuser_id
        AND za.ablese_datum >= NEW.startdatum
        AND za.ablese_datum <= NEW.enddatum
        AND za.user_id = NEW.user_id
      GROUP BY z.zaehler_typ
    ) grouped
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Drop old triggers and create new ones
-- ============================================================
DROP TRIGGER IF EXISTS trigger_update_zaehlerverbrauch_on_insert ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_zaehlerverbrauch_on_update ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_zaehlerverbrauch_on_delete ON "Zaehler_Ablesungen";

CREATE TRIGGER trigger_update_zaehlerverbrauch_on_insert
  AFTER INSERT ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_zaehlerverbrauch();

CREATE TRIGGER trigger_update_zaehlerverbrauch_on_update
  AFTER UPDATE ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_zaehlerverbrauch();

CREATE TRIGGER trigger_update_zaehlerverbrauch_on_delete
  AFTER DELETE ON "Zaehler_Ablesungen"
  FOR EACH ROW
  EXECUTE FUNCTION update_nebenkosten_zaehlerverbrauch();

-- Update trigger for new Nebenkosten entries
DROP TRIGGER IF EXISTS trigger_initialize_zaehlerverbrauch ON "Nebenkosten";

CREATE TRIGGER trigger_initialize_zaehlerverbrauch
  BEFORE INSERT ON "Nebenkosten"
  FOR EACH ROW
  EXECUTE FUNCTION initialize_nebenkosten_zaehlerverbrauch();

-- ============================================================
-- Migrate existing data: populate zaehlerverbrauch for all entries
-- ============================================================
UPDATE "Nebenkosten" n
SET zaehlerverbrauch = (
  SELECT COALESCE(
    jsonb_object_agg(zaehler_typ, total_verbrauch),
    '{}'::jsonb
  )
  FROM (
    SELECT z.zaehler_typ, COALESCE(SUM(za.verbrauch), 0) as total_verbrauch
    FROM "Zaehler_Ablesungen" za
    JOIN "Zaehler" z ON za.zaehler_id = z.id
    JOIN "Wohnungen" w ON z.wohnung_id = w.id
    WHERE w.haus_id = n.haeuser_id
      AND za.ablese_datum >= n.startdatum
      AND za.ablese_datum <= n.enddatum
      AND za.user_id = n.user_id
    GROUP BY z.zaehler_typ
  ) grouped
)
WHERE n.zaehlerverbrauch IS NULL OR n.zaehlerverbrauch = '{}'::jsonb;

-- ============================================================
-- Migrate existing data: populate zaehlerkosten from wasserkosten
-- Moves legacy wasserkosten value to zaehlerkosten JSONB under 'wasser' key
-- Only runs if wasserkosten column still exists
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Nebenkosten' AND column_name = 'wasserkosten'
  ) THEN
    UPDATE "Nebenkosten" n
    SET zaehlerkosten = jsonb_build_object('wasser', n.wasserkosten)
    WHERE n.wasserkosten IS NOT NULL 
      AND n.wasserkosten > 0
      AND (n.zaehlerkosten IS NULL OR n.zaehlerkosten = '{}'::jsonb);
  END IF;
END $$;

-- ============================================================
-- Update get_nebenkosten_with_metrics to use JSONB fields
-- ============================================================
DROP FUNCTION IF EXISTS get_nebenkosten_with_metrics(UUID);

CREATE OR REPLACE FUNCTION get_nebenkosten_with_metrics(user_id UUID)
RETURNS TABLE (
    id UUID,
    startdatum DATE,
    enddatum DATE,
    nebenkostenart TEXT[],
    betrag NUMERIC[],
    berechnungsart TEXT[],
    zaehlerkosten JSONB,
    zaehlerverbrauch JSONB,
    haeuser_id UUID,
    user_id_field UUID,
    haus_name TEXT,
    gesamt_flaeche NUMERIC,
    anzahl_wohnungen INTEGER,
    anzahl_mieter INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH house_metrics AS (
        SELECT 
            h.id as house_id,
            h.name as house_name,
            COALESCE(h.groesse, COALESCE(SUM(w.groesse), 0)) as total_area,
            COUNT(w.id)::INTEGER as apartment_count
        FROM "Haeuser" h
        LEFT JOIN "Wohnungen" w ON h.id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        WHERE h.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY h.id, h.name, h.groesse
    ),
    tenant_counts AS (
        SELECT 
            n.id as nebenkosten_id,
            n.haeuser_id,
            COUNT(DISTINCT m.id)::INTEGER as tenant_count
        FROM "Nebenkosten" n
        LEFT JOIN "Wohnungen" w ON n.haeuser_id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        LEFT JOIN "Mieter" m ON w.id = m.wohnung_id 
            AND m.user_id = get_nebenkosten_with_metrics.user_id
            AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
            AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
        WHERE n.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY n.id, n.haeuser_id
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
        COALESCE(hm.house_name, 'Unbekanntes Haus') as haus_name,
        COALESCE(hm.total_area, 0) as gesamt_flaeche,
        COALESCE(hm.apartment_count, 0) as anzahl_wohnungen,
        COALESCE(tc.tenant_count, 0) as anzahl_mieter
    FROM "Nebenkosten" n
    LEFT JOIN house_metrics hm ON n.haeuser_id = hm.house_id
    LEFT JOIN tenant_counts tc ON n.id = tc.nebenkosten_id
    WHERE n.user_id = get_nebenkosten_with_metrics.user_id
    ORDER BY n.startdatum DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nebenkosten_with_metrics(UUID) TO authenticated;

-- ============================================================
-- Update get_abrechnung_modal_data to use JSONB fields
-- ============================================================
DROP FUNCTION IF EXISTS public.get_abrechnung_modal_data(uuid, uuid);

-- ============================================================
-- Rename 'wasser' zaehler_typ to 'kaltwasser'
-- ============================================================
-- Update Zaehler table
UPDATE "Zaehler"
SET zaehler_typ = 'kaltwasser'
WHERE zaehler_typ = 'wasser';

-- Update existing zaehlerkosten JSONB: migrate 'wasser' key to 'kaltwasser'
UPDATE "Nebenkosten" n
SET zaehlerkosten = (
  CASE 
    WHEN n.zaehlerkosten ? 'wasser' THEN
      (n.zaehlerkosten - 'wasser') || jsonb_build_object('kaltwasser', 
        COALESCE((n.zaehlerkosten -> 'kaltwasser')::numeric, 0) + (n.zaehlerkosten -> 'wasser')::numeric
      )
    ELSE n.zaehlerkosten
  END
)
WHERE n.zaehlerkosten ? 'wasser';

-- Update existing zaehlerverbrauch JSONB: migrate 'wasser' key to 'kaltwasser'
UPDATE "Nebenkosten" n
SET zaehlerverbrauch = (
  CASE 
    WHEN n.zaehlerverbrauch ? 'wasser' THEN
      (n.zaehlerverbrauch - 'wasser') || jsonb_build_object('kaltwasser', 
        COALESCE((n.zaehlerverbrauch -> 'kaltwasser')::numeric, 0) + (n.zaehlerverbrauch -> 'wasser')::numeric
      )
    ELSE n.zaehlerverbrauch
  END
)
WHERE n.zaehlerverbrauch ? 'wasser';


CREATE OR REPLACE FUNCTION public.get_abrechnung_modal_data(
  nebenkosten_id uuid,
  user_id uuid
)
RETURNS TABLE(
  nebenkosten_data jsonb,
  tenants jsonb,
  rechnungen jsonb,
  water_meters jsonb,
  water_readings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_haus_id UUID;
  start_datum DATE;
  end_datum DATE;
BEGIN
  SELECT n.haeuser_id, n.startdatum, n.enddatum
  INTO target_haus_id, start_datum, end_datum
  FROM "Nebenkosten" n
  WHERE n.id = get_abrechnung_modal_data.nebenkosten_id 
    AND n.user_id = get_abrechnung_modal_data.user_id;

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
      'Haeuser', jsonb_build_object('name', h.name),
      'gesamtFlaeche', h.groesse
    ) as data
    FROM "Nebenkosten" n
    LEFT JOIN "Haeuser" h ON n.haeuser_id = h.id
    WHERE n.id = get_abrechnung_modal_data.nebenkosten_id
      AND n.user_id = get_abrechnung_modal_data.user_id
  ),
  relevant_tenants AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'wohnung_id', m.wohnung_id,
        'einzug', m.einzug,
        'auszug', m.auszug,
        'email', m.email,
        'telefonnummer', m.telefonnummer,
        'notiz', m.notiz,
        'nebenkosten', m.nebenkosten,
        'user_id', m.user_id,
        'Wohnungen', jsonb_build_object(
          'name', w.name,
          'groesse', w.groesse,
          'miete', w.miete
        )
      )
    ) as data
    FROM "Mieter" m
    JOIN "Wohnungen" w ON m.wohnung_id = w.id
    WHERE w.haus_id = target_haus_id
      AND m.user_id = get_abrechnung_modal_data.user_id
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  relevant_rechnungen AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'nebenkosten_id', r.nebenkosten_id,
        'mieter_id', r.mieter_id,
        'name', r.name,
        'betrag', r.betrag,
        'user_id', r.user_id
      )
    ), '[]'::jsonb) as data
    FROM "Rechnungen" r
    WHERE r.nebenkosten_id = get_abrechnung_modal_data.nebenkosten_id
      AND r.user_id = get_abrechnung_modal_data.user_id
  ),
  apartment_ids AS (
    SELECT DISTINCT w.id as wohnung_id
    FROM "Wohnungen" w
    WHERE w.haus_id = target_haus_id
      AND w.user_id = get_abrechnung_modal_data.user_id
  ),
  relevant_water_meters AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wz.id,
        'custom_id', wz.custom_id,
        'wohnung_id', wz.wohnung_id,
        'zaehler_typ', wz.zaehler_typ,
        'erstellungsdatum', wz.erstellungsdatum,
        'eichungsdatum', wz.eichungsdatum,
        'user_id', wz.user_id,
        'ist_aktiv', wz.ist_aktiv
      )
    ), '[]'::jsonb) as data
    FROM "Zaehler" wz
    WHERE wz.wohnung_id IN (SELECT wohnung_id FROM apartment_ids)
      AND wz.user_id = get_abrechnung_modal_data.user_id
  ),
  meter_ids AS (
    SELECT DISTINCT wz.id as meter_id
    FROM "Zaehler" wz
    WHERE wz.wohnung_id IN (SELECT wohnung_id FROM apartment_ids)
      AND wz.user_id = get_abrechnung_modal_data.user_id
  ),
  relevant_water_readings AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wa.id,
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch,
        'user_id', wa.user_id,
        'zaehler_id', wa.zaehler_id
      )
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.zaehler_id IN (SELECT meter_id FROM meter_ids)
      AND wa.ablese_datum >= start_datum
      AND wa.ablese_datum <= end_datum
      AND wa.user_id = get_abrechnung_modal_data.user_id
  )
  SELECT 
    (SELECT data FROM nebenkosten_with_house) as nebenkosten_data,
    (SELECT data FROM relevant_tenants) as tenants,
    (SELECT data FROM relevant_rechnungen) as rechnungen,
    (SELECT data FROM relevant_water_meters) as water_meters,
    (SELECT data FROM relevant_water_readings) as water_readings;
END;
$function$;

-- ============================================================
-- Drop legacy wasserverbrauch trigger function (replaced by zaehlerverbrauch version)
-- ============================================================
-- Drop triggers on Zaehler_Ablesungen
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_insert ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_update ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_delete ON "Zaehler_Ablesungen";
DROP TRIGGER IF EXISTS trigger_initialize_wasserverbrauch ON "Nebenkosten";

-- Drop triggers on archive table (if exists)
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_insert ON "archive_Wasser_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_update ON "archive_Wasser_Ablesungen";
DROP TRIGGER IF EXISTS trigger_update_wasserverbrauch_on_delete ON "archive_Wasser_Ablesungen";

-- Now drop the functions (CASCADE to catch any remaining dependencies)
DROP FUNCTION IF EXISTS update_nebenkosten_wasserverbrauch() CASCADE;
DROP FUNCTION IF EXISTS initialize_nebenkosten_wasserverbrauch() CASCADE;

-- ============================================================
-- Drop legacy columns after data migration
-- ============================================================
ALTER TABLE "Nebenkosten" DROP COLUMN IF EXISTS wasserkosten;
ALTER TABLE "Nebenkosten" DROP COLUMN IF EXISTS wasserverbrauch;
