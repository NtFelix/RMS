# 🚨 URGENT FIX: Ambiguous Column Reference Error

## Problem Identified
The server logs show: **"column reference 'haus_id' is ambiguous"**

This error occurs because PostgreSQL cannot determine which `haus_id` column to use when there are multiple tables with the same column name in a query.

## Root Cause
In the database functions, the local variable `haus_id` conflicts with the `haus_id` column in the `Wohnungen` table, causing PostgreSQL to be unable to resolve which one to use in WHERE clauses.

## Fix Applied
**Changed all local variables from `haus_id` to `target_haus_id`** in three functions:

1. `get_wasserzaehler_modal_data`
2. `get_abrechnung_modal_data` 
3. `get_abrechnung_calculation_data`

### Before (Ambiguous):
```sql
DECLARE
    haus_id UUID;  -- ❌ Conflicts with w.haus_id column
BEGIN
    SELECT n.haeuser_id INTO haus_id FROM "Nebenkosten" n ...
    
    WHERE w.haus_id = haus_id  -- ❌ Ambiguous!
```

### After (Fixed):
```sql
DECLARE
    target_haus_id UUID;  -- ✅ Unique variable name
BEGIN
    SELECT n.haeuser_id INTO target_haus_id FROM "Nebenkosten" n ...
    
    WHERE w.haus_id = target_haus_id  -- ✅ Clear reference!
```

## Immediate Action Required

### 1. Update Database Functions
**Copy the entire content of `supabase/migrations/manual-database-setup.sql` and run it in Supabase SQL Editor**

This will replace the existing functions with the fixed versions.

### 2. Verify the Fix
Run the test script:
```bash
node scripts/verify-wasserzaehler-fix.js
```

Or test directly in Supabase SQL Editor:
```sql
-- Should return "not found" error, NOT "ambiguous column" error
SELECT * FROM get_wasserzaehler_modal_data(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
);
```

### 3. Test in Application
- Navigate to betriebskosten page
- Try opening Wasserzähler modal
- Should now work without "ambiguous column" errors

## Expected Result
- ✅ No more "column reference 'haus_id' is ambiguous" errors
- ✅ Wasserzähler modal loads successfully
- ✅ Functions return proper "not found" errors for invalid data instead of SQL errors

## Files Modified
- `supabase/migrations/manual-database-setup.sql` - Fixed all three functions
- `scripts/verify-wasserzaehler-fix.js` - Updated to detect ambiguous column errors
- `scripts/test-ambiguous-fix.sql` - Quick test script for Supabase

## Priority: CRITICAL
This fix resolves the immediate SQL error preventing the Wasserzähler functionality from working.