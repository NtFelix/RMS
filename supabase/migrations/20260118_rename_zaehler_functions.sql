-- Rename water meter functions to generic meter functions
-- This completes the migration from water-only to multi-meter type support

-- Create new function with generic name (copy of get_wasser_zaehler_data)
CREATE OR REPLACE FUNCTION public.get_zaehler_data(
  wohnung_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnung_data jsonb,
  meters jsonb,
  readings jsonb
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
      AND z.user_id = user_id_param
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
    JOIN "Zaehler" z ON a.zaehler_id = z.id
    WHERE z.wohnung_id = wohnung_id_param
      AND z.user_id = user_id_param
      AND a.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM apartment_data) as wohnung_data,
    (SELECT data FROM meters_data) as meters,
    (SELECT data FROM readings_data) as readings;
END;
$function$;

-- Create new function with generic name (copy of get_wasser_zaehler_for_haus)
CREATE OR REPLACE FUNCTION public.get_zaehler_for_haus(
  haus_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  wohnungen jsonb,
  meters jsonb,
  readings jsonb,
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
    JOIN "Wohnungen" w ON z.wohnung_id = w.id
    WHERE w.haus_id = haus_id_param
      AND z.user_id = user_id_param
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
    JOIN "Zaehler" z ON a.zaehler_id = z.id
    JOIN "Wohnungen" w ON z.wohnung_id = w.id
    WHERE w.haus_id = haus_id_param
      AND w.user_id = user_id_param
      AND z.user_id = user_id_param
      AND a.user_id = user_id_param
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
      AND w.user_id = user_id_param
      AND m.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM apartments) as wohnungen,
    (SELECT data FROM meters_data) as meters,
    (SELECT data FROM readings_data) as readings,
    (SELECT data FROM tenants) as mieter;
END;
$function$;

-- Create new function with generic name (copy of get_wasser_ablesungen_for_meter)
CREATE OR REPLACE FUNCTION public.get_ablesungen_for_zaehler(
  zaehler_id_param uuid,
  user_id_param uuid
)
RETURNS TABLE(
  zaehler_data jsonb,
  readings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
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
    LEFT JOIN "Wohnungen" w ON z.wohnung_id = w.id
    LEFT JOIN "Haeuser" h ON w.haus_id = h.id
    WHERE z.id = zaehler_id_param
      AND z.user_id = user_id_param
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
      AND a.user_id = user_id_param
  )
  SELECT 
    (SELECT data FROM meter_info) as zaehler_data,
    (SELECT data FROM readings_data) as readings;
END;
$function$;

-- Note: Old functions are kept for backward compatibility
-- They can be removed in a future migration after all code is updated:
-- DROP FUNCTION IF EXISTS public.get_wasser_zaehler_data(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.get_wasser_zaehler_for_haus(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.get_wasser_ablesungen_for_meter(uuid, uuid);
