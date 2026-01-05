-- Updated function to use new Zaehler and Zaehler_Ablesungen tables
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
    -- Get all water meters for relevant apartments
    SELECT 
      rt.mieter_id,
      wz.id as meter_id,
      wz.wohnung_id
    FROM relevant_tenants rt
    JOIN "Zaehler" wz ON wz.wohnung_id = rt.wohnung_id
    WHERE wz.user_id = get_wasserzaehler_modal_data.user_id
  ),
  current_readings AS (
    -- Get current readings within the billing period
    -- Sum all readings for all meters in the apartment
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
    -- Sum all readings for all meters in the apartment
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
