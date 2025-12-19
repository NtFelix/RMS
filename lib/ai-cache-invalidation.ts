/**
 * AI Cache Invalidation Utilities
 * Provides strategies for invalidating AI caches when data changes
 */

import { getAICache } from '@/lib/ai-cache';

export interface CacheInvalidationOptions {
  invalidateResponses?: boolean;
  invalidateContext?: boolean;
  invalidateCommonQueries?: boolean;
  pattern?: string;
}

/**
 * Invalidate AI caches when documentation is updated
 */
export function invalidateDocumentationCaches(options: CacheInvalidationOptions = {}): void {
  const {
    invalidateResponses = true,
    invalidateContext = true,
    invalidateCommonQueries = false,
    pattern
  } = options;

  const aiCache = getAICache();

  if (invalidateContext) {
    aiCache.invalidateContext(pattern);
    console.log('Invalidated AI documentation context cache');
  }

  if (invalidateResponses) {
    aiCache.invalidateResponses(pattern);
    console.log('Invalidated AI response cache');
  }

  if (invalidateCommonQueries) {
    // Clear all caches to reset common query tracking
    aiCache.clear();
    console.log('Cleared all AI caches including common queries');
  }
}

/**
 * Invalidate caches for specific article updates
 */
export function invalidateArticleCaches(articleId: string): void {
  const aiCache = getAICache();

  // Invalidate context caches that might include this article
  aiCache.invalidateContext(`article:${articleId}`);

  // Invalidate responses that might be related to this article
  // This is a broad invalidation - in production you might want more granular control
  aiCache.invalidateResponses();

  console.log(`Invalidated AI caches for article: ${articleId}`);
}

/**
 * Invalidate caches for category updates
 */
export function invalidateCategoryCaches(categoryName: string): void {
  const aiCache = getAICache();

  // Invalidate context caches for this category
  aiCache.invalidateContext(categoryName);

  // Invalidate responses that might mention this category
  aiCache.invalidateResponses(categoryName);

  console.log(`Invalidated AI caches for category: ${categoryName}`);
}

/**
 * Scheduled cache cleanup - removes expired entries and optimizes memory
 */
export function performScheduledCacheCleanup(): void {
  const aiCache = getAICache();
  const stats = aiCache.getStats();

  console.log('Performing scheduled AI cache cleanup', {
    responseCacheSize: stats.responseCache.size,
    contextCacheSize: stats.contextCache.size,
    totalMemoryUsage: Math.round(stats.totalMemoryUsage / 1024) + 'KB',
    cacheEfficiency: Math.round(stats.cacheEfficiency) + '%'
  });

  // The cache manager handles cleanup automatically through its periodic cleanup
  // This function mainly provides logging and monitoring
}

/**
 * Cache warming strategy for common documentation queries
 */
