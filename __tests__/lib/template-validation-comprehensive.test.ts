/**
 * Comprehensive Unit Tests for Template Validation System
 * 
 * Tests all aspects of template validation including:
 * - Zod schema validation integration
 * - Enhanced validation with business rules
 * - Error handling and recovery scenarios
 * - Cross-field validation logic
 * - Performance with large datasets
 * - Edge cases and malformed data
 */

import { 
  TemplateValidator,
  type TemplateValidationData,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning
} from '../../lib/template-validation'
import {
  validateTemplateTitle,
  validateTemplateCategory,
  validateTemplateContent,
  validateCreateTemplateRequest,
  validateUpdateTemplateRequest,
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS
} from '../../lib/template-validation-schemas'
import { validateTemplateContent as validateVariableContent } from '../../lib/template-variable-validation'

// Mock dependencies
jest.mock('../../lib/template-error-handler')
jest.mock('../../lib/template-variable-validation')

describe('Template Validation Comprehensive Tests', () => {
  let validator: TemplateValidator

  beforeEach(() => {
    validator = new TemplateValidator()
    jest.clearAllMocks()
    
    // Mock variable validation
    ;(validateVariableContent as jest.Mock).mockReturnValue({
      errors: [],
      warnings: []
    })
  })

  describe('TemplateValidator Initialization', () => {
    it('should initialize with default rules', () => {
      const defaultValidator = new TemplateValidator()
      expect(defaultValidator).toBeDefined()
    })

    it('should initialize with custom rules', () => {
      const customRules = {
        titel: {
          required: true,
          minLength: 5,
          maxLength: 50,
          pattern: /^[A-Z]/
        }
      }
      
      const customValidator = new TemplateValidator(customRules as any)
      expect(customValidator).toBeDefined()
    })

    it('should allow disabling Zod validation', () => {
      const legacyValidator = new TemplateValidator(undefined, false)
      expect(legacyValidator).toBeDefined()
    })
  })

  describe('Complete Template Validation', () => {
    it('should validate complete valid template data', () => {
      const validData: TemplateValidationData = {
        titel: 'Valid Template Title',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Valid content with ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Mieter Name' }
                }
              ]
            }
          ]
        },
        kategorie: 'Valid Category',
        kontext_anforderungen: ['tenant_name']
      }

      const result = validator.validate(validData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeLessThanOrEqual(1) // May have minor warnings
    })

    it('should detect multiple validation errors across fields', () => {
      const invalidData: TemplateValidationData = {
        titel: '', // Invalid: empty
        inhalt: null, // Invalid: null
        kategorie: 'A'.repeat(150), // Invalid: too long
        kontext_anforderungen: ['invalid-variable-name!'] // Invalid: format
      }

      const result = validator.validate(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(3)
      
      // Should have errors for each field
      expect(result.errors.some(e => e.field === 'titel')).toBe(true)
      expect(result.errors.some(e => e.field === 'inhalt')).toBe(true)
      expect(result.errors.some(e => e.field === 'kategorie')).toBe(true)
    })

    it('should generate appropriate warnings for potential issues', () => {
      const dataWithWarnings: TemplateValidationData = {
        titel: 'A'.repeat(90), // Long but valid
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Content without variables' }
              ]
            }
          ]
        },
        kategorie: 'Category with <special> characters',
        kontext_anforderungen: []
      }

      const result = validator.validate(dataWithWarnings)

      expect(result.isValid).toBe(true) // Valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle validation system errors gracefully', () => {
      // Mock Zod validation to throw an error
      jest.spyOn(validator as any, 'validateWithZod').mockImplementationOnce(() => {
        throw new Error('Validation system error')
      })

      const result = validator.validate({
        titel: 'Test Title',
        kategorie: 'Test Category'
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'VALIDATION_SYSTEM_ERROR')).toBe(true)
    })
  })

  describe('Zod Schema Integration', () => {
    it('should use Zod validation when enabled', () => {
      const zodValidator = new TemplateValidator(undefined, true)
      
      const result = zodValidator.validate({
        titel: 'Valid Title',
        kategorie: 'Valid Category',
        inhalt: {
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
      })

      expect(result.isValid).toBe(true)
    })

    it('should fall back to legacy validation when Zod fails', () => {
      const zodValidator = new TemplateValidator(undefined, true)
      
      // Mock Zod validation to fail
      jest.spyOn(zodValidator as any, 'validateWithZod').mockReturnValueOnce({
        isValid: false,
        errors: [{ field: 'titel', message: 'Zod error', code: 'ZOD_ERROR' }],
        warnings: []
      })

      const result = zodValidator.validate({
        titel: 'Valid Title',
        kategorie: 'Valid Category'
      })

      // Should still run legacy validation
      expect(result).toBeDefined()
    })

    it('should combine Zod and legacy validation results', () => {
      const result = validator.validate({
        titel: '', // Should trigger both Zod and legacy errors
        kategorie: 'Valid Category'
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Enhanced Field Validation', () => {
    describe('Title Validation Enhanced', () => {
      it('should validate unique titles', () => {
        const existingTitles = ['Existing Template 1', 'Existing Template 2']
        
        const result = validator.validateTitleEnhanced('New Unique Title', existingTitles)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect duplicate titles', () => {
        const existingTitles = ['Existing Template', 'Another Template']
        
        const result = validator.validateTitleEnhanced('Existing Template', existingTitles)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'TITLE_DUPLICATE')).toBe(true)
      })

      it('should warn about temporary titles', () => {
        const testCases = [
          'Test Template',
          'temp document',
          'TEMPORARY FILE',
          'test123'
        ]

        testCases.forEach(title => {
          const result = validator.validateTitleEnhanced(title, [])
          expect(result.warnings.some(w => w.code === 'TITLE_TEMPORARY')).toBe(true)
        })
      })

      it('should warn about generic titles', () => {
        const genericTitles = [
          'Template',
          'Vorlage',
          'Document',
          'Dokument',
          'New',
          'Neu'
        ]

        genericTitles.forEach(title => {
          const result = validator.validateTitleEnhanced(title, [])
          expect(result.warnings.some(w => w.code === 'TITLE_GENERIC')).toBe(true)
        })
      })

      it('should handle edge cases in title validation', () => {
        const edgeCases = [
          { title: '', expectedValid: false },
          { title: '   ', expectedValid: false },
          { title: 'A', expectedValid: true },
          { title: 'A'.repeat(255), expectedValid: true },
          { title: 'A'.repeat(256), expectedValid: false }
        ]

        edgeCases.forEach(testCase => {
          const result = validator.validateTitleEnhanced(testCase.title, [])
          expect(result.isValid).toBe(testCase.expectedValid)
        })
      })
    })

    describe('Category Validation Enhanced', () => {
      it('should validate existing categories', () => {
        const existingCategories = ['Mietverträge', 'Kündigungen', 'Nebenkostenabrechnungen']
        
        const result = validator.validateCategoryEnhanced('Mietverträge', existingCategories)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should warn about new categories', () => {
        const existingCategories = ['Mietverträge', 'Kündigungen']
        
        const result = validator.validateCategoryEnhanced('New Category', existingCategories)

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.code === 'CATEGORY_NEW')).toBe(true)
      })

      it('should suggest similar existing categories', () => {
        const existingCategories = ['Mietverträge', 'Mietvertrag Templates', 'Verträge']
        
        const result = validator.validateCategoryEnhanced('Mietvertrag', existingCategories)

        expect(result.warnings.some(w => w.code === 'CATEGORY_SIMILAR_EXISTS')).toBe(true)
        expect(result.warnings.find(w => w.code === 'CATEGORY_SIMILAR_EXISTS')?.value)
          .toEqual(expect.objectContaining({
            category: 'Mietvertrag',
            similar: expect.arrayContaining(['Mietverträge', 'Mietvertrag Templates'])
          }))
      })

      it('should calculate string similarity accurately', () => {
        const testCases = [
          { str1: 'Mietvertrag', str2: 'Mietverträge', expectedSimilar: true },
          { str1: 'Contract', str2: 'Vertrag', expectedSimilar: false },
          { str1: 'Test', str2: 'Test', expectedSimilar: true },
          { str1: 'ABC', str2: 'XYZ', expectedSimilar: false }
        ]

        testCases.forEach(testCase => {
          const similarity = validator['calculateStringSimilarity'](testCase.str1, testCase.str2)
          if (testCase.expectedSimilar) {
            expect(similarity).toBeGreaterThan(0.6)
          } else {
            expect(similarity).toBeLessThanOrEqual(0.6)
          }
        })
      })
    })

    describe('Content Validation Enhanced', () => {
      it('should validate simple content structure', () => {
        const content = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Simple content' }
              ]
            }
          ]
        }

        const result = validator.validateContentEnhanced(content)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should warn about complex content', () => {
        const complexContent = {
          type: 'doc',
          content: Array.from({ length: 150 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `Complex paragraph ${i}` }
            ]
          }))
        }

        const result = validator.validateContentEnhanced(complexContent)

        expect(result.warnings.some(w => w.code === 'CONTENT_COMPLEX')).toBe(true)
        expect(result.warnings.find(w => w.code === 'CONTENT_COMPLEX')?.value)
          .toEqual(expect.objectContaining({
            nodeCount: expect.any(Number)
          }))
      })

      it('should detect empty paragraphs', () => {
        const contentWithEmptyParagraphs = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Valid content' }
              ]
            },
            {
              type: 'paragraph',
              content: [] // Empty
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '' } // Empty text
              ]
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '   ' } // Whitespace only
              ]
            }
          ]
        }

        const result = validator.validateContentEnhanced(contentWithEmptyParagraphs)

        expect(result.warnings.some(w => w.code === 'CONTENT_EMPTY_PARAGRAPHS')).toBe(true)
        expect(result.warnings.find(w => w.code === 'CONTENT_EMPTY_PARAGRAPHS')?.value)
          .toBeGreaterThan(0)
      })

      it('should warn about missing structure in long content', () => {
        const longContentWithoutHeadings = {
          type: 'doc',
          content: Array.from({ length: 15 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `Long paragraph content ${i} with sufficient text to make it realistic.` }
            ]
          }))
        }

        const result = validator.validateContentEnhanced(longContentWithoutHeadings)

        expect(result.warnings.some(w => w.code === 'CONTENT_NO_HEADINGS')).toBe(true)
      })

      it('should calculate content complexity metrics', () => {
        const complexContent = {
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
                { type: 'text', text: 'Text with ' },
                {
                  type: 'mention',
                  attrs: { id: 'variable', label: 'Variable' }
                }
              ]
            },
            {
              type: 'paragraph',
              content: [] // Empty paragraph
            }
          ]
        }

        const complexity = validator['calculateContentComplexity'](complexContent)

        expect(complexity.nodeCount).toBeGreaterThan(0)
        expect(complexity.textLength).toBeGreaterThan(0)
        expect(complexity.variableCount).toBe(1)
        expect(complexity.headingCount).toBe(1)
        expect(complexity.emptyParagraphs).toBe(1)
      })
    })
  })

  describe('Cross-field Validation', () => {
    it('should detect title-category mismatch', () => {
      const data: TemplateValidationData = {
        titel: 'Rental Agreement Template',
        kategorie: 'Kündigungen' // Termination category doesn't match rental title
      }

      const result = validator.validate(data)

      expect(result.warnings.some(w => w.code === 'TITLE_CATEGORY_MISMATCH')).toBe(true)
    })

    it('should warn about missing context requirements with variables', () => {
      const data: TemplateValidationData = {
        titel: 'Template with Variables',
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
        kontext_anforderungen: [] // Empty despite having variables
      }

      const result = validator.validate(data)

      expect(result.warnings.some(w => w.code === 'MISSING_CONTEXT_REQUIREMENTS')).toBe(true)
    })

    it('should warn about unused context requirements', () => {
      const data: TemplateValidationData = {
        titel: 'Template without Variables',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Plain text content' }
              ]
            }
          ]
        },
        kategorie: 'Test Category',
        kontext_anforderungen: ['tenant_name', 'landlord_name'] // Has requirements but no variables
      }

      const result = validator.validate(data)

      expect(result.warnings.some(w => w.code === 'UNUSED_CONTEXT_REQUIREMENTS')).toBe(true)
    })

    it('should handle complex cross-field scenarios', () => {
      const data: TemplateValidationData = {
        titel: 'Mietvertrag Template', // Matches category
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Contract for ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Mieter Name' }
                },
                { type: 'text', text: ' at ' },
                {
                  type: 'mention',
                  attrs: { id: 'property_address', label: 'Objektadresse' }
                }
              ]
            }
          ]
        },
        kategorie: 'Mietverträge', // Matches title
        kontext_anforderungen: ['tenant_name', 'property_address'] // Matches variables
      }

      const result = validator.validate(data)

      expect(result.isValid).toBe(true)
      // Should have minimal warnings for this well-structured data
      expect(result.warnings.filter(w => 
        w.code === 'TITLE_CATEGORY_MISMATCH' ||
        w.code === 'MISSING_CONTEXT_REQUIREMENTS' ||
        w.code === 'UNUSED_CONTEXT_REQUIREMENTS'
      )).toHaveLength(0)
    })
  })

  describe('Individual Field Validation', () => {
    describe('Title Validation', () => {
      it('should validate various title formats', () => {
        const testCases = [
          { title: 'Valid Title', expectedValid: true },
          { title: 'Title with Numbers 123', expectedValid: true },
          { title: 'Title-with-Dashes', expectedValid: true },
          { title: 'Title_with_Underscores', expectedValid: true },
          { title: 'Title with Umlauts äöü', expectedValid: true },
          { title: '', expectedValid: false },
          { title: '   ', expectedValid: false },
          { title: 'A', expectedValid: true },
          { title: 'AB', expectedValid: true },
          { title: 'A'.repeat(255), expectedValid: true },
          { title: 'A'.repeat(256), expectedValid: false }
        ]

        testCases.forEach(testCase => {
          const result = validator['validateTitle'](testCase.title)
          expect(result.isValid).toBe(testCase.expectedValid)
        })
      })

      it('should detect invalid characters in titles', () => {
        const invalidTitles = [
          'Title with <tags>',
          'Title with {braces}',
          'Title with [brackets]',
          'Title with <script>alert("xss")</script>'
        ]

        invalidTitles.forEach(title => {
          const result = validator['validateTitle'](title)
          expect(result.isValid).toBe(false)
          expect(result.errors.some(e => e.code === 'TITLE_INVALID_CHARACTERS')).toBe(true)
        })
      })

      it('should warn about very long titles', () => {
        const longTitle = 'A'.repeat(150)
        const result = validator['validateTitle'](longTitle)

        expect(result.warnings.some(w => w.code === 'TITLE_VERY_LONG')).toBe(true)
      })
    })

    describe('Category Validation', () => {
      it('should validate various category formats', () => {
        const testCases = [
          { category: 'Valid Category', expectedValid: true },
          { category: 'Mietverträge', expectedValid: true },
          { category: 'Category-with-Dashes', expectedValid: true },
          { category: 'Category_with_Underscores', expectedValid: true },
          { category: '', expectedValid: false },
          { category: '   ', expectedValid: false },
          { category: 'A'.repeat(100), expectedValid: true },
          { category: 'A'.repeat(101), expectedValid: false }
        ]

        testCases.forEach(testCase => {
          const result = validator['validateCategory'](testCase.category)
          expect(result.isValid).toBe(testCase.expectedValid)
        })
      })

      it('should warn about special characters in categories', () => {
        const categoriesWithSpecialChars = [
          'Category with <tags>',
          'Category with {braces}',
          'Category/with/slashes',
          'Category\\with\\backslashes'
        ]

        categoriesWithSpecialChars.forEach(category => {
          const result = validator['validateCategory'](category)
          expect(result.warnings.some(w => w.code === 'CATEGORY_SPECIAL_CHARACTERS')).toBe(true)
        })
      })
    })

    describe('Content Validation', () => {
      it('should validate various content structures', () => {
        const testCases = [
          {
            name: 'valid simple content',
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Valid content' }
                  ]
                }
              ]
            },
            expectedValid: true
          },
          {
            name: 'valid complex content',
            content: {
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
                    {
                      type: 'mention',
                      attrs: { id: 'variable', label: 'Variable' }
                    }
                  ]
                }
              ]
            },
            expectedValid: true
          },
          {
            name: 'invalid root type',
            content: {
              type: 'paragraph',
              content: []
            },
            expectedValid: false
          },
          {
            name: 'missing content array',
            content: {
              type: 'doc'
            },
            expectedValid: false
          },
          {
            name: 'non-object content',
            content: 'string content',
            expectedValid: false
          }
        ]

        testCases.forEach(testCase => {
          const result = validator['validateContent'](testCase.content)
          expect(result.isValid).toBe(testCase.expectedValid)
        })
      })

      it('should detect content that is too large', () => {
        const largeContent = {
          type: 'doc',
          content: Array.from({ length: 1000 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: 'A'.repeat(1000) }
            ]
          }))
        }

        const result = validator['validateContent'](largeContent)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTENT_TOO_LARGE')).toBe(true)
      })

      it('should warn about large content', () => {
        const largeContent = {
          type: 'doc',
          content: Array.from({ length: 100 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: 'A'.repeat(100) }
            ]
          }))
        }

        const result = validator['validateContent'](largeContent)

        expect(result.warnings.some(w => w.code === 'CONTENT_LARGE')).toBe(true)
      })

      it('should detect empty content', () => {
        const emptyContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: []
            }
          ]
        }

        const result = validator['validateContent'](emptyContent)

        expect(result.warnings.some(w => w.code === 'CONTENT_EMPTY')).toBe(true)
      })
    })

    describe('Context Requirements Validation', () => {
      it('should validate various context requirement formats', () => {
        const testCases = [
          {
            requirements: ['valid_variable', 'another_variable'],
            expectedValid: true
          },
          {
            requirements: ['tenant_name', 'landlord_name', 'property_address'],
            expectedValid: true
          },
          {
            requirements: [],
            expectedValid: true
          },
          {
            requirements: 'not an array',
            expectedValid: false
          },
          {
            requirements: ['valid_var', '123invalid', ''],
            expectedValid: false
          },
          {
            requirements: ['valid_var', 'invalid-var', 'invalid var'],
            expectedValid: false
          }
        ]

        testCases.forEach(testCase => {
          const result = validator['validateContextRequirements'](testCase.requirements as any)
          expect(result.isValid).toBe(testCase.expectedValid)
        })
      })

      it('should detect duplicate requirements', () => {
        const result = validator['validateContextRequirements']([
          'tenant_name',
          'landlord_name',
          'tenant_name' // Duplicate
        ])

        expect(result.warnings.some(w => w.code === 'CONTEXT_DUPLICATES')).toBe(true)
      })

      it('should warn about many requirements', () => {
        const manyRequirements = Array.from({ length: 25 }, (_, i) => `variable_${i}`)
        const result = validator['validateContextRequirements'](manyRequirements)

        expect(result.warnings.some(w => w.code === 'CONTEXT_MANY_REQUIREMENTS')).toBe(true)
      })
    })
  })

  describe('Validation for Different Operations', () => {
    describe('Creation Validation', () => {
      it('should validate complete creation data', () => {
        const createData = {
          titel: 'New Template',
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'New template content' }
                ]
              }
            ]
          },
          kategorie: 'New Category',
          user_id: 'user-123'
        }

        const result = validator.validateForCreation(createData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject incomplete creation data', () => {
        const incompleteData = {
          titel: 'New Template'
          // Missing required fields
        }

        const result = validator.validateForCreation(incompleteData)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('Update Validation', () => {
      it('should validate partial update data', () => {
        const updateData = {
          titel: 'Updated Title'
          // Other fields optional for updates
        }

        const result = validator.validateForUpdate(updateData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate complete update data', () => {
        const updateData = {
          titel: 'Updated Template',
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Updated content' }
                ]
              }
            ]
          },
          kategorie: 'Updated Category'
        }

        const result = validator.validateForUpdate(updateData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('Static Validation Methods', () => {
    it('should provide working static validation methods', () => {
      expect(TemplateValidator.validateTitle('Valid Title')).toBe(true)
      expect(TemplateValidator.validateTitle('')).toBe(false)
      expect(TemplateValidator.validateTitle('A'.repeat(300))).toBe(false)

      expect(TemplateValidator.validateCategory('Valid Category')).toBe(true)
      expect(TemplateValidator.validateCategory('')).toBe(false)
      expect(TemplateValidator.validateCategory('A'.repeat(150))).toBe(false)

      const validContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }
      expect(TemplateValidator.validateContent(validContent)).toBe(true)
      expect(TemplateValidator.validateContent(null)).toBe(false)
      expect(TemplateValidator.validateContent('invalid')).toBe(false)
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize template data properly', () => {
      const dirtyData = {
        titel: '  Title with spaces  ',
        kategorie: '  Category with spaces  ',
        kontext_anforderungen: [
          'valid_var',
          '',
          '  spaced_var  ',
          'invalid var',
          'another_valid_var'
        ]
      }

      const sanitized = TemplateValidator.sanitizeTemplateData(dirtyData)

      expect(sanitized.titel).toBe('Title with spaces')
      expect(sanitized.kategorie).toBe('Category with spaces')
      expect(sanitized.kontext_anforderungen).toEqual([
        'valid_var',
        'spaced_var',
        'another_valid_var'
      ])
    })

    it('should limit field lengths during sanitization', () => {
      const dataWithLongFields = {
        titel: 'A'.repeat(300),
        kategorie: 'B'.repeat(150),
        kontext_anforderungen: Array.from({ length: 100 }, (_, i) => `var_${i}`)
      }

      const sanitized = TemplateValidator.sanitizeTemplateData(dataWithLongFields)

      expect(sanitized.titel.length).toBeLessThanOrEqual(VALIDATION_LIMITS.TITLE_MAX_LENGTH)
      expect(sanitized.kategorie.length).toBeLessThanOrEqual(VALIDATION_LIMITS.CATEGORY_MAX_LENGTH)
      expect(sanitized.kontext_anforderungen.length).toBeLessThanOrEqual(VALIDATION_LIMITS.MAX_CONTEXT_REQUIREMENTS)
    })

    it('should handle null and undefined values in sanitization', () => {
      const dataWithNulls = {
        titel: null,
        kategorie: undefined,
        kontext_anforderungen: null
      }

      const sanitized = TemplateValidator.sanitizeTemplateData(dataWithNulls)

      expect(sanitized.titel).toBeNull()
      expect(sanitized.kategorie).toBeUndefined()
      expect(sanitized.kontext_anforderungen).toBeNull()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', () => {
      const largeData: TemplateValidationData = {
        titel: 'Large Template',
        inhalt: {
          type: 'doc',
          content: Array.from({ length: 1000 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `Paragraph ${i}` }
            ]
          }))
        },
        kategorie: 'Large Category',
        kontext_anforderungen: Array.from({ length: 50 }, (_, i) => `variable_${i}`)
      }

      const startTime = Date.now()
      const result = validator.validate(largeData)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        titel: { invalid: 'object' },
        inhalt: 'not an object',
        kategorie: 123,
        kontext_anforderungen: 'not an array'
      }

      const result = validator.validate(malformedData as any)

      expect(result).toBeDefined()
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle circular references safely', () => {
      const circularData: any = {
        titel: 'Circular Test'
      }
      circularData.inhalt = circularData

      const result = validator.validate(circularData)

      expect(result).toBeDefined()
      // Should not crash or hang
    })

    it('should handle deeply nested content', () => {
      let deepContent: any = {
        type: 'doc',
        content: []
      }

      // Create deeply nested structure
      let current = deepContent
      for (let i = 0; i < 100; i++) {
        const nested = {
          type: 'paragraph',
          content: [
            { type: 'text', text: `Level ${i}` }
          ]
        }
        current.content.push(nested)
        
        if (i < 99) {
          nested.content = []
          current = nested
        }
      }

      const result = validator.validate({
        titel: 'Deep Content Test',
        inhalt: deepContent,
        kategorie: 'Test'
      })

      expect(result).toBeDefined()
      // Should handle deep nesting without stack overflow
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from validation method errors', () => {
      // Mock a validation method to throw an error
      jest.spyOn(validator as any, 'validateTitle').mockImplementationOnce(() => {
        throw new Error('Title validation error')
      })

      const result = validator.validate({
        titel: 'Test Title',
        kategorie: 'Test Category'
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'VALIDATION_SYSTEM_ERROR')).toBe(true)
    })

    it('should handle variable validation errors', () => {
      ;(validateVariableContent as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Variable validation error')
      })

      const result = validator.validate({
        titel: 'Test Title',
        inhalt: {
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
        },
        kategorie: 'Test Category'
      })

      expect(result).toBeDefined()
      // Should still provide some validation results
    })

    it('should provide meaningful error messages', () => {
      const result = validator.validate({
        titel: '',
        inhalt: null,
        kategorie: '',
        kontext_anforderungen: ['invalid-var!']
      })

      expect(result.errors.every(error => 
        error.message && 
        error.code && 
        error.field
      )).toBe(true)

      // Error messages should be in German for user-facing validation
      expect(result.errors.some(error => 
        error.message.includes('erforderlich') ||
        error.message.includes('ungültig') ||
        error.message.includes('Fehler')
      )).toBe(true)
    })
  })
})