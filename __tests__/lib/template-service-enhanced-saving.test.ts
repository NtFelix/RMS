/**
 * Tests for enhanced template service saving logic
 * Covers task 2.1: Enhance template service saving logic
 */

import { templateService } from '@/lib/template-service'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { CreateTemplateRequest, UpdateTemplateRequest, Template } from '@/types/template'

// Mock Supabase client
jest.mock('@/lib/supabase-server')
const mockSupabase = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>

// Mock template cache service
jest.mock('@/lib/template-cache', () => ({
  templateCacheService: {
    invalidateTemplateCache: jest.fn(),
    invalidateUserCaches: jest.fn(),
    invalidateCategoryCache: jest.fn(),
    getTemplate: jest.fn().mockReturnValue(null),
    setTemplate: jest.fn(),
    getUserTemplates: jest.fn().mockReturnValue(null),
    setUserTemplates: jest.fn(),
    getCategoryTemplates: jest.fn().mockReturnValue(null),
    setCategoryTemplates: jest.fn(),
    getUserCategories: jest.fn().mockReturnValue(null),
    setUserCategories: jest.fn(),
    getTemplateCount: jest.fn().mockReturnValue(null),
    setTemplateCount: jest.fn(),
    deleteTemplate: jest.fn()
  }
}))

// Mock template validation service
jest.mock('@/lib/template-validation-service', () => ({
  templateValidationService: {
    validateUpdateTemplate: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    validateCreateTemplate: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  }
}))

// Mock template error handler and reporter
jest.mock('@/lib/template-error-handler', () => ({
  TemplateErrorHandler: {
    createError: jest.fn((type, message, details, context) => new Error(message)),
    fromException: jest.fn((error, context) => error)
  },
  TemplateErrorType: {
    TEMPLATE_SAVE_FAILED: 'TEMPLATE_SAVE_FAILED',
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INVALID_TEMPLATE_DATA: 'INVALID_TEMPLATE_DATA'
  }
}))

jest.mock('@/lib/template-error-logger', () => ({
  TemplateErrorReporter: {
    reportError: jest.fn()
  }
}))

