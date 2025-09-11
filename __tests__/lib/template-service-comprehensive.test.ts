/**
 * Comprehensive Unit Tests for Template Service
 * 
 * Tests all aspects of the TemplateService including:
 * - CRUD operations with error handling and retry logic
 * - Variable extraction and validation
 * - Cache management and invalidation
 * - Data integrity validation
 * - Error recovery mechanisms
 * - Performance optimizations
 */

import { TemplateService } from '../../lib/template-service'
import { templateCacheService } from '../../lib/template-cache'
import { templateValidationService } from '../../lib/template-validation-service'
import { TemplateErrorHandler, TemplateErrorType } from '../../lib/template-error-handler'
import { TemplateErrorReporter } from '../../lib/template-error-logger'
import type { 
  Template, 
  CreateTemplateRequest, 
  UpdateTemplateRequest,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../../types/template'

// Mock dependencies
jest.mock('../../lib/supabase-server')
jest.mock('../../lib/template-cache')
jest.mock('../../lib/template-validation-service')
jest.mock('../../lib/template-error-handler')
jest.mock('../../lib/template-error-logger')
jest.mock('../../lib/template-content-parser')

// Mock Supabase client with comprehensive methods
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

jest.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient)
}))

describe('TemplateService Comprehensive Tests', () => {
  let templateService: TemplateService
  let mockCacheService: jest.Mocked<typeof templateCacheService>
  let mockValidationService: jest.Mocked<typeof templateValidationService>
  let mockErrorHandler: jest.Mocked<typeof TemplateErrorHandler>
  let mockErrorReporter: jest.Mocked<typeof TemplateErrorReporter>

  const validTemplate: Template = {
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
    kategorie: 'Test Category',
    user_id: 'user-123',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    kontext_anforderungen: ['tenant_name'],
    aktualisiert_am: null
  }

  beforeEach(() => {
    templateService = new TemplateService()
    mockCacheService = templateCacheService as jest.Mocked<typeof templateCacheService>
    mockValidationService = templateValidationService as jest.Mocked<typeof templateValidationService>
    mockErrorHandler = TemplateErrorHandler as jest.Mocked<typeof TemplateErrorHandler>
    mockErrorReporter = TemplateErrorReporter as jest.Mocked<typeof TemplateErrorReporter>
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockCacheService.getTemplate.mockReturnValue(null)
    mockCacheService.getUserTemplates.mockReturnValue(null)
    mockCacheService.getCategoryTemplates.mockReturnValue(null)
    mockCacheService.getUserCategories.mockReturnValue(null)
    mockCacheService.getTemplateCount.mockReturnValue(null)
    
    mockValidationService.validateUpdateTemplate.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })

    mockErrorHandler.createError.mockImplementation((type, message, error, context) => {
      const err = new Error(message)
      err.name = type
      return err as any
    })

    mockErrorHandler.fromException.mockImplementation((error, context) => {
      return error as any
    })
  })

  describe('createTemplate - Basic Operations', () => {
    const validCreateRequest: CreateTemplateRequest = {
      titel: 'New Template',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Template content with ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      },
      kategorie: 'New Category',
      user_id: 'user-123'
    }

    it('should create template successfully with proper data preparation', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: validTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await templateService.createTemplate(validCreateRequest)

      expect(result).toEqual(validTemplate)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: validCreateRequest.titel,
          inhalt: validCreateRequest.inhalt,
          kategorie: validCreateRequest.kategorie,
          user_id: validCreateRequest.user_id,
          kontext_anforderungen: ['tenant_name']
        })
      )
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(validCreateRequest.user_id)
    })

    it('should validate data integrity before creation', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        titel: '', // Invalid empty title
        kategorie: 'A'.repeat(200) // Too long category
      }

      await expect(templateService.createTemplate(invalidRequest))
        .rejects.toThrow('Template title is required')
    })

    it('should extract variables from complex content structures', async () => {
      const complexContent = {
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
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' lives at ' },
              {
                type: 'mention',
                attrs: { id: 'property_address', label: 'Objektadresse' }
              }
            ]
          }
        ]
      }

      const requestWithComplexContent = {
        ...validCreateRequest,
        inhalt: complexContent
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...validTemplate, inhalt: complexContent },
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      await templateService.createTemplate(requestWithComplexContent)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          kontext_anforderungen: expect.arrayContaining([
            'apartment_rent',
            'property_address', 
            'tenant_name'
          ])
        })
      )
    })

    it('should handle creation with retry logic on transient failures', async () => {
      let attemptCount = 0
      const mockInsert = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockImplementation(() => {
            attemptCount++
            if (attemptCount < 3) {
              return Promise.resolve({
                data: null,
                error: { message: 'Temporary network error' }
              })
            }
            return Promise.resolve({
              data: validTemplate,
              error: null
            })
          })
        })
      }))
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await templateService.createTemplate(validCreateRequest)

      expect(result).toEqual(validTemplate)
      expect(attemptCount).toBe(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'PERMISSION_DENIED: Access denied' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      await expect(templateService.createTemplate(validCreateRequest))
        .rejects.toThrow('PERMISSION_DENIED')

      // Should only attempt once for permission errors
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should verify template creation integrity', async () => {
      const templateWithMismatch = {
        ...validTemplate,
        titel: 'Different Title' // Mismatch from request
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: templateWithMismatch,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      // Should still succeed but log warnings
      const result = await templateService.createTemplate(validCreateRequest)
      expect(result).toEqual(templateWithMismatch)
    })
  })

  describe('updateTemplate - Enhanced Operations', () => {
    beforeEach(() => {
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(validTemplate)
      jest.spyOn(templateService, 'getUserTemplateTitles').mockResolvedValue(['Other Template'])
      jest.spyOn(templateService, 'getUserCategories').mockResolvedValue(['Category 1', 'Category 2'])
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should update template with enhanced validation', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Template',
        kategorie: 'Updated Category'
      }

      const updatedTemplate = {
        ...validTemplate,
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
      expect(mockValidationService.validateUpdateTemplate).toHaveBeenCalledWith(
        updateRequest,
        expect.objectContaining({
          userId: validTemplate.user_id,
          existingTitles: ['Other Template'],
          existingCategories: ['Category 1', 'Category 2'],
          isUpdate: true,
          templateId: 'template-123'
        })
      )
    })

    it('should handle validation failures during update', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Invalid Title'
      }

      mockValidationService.validateUpdateTemplate.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'titel',
            message: 'Title already exists',
            code: 'TITLE_DUPLICATE'
          }
        ],
        warnings: []
      })

      await expect(templateService.updateTemplate('template-123', updateRequest))
        .rejects.toThrow()

      expect(mockErrorHandler.createError).toHaveBeenCalledWith(
        TemplateErrorType.INVALID_TEMPLATE_DATA,
        'Template validation failed',
        expect.any(Array),
        expect.objectContaining({
          templateId: 'template-123',
          operation: 'update'
        })
      )
    })

    it('should update content and re-extract variables', async () => {
      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              },
              { type: 'text', text: ' owns ' },
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
              data: { ...validTemplate, inhalt: newContent },
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
          kontext_anforderungen: expect.arrayContaining([
            'landlord_name',
            'property_name'
          ]),
          aktualisiert_am: expect.any(String)
        })
      )
    })

    it('should handle update retry logic with exponential backoff', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Title'
      }

      let attemptCount = 0
      const mockUpdate = jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => {
              attemptCount++
              if (attemptCount < 3) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Connection timeout' }
                })
              }
              return Promise.resolve({
                data: { ...validTemplate, titel: updateRequest.titel },
                error: null
              })
            })
          })
        })
      }))
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      } as any)

      const startTime = Date.now()
      const result = await templateService.updateTemplate('template-123', updateRequest)
      const endTime = Date.now()

      expect(result.titel).toBe(updateRequest.titel)
      expect(attemptCount).toBe(3)
      // Should have some delay due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000)
    })

    it('should invalidate appropriate caches after update', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Title',
        kategorie: 'New Category' // Different from original
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...validTemplate, ...updateRequest },
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
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(validTemplate.user_id)
      expect(mockCacheService.invalidateCategoryCache).toHaveBeenCalledWith(
        validTemplate.user_id,
        validTemplate.kategorie
      )
    })

    it('should verify update integrity', async () => {
      const updateRequest: UpdateTemplateRequest = {
        titel: 'Updated Title'
      }

      const updatedTemplateWithIssues = {
        ...validTemplate,
        titel: 'Different Title', // Doesn't match request
        kontext_anforderungen: [] // Variables lost
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedTemplateWithIssues,
              error: null
            })
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      } as any)

      // Should still succeed but log warnings about integrity issues
      const result = await templateService.updateTemplate('template-123', updateRequest)
      expect(result).toEqual(updatedTemplateWithIssues)
    })
  })

  describe('deleteTemplate - Enhanced Operations', () => {
    beforeEach(() => {
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(validTemplate)
    })

    it('should delete template and invalidate all related caches', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
      mockSupabaseClient.from.mockReturnValue({
        delete: mockDelete
      } as any)

      await templateService.deleteTemplate('template-123')

      expect(mockDelete).toHaveBeenCalled()
      expect(mockCacheService.deleteTemplate).toHaveBeenCalledWith('template-123')
      expect(mockCacheService.invalidateUserCaches).toHaveBeenCalledWith(validTemplate.user_id)
      expect(mockCacheService.invalidateCategoryCache).toHaveBeenCalledWith(
        validTemplate.user_id,
        validTemplate.kategorie
      )
    })

    it('should handle different types of delete errors', async () => {
      const testCases = [
        {
          error: { code: 'PGRST116', message: 'Not found' },
          expectedErrorType: TemplateErrorType.TEMPLATE_NOT_FOUND
        },
        {
          error: { message: 'permission denied' },
          expectedErrorType: TemplateErrorType.PERMISSION_DENIED
        },
        {
          error: { message: 'RLS policy violation' },
          expectedErrorType: TemplateErrorType.PERMISSION_DENIED
        },
        {
          error: { message: 'Unknown error' },
          expectedErrorType: TemplateErrorType.TEMPLATE_DELETE_FAILED
        }
      ]

      for (const testCase of testCases) {
        const mockDelete = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: testCase.error })
        })
        mockSupabaseClient.from.mockReturnValue({
          delete: mockDelete
        } as any)

        await expect(templateService.deleteTemplate('template-123'))
          .rejects.toThrow()

        expect(mockErrorHandler.createError).toHaveBeenCalledWith(
          testCase.expectedErrorType,
          expect.stringContaining('Failed to delete template'),
          testCase.error,
          expect.objectContaining({
            templateId: 'template-123',
            operation: 'delete'
          })
        )

        jest.clearAllMocks()
      }
    })
  })

  describe('getTemplate - Enhanced Caching', () => {
    it('should return cached template when available', async () => {
      mockCacheService.getTemplate.mockReturnValue(validTemplate)

      const result = await templateService.getTemplate('template-123')

      expect(result).toEqual(validTemplate)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch from database and cache when not cached', async () => {
      mockCacheService.getTemplate.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: validTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getTemplate('template-123')

      expect(result).toEqual(validTemplate)
      expect(mockCacheService.setTemplate).toHaveBeenCalledWith(validTemplate)
    })

    it('should handle different types of get errors', async () => {
      mockCacheService.getTemplate.mockReturnValue(null)

      const testCases = [
        {
          error: { code: 'PGRST116', message: 'Not found' },
          expectedErrorType: TemplateErrorType.TEMPLATE_NOT_FOUND
        },
        {
          error: { message: 'permission denied' },
          expectedErrorType: TemplateErrorType.PERMISSION_DENIED
        },
        {
          error: { message: 'Unknown error' },
          expectedErrorType: TemplateErrorType.TEMPLATE_LOAD_FAILED
        }
      ]

      for (const testCase of testCases) {
        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: testCase.error
            })
          })
        })
        mockSupabaseClient.from.mockReturnValue({
          select: mockSelect
        } as any)

        await expect(templateService.getTemplate('template-123'))
          .rejects.toThrow()

        expect(mockErrorHandler.createError).toHaveBeenCalledWith(
          testCase.expectedErrorType,
          expect.stringContaining('Failed to get template'),
          testCase.error,
          expect.objectContaining({
            templateId: 'template-123',
            operation: 'get'
          })
        )

        jest.clearAllMocks()
      }
    })
  })

  describe('getUserTemplates - Enhanced Error Handling', () => {
    const mockTemplates: Template[] = [
      validTemplate,
      {
        ...validTemplate,
        id: 'template-456',
        titel: 'Another Template'
      }
    ]

    it('should return cached templates when available', async () => {
      mockCacheService.getUserTemplates.mockReturnValue(mockTemplates)

      const result = await templateService.getUserTemplates('user-123')

      expect(result).toEqual(mockTemplates)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch and cache templates when not cached', async () => {
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

    it('should handle database errors gracefully with fallback', async () => {
      mockCacheService.getUserTemplates.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getUserTemplates('user-123')

      expect(result).toEqual([]) // Should fallback to empty array
      expect(mockErrorHandler.createError).toHaveBeenCalled()
      expect(mockErrorReporter.reportError).toHaveBeenCalled()
    })
  })

  describe('Variable Extraction and Validation', () => {
    it('should extract variables from various content structures', () => {
      const testCases = [
        {
          name: 'simple mention',
          content: {
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
          },
          expected: ['tenant_name']
        },
        {
          name: 'multiple mentions',
          content: {
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
          },
          expected: ['landlord_name', 'tenant_name']
        },
        {
          name: 'nested structure',
          content: {
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
          },
          expected: ['apartment_rent']
        },
        {
          name: 'text node marks',
          content: {
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
          },
          expected: ['tenant_name']
        }
      ]

      testCases.forEach(testCase => {
        const result = templateService.extractVariablesFromContent(testCase.content)
        expect(result).toEqual(testCase.expected)
      })
    })

    it('should handle malformed content gracefully during extraction', () => {
      const malformedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {} // Missing id
              },
              {
                type: 'mention',
                attrs: { id: '', label: 'Empty ID' } // Empty id
              },
              {
                type: 'mention',
                attrs: { id: 123, label: 'Invalid ID' } // Non-string id
              }
            ]
          }
        ]
      }

      const result = templateService.extractVariablesFromContent(malformedContent)
      expect(result).toEqual([]) // Should return empty array for invalid variables
    })

    it('should validate template variables comprehensively', () => {
      const testCases = [
        {
          name: 'valid content with variables',
          content: {
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
          },
          expectedValid: true,
          expectedErrors: 0
        },
        {
          name: 'invalid document structure',
          content: {
            type: 'paragraph', // Should be 'doc'
            content: []
          },
          expectedValid: false,
          expectedErrors: 1
        },
        {
          name: 'missing content array',
          content: {
            type: 'doc'
            // Missing content
          },
          expectedValid: false,
          expectedErrors: 1
        },
        {
          name: 'invalid mention node',
          content: {
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
          },
          expectedValid: false,
          expectedErrors: 1
        }
      ]

      testCases.forEach(testCase => {
        const result = templateService.validateTemplateVariables(testCase.content)
        expect(result.isValid).toBe(testCase.expectedValid)
        expect(result.errors).toHaveLength(testCase.expectedErrors)
      })
    })
  })

  describe('Category Management', () => {
    it('should return cached categories when available', async () => {
      const mockCategories = ['Category 1', 'Category 2', 'Custom Category']
      mockCacheService.getUserCategories.mockReturnValue(mockCategories)

      const result = await templateService.getUserCategories('user-123')

      expect(result).toEqual(mockCategories)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch categories and merge with defaults', async () => {
      mockCacheService.getUserCategories.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { kategorie: 'Custom Category 1' },
              { kategorie: 'Custom Category 2' }
            ],
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getUserCategories('user-123')

      // Should include both custom and default categories
      expect(result).toContain('Custom Category 1')
      expect(result).toContain('Custom Category 2')
      expect(result).toContain('Mietverträge')
      expect(result).toContain('Kündigungen')
      expect(result).toContain('Nebenkostenabrechnungen')
      expect(result).toContain('Mängelanzeigen')
      expect(result).toContain('Schriftverkehr')
      expect(result).toContain('Sonstiges')

      expect(mockCacheService.setUserCategories).toHaveBeenCalledWith('user-123', result)
    })

    it('should handle category fetch errors', async () => {
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

  describe('Template Count Operations', () => {
    it('should return cached count when available', async () => {
      mockCacheService.getTemplateCount.mockReturnValue(5)

      const result = await templateService.getCategoryTemplateCount('user-123', 'Test Category')

      expect(result).toBe(5)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should fetch and cache count when not cached', async () => {
      mockCacheService.getTemplateCount.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue({
            count: 3,
            error: null
          })
        }))
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const result = await templateService.getCategoryTemplateCount('user-123', 'Test Category')

      expect(result).toBe(3)
      expect(mockCacheService.setTemplateCount).toHaveBeenCalledWith('user-123', 3, 'Test Category')
    })
  })

  describe('Variable Search and Management', () => {
    it('should return available variables', () => {
      const variables = templateService.getAvailableVariables()

      expect(variables.length).toBeGreaterThan(0)
      expect(variables.every(v => v.id && v.label && v.category)).toBe(true)

      // Check for expected categories
      const categories = [...new Set(variables.map(v => v.category))]
      expect(categories).toContain('Mieter')
      expect(categories).toContain('Vermieter')
      expect(categories).toContain('Immobilie')
      expect(categories).toContain('Wohnung')
      expect(categories).toContain('Finanzen')
      expect(categories).toContain('Datum')
    })

    it('should search variables by query', () => {
      const testCases = [
        { query: 'Mieter', expectedMinResults: 1 },
        { query: 'Name', expectedMinResults: 1 },
        { query: 'Adresse', expectedMinResults: 1 },
        { query: 'nonexistent', expectedMinResults: 0 }
      ]

      testCases.forEach(testCase => {
        const results = templateService.searchVariables(testCase.query)
        expect(results.length).toBeGreaterThanOrEqual(testCase.expectedMinResults)
        
        if (testCase.expectedMinResults > 0) {
          expect(results.some(v => 
            v.label.toLowerCase().includes(testCase.query.toLowerCase()) ||
            v.id.toLowerCase().includes(testCase.query.toLowerCase())
          )).toBe(true)
        }
      })
    })

    it('should get variable by ID', () => {
      const variable = templateService.getVariableById('tenant_name')
      expect(variable).toBeDefined()
      expect(variable?.id).toBe('tenant_name')
      expect(variable?.label).toBeDefined()
      expect(variable?.category).toBeDefined()

      const nonExistent = templateService.getVariableById('nonexistent_variable')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle and report various error types', async () => {
      const errorScenarios = [
        {
          operation: 'create',
          error: new Error('Network timeout'),
          expectedErrorType: TemplateErrorType.TEMPLATE_SAVE_FAILED
        },
        {
          operation: 'update',
          error: new Error('Validation failed'),
          expectedErrorType: TemplateErrorType.INVALID_TEMPLATE_DATA
        },
        {
          operation: 'delete',
          error: new Error('Permission denied'),
          expectedErrorType: TemplateErrorType.PERMISSION_DENIED
        }
      ]

      for (const scenario of errorScenarios) {
        // Mock the appropriate method to throw an error
        const mockMethod = jest.fn().mockRejectedValue(scenario.error)
        
        if (scenario.operation === 'create') {
          mockSupabaseClient.from.mockReturnValue({
            insert: () => ({
              select: () => ({
                single: mockMethod
              })
            })
          } as any)
          
          await expect(templateService.createTemplate({
            titel: 'Test',
            inhalt: { type: 'doc', content: [] },
            kategorie: 'Test',
            user_id: 'user-123'
          })).rejects.toThrow()
        }

        expect(mockErrorReporter.reportError).toHaveBeenCalled()
        jest.clearAllMocks()
      }
    })

    it('should handle exceptions during error handling', async () => {
      // Mock error handler to throw an exception
      mockErrorHandler.createError.mockImplementation(() => {
        throw new Error('Error handler failed')
      })

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

      // Should still throw an error, but not crash
      await expect(templateService.createTemplate({
        titel: 'Test',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Test',
        user_id: 'user-123'
      })).rejects.toThrow()
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large template operations efficiently', async () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 1000 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Paragraph ${i}` },
            {
              type: 'mention',
              attrs: { id: `variable_${i}`, label: `Variable ${i}` }
            }
          ]
        }))
      }

      const largeTemplate: CreateTemplateRequest = {
        titel: 'Large Template',
        inhalt: largeContent,
        kategorie: 'Test',
        user_id: 'user-123'
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...validTemplate, inhalt: largeContent },
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const startTime = Date.now()
      const result = await templateService.createTemplate(largeTemplate)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should batch cache operations efficiently', async () => {
      const templates = Array.from({ length: 100 }, (_, i) => ({
        ...validTemplate,
        id: `template-${i}`,
        titel: `Template ${i}`
      }))

      mockCacheService.getUserTemplates.mockReturnValue(null)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: templates,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      } as any)

      const startTime = Date.now()
      const result = await templateService.getUserTemplates('user-123')
      const endTime = Date.now()

      expect(result).toHaveLength(100)
      expect(mockCacheService.setUserTemplates).toHaveBeenCalledWith('user-123', templates)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const createRequest: CreateTemplateRequest = {
        titel: 'Consistency Test',
        inhalt: {
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
        },
        kategorie: 'Test Category',
        user_id: 'user-123'
      }

      const createdTemplate = {
        ...validTemplate,
        ...createRequest,
        id: 'new-template-123'
      }

      // Mock successful creation
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdTemplate,
            error: null
          })
        })
      })
      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await templateService.createTemplate(createRequest)

      // Verify data integrity
      expect(result.titel).toBe(createRequest.titel)
      expect(result.kategorie).toBe(createRequest.kategorie)
      expect(result.user_id).toBe(createRequest.user_id)
      expect(result.kontext_anforderungen).toContain('tenant_name')
      expect(result.erstellungsdatum).toBeDefined()
    })

    it('should validate data integrity before and after operations', async () => {
      const invalidRequest: CreateTemplateRequest = {
        titel: '', // Invalid
        inhalt: null as any, // Invalid
        kategorie: 'A'.repeat(200), // Too long
        user_id: 'user-123'
      }

      await expect(templateService.createTemplate(invalidRequest))
        .rejects.toThrow()

      // Should not have attempted database operation
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
  })
})