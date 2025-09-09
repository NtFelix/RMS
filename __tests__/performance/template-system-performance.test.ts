/**
 * Performance tests for Template System
 * Tests autocomplete response times, caching effectiveness, and optimization impact
 */

import { placeholderEngine, PlaceholderEngine } from '@/lib/template-system/placeholder-engine';
import { templateProcessor, TemplateProcessor } from '@/lib/template-system/template-processor';
import { templateCacheManager } from '@/lib/template-system/cache-manager';
import { optimizedDataFetcher } from '@/lib/template-system/optimized-data-fetcher';

describe('Template System Performance Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    templateCacheManager.clearAll();
  });

  describe('Placeholder Engine Performance', () => {
    test('autocomplete suggestions should respond within 50ms', async () => {
      const queries = ['@datum', '@mieter', '@wohnung', '@haus', '@vermieter'];
      const maxResponseTime = 50; // milliseconds
      
      for (const query of queries) {
        const startTime = performance.now();
        const suggestions = placeholderEngine.generateSuggestions(query, 10);
        const endTime = performance.now();
        
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(maxResponseTime);
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });

    test('validation should complete within 30ms for typical content', () => {
      const testContent = `
        Sehr geehrte/r @mieter.name,
        
        hiermit teilen wir Ihnen mit, dass die Miete für die Wohnung @wohnung.adresse
        ab dem @datum um 10% erhöht wird.
        
        Die neue Miete beträgt @wohnung.miete.
        
        Mit freundlichen Grüßen
        @vermieter.name
      `;
      
      const maxValidationTime = 30; // milliseconds
      
      const startTime = performance.now();
      const errors = placeholderEngine.validatePlaceholders(testContent);
      const endTime = performance.now();
      
      const validationTime = endTime - startTime;
      
      expect(validationTime).toBeLessThan(maxValidationTime);
      expect(Array.isArray(errors)).toBe(true);
    });

    test('cache should improve performance on repeated queries', () => {
      const query = '@mieter.name';
      
      // First call (cache miss)
      const startTime1 = performance.now();
      const suggestions1 = placeholderEngine.generateSuggestions(query, 10);
      const endTime1 = performance.now();
      const firstCallTime = endTime1 - startTime1;
      
      // Second call (cache hit)
      const startTime2 = performance.now();
      const suggestions2 = placeholderEngine.generateSuggestions(query, 10);
      const endTime2 = performance.now();
      const secondCallTime = endTime2 - startTime2;
      
      // Cache hit should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.5);
      expect(suggestions1).toEqual(suggestions2);
    });

    test('performance should not degrade with large content', () => {
      // Generate large content with many placeholders
      const placeholders = ['@datum', '@mieter.name', '@wohnung.adresse', '@haus.name'];
      const largeContent = Array(1000).fill(0).map((_, i) => 
        `Line ${i}: ${placeholders[i % placeholders.length]} some text here.`
      ).join('\n');
      
      const maxValidationTime = 100; // milliseconds for large content
      
      const startTime = performance.now();
      const errors = placeholderEngine.validatePlaceholders(largeContent);
      const endTime = performance.now();
      
      const validationTime = endTime - startTime;
      
      expect(validationTime).toBeLessThan(maxValidationTime);
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Template Processor Performance', () => {
    const mockContext = {
      mieter: {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefonnummer: '0123456789',
        einzug: '2023-01-01'
      },
      wohnung: {
        id: '1',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 800
      },
      haus: {
        id: '1',
        name: 'Musterstraße 1',
        ort: 'Berlin',
        strasse: 'Musterstraße 1'
      },
      vermieter: {
        id: '1',
        name: 'Vermieter GmbH',
        email: 'info@vermieter.de'
      },
      datum: new Date('2024-01-15')
    };

    test('template processing should complete within 100ms', () => {
      const template = `
        Sehr geehrte/r @mieter.name,
        
        Ihre Wohnung @wohnung.name hat eine Größe von @wohnung.groesse.
        Die monatliche Miete beträgt @wohnung.miete.
        
        Datum: @datum
        
        Mit freundlichen Grüßen
        @vermieter.name
      `;
      
      const maxProcessingTime = 100; // milliseconds
      
      const startTime = performance.now();
      const result = templateProcessor.processTemplate(template, mockContext);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(maxProcessingTime);
      expect(result.success).toBe(true);
      expect(result.processedContent).toContain('Max Mustermann');
    });

    test('caching should improve processing performance', () => {
      const template = 'Hello @mieter.name, your rent is @wohnung.miete.';
      
      // First processing (cache miss)
      const startTime1 = performance.now();
      const result1 = templateProcessor.processTemplate(template, mockContext);
      const endTime1 = performance.now();
      const firstProcessTime = endTime1 - startTime1;
      
      // Second processing (cache hit)
      const startTime2 = performance.now();
      const result2 = templateProcessor.processTemplate(template, mockContext);
      const endTime2 = performance.now();
      const secondProcessTime = endTime2 - startTime2;
      
      // Cache hit should be faster
      expect(secondProcessTime).toBeLessThan(firstProcessTime * 0.8);
      expect(result1.processedContent).toEqual(result2.processedContent);
    });
  });

  describe('Cache Manager Performance', () => {
    test('cache operations should be fast', () => {
      const cache = templateCacheManager.suggestionCache;
      const testData = { test: 'data', array: [1, 2, 3], nested: { key: 'value' } };
      
      // Test set operation
      const setStartTime = performance.now();
      cache.set('test-key', testData);
      const setEndTime = performance.now();
      const setTime = setEndTime - setStartTime;
      
      // Test get operation
      const getStartTime = performance.now();
      const retrieved = cache.get('test-key');
      const getEndTime = performance.now();
      const getTime = getEndTime - getStartTime;
      
      expect(setTime).toBeLessThan(5); // 5ms max for set
      expect(getTime).toBeLessThan(2); // 2ms max for get
      expect(retrieved).toEqual(testData);
    });

    test('cache cleanup should not impact performance significantly', () => {
      const cache = templateCacheManager.suggestionCache;
      
      // Fill cache with test data
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, { data: i }, 1); // 1ms TTL for quick expiration
      }
      
      // Wait for expiration
      setTimeout(() => {
        const cleanupStartTime = performance.now();
        cache.cleanup();
        const cleanupEndTime = performance.now();
        const cleanupTime = cleanupEndTime - cleanupStartTime;
        
        expect(cleanupTime).toBeLessThan(10); // 10ms max for cleanup
      }, 10);
    });

    test('cache hit rate should improve with usage', () => {
      const cache = templateCacheManager.suggestionCache;
      
      // Perform operations to build cache
      const keys = ['key1', 'key2', 'key3'];
      const data = { test: 'data' };
      
      // Set initial data
      keys.forEach(key => cache.set(key, data));
      
      // Perform mixed operations
      for (let i = 0; i < 20; i++) {
        const key = keys[i % keys.length];
        cache.get(key); // This should hit cache
      }
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
    });
  });

  describe('Memory Usage and Optimization', () => {
    test('placeholder engine should not leak memory', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        placeholderEngine.generateSuggestions(`@test${i % 10}`, 5);
        placeholderEngine.validatePlaceholders(`Test content with @placeholder${i % 5}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('cache should respect size limits', () => {
      const cache = templateCacheManager.suggestionCache;
      const maxSize = 1000; // Assuming default max size
      
      // Fill cache beyond max size
      for (let i = 0; i < maxSize + 100; i++) {
        cache.set(`key-${i}`, { data: i });
      }
      
      const stats = cache.getStats();
      // Allow some tolerance for cache eviction timing
      expect(stats.size).toBeLessThanOrEqual(maxSize + 15);
    });
  });

  describe('Debouncing Performance', () => {
    test('debounced operations should batch correctly', () => {
      // This test verifies the concept of debouncing
      // In practice, debouncing is implemented in the React component using useDebounce hook
      const mockDebounce = (fn: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };
      
      let callCount = 0;
      const originalFunction = () => { callCount++; };
      const debouncedFunction = mockDebounce(originalFunction, 100);
      
      // Simulate rapid calls
      for (let i = 0; i < 10; i++) {
        debouncedFunction();
      }
      
      // Should not have been called yet due to debouncing
      expect(callCount).toBe(0);
      
      // After delay, should be called only once
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callCount).toBe(1);
          resolve();
        }, 150);
      });
    });
  });

  describe('Integration Performance', () => {
    test('complete workflow should perform within acceptable limits', async () => {
      const template = `
        Sehr geehrte/r @mieter.name,
        
        hiermit bestätigen wir Ihren Einzug in die Wohnung @wohnung.name
        im Haus @haus.name am @datum.
        
        Die monatliche Miete beträgt @wohnung.miete.
        
        Mit freundlichen Grüßen
        @vermieter.name
      `;
      
      const maxWorkflowTime = 200; // milliseconds
      
      const startTime = performance.now();
      
      // 1. Validate template
      const errors = placeholderEngine.validatePlaceholders(template);
      
      // 2. Generate suggestions for a query
      const suggestions = placeholderEngine.generateSuggestions('@mieter', 10);
      
      // 3. Process template
      const result = templateProcessor.processTemplate(template, {
        mieter: { id: '1', name: 'Test User', email: 'test@example.com' },
        wohnung: { id: '1', name: 'Test Apartment', miete: 1000 },
        haus: { id: '1', name: 'Test House' },
        vermieter: { id: '1', name: 'Test Landlord' },
        datum: new Date()
      });
      
      const endTime = performance.now();
      const workflowTime = endTime - startTime;
      
      expect(workflowTime).toBeLessThan(maxWorkflowTime);
      expect(errors).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });
  });
});

describe('Performance Benchmarks', () => {
  test('benchmark autocomplete performance', () => {
    const queries = ['@', '@d', '@da', '@dat', '@datum'];
    const iterations = 100;
    const results: number[] = [];
    
    queries.forEach(query => {
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        placeholderEngine.generateSuggestions(query, 10);
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      results.push(avgTime);
      
      console.log(`Query "${query}": avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
      
      // Performance assertions
      expect(avgTime).toBeLessThan(20); // Average should be under 20ms
      expect(maxTime).toBeLessThan(50); // Max should be under 50ms
    });
  });

  test('benchmark template processing performance', () => {
    const templates = [
      'Simple: @mieter.name',
      'Medium: Hello @mieter.name, your rent @wohnung.miete is due on @datum.',
      'Complex: ' + Array(10).fill('@mieter.name @wohnung.miete @datum').join(' ')
    ];
    
    const mockContext = {
      mieter: { id: '1', name: 'Test User' },
      wohnung: { id: '1', miete: 1000 },
      datum: new Date()
    };
    
    templates.forEach((template, index) => {
      const iterations = 50;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        templateProcessor.processTemplate(template, mockContext);
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      console.log(`Template ${index + 1}: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
      
      // Performance assertions based on complexity
      const maxExpected = [10, 30, 100][index]; // Different limits for different complexities
      expect(avgTime).toBeLessThan(maxExpected);
    });
  });
});