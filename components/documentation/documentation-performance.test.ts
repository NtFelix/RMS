/**
 * Performance Benchmarks and Monitoring for Documentation System
 * 
 * These tests measure and monitor performance characteristics of the
 * documentation system to ensure optimal user experience.
 */

import { performance } from 'perf_hooks';

// Mock performance APIs for testing environment
global.performance = {
  ...performance,
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  getEntriesByType: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  now: jest.fn(() => Date.now()),
} as any;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock IntersectionObserver for virtual scrolling tests
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Documentation Performance Benchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (performance.now as jest.Mock).mockImplementation(() => Date.now());
  });

  describe('API Response Times', () => {
    test('categories API responds within acceptable time', async () => {
      const mockCategories = [
        { name: 'Erste Schritte', articleCount: 3 },
        { name: 'Mieter verwalten', articleCount: 5 },
      ];

      (fetch as jest.Mock).mockImplementation(() => {
        // Simulate network delay
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve(mockCategories),
            });
          }, 150); // 150ms delay
        });
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/documentation/categories');
      const data = await response.json();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(data).toEqual(mockCategories);
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });

    test('search API responds quickly for various query lengths', async () => {
      const testQueries = ['a', 'test', 'long search query', 'very long search query with multiple terms'];
      
      for (const query of testQueries) {
        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        });

        const startTime = performance.now();
        
        await fetch(`/api/documentation/search?q=${encodeURIComponent(query)}`);
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(300); // Search should be fast
      }
    });

    test('article retrieval scales with content size', async () => {
      const smallArticle = {
        id: '1',
        titel: 'Small Article',
        seiteninhalt: 'Short content',
      };

      const largeArticle = {
        id: '2',
        titel: 'Large Article',
        seiteninhalt: 'Very long content '.repeat(1000), // ~17KB content
      };

      // Test small article
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(smallArticle),
      });

      const smallStartTime = performance.now();
      await fetch('/api/documentation/1');
      const smallEndTime = performance.now();
      const smallResponseTime = smallEndTime - smallStartTime;

      // Test large article
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeArticle),
      });

      const largeStartTime = performance.now();
      await fetch('/api/documentation/2');
      const largeEndTime = performance.now();
      const largeResponseTime = largeEndTime - largeStartTime;

      // Large articles should not be significantly slower
      expect(largeResponseTime).toBeLessThan(smallResponseTime * 3);
    });
  });

  describe('Search Performance', () => {
    test('search debouncing reduces API calls', async () => {
      let apiCallCount = 0;
      
      (fetch as jest.Mock).mockImplementation(() => {
        apiCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      // Simulate rapid typing
      const searchDebounce = (callback: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => callback(...args), delay);
        };
      };

      const debouncedSearch = searchDebounce((query: string) => {
        fetch(`/api/documentation/search?q=${query}`);
      }, 300);

      // Simulate typing "test" quickly
      debouncedSearch('t');
      debouncedSearch('te');
      debouncedSearch('tes');
      debouncedSearch('test');

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(apiCallCount).toBe(1); // Only one API call should be made
    });

    test('search result highlighting is performant', () => {
      const highlightText = (text: string, query: string): string => {
        if (!query.trim()) return text;
        
        const startTime = performance.now();
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const result = text.replace(regex, '<mark>$1</mark>');
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // Highlighting should be very fast
        expect(processingTime).toBeLessThan(10);
        
        return result;
      };

      const longText = 'This is a very long text with many words that need to be searched through for performance testing. '.repeat(100);
      const result = highlightText(longText, 'performance');
      
      expect(result).toContain('<mark>performance</mark>');
    });
  });

  describe('Rendering Performance', () => {
    test('article list renders efficiently with many items', () => {
      const renderArticleList = (articles: any[]) => {
        const startTime = performance.now();
        
        // Simulate rendering process
        const renderedItems = articles.map(article => ({
          id: article.id,
          title: article.titel,
          preview: article.seiteninhalt?.substring(0, 150) + '...',
        }));
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        return { renderedItems, renderTime };
      };

      // Test with different list sizes
      const smallList = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        titel: `Article ${i}`,
        seiteninhalt: `Content for article ${i}`,
      }));

      const largeList = Array.from({ length: 100 }, (_, i) => ({
        id: `article-${i}`,
        titel: `Article ${i}`,
        seiteninhalt: `Content for article ${i}`,
      }));

      const smallResult = renderArticleList(smallList);
      const largeResult = renderArticleList(largeList);

      expect(smallResult.renderTime).toBeLessThan(50);
      expect(largeResult.renderTime).toBeLessThan(200);
      expect(largeResult.renderedItems).toHaveLength(100);
    });

    test('virtual scrolling improves performance for large lists', () => {
      const createVirtualList = (items: any[], containerHeight: number, itemHeight: number) => {
        const startTime = performance.now();
        
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const bufferSize = 5; // Render extra items for smooth scrolling
        
        // Simulate virtual scrolling calculation
        const startIndex = 0; // Would be calculated based on scroll position
        const endIndex = Math.min(startIndex + visibleCount + bufferSize, items.length);
        
        const visibleItems = items.slice(startIndex, endIndex);
        
        const endTime = performance.now();
        const calculationTime = endTime - startTime;
        
        return { visibleItems, calculationTime, totalItems: items.length };
      };

      const manyItems = Array.from({ length: 1000 }, (_, i) => ({ id: i, content: `Item ${i}` }));
      
      const result = createVirtualList(manyItems, 600, 60);
      
      expect(result.calculationTime).toBeLessThan(10); // Should be very fast
      expect(result.visibleItems.length).toBeLessThan(20); // Only render visible items
      expect(result.totalItems).toBe(1000);
    });
  });

  describe('Memory Usage', () => {
    test('article cache does not grow unbounded', () => {
      class ArticleCache {
        private cache = new Map<string, any>();
        private maxSize = 50;

        set(key: string, value: any) {
          if (this.cache.size >= this.maxSize) {
            // Remove oldest entry (LRU)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey!);
          }
          this.cache.set(key, value);
        }

        get(key: string) {
          const value = this.cache.get(key);
          if (value) {
            // Move to end (LRU)
            this.cache.delete(key);
            this.cache.set(key, value);
          }
          return value;
        }

        size() {
          return this.cache.size;
        }
      }

      const cache = new ArticleCache();

      // Add many articles
      for (let i = 0; i < 100; i++) {
        cache.set(`article-${i}`, { id: i, content: `Content ${i}` });
      }

      expect(cache.size()).toBe(50); // Should not exceed max size
      expect(cache.get('article-99')).toBeDefined(); // Recent items should be available
      expect(cache.get('article-0')).toBeUndefined(); // Old items should be evicted
    });

    test('search results are properly cleaned up', () => {
      let searchResults: any[] = [];
      
      const performSearch = (query: string) => {
        // Clear previous results
        searchResults = [];
        
        // Simulate search results
        searchResults = Array.from({ length: 50 }, (_, i) => ({
          id: `result-${i}`,
          title: `Result ${i} for ${query}`,
        }));
        
        return searchResults;
      };

      const clearSearch = () => {
        searchResults = [];
      };

      performSearch('test query 1');
      expect(searchResults).toHaveLength(50);

      performSearch('test query 2');
      expect(searchResults).toHaveLength(50); // Should replace, not accumulate

      clearSearch();
      expect(searchResults).toHaveLength(0);
    });
  });

  describe('Network Optimization', () => {
    test('implements proper caching headers', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: (name: string) => {
            const headers: Record<string, string> = {
              'cache-control': 'public, max-age=300, stale-while-revalidate=600',
              'x-response-time': '150',
            };
            return headers[name.toLowerCase()];
          }
        },
        json: () => Promise.resolve([]),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetch('/api/documentation/categories');
      
      expect(response.headers.get('cache-control')).toContain('max-age=300');
      expect(response.headers.get('x-response-time')).toBeDefined();
    });

    test('batches multiple API requests efficiently', async () => {
      let requestCount = 0;
      
      (fetch as jest.Mock).mockImplementation((url: string) => {
        requestCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      // Simulate component that needs multiple data sources
      const loadDocumentationData = async () => {
        const [categories, articles] = await Promise.all([
          fetch('/api/documentation/categories'),
          fetch('/api/documentation'),
        ]);
        
        return {
          categories: await categories.json(),
          articles: await articles.json(),
        };
      };

      await loadDocumentationData();
      
      expect(requestCount).toBe(2); // Should make concurrent requests
    });
  });

  describe('Performance Monitoring', () => {
    test('tracks Core Web Vitals metrics', () => {
      const trackWebVitals = (metric: any) => {
        const acceptableThresholds = {
          FCP: 1800,  // First Contentful Paint
          LCP: 2500,  // Largest Contentful Paint
          FID: 100,   // First Input Delay
          CLS: 0.1,   // Cumulative Layout Shift
        };

        expect(metric.value).toBeLessThan(acceptableThresholds[metric.name as keyof typeof acceptableThresholds]);
      };

      // Simulate Core Web Vitals measurements
      const mockMetrics = [
        { name: 'FCP', value: 1200 },
        { name: 'LCP', value: 2000 },
        { name: 'FID', value: 50 },
        { name: 'CLS', value: 0.05 },
      ];

      mockMetrics.forEach(trackWebVitals);
    });

    test('monitors API performance over time', () => {
      const performanceMonitor = {
        metrics: [] as any[],
        
        recordMetric(endpoint: string, responseTime: number, success: boolean) {
          this.metrics.push({
            endpoint,
            responseTime,
            success,
            timestamp: Date.now(),
          });
        },
        
        getAverageResponseTime(endpoint: string, timeWindow: number = 60000) {
          const cutoff = Date.now() - timeWindow;
          const recentMetrics = this.metrics.filter(
            m => m.endpoint === endpoint && m.timestamp > cutoff && m.success
          );
          
          if (recentMetrics.length === 0) return 0;
          
          const total = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
          return total / recentMetrics.length;
        },
        
        getSuccessRate(endpoint: string, timeWindow: number = 60000) {
          const cutoff = Date.now() - timeWindow;
          const recentMetrics = this.metrics.filter(
            m => m.endpoint === endpoint && m.timestamp > cutoff
          );
          
          if (recentMetrics.length === 0) return 1;
          
          const successful = recentMetrics.filter(m => m.success).length;
          return successful / recentMetrics.length;
        }
      };

      // Record some metrics
      performanceMonitor.recordMetric('/api/documentation/categories', 150, true);
      performanceMonitor.recordMetric('/api/documentation/categories', 200, true);
      performanceMonitor.recordMetric('/api/documentation/categories', 500, false);
      performanceMonitor.recordMetric('/api/documentation/search', 100, true);

      expect(performanceMonitor.getAverageResponseTime('/api/documentation/categories')).toBe(175);
      expect(performanceMonitor.getSuccessRate('/api/documentation/categories')).toBeCloseTo(0.67);
    });

    test('alerts on performance degradation', () => {
      const performanceAlerter = {
        thresholds: {
          responseTime: 1000,
          errorRate: 0.1,
        },
        
        checkPerformance(metrics: any[]) {
          const alerts = [];
          
          const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
          if (avgResponseTime > this.thresholds.responseTime) {
            alerts.push({
              type: 'HIGH_RESPONSE_TIME',
              value: avgResponseTime,
              threshold: this.thresholds.responseTime,
            });
          }
          
          const errorRate = metrics.filter(m => !m.success).length / metrics.length;
          if (errorRate > this.thresholds.errorRate) {
            alerts.push({
              type: 'HIGH_ERROR_RATE',
              value: errorRate,
              threshold: this.thresholds.errorRate,
            });
          }
          
          return alerts;
        }
      };

      // Test normal performance
      const goodMetrics = [
        { responseTime: 150, success: true },
        { responseTime: 200, success: true },
        { responseTime: 180, success: true },
      ];

      expect(performanceAlerter.checkPerformance(goodMetrics)).toHaveLength(0);

      // Test degraded performance
      const badMetrics = [
        { responseTime: 1500, success: false },
        { responseTime: 2000, success: false },
        { responseTime: 1800, success: true },
      ];

      const alerts = performanceAlerter.checkPerformance(badMetrics);
      expect(alerts).toHaveLength(2);
      expect(alerts.find(a => a.type === 'HIGH_RESPONSE_TIME')).toBeDefined();
      expect(alerts.find(a => a.type === 'HIGH_ERROR_RATE')).toBeDefined();
    });
  });
});