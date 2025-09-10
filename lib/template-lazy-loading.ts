/**
 * Template lazy loading service for optimizing template content loading
 * Provides lazy loading strategies for template lists and content
 */

import { Template, TemplateItem } from '@/types/template'
import { templateCacheService } from './template-cache'

export interface LazyLoadOptions {
  pageSize: number
  preloadNext: boolean
  cacheResults: boolean
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface LazyLoadState {
  isLoading: boolean
  hasMore: boolean
  error: string | null
  currentPage: number
  totalCount: number
}

/**
 * Template lazy loading service
 */
export class TemplateLazyLoadingService {
  private defaultOptions: LazyLoadOptions = {
    pageSize: 20,
    preloadNext: true,
    cacheResults: true
  }

  /**
   * Create a lazy loader for template lists
   */
  createTemplateListLoader(
    userId: string,
    category?: string,
    options: Partial<LazyLoadOptions> = {}
  ) {
    const opts = { ...this.defaultOptions, ...options }
    let currentPage = 0
    let totalCount = 0
    let hasMore = true
    let isLoading = false

    return {
      /**
       * Load next page of templates
       */
      loadNext: async (): Promise<{
        items: TemplateItem[]
        hasMore: boolean
        totalCount: number
        currentPage: number
      }> => {
        if (isLoading || !hasMore) {
          return {
            items: [],
            hasMore,
            totalCount,
            currentPage
          }
        }

        isLoading = true

        try {
          // Check cache first
          const cacheKey = this.getCacheKey(userId, category, currentPage, opts.pageSize)
          let cachedResult = null
          
          if (opts.cacheResults) {
            cachedResult = templateCacheService.getTemplateItems(cacheKey)
          }

          let items: TemplateItem[]
          
          if (cachedResult) {
            items = cachedResult
          } else {
            // Load from API with pagination
            const result = await this.loadTemplatePage(
              userId,
              category,
              currentPage,
              opts.pageSize
            )
            
            items = result.items
            totalCount = result.totalCount
            
            // Cache the result
            if (opts.cacheResults) {
              templateCacheService.setTemplateItems(cacheKey, items)
            }
          }

          currentPage++
          hasMore = (currentPage * opts.pageSize) < totalCount

          // Preload next page if enabled
          if (opts.preloadNext && hasMore) {
            this.preloadNextPage(userId, category, currentPage, opts.pageSize)
          }

          return {
            items,
            hasMore,
            totalCount,
            currentPage: currentPage - 1
          }
        } finally {
          isLoading = false
        }
      },

      /**
       * Reset the loader to start from the beginning
       */
      reset: () => {
        currentPage = 0
        hasMore = true
        totalCount = 0
      },

      /**
       * Get current state
       */
      getState: (): LazyLoadState => ({
        isLoading,
        hasMore,
        error: null,
        currentPage,
        totalCount
      })
    }
  }

  /**
   * Create a paginated template loader
   */
  createPaginatedLoader(
    userId: string,
    category?: string,
    options: Partial<LazyLoadOptions> = {}
  ) {
    const opts = { ...this.defaultOptions, ...options }

    return {
      /**
       * Load specific page
       */
      loadPage: async (page: number): Promise<PaginatedResult<TemplateItem>> => {
        // Check cache first
        const cacheKey = this.getCacheKey(userId, category, page, opts.pageSize)
        let cachedResult = null
        
        if (opts.cacheResults) {
          cachedResult = templateCacheService.getTemplateItems(cacheKey)
        }

        if (cachedResult) {
          const totalCount = templateCacheService.getTemplateCount(userId, category) || 0
          return this.createPaginatedResult(cachedResult, page, opts.pageSize, totalCount)
        }

        // Load from API
        const result = await this.loadTemplatePage(userId, category, page, opts.pageSize)
        
        // Cache the result
        if (opts.cacheResults) {
          templateCacheService.setTemplateItems(cacheKey, result.items)
          templateCacheService.setTemplateCount(userId, result.totalCount, category)
        }

        return this.createPaginatedResult(result.items, page, opts.pageSize, result.totalCount)
      }
    }
  }

  /**
   * Create a template content lazy loader
   */
  createContentLoader() {
    const loadingPromises = new Map<string, Promise<Template>>()

    return {
      /**
       * Load template content lazily
       */
      loadContent: async (templateId: string): Promise<Template> => {
        // Check cache first
        const cached = templateCacheService.getTemplate(templateId)
        if (cached) {
          return cached
        }

        // Check if already loading
        if (loadingPromises.has(templateId)) {
          return loadingPromises.get(templateId)!
        }

        // Start loading
        const loadingPromise = this.loadTemplateContent(templateId)
        loadingPromises.set(templateId, loadingPromise)

        try {
          const template = await loadingPromise
          
          // Cache the result
          templateCacheService.setTemplate(template)
          
          return template
        } finally {
          loadingPromises.delete(templateId)
        }
      },

      /**
       * Preload template content
       */
      preloadContent: (templateId: string): void => {
        // Only preload if not already cached or loading
        if (!templateCacheService.getTemplate(templateId) && !loadingPromises.has(templateId)) {
          this.loadTemplateContent(templateId)
            .then(template => templateCacheService.setTemplate(template))
            .catch(error => console.warn('Failed to preload template:', templateId, error))
        }
      }
    }
  }

  /**
   * Load template page from API
   */
  private async loadTemplatePage(
    userId: string,
    category: string | undefined,
    page: number,
    pageSize: number
  ): Promise<{ items: TemplateItem[]; totalCount: number }> {
    const offset = page * pageSize
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: offset.toString()
    })

    if (category) {
      params.append('category', category)
    }

    const response = await fetch(`/api/templates?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to load templates: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      items: data.templates || [],
      totalCount: data.totalCount || 0
    }
  }

  /**
   * Load individual template content
   */
  private async loadTemplateContent(templateId: string): Promise<Template> {
    const response = await fetch(`/api/templates/${templateId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.template) {
      throw new Error('No template data returned')
    }

    return data.template
  }

  /**
   * Preload next page in background
   */
  private preloadNextPage(
    userId: string,
    category: string | undefined,
    nextPage: number,
    pageSize: number
  ): void {
    // Run preload in background without blocking
    setTimeout(async () => {
      try {
        const cacheKey = this.getCacheKey(userId, category, nextPage, pageSize)
        
        // Only preload if not already cached
        if (!templateCacheService.getTemplateItems(cacheKey)) {
          const result = await this.loadTemplatePage(userId, category, nextPage, pageSize)
          templateCacheService.setTemplateItems(cacheKey, result.items)
        }
      } catch (error) {
        console.warn('Failed to preload next page:', error)
      }
    }, 100) // Small delay to not interfere with current loading
  }

  /**
   * Generate cache key for paginated results
   */
  private getCacheKey(
    userId: string,
    category: string | undefined,
    page: number,
    pageSize: number
  ): string {
    const categoryPart = category ? `:${category}` : ''
    return `paginated:${userId}${categoryPart}:${page}:${pageSize}`
  }

  /**
   * Create paginated result object
   */
  private createPaginatedResult<T>(
    items: T[],
    currentPage: number,
    pageSize: number,
    totalCount: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(totalCount / pageSize)
    
    return {
      items,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages - 1,
      hasPreviousPage: currentPage > 0
    }
  }
}

// Export singleton instance
export const templateLazyLoadingService = new TemplateLazyLoadingService()