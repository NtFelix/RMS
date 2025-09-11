/**
 * Comprehensive Unit Tests for Template Content Parser
 * 
 * Tests all aspects of the RobustContentParser including:
 * - Various input formats (string, object, null, undefined)
 * - Error handling and recovery mechanisms
 * - Variable extraction from complex content structures
 * - Content validation and normalization
 * - Edge cases and malformed content handling
 */

import {
  RobustContentParser,
  robustContentParser,
  parseTemplateContent,
  serializeTemplateContent,
  extractTemplateVariables,
  validateTemplateContent,
  type TiptapContent,
  type ContentNode,
  type ParseResult,
  type SerializeResult,
  type VariableExtractionResult
} from '../../lib/template-content-parser'

describe('RobustContentParser Comprehensive Tests', () => {
  let parser: RobustContentParser

  beforeEach(() => {
    parser = RobustContentParser.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RobustContentParser.getInstance()
      const instance2 = RobustContentParser.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(robustContentParser)
    })
  })

  describe('parseTemplateContent - String Input Formats', () => {
    it('should parse valid JSON string content', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello World' }
            ]
          }
        ]
      })

      const result = parser.parseTemplateContent(jsonString)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
      expect(result.wasRecovered).toBe(false)
    })

    it('should handle malformed JSON with recovery', () => {
      const malformedJson = `{
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "Hello World", }
            ]
          }
        ]
      }`

      const result = parser.parseTemplateContent(malformedJson)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.some(w => w.includes('recovered'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle single quotes in JSON', () => {
      const singleQuoteJson = `{
        'type': 'doc',
        'content': [
          {
            'type': 'paragraph',
            'content': [
              { 'type': 'text', 'text': 'Hello World' }
            ]
          }
        ]
      }`

      const result = parser.parseTemplateContent(singleQuoteJson)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle unquoted keys in JSON', () => {
      const unquotedKeysJson = `{
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello World" }
            ]
          }
        ]
      }`

      const result = parser.parseTemplateContent(unquotedKeysJson)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle JSON with comments', () => {
      const jsonWithComments = `{
        // This is a comment
        "type": "doc",
        /* Multi-line comment */
        "content": [
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "Hello World" }
            ]
          }
        ]
      }`

      const result = parser.parseTemplateContent(jsonWithComments)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.wasRecovered).toBe(true)
    })

    it('should convert plain text to paragraph', () => {
      const plainText = 'This is just plain text content'

      const result = parser.parseTemplateContent(plainText)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toHaveLength(1)
      expect(result.content.content[0].type).toBe('paragraph')
      expect(result.content.content[0].content?.[0].text).toBe(plainText)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle empty string', () => {
      const result = parser.parseTemplateContent('')

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toHaveLength(1)
      expect(result.content.content[0].type).toBe('paragraph')
      expect(result.warnings.some(w => w.includes('Empty string'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle whitespace-only string', () => {
      const result = parser.parseTemplateContent('   \n\t   ')

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.some(w => w.includes('Empty string'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })
  })

  describe('parseTemplateContent - Object Input Formats', () => {
    it('should parse valid TipTap document object', () => {
      const validDoc: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Valid content' }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(validDoc)

      expect(result.success).toBe(true)
      expect(result.content).toEqual(validDoc)
      expect(result.errors).toHaveLength(0)
      expect(result.wasRecovered).toBe(false)
    })

    it('should handle object with missing type', () => {
      const invalidDoc = {
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Content without doc type' }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(invalidDoc)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toEqual(invalidDoc.content)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle array of content nodes', () => {
      const contentArray = [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'First paragraph' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Second paragraph' }
          ]
        }
      ]

      const result = parser.parseTemplateContent(contentArray)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toEqual(contentArray)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle nested content property', () => {
      const nestedContent = {
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Nested content' }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(nestedContent)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle object with text property', () => {
      const textObject = {
        text: 'This is text content'
      }

      const result = parser.parseTemplateContent(textObject)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toHaveLength(1)
      expect(result.content.content[0].type).toBe('paragraph')
      expect(result.content.content[0].content?.[0].text).toBe(textObject.text)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle empty object', () => {
      const result = parser.parseTemplateContent({})

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.content.content).toHaveLength(1)
      expect(result.content.content[0].type).toBe('paragraph')
      expect(result.warnings.some(w => w.includes('Empty object'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })
  })

  describe('parseTemplateContent - Edge Cases', () => {
    it('should handle null input', () => {
      const result = parser.parseTemplateContent(null)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.some(w => w.includes('null or undefined'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle undefined input', () => {
      const result = parser.parseTemplateContent(undefined)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.some(w => w.includes('null or undefined'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle number input', () => {
      const result = parser.parseTemplateContent(123 as any)

      expect(result.success).toBe(false)
      expect(result.content.type).toBe('doc')
      expect(result.errors.some(e => e.includes('Unsupported content type'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle boolean input', () => {
      const result = parser.parseTemplateContent(true as any)

      expect(result.success).toBe(false)
      expect(result.content.type).toBe('doc')
      expect(result.errors.some(e => e.includes('Unsupported content type'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle function input', () => {
      const result = parser.parseTemplateContent((() => {}) as any)

      expect(result.success).toBe(false)
      expect(result.content.type).toBe('doc')
      expect(result.errors.some(e => e.includes('Unsupported content type'))).toBe(true)
      expect(result.wasRecovered).toBe(true)
    })
  })

  describe('Content Node Validation', () => {
    it('should validate and normalize valid nodes', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [
              { type: 'text', text: 'Heading' }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Bold text',
                marks: [{ type: 'bold' }]
              }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(content)

      expect(result.success).toBe(true)
      expect(result.content.content).toHaveLength(2)
      expect(result.content.content[0].type).toBe('heading')
      expect(result.content.content[0].attrs?.level).toBe(1)
      expect(result.content.content[1].content?.[0].marks).toHaveLength(1)
    })

    it('should recover malformed nodes', () => {
      const malformedContent = {
        type: 'doc',
        content: [
          'string node', // Invalid: should be object
          {
            // Missing type
            content: [{ type: 'text', text: 'Text without node type' }]
          },
          {
            type: 'paragraph',
            content: 'invalid content' // Invalid: should be array
          }
        ]
      }

      const result = parser.parseTemplateContent(malformedContent)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle nodes with invalid attributes', () => {
      const contentWithInvalidAttrs = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: 'invalid attrs', // Should be object
            content: [{ type: 'text', text: 'Heading' }]
          }
        ]
      }

      const result = parser.parseTemplateContent(contentWithInvalidAttrs)

      expect(result.success).toBe(true)
      expect(result.content.content[0].attrs).toBeUndefined()
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle nodes with invalid text', () => {
      const contentWithInvalidText = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 123 // Should be string
              }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(contentWithInvalidText)

      expect(result.success).toBe(true)
      expect(result.content.content[0].content?.[0].text).toBe('123')
      expect(result.wasRecovered).toBe(true)
    })

    it('should handle nodes with invalid marks', () => {
      const contentWithInvalidMarks = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Text with invalid marks',
                marks: 'invalid marks' // Should be array
              }
            ]
          }
        ]
      }

      const result = parser.parseTemplateContent(contentWithInvalidMarks)

      expect(result.success).toBe(true)
      expect(result.content.content[0].content?.[0].marks).toBeUndefined()
      expect(result.wasRecovered).toBe(true)
    })
  })

  describe('serializeContent', () => {
    it('should serialize valid content successfully', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello World' }
            ]
          }
        ]
      }

      const result = parser.serializeContent(content)

      expect(result.success).toBe(true)
      expect(result.content).toEqual(content)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid content type', () => {
      const result = parser.serializeContent(null as any)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Content must be an object'))).toBe(true)
    })

    it('should reject non-document content', () => {
      const invalidContent = {
        type: 'paragraph',
        content: []
      } as any

      const result = parser.serializeContent(invalidContent)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Content must be a document node'))).toBe(true)
    })

    it('should reject content without content array', () => {
      const invalidContent = {
        type: 'doc'
        // Missing content array
      } as any

      const result = parser.serializeContent(invalidContent)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Document content must be an array'))).toBe(true)
    })

    it('should clean undefined values from serialized content', () => {
      const contentWithUndefined: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: undefined,
            content: [
              {
                type: 'text',
                text: 'Hello',
                marks: undefined
              }
            ]
          }
        ]
      }

      const result = parser.serializeContent(contentWithUndefined)

      expect(result.success).toBe(true)
      expect(result.content).not.toHaveProperty('attrs')
      expect((result.content as any).content[0].content[0]).not.toHaveProperty('marks')
    })
  })

  describe('extractVariables', () => {
    it('should extract variables from mention nodes', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
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

      const result = parser.extractVariables(content)

      expect(result.variables).toEqual(['landlord_name', 'tenant_name'])
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should extract variables from text node marks', () => {
      const content: TiptapContent = {
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

      const result = parser.extractVariables(content)

      expect(result.variables).toEqual(['tenant_name'])
      expect(result.errors).toHaveLength(0)
    })

    it('should handle nested content structures', () => {
      const content: TiptapContent = {
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

      const result = parser.extractVariables(content)

      expect(result.variables).toEqual(['apartment_rent'])
      expect(result.errors).toHaveLength(0)
    })

    it('should deduplicate variables', () => {
      const content: TiptapContent = {
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

      const result = parser.extractVariables(content)

      expect(result.variables).toEqual(['tenant_name'])
      expect(result.errors).toHaveLength(0)
    })

    it('should handle invalid mention nodes', () => {
      const content: TiptapContent = {
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

      const result = parser.extractVariables(content)

      expect(result.variables).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('invalid ID'))).toBe(true)
    })

    it('should handle null/undefined content', () => {
      const result1 = parser.extractVariables(null as any)
      const result2 = parser.extractVariables(undefined as any)

      expect(result1.variables).toEqual([])
      expect(result1.errors.some(e => e.includes('null or undefined'))).toBe(true)

      expect(result2.variables).toEqual([])
      expect(result2.errors.some(e => e.includes('null or undefined'))).toBe(true)
    })

    it('should handle extraction errors gracefully', () => {
      // Create content that might cause extraction errors
      const problematicContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
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

      // Mock a method to throw an error during extraction
      const originalMethod = parser['extractVariablesFromNode']
      jest.spyOn(parser as any, 'extractVariablesFromNode').mockImplementationOnce(() => {
        throw new Error('Extraction error')
      })

      const result = parser.extractVariables(problematicContent as TiptapContent)

      expect(result.variables).toEqual([])
      expect(result.errors.some(e => e.includes('Variable extraction failed'))).toBe(true)

      // Restore original method
      jest.restoreAllMocks()
    })
  })

  describe('validateContent', () => {
    it('should validate correct content structure', () => {
      const validContent: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Valid content' }
            ]
          }
        ]
      }

      const result = parser.validateContent(validContent)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should detect invalid content type', () => {
      const result = parser.validateContent(null as any)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'CONTENT_INVALID_TYPE')).toBe(true)
    })

    it('should detect invalid root type', () => {
      const invalidContent = {
        type: 'paragraph',
        content: []
      } as any

      const result = parser.validateContent(invalidContent)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'CONTENT_INVALID_ROOT_TYPE')).toBe(true)
    })

    it('should detect invalid structure', () => {
      const invalidContent = {
        type: 'doc',
        content: 'not an array'
      } as any

      const result = parser.validateContent(invalidContent)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'CONTENT_INVALID_STRUCTURE')).toBe(true)
    })

    it('should validate mention nodes', () => {
      const contentWithInvalidMention: TiptapContent = {
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

      const result = parser.validateContent(contentWithInvalidMention)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'MENTION_MISSING_ID')).toBe(true)
    })

    it('should warn about missing labels in mentions', () => {
      const contentWithMentionNoLabel: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name' } // Missing label
              }
            ]
          }
        ]
      }

      const result = parser.validateContent(contentWithMentionNoLabel)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'MENTION_MISSING_LABEL')).toBe(true)
    })

    it('should handle validation errors gracefully', () => {
      // Mock validation to throw an error
      const originalMethod = parser['validateNodesRecursively']
      jest.spyOn(parser as any, 'validateNodesRecursively').mockImplementationOnce(() => {
        throw new Error('Validation error')
      })

      const content: TiptapContent = {
        type: 'doc',
        content: []
      }

      const result = parser.validateContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'CONTENT_VALIDATION_ERROR')).toBe(true)

      // Restore original method
      jest.restoreAllMocks()
    })
  })

  describe('Convenience Functions', () => {
    it('should provide working convenience functions', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'test_var', label: 'Test Variable' }
              }
            ]
          }
        ]
      }

      // Test parseTemplateContent function
      const parseResult = parseTemplateContent(content)
      expect(parseResult.success).toBe(true)

      // Test serializeTemplateContent function
      const serializeResult = serializeTemplateContent(parseResult.content)
      expect(serializeResult.success).toBe(true)

      // Test extractTemplateVariables function
      const variableResult = extractTemplateVariables(parseResult.content)
      expect(variableResult.variables).toEqual(['test_var'])

      // Test validateTemplateContent function
      const validationResult = validateTemplateContent(parseResult.content)
      expect(validationResult.isValid).toBe(true)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large content efficiently', () => {
      const largeContent: TiptapContent = {
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

      const startTime = Date.now()
      const result = parser.parseTemplateContent(largeContent)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle deeply nested content', () => {
      let deepContent: any = {
        type: 'doc',
        content: []
      }

      // Create deeply nested structure (50 levels)
      let current = deepContent
      for (let i = 0; i < 50; i++) {
        const nested = {
          type: 'paragraph',
          content: [
            { type: 'text', text: `Level ${i}` }
          ]
        }
        current.content.push(nested)
        
        if (i < 49) {
          nested.content.push({
            type: 'paragraph',
            content: []
          })
          current = nested.content[nested.content.length - 1]
        }
      }

      const result = parser.parseTemplateContent(deepContent)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
    })

    it('should handle circular references safely', () => {
      const circularContent: any = {
        type: 'doc',
        content: []
      }
      
      // Create circular reference
      circularContent.content.push(circularContent)

      // Should not crash or hang
      const result = parser.parseTemplateContent(circularContent)

      expect(result).toBeDefined()
      // The parser should handle this gracefully
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from multiple types of errors in one content', () => {
      const problematicContent = {
        type: 'doc',
        content: [
          'string node', // Should be object
          {
            // Missing type
            content: [{ type: 'text', text: 'No type' }]
          },
          {
            type: 'paragraph',
            attrs: 'invalid', // Should be object
            content: [
              {
                type: 'text',
                text: 123, // Should be string
                marks: 'invalid' // Should be array
              }
            ]
          },
          {
            type: 'mention',
            attrs: { id: '', label: 'Empty ID' } // Invalid ID
          }
        ]
      }

      const result = parser.parseTemplateContent(problematicContent)

      expect(result.success).toBe(true)
      expect(result.content.type).toBe('doc')
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.wasRecovered).toBe(true)
    })

    it('should provide meaningful error messages', () => {
      const invalidContent = {
        type: 'invalid_type',
        content: 'not_an_array'
      }

      const result = parser.parseTemplateContent(invalidContent)

      expect(result.success).toBe(false) // Should fail for invalid structure
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => 
        e.includes('parse') || e.includes('recover') || e.includes('structure')
      )).toBe(true)
    })
  })
})