/**
 * Comprehensive tests for AI caching system
 */

import { AICacheManager, getAICache, resetAICache } from '@/lib/ai-cache';
import type { DocumentationContextData, AIDocumentationContext } from '@/lib/ai-documentation-context';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('AICacheManager', () => {
  let cacheManager: AICacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    cacheManager = new AICacheManager({
      responseTTL: 30 * 60 * 1000, // 30 minutes
      contextTTL: 10 * 60 * 1000, // 10 minutes
      maxResponseCacheSize: 10,
      maxContextCacheSize: 5,
      maxMemoryMB: 1, // 1MB for testing
    });
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('Response Caching', () => {
    it('should cache and retrieve AI responses', () => {
      const query = 'Wie erstelle ich eine Betriebskostenabrechnung?';
      const response = 'Um eine Betriebskostenabrechnung zu erstellen...';
      const contextHash = 'test-context-hash';
      const sessionId = 'test-session';

      // Cache response
      cacheManager.cacheResponse(query, response, contextHash, sessionId, 1500);

      // Retrieve cached response
      const cachedResponse = cacheManager.getCachedResponse(query, contextHash);
      expect(cachedResponse).toBe(response);
    });

    it('should return null for non-existent cached responses', () => {
      const cachedResponse = cacheManager.getCachedResponse('non-existent', 'hash');
      expect(cachedResponse).toBeNull();
    });

    it('should expire cached responses after TTL', () => {
      const query = 'Test query';
      const response = 'Test response';
      const contextHash = 'test-hash';

      // Mock Date.now for TTL calculation
      const originalDateNow = Date.now;
      const mockDateNow = jest.fn();
      Date.now = mockDateNow;

      // Set initial time
      mockDateNow.mockReturnValue(1000);

      // Cache response
      cacheManager.cacheResponse(query, response, contextHash, 'session', 1000);

      // Move time forward beyond TTL (31 minutes)
      mockDateNow.mockReturnValue(1000 + 31 * 60 * 1000);

      // Should return null as it's expired
      const cachedResponse = cacheManager.getCachedResponse(query, contextHash);
      expect(cachedResponse).toBeNull();

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should evict oldest entries when cache is full', () => {
      const contextHash = 'test-hash';

      // Mock Date.now for consistent timestamps
      const originalDateNow = Date.now;
      const mockDateNow = jest.fn();
      Date.now = mockDateNow;

      let currentTime = 1000;

      // Fill cache to capacity with increasing timestamps
      for (let i = 0; i < 10; i++) {
        mockDateNow.mockReturnValue(currentTime + i * 1000);
        cacheManager.cacheResponse(`query-${i}`, `response-${i}`, contextHash, 'session', 1000);
      }

      // Add one more to trigger eviction (with later timestamp)
      mockDateNow.mockReturnValue(currentTime + 11000);
      cacheManager.cacheResponse('query-new', 'response-new', contextHash, 'session', 1000);

      // First entry (oldest) should be evicted
      expect(cacheManager.getCachedResponse('query-0', contextHash)).toBeNull();
      // New entry should be cached
      expect(cacheManager.getCachedResponse('query-new', contextHash)).toBe('response-new');

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Documentation Context Caching', () => {
    const mockContext: DocumentationContextData = {
      articles: [
        {
          id: '1',
          titel: 'Test Article',
          kategorie: 'Test Category',
          seiteninhalt: 'Test content'
        }
      ],
      categories: [{ name: 'Test Category', articleCount: 1 }],
      totalArticles: 1
    };

    it('should cache and retrieve documentation context', () => {
      const contextKey = 'test-context-key';
      const options = {
        searchQuery: 'test query',
        maxArticles: 10,
        maxContentLength: 1000
      };

      // Cache context
      cacheManager.cacheDocumentationContext(contextKey, mockContext, options);

      // Retrieve cached context
      const cachedContext = cacheManager.getCachedDocumentationContext(contextKey);
      expect(cachedContext).toEqual(mockContext);
    });

    it('should generate consistent context cache keys', () => {
      const options1 = {
        searchQuery: 'test query',
        maxArticles: 10,
        maxContentLength: 1000,
        includeCategories: true
      };

      const options2 = {
        searchQuery: 'test query',
        maxArticles: 10,
        maxContentLength: 1000,
        includeCategories: true
      };

      const key1 = cacheManager.generateContextCacheKey(options1);
      const key2 = cacheManager.generateContextCacheKey(options2);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different options', () => {
      const options1 = {
        searchQuery: 'query1',
        maxArticles: 10,
        maxContentLength: 1000
      };

      const options2 = {
        searchQuery: 'query2',
        maxArticles: 10,
        maxContentLength: 1000
      };

      const key1 = cacheManager.generateContextCacheKey(options1);
      const key2 = cacheManager.generateContextCacheKey(options2);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Context Hash Generation', () => {
    it('should generate consistent context hashes', () => {
      const context: AIDocumentationContext = {
        articles: [
          { id: '1', titel: 'Article 1', kategorie: 'Cat 1', seiteninhalt: 'Content 1', meta: {} },
          { id: '2', titel: 'Article 2', kategorie: 'Cat 2', seiteninhalt: 'Content 2', meta: {} }
        ],
        categories: [
          { name: 'Cat 1', articleCount: 1 },
          { name: 'Cat 2', articleCount: 1 }
        ]
      };

      const hash1 = cacheManager.generateContextHash(context);
      const hash2 = cacheManager.generateContextHash(context);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different contexts', () => {
      const context1: AIDocumentationContext = {
        articles: [
          { id: '1', titel: 'Article 1', kategorie: 'Cat 1', seiteninhalt: 'Content 1', meta: {} }
        ],
        categories: []
      };

      const context2: AIDocumentationContext = {
        articles: [
          { id: '2', titel: 'Article 2', kategorie: 'Cat 2', seiteninhalt: 'Content 2', meta: {} }
        ],
        categories: []
      };

      const hash1 = cacheManager.generateContextHash(context1);
      const hash2 = cacheManager.generateContextHash(context2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Common Queries Tracking', () => {
    it('should track common queries', () => {
      const query = 'Wie füge ich einen Mieter hinzu?';
      const response = 'Um einen Mieter hinzuzufügen...';
      const contextHash = 'test-hash';

      // Cache the same query multiple times
      for (let i = 0; i < 3; i++) {
        cacheManager.cacheResponse(query, response, contextHash, `session-${i}`, 1000);
      }

      const commonQueries = cacheManager.getCommonQueries(5);
      expect(commonQueries).toHaveLength(1);
      expect(commonQueries[0].query).toBe(query.toLowerCase().trim());
      expect(commonQueries[0].count).toBe(3);
    });

    it('should return top common queries sorted by frequency', () => {
      const contextHash = 'test-hash';

      // Add queries with different frequencies
      const queries = [
        { query: 'Query 1', count: 5 },
        { query: 'Query 2', count: 3 },
        { query: 'Query 3', count: 7 },
        { query: 'Query 4', count: 1 }
      ];

      queries.forEach(({ query, count }) => {
        for (let i = 0; i < count; i++) {
          cacheManager.cacheResponse(query, 'Response', contextHash, `session-${i}`, 1000);
        }
      });

      const commonQueries = cacheManager.getCommonQueries(3);
      expect(commonQueries).toHaveLength(3);
      expect(commonQueries[0].query).toBe('query 3'); // Normalized to lowercase
      expect(commonQueries[0].count).toBe(7);
      expect(commonQueries[1].query).toBe('query 1');
      expect(commonQueries[1].count).toBe(5);
      expect(commonQueries[2].query).toBe('query 2');
      expect(commonQueries[2].count).toBe(3);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      const query = 'Test query';
      const response = 'Test response';
      const contextHash = 'test-hash';

      // Cache a response
      cacheManager.cacheResponse(query, response, contextHash, 'session', 1500);

      // Get cached response (hit) - this increments both totalRequests and totalHits
      const cachedResult = cacheManager.getCachedResponse(query, contextHash);
      expect(cachedResult).toBe(response);

      // Try to get non-existent response (miss) - this increments only totalRequests
      const missResult = cacheManager.getCachedResponse('non-existent', contextHash);
      expect(missResult).toBeNull();

      const stats = cacheManager.getStats();

      expect(stats.responseCache.size).toBe(1);
      expect(stats.responseCache.totalRequests).toBe(2);
      expect(stats.responseCache.totalHits).toBe(1);
      expect(stats.responseCache.hitRate).toBe(0.5);
      expect(stats.responseCache.averageResponseTime).toBe(1500);
    });

    it('should calculate memory usage', () => {
      const query = 'Test query';
      const response = 'Test response';
      const contextHash = 'test-hash';

      cacheManager.cacheResponse(query, response, contextHash, 'session', 1000);

      const stats = cacheManager.getStats();
      expect(stats.responseCache.memoryUsage).toBeGreaterThan(0);
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate responses by pattern', () => {
      const contextHash = 'test-hash';

      // Cache multiple responses
      cacheManager.cacheResponse('mieter query', 'mieter response', contextHash, 'session', 1000);
      cacheManager.cacheResponse('betriebskosten query', 'betriebskosten response', contextHash, 'session', 1000);
      cacheManager.cacheResponse('other query', 'other response', contextHash, 'session', 1000);

      // Invalidate responses containing 'mieter'
      cacheManager.invalidateResponses('mieter');

      // Check that mieter response is invalidated
      expect(cacheManager.getCachedResponse('mieter query', contextHash)).toBeNull();
      // Other responses should still be cached
      expect(cacheManager.getCachedResponse('betriebskosten query', contextHash)).toBe('betriebskosten response');
      expect(cacheManager.getCachedResponse('other query', contextHash)).toBe('other response');
    });

    it('should clear all caches', () => {
      const contextHash = 'test-hash';

      // Cache some data
      cacheManager.cacheResponse('query', 'response', contextHash, 'session', 1000);
      
      const mockContext: DocumentationContextData = {
        articles: [],
        categories: [],
        totalArticles: 0
      };
      cacheManager.cacheDocumentationContext('context-key', mockContext, {
        maxArticles: 10,
        maxContentLength: 1000
      });

      // Clear all caches
      cacheManager.clear();

      // Verify everything is cleared
      expect(cacheManager.getCachedResponse('query', contextHash)).toBeNull();
      expect(cacheManager.getCachedDocumentationContext('context-key')).toBeNull();
      
      const stats = cacheManager.getStats();
      expect(stats.responseCache.size).toBe(0);
      expect(stats.contextCache.size).toBe(0);
      expect(stats.commonQueries.size).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should evict entries when memory limit is exceeded', () => {
      const contextHash = 'test-hash';
      
      // Create large responses to exceed memory limit
      const largeResponse = 'x'.repeat(100000); // 100KB response

      // Cache multiple large responses
      for (let i = 0; i < 20; i++) {
        cacheManager.cacheResponse(`query-${i}`, largeResponse, contextHash, 'session', 1000);
      }

      const stats = cacheManager.getStats();
      
      // Should have evicted some entries to stay within memory limit
      expect(stats.responseCache.size).toBeLessThan(20);
      expect(stats.totalMemoryUsage).toBeLessThanOrEqual(1024 * 1024); // 1MB limit
    });
  });
});

describe('Global AI Cache', () => {
  afterEach(() => {
    resetAICache();
  });

  it('should return singleton instance', () => {
    const cache1 = getAICache();
    const cache2 = getAICache();
    
    expect(cache1).toBe(cache2);
  });

  it('should reset global instance', () => {
    const cache1 = getAICache();
    resetAICache();
    const cache2 = getAICache();
    
    expect(cache1).not.toBe(cache2);
  });
});

describe('Cache Integration with AI Assistant', () => {
  let cacheManager: AICacheManager;

  beforeEach(() => {
    cacheManager = new AICacheManager();
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  it('should handle cache warming scenario', async () => {
    const contextHash = 'test-context';
    const commonQueries = [
      'Wie erstelle ich eine Betriebskostenabrechnung?',
      'Wie füge ich einen neuen Mieter hinzu?',
      'Wie lade ich Dokumente hoch?'
    ];

    // Mock fetch function for preloading
    const mockFetchFn = jest.fn().mockImplementation(async (query: string) => {
      return `Antwort für: ${query}`;
    });

    // Simulate preloading common queries
    await cacheManager.preloadCommonQueries(
      mockFetchFn,
      {
        articles: [],
        categories: [],
      },
      3
    );

    // Verify that fetch was called for each query
    expect(mockFetchFn).toHaveBeenCalledTimes(0); // No common queries yet

    // Add some common queries first
    commonQueries.forEach(query => {
      cacheManager.cacheResponse(query, `Antwort für: ${query}`, contextHash, 'session', 1000);
    });

    // Now preload should work
    await cacheManager.preloadCommonQueries(
      mockFetchFn,
      {
        articles: [],
        categories: [],
      },
      2
    );

    // Should have called fetch for queries not already cached with this context
    expect(mockFetchFn).toHaveBeenCalled();
  });

  it('should handle cache invalidation on documentation updates', () => {
    const contextHash = 'old-context';
    
    // Cache some responses
    cacheManager.cacheResponse('query1', 'response1', contextHash, 'session', 1000);
    cacheManager.cacheResponse('query2', 'response2', contextHash, 'session', 1000);

    // Simulate documentation update by invalidating context-related caches
    cacheManager.invalidateContext('.*'); // Invalidate all context
    cacheManager.invalidateResponses('.*'); // Invalidate all responses

    // Verify caches are cleared
    expect(cacheManager.getCachedResponse('query1', contextHash)).toBeNull();
    expect(cacheManager.getCachedResponse('query2', contextHash)).toBeNull();
  });
});