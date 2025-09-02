-- Migration: Add performance optimization database functions
-- Created: 2025-02-02
-- Purpose: Optimize betriebskosten page performance by replacing individual queries with batch operations

-- Function 1: get_nebenkosten_with_metrics
-- Replaces individual getHausGesamtFlaeche calls with a single optimized query
CREATE OR REPLACE FUNCTION get_nebenkosten_with_metrics(user_id UUID)
RETURNS TABLE (
    id UUID,
    startdatum DATE,
    enddatum DATE,
    nebenkostenart TEXT[],
    betrag NUMERIC[],
    berechnungsart TEXT[],
    wasserkosten NUMERIC,
    wasserverbrauch NUMERIC,
    haeuser_id UUID,
    user_id_field UUID,
    haus_name TEXT,
    gesamt_flaeche NUMERIC,
    anzahl_wohnungen INTEGER,
    anzahl_mieter INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH house_metrics AS (
        -- Calculate house metrics efficiently using window functions
        SELECT 
            h.id as house_id,
            h.name as house_name,
            -- Use house.groesse if available, otherwise sum apartment sizes
            COALESCE(h.groesse, COALESCE(SUM(w.groesse), 0)) as total_area,
            COUNT(w.id)::INTEGER as apartment_count
        FROM "Haeuser" h
        LEFT JOIN "Wohnungen" w ON h.id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        WHERE h.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY h.id, h.name, h.groesse
    ),
    tenant_counts AS (
        -- Calculate tenant counts for each house and billing period
        SELECT 
            n.id as nebenkosten_id,
            n.haeuser_id,
            COUNT(DISTINCT m.id)::INTEGER as tenant_count
        FROM "Nebenkosten" n
        LEFT JOIN "Wohnungen" w ON n.haeuser_id = w.haus_id AND w.user_id = get_nebenkosten_with_metrics.user_id
        LEFT JOIN "Mieter" m ON w.id = m.wohnung_id 
            AND m.user_id = get_nebenkosten_with_metrics.user_id
            -- Filter tenants who lived during the billing period
            AND COALESCE(m.einzug, '1900-01-01'::DATE) <= n.enddatum
            AND COALESCE(m.auszug, '9999-12-31'::DATE) >= n.startdatum
        WHERE n.user_id = get_nebenkosten_with_metrics.user_id
        GROUP BY n.id, n.haeuser_id
    )
    SELECT 
        n.id,
        n.startdatum,
        n.enddatum,
        n.nebenkostenart,
        n.betrag,
        n.berechnungsart,
        n.wasserkosten,
        n.wasserverbrauch,
        n.haeuser_id,
        n.user_id as user_id_field,
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
$$;

-- Function 2: get_wasserzaehler_modal_data
-- Fetches all Wasserzähler modal data in one call
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
    haus_id UUID;
    start_datum DATE;
    end_datum DATE;
    current_year INTEGER;
    previous_year INTEGER;
BEGIN
    -- Get nebenkosten details
    SELECT n.haeuser_id, n.startdatum, n.enddatum
    INTO haus_id, start_datum, end_datum
    FROM "Nebenkosten" n
    WHERE n.id = get_wasserzaehler_modal_data.nebenkosten_id 
    AND n.user_id = get_wasserzaehler_modal_data.user_id;
    
    IF haus_id IS NULL THEN
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
        WHERE w.haus_id = get_wasserzaehler_modal_data.haus_id
        AND m.user_id = get_wasserzaehler_modal_data.user_id
        AND w.user_id = get_wasserzaehler_modal_data.user_id
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
        WHERE wz.nebenkosten_id = get_wasserzaehler_modal_data.nebenkosten_id
        AND wz.user_id = get_wasserzaehler_modal_data.user_id
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
        WHERE wz.user_id = get_wasserzaehler_modal_data.user_id
        AND wz.mieter_id IN (SELECT mieter_id FROM relevant_tenants)
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

-- Function 3: get_abrechnung_modal_data
-- Fetches all Abrechnung modal data in one call
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
    haus_id UUID;
    start_datum DATE;
    end_datum DATE;
BEGIN
    -- Get nebenkosten details first
    SELECT n.haeuser_id, n.startdatum, n.enddatum
    INTO haus_id, start_datum, end_datum
    FROM "Nebenkosten" n
    WHERE n.id = get_abrechnung_modal_data.nebenkosten_id 
    AND n.user_id = get_abrechnung_modal_data.user_id;
    
    IF haus_id IS NULL THEN
        RAISE EXCEPTION 'Nebenkosten entry not found or access denied';
    END IF;
    
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
                WHERE w.haus_id = h.id AND w.user_id = get_abrechnung_modal_data.user_id
            )),
            'anzahlWohnungen', (
                SELECT COUNT(*)::INTEGER
                FROM "Wohnungen" w
                WHERE w.haus_id = h.id AND w.user_id = get_abrechnung_modal_data.user_id
            ),
            'anzahlMieter', (
                SELECT COUNT(DISTINCT m.id)::INTEGER
                FROM "Wohnungen" w
                JOIN "Mieter" m ON w.id = m.wohnung_id
                WHERE w.haus_id = h.id 
                AND w.user_id = get_abrechnung_modal_data.user_id
                AND m.user_id = get_abrechnung_modal_data.user_id
                AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
                AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
            )
        ) as nebenkosten_data
        FROM "Nebenkosten" n
        LEFT JOIN "Haeuser" h ON n.haeuser_id = h.id
        WHERE n.id = get_abrechnung_modal_data.nebenkosten_id
        AND n.user_id = get_abrechnung_modal_data.user_id
    ),
    relevant_tenants AS (
        -- Get tenants with apartment information
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'email', m.email,
                'telefonnummer', m.telefonnummer,
                'einzug', m.einzug,
                'auszug', m.auszug,
                'notiz', m.notiz,
                'nebenkosten', m.nebenkosten,
                'wohnung_id', m.wohnung_id,
                'user_id', m.user_id,
                'Wohnungen', jsonb_build_object(
                    'name', w.name,
                    'groesse', w.groesse,
                    'miete', w.miete
                )
            )
        ) as tenants_data
        FROM "Mieter" m
        JOIN "Wohnungen" w ON m.wohnung_id = w.id
        WHERE w.haus_id = get_abrechnung_modal_data.haus_id
        AND m.user_id = get_abrechnung_modal_data.user_id
        AND w.user_id = get_abrechnung_modal_data.user_id
        AND COALESCE(m.einzug, '1900-01-01'::DATE) <= end_datum
        AND COALESCE(m.auszug, '9999-12-31'::DATE) >= start_datum
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
        WHERE r.nebenkosten_id = get_abrechnung_modal_data.nebenkosten_id
        AND r.user_id = get_abrechnung_modal_data.user_id
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
        WHERE wz.nebenkosten_id = get_abrechnung_modal_data.nebenkosten_id
        AND wz.user_id = get_abrechnung_modal_data.user_id
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
END;
$$;

