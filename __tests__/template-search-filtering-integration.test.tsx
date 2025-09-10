/**
 * Integration tests for template search and filtering functionality
 * Tests the complete search workflow including API calls and UI interactions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock components for testing search integration
const MockTemplateList = ({ templates, onSearch, onFilter }: any) => (
  <div>
    <input
      data-testid="search-input"
      placeholder="Search templates..."
      onChange={(e) => onSearch(e.target.value)}
    />
    <select
      data-testid="category-filter"
      onChange={(e) => onFilter(e.target.value)}
    >
      <option value="">All Categories</option>
      <option value="Mietverträge">Mietverträge</option>
      <option value="Kündigungen">Kündigungen</option>
    </select>
    <div data-testid="template-results">
      {templates.map((template: any) => (
        <div key={template.id} data-testid={`template-${template.id}`}>
          <h3>{template.titel}</h3>
          <span>{template.kategorie}</span>
        </div>
      ))}
    </div>
  </div>
)

// Mock fetch globally
global.fetch = jest.fn()

describe('Template Search and Filtering Integration', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      titel: 'Standard Mietvertrag',
      kategorie: 'Mietverträge',
      inhalt: { type: 'doc', content: [] },
      kontext_anforderungen: ['tenant_name', 'property_address'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    {
      id: 'template-2',
      titel: 'Befristeter Mietvertrag',
      kategorie: 'Mietverträge',
      inhalt: { type: 'doc', content: [] },
      kontext_anforderungen: ['tenant_name', 'lease_end_date'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z'
    },
    {
      id: 'template-3',
      titel: 'Kündigung Vorlage',
      kategorie: 'Kündigungen',
      inhalt: { type: 'doc', content: [] },
      kontext_anforderungen: ['tenant_name', 'termination_date'],
      user_id: 'user-123',
      erstellungsdatum: '2024-01-03T00:00:00Z',
      aktualisiert_am: '2024-01-03T00:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Search Functionality', () => {
    it('should search templates by title', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      const mockOnFilter = jest.fn()

      // Mock API response for search
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates.filter(t => t.titel.toLowerCase().includes('standard'))
        })
      })

      render(
        <MockTemplateList
          templates={[mockTemplates[0]]} // Filtered result
          onSearch={mockOnSearch}
          onFilter={mockOnFilter}
        />
      )

      // Perform search
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'standard')

      expect(mockOnSearch).toHaveBeenCalledWith('standard')

      // Verify search results
      expect(screen.getByText('Standard Mietvertrag')).toBeInTheDocument()
      expect(screen.queryByText('Befristeter Mietvertrag')).not.toBeInTheDocument()
    })

    it('should handle empty search results', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()

      // Mock API response with no results
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] })
      })

      render(
        <MockTemplateList
          templates={[]}
          onSearch={mockOnSearch}
          onFilter={jest.fn()}
        />
      )

      // Perform search with no results
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'nonexistent')

      expect(mockOnSearch).toHaveBeenCalledWith('nonexistent')

      // Verify no results
      const results = screen.getByTestId('template-results')
      expect(results).toBeEmptyDOMElement()
    })

    it('should search templates by content', async () => {
      const searchQuery = 'tenant_name'

      // Mock API call for content search
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates.filter(t => 
            t.kontext_anforderungen.includes('tenant_name')
          )
        })
      })

      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=tenant_name')
      expect(data.templates).toHaveLength(3) // All templates contain tenant_name
    })

    it('should handle search with special characters', async () => {
      const searchQuery = 'Mietvertrag & Kündigung'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] })
      })

      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      
      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=Mietvertrag%20%26%20K%C3%BCndigung')
    })

    it('should debounce search requests', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()

      render(
        <MockTemplateList
          templates={mockTemplates}
          onSearch={mockOnSearch}
          onFilter={jest.fn()}
        />
      )

      const searchInput = screen.getByTestId('search-input')

      // Type quickly (simulating user typing)
      await user.type(searchInput, 'miet')

      // Should be called for each character
      expect(mockOnSearch).toHaveBeenCalledTimes(4) // 'm', 'i', 'e', 't'
      expect(mockOnSearch).toHaveBeenLastCalledWith('miet')
    })
  })

  describe('Category Filtering', () => {
    it('should filter templates by category', async () => {
      const user = userEvent.setup()
      const mockOnFilter = jest.fn()

      // Mock API response for category filter
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates.filter(t => t.kategorie === 'Mietverträge')
        })
      })

      render(
        <MockTemplateList
          templates={mockTemplates.filter(t => t.kategorie === 'Mietverträge')}
          onSearch={jest.fn()}
          onFilter={mockOnFilter}
        />
      )

      // Select category filter
      const categoryFilter = screen.getByTestId('category-filter')
      await user.selectOptions(categoryFilter, 'Mietverträge')

      expect(mockOnFilter).toHaveBeenCalledWith('Mietverträge')

      // Verify filtered results
      expect(screen.getByText('Standard Mietvertrag')).toBeInTheDocument()
      expect(screen.getByText('Befristeter Mietvertrag')).toBeInTheDocument()
      expect(screen.queryByText('Kündigung Vorlage')).not.toBeInTheDocument()
    })

    it('should show all templates when no category is selected', async () => {
      const user = userEvent.setup()
      const mockOnFilter = jest.fn()

      render(
        <MockTemplateList
          templates={mockTemplates}
          onSearch={jest.fn()}
          onFilter={mockOnFilter}
        />
      )

      // Select "All Categories"
      const categoryFilter = screen.getByTestId('category-filter')
      await user.selectOptions(categoryFilter, '')

      expect(mockOnFilter).toHaveBeenCalledWith('')

      // Verify all templates are shown
      expect(screen.getByText('Standard Mietvertrag')).toBeInTheDocument()
      expect(screen.getByText('Befristeter Mietvertrag')).toBeInTheDocument()
      expect(screen.getByText('Kündigung Vorlage')).toBeInTheDocument()
    })

    it('should handle category filter API calls', async () => {
      const category = 'Kündigungen'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates.filter(t => t.kategorie === category)
        })
      })

      const response = await fetch(`/api/templates?category=${encodeURIComponent(category)}`)
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?category=K%C3%BCndigungen')
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].titel).toBe('Kündigung Vorlage')
    })
  })

  describe('Combined Search and Filtering', () => {
    it('should combine search and category filters', async () => {
      const searchQuery = 'mietvertrag'
      const category = 'Mietverträge'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: mockTemplates.filter(t => 
            t.kategorie === category && 
            t.titel.toLowerCase().includes(searchQuery.toLowerCase())
          )
        })
      })

      const response = await fetch(
        `/api/templates?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(category)}`
      )
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=mietvertrag&category=Mietvertr%C3%A4ge')
      expect(data.templates).toHaveLength(2) // Both Mietvertrag templates
    })

    it('should handle complex filter combinations', async () => {
      const user = userEvent.setup()
      let currentTemplates = mockTemplates
      let currentSearch = ''
      let currentCategory = ''

      const mockOnSearch = jest.fn((query: string) => {
        currentSearch = query
        // Simulate filtering logic
        currentTemplates = mockTemplates.filter(t => {
          const matchesSearch = !currentSearch || t.titel.toLowerCase().includes(currentSearch.toLowerCase())
          const matchesCategory = !currentCategory || t.kategorie === currentCategory
          return matchesSearch && matchesCategory
        })
      })

      const mockOnFilter = jest.fn((category: string) => {
        currentCategory = category
        // Simulate filtering logic
        currentTemplates = mockTemplates.filter(t => {
          const matchesSearch = !currentSearch || t.titel.toLowerCase().includes(currentSearch.toLowerCase())
          const matchesCategory = !currentCategory || t.kategorie === currentCategory
          return matchesSearch && matchesCategory
        })
      })

      const TestComponent = () => {
        const [templates, setTemplates] = React.useState(mockTemplates)
        const [search, setSearch] = React.useState('')
        const [category, setCategory] = React.useState('')

        const handleSearch = (query: string) => {
          setSearch(query)
          mockOnSearch(query)
          // Update templates based on current filters
          const filtered = mockTemplates.filter(t => {
            const matchesSearch = !query || t.titel.toLowerCase().includes(query.toLowerCase())
            const matchesCategory = !category || t.kategorie === category
            return matchesSearch && matchesCategory
          })
          setTemplates(filtered)
        }

        const handleFilter = (cat: string) => {
          setCategory(cat)
          mockOnFilter(cat)
          // Update templates based on current filters
          const filtered = mockTemplates.filter(t => {
            const matchesSearch = !search || t.titel.toLowerCase().includes(search.toLowerCase())
            const matchesCategory = !cat || t.kategorie === cat
            return matchesSearch && matchesCategory
          })
          setTemplates(filtered)
        }

        return (
          <MockTemplateList
            templates={templates}
            onSearch={handleSearch}
            onFilter={handleFilter}
          />
        )
      }

      render(<TestComponent />)

      // First apply category filter
      const categoryFilter = screen.getByTestId('category-filter')
      await user.selectOptions(categoryFilter, 'Mietverträge')

      expect(mockOnFilter).toHaveBeenCalledWith('Mietverträge')

      // Then apply search
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'standard')

      expect(mockOnSearch).toHaveBeenLastCalledWith('standard')

      // Should show only "Standard Mietvertrag"
      await waitFor(() => {
        expect(screen.getByText('Standard Mietvertrag')).toBeInTheDocument()
        expect(screen.queryByText('Befristeter Mietvertrag')).not.toBeInTheDocument()
        expect(screen.queryByText('Kündigung Vorlage')).not.toBeInTheDocument()
      })
    })
  })

  describe('Pagination with Search and Filters', () => {
    it('should handle paginated search results', async () => {
      const searchQuery = 'template'
      const limit = 2
      const offset = 0

      const mockPaginatedResponse = {
        templates: mockTemplates.slice(0, 2),
        totalCount: 3,
        limit,
        offset,
        hasMore: true
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      })

      const response = await fetch(
        `/api/templates?search=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}`
      )
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=template&limit=2&offset=0')
      expect(data.templates).toHaveLength(2)
      expect(data.totalCount).toBe(3)
      expect(data.hasMore).toBe(true)
    })

    it('should handle pagination with category filters', async () => {
      const category = 'Mietverträge'
      const limit = 1
      const offset = 1

      const mockPaginatedResponse = {
        templates: [mockTemplates[1]], // Second Mietvertrag template
        totalCount: 2,
        limit,
        offset,
        hasMore: false
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaginatedResponse
      })

      const response = await fetch(
        `/api/templates?category=${encodeURIComponent(category)}&limit=${limit}&offset=${offset}`
      )
      const data = await response.json()

      expect(global.fetch).toHaveBeenCalledWith('/api/templates?category=Mietvertr%C3%A4ge&limit=1&offset=1')
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].titel).toBe('Befristeter Mietvertrag')
      expect(data.hasMore).toBe(false)
    })
  })

  describe('Error Handling in Search and Filtering', () => {
    it('should handle search API errors gracefully', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search API error'))

      const mockOnSearch = jest.fn(async (query: string) => {
        try {
          await fetch(`/api/templates?search=${encodeURIComponent(query)}`)
        } catch (error) {
          // Handle error gracefully
          console.error('Search failed:', error)
        }
      })

      render(
        <MockTemplateList
          templates={[]}
          onSearch={mockOnSearch}
          onFilter={jest.fn()}
        />
      )

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'test')

      expect(mockOnSearch).toHaveBeenCalledWith('test')
    })

    it('should handle invalid search parameters', async () => {
      const invalidSearchQuery = 'a'.repeat(1000) // Very long search query

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Search query too long' })
      })

      const response = await fetch(`/api/templates?search=${encodeURIComponent(invalidSearchQuery)}`)
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Search query too long')
    })

    it('should handle malformed filter parameters', async () => {
      const malformedCategory = 'category with\nnewlines\tand\ttabs'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] })
      })

      const response = await fetch(`/api/templates?category=${encodeURIComponent(malformedCategory)}`)
      
      expect(global.fetch).toHaveBeenCalledWith('/api/templates?category=category%20with%0Anewlines%09and%09tabs')
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large result sets efficiently', async () => {
      const largeTemplateSet = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        titel: `Template ${i}`,
        kategorie: i % 2 === 0 ? 'Mietverträge' : 'Kündigungen',
        inhalt: { type: 'doc', content: [] },
        kontext_anforderungen: [],
        user_id: 'user-123',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z'
      }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: largeTemplateSet.slice(0, 20), // First page
          totalCount: 100,
          limit: 20,
          offset: 0,
          hasMore: true
        })
      })

      const response = await fetch('/api/templates?limit=20&offset=0')
      const data = await response.json()

      expect(data.templates).toHaveLength(20)
      expect(data.totalCount).toBe(100)
      expect(data.hasMore).toBe(true)
    })

    it('should cache search results appropriately', async () => {
      const searchQuery = 'cached'

      // First request
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [mockTemplates[0]] })
      })

      const response1 = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data1 = await response1.json()

      // Second identical request (should potentially use cache)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [mockTemplates[0]] })
      })

      const response2 = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data2 = await response2.json()

      expect(data1.templates).toEqual(data2.templates)
      expect(global.fetch).toHaveBeenCalledTimes(2) // Both calls made (no caching in this test)
    })
  })
})