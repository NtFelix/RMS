# Performance Monitoring Documentation

## Overview

The betriebskosten performance optimization includes comprehensive performance monitoring to track the effectiveness of database function optimizations and identify potential issues before they impact users.

## Performance Monitoring System

### Core Components

1. **PerformanceMonitor Class** (`lib/error-handling.ts`)
   - Centralized performance metrics collection
   - In-memory storage with configurable retention
   - Statistical analysis and reporting capabilities

2. **Performance Monitoring Dashboard** (`components/performance-monitoring-dashboard.tsx`)
   - Real-time visualization of performance metrics
   - Interactive charts and alerts
   - Historical trend analysis

3. **Enhanced Error Handling** (`lib/error-handling.ts`)
   - Automatic performance logging for all database operations
   - Retry logic with performance tracking
   - User-friendly error message generation

## Monitored Operations

### Database Functions

All optimized database functions are automatically monitored:

- `get_nebenkosten_with_metrics` - Nebenkosten list loading
- `get_wasserzaehler_modal_data` - Wasserzähler modal data
- `get_abrechnung_modal_data` - Abrechnung modal data
- `save_wasserzaehler_batch` - Batch water meter data saving

### Server Actions

Optimized server actions include performance tracking:

- `fetchNebenkostenListOptimized()`
- `getWasserzaehlerModalDataAction()`
- `getAbrechnungModalDataAction()`
- `saveWasserzaehlerData()`

## Performance Metrics

### Collected Data

For each operation, the system collects:

```typescript
interface PerformanceMetrics {
  functionName: string;        // Name of the database function or operation
  executionTime: number;       // Execution time in milliseconds
  success: boolean;            // Whether the operation succeeded
  timestamp: Date;             // When the operation occurred
  userId?: string;             // User who performed the operation (for context)
  parameters?: Record<string, any>; // Operation parameters (sanitized)
  errorMessage?: string;       // Error message if operation failed
}
```

### Performance Thresholds

The system uses the following performance thresholds:

```typescript
const PERFORMANCE_THRESHOLDS = {
  FAST: 1000,      // < 1s is fast (green)
  ACCEPTABLE: 3000, // < 3s is acceptable (yellow)
  SLOW: 5000,      // < 5s is slow (orange)
  TIMEOUT: 10000   // > 10s should timeout (red)
};
```

### Statistical Analysis

The PerformanceMonitor provides statistical analysis:

- **Average Execution Time**: Mean execution time for each operation
- **Success Rate**: Percentage of successful operations
- **Slow Operation Detection**: Operations exceeding acceptable thresholds
- **Error Rate Tracking**: Percentage of failed operations
- **Trend Analysis**: Performance changes over time

## Usage Examples

### Basic Performance Logging

```typescript
import { PerformanceMonitor } from '@/lib/error-handling';

// Automatic logging via safeRpcCall
const result = await safeRpcCall(supabase, 'get_nebenkosten_with_metrics', params);
// Performance metrics are automatically captured

// Manual logging for custom operations
const startTime = Date.now();
try {
  const result = await customOperation();
  PerformanceMonitor.addMetric({
    functionName: 'customOperation',
    executionTime: Date.now() - startTime,
    success: true,
    timestamp: new Date()
  });
} catch (error) {
  PerformanceMonitor.addMetric({
    functionName: 'customOperation',
    executionTime: Date.now() - startTime,
    success: false,
    timestamp: new Date(),
    errorMessage: error.message
  });
}
```

### Retrieving Performance Data

```typescript
// Get all metrics for the last hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const recentMetrics = PerformanceMonitor.getMetrics(undefined, oneHourAgo);

// Get metrics for a specific function
const nebenkostenMetrics = PerformanceMonitor.getMetrics('get_nebenkosten_with_metrics');

// Get average execution time
const avgTime = PerformanceMonitor.getAverageExecutionTime('get_wasserzaehler_modal_data');

// Get success rate
const successRate = PerformanceMonitor.getSuccessRate('get_abrechnung_modal_data');

// Get slow operations
const slowOps = PerformanceMonitor.getSlowOperations(3000); // Operations > 3s
```

## Performance Monitoring Dashboard

### Features

The dashboard provides real-time monitoring with:

1. **Overview Cards**
   - Total operations count
   - Overall success rate
   - Slow operations count
   - Error count

2. **Function-Specific Metrics**
   - Individual function performance
   - Success rates per function
   - Execution time trends

3. **Interactive Charts**
   - Bar charts for execution times
   - Pie charts for success/error distribution
   - Line charts for performance trends

4. **Alert System**
   - Automatic alerts for slow operations
   - Error rate warnings
   - Performance degradation detection

### Usage

```typescript
import { PerformanceMonitoringDashboard } from '@/components/performance-monitoring-dashboard';

// Basic usage
<PerformanceMonitoringDashboard />

// With custom refresh interval (default: 30 seconds)
<PerformanceMonitoringDashboard refreshInterval={60000} />

// With custom styling
<PerformanceMonitoringDashboard className="my-custom-class" />
```

### Dashboard Sections

