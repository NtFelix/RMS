/**
 * Integration tests for enhanced template service saving logic
 * Tests the actual functionality without complex mocking
 */

import { templateService } from '@/lib/template-service'

describe('Template Service Enhanced Saving - Integration', () => {
  describe('Content Serialization and Variable Extraction', () => {
    it('should properly serialize TipTap content and extract variables', () => {
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Template Title' }]
          },
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
              { type: 'text', text: ' is due on ' },
              {
                type: 'mention',
                attrs: { id: 'due_date', label: 'Fälligkeitsdatum' }
              },
              { type: 'text', text: '.' }
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
                      { type: 'text', text: 'Amount: ' },
                      {
                        type: 'mention',
                        attrs: { id: 'rent_amount', label: 'Miete' }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }

      // Test variable extraction
      const extractedVariables = templateService.extractVariablesFromContent(complexContent)
      
      expect(extractedVariables).toEqual([
        'due_date',
        'property_address', 
        'rent_amount',
        'tenant_name'
      ])
      expect(extractedVariables).toHaveLength(4)
    })

    it('should handle nested content structures correctly', () => {
      const nestedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Text with mention mark',
                marks: [
                  {
                    type: 'mention',
                    attrs: { id: 'marked_variable', label: 'Marked Variable' }
                  }
                ]
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
                          { type: 'text', text: 'Cell with ' },
                          {
                            type: 'mention',
                            attrs: { id: 'table_variable', label: 'Table Variable' }
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

      const extractedVariables = templateService.extractVariablesFromContent(nestedContent)
      
      expect(extractedVariables).toEqual(['marked_variable', 'table_variable'])
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
                attrs: { id: '', label: 'Empty id mention' } // empty id
              },
              {
                type: 'mention',
                attrs: { id: 'valid_variable', label: 'Valid mention' }
              }
            ]
          }
        ]
      }

      const extractedVariables = templateService.extractVariablesFromContent(malformedContent)
      
      // Should only extract valid variables
      expect(extractedVariables).toEqual(['valid_variable'])
    })

    it('should deduplicate variables correctly', () => {
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
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Different variable: ' },
              {
                type: 'mention',
                attrs: { id: 'property_address', label: 'Property Address' }
              }
            ]
          }
        ]
      }

      const extractedVariables = templateService.extractVariablesFromContent(contentWithDuplicates)
      
      expect(extractedVariables).toEqual(['property_address', 'tenant_name'])
      expect(extractedVariables).toHaveLength(2)
    })

    it('should handle empty content gracefully', () => {
      const emptyContent = {
        type: 'doc',
        content: []
      }

      const extractedVariables = templateService.extractVariablesFromContent(emptyContent)
      
      expect(extractedVariables).toEqual([])
    })

    it('should handle content with only text nodes', () => {
      const textOnlyContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is just plain text without any variables.' }
            ]
          }
        ]
      }

      const extractedVariables = templateService.extractVariablesFromContent(textOnlyContent)
      
      expect(extractedVariables).toEqual([])
    })
  })

  describe('Template Validation', () => {
    it('should validate template variables correctly', () => {
      const validContent = {
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

      const validationResult = templateService.validateTemplateVariables(validContent)
      
      expect(validationResult.isValid).toBe(true)
      expect(validationResult.errors).toHaveLength(0)
    })

    it('should detect invalid variable structure', () => {
      const invalidContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: { label: 'Missing ID' } // Missing id attribute
              }
            ]
          }
        ]
      }

      const validationResult = templateService.validateTemplateVariables(invalidContent)
      
      // The validation should detect the missing ID as an error
      expect(validationResult.isValid).toBe(false)
      expect(validationResult.errors.length).toBeGreaterThan(0)
      // Should have an error about missing mention ID
      expect(validationResult.errors.some(error => 
        error.message.includes('id') || error.message.includes('ID')
      )).toBe(true)
    })
  })

  describe('Content Parser Integration', () => {
    it('should use robust content parser for variable extraction', () => {
      // Test that the enhanced variable extraction uses the robust content parser
      const contentWithParsingIssues = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Normal text ' },
              {
                type: 'mention',
                attrs: { id: 'valid_var', label: 'Valid Variable' }
              },
              // Simulate some parsing edge cases
              null, // null node
              undefined, // undefined node
              {
                type: 'mention',
                attrs: { id: 'another_var', label: 'Another Variable' }
              }
            ].filter(Boolean) // Remove null/undefined for this test
          }
        ]
      }

      const extractedVariables = templateService.extractVariablesFromContent(contentWithParsingIssues)
      
      expect(extractedVariables).toEqual(['another_var', 'valid_var'])
    })

    it('should handle array content format', () => {
      // Test direct array format (not wrapped in doc)
      const arrayContent = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Array format with ' },
            {
              type: 'mention',
              attrs: { id: 'array_variable', label: 'Array Variable' }
            }
          ]
        }
      ]

      const extractedVariables = templateService.extractVariablesFromContent(arrayContent as any)
      
      expect(extractedVariables).toEqual(['array_variable'])
    })
  })

  describe('Error Handling', () => {
    it('should handle completely invalid content gracefully', () => {
      const invalidContent = null

      expect(() => {
        const variables = templateService.extractVariablesFromContent(invalidContent as any)
        expect(variables).toEqual([])
      }).not.toThrow()
    })

    it('should handle non-object content gracefully', () => {
      const stringContent = "This is just a string"

      expect(() => {
        const variables = templateService.extractVariablesFromContent(stringContent as any)
        expect(variables).toEqual([])
      }).not.toThrow()
    })

    it('should handle circular references gracefully', () => {
      const circularContent: any = {
        type: 'doc',
        content: []
      }
      // Create circular reference
      circularContent.content.push(circularContent)

      expect(() => {
        const variables = templateService.extractVariablesFromContent(circularContent)
        // Should not crash, may return empty array or handle gracefully
        expect(Array.isArray(variables)).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should handle large content efficiently', () => {
      // Create large content with many variables
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Paragraph ${i} with ` },
            {
              type: 'mention',
              attrs: { id: `variable_${i}`, label: `Variable ${i}` }
            }
          ]
        }))
      }

      const startTime = Date.now()
      const extractedVariables = templateService.extractVariablesFromContent(largeContent)
      const endTime = Date.now()

      expect(extractedVariables).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Verify all variables are extracted correctly
      for (let i = 0; i < 100; i++) {
        expect(extractedVariables).toContain(`variable_${i}`)
      }
    })
  })
})