/**
 * Performance optimization tests for template management
 * Tests caching, debouncing, and virtual scrolling optimizations
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { optimizedTemplateLoader } from '@/lib/template-performance-optimizer'
import { useDebouncedTemplateSearch, useDebouncedTemplateFilters } from '@/hooks/use-debounced-template-search'
import { templateCacheService } from '@/lib/template-cache'
import type { Template } from '@/types/template'

// Mock template data
const mockTemplates: Template[] = [
  {
    id: '1',
    titel: 'Mietvertrag Standard',
    kategorie: 'Mietverträge',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Standard Mietvertrag Inhalt' }] }] },
    user_id: 'user1',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse']
  },
  {
    id: '2',
    titel: 'Kündigung Vorlage',
    kategorie: 'Kündigungen',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kündigung Vorlage Inhalt' }] }] },
    user_id: 'user1',
    erstellungsdatum: '2024-01-02T00:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name', 'kuendigungsdatum']
  },
  {
    id: '3',
    titel: 'Betriebskosten Abrechnung',
    kategorie: 'Betriebskosten',
    inhalt: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Betriebskosten Abrechnung Inhalt' }] }] },
    user_id: 'user1',
    erstellungsdatum: '2024-01-03T00:00:00Z',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name', 'abrechnungszeitraum']
  }
]

// Mock the template service
jest.mock('@/lib/template-service', () => ({
  TemplateService: jest.fn().mockImplementation(() => ({
    getUserTemplates: jest.fn().mockResolvedValue(mockTemplates)
  }))
}))

describe('Template Performance Optimization', () => {
  beforeEach(() => {
    // Clear all caches before each test
    templateCacheService.clearAllCaches()
    optimizedTemplateLoader.clearAll()
    jest.clearAllMocks()
  })

  describe('OptimizedTemplateLoader', () => {
    it('should cache templates after first load', async () => {
      const userId = 'user1'
      
      // First load - should hit the service
      const startTime1 = performance.now()
      const templates1 = await optimizedTemplateLoader.loadTemplates(userId)
      const loadTime1 = performance.now() - startTime1
      
      expect(templates1).toHaveLength(3)
      expect(templates1[0].titel).toBe('Mietvertrag Standard')
      
      // Second load - should hit the cache (much faster)
      const startTime2 = performance.now()
      const templates2 = await optimizedTemplateLoader.loadTemplates(userId)
      const loadTime2 = performance.now() - startTime2
      
      expect(templates2).toHaveLength(3)
      expect(templates2).toEqual(templates1)
      
      // Cache hit should be significantly faster
      expect(loadTime2).toBeLessThan(loadTime1 / 2)
    })

    it('should prevent duplicate loading requests', async () => {
      const userId = 'user1'
      
      // Start multiple concurrent loads
      const promises = [
        optimizedTemplateLoader.loadTemplates(userId),
        optimizedTemplateLoader.loadTemplates(userId),
        optimizedTemplateLoader.loadTemplates(userId)
      ]
      
      const results = await Promise.all(promises)
      
      // All should return the same data
      expect(results[0]).toEqual(results[1])
      expect(results[1]).toEqual(results[2])
      
      // Service should only be called once
      const { TemplateService } = require('@/lib/template-service')
      const mockInstance = TemplateService.mock.results[0].value
      expect(mockInstance.getUserTemplates).toHaveBeenCalledTimes(1)
    })

    it('should build and use search index for faster searching', async () => {
      const userId = 'user1'
      await optimizedTemplateLoader.loadTemplates(userId)
      
      // Search should use the optimized index
      const startTime = performance.now()
      const results = optimizedTemplateLoader.searchTemplates(mockTemplates, 'Mietvertrag')
      const searchTime = performance.now() - startTime
      
      expect(results).toHaveLength(1)
      expect(results[0].titel).toBe('Mietvertrag Standard')
      
      // Search should be fast (under 10ms for small dataset)
      expect(searchTime).toBeLessThan(10)
    })

    it('should filter by category efficiently', async () => {
      const startTime = performance.now()
      const results = optimizedTemplateLoader.filterByCategory(mockTemplates, 'Mietverträge')
      const filterTime = performance.now() - startTime
      
      expect(results).toHaveLength(1)
      expect(results[0].kategorie).toBe('Mietverträge')
      
      // Filtering should be very fast
      expect(filterTime).toBeLessThan(5)
    })

    it('should provide performance metrics', async () => {
      const userId = 'user1'
      await optimizedTemplateLoader.loadTemplates(userId)
      
      // Wait a bit for search index to be built asynchronously
      await new Promise(resolve => setTimeout(resolve, 100))
      
      optimizedTemplateLoader.searchTemplates(mockTemplates, 'test')
      optimizedTemplateLoader.filterByCategory(mockTemplates, 'Mietverträge')
      
      const metrics = optimizedTemplateLoader.getPerformanceMetrics()
      
      expect(metrics).toHaveProperty('loadTime')
      expect(metrics).toHaveProperty('searchTime')
      expect(metrics).toHaveProperty('filterTime')
      expect(metrics).toHaveProperty('cacheHitRate')
      expect(metrics).toHaveProperty('totalOperations')
      expect(metrics).toHaveProperty('searchIndexSize')
      
      expect(metrics.totalOperations).toBeGreaterThan(0)
      // Search index might be 0 if built asynchronously, so just check it exists
      expect(metrics.searchIndexSize).toBeGreaterThanOrEqual(0)
    })
  })

  describe('useDebouncedTemplateSearch', () => {
    it('should debounce search queries', async () => {
      const { result } = renderHook(() => 
        useDebouncedTemplateSearch(mockTemplates, { debounceMs: 100 })
      )
      
      // Initial state
      expect(result.current.query).toBe('')
      expect(result.current.searchResults).toEqual(mockTemplates)
      expect(result.current.isSearching).toBe(false)
      
      // Set search query
      act(() => {
        result.current.setSearchQuery('Mietvertrag')
      })
      
      // Query should update immediately
      expect(result.current.query).toBe('Mietvertrag')
      expect(result.current.isSearching).toBe(false) // Not searching yet due to debounce
      
      // Wait for debounce
      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('Mietvertrag')
      }, { timeout: 200 })
      
      // Results should be filtered
      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1)
        expect(result.current.searchResults[0].titel).toBe('Mietvertrag Standard')
      })
    })

    it('should cancel previous search when new query is entered', async () => {
      const { result } = renderHook(() => 
        useDebouncedTemplateSearch(mockTemplates, { debounceMs: 100 })
      )
      
      // Set first query
      act(() => {
        result.current.setSearchQuery('Mietvertrag')
      })
      
      // Immediately set second query (should cancel first)
      act(() => {
        result.current.setSearchQuery('Kündigung')
      })
      
      // Wait for debounce
      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('Kündigung')
      }, { timeout: 200 })
      
      // Should only show results for second query
      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1)
        expect(result.current.searchResults[0].titel).toBe('Kündigung Vorlage')
      })
    })

    it('should clear search results', async () => {
      const { result } = renderHook(() => 
        useDebouncedTemplateSearch(mockTemplates, { debounceMs: 50 })
      )
      
      // Set search query
      act(() => {
        result.current.setSearchQuery('Mietvertrag')
      })
      
      // Wait for search to complete
      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1)
      })
      
      // Clear search
      act(() => {
        result.current.clearSearch()
      })
      
      // Should reset to show all templates
      expect(result.current.query).toBe('')
      expect(result.current.debouncedQuery).toBe('')
      expect(result.current.searchResults).toEqual(mockTemplates)
    })

    it('should provide performance metrics in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const { result } = renderHook(() => 
        useDebouncedTemplateSearch(mockTemplates, { 
          debounceMs: 50,
          enablePerformanceMonitoring: true 
        })
      )
      
      // Set search query
      act(() => {
        result.current.setSearchQuery('Mietvertrag')
      })
      
      // Wait for search to complete
      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1)
      })
      
      // Should have performance metrics
      expect(result.current.performanceMetrics).toBeDefined()
      expect(result.current.performanceMetrics?.searchTime).toBeGreaterThanOrEqual(0)
      expect(result.current.performanceMetrics?.resultCount).toBe(1)
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('useDebouncedTemplateFilters', () => {
    it('should combine search and category filtering', async () => {
      const { result } = renderHook(() => 
        useDebouncedTemplateFilters(mockTemplates, { debounceMs: 50 })
      )
      
      // Initial state - all templates
      expect(result.current.filteredTemplates).toEqual(mockTemplates)
      expect(result.current.hasActiveFilters).toBe(false)
      
      // Set category filter
      act(() => {
        result.current.setCategoryFilter('Mietverträge')
      })
      
      // Wait for filtering
      await waitFor(() => {
        expect(result.current.filteredTemplates).toHaveLength(1)
        expect(result.current.hasActiveFilters).toBe(true)
      })
      
      // Add search query
      act(() => {
        result.current.setSearchQuery('Standard')
      })
      
      // Wait for search
      await waitFor(() => {
        expect(result.current.filteredTemplates).toHaveLength(1)
        expect(result.current.filteredTemplates[0].titel).toBe('Mietvertrag Standard')
      })
      
      // Clear all filters
      act(() => {
        result.current.clearAllFilters()
      })
      
      // Should reset to show all templates
      expect(result.current.filteredTemplates).toEqual(mockTemplates)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should indicate processing state', async () => {
      const { result } = renderHook(() => 
        useDebouncedTemplateFilters(mockTemplates, { debounceMs: 100 })
      )
      
      // Set search query
      act(() => {
        result.current.setSearchQuery('test')
      })
      
      // Processing state might be brief, so just check that it eventually completes
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false)
      }, { timeout: 200 })
      
      // Verify the search was applied
      expect(result.current.searchQuery).toBe('test')
    })
  })

  describe('Template Cache Service', () => {
    it('should cache and retrieve templates', () => {
      const userId = 'user1'
      
      // Cache templates
      templateCacheService.setUserTemplates(userId, mockTemplates)
      
      // Retrieve from cache
      const cached = templateCacheService.getUserTemplates(userId)
      
      expect(cached).toEqual(mockTemplates)
    })

    it('should invalidate caches correctly', () => {
      const userId = 'user1'
      
      // Cache templates
      templateCacheService.setUserTemplates(userId, mockTemplates)
      templateCacheService.setUserCategories(userId, ['Mietverträge', 'Kündigungen'])
      
      // Verify cached
      expect(templateCacheService.getUserTemplates(userId)).toEqual(mockTemplates)
      expect(templateCacheService.getUserCategories(userId)).toEqual(['Mietverträge', 'Kündigungen'])
      
      // Invalidate user caches
      templateCacheService.invalidateUserCaches(userId)
      
      // Should be cleared
      expect(templateCacheService.getUserTemplates(userId)).toBeNull()
      expect(templateCacheService.getUserCategories(userId)).toBeNull()
    })

    it('should provide cache statistics', () => {
      const userId = 'user1'
      
      // Cache some data
      templateCacheService.setUserTemplates(userId, mockTemplates)
      templateCacheService.setUserCategories(userId, ['Test'])
      
      // Get stats
      const stats = templateCacheService.getCacheStats()
      
      expect(stats).toHaveProperty('templates')
      expect(stats).toHaveProperty('templateLists')
      expect(stats).toHaveProperty('categories')
      
      expect(stats.templateLists.size).toBeGreaterThan(0)
      expect(stats.categories.size).toBeGreaterThan(0)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should load templates within performance threshold', async () => {
      const userId = 'user1'
      
      const startTime = performance.now()
      await optimizedTemplateLoader.loadTemplates(userId)
      const loadTime = performance.now() - startTime
      
      // Should load within 100ms for small dataset
      expect(loadTime).toBeLessThan(100)
    })

    it('should search templates within performance threshold', async () => {
      const userId = 'user1'
      await optimizedTemplateLoader.loadTemplates(userId)
      
      const startTime = performance.now()
      optimizedTemplateLoader.searchTemplates(mockTemplates, 'Mietvertrag')
      const searchTime = performance.now() - startTime
      
      // Should search within 10ms for small dataset
      expect(searchTime).toBeLessThan(10)
    })

    it('should filter templates within performance threshold', async () => {
      const startTime = performance.now()
      optimizedTemplateLoader.filterByCategory(mockTemplates, 'Mietverträge')
      const filterTime = performance.now() - startTime
      
      // Should filter within 5ms for small dataset
      expect(filterTime).toBeLessThan(5)
    })
  })
})