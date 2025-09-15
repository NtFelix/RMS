/**
 * AI Assistant Performance Monitoring
 * 
 * This module provides comprehensive performance monitoring for the AI assistant,
 * including response time tracking, bundle size monitoring, and PostHog analytics integration.
 */

import { PostHog } from 'posthog-js';

export interface AIPerformanceMetrics {
  // Request timing
  requestStartTime: number;
  requestEndTime: number;
  responseTime: number;
  
  // Network metrics
  networkLatency?: number;
  streamingStartTime?: number;
  firstChunkTime?: number;
  streamingEndTime?: number;
  
  // Content metrics
  requestSize: number;
  responseSize: number;
  chunkCount?: number;
  
  // Context metrics
  contextProcessingTime?: number;
  contextSize?: number;
  cacheHit?: boolean;
  
  // Error metrics
  errorOccurred: boolean;
  errorType?: string;
  retryCount?: number;
}

export interface BundlePerformanceMetrics {
  // Bundle size metrics
  initialBundleSize?: number;
  aiComponentSize?: number;
  dynamicImportTime?: number;
  
  // Memory usage
  memoryUsage?: number;
  memoryPeak?: number;
  
  // Rendering performance
  componentMountTime?: number;
  firstInteractionTime?: number;
}

export interface PerformanceThresholds {
  // Response time thresholds (ms)
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
  
  // Bundle size thresholds (KB)
  bundleSize: {
    small: number;
    medium: number;
    large: number;
  };
  
  // Memory thresholds (MB)
  memory: {
    low: number;
    medium: number;
    high: number;
  };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  excellent: 500,    // < 500ms
  good: 1000,        // < 1s
  acceptable: 3000,  // < 3s
  poor: 10000,       // < 10s
  
  bundleSize: {
    small: 50,       // < 50KB
    medium: 150,     // < 150KB
    large: 300,      // < 300KB
  },
  
  memory: {
    low: 10,         // < 10MB
    medium: 25,      // < 25MB
    high: 50,        // < 50MB
  }
};

export class AIPerformanceMonitor {
  private metrics: Map<string, AIPerformanceMetrics> = new Map();
  private bundleMetrics: BundlePerformanceMetrics = {};
  private thresholds: PerformanceThresholds;
  private posthog: PostHog | null = null;
  
  // Performance observers
  private performanceObserver?: PerformanceObserver;
  private memoryMonitorInterval?: NodeJS.Timeout;
  
  constructor(
    posthog?: PostHog | null,
    thresholds: Partial<PerformanceThresholds> = {}
  ) {
    this.posthog = posthog || null;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    
    this.initializePerformanceObservers();
    this.startMemoryMonitoring();
  }

