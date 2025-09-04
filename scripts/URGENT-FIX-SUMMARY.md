# 🚨 URGENT FIX: Ambiguous Column Reference Errors

## Problems Identified
The server logs show multiple ambiguous column reference errors:
1. **"column reference 'haus_id' is ambiguous"** ✅ FIXED
2. **"column reference 'mieter_id' is ambiguous"** ✅ FIXED

These errors occur because PostgreSQL cannot determine which column to use when there are multiple tables with the same column name in a query.

## Root Causes
1. **haus_id ambiguity**: Local variable `haus_id` conflicted with `w.haus_id` column in `Wohnungen` table
2. **mieter_id ambiguity**: In the `previous_readings` CTE, the subquery `SELECT mieter_id FROM relevant_tenants` was ambiguous

## Fix Applied
**Changed all local variables from `haus_id` to `target_haus_id`** in three functions:

1. `get_wasserzaehler_modal_data`
2. `get_abrechnung_modal_data` 
3. `get_abrechnung_calculation_data`

### Fix 1: haus_id Variable Conflict
**Before (Ambiguous):**
```sql
DECLARE
    haus_id UUID;  -- ❌ Conflicts with w.haus_id column
BEGIN
    WHERE w.haus_id = haus_id  -- ❌ Ambiguous!
```

**After (Fixed):**
```sql
DECLARE
    target_haus_id UUID;  -- ✅ Unique variable name
BEGIN
    WHERE w.haus_id = target_haus_id  -- ✅ Clear reference!
```

### Fix 2: mieter_id Subquery Ambiguity
**Before (Ambiguous):**
```sql
AND wz.mieter_id IN (SELECT mieter_id FROM relevant_tenants)  -- ❌ Ambiguous!
```

**After (Fixed):**
```sql
AND wz.mieter_id IN (SELECT rt.mieter_id FROM relevant_tenants rt)  -- ✅ Clear reference!
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

Quick test for mieter_id fix:
```bash
# Run in Supabase SQL Editor
\i scripts/test-mieter-id-fix.sql
```

### 3. Test in Application
- Navigate to betriebskosten page
- Try opening Wasserzähler modal
- Should now work without "ambiguous column" errors

## Expected Result
- ✅ No more "column reference 'haus_id' is ambiguous" errors
- ✅ No more "column reference 'mieter_id' is ambiguous" errors  
- ✅ Wasserzähler modal loads successfully
- ✅ Functions return proper "not found" errors for invalid data instead of SQL errors
- ✅ get_abrechnung_modal_data should work (already working based on logs)

## Files Modified
- `supabase/migrations/manual-database-setup.sql` - Fixed all three functions
- `scripts/verify-wasserzaehler-fix.js` - Updated to detect ambiguous column errors
- `scripts/test-ambiguous-fix.sql` - Quick test script for Supabase

## Priority: CRITICAL
This fix resolves the immediate SQL error preventing the Wasserzähler functionality from working.