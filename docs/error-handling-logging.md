# Error Handling and Logging System

## Overview

This document describes the comprehensive error handling and logging system implemented for the betriebskosten performance optimization. The system provides structured error handling, performance monitoring, and user-friendly error recovery mechanisms.

## Architecture

### Core Components

1. **Enhanced Error Handling (`lib/error-handling.ts`)**
   - `safeRpcCall`: Enhanced RPC call wrapper with performance logging
   - `withRetry`: Retry mechanism with exponential backoff
   - `PerformanceMonitor`: Performance metrics tracking
   - Error categorization and user-friendly message generation

2. **Performance Monitoring Dashboard (`components/performance-monitoring-dashboard.tsx`)**
   - Real-time performance metrics visualization
   - Database function performance tracking
   - Alert system for slow operations and errors

3. **Comprehensive Testing**
   - Unit tests for error handling utilities
   - Integration tests for real-world scenarios
   - Performance monitoring validation

## Features

### Error Categorization

The system categorizes errors into specific types for better handling:

```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}
```

### Performance Monitoring

- **Execution Time Tracking**: Monitors database function execution times
- **Success Rate Calculation**: Tracks success/failure rates for operations
- **Slow Operation Detection**: Identifies operations exceeding performance thresholds
- **Historical Metrics**: Maintains performance history for trend analysis

### User-Friendly Error Messages

The system maps technical database errors to user-friendly German messages:

- `PGRST116` → "Die angeforderten Daten wurden nicht gefunden."
- `PGRST301` → "Sie haben keine Berechtigung für diese Aktion."
- `23505` → "Ein Eintrag mit diesen Daten existiert bereits."
- `23503` → "Die referenzierten Daten sind nicht verfügbar."

### Retry Logic

Intelligent retry mechanism with:
- **Exponential Backoff**: Increasing delays between retries
- **Conditional Retries**: Only retry appropriate error types
- **Maximum Retry Limits**: Prevents infinite retry loops
- **Timeout Handling**: Respects operation timeouts

## Usage

### Basic Error Handling

```typescript
import { safeRpcCall } from '@/lib/error-handling';

const result = await safeRpcCall(
  supabase,
  'get_nebenkosten_with_metrics',
  { user_id: userId },
  { 
    userId, 
    logPerformance: true,
    timeoutMs: 5000 
  }
);

if (!result.success) {
  // Handle error with user-friendly message
  toast.error(result.message);
  return;
}

// Use result.data
```

### Retry Operations

```typescript
import { withRetry, safeRpcCall } from '@/lib/error-handling';

const result = await withRetry(
  () => safeRpcCall(supabase, 'save_wasserzaehler_batch', params),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    retryCondition: (result) => !result.success && result.message?.includes('Netzwerk')
  }
);
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/lib/error-handling';

// Get metrics for a specific function
const metrics = PerformanceMonitor.getMetrics('get_nebenkosten_with_metrics');

// Calculate average execution time
const avgTime = PerformanceMonitor.getAverageExecutionTime('save_wasserzaehler_batch');

// Get success rate
const successRate = PerformanceMonitor.getSuccessRate('get_wasserzaehler_modal_data');

// Identify slow operations
const slowOps = PerformanceMonitor.getSlowOperations(3000); // > 3 seconds
```

## Performance Thresholds

The system uses the following performance thresholds:

- **Fast**: < 1 second (green)
- **Acceptable**: < 3 seconds (yellow)
- **Slow**: < 5 seconds (orange)
- **Timeout**: > 10 seconds (red)

## Integration with Betriebskosten Actions

All optimized betriebskosten server actions use the enhanced error handling:

### fetchNebenkostenListOptimized

