-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.get_abrechnung_modal_data(uuid, uuid);

-- Updated function to include water meters and readings from new tables
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
      'wasserkosten', n.wasserkosten,
      'wasserverbrauch', n.wasserverbrauch,
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
