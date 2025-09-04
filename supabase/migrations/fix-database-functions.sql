-- ============================================================================
-- FIX FOR DATABASE FUNCTIONS - CORRECTED SQL SYNTAX
-- ============================================================================
-- 
-- This script fixes the SQL syntax errors in the database functions
-- Run this in your Supabase SQL Editor to fix the "missing FROM-clause entry" errors
--
-- ============================================================================

-- Fix Function 1: get_wasserzaehler_modal_data
-- Corrected variable references in WHERE clauses
CREATE OR REPLACE FUNCTION get_wasserzaehler_modal_data(nebenkosten_id UUID, user_id UUID)
RETURNS TABLE (
    mieter_id UUID,
    mieter_name TEXT,
    wohnung_name TEXT,
    wohnung_groesse NUMERIC,
    current_reading JSONB,
    previous_reading JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_haus_id UUID;
    start_datum DATE;
    end_datum DATE;
    current_year INTEGER;
    previous_year INTEGER;
BEGIN
    -- Get nebenkosten details
    SELECT n.haeuser_id, n.startdatum, n.enddatum
    INTO v_haus_id, start_datum, end_datum
    FROM "Nebenkosten" n
    WHERE n.id = $1 
    AND n.user_id = $2;
    
    IF v_haus_id IS NULL THEN
        RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
    END IF;
    
    -- Extract years for previous reading lookup
    current_year := EXTRACT(YEAR FROM start_datum);
    previous_year := current_year - 1;
    
    RETURN QUERY
    WITH relevant_tenants AS (
        -- Get tenants who lived in the house during the billing period
        SELECT DISTINCT
            m.id as mieter_id,
            m.name as mieter_name,
            w.name as wohnung_name,
            w.groesse as wohnung_groesse
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        WHERE w.haus_id = v_haus_id
        AND m.user_id = $2
        AND w.user_id = $2
        -- Filter by date overlap
        AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
        AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
    ),
    current_readings AS (
        -- Get current readings for this nebenkosten_id
        SELECT 
            wz.mieter_id,
            jsonb_build_object(
                'ablese_datum', wz.ablese_datum,
                'zaehlerstand', wz.zaehlerstand,
                'verbrauch', wz.verbrauch
            ) as reading_data
        FROM "Wasserzaehler" wz
        WHERE wz.nebenkosten_id = $1
        AND wz.user_id = $2
    ),
    previous_readings AS (
        -- Get most recent previous readings (preferably from previous year)
        SELECT DISTINCT ON (wz.mieter_id)
            wz.mieter_id,
            jsonb_build_object(
                'ablese_datum', wz.ablese_datum,
                'zaehlerstand', wz.zaehlerstand,
                'verbrauch', wz.verbrauch
            ) as reading_data
        FROM "Wasserzaehler" wz
        JOIN "Nebenkosten" n ON wz.nebenkosten_id = n.id
        JOIN "Wohnungen" w ON w.haus_id = n.haeuser_id
        JOIN "Mieter" m ON m.wohnung_id = w.id
        WHERE wz.user_id = $2
        AND wz.mieter_id = m.id
        AND w.haus_id = v_haus_id
        AND wz.ablese_datum < start_datum
        ORDER BY wz.mieter_id, 
                 -- Prefer readings from previous year, then most recent
                 CASE WHEN EXTRACT(YEAR FROM wz.ablese_datum) = previous_year THEN 0 ELSE 1 END,
                 wz.ablese_datum DESC
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
$$;

-- Fix Function 2: get_abrechnung_modal_data
-- Corrected variable references in WHERE clauses
CREATE OR REPLACE FUNCTION get_abrechnung_modal_data(nebenkosten_id UUID, user_id UUID)
RETURNS TABLE (
    nebenkosten_data JSONB,
    tenants JSONB,
    rechnungen JSONB,
    wasserzaehler_readings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_haus_id UUID;
    start_datum DATE;
    end_datum DATE;
    v_debug_info JSONB;
    v_cnt_wohnungen INTEGER;
    v_cnt_mieter_house INTEGER;
    v_cnt_mieter_user INTEGER;
    v_cnt_mieter_period INTEGER;
BEGIN
    -- Log input parameters
    RAISE NOTICE 'Function called with nebenkosten_id: %, user_id: %', $1, $2;
    
    -- Get nebenkosten details first
    BEGIN
        SELECT n.haeuser_id, n.startdatum, n.enddatum
        INTO v_haus_id, start_datum, end_datum
        FROM "Nebenkosten" n
        WHERE n.id = $1 
        AND n.user_id = $2
        LIMIT 1;
        
        IF v_haus_id IS NULL THEN
            RAISE EXCEPTION 'Nebenkosten entry not found or access denied for nebenkosten_id: % and user_id: %', $1, $2;
        END IF;
        
        RAISE NOTICE 'Found nebenkosten entry: haus_id=%, start_datum=%, end_datum=%', 
                     v_haus_id, start_datum, end_datum;
        
        -- Debug counts
        SELECT COUNT(*) INTO v_cnt_wohnungen FROM "Wohnungen" w WHERE w.haus_id = v_haus_id;
        RAISE NOTICE 'Wohnungen in Haus: %', v_cnt_wohnungen;
        
        SELECT COUNT(*) INTO v_cnt_mieter_house
        FROM "Mieter" m
        JOIN "Wohnungen" w ON w.id = m.wohnung_id
        WHERE w.haus_id = v_haus_id;
        RAISE NOTICE 'Mieter im Haus (alle Nutzer): %', v_cnt_mieter_house;
        
        SELECT COUNT(*) INTO v_cnt_mieter_user
        FROM "Mieter" m
        JOIN "Wohnungen" w ON w.id = m.wohnung_id
        WHERE w.haus_id = v_haus_id AND m.user_id = $2;
        RAISE NOTICE 'Mieter im Haus (user_id=%): %', $2, v_cnt_mieter_user;
        
        RAISE NOTICE 'Checking tenants for period: % to %', start_datum, end_datum;
        SELECT COUNT(*) INTO v_cnt_mieter_period
        FROM "Mieter" m
        JOIN "Wohnungen" w ON w.id = m.wohnung_id
        WHERE w.haus_id = v_haus_id
          AND m.user_id = $2
          AND (m.einzug <= end_datum AND (m.auszug IS NULL OR m.auszug >= start_datum));
        RAISE NOTICE 'Mieter im Zeitraum (OVERLAPS): %', v_cnt_mieter_period;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error fetching nebenkosten details: %', SQLERRM;
    END;
    
    BEGIN
        RETURN QUERY
        WITH nebenkosten_with_house AS (
        -- Get nebenkosten data with house information
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
            'Haeuser', jsonb_build_object(
                'name', COALESCE(h.name, 'Unbekanntes Haus')
            ),
            'gesamtFlaeche', COALESCE(h.groesse, (
                SELECT COALESCE(SUM(w.groesse), 0)
                FROM "Wohnungen" w
                WHERE w.haus_id = v_haus_id  -- local variable
            )),
            'anzahlWohnungen', (
                SELECT COUNT(*)::INTEGER
                FROM "Wohnungen" w
                WHERE w.haus_id = v_haus_id  -- local variable
            ),
            'anzahlMieter', (
                SELECT COUNT(DISTINCT m.id)::INTEGER
                FROM "Wohnungen" w
                JOIN "Mieter" m ON w.id = m.wohnung_id
                WHERE w.haus_id = v_haus_id
                AND (m.einzug <= end_datum AND (m.auszug IS NULL OR m.auszug >= start_datum))
            )
        ) as nebenkosten_data
        FROM "Nebenkosten" n
        LEFT JOIN "Haeuser" h ON n.haeuser_id = h.id
        WHERE n.id = $1
        AND n.user_id = $2
    ),
    relevant_tenants AS (
        -- Get tenants with apartment information
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'einzug', m.einzug,
                'auszug', m.auszug,
                'user_id', m.user_id,
                'Wohnungen', jsonb_build_object(
                    'name', w.name,
                    'groesse', w.groesse,
                    'miete', w.miete
                )
            )
            ORDER BY m.name
        ), '[]'::jsonb) as tenants_data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        WHERE w.haus_id = v_haus_id
        AND m.user_id = $2
        -- Check if tenant was active during the billing period
        AND (
          -- Tenant moved in before or during the period and hasn't moved out yet
          (m.einzug <= end_datum AND (m.auszug IS NULL OR m.auszug >= start_datum))
          -- OR moved in before period end and hasn't moved out yet
          OR (m.einzug <= end_datum AND m.auszug IS NULL)
          -- OR moved in before period end and moved out after period start
          OR (m.einzug <= end_datum AND m.auszug >= start_datum)
        )
    ),
    rechnungen_data AS (
        -- Get rechnungen for this nebenkosten
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'nebenkosten_id', r.nebenkosten_id,
                'mieter_id', r.mieter_id,
                'name', r.name,
                'betrag', r.betrag,
                'user_id', r.user_id
            )
        ), '[]'::jsonb) as rechnungen_data
        FROM "Rechnungen" r
        WHERE r.nebenkosten_id = $1
        AND r.user_id = $2
    ),
    wasserzaehler_data AS (
        -- Get wasserzaehler readings for this nebenkosten
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', wz.id,
                'mieter_id', wz.mieter_id,
                'ablese_datum', wz.ablese_datum,
                'zaehlerstand', wz.zaehlerstand,
                'verbrauch', wz.verbrauch,
                'nebenkosten_id', wz.nebenkosten_id,
                'user_id', wz.user_id
            )
        ), '[]'::jsonb) as wasserzaehler_data
        FROM "Wasserzaehler" wz
        WHERE wz.nebenkosten_id = $1
        AND wz.user_id = $2
    )
    SELECT 
        nwh.nebenkosten_data,
        COALESCE(rt.tenants_data, '[]'::jsonb) as tenants,
        rd.rechnungen_data as rechnungen,
        wd.wasserzaehler_data as wasserzaehler_readings
        FROM nebenkosten_with_house nwh
        CROSS JOIN relevant_tenants rt
        CROSS JOIN rechnungen_data rd
        CROSS JOIN wasserzaehler_data wd;
        
        -- Log successful execution
        GET DIAGNOSTICS v_debug_info = ROW_COUNT;
        RAISE NOTICE 'Successfully returned % rows', v_debug_info;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in main query: %', SQLERRM;
    END;
END;
$$;

-- Grant permissions again to ensure they're properly set
GRANT EXECUTE ON FUNCTION get_wasserzaehler_modal_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_abrechnung_modal_data(UUID, UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the functions were updated successfully:

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_wasserzaehler_modal_data', 
    'get_abrechnung_modal_data'
)
ORDER BY routine_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see this message, the function fixes were applied successfully!
-- You can now test the Wasserzähler and Abrechnung modals in your application.
-- ============================================================================