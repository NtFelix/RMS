-- Quick test to verify the ambiguous column reference fix
-- Run this in Supabase SQL Editor to test the functions

-- Test 1: Check if get_wasserzaehler_modal_data function exists and can be called
SELECT 'Testing get_wasserzaehler_modal_data function...' as test_step;

-- This should return an error about "not found" or "access denied" but NOT "ambiguous column"
SELECT * FROM get_wasserzaehler_modal_data(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
);

-- Test 2: Check if get_abrechnung_modal_data function works
SELECT 'Testing get_abrechnung_modal_data function...' as test_step;

-- This should return an error about "not found" or "access denied" but NOT "ambiguous column"
SELECT * FROM get_abrechnung_modal_data(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
);

-- Test 3: Check if get_abrechnung_calculation_data function works
SELECT 'Testing get_abrechnung_calculation_data function...' as test_step;

-- This should return an error about "not found" or "access denied" but NOT "ambiguous column"
SELECT * FROM get_abrechnung_calculation_data(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
);

SELECT 'All tests completed. If you see "Nebenkosten entry not found" errors, the fix worked!' as result;