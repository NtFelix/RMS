-- Update get_wasser_zaehler_data to be generic and include zaehler_typ and einheit
CREATE OR REPLACE FUNCTION public.get_zaehler_data(
  wohnung_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnung_data jsonb,
  zaehler jsonb,
  ablesungen jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
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
    LEFT JOIN "Haeuser" h ON w.haus_id = h.id
    WHERE w.id = wohnung_id_param
      AND w.user_id = user_id_param
  ),
  meters_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wz.id,
        'custom_id', wz.custom_id,
        'wohnung_id', wz.wohnung_id,
        'erstellungsdatum', wz.erstellungsdatum,
        'eichungsdatum', wz.eichungsdatum,
        'user_id', wz.user_id,
        'ist_aktiv', wz.ist_aktiv,
        'zaehler_typ', wz.zaehler_typ,
        'einheit', wz.einheit
      ) ORDER BY wz.zaehler_typ, wz.custom_id
    ), '[]'::jsonb) as data
    FROM "Zaehler" wz
    WHERE wz.wohnung_id = wohnung_id_param
      AND wz.user_id = user_id_param
  ),
  readings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wa.id,
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch,
        'user_id', wa.user_id,
        'zaehler_id', wa.zaehler_id
      ) ORDER BY wa.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
    WHERE wz.wohnung_id = wohnung_id_param
      AND wa.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM apartment_data) as wohnung_data,
    (SELECT data FROM meters_data) as zaehler,
    (SELECT data FROM readings_data) as ablesungen;
END;
$function$;

-- Preserve old name for backward compatibility
CREATE OR REPLACE FUNCTION public.get_wasser_zaehler_data(
  wohnung_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnung_data jsonb,
  water_meters jsonb,
  water_readings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT wohnung_data, zaehler as water_meters, ablesungen as water_readings
  FROM public.get_zaehler_data(wohnung_id_param, user_id_param);
END;
$function$;

-- Update get_wasser_zaehler_for_haus to be generic
CREATE OR REPLACE FUNCTION public.get_zaehler_for_haus(
  haus_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnungen jsonb,
  zaehler jsonb,
  ablesungen jsonb,
  mieter jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
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
      AND w.user_id = user_id_param
  ),
  meters AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wz.id,
        'custom_id', wz.custom_id,
        'wohnung_id', wz.wohnung_id,
        'erstellungsdatum', wz.erstellungsdatum,
        'eichungsdatum', wz.eichungsdatum,
        'user_id', wz.user_id,
        'ist_aktiv', wz.ist_aktiv,
        'zaehler_typ', wz.zaehler_typ,
        'einheit', wz.einheit
      ) ORDER BY wz.zaehler_typ, wz.custom_id
    ), '[]'::jsonb) as data
    FROM "Zaehler" wz
    JOIN "Wohnungen" w ON wz.wohnung_id = w.id
    WHERE w.haus_id = haus_id_param
      AND wz.user_id = user_id_param
  ),
  readings AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wa.id,
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch,
        'user_id', wa.user_id,
        'zaehler_id', wa.zaehler_id
      ) ORDER BY wa.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
    JOIN "Wohnungen" w ON wz.wohnung_id = w.id
    WHERE w.haus_id = haus_id_param
      AND wa.user_id = user_id_param
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
    JOIN "Wohnungen" w ON m.wohnung_id = w.id
    WHERE w.haus_id = haus_id_param
      AND m.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM apartments) as wohnungen,
    (SELECT data FROM meters) as zaehler,
    (SELECT data FROM readings) as ablesungen,
    (SELECT data FROM tenants) as mieter;
END;
$function$;

-- Old name for backward compatibility
CREATE OR REPLACE FUNCTION public.get_wasser_zaehler_for_haus(
  haus_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnungen jsonb,
  water_meters jsonb,
  water_readings jsonb,
  mieter jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT wohnungen, zaehler as water_meters, ablesungen as water_readings, mieter
  FROM public.get_zaehler_for_haus(haus_id_param, user_id_param);
END;
$function$;

-- Update get_wasser_ablesungen_for_meter to be generic
CREATE OR REPLACE FUNCTION public.get_ablesungen_for_meter(
  meter_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  meter_data jsonb,
  readings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH meter_info AS (
    SELECT jsonb_build_object(
      'id', wz.id,
      'custom_id', wz.custom_id,
      'wohnung_id', wz.wohnung_id,
      'erstellungsdatum', wz.erstellungsdatum,
      'eichungsdatum', wz.eichungsdatum,
      'ist_aktiv', wz.ist_aktiv,
      'zaehler_typ', wz.zaehler_typ,
      'einheit', wz.einheit,
      'Wohnungen', jsonb_build_object(
        'name', w.name,
        'groesse', w.groesse,
        'Haeuser', jsonb_build_object('name', h.name)
      )
    ) as data
    FROM "Zaehler" wz
    LEFT JOIN "Wohnungen" w ON wz.wohnung_id = w.id
    LEFT JOIN "Haeuser" h ON w.haus_id = h.id
    WHERE wz.id = meter_id_param
      AND wz.user_id = user_id_param
  ),
  readings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wa.id,
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch,
        'user_id', wa.user_id,
        'zaehler_id', wa.zaehler_id
      ) ORDER BY wa.ablese_datum DESC
    ), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.zaehler_id = meter_id_param
      AND wa.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM meter_info) as meter_data,
    (SELECT data FROM readings_data) as readings;
