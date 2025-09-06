-- Test script for performance optimization database functions
-- This script can be run in Supabase SQL Editor to test the functions

-- Test 1: get_nebenkosten_with_metrics function
-- Replace 'your-user-id-here' with an actual user ID from your database
DO $$
DECLARE
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
    result_count INTEGER;
BEGIN
    -- Test the function exists and returns data
    SELECT COUNT(*) INTO result_count
    FROM get_nebenkosten_with_metrics(test_user_id);
    
    RAISE NOTICE 'get_nebenkosten_with_metrics returned % rows', result_count;
    
    -- Show sample output structure
    IF result_count > 0 THEN
        RAISE NOTICE 'Sample row structure:';
        PERFORM id, startdatum, enddatum, haus_name, gesamt_flaeche, anzahl_wohnungen, anzahl_mieter
        FROM get_nebenkosten_with_metrics(test_user_id)
        LIMIT 1;
    END IF;
END $$;

-- Test 2: get_wasserzaehler_modal_data function
-- Replace with actual nebenkosten_id and user_id
DO $$
DECLARE
    test_nebenkosten_id UUID := 'your-nebenkosten-id-here'; -- Replace with actual nebenkosten ID
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
    result_count INTEGER;
BEGIN
    -- Test the function exists and returns data
    SELECT COUNT(*) INTO result_count
    FROM get_wasserzaehler_modal_data(test_nebenkosten_id, test_user_id);
    
    RAISE NOTICE 'get_wasserzaehler_modal_data returned % rows', result_count;
    
    -- Show sample output structure
    IF result_count > 0 THEN
        RAISE NOTICE 'Sample tenant data structure available';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'get_wasserzaehler_modal_data test failed: %', SQLERRM;
END $$;

-- Test 3: get_abrechnung_modal_data function
-- Replace with actual nebenkosten_id and user_id
DO $$
DECLARE
    test_nebenkosten_id UUID := 'your-nebenkosten-id-here'; -- Replace with actual nebenkosten ID
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
    result_record RECORD;
BEGIN
    -- Test the function exists and returns data
    SELECT * INTO result_record
    FROM get_abrechnung_modal_data(test_nebenkosten_id, test_user_id);
    
    IF result_record IS NOT NULL THEN
        RAISE NOTICE 'get_abrechnung_modal_data returned structured data successfully';
        RAISE NOTICE 'Nebenkosten data: %', result_record.nebenkosten_data IS NOT NULL;
        RAISE NOTICE 'Tenants data: %', result_record.tenants IS NOT NULL;
        RAISE NOTICE 'Rechnungen data: %', result_record.rechnungen IS NOT NULL;
        RAISE NOTICE 'Wasserzaehler data: %', result_record.wasserzaehler_readings IS NOT NULL;
    ELSE
        RAISE NOTICE 'get_abrechnung_modal_data returned no data';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'get_abrechnung_modal_data test failed: %', SQLERRM;
END $$;

-- Performance comparison query (optional)
-- This can help measure the improvement over individual queries
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
BEGIN
    -- Time the optimized function
    start_time := clock_timestamp();
    PERFORM * FROM get_nebenkosten_with_metrics(test_user_id);
    end_time := clock_timestamp();
    
    RAISE NOTICE 'Optimized function took: % ms', 
        EXTRACT(MILLISECONDS FROM (end_time - start_time));
END $$;

-- Test 4: save_wasserzaehler_batch function
-- Replace with actual nebenkosten_id and user_id
DO $
DECLARE
    test_nebenkosten_id UUID := 'your-nebenkosten-id-here'; -- Replace with actual nebenkosten ID
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
    test_readings JSONB := '[
        {
            "mieter_id": "test-mieter-1",
            "ablese_datum": "2024-01-15",
            "zaehlerstand": 1234.5,
            "verbrauch": 50.2
        },
        {
            "mieter_id": "test-mieter-2",
            "ablese_datum": "2024-01-15",
            "zaehlerstand": 2345.6,
            "verbrauch": 60.3
        }
    ]';
    result_record RECORD;
BEGIN
    -- Test the batch save function
    SELECT * INTO result_record
    FROM save_wasserzaehler_batch(test_nebenkosten_id, test_user_id, test_readings);
    
    IF result_record IS NOT NULL THEN
        RAISE NOTICE 'save_wasserzaehler_batch result:';
        RAISE NOTICE 'Success: %', result_record.success;
        RAISE NOTICE 'Message: %', result_record.message;
        RAISE NOTICE 'Total Verbrauch: %', result_record.total_verbrauch;
        RAISE NOTICE 'Inserted Count: %', result_record.inserted_count;
    ELSE
        RAISE NOTICE 'save_wasserzaehler_batch returned no data';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'save_wasserzaehler_batch test failed: %', SQLERRM;
END $;

-- Test 5: save_wasserzaehler_batch with empty readings (should set total to 0)
DO $
DECLARE
    test_nebenkosten_id UUID := 'your-nebenkosten-id-here'; -- Replace with actual nebenkosten ID
    test_user_id UUID := 'your-user-id-here'; -- Replace with actual user ID
    test_readings JSONB := '[]'; -- Empty array
    result_record RECORD;
BEGIN
    -- Test the batch save function with empty readings
    SELECT * INTO result_record
    FROM save_wasserzaehler_batch(test_nebenkosten_id, test_user_id, test_readings);
    
    IF result_record IS NOT NULL THEN
        RAISE NOTICE 'save_wasserzaehler_batch (empty) result:';
        RAISE NOTICE 'Success: %', result_record.success;
        RAISE NOTICE 'Message: %', result_record.message;
        RAISE NOTICE 'Total Verbrauch: %', result_record.total_verbrauch;
        RAISE NOTICE 'Inserted Count: %', result_record.inserted_count;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'save_wasserzaehler_batch (empty) test failed: %', SQLERRM;
END $;

-- Verify function signatures
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_nebenkosten_with_metrics',
    'get_wasserzaehler_modal_data', 
    'get_abrechnung_modal_data',
    'save_wasserzaehler_batch'
)
ORDER BY routine_name;