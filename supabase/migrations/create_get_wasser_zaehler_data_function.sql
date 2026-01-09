-- Function to fetch water meter data for a specific apartment
-- Used when opening the water meter modal from context menu
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
        'ist_aktiv', wz.ist_aktiv
      ) ORDER BY wz.custom_id
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
    (SELECT data FROM meters_data) as water_meters,
    (SELECT data FROM readings_data) as water_readings;
END;
$function$;

-- Function to fetch all water meter data for a house (for Ablesungen modal)
-- Returns apartments, meters, readings, and tenants in one call
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
        'ist_aktiv', wz.ist_aktiv
      ) ORDER BY wz.custom_id
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
    (SELECT data FROM meters) as water_meters,
    (SELECT data FROM readings) as water_readings,
    (SELECT data FROM tenants) as mieter;
END;
$function$;

-- Function to fetch water readings for a specific meter
-- Used when viewing/editing readings for a single meter
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
  WITH meter_info AS (
    SELECT jsonb_build_object(
      'id', wz.id,
      'custom_id', wz.custom_id,
      'wohnung_id', wz.wohnung_id,
      'erstellungsdatum', wz.erstellungsdatum,
      'eichungsdatum', wz.eichungsdatum,
      'ist_aktiv', wz.ist_aktiv,
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