describe('Enhanced Template Service Saving Logic', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }
    
    mockSupabase.mockReturnValue(mockSupabaseClient)
  })

  describe('Template Creation with Enhanced Saving', () => {
    const mockCreateRequest: CreateTemplateRequest = {
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
      user_id: 'test-user-id'
    }

    it('should create template with proper content serialization', async () => {
      const mockCreatedTemplate: Template = {
        id: 'test-template-id',
        titel: 'Test Template',
        inhalt: mockCreateRequest.inhalt,
        kategorie: 'Test Category',
        user_id: 'test-user-id',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: ['tenant_name'],
        aktualisiert_am: null
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockCreatedTemplate,
        error: null
      })

      const result = await templateService.createTemplate(mockCreateRequest)

      expect(result).toEqual(mockCreatedTemplate)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: 'Test Template',
          inhalt: expect.objectContaining({
            type: 'doc',
            content: expect.any(Array)
          }),
          kategorie: 'Test Category',
          user_id: 'test-user-id',
          kontext_anforderungen: ['tenant_name']
        })
      )
    })

    it('should extract variables correctly from TipTap content', async () => {
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Dear ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ', your rent for ' },
              {
                type: 'mention',
                attrs: { id: 'property_address', label: 'Immobilien Adresse' }
              },
              { type: 'text', text: ' is due.' }
            ]
          }
        ]
      }

      const mockCreatedTemplate: Template = {
        id: 'test-template-id',
        titel: 'Complex Template',
        inhalt: complexContent,
        kategorie: 'Test Category',
        user_id: 'test-user-id',
        erstellungsdatum: '2024-01-01T00:00:00Z',
        kontext_anforderungen: ['property_address', 'tenant_name'],
        aktualisiert_am: null
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockCreatedTemplate,
        error: null
      })

      const createRequest: CreateTemplateRequest = {
        ...mockCreateRequest,
        inhalt: complexContent
      }

      const result = await templateService.createTemplate(createRequest)

      expect(result.kontext_anforderungen).toEqual(['property_address', 'tenant_name'])
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          kontext_anforderungen: ['property_address', 'tenant_name']
        })
      )
    })

    it('should retry on transient failures', async () => {
      // First two attempts fail, third succeeds
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Connection timeout' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Temporary unavailable' } })
        .mockResolvedValueOnce({
          data: {
            id: 'test-template-id',
            titel: 'Test Template',
            inhalt: mockCreateRequest.inhalt,
            kategorie: 'Test Category',
            user_id: 'test-user-id',
            erstellungsdatum: '2024-01-01T00:00:00Z',
            kontext_anforderungen: ['tenant_name'],
            aktualisiert_am: null
          },
          error: null
        })

      const result = await templateService.createTemplate(mockCreateRequest)

      expect(result).toBeDefined()
      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(3)
    })

    it('should not retry on validation errors', async () => {
      const { templateValidationService } = require('@/lib/template-validation-service')
      templateValidationService.validateCreateTemplate.mockResolvedValue({
        isValid: false,
        errors: [{ field: 'titel', message: 'Title is required', code: 'TITLE_REQUIRED' }],
        warnings: []
      })

      await expect(templateService.createTemplate(mockCreateRequest)).rejects.toThrow()
      
      // Should not call insert if validation fails
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled()
    })
  })

  describe('Template Update with Enhanced Saving', () => {
    const mockExistingTemplate: Template = {
      id: 'test-template-id',
      titel: 'Original Title',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Original content' }]
          }
        ]
      },
      kategorie: 'Original Category',
      user_id: 'test-user-id',
      erstellungsdatum: '2024-01-01T00:00:00Z',
      kontext_anforderungen: [],
      aktualisiert_am: null
    }

    beforeEach(() => {
      // Mock getTemplate to return existing template
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null })
    })

    it('should update template with proper timestamp and variable extraction', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Title',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Updated content with ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Mieter Name' }
                }
              ]
            }
          ]
        },
        kategorie: 'Updated Category'
      }

      const mockUpdatedTemplate: Template = {
        ...mockExistingTemplate,
        titel: 'Updated Title',
        inhalt: updateRequest.inhalt!,
        kategorie: 'Updated Category',
        kontext_anforderungen: ['tenant_name'],
        aktualisiert_am: '2024-01-01T12:00:00Z'
      }

      // Mock getUserTemplateTitles and getUserCategories
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate
        .mockResolvedValueOnce({ data: mockUpdatedTemplate, error: null }) // update

      // Mock the additional queries for validation context
      mockSupabaseClient.select
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            data: [{ titel: 'Other Template' }],
            error: null
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              data: [{ kategorie: 'Category 1' }, { kategorie: 'Category 2' }],
              error: null
            })
          })
        })

      const result = await templateService.updateTemplate('test-template-id', updateRequest)

      expect(result).toEqual(mockUpdatedTemplate)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: 'Updated Title',
          inhalt: expect.objectContaining({
            type: 'doc',
            content: expect.any(Array)
          }),
          kategorie: 'Updated Category',
          kontext_anforderungen: ['tenant_name'],
          aktualisiert_am: expect.any(String)
        })
      )
    })

    it('should properly serialize TipTap content to JSONB', async () => {
      const updateRequest: UpdateTemplateRequest = {
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Heading' }]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Paragraph with ' },
                { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
                { type: 'text', text: ' text' }
              ]
            }
          ]
        }
      }

      const mockUpdatedTemplate: Template = {
        ...mockExistingTemplate,
        inhalt: updateRequest.inhalt!,
        aktualisiert_am: '2024-01-01T12:00:00Z'
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate
        .mockResolvedValueOnce({ data: mockUpdatedTemplate, error: null }) // update

      // Mock validation context queries
      mockSupabaseClient.select
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })

      const result = await templateService.updateTemplate('test-template-id', updateRequest)

      expect(result.inhalt).toEqual(updateRequest.inhalt)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          inhalt: expect.objectContaining({
            type: 'doc',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'heading' }),
              expect.objectContaining({ type: 'paragraph' })
            ])
          }),
          aktualisiert_am: expect.any(String)
        })
      )
    })

    it('should handle partial updates correctly', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Only Title Updated'
      }

      const mockUpdatedTemplate: Template = {
        ...mockExistingTemplate,
        titel: 'Only Title Updated',
        aktualisiert_am: '2024-01-01T12:00:00Z'
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate
        .mockResolvedValueOnce({ data: mockUpdatedTemplate, error: null }) // update

      // Mock validation context queries
      mockSupabaseClient.select
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })

      const result = await templateService.updateTemplate('test-template-id', updateRequest)

      expect(result.titel).toBe('Only Title Updated')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: 'Only Title Updated',
          aktualisiert_am: expect.any(String)
        })
      )
      
      // Should not update content or variables if not provided
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          inhalt: expect.anything(),
          kontext_anforderungen: expect.anything()
        })
      )
    })

    it('should retry on transient update failures', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Title'
      }

      // First attempt fails, second succeeds
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate
        .mockResolvedValueOnce({ data: null, error: { message: 'Connection timeout' } }) // first update attempt
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate for retry
        .mockResolvedValueOnce({ 
          data: { ...mockExistingTemplate, titel: 'Updated Title', aktualisiert_am: '2024-01-01T12:00:00Z' }, 
          error: null 
        }) // successful update

      // Mock validation context queries for both attempts
      mockSupabaseClient.select
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
        .mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })

      const result = await templateService.updateTemplate('test-template-id', updateRequest)

      expect(result.titel).toBe('Updated Title')
      expect(mockSupabaseClient.update).toHaveBeenCalledTimes(2)
    })

    it('should validate data integrity before saving', async () => {
      const invalidUpdateRequest: UpdateTemplateRequest = {
        titel: '', // Empty title should fail validation
        inhalt: null as any // Invalid content type
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockExistingTemplate, error: null }) // getTemplate

      // Mock validation context queries
      mockSupabaseClient.select
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })

      await expect(templateService.updateTemplate('test-template-id', invalidUpdateRequest))
        .rejects.toThrow()

      // Should not call update if validation fails
      expect(mockSupabaseClient.update).not.toHaveBeenCalled()
    })
  })

  describe('Variable Extraction Enhancement', () => {
    it('should extract variables from complex nested content', () => {
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Simple mention: ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Text with mention mark',
                marks: [
                  {
                    type: 'mention',
                    attrs: { id: 'property_address', label: 'Property Address' }
                  }
                ]
              }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'List item with ' },
                      {
                        type: 'mention',
                        attrs: { id: 'rent_amount', label: 'Rent Amount' }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(complexContent)

      expect(variables).toEqual(['property_address', 'rent_amount', 'tenant_name'])
    })

    it('should handle malformed content gracefully', () => {
      const malformedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Valid text' },
              {
                type: 'mention',
                attrs: { id: null, label: 'Invalid mention' } // null id
              },
              {
                type: 'mention',
                attrs: { label: 'Missing id mention' } // missing id
              },
              {
                type: 'mention',
                attrs: { id: 'valid_variable', label: 'Valid mention' }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(malformedContent)

      // Should only extract valid variables
      expect(variables).toEqual(['valid_variable'])
    })

    it('should deduplicate variables', () => {
      const contentWithDuplicates = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'First mention: ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Second mention: ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(contentWithDuplicates)

      expect(variables).toEqual(['tenant_name'])
    })
  })
})