```typescript
export async function fetchNebenkostenListOptimized() {
  const result = await withRetry(
    () => safeRpcCall(supabase, 'get_nebenkosten_with_metrics', params),
    { maxRetries: 2, baseDelayMs: 1000 }
  );
  
  if (!result.success) {
    logger.error('Failed to fetch optimized nebenkosten list', undefined, {
      userId,
      errorMessage: result.message,
      performanceMetrics: result.performanceMetrics
    });
    return result;
  }
  
  logger.info('Successfully fetched optimized nebenkosten list', {
    userId,
    itemCount: transformedData.length,
    executionTime: result.performanceMetrics?.executionTime
  });
  
  return { success: true, data: transformedData };
}
```

### saveWasserzaehlerData

```typescript
export async function saveWasserzaehlerData(formData: WasserzaehlerFormData) {
  const result = await withRetry(
    () => safeRpcCall(supabase, 'save_wasserzaehler_batch', params),
    {
      maxRetries: 3,
      baseDelayMs: 1500,
      retryCondition: (result) => !result.success && result.message?.includes('timeout')
    }
  );
  
  if (!result.success) {
    const userMessage = generateUserFriendlyErrorMessage(
      { message: result.message }, 
      'Speichern der Wasserzählerdaten'
    );
    return { success: false, message: userMessage };
  }
  
  return { success: true, message: successMessage, data: readingsData };
}
```

## Error Recovery Actions

The system provides contextual recovery suggestions:

### Network Errors
- Überprüfen Sie Ihre Internetverbindung
- Versuchen Sie es in wenigen Sekunden erneut

### Validation Errors
- Überprüfen Sie Ihre Eingaben
- Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind

### Timeout Errors
- Die Anfrage dauerte zu lange
- Versuchen Sie es mit weniger Daten erneut
- Kontaktieren Sie den Support, falls das Problem weiterhin besteht

### Permission Errors
- Sie haben keine Berechtigung für diese Aktion
- Kontaktieren Sie Ihren Administrator

## Monitoring Dashboard

The performance monitoring dashboard provides:

### Overview Cards
- Total database function calls
- Overall success rate
- Number of slow operations
- Error count

### Function-Specific Metrics
- Average execution time per function
- Success rate per function
- Total calls and slow calls count
- Performance trend visualization

### Alerts and Warnings
- Automatic alerts for slow operations
- Error notifications
- Performance degradation warnings

### Charts and Visualizations
- Execution time bar charts
- Success/failure pie charts
- Performance trend line charts
- Historical performance data

## Best Practices

### Error Handling
1. Always use `safeRpcCall` for database function calls
2. Implement appropriate retry logic for transient errors
3. Provide user-friendly error messages
4. Log errors with sufficient context for debugging

### Performance Monitoring
1. Enable performance logging for critical operations
2. Monitor slow operations and investigate causes
3. Set appropriate timeout values for different operations
4. Use the performance dashboard to identify trends

### Testing
1. Test error scenarios and recovery mechanisms
2. Validate performance monitoring functionality
3. Ensure user-friendly error messages are displayed
4. Test retry logic with various error conditions

## Configuration

### Environment Variables
- `NODE_ENV`: Controls log level (development vs production)
- Performance thresholds can be adjusted in `lib/error-handling.ts`

### Logging Configuration
The system uses the existing logger from `utils/logger.ts` with enhanced context:

```typescript
logger.info('Operation completed', {
  userId,
  operation: 'functionName',
  executionTime: 1500,
  success: true
});
```

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check database connectivity
   - Verify user permissions
   - Review input validation

2. **Slow Performance**
   - Monitor database function execution times
   - Check for inefficient queries
   - Consider data volume optimization

3. **Timeout Errors**
   - Increase timeout values if appropriate
   - Optimize database functions
   - Implement data pagination

### Debugging

1. Check the performance monitoring dashboard
2. Review application logs for error context
3. Use browser developer tools for client-side errors
4. Monitor database performance metrics

## Future Enhancements

1. **Real-time Alerts**: Email/SMS notifications for critical errors
2. **Advanced Analytics**: Machine learning for error prediction
3. **Custom Dashboards**: User-specific performance views
4. **Integration**: Connect with external monitoring services
5. **Automated Recovery**: Self-healing mechanisms for common issues