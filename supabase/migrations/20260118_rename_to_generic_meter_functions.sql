-- Migration: Genericize Meter Functions
-- Purpose: Rename and update legacy "water" functions to be generic "meter" functions.

-- 1. Rename get_wasserzaehler_modal_data -> get_meter_modal_data
-- We drop the old one and create the new one with a more generic signature if possible,
-- or just rename it for now while keeping the "water" filtering logic as a default for this specific modal use-case,
-- OR better yet, let's make it accept a filter.

DROP FUNCTION IF EXISTS public.get_wasserzaehler_modal_data(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_meter_modal_data(
  nebenkosten_id uuid,
  user_id uuid,
  meter_types text[] DEFAULT ARRAY['kaltwasser', 'warmwasser', 'waermemengenzaehler', 'strom', 'gas']::text[]
)
RETURNS TABLE (
  mieter_id uuid,
  mieter_name text,
  wohnung_name text,
  wohnung_groesse numeric,
  meter_id uuid,
  meter_type text,
  custom_id text,
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
  WHERE n.id = get_meter_modal_data.nebenkosten_id
    AND n.user_id = get_meter_modal_data.user_id;

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
      AND m.user_id = get_meter_modal_data.user_id
      AND w.user_id = get_meter_modal_data.user_id
      -- Filter by date overlap
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  apartment_meters AS (
    -- Get meters for relevant apartments, filtered by the requested types
    SELECT
      rt.mieter_id,
      wz.id as meter_id,
      wz.zaehler_typ as meter_type,
      wz.custom_id,
      wz.wohnung_id
    FROM relevant_tenants rt
    JOIN "Zaehler" wz ON wz.wohnung_id = rt.wohnung_id
    WHERE wz.user_id = get_meter_modal_data.user_id
      AND wz.zaehler_typ = ANY(meter_types) 
      AND wz.ist_aktiv = true
  ),
  current_readings AS (
    -- Get current readings within the billing period for each specific meter
    SELECT
      am.meter_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id
    WHERE wa.user_id = get_meter_modal_data.user_id
      AND wa.ablese_datum >= start_datum
      AND wa.ablese_datum <= end_datum
    -- We want the LATEST reading in the period if there are multiple? 
    -- Or sum? Usually for billing we take the reading closest to end date.
    -- For now, let's take the latest one in the period to represent the "end" state.
    ORDER BY wa.ablese_datum DESC
  ),
  previous_readings AS (
     -- Get most recent previous reading (before billing period)
    SELECT DISTINCT ON (am.meter_id)
      am.meter_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM apartment_meters am
    JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = am.meter_id
    WHERE wa.user_id = get_meter_modal_data.user_id
      AND wa.ablese_datum < start_datum
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
$function$;


-- 2. Update get_abrechnung_modal_data to use generic naming
DROP FUNCTION IF EXISTS public.get_abrechnung_modal_data(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_abrechnung_modal_data(
  nebenkosten_id uuid,
  user_id uuid
)
RETURNS TABLE(
  nebenkosten_data jsonb,
  tenants jsonb,
  rechnungen jsonb,
  meters jsonb,     -- Renamed from water_meters
  readings jsonb    -- Renamed from water_readings
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
     -- Helper CTE to get relevant apartment IDs
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
  relevant_meters AS (
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
      -- Generic: Include all active meters related to these apartments
      -- Frontend can filter if it only needs specific types
  ),
  meter_ids AS (
    SELECT DISTINCT wz.id as meter_id
    FROM "Zaehler" wz
    WHERE wz.wohnung_id IN (SELECT wohnung_id FROM apartment_ids)
      AND wz.user_id = get_abrechnung_modal_data.user_id
  ),
  relevant_readings AS (
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
    (SELECT data FROM relevant_meters) as meters,
    (SELECT data FROM relevant_readings) as readings;
END;
$function$;
