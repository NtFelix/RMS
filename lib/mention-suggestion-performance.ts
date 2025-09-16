/**
 * Performance monitoring and optimization utilities for mention suggestions
 */

// Performance metrics interface
export interface SuggestionPerformanceMetrics {
  filteringTime: number;
  renderingTime: number;
  totalSuggestions: number;
  filteredSuggestions: number;
  timestamp: number;
}

// Performance monitoring class
class SuggestionPerformanceMonitor {
  private metrics: SuggestionPerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 measurements
  private isEnabled = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  /**
   * Start timing a performance measurement
   */
  startTiming(label: string): () => number {
    if (!this.isEnabled) {
      return () => 0;
    }

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log slow operations in development
      if (duration > 50) {
        console.warn(`Slow suggestion operation: ${label} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    };
  }

  /**
   * Record performance metrics for filtering operation
   */
  recordFilteringMetrics(
    filteringTime: number,
    totalSuggestions: number,
    filteredSuggestions: number
  ): void {
    if (!this.isEnabled) return;

    const metric: SuggestionPerformanceMetrics = {
      filteringTime,
      renderingTime: 0,
      totalSuggestions,
      filteredSuggestions,
      timestamp: Date.now(),
    };

    this.addMetric(metric);
  }

  /**
   * Record performance metrics for rendering operation
   */
  recordRenderingMetrics(renderingTime: number): void {
    if (!this.isEnabled) return;

    // Update the last metric with rendering time
    const lastMetric = this.metrics[this.metrics.length - 1];
    if (lastMetric && Date.now() - lastMetric.timestamp < 1000) {
      lastMetric.renderingTime = renderingTime;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    averageFilteringTime: number;
    averageRenderingTime: number;
    slowOperations: number;
    totalOperations: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageFilteringTime: 0,
        averageRenderingTime: 0,
        slowOperations: 0,
        totalOperations: 0,
      };
    }

    const totalFilteringTime = this.metrics.reduce((sum, m) => sum + m.filteringTime, 0);
    const totalRenderingTime = this.metrics.reduce((sum, m) => sum + m.renderingTime, 0);
    const slowOperations = this.metrics.filter(m => 
      m.filteringTime > 50 || m.renderingTime > 50
    ).length;

    return {
      averageFilteringTime: totalFilteringTime / this.metrics.length,
      averageRenderingTime: totalRenderingTime / this.metrics.length,
      slowOperations,
      totalOperations: this.metrics.length,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  private addMetric(metric: SuggestionPerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

// Global performance monitor instance
export const suggestionPerformanceMonitor = new SuggestionPerformanceMonitor();

/**
 * Debounced function creator with cleanup tracking
 */
export function createDebouncedFunction<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): {
  debouncedFn: T;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, delay);
  }) as T;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  const flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return { debouncedFn, cancel, flush };
}

/**
 * Memory-efficient memoization with size limit and TTL
 */
export function createMemoizedFunction<T extends (...args: any[]) => any>(
  func: T,
  options: {
    maxSize?: number;
    ttl?: number; // Time to live in milliseconds
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): {
  memoizedFn: T;
  clear: () => void;
  size: () => number;
} {
  const {
    maxSize = 50,
    ttl = 5 * 60 * 1000, // 5 minutes default
    keyGenerator = (...args) => JSON.stringify(args),
  } = options;

  interface CacheEntry {
    value: ReturnType<T>;
    timestamp: number;
  }

  const cache = new Map<string, CacheEntry>();

  const memoizedFn = ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const now = Date.now();
    
    // Check if we have a valid cached result
    const cached = cache.get(key);
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.value;
    }

    // Compute new result
    const result = func(...args);
    
    // Store in cache
    cache.set(key, { value: result, timestamp: now });
    
    // Clean up old entries if cache is too large
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries());
      
      // Sort by timestamp and remove oldest entries
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, cache.size - maxSize);
      
      toRemove.forEach(([key]) => cache.delete(key));
    }
    
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      const expiredKeys: string[] = [];
      cache.forEach((entry, key) => {
        if (now - entry.timestamp >= ttl) {
          expiredKeys.push(key);
        }
      });
      expiredKeys.forEach(key => cache.delete(key));
    }

    return result;
  }) as T;

  const clear = () => {
    cache.clear();
  };

  const size = () => cache.size;

  return { memoizedFn, clear, size };
}

/**
 * Resource cleanup tracker for Tippy.js instances and event listeners
 */
class ResourceCleanupTracker {
  private resources = new Set<() => void>();
  private isDestroyed = false;

  /**
   * Register a cleanup function
   */
  register(cleanup: () => void): void {
    if (this.isDestroyed) {
      // If already destroyed, execute cleanup immediately
      try {
        cleanup();
      } catch (error) {
        console.warn('Error executing immediate cleanup:', error);
      }
      return;
    }

    this.resources.add(cleanup);
  }

  /**
   * Unregister a cleanup function
   */
  unregister(cleanup: () => void): void {
    this.resources.delete(cleanup);
  }

  /**
   * Execute all cleanup functions and clear the tracker
   */
  cleanup(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    
    const cleanupPromises: Promise<void>[] = [];
    
    this.resources.forEach(cleanup => {
      cleanupPromises.push(
        new Promise<void>((resolve) => {
          try {
            cleanup();
          } catch (error) {
            console.warn('Error during resource cleanup:', error);
          } finally {
            resolve();
          }
        })
      );
    });

    // Wait for all cleanups to complete (with timeout)
    Promise.allSettled(cleanupPromises).then(() => {
      this.resources.clear();
    });
  }

  /**
   * Get the number of registered resources
   */
  size(): number {
    return this.resources.size;
  }

  /**
   * Check if the tracker has been destroyed
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }
}

/**
 * Create a resource cleanup tracker for suggestion components
 */
export function createResourceCleanupTracker(): ResourceCleanupTracker {
  return new ResourceCleanupTracker();
}

/**
 * Performance-optimized filtering function with monitoring
 */
export function createOptimizedFilter<T>(
  filterFn: (items: T[], query: string) => T[],
  options: {
    debounceMs?: number;
    memoize?: boolean;
    maxCacheSize?: number;
  } = {}
): {
  filter: (items: T[], query: string) => T[];
  cleanup: () => void;
} {
  const { debounceMs = 150, memoize = true, maxCacheSize = 50 } = options;

  let memoizedFilter = filterFn;
  let debouncedFilter = filterFn;
  let cleanup: (() => void)[] = [];

  // Add memoization if enabled
  if (memoize) {
    const { memoizedFn, clear: clearMemo } = createMemoizedFunction(filterFn, {
      maxSize: maxCacheSize,
      ttl: 5 * 60 * 1000, // 5 minutes
    });
    memoizedFilter = memoizedFn;
    cleanup.push(clearMemo);
  }

  // Add debouncing if enabled
  if (debounceMs > 0) {
    const { debouncedFn, cancel } = createDebouncedFunction(memoizedFilter, debounceMs);
    debouncedFilter = debouncedFn;
    cleanup.push(cancel);
  } else {
    debouncedFilter = memoizedFilter;
  }

  // Wrap with performance monitoring
  const optimizedFilter = (items: T[], query: string): T[] => {
    const endTiming = suggestionPerformanceMonitor.startTiming('filter');
    
    try {
      const result = debouncedFilter(items, query);
      const duration = endTiming();
      
      suggestionPerformanceMonitor.recordFilteringMetrics(
        duration,
        items.length,
        Array.isArray(result) ? result.length : 0
      );
      
      return result;
    } catch (error) {
      endTiming();
      throw error;
    }
  };

  return {
    filter: optimizedFilter,
    cleanup: () => {
      cleanup.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.warn('Error during filter cleanup:', error);
        }
      });
      cleanup = [];
    },
  };
}

/**
 * Hook for monitoring component render performance
 */
export function useRenderPerformanceMonitor(componentName: string) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const renderStart = performance.now();
  
  // Use useEffect to measure render completion
  if (typeof window !== 'undefined') {
    // Schedule render time measurement for next tick
    setTimeout(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      suggestionPerformanceMonitor.recordRenderingMetrics(renderTime);
      
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    }, 0);
  }
}

// Export performance monitoring utilities
export { SuggestionPerformanceMonitor };