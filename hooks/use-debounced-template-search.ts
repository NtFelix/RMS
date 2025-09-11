/**
 * Debounced search hook for template management
 * Provides optimized search with debouncing and performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Template } from '@/types/template'
import { optimizedTemplateLoader } from '@/lib/template-performance-optimizer'

interface DebouncedSearchState {
  query: string
  debouncedQuery: string
  isSearching: boolean
  searchResults: Template[]
  searchTime: number
}

interface DebouncedSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  enablePerformanceMonitoring?: boolean
}

/**
 * Hook for debounced template search with performance optimization
 */
export function useDebouncedTemplateSearch(
  templates: Template[],
  options: DebouncedSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    enablePerformanceMonitoring = true
  } = options

  const [searchState, setSearchState] = useState<DebouncedSearchState>({
    query: '',
    debouncedQuery: '',
    isSearching: false,
    searchResults: templates,
    searchTime: 0
  })

  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const searchStartTimeRef = useRef<number>()
  const abortControllerRef = useRef<AbortController>()

  /**
   * Perform the actual search operation
   */
  const performSearch = useCallback(async (query: string, templateList: Template[]) => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this search
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    const startTime = performance.now()
    searchStartTimeRef.current = startTime

    setSearchState(prev => ({
      ...prev,
      isSearching: true,
      debouncedQuery: query
    }))

    try {
      // Check if search was aborted
      if (signal.aborted) {
        return
      }

      let results: Template[]

      if (!query.trim() || query.length < minQueryLength) {
        results = templateList
      } else {
        // Use optimized search
        results = optimizedTemplateLoader.searchTemplates(templateList, query)
      }

      // Check if search was aborted before updating state
      if (signal.aborted) {
        return
      }

      const searchTime = performance.now() - startTime

      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        searchResults: results,
        searchTime: enablePerformanceMonitoring ? searchTime : 0
      }))

      // Log performance metrics in development
      if (enablePerformanceMonitoring && process.env.NODE_ENV === 'development') {
        console.log(`Template search completed in ${searchTime.toFixed(2)}ms for query: "${query}"`)
      }

    } catch (error) {
      if (!signal.aborted) {
        console.error('Error during template search:', error)
        
        // Fallback to showing all templates
        setSearchState(prev => ({
          ...prev,
          isSearching: false,
          searchResults: templateList,
          searchTime: 0
        }))
      }
    }
  }, [minQueryLength, enablePerformanceMonitoring])

  /**
   * Update search query with debouncing
   */
  const setSearchQuery = useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query
    }))

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query, templates)
    }, debounceMs)
  }, [debounceMs, performSearch, templates])

  /**
   * Clear search and reset to show all templates
   */
  const clearSearch = useCallback(() => {
    // Cancel any pending search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setSearchState({
      query: '',
      debouncedQuery: '',
      isSearching: false,
      searchResults: templates,
      searchTime: 0
    })
  }, [templates])

  /**
   * Force immediate search without debouncing
   */
  const searchImmediate = useCallback((query: string) => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setSearchState(prev => ({
      ...prev,
      query
    }))

    performSearch(query, templates)
  }, [performSearch, templates])

  // Update search results when templates change
  useEffect(() => {
    if (searchState.debouncedQuery) {
      performSearch(searchState.debouncedQuery, templates)
    } else {
      setSearchState(prev => ({
        ...prev,
        searchResults: templates
      }))
    }
  }, [templates, searchState.debouncedQuery, performSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // Current search state
    query: searchState.query,
    debouncedQuery: searchState.debouncedQuery,
    isSearching: searchState.isSearching,
    searchResults: searchState.searchResults,
    searchTime: searchState.searchTime,
    
    // Search controls
    setSearchQuery,
    clearSearch,
    searchImmediate,
    
    // Utility functions
    hasActiveSearch: searchState.debouncedQuery.length >= minQueryLength,
    resultCount: searchState.searchResults.length,
    
    // Performance metrics
    performanceMetrics: enablePerformanceMonitoring ? {
      searchTime: searchState.searchTime,
      resultCount: searchState.searchResults.length,
      queryLength: searchState.debouncedQuery.length
    } : null
  }
}

/**
 * Hook for debounced category filtering
 */
export function useDebouncedCategoryFilter(
  templates: Template[],
  debounceMs: number = 100
) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(templates)
  const [isFiltering, setIsFiltering] = useState(false)
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const updateCategoryFilter = useCallback((category: string) => {
    setSelectedCategory(category)
    setIsFiltering(true)

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout for debounced filtering
    debounceTimeoutRef.current = setTimeout(() => {
      const filtered = optimizedTemplateLoader.filterByCategory(templates, category)
      setFilteredTemplates(filtered)
      setIsFiltering(false)
    }, debounceMs)
  }, [templates, debounceMs])

  // Update filtered templates when templates change
  useEffect(() => {
    const filtered = optimizedTemplateLoader.filterByCategory(templates, selectedCategory)
    setFilteredTemplates(filtered)
  }, [templates, selectedCategory])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    selectedCategory,
    filteredTemplates,
    isFiltering,
    updateCategoryFilter,
    clearFilter: () => updateCategoryFilter('all')
  }
}

/**
 * Combined hook for search and category filtering
 */
export function useDebouncedTemplateFilters(
  templates: Template[],
  searchOptions: DebouncedSearchOptions = {},
  categoryDebounceMs: number = 100
) {
  const categoryFilter = useDebouncedCategoryFilter(templates, categoryDebounceMs)
  const search = useDebouncedTemplateSearch(categoryFilter.filteredTemplates, searchOptions)

  const clearAllFilters = useCallback(() => {
    search.clearSearch()
    categoryFilter.clearFilter()
  }, [search, categoryFilter])

  return {
    // Search
    searchQuery: search.query,
    setSearchQuery: search.setSearchQuery,
    clearSearch: search.clearSearch,
    isSearching: search.isSearching,
    
    // Category filter
    selectedCategory: categoryFilter.selectedCategory,
    setCategoryFilter: categoryFilter.updateCategoryFilter,
    clearCategoryFilter: categoryFilter.clearFilter,
    isFiltering: categoryFilter.isFiltering,
    
    // Combined results
    filteredTemplates: search.searchResults,
    
    // Combined controls
    clearAllFilters,
    
    // Status
    hasActiveFilters: search.hasActiveSearch || categoryFilter.selectedCategory !== 'all',
    isProcessing: search.isSearching || categoryFilter.isFiltering,
    
    // Performance metrics
    performanceMetrics: search.performanceMetrics
  }
}