-- Function 4: save_wasserzaehler_batch
-- Optimized batch save operation for Wasserzähler data with automatic total calculation
CREATE OR REPLACE FUNCTION save_wasserzaehler_batch(
    nebenkosten_id UUID,
    user_id UUID,
    readings JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    total_verbrauch NUMERIC,
    inserted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    reading_record JSONB;
    total_consumption NUMERIC := 0;
    insert_count INTEGER := 0;
    nebenkosten_exists BOOLEAN := FALSE;
BEGIN
    -- Verify nebenkosten exists and belongs to user
    SELECT EXISTS(
        SELECT 1 FROM "Nebenkosten" n 
        WHERE n.id = save_wasserzaehler_batch.nebenkosten_id 
        AND n.user_id = save_wasserzaehler_batch.user_id
    ) INTO nebenkosten_exists;
    
    IF NOT nebenkosten_exists THEN
        RETURN QUERY SELECT FALSE, 'Nebenkosten entry not found or access denied'::TEXT, 0::NUMERIC, 0::INTEGER;
        RETURN;
    END IF;
    
    -- Delete existing entries for this nebenkosten_id
    DELETE FROM "Wasserzaehler" 
    WHERE nebenkosten_id = save_wasserzaehler_batch.nebenkosten_id 
    AND user_id = save_wasserzaehler_batch.user_id;
    
    -- If no readings provided, set total to 0 and return
    IF readings IS NULL OR jsonb_array_length(readings) = 0 THEN
        UPDATE "Nebenkosten" 
        SET wasserverbrauch = 0 
        WHERE id = save_wasserzaehler_batch.nebenkosten_id 
        AND user_id = save_wasserzaehler_batch.user_id;
        
        RETURN QUERY SELECT TRUE, 'All existing readings deleted and total consumption set to 0'::TEXT, 0::NUMERIC, 0::INTEGER;
        RETURN;
    END IF;
    
    -- Insert new readings and calculate total
    FOR reading_record IN SELECT * FROM jsonb_array_elements(readings)
    LOOP
        -- Validate required fields
        IF (reading_record->>'mieter_id') IS NULL OR 
           (reading_record->>'zaehlerstand') IS NULL OR
           NOT (reading_record->>'zaehlerstand' ~ '^[0-9]+\.?[0-9]*$') THEN
            CONTINUE; -- Skip invalid entries
        END IF;
        
        -- Insert the reading
        INSERT INTO "Wasserzaehler" (
            user_id,
            mieter_id,
            ablese_datum,
            zaehlerstand,
            verbrauch,
            nebenkosten_id
        ) VALUES (
            save_wasserzaehler_batch.user_id,
            (reading_record->>'mieter_id')::UUID,
            COALESCE(
                (reading_record->>'ablese_datum')::DATE,
                CURRENT_DATE
            ),
            (reading_record->>'zaehlerstand')::NUMERIC,
            COALESCE((reading_record->>'verbrauch')::NUMERIC, 0),
            save_wasserzaehler_batch.nebenkosten_id
        );
        
        -- Add to total consumption
        total_consumption := total_consumption + COALESCE((reading_record->>'verbrauch')::NUMERIC, 0);
        insert_count := insert_count + 1;
    END LOOP;
    
    -- Update Nebenkosten with calculated total
    UPDATE "Nebenkosten" 
    SET wasserverbrauch = total_consumption 
    WHERE id = save_wasserzaehler_batch.nebenkosten_id 
    AND user_id = save_wasserzaehler_batch.user_id;
    
    RETURN QUERY SELECT TRUE, 
                        CASE 
                            WHEN insert_count > 0 THEN 'Wasserzähler data saved successfully'::TEXT
                            ELSE 'No valid readings to save'::TEXT
                        END,
                        total_consumption, 
                        insert_count;
END;
$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_nebenkosten_with_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wasserzaehler_modal_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_abrechnung_modal_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_wasserzaehler_batch(UUID, UUID, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_nebenkosten_with_metrics(UUID) IS 'Optimized function to fetch Nebenkosten with calculated house metrics in a single query, replacing individual getHausGesamtFlaeche calls';
COMMENT ON FUNCTION get_wasserzaehler_modal_data(UUID, UUID) IS 'Fetches all Wasserzähler modal data including tenants, current readings, and previous readings in one optimized call';
COMMENT ON FUNCTION get_abrechnung_modal_data(UUID, UUID) IS 'Fetches all Abrechnung modal data including nebenkosten details, tenants, rechnungen, and wasserzaehler readings in one call';
COMMENT ON FUNCTION save_wasserzaehler_batch(UUID, UUID, JSONB) IS 'Optimized batch save operation for Wasserzähler data with automatic total calculation and validation';