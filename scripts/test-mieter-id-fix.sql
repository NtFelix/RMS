-- Test to verify the mieter_id ambiguity fix
-- Run this in Supabase SQL Editor

SELECT 'Testing get_wasserzaehler_modal_data for mieter_id ambiguity...' as test_step;

-- This should return "Nebenkosten entry not found" error, NOT "mieter_id is ambiguous" error
SELECT * FROM get_wasserzaehler_modal_data(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
);

SELECT 'Test completed. If you see "Nebenkosten entry not found", the mieter_id fix worked!' as result;