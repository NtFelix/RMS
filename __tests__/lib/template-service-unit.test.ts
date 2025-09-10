/**
 * Unit tests for TemplateService
 * Tests core template CRUD operations, variable extraction, and validation
 */

import { TemplateService } from '../../lib/template-service'
import { templateCacheService } from '../../lib/template-cache'
import { TemplateErrorHandler, TemplateErrorType } from '../../lib/template-error-handler'
import type { Template, CreateTemplateRequest, UpdateTemplateRequest } from '../../types/template'

// Mock dependencies
jest.mock('../../lib/supabase-server')
jest.mock('../../lib/template-cache')
jest.mock('../../lib/template-error-handler')
jest.mock('../../lib/template-error-logger')

// Mock template validation service
jest.mock('../../lib/template-validation-service', () => ({
  templateValidationService: {
    validateUpdateTemplate: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  }
}))

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          single: jest.fn()
        })),
        not: jest.fn(() => ({}))
      })),
      not: jest.fn(() => ({}))
    }))
  }))
}

// Mock the createSupabaseServerClient function
jest.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient)
}))

describe('TemplateService Unit Tests', () => {
  let templateService: TemplateService
  let mockCacheService: jest.Mocked<typeof templateCacheService>

  beforeEach(() => {
    templateService = new TemplateService()
    mockCacheService = templateCacheService as jest.Mocked<typeof templateCacheService>
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockCacheService.getTemplate.mockReturnValue(null)
    mockCacheService.getUserTemplates.mockReturnValue(null)
    mockCacheService.getCategoryTemplates.mockReturnValue(null)
    mockCacheService.getUserCategories.mockReturnValue(null)
    mockCacheService.getTemplateCount.mockReturnValue(null)
  })

  describe('createTemplate', () => {
    const validCreateRequest: CreateTemplateRequest = {
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
      kategorie: 'Test Category',
      user_id: 'user-123'
    }

    it('should create template successfully', async () => {
      const mockTemplate: Template = {
        id: 'template-123',
        titel: validCreateRequest.titel,
        inhalt: validCreateRequest.inhalt,
        kategorie: validCreateRequest.kategorie,
        user_id: validCreateRequest.user_id,
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: ['tenant_name'],
        aktualisiert_am: null
      }

      // Mock successful database response
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await templateService.createTemplate(validCreateRequest)

      expect(result).toEqual(mockTemplate)
      expect(mockInsert).toHaveBeenCalledWith({
        titel: validCreateRequest.titel,
        inhalt: validCreateRequest.inhalt,
        kategorie: validCreateRequest.kategorie,
        user_id: validCreateRequest.user_id,
        kontext_anforderungen: ['tenant_name']
      })
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(validCreateRequest.user_id)
    })

    it('should throw error for missing title', async () => {
      const invalidRequest = { ...validCreateRequest, titel: '' }

      await expect(templateService.createTemplate(invalidRequest))
        .rejects.toThrow('Template title is required')
    })

    it('should throw error for missing category', async () => {
      const invalidRequest = { ...validCreateRequest, kategorie: '' }

      await expect(templateService.createTemplate(invalidRequest))
        .rejects.toThrow('Template category is required')
    })

    it('should throw error for missing user_id', async () => {
      const invalidRequest = { ...validCreateRequest, user_id: '' }

      await expect(templateService.createTemplate(invalidRequest))
        .rejects.toThrow('User ID is required')
    })

    it('should handle database errors', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      await expect(templateService.createTemplate(validCreateRequest))
        .rejects.toThrow('Failed to create template: Database error')
    })

    it('should extract variables from content', async () => {
      const contentWithVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              }
            ]
          }
        ]
      }

      const requestWithVariables = {
        ...validCreateRequest,
        inhalt: contentWithVariables
      }

      const mockTemplate: Template = {
        id: 'template-123',
        titel: requestWithVariables.titel,
        inhalt: requestWithVariables.inhalt,
        kategorie: requestWithVariables.kategorie,
        user_id: requestWithVariables.user_id,
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: ['landlord_name', 'tenant_name'],
        aktualisiert_am: null
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      await templateService.createTemplate(requestWithVariables)

      expect(mockInsert).toHaveBeenCalledWith({
        titel: requestWithVariables.titel,
        inhalt: requestWithVariables.inhalt,
        kategorie: requestWithVariables.kategorie,
        user_id: requestWithVariables.user_id,
        kontext_anforderungen: ['landlord_name', 'tenant_name']
      })
    })
  })

  describe('updateTemplate', () => {
    const mockExistingTemplate: Template = {
      id: 'template-123',
      titel: 'Existing Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Existing Category',
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      kontext_anforderungen: [],
      aktualisiert_am: null
    }

    beforeEach(() => {
      // Mock getTemplate to return existing template
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(mockExistingTemplate)
      jest.spyOn(templateService, 'getUserTemplateTitles').mockResolvedValue(['Other Template'])
      jest.spyOn(templateService, 'getUserCategories').mockResolvedValue(['Category 1', 'Category 2'])
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should update template successfully', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Template',
        kategorie: 'Updated Category'
      }

      const updatedTemplate: Template = {
        ...mockExistingTemplate,
        titel: updateRequest.titel!,
        kategorie: updateRequest.kategorie!,
        aktualisiert_am: '2024-01-02T00:00:00Z'
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedTemplate,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      } as any)

      const result = await templateService.updateTemplate('template-123', updateRequest)

      expect(result).toEqual(updatedTemplate)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: updateRequest.titel,
          kategorie: updateRequest.kategorie,
          aktualisiert_am: expect.any(String)
        })
      )
    })

    it('should update content and extract variables', async () => {
      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'property_name', label: 'Objektname' }
              }
            ]
          }
        ]
      }

      const updateRequest: UpdateTemplateRequest = {
        inhalt: newContent
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockExistingTemplate, inhalt: newContent },
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      } as any)

      await templateService.updateTemplate('template-123', updateRequest)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          inhalt: newContent,
          kontext_anforderungen: ['property_name']
        })
      )
    })

    it('should handle template not found', async () => {
      jest.spyOn(templateService, 'getTemplate').mockRejectedValue(
        new Error('Template not found')
      )

      await expect(templateService.updateTemplate('nonexistent', { titel: 'New Title' }))
        .rejects.toThrow('Template not found')
    })

    it('should invalidate caches after update', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Template'
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockExistingTemplate, titel: updateRequest.titel },
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      } as any)

      await templateService.updateTemplate('template-123', updateRequest)

      expect(mockCacheService.invalidateTemplateCache).toHaveBeenCalledWith('template-123')
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(mockExistingTemplate.user_id)
    })
  })

  describe('deleteTemplate', () => {
    const mockTemplate: Template = {
      id: 'template-123',
      titel: 'Test Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Test Category',
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      kontext_anforderungen: [],
      aktualisiert_am: null
    }

    beforeEach(() => {
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(mockTemplate)
    })

    it('should delete template successfully', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      mockSupabaseClient.from.mockReturnValue({
        delete: mockDelete
      } as any)

      await templateService.deleteTemplate('template-123')

      expect(mockDelete).toHaveBeenCalled()
      expect(mockCacheService.deleteTemplate).toHaveBeenCalledWith('template-123')
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(mockTemplate.user_id)
    })

    it('should handle database errors', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      })
      mockSupabaseClient.from.mockReturnValue({
        delete: mockDelete
      } as any)

      await expect(templateService.deleteTemplate('template-123'))
        .rejects.toThrow()
    })

    it('should invalidate category cache when template has category', async () => {
      const templateWithCategory = { ...mockTemplate, kategorie: 'Test Category' }
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(templateWithCategory)

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      mockSupabaseClient.from.mockReturnValue({
        delete: mockDelete
      } as any)

      await templateService.deleteTemplate('template-123')

      expect(mockCacheService.invalidateCategoryCache).toHaveBeenCalledWith(
        templateWithCategory.user_id,
        templateWithCategory.kategorie
      )
    })
  })

  describe('getTemplate', () => {
    const mockTemplate: Template = {
      id: 'template-123',
      titel: 'Test Template',
      inhalt: { type: 'doc', content: [] },
      kategorie: 'Test Category',
      user_id: 'user-123',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      kontext_anforderungen: [],
      aktualisiert_am: null
    }

    it('should return cached template if available', async () => {
      mockCacheService.getTemplate.mockReturnValue(mockTemplate)

      const result = await templateService.getTemplate('template-123')

      expect(result).toEqual(mockTemplate)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch from database and cache result', async () => {
      mockCacheService.getTemplate.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getTemplate('template-123')

      expect(result).toEqual(mockTemplate)
      expect(mockCacheService.setTemplate).toHaveBeenCalledWith(mockTemplate)
    })

    it('should handle template not found', async () => {
      mockCacheService.getTemplate.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      await expect(templateService.getTemplate('nonexistent'))
        .rejects.toThrow()
    })
  })

  describe('getUserTemplates', () => {
    const mockTemplates: Template[] = [
      {
        id: 'template-1',
        titel: 'Template 1',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Category 1',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      },
      {
        id: 'template-2',
        titel: 'Template 2',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Category 2',
        user_id: 'user-123',
        erstellungsdatum: '2024-01-02T00:00:00Z',
        kontext_anforderungen: [],
        aktualisiert_am: null
      }
    ]

    it('should return cached templates if available', async () => {
      mockCacheService.getUserTemplates.mockReturnValue(mockTemplates)

      const result = await templateService.getUserTemplates('user-123')

      expect(result).toEqual(mockTemplates)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch from database and cache result', async () => {
      mockCacheService.getUserTemplates.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockTemplates,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getUserTemplates('user-123')

      expect(result).toEqual(mockTemplates)
      expect(mockCacheService.setUserTemplates).toHaveBeenCalledWith('user-123', mockTemplates)
    })

    it('should handle database errors gracefully', async () => {
      mockCacheService.getUserTemplates.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getUserTemplates('user-123')

      expect(result).toEqual([])
    })
  })

  describe('extractVariablesFromContent', () => {
    it('should extract variables from simple mention nodes', () => {
      const content = {
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
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should extract multiple variables and sort them', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'apartment_address', label: 'Wohnungsadresse' }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['apartment_address', 'landlord_name', 'tenant_name'])
    })

    it('should deduplicate variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should handle variables in text node marks', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'tenant_name',
                marks: [
                  {
                    type: 'mention',
                    attrs: { id: 'tenant_name', label: 'Mieter Name' }
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should handle nested content structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'mention',
                            attrs: { id: 'apartment_rent', label: 'Kaltmiete' }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['apartment_rent'])
    })

    it('should handle empty or invalid content gracefully', () => {
      expect(templateService.extractVariablesFromContent({})).toEqual([])
      expect(templateService.extractVariablesFromContent({ type: 'doc', content: [] })).toEqual([])
      expect(templateService.extractVariablesFromContent(null as any)).toEqual([])
      expect(templateService.extractVariablesFromContent(undefined as any)).toEqual([])
    })

    it('should handle array content format', () => {
      const content = [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: { id: 'property_address', label: 'Objektadresse' }
            }
          ]
        }
      ]

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['property_address'])
    })
  })

  describe('validateTemplateVariables', () => {
    it('should validate content with valid variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid document structure', () => {
      const content = {
        type: 'doc'
        // Missing content array
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_DOCUMENT_STRUCTURE')).toBe(true)
    })

    it('should detect invalid mention nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {} // Missing id
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_MENTION_NODE')).toBe(true)
    })

    it('should warn about empty content', () => {
      const result = templateService.validateTemplateVariables({})
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'EMPTY_CONTENT')).toBe(true)
    })

    it('should warn about content without variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is just plain text' }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'NO_VARIABLES')).toBe(true)
    })
  })

  describe('getUserCategories', () => {
    it('should return cached categories if available', async () => {
      const mockCategories = ['Category 1', 'Category 2']
      mockCacheService.getUserCategories.mockReturnValue(mockCategories)

      const result = await templateService.getUserCategories('user-123')

      expect(result).toEqual(mockCategories)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch categories and include defaults', async () => {
      mockCacheService.getUserCategories.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [{ kategorie: 'Custom Category' }],
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getUserCategories('user-123')

      expect(result).toContain('Custom Category')
      expect(result).toContain('Mietverträge')
      expect(result).toContain('Kündigungen')
      expect(result).toContain('Nebenkostenabrechnungen')
      expect(result).toContain('Mängelanzeigen')
      expect(result).toContain('Schriftverkehr')
      expect(result).toContain('Sonstiges')
    })

    it('should handle database errors', async () => {
      mockCacheService.getUserCategories.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      await expect(templateService.getUserCategories('user-123'))
        .rejects.toThrow('Failed to get user categories: Database error')
    })
  })

  describe('getAvailableVariables', () => {
    it('should return predefined variables', () => {
      const variables = templateService.getAvailableVariables()
      
      expect(variables.length).toBeGreaterThan(0)
      expect(variables.every(v => v.id && v.label && v.category)).toBe(true)
    })

    it('should include variables from all expected categories', () => {
      const variables = templateService.getAvailableVariables()
      const categories = [...new Set(variables.map(v => v.category))]
      
      expect(categories).toContain('Mieter')
      expect(categories).toContain('Vermieter')
      expect(categories).toContain('Immobilie')
      expect(categories).toContain('Wohnung')
      expect(categories).toContain('Finanzen')
      expect(categories).toContain('Datum')
    })
  })

  describe('searchVariables', () => {
    it('should find variables by query', () => {
      const results = templateService.searchVariables('Mieter')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(v => v.label.toLowerCase().includes('mieter'))).toBe(true)
    })

    it('should return empty array for no matches', () => {
      const results = templateService.searchVariables('nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('getVariableById', () => {
    it('should return variable by ID', () => {
      const variable = templateService.getVariableById('tenant_name')
      expect(variable).toBeDefined()
      expect(variable?.id).toBe('tenant_name')
    })

    it('should return undefined for unknown ID', () => {
      const variable = templateService.getVariableById('unknown_id')
      expect(variable).toBeUndefined()
    })
  })
})