-- Migration: Cleanup and fix legacy water meter functions
-- Purpose: 
-- 1. Drop the unused legacy function 'save_wasserzaehler_batch' which references non-existent/legacy tables.
-- 2. Update 'get_wasserzaehler_modal_data' to correctly filter for strictly 'kaltwasser' and 'warmwasser' meters, ensuring 'Wasserzaehler' logic doesn't mix with other meter types.
-- 3. Update 'get_abrechnung_modal_data' to explicitly filter 'water_meters' and 'water_readings' to only include water meters, preserving the specific meaning of these fields while using the generic 'Zaehler' table.

-- 1. Drop unused legacy function
DROP FUNCTION IF EXISTS public.save_wasserzaehler_batch(uuid, uuid, jsonb);

-- 2. Update get_wasserzaehler_modal_data
CREATE OR REPLACE FUNCTION public.get_wasserzaehler_modal_data(
  nebenkosten_id uuid,
  user_id uuid
)
RETURNS TABLE(
  mieter_id uuid,
  mieter_name text,
  wohnung_name text,
  wohnung_groesse numeric,
  current_reading jsonb,
  previous_reading jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_haus_id UUID;
  start_datum DATE;
  end_datum DATE;
BEGIN
  -- Get nebenkosten details
  SELECT n.haeuser_id, n.startdatum, n.enddatum
  INTO target_haus_id, start_datum, end_datum
  FROM "Nebenkosten" n
  WHERE n.id = get_wasserzaehler_modal_data.nebenkosten_id
    AND n.user_id = get_wasserzaehler_modal_data.user_id;

  IF target_haus_id IS NULL THEN
    RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
  END IF;

  RETURN QUERY
  WITH relevant_tenants AS (
    -- Get tenants who lived in the house during the billing period
    SELECT DISTINCT
      m.id as mieter_id,
      m.name as mieter_name,
      w.id as wohnung_id,
      w.name as wohnung_name,
      w.groesse as wohnung_groesse
    FROM "Mieter" m
    JOIN "Wohnungen" w ON m.wohnung_id = w.id
    WHERE w.haus_id = target_haus_id
      AND m.user_id = get_wasserzaehler_modal_data.user_id
      AND w.user_id = get_wasserzaehler_modal_data.user_id
      -- Filter by date overlap
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  apartment_meters AS (
    -- Get all WATER meters for relevant apartments
    SELECT
      rt.mieter_id,
      wz.id as meter_id,
      wz.wohnung_id
    FROM relevant_tenants rt
    JOIN "Zaehler" wz ON wz.wohnung_id = rt.wohnung_id
    WHERE wz.user_id = get_wasserzaehler_modal_data.user_id
      -- IMPORTANT: Only include water meters to avoid mixing with simple electricity/gas meters if added later
      AND wz.zaehler_typ IN ('kaltwasser', 'warmwasser')
  ),
  current_readings AS (
    -- Get current readings within the billing period
    -- Sum all readings for all WATER meters in the apartment
    SELECT
      am.mieter_id,
      jsonb_build_object(
        'ablese_datum', MAX(wa.ablese_datum),
        'zaehlerstand', SUM(wa.zaehlerstand),
        'verbrauch', SUM(wa.verbrauch)
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id
    WHERE wa.user_id = get_wasserzaehler_modal_data.user_id
      AND wa.ablese_datum >= start_datum
      AND wa.ablese_datum <= end_datum
    GROUP BY am.mieter_id
  ),
  previous_readings AS (
    -- Get most recent previous readings (before billing period)
    -- Sum all readings for all WATER meters in the apartment
    SELECT
      am.mieter_id,
      jsonb_build_object(
        'ablese_datum', MAX(wa.ablese_datum),
        'zaehlerstand', SUM(wa.zaehlerstand),
        'verbrauch', SUM(wa.verbrauch)
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id
    WHERE wa.user_id = get_wasserzaehler_modal_data.user_id
      AND wa.ablese_datum < start_datum
    GROUP BY am.mieter_id
  )
  SELECT
    rt.mieter_id,
    rt.mieter_name,
    rt.wohnung_name,
    rt.wohnung_groesse,
    cr.reading_data as current_reading,
    pr.reading_data as previous_reading
  FROM relevant_tenants rt
  LEFT JOIN current_readings cr ON rt.mieter_id = cr.mieter_id
  LEFT JOIN previous_readings pr ON rt.mieter_id = pr.mieter_id
  ORDER BY rt.mieter_name;
END;
$function$;

-- 3. Update get_abrechnung_modal_data
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
  -- Get nebenkosten details
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
      AND w.user_id = get_abrechnung_modal_data.user_id
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  apartment_ids AS (
    SELECT DISTINCT m.wohnung_id
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
      -- Filter only water meters
      AND wz.zaehler_typ IN ('kaltwasser', 'warmwasser')
  ),
  meter_ids AS (
    SELECT DISTINCT wz.id as meter_id
    FROM "Zaehler" wz
    WHERE wz.wohnung_id IN (SELECT wohnung_id FROM apartment_ids)
      AND wz.user_id = get_abrechnung_modal_data.user_id
      -- Filter only water meters
      AND wz.zaehler_typ IN ('kaltwasser', 'warmwasser')
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
