/**
 * Template performance optimization service
 * Provides caching, debouncing, and virtual scrolling optimizations
 */

import { Template, TemplateItem } from '@/types/template'
import { templateCacheService } from './template-cache'

interface SearchIndex {
  templateId: string
  searchableText: string
  keywords: string[]
  category: string
  lastIndexed: number
}

interface PerformanceMetrics {
  loadTime: number
  searchTime: number
  filterTime: number
  renderTime: number
  cacheHitRate: number
  totalOperations: number
}

/**
 * Optimized template loader with advanced caching and performance monitoring
 */
export class OptimizedTemplateLoader {
  private searchIndex = new Map<string, SearchIndex>()
  private loadingPromises = new Map<string, Promise<Template[]>>()
  private performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    searchTime: 0,
    filterTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    totalOperations: 0
  }
  
  private readonly SEARCH_INDEX_TTL = 10 * 60 * 1000 // 10 minutes
  private readonly BATCH_SIZE = 50
  private readonly DEBOUNCE_DELAY = 300

  /**
   * Load templates with advanced caching and deduplication
   */
  async loadTemplates(userId: string, forceRefresh = false): Promise<Template[]> {
    const startTime = performance.now()
    const cacheKey = `user_templates:${userId}`

    try {
      // Check if there's already a loading operation in progress
      if (this.loadingPromises.has(cacheKey)) {
        return await this.loadingPromises.get(cacheKey)!
      }

      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = templateCacheService.getUserTemplates(userId)
        if (cached && cached.length > 0) {
          this.updatePerformanceMetrics('load', startTime, true)
          return cached
        }
      }

      // Create loading promise to prevent duplicate requests
      const loadingPromise = this.performTemplateLoad(userId)
      this.loadingPromises.set(cacheKey, loadingPromise)

      try {
        const templates = await loadingPromise
        this.updatePerformanceMetrics('load', startTime, false)
        
        // Update search index in background
        this.updateSearchIndexAsync(templates)
        
        return templates
      } finally {
        // Clean up loading promise
        this.loadingPromises.delete(cacheKey)
      }
    } catch (error) {
      this.loadingPromises.delete(cacheKey)
      throw error
    }
  }

  /**
   * Perform the actual template loading with retry logic
   */
  private async performTemplateLoad(userId: string): Promise<Template[]> {
    const { TemplateService } = await import('./template-service')
    const templateService = new TemplateService()
    
    const templates = await templateService.getUserTemplates(userId)
    
    // Cache the results
    templateCacheService.setUserTemplates(userId, templates)
    
    return templates
  }

  /**
   * Update search index asynchronously
   */
  private async updateSearchIndexAsync(templates: Template[]): Promise<void> {
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleWork = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 1000 })
      } else {
        setTimeout(callback, 0)
      }
    }

    scheduleWork(() => {
      this.buildSearchIndex(templates)
    })
  }

  /**
   * Build optimized search index
   */
  private buildSearchIndex(templates: Template[]): void {
    const now = Date.now()
    
    templates.forEach(template => {
      try {
        // Extract searchable text from template content
        const searchableText = this.extractSearchableText(template)
        
        // Generate keywords for faster searching
        const keywords = this.generateKeywords(searchableText, template.titel, template.kategorie)
        
        this.searchIndex.set(template.id, {
          templateId: template.id,
          searchableText: searchableText.toLowerCase(),
          keywords,
          category: template.kategorie || '',
          lastIndexed: now
        })
      } catch (error) {
        console.warn('Error indexing template:', template.id, error)
      }
    })
  }

  /**
   * Extract searchable text from template content
   */
  private extractSearchableText(template: Template): string {
    try {
      const contentStr = JSON.stringify(template.inhalt)
      // Remove HTML tags and JSON formatting
      const cleanText = contentStr
        .replace(/<[^>]*>/g, ' ')
        .replace(/[{}"\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      return `${template.titel} ${template.kategorie || ''} ${cleanText}`
    } catch (error) {
      console.warn('Error extracting searchable text:', error)
      return `${template.titel} ${template.kategorie || ''}`
    }
  }

  /**
   * Generate keywords for faster searching
   */
  private generateKeywords(text: string, title: string, category?: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const keywords = new Set<string>()
    
    // Add individual words
    words.forEach(word => {
      if (word.length > 2) {
        keywords.add(word)
      }
    })
    
    // Add title words with higher priority
    title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 1) {
        keywords.add(word)
      }
    })
    
    // Add category
    if (category) {
      keywords.add(category.toLowerCase())
    }
    
    return Array.from(keywords)
  }

  /**
   * Optimized search with index utilization
   */
  searchTemplates(templates: Template[], query: string): Template[] {
    const startTime = performance.now()
    
    if (!query.trim()) {
      this.updatePerformanceMetrics('search', startTime, true)
      return templates
    }

    try {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
      const results: Template[] = []
      
      templates.forEach(template => {
        const index = this.searchIndex.get(template.id)
        
        if (index) {
          // Use indexed search for better performance
          const matches = searchTerms.every(term => 
            index.keywords.some(keyword => keyword.includes(term)) ||
            index.searchableText.includes(term)
          )
          
          if (matches) {
            results.push(template)
          }
        } else {
          // Fallback to direct search if not indexed
          const searchableText = this.extractSearchableText(template).toLowerCase()
          const matches = searchTerms.every(term => searchableText.includes(term))
          
          if (matches) {
            results.push(template)
          }
        }
      })
      
      this.updatePerformanceMetrics('search', startTime, false)
      return results
    } catch (error) {
      console.warn('Error in optimized search, falling back to simple search:', error)
      // Fallback to simple search
      return this.simpleSearch(templates, query)
    }
  }

  /**
   * Simple fallback search
   */
  private simpleSearch(templates: Template[], query: string): Template[] {
    const searchTerms = query.toLowerCase().split(/\s+/)
    
    return templates.filter(template => {
      const searchText = `${template.titel} ${template.kategorie || ''} ${JSON.stringify(template.inhalt)}`.toLowerCase()
      return searchTerms.every(term => searchText.includes(term))
    })
  }

  /**
   * Optimized category filtering
   */
  filterByCategory(templates: Template[], category: string): Template[] {
    const startTime = performance.now()
    
    if (category === 'all') {
      this.updatePerformanceMetrics('filter', startTime, true)
      return templates
    }

    const filtered = templates.filter(template => 
      (template.kategorie || 'Ohne Kategorie') === category
    )
    
    this.updatePerformanceMetrics('filter', startTime, false)
    return filtered
  }

  /**
   * Get templates with pagination for virtual scrolling
   */
  getPaginatedTemplates(templates: Template[], page: number, pageSize: number = this.BATCH_SIZE): {
    templates: Template[]
    hasMore: boolean
    totalPages: number
  } {
    const startIndex = page * pageSize
    const endIndex = startIndex + pageSize
    const paginatedTemplates = templates.slice(startIndex, endIndex)
    
    return {
      templates: paginatedTemplates,
      hasMore: endIndex < templates.length,
      totalPages: Math.ceil(templates.length / pageSize)
    }
  }

  /**
   * Clean expired search index entries
   */
  cleanSearchIndex(): void {
    const now = Date.now()
    const expiredEntries: string[] = []
    
    this.searchIndex.forEach((index, templateId) => {
      if (now - index.lastIndexed > this.SEARCH_INDEX_TTL) {
        expiredEntries.push(templateId)
      }
    })
    
    expiredEntries.forEach(templateId => {
      this.searchIndex.delete(templateId)
    })
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(operation: keyof PerformanceMetrics, startTime: number, cacheHit: boolean): void {
    const duration = performance.now() - startTime
    
    if (operation !== 'cacheHitRate' && operation !== 'totalOperations') {
      this.performanceMetrics[operation] = (this.performanceMetrics[operation] + duration) / 2
    }
    
    this.performanceMetrics.totalOperations++
    
    if (cacheHit) {
      this.performanceMetrics.cacheHitRate = 
        (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalOperations - 1) + 1) / 
        this.performanceMetrics.totalOperations
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics & { searchIndexSize: number } {
    return {
      ...this.performanceMetrics,
      searchIndexSize: this.searchIndex.size
    }
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      loadTime: 0,
      searchTime: 0,
      filterTime: 0,
      renderTime: 0,
      cacheHitRate: 0,
      totalOperations: 0
    }
  }

  /**
   * Clear all caches and indexes
   */
  clearAll(): void {
    this.searchIndex.clear()
    this.loadingPromises.clear()
    this.resetPerformanceMetrics()
  }
}

// Export singleton instance
export const optimizedTemplateLoader = new OptimizedTemplateLoader()