export async function warmDocumentationCaches(
  documentationContext: any[],
  fetchAIResponse: (query: string) => Promise<string>
): Promise<void> {
  const aiCache = getAICache();

  // Common German queries about Mietevo
  const commonQueries = [
    'Wie erstelle ich eine Betriebskostenabrechnung?',
    'Wie füge ich einen neuen Mieter hinzu?',
    'Wie lade ich Dokumente hoch?',
    'Wie bearbeite ich Wohnungsdaten?',
    'Wie funktioniert die Wasserzähler-Verwaltung?',
    'Wie erstelle ich eine neue Immobilie?',
    'Wie verwalte ich Mietverträge?',
    'Wie funktioniert die Finanzübersicht?',
    'Wie exportiere ich Daten?',
    'Wie ändere ich Mieterinformationen?'
  ];

  const contextHash = aiCache.generateContextHash({
    articles: documentationContext,
    categories: []
  });

  console.log('Warming AI cache with common queries...');

  let warmedCount = 0;
  const warmingPromises = commonQueries
    .filter(query => !aiCache.getCachedResponse(query, contextHash))
    .slice(0, 5) // Limit to 5 queries to avoid overwhelming the system
    .map(async (query) => {
      try {
        const response = await fetchAIResponse(query);
        aiCache.cacheResponse(query, response, contextHash, 'cache-warming', 0);
        warmedCount++;
        console.log(`Warmed cache for query: ${query.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`Failed to warm cache for query: ${query}`, error);
      }
    });

  await Promise.allSettled(warmingPromises);
  console.log(`Cache warming completed. Warmed ${warmedCount} queries.`);
}

/**
 * Get cache health metrics for monitoring
 */
export function getCacheHealthMetrics() {
  const aiCache = getAICache();
  const stats = aiCache.getStats();

  return {
    responseCache: {
      size: stats.responseCache.size,
      hitRate: Math.round(stats.responseCache.hitRate * 100) / 100,
      memoryUsageMB: Math.round(stats.responseCache.memoryUsage / 1024 / 1024 * 100) / 100,
      averageResponseTime: Math.round(stats.responseCache.averageResponseTime)
    },
    contextCache: {
      size: stats.contextCache.size,
      hitRate: Math.round(stats.contextCache.hitRate * 100) / 100,
      memoryUsageMB: Math.round(stats.contextCache.memoryUsage / 1024 / 1024 * 100) / 100
    },
    overall: {
      totalMemoryUsageMB: Math.round(stats.totalMemoryUsage / 1024 / 1024 * 100) / 100,
      cacheEfficiency: Math.round(stats.cacheEfficiency * 100) / 100,
      commonQueriesCount: stats.commonQueries.size
    },
    topQueries: stats.commonQueries.topQueries.slice(0, 5)
  };
}

/**
 * Cache invalidation strategies for different scenarios
 */
export const cacheInvalidationStrategies = {
  /**
   * When a new article is created
   */
  onArticleCreated: (articleId: string, categoryName?: string) => {
    // Invalidate category-based context caches
    if (categoryName) {
      invalidateCategoryCaches(categoryName);
    }

    // Invalidate general documentation context
    invalidateDocumentationCaches({
      invalidateContext: true,
      invalidateResponses: false // Keep responses as they might still be valid
    });
  },

  /**
   * When an article is updated
   */
  onArticleUpdated: (articleId: string, categoryName?: string) => {
    invalidateArticleCaches(articleId);

    if (categoryName) {
      invalidateCategoryCaches(categoryName);
    }
  },

  /**
   * When an article is deleted
   */
  onArticleDeleted: (articleId: string, categoryName?: string) => {
    invalidateArticleCaches(articleId);

    if (categoryName) {
      invalidateCategoryCaches(categoryName);
    }

    // Also invalidate responses as they might reference the deleted article
    invalidateDocumentationCaches({
      invalidateResponses: true,
      invalidateContext: true
    });
  },

  /**
   * When categories are restructured
   */
  onCategoryRestructure: () => {
    // Clear all caches as category structure affects context generation
    invalidateDocumentationCaches({
      invalidateResponses: true,
      invalidateContext: true,
      invalidateCommonQueries: true
    });
  },

  /**
   * When there are system-wide documentation changes
   */
  onSystemUpdate: () => {
    // Clear everything and start fresh
    const aiCache = getAICache();
    aiCache.clear();
    console.log('Cleared all AI caches due to system update');
  },

  /**
   * Daily maintenance cleanup
   */
  dailyMaintenance: () => {
    performScheduledCacheCleanup();

    // Log cache health metrics
    const metrics = getCacheHealthMetrics();
    console.log('Daily AI cache metrics:', metrics);
  }
};

/**
 * React hook for cache invalidation in components
 */
export function useAICacheInvalidation() {
  return {
    invalidateDocumentationCaches,
    invalidateArticleCaches,
    invalidateCategoryCaches,
    performScheduledCacheCleanup,
    getCacheHealthMetrics,
    strategies: cacheInvalidationStrategies
  };
}