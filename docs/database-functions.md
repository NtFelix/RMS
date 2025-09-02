# Database Functions Documentation

## Overview

This document provides comprehensive documentation for the optimized database functions implemented as part of the betriebskosten performance optimization project. These functions replace inefficient client-side operations with server-side database processing to improve performance and reduce Cloudflare Worker execution times.

## Performance Optimization Functions

### 1. get_nebenkosten_with_metrics(user_id UUID)

**Purpose**: Optimized replacement for fetchNebenkostenList that eliminates individual getHausGesamtFlaeche calls.

**Performance Impact**: Reduces database calls from O(n) to O(1) where n is the number of nebenkosten items.

**Parameters**:
- `user_id` (UUID): The authenticated user's ID for data filtering

**Returns**: Table with the following columns:
- `id` (UUID): Nebenkosten ID
- `startdatum` (DATE): Start date of billing period
- `enddatum` (DATE): End date of billing period
- `nebenkostenart` (TEXT[]): Array of cost types
- `betrag` (NUMERIC[]): Array of amounts
- `berechnungsart` (TEXT[]): Array of calculation methods
- `wasserkosten` (NUMERIC): Water costs
- `wasserverbrauch` (NUMERIC): Water consumption
- `haeuser_id` (UUID): House ID
- `user_id_field` (UUID): User ID
- `haus_name` (TEXT): House name (calculated)
- `gesamt_flaeche` (NUMERIC): Total house area (calculated)
- `anzahl_wohnungen` (INTEGER): Number of apartments (calculated)
- `anzahl_mieter` (INTEGER): Number of tenants during billing period (calculated)

**Usage Example**:
```sql
SELECT * FROM get_nebenkosten_with_metrics('user-uuid-here');
```

**Implementation Details**:
- Uses Common Table Expressions (CTEs) for efficient data aggregation
- Calculates house metrics using window functions and joins
- Filters tenants by date range overlap with billing period
- Handles NULL values gracefully with COALESCE

### 2. get_wasserzaehler_modal_data(nebenkosten_id UUID, user_id UUID)

**Purpose**: Fetches all Wasserzähler modal data in a single optimized call, replacing multiple separate server actions.

**Performance Impact**: Eliminates multiple round-trips to the database for modal data loading.

**Parameters**:
- `nebenkosten_id` (UUID): The Nebenkosten entry ID
- `user_id` (UUID): The authenticated user's ID

**Returns**: Table with the following columns:
- `mieter_id` (UUID): Tenant ID
- `mieter_name` (TEXT): Tenant name
- `wohnung_name` (TEXT): Apartment name
- `wohnung_groesse` (NUMERIC): Apartment size
- `current_reading` (JSONB): Current water meter reading data
- `previous_reading` (JSONB): Previous water meter reading data

**Usage Example**:
```sql
SELECT * FROM get_wasserzaehler_modal_data('nebenkosten-uuid', 'user-uuid');
```

**JSONB Structure**:
```json
{
  "ablese_datum": "2024-12-31",
  "zaehlerstand": 1234.5,
  "verbrauch": 150.0
}
```

**Implementation Details**:
- Validates nebenkosten ownership before processing
- Finds relevant tenants based on billing period overlap
- Prioritizes previous year readings for better comparison
- Returns structured JSONB data for easy client consumption

### 3. get_abrechnung_modal_data(nebenkosten_id UUID, user_id UUID)

**Purpose**: Fetches all Abrechnung modal data including nebenkosten details, tenants, rechnungen, and wasserzaehler readings in one call.

**Performance Impact**: Replaces multiple separate queries with a single optimized database function call.

**Parameters**:
- `nebenkosten_id` (UUID): The Nebenkosten entry ID
- `user_id` (UUID): The authenticated user's ID

**Returns**: Table with the following columns:
- `nebenkosten_data` (JSONB): Complete nebenkosten information with house details
- `tenants` (JSONB): Array of relevant tenants with apartment information
- `rechnungen` (JSONB): Array of existing rechnungen for this nebenkosten
- `wasserzaehler_readings` (JSONB): Array of water meter readings

**Usage Example**:
```sql
SELECT * FROM get_abrechnung_modal_data('nebenkosten-uuid', 'user-uuid');
```

**Implementation Details**:
- Aggregates data from multiple tables using CTEs
- Includes calculated house metrics (total area, apartment count, tenant count)
- Returns empty arrays instead of NULL for missing data
- Structures data for direct consumption by React components

### 4. save_wasserzaehler_batch(nebenkosten_id UUID, user_id UUID, readings JSONB)

