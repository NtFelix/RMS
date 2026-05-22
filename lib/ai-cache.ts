/**
 * AI Assistant Caching System
 * Provides intelligent caching for AI responses
 */

interface AICacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

interface AIResponseCacheEntry extends AICacheEntry<string> {
  sessionId: string;
  contextHash: string;
  responseTime: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface AICacheOptions {
  responseTTL?: number; // TTL for AI responses in milliseconds
  maxResponseCacheSize?: number; // Maximum number of cached responses
  maxMemoryMB?: number; // Maximum memory usage in MB
  enableResponseCaching?: boolean;
  enableCommonQueryCaching?: boolean;
}

export interface AICacheStats {
  responseCache: {
    size: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    memoryUsage: number;
    averageResponseTime: number;
  };
  commonQueries: {
    size: number;
    topQueries: Array<{ query: string; count: number; lastUsed: number }>;
  };
  totalMemoryUsage: number;
  cacheEfficiency: number;
}

const DEFAULT_AI_CACHE_OPTIONS: AICacheOptions = {
  responseTTL: 30 * 60 * 1000, // 30 minutes for AI responses
  maxResponseCacheSize: 100,
  maxMemoryMB: 25, // 25MB limit for AI cache
  enableResponseCaching: true,
  enableCommonQueryCaching: true,
};

export class AICacheManager {
  private responseCache = new Map<string, AIResponseCacheEntry>();
  private commonQueries = new Map<string, { count: number; lastUsed: number; responses: string[] }>();
  private options: AICacheOptions;
  private stats: AICacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: Partial<AICacheOptions> = {}) {
    this.options = { ...DEFAULT_AI_CACHE_OPTIONS, ...options };
    this.stats = this.initializeStats();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Cache an AI response
   */
  cacheResponse(
    query: string,
    response: string,
    contextHash: string,
    sessionId: string,
    responseTime: number,
    tokenUsage?: { inputTokens: number; outputTokens: number }
  ): void {
    if (!this.options.enableResponseCaching) {
      return;
    }

    const cacheKey = this.generateResponseCacheKey(query, contextHash);
    const now = Date.now();
    const size = this.estimateResponseSize(query, response);

    // Check memory limits before caching
    if (!this.canCacheResponse(size)) {
      this.evictResponseEntries(size);
    }

    const entry: AIResponseCacheEntry = {
      data: response,
      timestamp: now,
      expiresAt: now + (this.options.responseTTL || DEFAULT_AI_CACHE_OPTIONS.responseTTL!),
      accessCount: 0,
      lastAccessed: now,
      size,
      sessionId,
      contextHash,
      responseTime,
      tokenUsage,
    };

    this.responseCache.set(cacheKey, entry);
    this.updateCommonQuery(query, response);
    this.updateResponseStats();
  }

  /**
   * Get cached AI response
   */
  getCachedResponse(query: string, contextHash: string): string | null {
    if (!this.options.enableResponseCaching) {
      return null;
    }

    this.stats.responseCache.totalRequests++;

    const cacheKey = this.generateResponseCacheKey(query, contextHash);
    const entry = this.responseCache.get(cacheKey);

    if (!entry) {
      this.updateResponseHitRate();
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now > entry.expiresAt) {
      this.responseCache.delete(cacheKey);
      this.updateResponseStats();
      this.updateResponseHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.responseCache.totalHits++;
    this.updateResponseHitRate();

    return entry.data;
  }

  /**
   * Get common queries for optimization
   */
  getCommonQueries(limit: number = 10): Array<{ query: string; count: number; lastUsed: number }> {
    return Array.from(this.commonQueries.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        lastUsed: data.lastUsed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Invalidate cache entries
   */
  invalidateResponses(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      for (const [key, entry] of this.responseCache.entries()) {
        if (regex.test(key) || regex.test(entry.data)) {
          this.responseCache.delete(key);
        }
      }
    } else {
      this.responseCache.clear();
    }
    this.updateResponseStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): AICacheStats {
    this.updateCacheEfficiency();
    return { ...this.stats };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.responseCache.clear();
    this.commonQueries.clear();
    this.stats = this.initializeStats();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  // Private methods

  private generateResponseCacheKey(query: string, contextHash: string): string {
    return this.hashString(`${query}|${contextHash}`);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private estimateResponseSize(query: string, response: string): number {
    return (query.length + response.length) * 2; // Approximate UTF-16 encoding
  }

  private canCacheResponse(size: number): boolean {
    const maxMemoryBytes = (this.options.maxMemoryMB || 25) * 1024 * 1024;
    const currentMemory = this.calculateResponseMemoryUsage();
    return (currentMemory + size) <= maxMemoryBytes && 
           this.responseCache.size < (this.options.maxResponseCacheSize || 100);
  }

  private evictResponseEntries(requiredSize: number): void {
    // Sort by last accessed time (LRU) - oldest first
    const entries = Array.from(this.responseCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedMemory = 0;
    for (const [key, entry] of entries) {
      this.responseCache.delete(key);
      freedMemory += entry.size;
      
      if (freedMemory >= requiredSize) {
        break;
      }
    }
    
    this.updateResponseStats();
  }

  private updateCommonQuery(query: string, response: string): void {
    if (!this.options.enableCommonQueryCaching) {
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const existing = this.commonQueries.get(normalizedQuery);

    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
      if (!existing.responses.includes(response)) {
        existing.responses.push(response);
        // Keep only last 3 responses per query
        if (existing.responses.length > 3) {
          existing.responses = existing.responses.slice(-3);
        }
      }
    } else {
      this.commonQueries.set(normalizedQuery, {
        count: 1,
        lastUsed: Date.now(),
        responses: [response],
      });
    }

    // Cleanup old queries (keep only top 1000)
    if (this.commonQueries.size > 1000) {
      const sortedQueries = Array.from(this.commonQueries.entries())
        .sort(([, a], [, b]) => b.count - a.count);
      
      this.commonQueries.clear();
      sortedQueries.slice(0, 1000).forEach(([query, data]) => {
        this.commonQueries.set(query, data);
      });
    }
  }

  private calculateResponseMemoryUsage(): number {
    let total = 0;
    for (const entry of this.responseCache.values()) {
      total += entry.size;
    }
    return total;
  }

  private updateResponseStats(): void {
    this.stats.responseCache.size = this.responseCache.size;
    this.stats.responseCache.memoryUsage = this.calculateResponseMemoryUsage();
    
    // Calculate average response time
    const responseTimes = Array.from(this.responseCache.values()).map(e => e.responseTime);
    this.stats.responseCache.averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
  }

  private updateResponseHitRate(): void {
    this.stats.responseCache.hitRate = this.stats.responseCache.totalRequests > 0
      ? this.stats.responseCache.totalHits / this.stats.responseCache.totalRequests
      : 0;
  }

  private updateCacheEfficiency(): void {
    const responseHitRate = this.stats.responseCache.hitRate * 100;
    const memoryEfficiency = Math.max(0, 100 - (this.stats.totalMemoryUsage / ((this.options.maxMemoryMB || 25) * 1024 * 1024)) * 100);
    
    this.stats.cacheEfficiency = (responseHitRate * 0.8) + (memoryEfficiency * 0.2);
    this.stats.totalMemoryUsage = this.calculateResponseMemoryUsage();
    
    // Update common queries stats
    this.stats.commonQueries.size = this.commonQueries.size;
    this.stats.commonQueries.topQueries = this.getCommonQueries(5);
  }

  private initializeStats(): AICacheStats {
    return {
      responseCache: {
        size: 0,
        hitRate: 0,
        totalRequests: 0,
        totalHits: 0,
        memoryUsage: 0,
        averageResponseTime: 0,
      },
      commonQueries: {
        size: 0,
        topQueries: [],
      },
      totalMemoryUsage: 0,
      cacheEfficiency: 0,
    };
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  private performCleanup(): void {
    const now = Date.now();

    // Clean expired response entries
    for (const [key, entry] of this.responseCache.entries()) {
      if (now > entry.expiresAt) {
        this.responseCache.delete(key);
      }
    }

    // Clean old common queries (older than 24 hours)
    const dayAgo = now - 24 * 60 * 60 * 1000;
    for (const [query, data] of this.commonQueries.entries()) {
      if (data.lastUsed < dayAgo) {
        this.commonQueries.delete(query);
      }
    }

    this.updateResponseStats();
  }
}

// Global AI cache instance
let globalAICacheInstance: AICacheManager | null = null;

export function getAICache(options?: Partial<AICacheOptions>): AICacheManager {
  if (!globalAICacheInstance) {
    globalAICacheInstance = new AICacheManager(options);
  }
  return globalAICacheInstance;
}

export function resetAICache(): void {
  if (globalAICacheInstance) {
    globalAICacheInstance.destroy();
    globalAICacheInstance = null;
  }
}

// React hook for AI cache management
export function useAICache() {
  const cache = getAICache();
  
  return {
    cacheResponse: (query: string, response: string, contextHash: string, sessionId: string, responseTime: number, tokenUsage?: any) =>
      cache.cacheResponse(query, response, contextHash, sessionId, responseTime, tokenUsage),
    getCachedResponse: (query: string, contextHash: string) =>
      cache.getCachedResponse(query, contextHash),
    getCommonQueries: (limit?: number) =>
      cache.getCommonQueries(limit),
    invalidateResponses: (pattern?: string) =>
      cache.invalidateResponses(pattern),
    getStats: () =>
      cache.getStats(),
    clear: () =>
      cache.clear(),
  };
}
