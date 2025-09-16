# AI Assistant Performance Monitoring

This document describes the comprehensive performance monitoring system implemented for the AI assistant feature.

## Overview

The performance monitoring system tracks various metrics to ensure optimal performance and user experience:

- **Response Time Tracking**: Monitors AI request/response times
- **Bundle Size Monitoring**: Tracks JavaScript bundle impact
- **PostHog Analytics Integration**: Sends detailed metrics for analysis
- **Real-time Performance Dashboard**: Visual monitoring interface

## Components

### 1. AI Performance Monitor (`lib/ai-performance-monitor.ts`)

Tracks AI request performance metrics:

```typescript
import { createAIPerformanceMonitor } from '@/lib/ai-performance-monitor';

const monitor = createAIPerformanceMonitor(posthog);

// Start tracking a request
monitor.startRequest(sessionId, {
  message: 'user question',
  contextSize: 1000,
  cacheHit: false
});

// Track streaming events
monitor.trackStreamingStart(sessionId);
monitor.trackFirstChunk(sessionId);
monitor.trackChunk(sessionId, chunkSize);

// Complete tracking
monitor.completeRequest(sessionId, success);
```

#### Tracked Metrics

- **Request Timing**: Start time, end time, total response time
- **Network Metrics**: Latency, streaming start/end times
- **Content Metrics**: Request/response sizes, chunk counts
- **Context Metrics**: Documentation context processing time
- **Error Metrics**: Error types, retry counts

#### Performance Categories

Response times are categorized as:
- **Excellent**: < 500ms
- **Good**: < 1s
- **Acceptable**: < 3s
- **Poor**: < 10s
- **Very Poor**: > 10s

### 2. Bundle Size Monitor (`lib/bundle-size-monitor.ts`)

Tracks JavaScript bundle impact:

```typescript
import { createBundleSizeMonitor } from '@/lib/bundle-size-monitor';

const monitor = createBundleSizeMonitor(posthog);

// Track dynamic imports
const component = await monitor.trackDynamicImport('ai-assistant', () => 
  import('./ai-assistant-component')
);

// Track component mounting
monitor.trackComponentMount('AIAssistant', () => {
  // Component mounting logic
});

// Analyze bundle impact
const analysis = monitor.analyzeBundleImpact();
```

#### Bundle Metrics

- **Component Sizes**: Individual component bundle sizes
- **Loading Times**: Dynamic import and mount times
- **Memory Usage**: JavaScript heap usage
- **Web Vitals**: Impact on Core Web Vitals

#### Optimization Suggestions

The system provides automatic optimization suggestions:
- **Lazy Loading**: When bundle size > 150KB
- **Code Splitting**: When bundle size > 300KB
- **Tree Shaking**: For large SDK imports

### 3. Performance Dashboard (`components/ai-performance-dashboard.tsx`)

Real-time visual monitoring interface:

```typescript
import { AIPerformanceDashboard } from '@/components/ai-performance-dashboard';

// Add to your app (only shows in development)
<AIPerformanceDashboard />
```

#### Dashboard Features

- **Real-time Metrics**: Live performance statistics
- **Optimization Suggestions**: Actionable recommendations
- **Performance Categories**: Visual status indicators
- **Bundle Analysis**: Size and loading metrics

### 4. PostHog Analytics Integration

Comprehensive analytics tracking:

#### Events Tracked

**Request Events:**
- `ai_request_started`: Request initiation
- `ai_streaming_started`: Streaming begins
- `ai_first_chunk_received`: First response chunk
- `ai_request_completed`: Request completion
- `ai_request_error`: Error occurrences
- `ai_request_retry`: Retry attempts

**Performance Events:**
- `ai_performance_breakdown`: Detailed timing analysis
- `ai_response_cache_hit`: Cache utilization
- `ai_bundle_performance`: Bundle metrics
- `ai_component_mounted`: Component loading

**Bundle Events:**
- `bundle_dynamic_import`: Dynamic import tracking
- `bundle_component_mount`: Component mount performance
- `bundle_optimization_analysis`: Optimization opportunities
- `bundle_size_metrics`: Size and loading metrics

## Usage Examples

### Basic Integration

```typescript
// In your AI assistant hook
import { useAIPerformanceMonitor } from '@/lib/ai-performance-monitor';

export function useAIAssistant() {
  const posthog = usePostHog();
  const monitor = useAIPerformanceMonitor(posthog);
  
  const sendMessage = async (message: string) => {
    const sessionId = generateSessionId();
    
    // Start performance tracking
    monitor.startRequest(sessionId, {
      message,
      contextSize: context.length,
      cacheHit: false
    });
    
    try {
      // Make AI request
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        body: JSON.stringify({ message, sessionId })
      });
      
      // Track success
      monitor.completeRequest(sessionId, true);
    } catch (error) {
      // Track error
      monitor.trackError(sessionId, {
        type: 'network_error',
        message: error.message,
        retryable: true
      });
      monitor.completeRequest(sessionId, false);
    }
  };
}
```

