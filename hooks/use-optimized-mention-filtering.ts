import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MentionVariable } from '@/lib/template-constants';
import { filterMentionVariables, FilterOptions } from '@/lib/mention-utils';
import { useDebounce } from './use-debounce';
import { 
  createDebouncedFunction, 
  createResourceCleanupTracker,
  suggestionPerformanceMonitor 
} from '@/lib/mention-suggestion-performance';

interface UseOptimizedMentionFilteringOptions {
  debounceMs?: number;
  maxResults?: number;
  enableMemoization?: boolean;
}

interface UseOptimizedMentionFilteringResult {
  filteredItems: MentionVariable[];
  isFiltering: boolean;
  filteringTime: number;
  clearCache: () => void;
}

/**
 * Performance-optimized hook for mention variable filtering with debouncing and memoization
 */
export function useOptimizedMentionFiltering(
  variables: MentionVariable[],
  query: string,
  options: FilterOptions = {},
  hookOptions: UseOptimizedMentionFilteringOptions = {}
): UseOptimizedMentionFilteringResult {
  const {
    debounceMs = 150,
    maxResults = 10,
    enableMemoization = true,
  } = hookOptions;

  // State for filtered results and loading
  const [filteredItems, setFilteredItems] = useState<MentionVariable[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteringTime, setFilteringTime] = useState(0);

  // Resource cleanup tracker
  const cleanupTracker = useRef(createResourceCleanupTracker());

  // Debounced query to prevent excessive filtering
  const debouncedQuery = useDebounce(query, debounceMs);

  // Memoized filter function with performance monitoring
  const performFilter = useCallback((
    vars: MentionVariable[],
    searchQuery: string,
    filterOptions: FilterOptions
  ): MentionVariable[] => {
    const endTiming = suggestionPerformanceMonitor.startTiming('useOptimizedMentionFiltering');
    
    try {
      setIsFiltering(true);
      
      const result = filterMentionVariables(vars, searchQuery, filterOptions)
        .slice(0, maxResults);
      
      const duration = endTiming();
      setFilteringTime(duration);
      
      return result;
    } catch (error) {
      endTiming();
      console.error('Error in optimized filtering:', error);
      return [];
    } finally {
      setIsFiltering(false);
    }
  }, [maxResults]);

  // Create debounced version of the filter function
  const debouncedFilter = useMemo(() => {
    const { debouncedFn, cancel } = createDebouncedFunction(
      (vars: MentionVariable[], searchQuery: string, filterOptions: FilterOptions) => {
        const result = performFilter(vars, searchQuery, filterOptions);
        setFilteredItems(result);
      },
      debounceMs
    );

    // Register cleanup
    cleanupTracker.current.register(cancel);

    return debouncedFn;
  }, [performFilter, debounceMs]);

  // Effect to trigger filtering when inputs change
  useEffect(() => {
    // If query is empty, return all variables immediately (no debouncing needed)
    if (!debouncedQuery.trim()) {
      const result = variables.slice(0, maxResults);
      setFilteredItems(result);
      setIsFiltering(false);
      setFilteringTime(0);
      return;
    }

    // Use debounced filtering for non-empty queries
    debouncedFilter(variables, debouncedQuery, options);
  }, [variables, debouncedQuery, options, maxResults, debouncedFilter]);

  // Clear cache function
  const clearCache = useCallback(() => {
    // This would clear any internal memoization caches
    // For now, we'll just reset the filtered items
    setFilteredItems([]);
    setFilteringTime(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTracker.current.cleanup();
    };
  }, []);

  return {
    filteredItems,
    isFiltering,
    filteringTime,
    clearCache,
  };
}

/**
 * Lightweight hook for simple debounced filtering without performance monitoring
 */
export function useSimpleDebouncedFiltering(
  variables: MentionVariable[],
  query: string,
  debounceMs: number = 150
): MentionVariable[] {
  const debouncedQuery = useDebounce(query, debounceMs);
  
  return useMemo(() => {
    if (!debouncedQuery.trim()) {
      return variables.slice(0, 10);
    }
    
    return filterMentionVariables(variables, debouncedQuery, {
      prioritizeExactMatches: true,
    }).slice(0, 10);
  }, [variables, debouncedQuery]);
}