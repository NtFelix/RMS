/**
 * React hooks for template lazy loading
 * Provides easy-to-use hooks for implementing lazy loading in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Template, TemplateItem } from '@/types/template'
import { templateLazyLoadingService, LazyLoadState, PaginatedResult } from '@/lib/template-lazy-loading'
import { templateCacheService } from '@/lib/template-cache'

export interface UseTemplateLazyLoadResult {
  items: TemplateItem[]
  state: LazyLoadState
  loadNext: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

export interface UseTemplatePaginationResult {
  items: TemplateItem[]
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isLoading: boolean
  error: string | null
  loadPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  previousPage: () => Promise<void>
  refresh: () => Promise<void>
}

export interface UseTemplateContentLoaderResult {
  loadContent: (templateId: string) => Promise<Template>
  preloadContent: (templateId: string) => void
  getCachedContent: (templateId: string) => Template | null
  isLoading: (templateId: string) => boolean
}

/**
 * Hook for lazy loading template lists
 */
export function useTemplateLazyLoad(
  userId: string,
  category?: string,
  options: {
    pageSize?: number
    preloadNext?: boolean
    cacheResults?: boolean
    autoLoad?: boolean
  } = {}
): UseTemplateLazyLoadResult {
  const [items, setItems] = useState<TemplateItem[]>([])
  const [state, setState] = useState<LazyLoadState>({
    isLoading: false,
    hasMore: true,
    error: null,
    currentPage: 0,
    totalCount: 0
  })

  const loaderRef = useRef(
    templateLazyLoadingService.createTemplateListLoader(userId, category, {
      pageSize: options.pageSize || 20,
      preloadNext: options.preloadNext !== false,
      cacheResults: options.cacheResults !== false
    })
  )

  const loadNext = useCallback(async () => {
    if (state.isLoading || !state.hasMore) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await loaderRef.current.loadNext()
      
      setItems(prev => [...prev, ...result.items])
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        currentPage: result.currentPage
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load templates'
      }))
    }
  }, [state.isLoading, state.hasMore])

  const reset = useCallback(() => {
    loaderRef.current.reset()
    setItems([])
    setState({
      isLoading: false,
      hasMore: true,
      error: null,
      currentPage: 0,
      totalCount: 0
    })
  }, [])

  const refresh = useCallback(async () => {
    // Clear cache for this user/category
    templateCacheService.invalidateUserCaches(userId)
    if (category) {
      templateCacheService.invalidateCategoryCache(userId, category)
    }
    
    reset()
    await loadNext()
  }, [userId, category, reset, loadNext])

  // Auto-load first page if enabled
  useEffect(() => {
    if (options.autoLoad !== false && items.length === 0 && state.hasMore && !state.isLoading) {
      loadNext()
    }
  }, [options.autoLoad, items.length, state.hasMore, state.isLoading, loadNext])

  return {
    items,
    state,
    loadNext,
    reset,
    refresh
  }
}

/**
 * Hook for paginated template loading
 */
export function useTemplatePagination(
  userId: string,
  category?: string,
  options: {
    pageSize?: number
    cacheResults?: boolean
    autoLoad?: boolean
  } = {}
): UseTemplatePaginationResult {
  const [items, setItems] = useState<TemplateItem[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loaderRef = useRef(
    templateLazyLoadingService.createPaginatedLoader(userId, category, {
      pageSize: options.pageSize || 20,
      preloadNext: false,
      cacheResults: options.cacheResults !== false
    })
  )

  const loadPage = useCallback(async (page: number) => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await loaderRef.current.loadPage(page)
      
      setItems(result.items)
      setCurrentPage(result.currentPage)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
      setHasNextPage(result.hasNextPage)
      setHasPreviousPage(result.hasPreviousPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const nextPage = useCallback(async () => {
    if (hasNextPage) {
      await loadPage(currentPage + 1)
    }
  }, [hasNextPage, currentPage, loadPage])

  const previousPage = useCallback(async () => {
    if (hasPreviousPage) {
      await loadPage(currentPage - 1)
    }
  }, [hasPreviousPage, currentPage, loadPage])

  const refresh = useCallback(async () => {
    // Clear cache for this user/category
    templateCacheService.invalidateUserCaches(userId)
    if (category) {
      templateCacheService.invalidateCategoryCache(userId, category)
    }
    
    await loadPage(currentPage)
  }, [userId, category, currentPage, loadPage])

  // Auto-load first page if enabled
  useEffect(() => {
    if (options.autoLoad !== false && items.length === 0 && !isLoading) {
      loadPage(0)
    }
  }, [options.autoLoad, items.length, isLoading, loadPage])

  return {
    items,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    loadPage,
    nextPage,
    previousPage,
    refresh
  }
}

/**
 * Hook for lazy loading template content
 */
export function useTemplateContentLoader(): UseTemplateContentLoaderResult {
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  
  const loaderRef = useRef(templateLazyLoadingService.createContentLoader())

  const loadContent = useCallback(async (templateId: string): Promise<Template> => {
    setLoadingStates(prev => new Set(prev).add(templateId))
    
    try {
      const template = await loaderRef.current.loadContent(templateId)
      return template
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev)
        newSet.delete(templateId)
        return newSet
      })
    }
  }, [])

  const preloadContent = useCallback((templateId: string) => {
    loaderRef.current.preloadContent(templateId)
  }, [])

  const getCachedContent = useCallback((templateId: string): Template | null => {
    return templateCacheService.getTemplate(templateId)
  }, [])

  const isLoading = useCallback((templateId: string): boolean => {
    return loadingStates.has(templateId)
  }, [loadingStates])

  return {
    loadContent,
    preloadContent,
    getCachedContent,
    isLoading
  }
}

/**
 * Hook for infinite scroll template loading
 */
export function useTemplateInfiniteScroll(
  userId: string,
  category?: string,
  options: {
    pageSize?: number
    threshold?: number
    cacheResults?: boolean
  } = {}
) {
  const lazyLoad = useTemplateLazyLoad(userId, category, {
    pageSize: options.pageSize,
    cacheResults: options.cacheResults,
    autoLoad: true
  })

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && lazyLoad.state.hasMore && !lazyLoad.state.isLoading) {
          lazyLoad.loadNext()
        }
      },
      {
        threshold: options.threshold || 0.1
      }
    )

    observerRef.current.observe(loadingRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lazyLoad.state.hasMore, lazyLoad.state.isLoading, lazyLoad.loadNext, options.threshold])

  return {
    ...lazyLoad,
    loadingRef
  }
}

/**
 * Hook for template search with lazy loading
 */
export function useTemplateSearch(
  userId: string,
  options: {
    pageSize?: number
    debounceMs?: number
    cacheResults?: boolean
  } = {}
) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  const pagination = useTemplatePagination(userId, undefined, {
    pageSize: options.pageSize,
    cacheResults: options.cacheResults,
    autoLoad: false
  })

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, options.debounceMs || 300)

    return () => clearTimeout(timer)
  }, [query, options.debounceMs])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      setIsSearching(true)
      // Here you would implement the actual search logic
      // For now, we'll just use the regular pagination
      pagination.loadPage(0).finally(() => setIsSearching(false))
    }
  }, [debouncedQuery])

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
  }, [])

  return {
    query,
    debouncedQuery,
    isSearching,
    search,
    clearSearch,
    ...pagination
  }
}