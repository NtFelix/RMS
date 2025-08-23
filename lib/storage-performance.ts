/**
 * Performance optimization utilities for cloud storage
 * Handles efficient queries, caching, and performance monitoring for large file collections
 */

import { StorageObject } from './storage-service';

// Performance configuration
export const PERFORMANCE_CONFIG = {
  // Query limits for different operations
  MAX_FILES_PER_QUERY: 1000,
  BATCH_SIZE: 100,
  PAGINATION_SIZE: 50,
  
  // Cache configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 10000, // Maximum cached items
  
  // Performance thresholds
  SLOW_QUERY_THRESHOLD: 2000, // 2 seconds
  TIMEOUT_THRESHOLD: 5000, // 5 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  BACKOFF_MULTIPLIER: 2,
} as const;

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Performance metrics interface
export interface PerformanceMetrics {
  queryTime: number;
  resultCount: number;
  cacheHit: boolean;
  retryCount: number;
  error?: string;
}

/**
 * Simple in-memory cache with TTL support
 */
class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl: number = PERFORMANCE_CONFIG.CACHE_TTL): void {
    // Remove expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still full after cleanup, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instances
const fileListCache = new PerformanceCache<StorageObject[]>();
const folderStructureCache = new PerformanceCache<any>();

/**
 * Generates a cache key for file listing operations
 */
export function generateCacheKey(prefix: string, options?: any): string {
  const optionsStr = options ? JSON.stringify(options) : '';
  return `files:${prefix}:${optionsStr}`;
}

/**
 * Implements efficient prefix-based queries with pagination
 */
export interface PaginatedQuery {
  prefix: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'updated_at' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  metrics: PerformanceMetrics;
}

/**
 * Performance-optimized file listing with caching and pagination
 */
export async function optimizedListFiles(
  listFunction: (prefix: string, options?: any) => Promise<StorageObject[]>,
  query: PaginatedQuery
): Promise<PaginatedResult<StorageObject[]>> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey(query.prefix, query);
  let retryCount = 0;
  let cacheHit = false;

  // Check cache first
  const cachedResult = fileListCache.get(cacheKey);
  if (cachedResult) {
    cacheHit = true;
    const endTime = Date.now();
    
    return {
      data: [cachedResult],
      totalCount: cachedResult.length,
      hasMore: false,
      metrics: {
        queryTime: endTime - startTime,
        resultCount: cachedResult.length,
        cacheHit: true,
        retryCount: 0,
      },
    };
  }

  // Implement retry logic with exponential backoff
  const executeQuery = async (): Promise<StorageObject[]> => {
    try {
      const options = {
        limit: Math.min(query.limit || PERFORMANCE_CONFIG.MAX_FILES_PER_QUERY, PERFORMANCE_CONFIG.MAX_FILES_PER_QUERY),
        sortBy: { column: query.sortBy || 'name', order: query.sortOrder || 'asc' },
      };

      return await listFunction(query.prefix, options);
    } catch (error) {
      retryCount++;
      
      if (retryCount >= PERFORMANCE_CONFIG.MAX_RETRIES) {
        throw error;
      }

      // Exponential backoff
      const delay = PERFORMANCE_CONFIG.RETRY_DELAY * Math.pow(PERFORMANCE_CONFIG.BACKOFF_MULTIPLIER, retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return executeQuery();
    }
  };

  try {
    const files = await executeQuery();
    const endTime = Date.now();
    const queryTime = endTime - startTime;

    // Cache the result
    fileListCache.set(cacheKey, files);

    // Apply client-side pagination if needed
    const offset = query.offset || 0;
    const limit = query.limit || PERFORMANCE_CONFIG.PAGINATION_SIZE;
    const paginatedFiles = files.slice(offset, offset + limit);
    const hasMore = offset + limit < files.length;

    // Log slow queries
    if (queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected: ${queryTime}ms for prefix "${query.prefix}"`);
    }

    return {
      data: [paginatedFiles],
      totalCount: files.length,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined,
      metrics: {
        queryTime,
        resultCount: files.length,
        cacheHit,
        retryCount,
      },
    };
  } catch (error) {
    const endTime = Date.now();
    
    return {
      data: [[]],
      totalCount: 0,
      hasMore: false,
      metrics: {
        queryTime: endTime - startTime,
        resultCount: 0,
        cacheHit,
        retryCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Batch processing utility for large operations
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = PERFORMANCE_CONFIG.BATCH_SIZE
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the server
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Debounced function utility for search and filtering
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;

  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverageQueryTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const total = this.metrics.reduce((sum, metric) => sum + metric.queryTime, 0);
    return total / this.metrics.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const cacheHits = this.metrics.filter(metric => metric.cacheHit).length;
    return cacheHits / this.metrics.length;
  }

  getErrorRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const errors = this.metrics.filter(metric => metric.error).length;
    return errors / this.metrics.length;
  }

  getStats() {
    return {
      totalQueries: this.metrics.length,
      averageQueryTime: this.getAverageQueryTime(),
      cacheHitRate: this.getCacheHitRate(),
      errorRate: this.getErrorRate(),
      slowQueries: this.metrics.filter(m => m.queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD).length,
    };
  }

  reset(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Cache management utilities
 */
export const cacheManager = {
  clearFileListCache: () => fileListCache.clear(),
  clearFolderStructureCache: () => folderStructureCache.clear(),
  clearAllCaches: () => {
    fileListCache.clear();
    folderStructureCache.clear();
  },
  getCacheStats: () => ({
    fileList: fileListCache.getStats(),
    folderStructure: folderStructureCache.getStats(),
  }),
  invalidatePrefix: (prefix: string) => {
    // Remove all cache entries that start with the given prefix
    const keys = Array.from((fileListCache as any).cache.keys()) as string[];
    keys.forEach(key => {
      if (key.includes(prefix)) {
        fileListCache.delete(key);
      }
    });
  },
};

/**
 * Virtual scrolling utility for large file lists
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

export function calculateVirtualScroll(
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);
  
  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight,
  };
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): any {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
    const memory = (window.performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Connection quality detection
 */
export function getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      }
      if (effectiveType === '3g' || effectiveType === '4g') {
        return 'fast';
      }
    }
  }
  return 'unknown';
}