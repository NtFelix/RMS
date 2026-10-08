-- MODERNIZE ALL NEBENKOSTEN RPCS
-- This script updates all optimized functions to include vorauszahlungs_art
-- and ensures actual payments are correctly identified even without tags.

-- DROP EXISTING FUNCTIONS FIRST (Required because return types are changing)
DROP FUNCTION IF EXISTS public.get_nebenkosten_with_metrics(uuid);
DROP FUNCTION IF EXISTS public.get_actual_prepayments(uuid[], date, date, text[]);
DROP FUNCTION IF EXISTS public.get_abrechnung_modal_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_abrechnung_calculation_data(uuid, uuid);

-- 1. Table View Function: Fetch list with metadata and mode
CREATE OR REPLACE FUNCTION public.get_nebenkosten_with_metrics(user_id uuid)
 RETURNS TABLE(
    id uuid, 
    startdatum date, 
    enddatum date, 
    nebenkostenart text[], 
    betrag numeric[], 
    berechnungsart text[], 
    zaehlerkosten jsonb, 
    zaehlerverbrauch jsonb, 
    haeuser_id uuid, 
    user_id_field uuid, 
    vorauszahlungs_art text, -- Now included in the table view
    haus_name text, 
    gesamt_flaeche numeric, 
    anzahl_wohnungen integer, 
    anzahl_mieter integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH house_metrics AS (
        SELECT 
            h.id as house_id,
            h.name as house_name,
            COALESCE(h.groesse, (SELECT SUM(groesse) FROM "Wohnungen" WHERE haus_id = h.id)) as total_area,
            COUNT(w.id)::INTEGER as apartment_count
        FROM "Haeuser" h
        LEFT JOIN "Wohnungen" w ON h.id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        WHERE h.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY h.id, h.name, h.groesse
    ),
    tenant_counts AS (
        SELECT 
            n.id as nebenkosten_id,
            COUNT(DISTINCT m.id)::INTEGER as tenant_count
        FROM "Nebenkosten" n
        LEFT JOIN "Wohnungen" w ON n.haeuser_id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        LEFT JOIN "Mieter" m ON w.id = m.wohnung_id 
            AND m.user_id = get_nebenkosten_with_metrics.user_id
            AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
            AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
        WHERE n.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY n.id
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
        n.vorauszahlungs_art,
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
$function$;

-- 2. Actual Payment Helper: Fetch actual prepayments with name fallback
CREATE OR REPLACE FUNCTION public.get_actual_prepayments(
    p_wohnung_ids uuid[],
    p_start_date date,
    p_end_date date,
    p_tags text[] DEFAULT ARRAY['Nebenkosten'::text]
)
 RETURNS SETOF "Finanzen"
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$
 BEGIN
     RETURN QUERY
     SELECT *
     FROM "Finanzen"
     WHERE wohnung_id = ANY(p_wohnung_ids)
     AND datum >= p_start_date
     AND datum <= p_end_date
     AND ist_einnahmen = true
     AND (
         (tags && p_tags) -- Matches tags provided (default: Nebenkosten)
         OR
         (tags && ARRAY['Vorauszahlung']::text[]) -- Always allow 'Vorauszahlung' tag
         OR 
         (name ILIKE '%nebenkosten%' OR name ILIKE '%vorauszahlung%' OR notiz ILIKE '%nebenkosten%' OR notiz ILIKE '%vorauszahlung%') -- Name/Notiz fallback
     )
     -- Strict avoidance of back-payments (Nachzahlungen/Nachträge)
     AND NOT (name ILIKE '%nachzahlung%' OR name ILIKE '%nachtrag%' OR notiz ILIKE '%nachzahlung%' OR notiz ILIKE '%nachtrag%')
     AND NOT ('Nachzahlung' = ANY(tags));
 END;
 $function$;

-- 3. Update Abrechnung Modal Data Function
CREATE OR REPLACE FUNCTION public.get_abrechnung_modal_data(nebenkosten_id uuid, user_id uuid)
 RETURNS TABLE(nebenkosten_data jsonb, tenants jsonb, rechnungen jsonb, meters jsonb, readings jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      'vorauszahlungs_art', n.vorauszahlungs_art, -- Correctly included here
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
        'nebenkosten', m.nebenkosten,
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
      AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
      AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
  ),
  relevant_rechnungen AS (
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) as data
    FROM "Rechnungen" r
    WHERE r.nebenkosten_id = get_abrechnung_modal_data.nebenkosten_id
  ),
  relevant_meters AS (
    SELECT COALESCE(jsonb_agg(wz), '[]'::jsonb) as data
    FROM "Zaehler" wz
    WHERE wz.wohnung_id IN (
        SELECT m.wohnung_id 
        FROM "Mieter" m 
        JOIN "Wohnungen" w ON m.wohnung_id = w.id 
        WHERE w.haus_id = target_haus_id
    )
  ),
  relevant_readings AS (
    SELECT COALESCE(jsonb_agg(wa), '[]'::jsonb) as data
    FROM "Zaehler_Ablesungen" wa
    WHERE wa.ablese_datum >= start_datum AND wa.ablese_datum <= end_datum
  )
  SELECT
    (SELECT data FROM nebenkosten_with_house) as nebenkosten_data,
    (SELECT data FROM relevant_tenants) as tenants,
    (SELECT data FROM relevant_rechnungen) as rechnungen,
    (SELECT data FROM relevant_meters) as meters,
    (SELECT data FROM relevant_readings) as readings;
END;
$function$;

-- 4. Update Optimized Calculation Data Function
CREATE OR REPLACE FUNCTION public.get_abrechnung_calculation_data(nebenkosten_id uuid, user_id uuid)
 RETURNS TABLE(nebenkosten_data jsonb, tenants_with_occupancy jsonb, rechnungen jsonb, wasserzaehler_readings jsonb, wasserzaehler_meters jsonb, house_metrics jsonb, calculation_metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    WHERE n.id = get_abrechnung_calculation_data.nebenkosten_id 
    AND n.user_id = get_abrechnung_calculation_data.user_id;

    IF target_haus_id IS NULL THEN
        RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
    END IF;

    RETURN QUERY
    WITH nebenkosten_info AS (
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
            'vorauszahlungs_art', n.vorauszahlungs_art -- Now included
        ) as data
        FROM "Nebenkosten" n
        WHERE n.id = get_abrechnung_calculation_data.nebenkosten_id
    ),
    tenants_json AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'wohnung_id', m.wohnung_id,
                'einzug', m.einzug,
                'auszug', m.auszug,
                'nebenkosten', m.nebenkosten,
                'Wohnungen', jsonb_build_object('groesse', w.groesse, 'miete', w.miete),
                'occupancy', jsonb_build_object(
                    'totalDaysInPeriod', (n.enddatum - n.startdatum) + 1
                )
            )
        ) as data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        CROSS JOIN "Nebenkosten" n
        WHERE w.haus_id = target_haus_id AND n.id = get_abrechnung_calculation_data.nebenkosten_id
          AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
          AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
    ),
    rechnungen_info AS (
        SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) as data
        FROM "Rechnungen" r
        WHERE r.nebenkosten_id = get_abrechnung_calculation_data.nebenkosten_id
    ),
    house_summary AS (
        SELECT jsonb_build_object(
            'totalArea', COALESCE(h.groesse, (SELECT SUM(groesse) FROM "Wohnungen" WHERE haus_id = target_haus_id))
        ) as data
        FROM "Haeuser" h
        WHERE h.id = target_haus_id
    ),
    relevant_meters AS (
        SELECT COALESCE(jsonb_agg(wz), '[]'::jsonb) as data
        FROM "Zaehler" wz
        WHERE wz.wohnung_id IN (
            SELECT m.wohnung_id
            FROM "Mieter" m
            JOIN "Wohnungen" w ON m.wohnung_id = w.id
            WHERE w.haus_id = target_haus_id
        )
    ),
    relevant_readings AS (
        SELECT COALESCE(jsonb_agg(wa), '[]'::jsonb) as data
        FROM "Zaehler_Ablesungen" wa
        WHERE wa.ablese_datum >= start_datum AND wa.ablese_datum <= end_datum
    )
    SELECT
        (SELECT data FROM nebenkosten_info) as nebenkosten_data,
        (SELECT data FROM tenants_json) as tenants_with_occupancy,
        (SELECT data FROM rechnungen_info) as rechnungen,
        (SELECT data FROM relevant_readings) as wasserzaehler_readings,
        (SELECT data FROM relevant_meters) as wasserzaehler_meters,
        (SELECT data FROM house_summary) as house_metrics,
        jsonb_build_object('optimized', true) as calculation_metadata;
END;
$function$;