END;
$function$;

-- Old name for backward compatibility
CREATE OR REPLACE FUNCTION public.get_wasser_ablesungen_for_meter(
  meter_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  meter_data jsonb,
  readings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_ablesungen_for_meter(meter_id_param, user_id_param);
END;
$function$;

-- Update get_wasserzaehler_modal_data to be generic and return multiple meters per tenant
-- We drop it first to change return type
DROP FUNCTION IF EXISTS public.get_wasserzaehler_modal_data(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_zaehler_modal_data(
  nebenkosten_id uuid, 
  user_id uuid
)
RETURNS TABLE(
  mieter_id uuid, 
  mieter_name text, 
  wohnung_name text, 
  wohnung_groesse numeric, 
  zaehler_id uuid,
  zaehler_typ text,
  einheit text,
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
  WHERE n.id = get_zaehler_modal_data.nebenkosten_id 
    AND n.user_id = get_zaehler_modal_data.user_id;

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
      AND m.user_id = get_zaehler_modal_data.user_id
      AND w.user_id = get_zaehler_modal_data.user_id
      -- Filter by date overlap
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  apartment_meters AS (
    -- Get all meters for relevant apartments
    SELECT 
      rt.mieter_id,
      wz.id as zaehler_id,
      wz.wohnung_id,
      wz.zaehler_typ,
      wz.einheit,
      wz.custom_id
    FROM relevant_tenants rt
    JOIN "Zaehler" wz ON wz.wohnung_id = rt.wohnung_id
    WHERE wz.user_id = get_zaehler_modal_data.user_id
  ),
  current_readings AS (
    -- Get latest reading within the billing period for each meter
    SELECT DISTINCT ON (wa.zaehler_id)
      wa.zaehler_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.user_id = get_zaehler_modal_data.user_id
      AND wa.ablese_datum >= start_datum
      AND wa.ablese_datum <= end_datum
    ORDER BY wa.zaehler_id, wa.ablese_datum DESC
  ),
  previous_readings AS (
    -- Get most recent reading before billing period for each meter
    SELECT DISTINCT ON (wa.zaehler_id)
      wa.zaehler_id,
      jsonb_build_object(
        'ablese_datum', wa.ablese_datum,
        'zaehlerstand', wa.zaehlerstand,
        'verbrauch', wa.verbrauch
      ) as reading_data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.user_id = get_zaehler_modal_data.user_id
      AND wa.ablese_datum < start_datum
    ORDER BY wa.zaehler_id, wa.ablese_datum DESC
  )
  SELECT 
    rt.mieter_id,
    rt.mieter_name,
    rt.wohnung_name,
    rt.wohnung_groesse,
    am.zaehler_id,
    am.zaehler_typ,
    am.einheit,
    am.custom_id,
    cr.reading_data as current_reading,
    pr.reading_data as previous_reading
  FROM relevant_tenants rt
  JOIN apartment_meters am ON rt.mieter_id = am.mieter_id
  LEFT JOIN current_readings cr ON am.zaehler_id = cr.zaehler_id
  LEFT JOIN previous_readings pr ON am.zaehler_id = pr.zaehler_id
  ORDER BY rt.mieter_name, am.zaehler_typ, am.custom_id;
END;
$function$;

-- Preserve old name for backward compatibility with different return type if needed
-- But actually it's better to update the callers. 
-- For now, let's provide a wrapper that sums up like before for "wasser" only if possible?
-- No, let's just update the callers.

-- Update get_abrechnung_modal_data to include zaehler info correctly
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
  relevant_meters AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wz.id,
        'custom_id', wz.custom_id,
        'wohnung_id', wz.wohnung_id,
        'erstellungsdatum', wz.erstellungsdatum,
        'eichungsdatum', wz.eichungsdatum,
        'user_id', wz.user_id,
        'ist_aktiv', wz.ist_aktiv,
        'zaehler_typ', wz.zaehler_typ,
        'einheit', wz.einheit
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
    (SELECT data FROM relevant_meters) as water_meters,
    (SELECT data FROM relevant_readings) as water_readings;
END;
$function$;
