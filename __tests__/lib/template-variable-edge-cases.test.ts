import { TemplateService } from '../../lib/template-service'

// Mock the Supabase client
jest.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
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
          }))
        })),
        not: jest.fn(() => ({}))
      }))
    }))
  }))
}))

describe('TemplateService - Variable Extraction Edge Cases', () => {
  let templateService: TemplateService

  beforeEach(() => {
    templateService = new TemplateService()
  })

  describe('extractVariablesFromContent - Complex Structures', () => {
    it('should handle deeply nested content structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'strong',
                    content: [
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
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should handle lists with mentions', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Mieter: ' },
                      {
                        type: 'mention',
                        attrs: { id: 'tenant_name', label: 'Mieter Name' }
                      }
                    ]
                  }
                ]
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Vermieter: ' },
                      {
                        type: 'mention',
                        attrs: { id: 'landlord_name', label: 'Vermieter Name' }
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
      expect(variables).toEqual(['landlord_name', 'tenant_name'])
    })

    it('should handle mentions in table cells', () => {
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
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'Mieter' }
                        ]
                      }
                    ]
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'Miete' }
                        ]
                      }
                    ]
                  }
                ]
              },
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
                            attrs: { id: 'tenant_name', label: 'Mieter Name' }
                          }
                        ]
                      }
                    ]
                  },
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
      expect(variables).toEqual(['apartment_rent', 'tenant_name'])
    })

    it('should handle mentions with complex attributes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name',
                  class: 'mention-highlight',
                  'data-type': 'tenant',
                  style: 'color: blue;'
                }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })

    it('should handle malformed content gracefully', () => {
      const malformedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: null // Malformed attrs
              },
              {
                type: 'mention'
                // Missing attrs entirely
              },
              {
                type: 'mention',
                attrs: {
                  id: 'valid_variable',
                  label: 'Valid Variable'
                }
              }
            ]
          }
        ]
      }

      const variables = templateService.extractVariablesFromContent(malformedContent)
      expect(variables).toEqual(['valid_variable'])
    })

    it('should handle circular references safely', () => {
      const content: any = {
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

      // Create a circular reference
      content.content[0].circular = content

      const variables = templateService.extractVariablesFromContent(content)
      expect(variables).toEqual(['tenant_name'])
    })
  })

  describe('validateTemplateVariables - Edge Cases', () => {
    it('should handle validation errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const invalidContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'valid_variable', label: 'Valid' }
              }
            ]
          }
        ]
      }

      // Temporarily break the extractVariablesFromContent method
      const originalMethod = templateService.extractVariablesFromContent
      templateService.extractVariablesFromContent = jest.fn(() => {
        throw new Error('Test error')
      })

      const result = templateService.validateTemplateVariables(invalidContent)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'VALIDATION_ERROR')).toBe(true)

      // Restore the original method
      templateService.extractVariablesFromContent = originalMethod
      consoleSpy.mockRestore()
    })

    it('should validate complex document structures', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
              { type: 'text', text: 'Contract for ' },
              {
                type: 'mention',
                attrs: { id: 'property_name', label: 'Objektname' }
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Between ' },
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          },
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
                          { type: 'text', text: 'Rent: ' },
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

      const result = templateService.validateTemplateVariables(content)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'CONTEXT_REQUIRED')).toBe(true)
    })

    it('should detect invalid document structure', () => {
      const invalidContent = {
        type: 'doc',
        // Missing content array
        invalidProperty: 'test'
      }

      const result = templateService.validateTemplateVariables(invalidContent)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_DOCUMENT_STRUCTURE')).toBe(true)
    })

    it('should warn about mentions without labels', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name'
                  // Missing label
                }
              }
            ]
          }
        ]
      }

      const result = templateService.validateTemplateVariables(content)
      expect(result.warnings.some(w => w.code === 'MISSING_MENTION_LABEL')).toBe(true)
    })
  })

  describe('Variable Management - Performance', () => {
    it('should handle large content efficiently', () => {
      // Create content with many variables
      const content = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: {
                id: i % 10 === 0 ? 'tenant_name' : `variable_${i}`,
                label: `Variable ${i}`
              }
            }
          ]
        }))
      }

      const startTime = Date.now()
      const variables = templateService.extractVariablesFromContent(content)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(variables.length).toBeGreaterThan(0)
    })

    it('should handle search with many variables efficiently', () => {
      const startTime = Date.now()
      const results = templateService.searchVariables('a') // Common letter
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(50) // Should complete in under 50ms
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Context Requirements - Advanced', () => {
    it('should handle complex context requirements', () => {
      const variableIds = [
        'tenant_name',
        'tenant_email',
        'apartment_rent',
        'contract_start_date',
        'current_date'
      ]

      const requirements = templateService.getContextRequirements(variableIds)
      
      expect(requirements).toContain('tenant')
      expect(requirements).toContain('apartment')
      expect(requirements).toContain('lease')
      expect(requirements).not.toContain('') // No empty requirements
      expect(requirements).toEqual([...requirements].sort()) // Should be sorted
    })

    it('should handle mixed valid and invalid variables', () => {
      const variableIds = [
        'tenant_name',
        'invalid_variable',
        'property_name',
        'another_invalid'
      ]

      const requirements = templateService.getContextRequirements(variableIds)
      
      // Should only include requirements for valid variables
      expect(requirements).toContain('tenant')
      expect(requirements).toContain('property')
      expect(requirements.length).toBeGreaterThan(0)
    })
  })
})