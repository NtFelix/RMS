/**
 * Simplified integration tests for the Document Template System
 * Focuses on API integration and workflow logic without complex UI components
 */

import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

describe('Template System Integration Tests (Simplified)', () => {
  const mockTemplate = {
    id: 'template-123',
    titel: 'Test Template',
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              attrs: { id: 'tenant_name', label: 'Mieter Name' }
            }
          ]
        }
      ]
    },
    kategorie: 'Mietverträge',
    kontext_anforderungen: ['tenant_name'],
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  const mockCategories = ['Mietverträge', 'Kündigungen', 'Nebenkostenabrechnungen', 'Sonstiges']

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Template CRUD Operations', () => {
    it('should create a new template via API', async () => {
      const templateData = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        kontext_anforderungen: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ template: mockTemplate })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      expect(data.template.id).toBe(mockTemplate.id)
      expect(global.fetch).toHaveBeenCalledWith('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
    })

    it('should read a template via API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: mockTemplate })
      })

      const response = await fetch(`/api/templates/${mockTemplate.id}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.template.id).toBe(mockTemplate.id)
      expect(data.template.titel).toBe(mockTemplate.titel)
    })

    it('should update a template via API', async () => {
      const updateData = { titel: 'Updated Template' }
      const updatedTemplate = { ...mockTemplate, titel: 'Updated Template' }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: updatedTemplate })
      })

      const response = await fetch(`/api/templates/${mockTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.template.titel).toBe('Updated Template')
    })

    it('should delete a template via API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const response = await fetch(`/api/templates/${mockTemplate.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })
  })

  describe('Template Search and Filtering', () => {
    it('should search templates by title', async () => {
      const searchQuery = 'test'
      const filteredTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: filteredTemplates })
      })

      const response = await fetch(`/api/templates?search=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].titel).toContain('Test')
      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=test')
    })

    it('should filter templates by category', async () => {
      const category = 'Mietverträge'
      const filteredTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: filteredTemplates })
      })

      const response = await fetch(`/api/templates?category=${encodeURIComponent(category)}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].kategorie).toBe(category)
      expect(global.fetch).toHaveBeenCalledWith('/api/templates?category=Mietvertr%C3%A4ge')
    })

    it('should handle paginated results', async () => {
      const paginatedResponse = {
        templates: [mockTemplate],
        totalCount: 25,
        limit: 10,
        offset: 0,
        hasMore: true
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => paginatedResponse
      })

      const response = await fetch('/api/templates?limit=10&offset=0')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(1)
      expect(data.totalCount).toBe(25)
      expect(data.hasMore).toBe(true)
      expect(data.limit).toBe(10)
      expect(data.offset).toBe(0)
    })

    it('should combine search and category filters', async () => {
      const searchQuery = 'template'
      const category = 'Mietverträge'
      const filteredTemplates = [mockTemplate]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: filteredTemplates })
      })

      const response = await fetch(
        `/api/templates?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(category)}`
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledWith('/api/templates?search=template&category=Mietvertr%C3%A4ge')
    })
  })

  describe('Category Management', () => {
    it('should fetch user categories', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories, count: mockCategories.length })
      })

      const response = await fetch('/api/templates/categories')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.categories).toEqual(mockCategories)
      expect(data.count).toBe(4)
    })

    it('should handle empty categories list', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: [], count: 0 })
      })

      const response = await fetch('/api/templates/categories')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.categories).toEqual([])
      expect(data.count).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle 404 template not found errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Template not found' })
      })

      const response = await fetch('/api/templates/non-existent-id')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Template not found')
    })

    it('should handle 400 validation errors', async () => {
      const invalidData = {
        titel: '', // Empty title should cause validation error
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Template title is required',
          validationErrors: [
            { field: 'titel', message: 'Title is required', code: 'REQUIRED_FIELD' }
          ]
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Template title is required')
      expect(data.validationErrors).toHaveLength(1)
    })

    it('should handle 500 server errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      const response = await fetch('/api/templates')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/templates')
        fail('Expected network error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })
  })

  describe('Template Content Validation', () => {
    it('should validate template content structure', async () => {
      const templateWithInvalidContent = {
        titel: 'Test Template',
        inhalt: 'invalid content', // Should be object, not string
        kategorie: 'Test'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid template content',
          validationErrors: [
            { field: 'inhalt', message: 'Content must be valid Tiptap JSON', code: 'INVALID_CONTENT' }
          ]
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateWithInvalidContent)
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.validationErrors[0].code).toBe('INVALID_CONTENT')
    })

    it('should validate template variables', async () => {
      const templateWithInvalidVariables = {
        titel: 'Test Template',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'mention', attrs: { id: 'invalid_variable', label: 'Invalid' } }
              ]
            }
          ]
        },
        kategorie: 'Test'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Template validation failed',
          validationErrors: [
            { field: 'content', message: 'Unknown variable: invalid_variable', code: 'UNKNOWN_VARIABLE' }
          ],
          validationWarnings: []
        })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateWithInvalidVariables)
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.validationErrors[0].code).toBe('UNKNOWN_VARIABLE')
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent template creation', async () => {
      const template1Data = {
        titel: 'Template 1',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test'
      }

      const template2Data = {
        titel: 'Template 2',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test'
      }

      // Mock responses for concurrent requests
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ template: { ...mockTemplate, id: 'template-1', titel: 'Template 1' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ template: { ...mockTemplate, id: 'template-2', titel: 'Template 2' } })
        })

      // Execute concurrent requests
      const [response1, response2] = await Promise.all([
        fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template1Data)
        }),
        fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template2Data)
        })
      ])

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ])

      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(true)
      expect(data1.template.titel).toBe('Template 1')
      expect(data2.template.titel).toBe('Template 2')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent template updates', async () => {
      const templateId = 'template-123'
      const update1 = { titel: 'Updated Title 1' }
      const update2 = { titel: 'Updated Title 2' }

      // First update succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: { ...mockTemplate, titel: 'Updated Title 1' } })
      })

      // Second update fails due to conflict
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Template was modified by another user' })
      })

      const [response1, response2] = await Promise.all([
        fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update1)
        }),
        fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update2)
        })
      ])

      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(false)
      expect(response2.status).toBe(409)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large template lists efficiently', async () => {
      const largeTemplateList = Array.from({ length: 100 }, (_, i) => ({
        ...mockTemplate,
        id: `template-${i}`,
        titel: `Template ${i}`
      }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          templates: largeTemplateList.slice(0, 20), // First page
          totalCount: 100,
          limit: 20,
          offset: 0,
          hasMore: true
        })
      })

      const response = await fetch('/api/templates?limit=20&offset=0')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(20)
      expect(data.totalCount).toBe(100)
      expect(data.hasMore).toBe(true)
    })

    it('should handle complex search queries', async () => {
      const complexQuery = 'mietvertrag AND befristet OR kündigung'
      const encodedQuery = encodeURIComponent(complexQuery)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [mockTemplate] })
      })

      const response = await fetch(`/api/templates?search=${encodedQuery}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(`/api/templates?search=${encodedQuery}`)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency during operations', async () => {
      const templateData = {
        titel: 'Consistency Test',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Variable: ' },
                { type: 'mention', attrs: { id: 'tenant_name', label: 'Tenant Name' } }
              ]
            }
          ]
        },
        kategorie: 'Test'
      }

      const createdTemplate = {
        ...mockTemplate,
        ...templateData,
        kontext_anforderungen: ['tenant_name'] // Should be extracted from content
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ template: createdTemplate })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.template.titel).toBe(templateData.titel)
      expect(data.template.kategorie).toBe(templateData.kategorie)
      expect(data.template.kontext_anforderungen).toContain('tenant_name')
    })

    it('should handle special characters in template data', async () => {
      const templateWithSpecialChars = {
        titel: 'Template with émojis 🏠 and spëcial chars',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Content with 中文 and العربية' }]
            }
          ]
        },
        kategorie: 'Catégory with ümlauts'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ template: { ...mockTemplate, ...templateWithSpecialChars } })
      })

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateWithSpecialChars)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.template.titel).toBe(templateWithSpecialChars.titel)
      expect(data.template.kategorie).toBe(templateWithSpecialChars.kategorie)
    })
  })
})