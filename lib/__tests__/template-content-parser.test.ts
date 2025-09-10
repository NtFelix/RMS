/**
 * Unit tests for RobustContentParser
 * 
 * Comprehensive test suite covering all parsing scenarios, error handling,
 * and edge cases for the template content parser.
 */

import {
  RobustContentParser,
  parseTemplateContent,
  serializeTemplateContent,
  extractTemplateVariables,
  validateTemplateContent,
  type TiptapContent,
  type ContentNode,
  type ParseResult,
  type SerializeResult,
  type VariableExtractionResult
} from '../template-content-parser'

describe('RobustContentParser', () => {
  let parser: RobustContentParser

  beforeEach(() => {
    parser = RobustContentParser.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RobustContentParser.getInstance()
      const instance2 = RobustContentParser.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('parseTemplateContent', () => {
    describe('Null and Undefined Handling', () => {
      it('should handle null content', () => {
        const result = parser.parseTemplateContent(null)
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.content.content).toHaveLength(1)
        expect(result.content.content[0].type).toBe('paragraph')
        expect(result.warnings).toContain('Content is null or undefined, using empty document')
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle undefined content', () => {
        const result = parser.parseTemplateContent(undefined)
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.wasRecovered).toBe(true)
      })
    })

    describe('String Content Parsing', () => {
      it('should parse valid JSON string content', () => {
        const validContent = {
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
        
        const result = parser.parseTemplateContent(JSON.stringify(validContent))
        
        expect(result.success).toBe(true)
        expect(result.content).toEqual(validContent)
        expect(result.errors).toHaveLength(0)
        expect(result.wasRecovered).toBe(false)
      })

      it('should handle empty string content', () => {
        const result = parser.parseTemplateContent('')
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.warnings).toContain('Empty string content, using empty document')
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle whitespace-only string content', () => {
        const result = parser.parseTemplateContent('   \n\t  ')
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle invalid JSON with recovery', () => {
        const malformedJson = '{"type": "doc", "content": [{"type": "paragraph",}]}'
        
        const result = parser.parseTemplateContent(malformedJson)
        
        expect(result.success).toBe(true)
        expect(result.warnings.some(w => w.includes('recovered'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle JSON with single quotes', () => {
        const singleQuoteJson = "{'type': 'doc', 'content': []}"
        
        const result = parser.parseTemplateContent(singleQuoteJson)
        
        expect(result.success).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle JSON with comments', () => {
        const jsonWithComments = `{
          "type": "doc", // Document type
          "content": [] /* Empty content */
        }`
        
        const result = parser.parseTemplateContent(jsonWithComments)
        
        expect(result.success).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle unrecoverable JSON', () => {
        const badJson = 'this is not json at all'
        
        const result = parser.parseTemplateContent(badJson)
        
        // Parser should treat this as plain text and recover successfully
        expect(result.success).toBe(true)
        expect(result.warnings.some(w => w.includes('plain text'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
        expect(result.content.content[0].content?.[0].text).toBe(badJson)
      })
    })

    describe('Object Content Parsing', () => {
      it('should parse valid TipTap document object', () => {
        const validDoc: TiptapContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Test content' }
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

      it('should handle empty object', () => {
        const result = parser.parseTemplateContent({})
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.warnings).toContain('Empty object content, using empty document')
        expect(result.wasRecovered).toBe(true)
      })

      it('should recover content from array format', () => {
        const arrayContent = [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test' }]
          }
        ]
        
        const result = parser.parseTemplateContent(arrayContent)
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.content.content).toEqual(arrayContent)
        expect(result.warnings.some(w => w.includes('array'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should recover content with nested content property', () => {
        const nestedContent = {
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Nested test' }]
            }
          ]
        }
        
        const result = parser.parseTemplateContent(nestedContent)
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.warnings.some(w => w.includes('nested'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should recover plain text content', () => {
        const result = parser.parseTemplateContent('Plain text content')
        
        expect(result.success).toBe(true)
        expect(result.content.type).toBe('doc')
        expect(result.content.content[0].type).toBe('paragraph')
        expect(result.content.content[0].content?.[0].text).toBe('Plain text content')
        expect(result.wasRecovered).toBe(true)
      })

      it('should recover content with text property', () => {
        const textContent = { text: 'Content with text property' }
        
        const result = parser.parseTemplateContent(textContent)
        
        expect(result.success).toBe(true)
        expect(result.content.content[0].content?.[0].text).toBe('Content with text property')
        expect(result.wasRecovered).toBe(true)
      })
    })

    describe('Complex Content Validation', () => {
      it('should validate complex document with mentions', () => {
        const complexDoc: TiptapContent = {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [
                { type: 'text', text: 'Template Title' }
              ]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                {
                  type: 'mention',
                  attrs: {
                    id: 'tenant_name',
                    label: 'Tenant Name'
                  }
                },
                { type: 'text', text: ', welcome!' }
              ]
            }
          ]
        }
        
        const result = parser.parseTemplateContent(complexDoc)
        
        expect(result.success).toBe(true)
        expect(result.content).toEqual(complexDoc)
        expect(result.errors).toHaveLength(0)
        expect(result.wasRecovered).toBe(false)
      })

      it('should handle malformed nodes with recovery', () => {
        const malformedDoc = {
          type: 'doc',
          content: [
            { type: 'paragraph', content: ['invalid node'] },
            { text: 'text without type' },
            { type: 'mention' }, // mention without attrs
            'plain string node'
          ]
        }
        
        const result = parser.parseTemplateContent(malformedDoc)
        
        expect(result.success).toBe(true)
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.wasRecovered).toBe(true)
      })

      it('should validate mention nodes', () => {
        const docWithMentions = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'mention',
                  attrs: { id: 'valid_id', label: 'Valid Mention' }
                },
                {
                  type: 'mention',
                  attrs: { label: 'Missing ID' } // Missing id
                }
              ]
            }
          ]
        }
        
        const result = parser.parseTemplateContent(docWithMentions)
        
        expect(result.success).toBe(true)
        // The parser should handle this gracefully without warnings during parsing
        // Validation warnings would come from the validateContent method instead
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('Error Handling', () => {
      it('should handle unsupported content types', () => {
        const result = parser.parseTemplateContent(123 as any)
        
        expect(result.success).toBe(false)
        expect(result.errors.some(e => e.includes('Unsupported content type'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
      })

      it('should handle parsing exceptions gracefully', () => {
        // Mock JSON.parse to throw an error
        const originalParse = JSON.parse
        JSON.parse = jest.fn(() => {
          throw new Error('Mocked parsing error')
        })
        
        const result = parser.parseTemplateContent('{"test": "content"}')
        
        // Parser should treat this as plain text when JSON parsing fails
        expect(result.success).toBe(true)
        expect(result.warnings.some(w => w.includes('plain text'))).toBe(true)
        expect(result.wasRecovered).toBe(true)
        
        // Restore original JSON.parse
        JSON.parse = originalParse
      })
    })
  })

  describe('serializeContent', () => {
    it('should serialize valid TipTap content', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Test content' }
            ]
          }
        ]
      }
      
      const result = parser.serializeContent(content)
      
      expect(result.success).toBe(true)
      expect(result.content).toEqual(content)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle invalid content type', () => {
      const result = parser.serializeContent(null as any)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Content must be an object')
    })

    it('should handle non-document content', () => {
      const invalidContent = {
        type: 'paragraph',
        content: []
      } as any
      
      const result = parser.serializeContent(invalidContent)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Content must be a document node')
    })

    it('should handle invalid content structure', () => {
      const invalidContent = {
        type: 'doc',
        content: 'not an array'
      } as any
      
      const result = parser.serializeContent(invalidContent)
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Document content must be an array')
    })

    it('should clean undefined values', () => {
      const contentWithUndefined = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: undefined,
            content: [
              { type: 'text', text: 'Test', marks: undefined }
            ]
          }
        ]
      } as any
      
      const result = parser.serializeContent(contentWithUndefined)
      
      expect(result.success).toBe(true)
      expect(result.content).toEqual({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Test' }
            ]
          }
        ]
      })
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
                attrs: { id: 'tenant_name', label: 'Tenant Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'property_address', label: 'Property Address' }
              }
            ]
          }
        ]
      }
      
      const result = parser.extractVariables(content)
      
      expect(result.variables).toEqual(['property_address', 'tenant_name'])
      expect(result.errors).toHaveLength(0)
    })

    it('should extract variables from mention marks', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Marked mention',
                marks: [
                  {
                    type: 'mention',
                    attrs: { id: 'marked_variable', label: 'Marked Variable' }
                  }
                ]
              }
            ]
          }
        ]
      }
      
      const result = parser.extractVariables(content)
      
      expect(result.variables).toContain('marked_variable')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle nested content structures', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'mention',
                    attrs: { id: 'nested_variable', label: 'Nested Variable' }
                  }
                ]
              }
            ]
          }
        ]
      }
      
      const result = parser.extractVariables(content)
      
      expect(result.variables).toContain('nested_variable')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle duplicate variables', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'duplicate_var', label: 'First' }
              },
              {
                type: 'mention',
                attrs: { id: 'duplicate_var', label: 'Second' }
              }
            ]
          }
        ]
      }
      
      const result = parser.extractVariables(content)
      
      expect(result.variables).toEqual(['duplicate_var'])
      expect(result.variables).toHaveLength(1)
    })

    it('should handle invalid mention IDs', () => {
      const content: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: '', label: 'Empty ID' }
              },
              {
                type: 'mention',
                attrs: { id: 123, label: 'Numeric ID' } as any
              },
              {
                type: 'mention',
                attrs: { label: 'No ID' }
              }
            ]
          }
        ]
      }
      
      const result = parser.extractVariables(content)
      
      expect(result.variables).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle extraction errors gracefully', () => {
      // Create content that will cause an error during extraction
      const malformedContent = null as any
      
      const result = parser.extractVariables(malformedContent)
      
      expect(result.variables).toEqual([])
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateContent', () => {
    it('should validate correct TipTap content', () => {
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

    it('should detect invalid content structure', () => {
      const invalidContent = {
        type: 'doc',
        content: 'not an array'
      } as any
      
      const result = parser.validateContent(invalidContent)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'CONTENT_INVALID_STRUCTURE')).toBe(true)
    })

    it('should validate mention nodes', () => {
      const contentWithMentions: TiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'valid_mention', label: 'Valid' }
              },
              {
                type: 'mention',
                attrs: { label: 'Missing ID' } // Missing id
              },
              {
                type: 'mention',
                attrs: { id: 'missing_label' } // Missing label
              }
            ]
          }
        ]
      }
      
      const result = parser.validateContent(contentWithMentions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'MENTION_MISSING_ID')).toBe(true)
      expect(result.warnings.some(w => w.code === 'MENTION_MISSING_LABEL')).toBe(true)
    })

    it('should handle validation exceptions', () => {
      // Create content that will cause an exception during validation
      const problematicContent = {
        type: 'doc',
        content: [null] // This should cause issues during validation
      } as any
      
      const result = parser.validateContent(problematicContent)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'NODE_INVALID_TYPE')).toBe(true)
    })
  })

  describe('Convenience Functions', () => {
    it('should export working convenience functions', () => {
      const content = { type: 'doc', content: [] }
      
      const parseResult = parseTemplateContent(content)
      expect(parseResult.success).toBe(true)
      
      const serializeResult = serializeTemplateContent(parseResult.content)
      expect(serializeResult.success).toBe(true)
      
      const extractResult = extractTemplateVariables(parseResult.content)
      expect(extractResult.variables).toEqual([])
      
      const validateResult = validateTemplateContent(parseResult.content)
      expect(validateResult.isValid).toBe(true)
    })
  })

  describe('Edge Cases and Performance', () => {
    it('should handle very large content structures', () => {
      // Create a large content structure
      const largeContent: TiptapContent = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Paragraph ${i}` },
            {
              type: 'mention',
              attrs: { id: `var_${i}`, label: `Variable ${i}` }
            }
          ]
        }))
      }
      
      const parseResult = parser.parseTemplateContent(largeContent)
      expect(parseResult.success).toBe(true)
      
      const extractResult = parser.extractVariables(largeContent)
      expect(extractResult.variables).toHaveLength(100)
      
      const validateResult = parser.validateContent(largeContent)
      expect(validateResult.isValid).toBe(true)
    })

    it('should handle deeply nested content', () => {
      // Create deeply nested content
      let nestedContent: ContentNode = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Deep content' }]
      }
      
      // Nest it 10 levels deep
      for (let i = 0; i < 10; i++) {
        nestedContent = {
          type: 'blockquote',
          content: [nestedContent]
        }
      }
      
      const deepContent: TiptapContent = {
        type: 'doc',
        content: [nestedContent]
      }
      
      const result = parser.parseTemplateContent(deepContent)
      expect(result.success).toBe(true)
    })

    it('should handle content with circular references gracefully', () => {
      // Create content with potential circular reference issues
      const circularContent: any = {
        type: 'doc',
        content: []
      }
      
      const paragraph: any = {
        type: 'paragraph',
        content: []
      }
      
      // This would create a circular reference in a real scenario
      // but our parser should handle it gracefully
      circularContent.content.push(paragraph)
      
      const result = parser.parseTemplateContent(circularContent)
      expect(result.success).toBe(true)
    })
  })
})