  /**
   * Start tracking performance for an AI request
   */
  startRequest(sessionId: string, requestData: {
    message: string;
    contextSize?: number;
    cacheHit?: boolean;
  }): void {
    const now = performance.now();
    
    const metrics: AIPerformanceMetrics = {
      requestStartTime: now,
      requestEndTime: 0,
      responseTime: 0,
      requestSize: new Blob([requestData.message]).size,
      responseSize: 0,
      contextSize: requestData.contextSize || 0,
      cacheHit: requestData.cacheHit || false,
      errorOccurred: false,
      retryCount: 0
    };
    
    this.metrics.set(sessionId, metrics);
    
    // Track request start
    this.trackEvent('ai_request_started', {
      session_id: sessionId,
      request_size_bytes: metrics.requestSize,
      context_size_bytes: metrics.contextSize,
      cache_hit: metrics.cacheHit,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track streaming start
   */
  trackStreamingStart(sessionId: string): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;
    
    const now = performance.now();
    metrics.streamingStartTime = now;
    metrics.networkLatency = now - metrics.requestStartTime;
    
    this.trackEvent('ai_streaming_started', {
      session_id: sessionId,
      network_latency_ms: metrics.networkLatency,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track first chunk received
   */
  trackFirstChunk(sessionId: string): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;
    
    const now = performance.now();
    metrics.firstChunkTime = now;
    
    const timeToFirstChunk = metrics.streamingStartTime 
      ? now - metrics.streamingStartTime 
      : now - metrics.requestStartTime;
    
    this.trackEvent('ai_first_chunk_received', {
      session_id: sessionId,
      time_to_first_chunk_ms: timeToFirstChunk,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track chunk received during streaming
   */
  trackChunk(sessionId: string, chunkSize: number): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;
    
    metrics.responseSize += chunkSize;
    metrics.chunkCount = (metrics.chunkCount || 0) + 1;
  }

  /**
   * Complete request tracking
   */
  completeRequest(sessionId: string, success: boolean = true): AIPerformanceMetrics | null {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return null;
    
    const now = performance.now();
    metrics.requestEndTime = now;
    metrics.responseTime = now - metrics.requestStartTime;
    metrics.errorOccurred = !success;
    
    if (metrics.streamingStartTime) {
      metrics.streamingEndTime = now;
    }
    
    // Determine performance category
    const performanceCategory = this.categorizePerformance(metrics.responseTime);
    
    // Track completion
    this.trackEvent('ai_request_completed', {
      session_id: sessionId,
      success: success,
      response_time_ms: metrics.responseTime,
      response_size_bytes: metrics.responseSize,
      chunk_count: metrics.chunkCount || 0,
      performance_category: performanceCategory,
      network_latency_ms: metrics.networkLatency || 0,
      streaming_duration_ms: metrics.streamingEndTime && metrics.streamingStartTime 
        ? metrics.streamingEndTime - metrics.streamingStartTime 
        : 0,
      cache_hit: metrics.cacheHit,
      context_size_bytes: metrics.contextSize || 0,
      retry_count: metrics.retryCount || 0,
      timestamp: new Date().toISOString()
    });
    
    // Track performance metrics for analytics
    this.trackPerformanceMetrics(sessionId, metrics);
    
    // Clean up
    this.metrics.delete(sessionId);
    
    return metrics;
  }

  /**
   * Track error in request
   */
  trackError(sessionId: string, error: {
    type: string;
    message: string;
    retryable: boolean;
  }): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;
    
    metrics.errorOccurred = true;
    metrics.errorType = error.type;
    
    const now = performance.now();
    const partialResponseTime = now - metrics.requestStartTime;
    
    this.trackEvent('ai_request_error', {
      session_id: sessionId,
      error_type: error.type,
      error_message: error.message,
      retryable: error.retryable,
      partial_response_time_ms: partialResponseTime,
      response_size_bytes: metrics.responseSize,
      chunk_count: metrics.chunkCount || 0,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track retry attempt
   */
  trackRetry(sessionId: string, retryCount: number): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;
    
    metrics.retryCount = retryCount;
    
    this.trackEvent('ai_request_retry', {
      session_id: sessionId,
      retry_count: retryCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track bundle performance metrics
   */
  trackBundleMetrics(metrics: Partial<BundlePerformanceMetrics>): void {
    this.bundleMetrics = { ...this.bundleMetrics, ...metrics };
    
    // Calculate bundle performance category
    const bundleCategory = this.categorizeBundlePerformance();
    
    this.trackEvent('ai_bundle_performance', {
      ...this.bundleMetrics,
      bundle_category: bundleCategory,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track component mount performance
   */
  trackComponentMount(componentName: string, mountTime: number): void {
    this.bundleMetrics.componentMountTime = mountTime;
    
    this.trackEvent('ai_component_mounted', {
      component_name: componentName,
      mount_time_ms: mountTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track dynamic import performance
   */
  trackDynamicImport(importName: string, importTime: number, bundleSize?: number): void {
    this.bundleMetrics.dynamicImportTime = importTime;
    if (bundleSize) {
      this.bundleMetrics.aiComponentSize = bundleSize;
    }
    
    this.trackEvent('ai_dynamic_import', {
      import_name: importName,
      import_time_ms: importTime,
      bundle_size_bytes: bundleSize || 0,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): {
    activeRequests: number;
    averageResponseTime: number;
    successRate: number;
    bundleMetrics: BundlePerformanceMetrics;
  } {
    const activeRequests = this.metrics.size;
    
    // Calculate averages from recent completed requests (stored in memory briefly)
    const recentMetrics = Array.from(this.metrics.values());
    const completedMetrics = recentMetrics.filter(m => m.requestEndTime > 0);
    
    const averageResponseTime = completedMetrics.length > 0
      ? completedMetrics.reduce((sum, m) => sum + m.responseTime, 0) / completedMetrics.length
      : 0;
    
    const successRate = completedMetrics.length > 0
      ? completedMetrics.filter(m => !m.errorOccurred).length / completedMetrics.length
      : 1;
    
    return {
      activeRequests,
      averageResponseTime,
      successRate,
      bundleMetrics: this.bundleMetrics
    };
  }

  /**
   * Initialize performance observers
   */
  private initializePerformanceObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Observe navigation and resource timing
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackEvent('page_performance', {
              dom_content_loaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              load_complete: navEntry.loadEventEnd - navEntry.loadEventStart,
              first_paint: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              timestamp: new Date().toISOString()
            });
          }
          
          if (entry.entryType === 'resource' && entry.name.includes('ai-assistant')) {
            this.trackEvent('ai_resource_loaded', {
              resource_name: entry.name,
              duration_ms: entry.duration,
              size_bytes: (entry as any).transferSize || 0,
              timestamp: new Date().toISOString()
            });
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure'] 
      });
    } catch (error) {
      console.warn('Failed to initialize performance observer:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('performance' in window) || !(window.performance as any).memory) {
      return;
    }

    this.memoryMonitorInterval = setInterval(() => {
      const memory = (window.performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        const memoryPeak = memory.totalJSHeapSize / (1024 * 1024);
        
        this.bundleMetrics.memoryUsage = memoryUsage;
        this.bundleMetrics.memoryPeak = Math.max(this.bundleMetrics.memoryPeak || 0, memoryPeak);
        
        // Track memory spikes
        if (memoryUsage > this.thresholds.memory.high) {
          this.trackEvent('ai_memory_spike', {
            memory_usage_mb: memoryUsage,
            memory_peak_mb: memoryPeak,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Categorize performance based on response time
   */
  private categorizePerformance(responseTime: number): string {
    if (responseTime < this.thresholds.excellent) return 'excellent';
    if (responseTime < this.thresholds.good) return 'good';
    if (responseTime < this.thresholds.acceptable) return 'acceptable';
    if (responseTime < this.thresholds.poor) return 'poor';
    return 'very_poor';
  }

  /**
   * Categorize bundle performance
   */
  private categorizeBundlePerformance(): string {
    const bundleSize = this.bundleMetrics.aiComponentSize || 0;
    const memoryUsage = this.bundleMetrics.memoryUsage || 0;
    
    if (bundleSize < this.thresholds.bundleSize.small && memoryUsage < this.thresholds.memory.low) {
      return 'optimal';
    }
    if (bundleSize < this.thresholds.bundleSize.medium && memoryUsage < this.thresholds.memory.medium) {
      return 'good';
    }
    if (bundleSize < this.thresholds.bundleSize.large && memoryUsage < this.thresholds.memory.high) {
      return 'acceptable';
    }
    return 'poor';
  }

  /**
   * Track performance metrics for detailed analytics
   */
  private trackPerformanceMetrics(sessionId: string, metrics: AIPerformanceMetrics): void {
    // Track detailed performance breakdown
    this.trackEvent('ai_performance_breakdown', {
      session_id: sessionId,
      
      // Timing breakdown
      total_response_time: metrics.responseTime,
      network_latency: metrics.networkLatency || 0,
      streaming_duration: metrics.streamingEndTime && metrics.streamingStartTime 
        ? metrics.streamingEndTime - metrics.streamingStartTime 
        : 0,
      time_to_first_chunk: metrics.firstChunkTime && metrics.streamingStartTime
        ? metrics.firstChunkTime - metrics.streamingStartTime
        : 0,
      
      // Size metrics
      request_size: metrics.requestSize,
      response_size: metrics.responseSize,
      context_size: metrics.contextSize || 0,
      
      // Performance indicators
      chunks_per_second: metrics.chunkCount && metrics.streamingEndTime && metrics.streamingStartTime
        ? metrics.chunkCount / ((metrics.streamingEndTime - metrics.streamingStartTime) / 1000)
        : 0,
      bytes_per_second: metrics.streamingEndTime && metrics.streamingStartTime
        ? metrics.responseSize / ((metrics.streamingEndTime - metrics.streamingStartTime) / 1000)
        : 0,
      
      // Context
      cache_hit: metrics.cacheHit,
      retry_count: metrics.retryCount || 0,
      
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track event to PostHog
   */
  private trackEvent(eventName: string, properties: Record<string, any>): void {
    if (this.posthog && this.posthog.has_opted_in_capturing?.()) {
      this.posthog.capture(eventName, properties);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.metrics.clear();
  }
}

/**
 * Create a performance monitor instance
 */
export function createAIPerformanceMonitor(
  posthog?: PostHog | null,
  thresholds?: Partial<PerformanceThresholds>
): AIPerformanceMonitor {
  return new AIPerformanceMonitor(posthog, thresholds);
}

/**
 * Hook for using AI performance monitoring in React components
 */
export function useAIPerformanceMonitor(posthog?: PostHog | null) {
  const monitor = new AIPerformanceMonitor(posthog);
  
  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => monitor.destroy());
  }
  
  return monitor;
}