**Purpose**: Optimized batch save operation for Wasserzähler data with automatic total calculation and validation.

**Performance Impact**: Replaces individual insert operations with batch processing and server-side validation.

**Parameters**:
- `nebenkosten_id` (UUID): The Nebenkosten entry ID
- `user_id` (UUID): The authenticated user's ID
- `readings` (JSONB): Array of water meter readings to save

**Returns**: Table with the following columns:
- `success` (BOOLEAN): Operation success status
- `message` (TEXT): Success or error message
- `total_verbrauch` (NUMERIC): Calculated total water consumption
- `inserted_count` (INTEGER): Number of records successfully inserted

**Usage Example**:
```sql
SELECT * FROM save_wasserzaehler_batch(
  'nebenkosten-uuid',
  'user-uuid',
  '[{"mieter_id": "uuid", "zaehlerstand": 1234.5, "verbrauch": 150.0}]'::jsonb
);
```

**Readings JSONB Structure**:
```json
[
  {
    "mieter_id": "tenant-uuid",
    "ablese_datum": "2024-12-31",
    "zaehlerstand": 1234.5,
    "verbrauch": 150.0
  }
]
```

**Implementation Details**:
- Validates nebenkosten ownership and user permissions
- Performs server-side data validation with regex patterns
- Deletes existing readings before inserting new ones
- Automatically calculates and updates total consumption in Nebenkosten table
- Handles empty or invalid data gracefully

## Security Considerations

All database functions implement the following security measures:

1. **SECURITY DEFINER**: Functions run with elevated privileges but include explicit user validation
2. **User Validation**: All functions verify that the provided user_id matches the authenticated user
3. **Data Ownership**: Functions only return data owned by the authenticated user
4. **Input Validation**: Server-side validation prevents SQL injection and data corruption
5. **Row Level Security**: Functions work in conjunction with existing RLS policies

## Performance Monitoring

All database functions are monitored using the PerformanceMonitor utility:

- **Execution Time Tracking**: Each function call is timed and logged
- **Success Rate Monitoring**: Failed operations are tracked and analyzed
- **Slow Operation Detection**: Operations exceeding thresholds are flagged
- **Error Logging**: Detailed error information is captured for debugging

## Error Handling

Database functions implement comprehensive error handling:

1. **Graceful Degradation**: Functions handle missing data without failing
2. **Meaningful Error Messages**: Clear, user-friendly error messages in German
3. **Logging Integration**: Errors are logged with context for debugging
4. **Rollback Safety**: Operations are atomic and can be safely rolled back

## Migration and Deployment

Database functions are deployed via Supabase migrations:

- **Migration File**: `20250202000000_add_performance_optimization_functions.sql`
- **Permissions**: Functions are granted to `authenticated` role
- **Comments**: Each function includes descriptive comments for documentation
- **Testing**: Functions include comprehensive test coverage

## Usage in Application

These database functions are consumed by optimized server actions:

- `fetchNebenkostenListOptimized()` → `get_nebenkosten_with_metrics()`
- `getWasserzaehlerModalDataAction()` → `get_wasserzaehler_modal_data()`
- `getAbrechnungModalDataAction()` → `get_abrechnung_modal_data()`
- `saveWasserzaehlerData()` → `save_wasserzaehler_batch()`

## Performance Benchmarks

Expected performance improvements:

- **Page Load Time**: Reduced from 5-8 seconds to 2-3 seconds
- **Modal Open Time**: Reduced from 3-5 seconds to 1-2 seconds
- **Data Save Time**: Reduced from 8-12 seconds to 3-5 seconds
- **Database Calls**: Reduced from O(n) to O(1) for list operations
- **Cloudflare Worker Usage**: Reduced to <80% of execution time limits

## Troubleshooting

Common issues and solutions:

1. **Function Not Found**: Ensure migration has been applied and user has correct permissions
2. **Slow Performance**: Check database indexes and query execution plans
3. **Permission Denied**: Verify user authentication and RLS policies
4. **Data Inconsistency**: Check for concurrent modifications and transaction isolation
5. **Timeout Errors**: Monitor function execution times and optimize queries if needed

## Future Enhancements

Potential improvements for future versions:

1. **Caching Layer**: Implement Redis caching for frequently accessed data
2. **Pagination Support**: Add pagination for large datasets
3. **Real-time Updates**: Implement real-time subscriptions for live data updates
4. **Advanced Analytics**: Add more detailed performance analytics and reporting
5. **Automated Optimization**: Implement query plan analysis and automatic optimization suggestions