1. **Overview Tab**: High-level metrics and charts
2. **Functions Tab**: Detailed per-function analysis
3. **Charts Tab**: Historical trend visualization
4. **Alerts Tab**: Performance warnings and issues

## Integration with Components

### Automatic Monitoring

All optimized server actions automatically include performance monitoring:

```typescript
export async function fetchNebenkostenListOptimized() {
  // Performance monitoring is built into safeRpcCall
  const result = await safeRpcCall(supabase, 'get_nebenkosten_with_metrics', params);
  
  // Metrics are automatically captured:
  // - Function name
  // - Execution time
  // - Success/failure status
  // - User context
  
  return result;
}
```

### Component Integration

Components can access performance data for debugging:

```typescript
import { PerformanceMonitor } from '@/lib/error-handling';

const MyComponent = () => {
  const [performanceData, setPerformanceData] = useState(null);
  
  useEffect(() => {
    // Get performance data for debugging
    const metrics = PerformanceMonitor.getMetrics('get_wasserzaehler_modal_data');
    setPerformanceData(metrics);
  }, []);
  
  // Use performance data for conditional rendering or debugging
  if (performanceData?.some(m => m.executionTime > 5000)) {
    console.warn('Slow operations detected');
  }
};
```

## Alerting and Notifications

### Automatic Alerts

The system provides automatic alerts for:

1. **Slow Operations**: Operations exceeding acceptable thresholds
2. **High Error Rates**: Error rates above 5%
3. **Performance Degradation**: Significant increases in execution time
4. **Timeout Warnings**: Operations approaching Cloudflare Worker limits

### Custom Alerts

You can create custom alerts:

```typescript
// Monitor for specific conditions
const checkPerformance = () => {
  const slowOps = PerformanceMonitor.getSlowOperations(3000);
  const errorRate = PerformanceMonitor.getErrorRate('get_nebenkosten_with_metrics');
  
  if (slowOps.length > 10) {
    console.warn(`${slowOps.length} slow operations detected`);
    // Send notification, log to external service, etc.
  }
  
  if (errorRate > 0.05) {
    console.error(`High error rate: ${Math.round(errorRate * 100)}%`);
    // Alert administrators
  }
};

// Run checks periodically
setInterval(checkPerformance, 60000); // Every minute
```

## Performance Optimization Guidelines

### Best Practices

1. **Monitor Critical Operations**: Always monitor operations that affect user experience
2. **Set Appropriate Thresholds**: Adjust thresholds based on user expectations
3. **Regular Review**: Review performance metrics regularly to identify trends
4. **Proactive Optimization**: Address slow operations before they become problems
5. **User Context**: Include user context in metrics for better debugging

### Optimization Strategies

Based on performance data, consider these optimization strategies:

1. **Database Indexing**: Add indexes for frequently queried columns
2. **Query Optimization**: Optimize slow database queries
3. **Caching**: Implement caching for frequently accessed data
4. **Batch Operations**: Replace individual operations with batch processing
5. **Async Processing**: Move heavy operations to background jobs

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Adjust metric retention period
2. **Performance Overhead**: Reduce monitoring frequency for non-critical operations
3. **Missing Metrics**: Ensure safeRpcCall is used for all monitored operations
4. **Inaccurate Timing**: Check for clock synchronization issues

### Debugging Performance Issues

```typescript
// Get detailed performance analysis
const analysis = {
  totalOperations: PerformanceMonitor.getMetrics().length,
  averageTime: PerformanceMonitor.getAverageExecutionTime(),
  slowOperations: PerformanceMonitor.getSlowOperations(3000),
  errorRate: PerformanceMonitor.getErrorRate(),
  recentErrors: PerformanceMonitor.getMetrics()
    .filter(m => !m.success)
    .slice(-10)
};

console.log('Performance Analysis:', analysis);
```

## Configuration

### Environment Variables

```env
# Performance monitoring configuration
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_RETENTION_HOURS=24
PERFORMANCE_SLOW_THRESHOLD=3000
PERFORMANCE_ERROR_THRESHOLD=0.05
```

### Runtime Configuration

```typescript
// Configure performance monitoring
PerformanceMonitor.configure({
  retentionHours: 24,
  slowThreshold: 3000,
  errorThreshold: 0.05,
  enableLogging: true
});
```

## Future Enhancements

### Planned Features

1. **External Monitoring Integration**: Send metrics to external services (DataDog, New Relic)
2. **Advanced Analytics**: Machine learning-based performance prediction
3. **Automated Optimization**: Automatic query optimization suggestions
4. **Real-time Alerts**: WebSocket-based real-time performance alerts
5. **Performance Budgets**: Set and enforce performance budgets for operations

### API Extensions

```typescript
// Future API enhancements
interface PerformanceMonitorEnhanced {
  // Predictive analytics
  predictPerformance(operation: string, parameters: any): Promise<number>;
  
  // Automated optimization
  suggestOptimizations(operation: string): Promise<string[]>;
  
  // Real-time monitoring
  subscribeToMetrics(callback: (metric: PerformanceMetrics) => void): void;
  
  // Performance budgets
  setBudget(operation: string, maxTime: number): void;
  checkBudget(operation: string): boolean;
}
```