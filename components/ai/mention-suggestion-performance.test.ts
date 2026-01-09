/**
 * Tests for mention suggestion performance optimizations
 */

import { 
  suggestionPerformanceMonitor,
  createDebouncedFunction,
  createMemoizedFunction,
  createResourceCleanupTracker,
  createOptimizedFilter
} from '@/lib/mention-suggestion-performance';
import { filterMentionVariables } from '@/lib/mention-utils';
import { MENTION_VARIABLES } from '@/lib/template-constants';

describe('Mention Suggestion Performance', () => {
  beforeEach(() => {
    suggestionPerformanceMonitor.clear();
  });

  describe('Performance Monitoring', () => {
    it('should track filtering performance metrics', () => {
      const endTiming = suggestionPerformanceMonitor.startTiming('test-filter');
      
      // Simulate some work
      setTimeout(() => {
        const duration = endTiming();
        expect(duration).toBeGreaterThanOrEqual(0);
      }, 10);
    });

    it('should record filtering metrics', () => {
      suggestionPerformanceMonitor.recordFilteringMetrics(50, 100, 10);
      
      const stats = suggestionPerformanceMonitor.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.averageFilteringTime).toBe(50);
    });

    it('should identify slow operations', () => {
      suggestionPerformanceMonitor.recordFilteringMetrics(100, 100, 10); // Slow operation
      suggestionPerformanceMonitor.recordFilteringMetrics(10, 100, 10);  // Fast operation
      
      const stats = suggestionPerformanceMonitor.getStats();
      expect(stats.slowOperations).toBe(1);
      expect(stats.totalOperations).toBe(2);
    });
  });

  describe('Debounced Functions', () => {
    it('should create debounced function with cleanup', (done) => {
      let callCount = 0;
      const testFn = () => { callCount++; };
      
      const { debouncedFn, cancel } = createDebouncedFunction(testFn, 50);
      
      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Should only execute once after delay
      setTimeout(() => {
        expect(callCount).toBe(1);
        cancel(); // Test cleanup
        done();
      }, 100);
    });

    it('should allow canceling debounced function', () => {
      let callCount = 0;
      const testFn = () => { callCount++; };
      
      const { debouncedFn, cancel } = createDebouncedFunction(testFn, 50);
      
      debouncedFn();
      cancel(); // Cancel before execution
      
      setTimeout(() => {
        expect(callCount).toBe(0);
      }, 100);
    });

    it('should allow flushing debounced function', () => {
      let callCount = 0;
      const testFn = () => { callCount++; };
      
      const { debouncedFn, flush } = createDebouncedFunction(testFn, 50);
      
      debouncedFn();
      flush(); // Execute immediately
      
      expect(callCount).toBe(1);
    });
  });

  describe('Memoized Functions', () => {
    it('should memoize function results', () => {
      let callCount = 0;
      const testFn = (x: number) => {
        callCount++;
        return x * 2;
      };
      
      const { memoizedFn } = createMemoizedFunction(testFn);
      
      // First call
      expect(memoizedFn(5)).toBe(10);
      expect(callCount).toBe(1);
      
      // Second call with same input - should use cache
      expect(memoizedFn(5)).toBe(10);
      expect(callCount).toBe(1);
      
      // Different input - should call function
      expect(memoizedFn(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    it('should respect cache size limit', () => {
      let callCount = 0;
      const testFn = (x: number) => {
        callCount++;
        return x * 2;
      };
      
      const { memoizedFn } = createMemoizedFunction(testFn, { maxSize: 2 });
      
      // Fill cache
      memoizedFn(1);
      memoizedFn(2);
      memoizedFn(3); // Should evict oldest entry
      
      // First call should be evicted and need to be recalculated
      memoizedFn(1);
      
      expect(callCount).toBe(4); // 3 initial + 1 recalculation
    });

    it('should clear cache', () => {
      let callCount = 0;
      const testFn = (x: number) => {
        callCount++;
        return x * 2;
      };
      
      const { memoizedFn, clear } = createMemoizedFunction(testFn);
      
      memoizedFn(5);
      expect(callCount).toBe(1);
      
      clear();
      
      memoizedFn(5); // Should call function again after clear
      expect(callCount).toBe(2);
    });
  });

  describe('Resource Cleanup Tracker', () => {
    it('should register and execute cleanup functions', () => {
      const tracker = createResourceCleanupTracker();
      let cleanupCalled = false;
      
      const cleanup = () => { cleanupCalled = true; };
      tracker.register(cleanup);
      
      expect(tracker.size()).toBe(1);
      
      tracker.cleanup();
      expect(cleanupCalled).toBe(true);
    });

    it('should handle multiple cleanup functions', () => {
      const tracker = createResourceCleanupTracker();
      let cleanup1Called = false;
      let cleanup2Called = false;
      
      tracker.register(() => { cleanup1Called = true; });
      tracker.register(() => { cleanup2Called = true; });
      
      expect(tracker.size()).toBe(2);
      
      tracker.cleanup();
      expect(cleanup1Called).toBe(true);
      expect(cleanup2Called).toBe(true);
    });

    it('should execute cleanup immediately if already destroyed', () => {
      const tracker = createResourceCleanupTracker();
      tracker.cleanup(); // Destroy first
      
      let cleanupCalled = false;
      tracker.register(() => { cleanupCalled = true; });
      
      expect(cleanupCalled).toBe(true);
    });
  });

  describe('Optimized Filter', () => {
    it('should create optimized filter with performance monitoring', () => {
      const { filter, cleanup } = createOptimizedFilter(
        (items, query) => items.filter(item => 
          item.label.toLowerCase().includes(query.toLowerCase())
        ),
        { debounceMs: 0, memoize: true }
      );
      
      const testItems = MENTION_VARIABLES.slice(0, 5);
      const result = filter(testItems, 'mieter');
      
      expect(Array.isArray(result)).toBe(true);
      
      // Should have recorded performance metrics
      const stats = suggestionPerformanceMonitor.getStats();
      expect(stats.totalOperations).toBeGreaterThan(0);
      
      cleanup();
    });

    it('should handle cleanup properly', () => {
      const { cleanup } = createOptimizedFilter(
        (items, query) => items,
        { debounceMs: 100, memoize: true }
      );
      
      // Should not throw when cleaning up
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Integration with Mention Utils', () => {
    it('should work with existing filterMentionVariables function', () => {
      const testVariables = MENTION_VARIABLES.slice(0, 10);
      
      // This should use the memoized version internally
      const result1 = filterMentionVariables(testVariables, 'mieter');
      const result2 = filterMentionVariables(testVariables, 'mieter'); // Should hit cache
      
      expect(result1).toEqual(result2);
      expect(Array.isArray(result1)).toBe(true);
      
      // Should have recorded performance metrics
      const stats = suggestionPerformanceMonitor.getStats();
      expect(stats.totalOperations).toBeGreaterThan(0);
    });

    it('should handle edge cases gracefully', () => {
      // These should not throw errors
      expect(() => filterMentionVariables([], '')).not.toThrow();
      expect(() => filterMentionVariables(MENTION_VARIABLES, '')).not.toThrow();
      expect(() => filterMentionVariables(MENTION_VARIABLES, 'nonexistent')).not.toThrow();
    });
  });
});