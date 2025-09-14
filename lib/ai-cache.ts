/**
 * AI Assistant Caching System
 * Provides intelligent caching for AI responses and documentation context
 */

import type { DocumentationContextData, AIDocumentationContext } from '@/lib/ai-documentation-context';
import type { Article, Category } from '@/types/documentation';

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

interface DocumentationContextCacheEntry extends AICacheEntry<DocumentationContextData> {
  searchQuery?: string;
  articleId?: string;
  maxArticles: number;
  maxContentLength: number;
}

interface AICacheOptions {
  responseTTL?: number; // TTL for AI responses in milliseconds
  contextTTL?: number; // TTL for documentation context in milliseconds
  maxResponseCacheSize?: number; // Maximum number of cached responses
  maxContextCacheSize?: number; // Maximum number of cached contexts
  maxMemoryMB?: number; // Maximum memory usage in MB
  enableResponseCaching?: boolean;
  enableContextCaching?: boolean;
  enableCommonQueryCaching?: boolean;
}

interface AICacheStats {
  responseCache: {
    size: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    memoryUsage: number;
    averageResponseTime: number;
  };
  contextCache: {
    size: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    memoryUsage: number;
    averageLoadTime: number;
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
  contextTTL: 10 * 60 * 1000, // 10 minutes for documentation context
  maxResponseCacheSize: 100,
  maxContextCacheSize: 50,
  maxMemoryMB: 25, // 25MB limit for AI cache
  enableResponseCaching: true,
  enableContextCaching: true,
  enableCommonQueryCaching: true,
};

export class AICacheManager {
  private responseCache = new Map<string, AIResponseCacheEntry>();
  private contextCache = new Map<string, DocumentationContextCacheEntry>();
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
   * Cache documentation context
   */
  cacheDocumentationContext(
    contextKey: string,
    context: DocumentationContextData,
    options: {
      searchQuery?: string;
      articleId?: string;
      maxArticles: number;
      maxContentLength: number;
    }
  ): void {
    if (!this.options.enableContextCaching) {
      return;
    }

    const now = Date.now();
    const size = this.estimateContextSize(context);

    // Check memory limits before caching
    if (!this.canCacheContext(size)) {
      this.evictContextEntries(size);
    }

    const entry: DocumentationContextCacheEntry = {
      data: context,
      timestamp: now,
      expiresAt: now + (this.options.contextTTL || DEFAULT_AI_CACHE_OPTIONS.contextTTL!),
      accessCount: 0,
      lastAccessed: now,
      size,
      searchQuery: options.searchQuery,
      articleId: options.articleId,
      maxArticles: options.maxArticles,
      maxContentLength: options.maxContentLength,
    };

    this.contextCache.set(contextKey, entry);
    this.updateContextStats();
  }