### Bundle Monitoring

```typescript
// In your component
import { useBundleSizeMonitor } from '@/lib/bundle-size-monitor';

export function AIAssistantLoader() {
  const bundleMonitor = useBundleSizeMonitor(posthog);
  
  const loadAIAssistant = async () => {
    // Track dynamic import
    const AIAssistant = await bundleMonitor.trackDynamicImport(
      'ai-assistant',
      () => import('./ai-assistant')
    );
    
    // Track component mount
    bundleMonitor.trackComponentMount('AIAssistant', () => {
      // Mount component
    });
    
    return AIAssistant;
  };
}
```

### Server-Side Monitoring

```typescript
// In API route
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // Process request
    const result = await processAIRequest(data);
    
    // Track server performance
    if (posthog) {
      posthog.capture('ai_server_performance_breakdown', {
        total_request_time_ms: performance.now() - startTime,
        performance_category: categorizeServerPerformance(responseTime),
        // ... other metrics
      });
    }
    
    return result;
  } catch (error) {
    // Track server errors
    if (posthog) {
      posthog.capture('ai_request_failed', {
        error_type: 'server_error',
        response_time_ms: performance.now() - startTime,
        // ... error details
      });
    }
    throw error;
  }
}
```

## Configuration

### Performance Thresholds

Customize performance thresholds:

```typescript
const monitor = createAIPerformanceMonitor(posthog, {
  excellent: 300,    // < 300ms
  good: 800,         // < 800ms
  acceptable: 2000,  // < 2s
  poor: 8000,        // < 8s
  
  bundleSize: {
    small: 30,       // < 30KB
    medium: 100,     // < 100KB
    large: 200,      // < 200KB
  },
  
  memory: {
    low: 5,          // < 5MB
    medium: 15,      // < 15MB
    high: 30,        // < 30MB
  }
});
```

### Dashboard Visibility

Control dashboard visibility:

```typescript
// Show in development only (default)
localStorage.setItem('ai-performance-dashboard', 'false');

// Always show
localStorage.setItem('ai-performance-dashboard', 'true');
```

## Performance Optimization

### Automatic Optimizations

The system automatically suggests optimizations:

1. **Lazy Loading**: Defers AI component loading until needed
2. **Code Splitting**: Separates AI bundle from main bundle
3. **Tree Shaking**: Removes unused SDK code
4. **Caching**: Implements response and context caching

### Manual Optimizations

Based on metrics, consider:

1. **Response Time > 3s**: Implement request caching
2. **Bundle Size > 300KB**: Enable code splitting
3. **Memory Usage > 25MB**: Optimize component lifecycle
4. **Cache Hit Rate < 50%**: Improve caching strategy

## Monitoring and Alerts

### PostHog Dashboards

Create PostHog dashboards to monitor:

- Average response times by time period
- Error rates and types
- Bundle size trends
- Cache hit rates
- User experience metrics

### Performance Alerts

Set up alerts for:

- Response time > 5s (95th percentile)
- Error rate > 5%
- Bundle size increase > 20%
- Memory usage > 50MB

## Testing

Run performance monitoring tests:

```bash
npm test -- __tests__/ai-performance-monitoring.test.ts
```

The test suite covers:
- Request tracking lifecycle
- Streaming metrics
- Error handling
- Bundle monitoring
- Performance categorization
- Analytics integration

## Best Practices

1. **Always Track**: Monitor all AI requests for comprehensive data
2. **Categorize Performance**: Use consistent performance categories
3. **Bundle Optimization**: Regularly analyze bundle impact
4. **Error Tracking**: Capture detailed error information
5. **User Experience**: Focus on metrics that impact users
6. **Continuous Monitoring**: Set up automated monitoring and alerts

## Troubleshooting

### Common Issues

**Performance Monitor Not Tracking:**
- Ensure PostHog is properly initialized
- Check that sessions are started before tracking
- Verify performance API availability

**Bundle Monitor Not Working:**
- Confirm dynamic imports are properly wrapped
- Check that performance observers are supported
- Verify memory API availability

**Dashboard Not Visible:**
- Check localStorage settings
- Ensure development environment or explicit enable
- Verify component is properly imported

### Debug Mode

Enable debug logging:

```typescript
const monitor = createAIPerformanceMonitor(posthog, {}, true); // Enable debug
```

This will log detailed performance information to the console.