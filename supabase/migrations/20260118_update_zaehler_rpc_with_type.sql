-- Update get_wasser_zaehler_data to include zaehler_typ and einheit
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
        'ist_aktiv', wz.ist_aktiv,
        'zaehler_typ', wz.zaehler_typ,
        'einheit', wz.einheit
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
        'zaehler_id', wa.zaehler_id,
        'kommentar', wa.kommentar
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

-- Update get_wasser_zaehler_for_haus to include zaehler_typ and einheit
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
        'zaehler_id', wa.zaehler_id,
        'kommentar', wa.kommentar
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

-- Update get_wasser_ablesungen_for_meter to include zaehler_typ and einheit
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
        'zaehler_id', wa.zaehler_id,
        'kommentar', wa.kommentar
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