  /**
   * Get cached documentation context
   */
  getCachedDocumentationContext(contextKey: string): DocumentationContextData | null {
    if (!this.options.enableContextCaching) {
      return null;
    }

    this.stats.contextCache.totalRequests++;

    const entry = this.contextCache.get(contextKey);

    if (!entry) {
      this.updateContextHitRate();
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now > entry.expiresAt) {
      this.contextCache.delete(contextKey);
      this.updateContextStats();
      this.updateContextHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.contextCache.totalHits++;
    this.updateContextHitRate();

    return entry.data;
  }

  /**
   * Generate cache key for documentation context
   */
  generateContextCacheKey(options: {
    searchQuery?: string;
    articleId?: string;
    maxArticles: number;
    maxContentLength: number;
    includeCategories?: boolean;
  }): string {
    const parts = [
      'doc-context',
      options.searchQuery ? `search:${options.searchQuery}` : '',
      options.articleId ? `article:${options.articleId}` : '',
      `max:${options.maxArticles}`,
      `len:${options.maxContentLength}`,
      options.includeCategories ? 'with-categories' : 'no-categories',
    ].filter(Boolean);

    return this.hashString(parts.join('|'));
  }

  /**
   * Generate cache key for context hash
   */
  generateContextHash(context: AIDocumentationContext): string {
    const contextString = JSON.stringify({
      articleIds: context.articles.map(a => a.id).sort(),
      categoryNames: context.categories.map(c => c.name).sort(),
      currentArticleId: context.currentArticleId,
    });

    return this.hashString(contextString);
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
   * Preload common queries
   */
  async preloadCommonQueries(
    fetchFn: (query: string, context: AIDocumentationContext) => Promise<string>,
    context: AIDocumentationContext,
    limit: number = 5
  ): Promise<void> {
    if (!this.options.enableCommonQueryCaching) {
      return;
    }

    const commonQueries = this.getCommonQueries(limit);
    const contextHash = this.generateContextHash(context);

    const preloadPromises = commonQueries
      .filter(({ query }) => !this.getCachedResponse(query, contextHash))
      .map(async ({ query }) => {
        try {
          const response = await fetchFn(query, context);
          this.cacheResponse(query, response, contextHash, 'preload', 0);
        } catch (error) {
          console.warn(`Failed to preload query: ${query}`, error);
        }
      });

    await Promise.allSettled(preloadPromises);
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

  invalidateContext(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      for (const [key, entry] of this.contextCache.entries()) {
        if (regex.test(key) || 
            (entry.searchQuery && regex.test(entry.searchQuery)) ||
            (entry.articleId && regex.test(entry.articleId))) {
          this.contextCache.delete(key);
        }
      }
    } else {
      this.contextCache.clear();
    }
    this.updateContextStats();
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
    this.contextCache.clear();
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

  private estimateContextSize(context: DocumentationContextData): number {
    return JSON.stringify(context).length * 2;
  }

  private canCacheResponse(size: number): boolean {
    const maxMemoryBytes = (this.options.maxMemoryMB || 25) * 1024 * 1024;
    const currentMemory = this.calculateResponseMemoryUsage();
    return (currentMemory + size) <= maxMemoryBytes && 
           this.responseCache.size < (this.options.maxResponseCacheSize || 100);
  }

  private canCacheContext(size: number): boolean {
    const maxMemoryBytes = (this.options.maxMemoryMB || 25) * 1024 * 1024;
    const currentMemory = this.calculateContextMemoryUsage();
    return (currentMemory + size) <= maxMemoryBytes && 
           this.contextCache.size < (this.options.maxContextCacheSize || 50);
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

  private evictContextEntries(requiredSize: number): void {
    // Sort by last accessed time (LRU) - oldest first
    const entries = Array.from(this.contextCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedMemory = 0;
    for (const [key, entry] of entries) {
      this.contextCache.delete(key);
      freedMemory += entry.size;
      
      if (freedMemory >= requiredSize) {
        break;
      }
    }
    
    this.updateContextStats();
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

  private calculateContextMemoryUsage(): number {
    let total = 0;
    for (const entry of this.contextCache.values()) {
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

  private updateContextStats(): void {
    this.stats.contextCache.size = this.contextCache.size;
    this.stats.contextCache.memoryUsage = this.calculateContextMemoryUsage();
  }

  private updateResponseHitRate(): void {
    this.stats.responseCache.hitRate = this.stats.responseCache.totalRequests > 0
      ? this.stats.responseCache.totalHits / this.stats.responseCache.totalRequests
      : 0;
  }

  private updateContextHitRate(): void {
    this.stats.contextCache.hitRate = this.stats.contextCache.totalRequests > 0
      ? this.stats.contextCache.totalHits / this.stats.contextCache.totalRequests
      : 0;
  }

  private updateCacheEfficiency(): void {
    const responseHitRate = this.stats.responseCache.hitRate * 100;
    const contextHitRate = this.stats.contextCache.hitRate * 100;
    const memoryEfficiency = Math.max(0, 100 - (this.stats.totalMemoryUsage / ((this.options.maxMemoryMB || 25) * 1024 * 1024)) * 100);
    
    this.stats.cacheEfficiency = (responseHitRate * 0.4) + (contextHitRate * 0.4) + (memoryEfficiency * 0.2);
    this.stats.totalMemoryUsage = this.calculateResponseMemoryUsage() + this.calculateContextMemoryUsage();
    
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
      contextCache: {
        size: 0,
        hitRate: 0,
        totalRequests: 0,
        totalHits: 0,
        memoryUsage: 0,
        averageLoadTime: 0,
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

    // Clean expired context entries
    for (const [key, entry] of this.contextCache.entries()) {
      if (now > entry.expiresAt) {
        this.contextCache.delete(key);
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
    this.updateContextStats();
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
    cacheDocumentationContext: (contextKey: string, context: DocumentationContextData, options: any) =>
      cache.cacheDocumentationContext(contextKey, context, options),
    getCachedDocumentationContext: (contextKey: string) =>
      cache.getCachedDocumentationContext(contextKey),
    generateContextCacheKey: (options: any) =>
      cache.generateContextCacheKey(options),
    generateContextHash: (context: AIDocumentationContext) =>
      cache.generateContextHash(context),
    getCommonQueries: (limit?: number) =>
      cache.getCommonQueries(limit),
    invalidateResponses: (pattern?: string) =>
      cache.invalidateResponses(pattern),
    invalidateContext: (pattern?: string) =>
      cache.invalidateContext(pattern),
    getStats: () =>
      cache.getStats(),
    clear: () =>
      cache.clear(),
  };
}