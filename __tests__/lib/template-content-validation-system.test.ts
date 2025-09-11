/**
 * Tests for Template Content Validation System
 * 
 * Comprehensive tests for the content validation system including
 * validation rules, edge cases, and malformed content handling.
 */

import {
  contentValidationSystem,
  ContentValidationSystem,
  type ContentValidationRule,
  type ContentValidationContext,
  type ContentValidationSummary
} from '../../lib/template-content-validation-system'

describe('ContentValidationSystem', () => {
  let validationSystem: ContentValidationSystem

  beforeEach(() => {
    validationSystem = new ContentValidationSystem()
  })

  describe('Basic Validation', () => {
    it('should validate empty content as invalid', () => {
      const result = validationSystem.validateContent(null)
      
      expect(result.isValid).toBe(false)
      expect(result.errorCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.structure).toBeDefined()
      expect(result.issuesByCategory.structure.some(issue => 
        issue.ruleId === 'empty_content'
      )).toBe(true)
    })

    it('should validate valid TipTap content as valid', () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is valid content with sufficient length.'
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(validContent)
      
      expect(result.isValid).toBe(true)
      expect(result.errorCount).toBe(0)
      expect(result.score).toBeGreaterThan(80)
    })

    it('should validate content with variables', () => {
      const contentWithVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello '
              },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              },
              {
                type: 'text',
                text: ', this is a template with variables.'
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithVariables)
      
      expect(result.isValid).toBe(true)
      expect(result.score).toBeGreaterThan(85)
    })
  })

  describe('Structure Validation', () => {
    it('should detect invalid document structure', () => {
      const invalidContent = {
        type: 'invalid',
        content: []
      }

      const result = validationSystem.validateContent(invalidContent)
      
      expect(result.isValid).toBe(false)
      expect(result.issuesByCategory.structure).toBeDefined()
      expect(result.issuesByCategory.structure.some(issue => 
        issue.ruleId === 'invalid_structure'
      )).toBe(true)
    })

    it('should detect missing headings in long content', () => {
      const longContentWithoutHeadings = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a very long paragraph that contains a lot of text content. '.repeat(20)
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(longContentWithoutHeadings)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.structure?.some(issue => 
        issue.ruleId === 'missing_headings'
      )).toBe(true)
    })

    it('should detect empty paragraphs', () => {
      const contentWithEmptyParagraphs = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Valid content'
              }
            ]
          },
          {
            type: 'paragraph',
            content: []
          },
          {
            type: 'paragraph',
            content: []
          },
          {
            type: 'paragraph',
            content: []
          },
          {
            type: 'paragraph',
            content: []
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithEmptyParagraphs)
      
      expect(result.infoCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.structure?.some(issue => 
        issue.ruleId === 'empty_paragraphs'
      )).toBe(true)
    })
  })

  describe('Content Length Validation', () => {
    it('should detect content that is too short', () => {
      const shortContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Short'
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(shortContent)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.content?.some(issue => 
        issue.ruleId === 'content_too_short'
      )).toBe(true)
    })

    it('should detect content that is too large', () => {
      const largeContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Very large content. '.repeat(10000)
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(largeContent)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.content?.some(issue => 
        issue.ruleId === 'content_too_long'
      )).toBe(true)
    })
  })

  describe('Variable Validation', () => {
    it('should detect invalid variables', () => {
      const contentWithInvalidVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello '
              },
              {
                type: 'mention',
                attrs: {
                  id: 'invalid-variable-name!',
                  label: 'Invalid Variable'
                }
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithInvalidVariables)
      
      expect(result.errorCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.variables?.some(issue => 
        issue.ruleId === 'invalid_variables'
      )).toBe(true)
    })

    it('should detect missing required variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Content without required variables'
              }
            ]
          }
        ]
      }

      const context: ContentValidationContext = {
        requiredVariables: ['tenant_name', 'property_address']
      }

      const result = validationSystem.validateContent(content, context)
      
      expect(result.errorCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.variables?.some(issue => 
        issue.ruleId === 'missing_required_variables'
      )).toBe(true)
    })

    it('should detect unused variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Content with used variable: '
              },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              }
            ]
          }
        ]
      }

      const context: ContentValidationContext = {
        existingVariables: ['tenant_name', 'property_address', 'unused_variable']
      }

      const result = validationSystem.validateContent(content, context)
      
      expect(result.infoCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.variables?.some(issue => 
        issue.ruleId === 'unused_variables'
      )).toBe(true)
    })
  })

  describe('Formatting Validation', () => {
    it('should detect inconsistent heading hierarchy', () => {
      const contentWithBadHeadings = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Heading 1' }]
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Heading 3 (skipped level 2)' }]
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithBadHeadings)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.accessibility?.some(issue => 
        issue.ruleId === 'poor_heading_hierarchy'
      )).toBe(true)
    })

    it('should detect excessive formatting', () => {
      const contentWithExcessiveFormatting = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Bold text',
                marks: [{ type: 'bold' }]
              },
              {
                type: 'text',
                text: ' and italic text',
                marks: [{ type: 'italic' }]
              },
              {
                type: 'text',
                text: ' and more bold',
                marks: [{ type: 'bold' }]
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithExcessiveFormatting)
      
      // This might trigger excessive formatting warning depending on ratio
      expect(result.score).toBeLessThan(100)
    })
  })

  describe('Accessibility Validation', () => {
    it('should detect images without alt text', () => {
      const contentWithImagesNoAlt = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Here is an image: '
              }
            ]
          },
          {
            type: 'image',
            attrs: {
              src: 'image.jpg'
              // Missing alt attribute
            }
          }
        ]
      }

      const result = validationSystem.validateContent(contentWithImagesNoAlt)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.accessibility?.some(issue => 
        issue.ruleId === 'missing_alt_text'
      )).toBe(true)
    })
  })

  describe('Real-time Validation', () => {
    it('should provide real-time validation results', () => {
      const content = {
        type: 'doc',
        content: []
      }

      const result = validationSystem.validateContentRealTime(content)
      
      expect(result).toBeDefined()
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should convert validation issues to real-time format', () => {
      const invalidContent = null

      const result = validationSystem.validateContentRealTime(invalidContent)
      
      expect(result.errors).toBeDefined()
      expect(result.warnings).toBeDefined()
      expect(result.suggestions).toBeDefined()
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Rule Configuration', () => {
    it('should allow enabling and disabling rules', () => {
      const content = {
        type: 'doc',
        content: []
      }

      // Disable empty content rule
      validationSystem.configureRule('empty_content', false)
      
      const result = validationSystem.validateContent(content)
      
      // Should have fewer errors now
      expect(result.issuesByCategory.structure?.some(issue => 
        issue.ruleId === 'empty_content'
      )).toBe(false)
    })

    it('should allow adding custom rules', () => {
      const customRule: ContentValidationRule = {
        id: 'custom_test_rule',
        name: 'Custom Test Rule',
        description: 'A custom rule for testing',
        severity: 'warning',
        category: 'content',
        enabled: true,
        validate: () => [{
          ruleId: 'custom_test_rule',
          severity: 'warning',
          message: 'Custom rule triggered'
        }]
      }

      validationSystem.addCustomRule(customRule)
      
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test content' }]
          }
        ]
      }

      const result = validationSystem.validateContent(content)
      
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.issuesByCategory.content?.some(issue => 
        issue.ruleId === 'custom_test_rule'
      )).toBe(true)
    })

    it('should return all available rules', () => {
      const rules = validationSystem.getAllRules()
      
      expect(rules).toBeDefined()
      expect(rules.length).toBeGreaterThan(0)
      expect(rules.every(rule => 
        rule.id && rule.name && rule.description && rule.severity && rule.category
      )).toBe(true)
    })

    it('should return enabled rules only', () => {
      // Disable some rules
      validationSystem.configureRule('empty_paragraphs', false)
      validationSystem.configureRule('content_too_short', false)
      
      const enabledRules = validationSystem.getEnabledRules()
      const allRules = validationSystem.getAllRules()
      
      expect(enabledRules.length).toBeLessThan(allRules.length)
      expect(enabledRules.every(rule => rule.enabled)).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const malformedContent = {
        type: 'doc',
        content: [
          {
            // Missing type
            content: [{ type: 'text', text: 'Malformed node' }]
          },
          {
            type: 'paragraph',
            // Invalid content structure
            content: 'invalid content'
          }
        ]
      }

      const result = validationSystem.validateContent(malformedContent)
      
      expect(result).toBeDefined()
      expect(result.isValid).toBe(false)
      expect(result.errorCount).toBeGreaterThan(0)
    })

    it('should handle circular references in content', () => {
      const circularContent: any = {
        type: 'doc',
        content: []
      }
      // Create circular reference
      circularContent.content.push(circularContent)

      const result = validationSystem.validateContent(circularContent)
      
      expect(result).toBeDefined()
      // Should not crash, even with circular reference
    })

    it('should handle very deep content nesting', () => {
      let deepContent: any = {
        type: 'doc',
        content: []
      }

      // Create deeply nested structure
      let current = deepContent
      for (let i = 0; i < 100; i++) {
        const nested = {
          type: 'paragraph',
          content: []
        }
        current.content.push(nested)
        current = nested
      }

      const result = validationSystem.validateContent(deepContent)
      
      expect(result).toBeDefined()
      // Should handle deep nesting without stack overflow
    })

    it('should handle null and undefined values', () => {
      expect(() => validationSystem.validateContent(null)).not.toThrow()
      expect(() => validationSystem.validateContent(undefined)).not.toThrow()
      expect(() => validationSystem.validateContent({})).not.toThrow()
    })

    it('should handle non-object content', () => {
      expect(() => validationSystem.validateContent('string')).not.toThrow()
      expect(() => validationSystem.validateContent(123)).not.toThrow()
      expect(() => validationSystem.validateContent(true)).not.toThrow()
      expect(() => validationSystem.validateContent([])).not.toThrow()
    })
  })

  describe('Validation Summary', () => {
    it('should calculate validation score correctly', () => {
      const perfectContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Perfect Template' }]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a well-structured template with proper content length and formatting. '
              },
              {
                type: 'mention',
                attrs: {
                  id: 'tenant_name',
                  label: 'Mieter Name'
                }
              },
              {
                type: 'text',
                text: ' will receive this perfectly formatted document.'
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(perfectContent)
      
      expect(result.score).toBeGreaterThan(90)
      expect(result.isValid).toBe(true)
      expect(result.recommendations).toContain('Ausgezeichnete Template-Qualität!')
    })

    it('should provide appropriate recommendations', () => {
      const problematicContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'invalid-variable!',
                  label: 'Invalid Variable'
                }
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(problematicContent)
      
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.recommendations.some(rec => 
        rec.includes('Fehler') || rec.includes('Überarbeitung')
      )).toBe(true)
    })

    it('should group issues by category correctly', () => {
      const mixedIssuesContent = {
        type: 'invalid',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'invalid-var!',
                  label: 'Invalid'
                }
              }
            ]
          }
        ]
      }

      const result = validationSystem.validateContent(mixedIssuesContent)
      
      expect(Object.keys(result.issuesByCategory).length).toBeGreaterThan(1)
      expect(result.issuesByCategory.structure).toBeDefined()
      expect(result.issuesByCategory.variables).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should validate large content efficiently', () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 1000 }, (_, i) => ({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `Paragraph ${i + 1} with some content to make it realistic.`
            }
          ]
        }))
      }

      const startTime = Date.now()
      const result = validationSystem.validateContent(largeContent)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle validation of multiple contents in sequence', () => {
      const contents = Array.from({ length: 10 }, (_, i) => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Content ${i + 1}`
              }
            ]
          }
        ]
      }))

      const startTime = Date.now()
      const results = contents.map(content => validationSystem.validateContent(content))
      const endTime = Date.now()

      expect(results.length).toBe(10)
      expect(results.every(result => result !== null)).toBe(true)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})

describe('Singleton Instance', () => {
  it('should provide a working singleton instance', () => {
    expect(contentValidationSystem).toBeDefined()
    expect(contentValidationSystem.getAllRules).toBeDefined()
    expect(contentValidationSystem.validateContent).toBeDefined()
  })

  it('should maintain state across calls', () => {
    const initialRules = contentValidationSystem.getAllRules()
    
    contentValidationSystem.configureRule('empty_content', false)
    
    const content = {
      type: 'doc',
      content: []
    }

    const result = contentValidationSystem.validateContent(content)
    
    // Rule should be disabled
    expect(result.issuesByCategory.structure?.some(issue => 
      issue.ruleId === 'empty_content'
    )).toBe(false)

    // Re-enable rule
    contentValidationSystem.configureRule('empty_content', true)
    
    const result2 = contentValidationSystem.validateContent(content)
    
    // Rule should be enabled again
    expect(result2.issuesByCategory.structure?.some(issue => 
      issue.ruleId === 'empty_content'
    )).toBe(true)
  })
})