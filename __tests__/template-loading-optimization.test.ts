/**
 * Tests for template loading optimization features
 */

import { templateCacheService } from '@/lib/template-cache'
import { templateLazyLoadingService } from '@/lib/template-lazy-loading'
import { Template, TemplateItem } from '@/types/template'

// Mock fetch for testing
global.fetch = jest.fn()

const mockTemplate: Template = {
  id: 'test-template-1',
  titel: 'Test Template',
  inhalt: { type: 'doc', content: [] },
  user_id: 'user-123',
  erstellungsdatum: '2024-01-01T00:00:00Z',
  kategorie: 'Test Category',
  kontext_anforderungen: ['test_variable'],
  aktualisiert_am: '2024-01-01T00:00:00Z'
}

const mockTemplateItem: TemplateItem = {
  id: 'test-template-1',
  name: 'Test Template',
  category: 'Test Category',
  content: JSON.stringify({ type: 'doc', content: [] }),
  variables: ['test_variable'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  size: 100,
  type: 'template'
}

describe('Template Cache Service', () => {
  beforeEach(() => {
    templateCacheService.clearAllCaches()
  })

  describe('Template caching', () => {
    it('should cache and retrieve templates', () => {
      templateCacheService.setTemplate(mockTemplate)
      const cached = templateCacheService.getTemplate(mockTemplate.id)
      
      expect(cached).toEqual(mockTemplate)
    })

    it('should return null for non-existent templates', () => {
      const cached = templateCacheService.getTemplate('non-existent')
      expect(cached).toBeNull()
    })

    it('should delete templates from cache', () => {
      templateCacheService.setTemplate(mockTemplate)
      templateCacheService.deleteTemplate(mockTemplate.id)
      
      const cached = templateCacheService.getTemplate(mockTemplate.id)
      expect(cached).toBeNull()
    })
  })

  describe('Template list caching', () => {
    it('should cache and retrieve user templates', () => {
      const templates = [mockTemplate]
      templateCacheService.setUserTemplates('user-123', templates)
      
      const cached = templateCacheService.getUserTemplates('user-123')
      expect(cached).toEqual(templates)
    })

    it('should cache and retrieve category templates', () => {
      const templates = [mockTemplate]
      templateCacheService.setCategoryTemplates('user-123', 'Test Category', templates)
      
      const cached = templateCacheService.getCategoryTemplates('user-123', 'Test Category')
      expect(cached).toEqual(templates)
    })
  })

  describe('Template item caching', () => {
    it('should cache and retrieve template items', () => {
      const items = [mockTemplateItem]
      templateCacheService.setTemplateItems('user-123', items)
      
      const cached = templateCacheService.getTemplateItems('user-123')
      expect(cached).toEqual(items)
    })

    it('should cache template items by category', () => {
      const items = [mockTemplateItem]
      templateCacheService.setTemplateItems('user-123', items, 'Test Category')
      
      const cached = templateCacheService.getTemplateItems('user-123', 'Test Category')
      expect(cached).toEqual(items)
    })
  })

  describe('Category caching', () => {
    it('should cache and retrieve user categories', () => {
      const categories = ['Category 1', 'Category 2']
      templateCacheService.setUserCategories('user-123', categories)
      
      const cached = templateCacheService.getUserCategories('user-123')
      expect(cached).toEqual(categories)
    })
  })

  describe('Template count caching', () => {
    it('should cache and retrieve template counts', () => {
      templateCacheService.setTemplateCount('user-123', 5)
      
      const cached = templateCacheService.getTemplateCount('user-123')
      expect(cached).toBe(5)
    })

    it('should cache template counts by category', () => {
      templateCacheService.setTemplateCount('user-123', 3, 'Test Category')
      
      const cached = templateCacheService.getTemplateCount('user-123', 'Test Category')
      expect(cached).toBe(3)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate user caches', () => {
      templateCacheService.setUserTemplates('user-123', [mockTemplate])
      templateCacheService.setUserCategories('user-123', ['Category 1'])
      
      templateCacheService.invalidateUserCaches('user-123')
      
      expect(templateCacheService.getUserTemplates('user-123')).toBeNull()
      expect(templateCacheService.getUserCategories('user-123')).toBeNull()
    })

    it('should invalidate category caches', () => {
      templateCacheService.setCategoryTemplates('user-123', 'Test Category', [mockTemplate])
      templateCacheService.setTemplateItems('user-123', [mockTemplateItem], 'Test Category')
      
      templateCacheService.invalidateCategoryCache('user-123', 'Test Category')
      
      expect(templateCacheService.getCategoryTemplates('user-123', 'Test Category')).toBeNull()
      expect(templateCacheService.getTemplateItems('user-123', 'Test Category')).toBeNull()
    })
  })

  describe('Cache statistics', () => {
    it('should provide cache statistics', () => {
      templateCacheService.setTemplate(mockTemplate)
      templateCacheService.setUserTemplates('user-123', [mockTemplate])
      
      const stats = templateCacheService.getCacheStats()
      
      expect(stats.templates.size).toBe(1)
      expect(stats.templateLists.size).toBe(1)
    })
  })
})

describe('Template Lazy Loading Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    templateCacheService.clearAllCaches()
  })

  describe('Template list loader', () => {
    it('should create a template list loader', () => {
      const loader = templateLazyLoadingService.createTemplateListLoader('user-123')
      
      expect(loader).toHaveProperty('loadNext')
      expect(loader).toHaveProperty('reset')
      expect(loader).toHaveProperty('getState')
    })

    it('should load next page of templates', async () => {
      const mockResponse = {
        templates: [mockTemplate],
        totalCount: 1
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const loader = templateLazyLoadingService.createTemplateListLoader('user-123')
      const result = await loader.loadNext()

      expect(result.items).toHaveLength(1)
      expect(result.totalCount).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should handle loading errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const loader = templateLazyLoadingService.createTemplateListLoader('user-123')
      
      await expect(loader.loadNext()).rejects.toThrow('Network error')
    })

    it('should reset loader state', () => {
      const loader = templateLazyLoadingService.createTemplateListLoader('user-123')
      loader.reset()
      
      const state = loader.getState()
      expect(state.currentPage).toBe(0)
      expect(state.hasMore).toBe(true)
    })
  })

  describe('Paginated loader', () => {
    it('should create a paginated loader', () => {
      const loader = templateLazyLoadingService.createPaginatedLoader('user-123')
      
      expect(loader).toHaveProperty('loadPage')
    })

    it('should load specific page', async () => {
      const mockResponse = {
        templates: [mockTemplate],
        totalCount: 1
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const loader = templateLazyLoadingService.createPaginatedLoader('user-123')
      const result = await loader.loadPage(0)

      expect(result.items).toHaveLength(1)
      expect(result.currentPage).toBe(0)
      expect(result.totalCount).toBe(1)
      expect(result.hasNextPage).toBe(false)
    })
  })

  describe('Content loader', () => {
    it('should create a content loader', () => {
      const loader = templateLazyLoadingService.createContentLoader()
      
      expect(loader).toHaveProperty('loadContent')
      expect(loader).toHaveProperty('preloadContent')
    })

    it('should load template content', async () => {
      const mockResponse = {
        template: mockTemplate
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const loader = templateLazyLoadingService.createContentLoader()
      const template = await loader.loadContent('test-template-1')

      expect(template).toEqual(mockTemplate)
    })

    it('should use cached content when available', async () => {
      templateCacheService.setTemplate(mockTemplate)

      const loader = templateLazyLoadingService.createContentLoader()
      const template = await loader.loadContent('test-template-1')

      expect(template).toEqual(mockTemplate)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should preload content in background', () => {
      const mockResponse = {
        template: mockTemplate
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const loader = templateLazyLoadingService.createContentLoader()
      
      // Preload should not throw and should not block
      expect(() => loader.preloadContent('test-template-1')).not.toThrow()
    })
  })
})

describe('Template Loading Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    templateCacheService.clearAllCaches()
  })

  it('should demonstrate cache performance improvement', async () => {
    // First load - should hit the API
    const mockResponse = {
      template: mockTemplate
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const loader = templateLazyLoadingService.createContentLoader()
    
    // First load
    await loader.loadContent('test-template-1')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second load - should use cache (no additional API calls)
    await loader.loadContent('test-template-1')

    // Cache should prevent additional API calls
    expect(fetch).toHaveBeenCalledTimes(1) // Still only 1 call
    
    // Verify template is cached
    const cached = templateCacheService.getTemplate('test-template-1')
    expect(cached).toEqual(mockTemplate)
  })

  it('should handle concurrent loading requests', async () => {
    const mockResponse = {
      template: mockTemplate
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const loader = templateLazyLoadingService.createContentLoader()
    
    // Start multiple concurrent loads
    const promises = [
      loader.loadContent('test-template-1'),
      loader.loadContent('test-template-1'),
      loader.loadContent('test-template-1')
    ]

    const results = await Promise.all(promises)

    // Should only make one API call despite multiple concurrent requests
    expect(fetch).toHaveBeenCalledTimes(1)
    
    // All results should be the same
    results.forEach(result => {
      expect(result).toEqual(mockTemplate)
    })
  })
})

describe('Cache TTL and Expiration', () => {
  beforeEach(() => {
    templateCacheService.clearAllCaches()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should expire cache entries after TTL', () => {
    templateCacheService.setTemplate(mockTemplate)
    
    // Verify template is cached
    expect(templateCacheService.getTemplate(mockTemplate.id)).toEqual(mockTemplate)
    
    // Fast-forward time beyond TTL (10 minutes for templates)
    jest.advanceTimersByTime(11 * 60 * 1000)
    
    // Template should be expired and return null
    expect(templateCacheService.getTemplate(mockTemplate.id)).toBeNull()
  })

  it('should clean expired entries when accessed', () => {
    templateCacheService.setTemplate(mockTemplate)
    
    // Verify template is cached
    expect(templateCacheService.getTemplate(mockTemplate.id)).toEqual(mockTemplate)
    
    // Fast-forward time beyond TTL
    jest.advanceTimersByTime(11 * 60 * 1000)
    
    // Accessing expired entry should return null and clean it up
    expect(templateCacheService.getTemplate(mockTemplate.id)).toBeNull()
    
    // Cache should now be empty
    const stats = templateCacheService.getCacheStats()
    expect(stats.templates.size).toBe(0)
  })
})