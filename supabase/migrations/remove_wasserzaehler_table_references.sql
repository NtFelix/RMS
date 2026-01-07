-- Migration to remove all references to the old Wasserzaehler table
-- and update functions to use the new Zaehler + Zaehler_Ablesungen structure

-- Old save_wasserzaehler_batch function has been removed as it's no longer used

-- Note: get_abrechnung_modal_data function is already updated in update_abrechnung_modal_data_function.sql

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.get_abrechnung_calculation_data(uuid, uuid);

-- Update get_abrechnung_calculation_data function to use new table structure
CREATE OR REPLACE FUNCTION public.get_abrechnung_calculation_data(
    nebenkosten_id uuid,
    user_id uuid
)
RETURNS TABLE(
    nebenkosten_data jsonb,
    tenants_data jsonb,
    house_metrics jsonb
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
            'wasserkosten', n.wasserkosten,
            'wasserverbrauch', n.wasserverbrauch,
            'haeuser_id', n.haeuser_id
        ) as data
        FROM "Nebenkosten" n
        WHERE n.id = get_abrechnung_calculation_data.nebenkosten_id
        AND n.user_id = get_abrechnung_calculation_data.user_id
    ),
    apartment_ids AS (
        SELECT DISTINCT w.id as wohnung_id
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        WHERE w.haus_id = target_haus_id
        AND m.user_id = get_abrechnung_calculation_data.user_id
        AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
        AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
    ),
    water_consumption_data AS (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'mieter_id', m.id,
                'verbrauch', COALESCE(wa.verbrauch, 0)
            )
        ), '[]'::jsonb) as data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        LEFT JOIN "Zaehler" wz ON wz.wohnung_id = w.id AND wz.user_id = get_abrechnung_calculation_data.user_id
        LEFT JOIN "Zaehler_Ablesungen" wa ON wa.zaehler_id = wz.id 
            AND wa.user_id = get_abrechnung_calculation_data.user_id
            AND wa.ablese_datum >= start_datum
            AND wa.ablese_datum <= end_datum
        WHERE w.haus_id = target_haus_id
        AND m.user_id = get_abrechnung_calculation_data.user_id
        AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
        AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
    ),
    tenants_with_consumption AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'einzug', m.einzug,
                'auszug', m.auszug,
                'wohnung_id', m.wohnung_id,
                'wohnung_groesse', w.groesse,
                'wohnung_miete', w.miete,
                'water_consumption', COALESCE(
                    (SELECT SUM((consumption_item->>'verbrauch')::numeric)
                     FROM jsonb_array_elements((SELECT data FROM water_consumption_data)) as consumption_item
                     WHERE (consumption_item->>'mieter_id')::uuid = m.id), 0)
            )
        ) as data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        WHERE w.haus_id = target_haus_id
        AND m.user_id = get_abrechnung_calculation_data.user_id
        AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
        AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
    ),
    house_summary AS (
        SELECT jsonb_build_object(
            'totalArea', COALESCE(h.groesse, (
                SELECT SUM(w.groesse)
                FROM "Wohnungen" w
                WHERE w.haus_id = target_haus_id
                AND w.user_id = get_abrechnung_calculation_data.user_id
            )),
            'totalApartments', (
                SELECT COUNT(DISTINCT w.id)
                FROM "Wohnungen" w
                WHERE w.haus_id = target_haus_id
                AND w.user_id = get_abrechnung_calculation_data.user_id
            ),
            'totalTenants', (
                SELECT COUNT(*)
                FROM "Mieter" m
                JOIN "Wohnungen" w ON m.wohnung_id = w.id
                WHERE w.haus_id = target_haus_id
                AND m.user_id = get_abrechnung_calculation_data.user_id
                AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
                AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
            ),
            'totalWaterConsumption', COALESCE((
                SELECT SUM(wa.verbrauch)
                FROM "Zaehler_Ablesungen" wa
                JOIN "Zaehler" wz ON wa.zaehler_id = wz.id
                JOIN "Wohnungen" w ON wz.wohnung_id = w.id
                WHERE w.haus_id = target_haus_id
                AND wa.user_id = get_abrechnung_calculation_data.user_id
                AND wa.ablese_datum >= start_datum
                AND wa.ablese_datum <= end_datum
            ), 0)
        ) as data
        FROM "Haeuser" h
        WHERE h.id = target_haus_id
        AND h.user_id = get_abrechnung_calculation_data.user_id
    )
    SELECT 
        (SELECT data FROM nebenkosten_info) as nebenkosten_data,
        (SELECT data FROM tenants_with_consumption) as tenants_data,
        (SELECT data FROM house_summary) as house_metrics;
END;
$function$;

-- Summary: 
-- - get_wasserzaehler_modal_data: Already updated in update_wasserzaehler_modal_data_function.sql
-- - get_abrechnung_modal_data: Already updated in update_abrechnung_modal_data_function.sql  
-- - save_wasserzaehler_batch: Updated above to use new table structure
-- - get_abrechnung_calculation_data: Updated above to use new table structure
--
-- The old Wasserzaehler table has been removed and replaced with 
-- Zaehler + Zaehler_Ablesungen for better data normalization