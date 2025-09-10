/**
 * Unit tests for Template Validation System
 * Tests comprehensive validation logic, error handling, and Zod integration
 */

import { TemplateValidator } from '../../lib/template-validation'
import { 
  validateTemplateTitle,
  validateTemplateCategory,
  validateTemplateContent,
  validateCreateTemplateRequest,
  validateUpdateTemplateRequest,
  VALIDATION_LIMITS
} from '../../lib/template-validation-schemas'
import { TemplateErrorHandler, TemplateErrorType } from '../../lib/template-error-handler'
import type { TemplateValidationData, ValidationResult } from '../../lib/template-validation'

// Mock dependencies
jest.mock('../../lib/template-error-handler')
jest.mock('../../lib/template-variable-validation')

describe('Template Validation Unit Tests', () => {
  let validator: TemplateValidator

  beforeEach(() => {
    validator = new TemplateValidator()
    jest.clearAllMocks()
  })

  describe('TemplateValidator Class', () => {
    describe('validate method', () => {
      it('should validate complete template data successfully', () => {
        const validData: TemplateValidationData = {
          titel: 'Valid Template Title',
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
          },
          kategorie: 'Valid Category',
          kontext_anforderungen: ['tenant_name']
        }

        const result = validator.validate(validData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should detect multiple validation errors', () => {
        const invalidData: TemplateValidationData = {
          titel: '', // Invalid: empty
          inhalt: null, // Invalid: null
          kategorie: '', // Invalid: empty
          kontext_anforderungen: ['invalid-variable-name'] // Invalid: format
        }

        const result = validator.validate(invalidData)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some(e => e.field === 'titel')).toBe(true)
        expect(result.errors.some(e => e.field === 'inhalt')).toBe(true)
        expect(result.errors.some(e => e.field === 'kategorie')).toBe(true)
      })

      it('should generate warnings for potential issues', () => {
        const dataWithWarnings: TemplateValidationData = {
          titel: 'A'.repeat(150), // Long title
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

        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings.some(w => w.code === 'TITLE_VERY_LONG')).toBe(true)
        expect(result.warnings.some(w => w.code === 'CATEGORY_SPECIAL_CHARACTERS')).toBe(true)
      })

      it('should handle validation system errors gracefully', () => {
        // Mock Zod validation to throw an error
        const originalValidate = validator.validate
        jest.spyOn(validator as any, 'validateWithZod').mockImplementation(() => {
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

    describe('validateForCreation method', () => {
      it('should validate creation data with all required fields', () => {
        const createData = {
          titel: 'New Template',
          inhalt: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          },
          kategorie: 'New Category',
          user_id: 'user-123'
        }

        const result = validator.validateForCreation(createData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject creation data missing required fields', () => {
        const incompleteData = {
          titel: 'New Template'
          // Missing required fields
        }

        const result = validator.validateForCreation(incompleteData)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('validateForUpdate method', () => {
      it('should validate update data with partial fields', () => {
        const updateData = {
          titel: 'Updated Title'
          // Other fields optional for updates
        }

        const result = validator.validateForUpdate(updateData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should validate update data with all fields', () => {
        const updateData = {
          titel: 'Updated Template',
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
          kategorie: 'Updated Category'
        }

        const result = validator.validateForUpdate(updateData)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('validateTitleEnhanced method', () => {
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
        const result = validator.validateTitleEnhanced('Test Template', [])

        expect(result.warnings.some(w => w.code === 'TITLE_TEMPORARY')).toBe(true)
      })

      it('should warn about generic titles', () => {
        const result = validator.validateTitleEnhanced('Template', [])

        expect(result.warnings.some(w => w.code === 'TITLE_GENERIC')).toBe(true)
      })
    })

    describe('validateCategoryEnhanced method', () => {
      it('should validate existing categories', () => {
        const existingCategories = ['Mietverträge', 'Kündigungen']
        
        const result = validator.validateCategoryEnhanced('Mietverträge', existingCategories)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should warn about new categories', () => {
        const existingCategories = ['Mietverträge', 'Kündigungen']
        
        const result = validator.validateCategoryEnhanced('New Category', existingCategories)

        expect(result.warnings.some(w => w.code === 'CATEGORY_NEW')).toBe(true)
      })

      it('should suggest similar existing categories', () => {
        const existingCategories = ['Mietverträge', 'Mietvertrag Templates']
        
        const result = validator.validateCategoryEnhanced('Mietvertrag', existingCategories)

        expect(result.warnings.some(w => w.code === 'CATEGORY_SIMILAR_EXISTS')).toBe(true)
      })
    })

    describe('validateContentEnhanced method', () => {
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
        // Create content with many nodes
        const complexContent = {
          type: 'doc',
          content: Array.from({ length: 150 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `Paragraph ${i}` }
            ]
          }))
        }

        const result = validator.validateContentEnhanced(complexContent)

        expect(result.warnings.some(w => w.code === 'CONTENT_COMPLEX')).toBe(true)
      })

      it('should warn about empty paragraphs', () => {
        const contentWithEmptyParagraphs = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Content' }
              ]
            },
            {
              type: 'paragraph',
              content: [] // Empty paragraph
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: '' } // Empty text
              ]
            }
          ]
        }

        const result = validator.validateContentEnhanced(contentWithEmptyParagraphs)

        expect(result.warnings.some(w => w.code === 'CONTENT_EMPTY_PARAGRAPHS')).toBe(true)
      })

      it('should warn about missing structure in long content', () => {
        const longContentWithoutHeadings = {
          type: 'doc',
          content: Array.from({ length: 15 }, (_, i) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `Long paragraph content ${i}` }
            ]
          }))
        }

        const result = validator.validateContentEnhanced(longContentWithoutHeadings)

        expect(result.warnings.some(w => w.code === 'CONTENT_NO_HEADINGS')).toBe(true)
      })
    })
  })

  describe('Cross-field Validation', () => {
    it('should warn about title-category mismatch', () => {
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
        kontext_anforderungen: ['tenant_name'] // Has requirements but no variables
      }

      const result = validator.validate(data)

      expect(result.warnings.some(w => w.code === 'UNUSED_CONTEXT_REQUIREMENTS')).toBe(true)
    })
  })

  describe('Individual Field Validation', () => {
    describe('Title validation', () => {
      it('should validate correct titles', () => {
        const result = validator['validateTitle']('Valid Template Title')

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty titles', () => {
        const result = validator['validateTitle']('')

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'TITLE_REQUIRED')).toBe(true)
      })

      it('should reject titles that are too long', () => {
        const longTitle = 'A'.repeat(300)
        const result = validator['validateTitle'](longTitle)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'TITLE_TOO_LONG')).toBe(true)
      })

      it('should reject titles with invalid characters', () => {
        const result = validator['validateTitle']('Title with <invalid> characters')

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'TITLE_INVALID_CHARACTERS')).toBe(true)
      })

      it('should warn about very long titles', () => {
        const longTitle = 'A'.repeat(150)
        const result = validator['validateTitle'](longTitle)

        expect(result.warnings.some(w => w.code === 'TITLE_VERY_LONG')).toBe(true)
      })
    })

    describe('Category validation', () => {
      it('should validate correct categories', () => {
        const result = validator['validateCategory']('Valid Category')

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty categories', () => {
        const result = validator['validateCategory']('')

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CATEGORY_REQUIRED')).toBe(true)
      })

      it('should reject categories that are too long', () => {
        const longCategory = 'A'.repeat(150)
        const result = validator['validateCategory'](longCategory)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CATEGORY_TOO_LONG')).toBe(true)
      })

      it('should warn about unknown categories', () => {
        const validator = new TemplateValidator({
          kategorie: {
            required: true,
            maxLength: 100,
            allowedValues: ['Known Category']
          }
        } as any)

        const result = validator['validateCategory']('Unknown Category')

        expect(result.warnings.some(w => w.code === 'CATEGORY_UNKNOWN')).toBe(true)
      })
    })

    describe('Content validation', () => {
      it('should validate correct Tiptap content', () => {
        const content = {
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

        const result = validator['validateContent'](content)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject content without doc type', () => {
        const content = {
          type: 'paragraph', // Should be 'doc'
          content: []
        }

        const result = validator['validateContent'](content)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTENT_INVALID_FORMAT')).toBe(true)
      })

      it('should reject content without content array', () => {
        const content = {
          type: 'doc'
          // Missing content array
        }

        const result = validator['validateContent'](content)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTENT_INVALID_STRUCTURE')).toBe(true)
      })

      it('should reject non-object content', () => {
        const result = validator['validateContent']('string content')

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTENT_INVALID_TYPE')).toBe(true)
      })

      it('should reject content that is too large', () => {
        const largeContent = {
          type: 'doc',
          content: Array.from({ length: 1000 }, () => ({
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

      it('should warn about empty content', () => {
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

    describe('Context requirements validation', () => {
      it('should validate correct context requirements', () => {
        const result = validator['validateContextRequirements'](['tenant_name', 'landlord_name'])

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject non-array context requirements', () => {
        const result = validator['validateContextRequirements']('not an array' as any)

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTEXT_INVALID_TYPE')).toBe(true)
      })

      it('should reject invalid variable names', () => {
        const result = validator['validateContextRequirements'](['valid_name', '123invalid', ''])

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.code === 'CONTEXT_INVALID_VARIABLES')).toBe(true)
      })

      it('should warn about duplicates', () => {
        const result = validator['validateContextRequirements'](['tenant_name', 'tenant_name'])

        expect(result.warnings.some(w => w.code === 'CONTEXT_DUPLICATES')).toBe(true)
      })

      it('should warn about many requirements', () => {
        const manyRequirements = Array.from({ length: 25 }, (_, i) => `variable_${i}`)
        const result = validator['validateContextRequirements'](manyRequirements)

        expect(result.warnings.some(w => w.code === 'CONTEXT_MANY_REQUIREMENTS')).toBe(true)
      })
    })
  })

  describe('Static Validation Methods', () => {
    it('should validate title statically', () => {
      expect(TemplateValidator.validateTitle('Valid Title')).toBe(true)
      expect(TemplateValidator.validateTitle('')).toBe(false)
      expect(TemplateValidator.validateTitle('A'.repeat(300))).toBe(false)
    })

    it('should validate category statically', () => {
      expect(TemplateValidator.validateCategory('Valid Category')).toBe(true)
      expect(TemplateValidator.validateCategory('')).toBe(false)
      expect(TemplateValidator.validateCategory('A'.repeat(150))).toBe(false)
    })

    it('should validate content statically', () => {
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
    it('should sanitize template data', () => {
      const dirtyData = {
        titel: '  Title with spaces  ',
        kategorie: '  Category with spaces  ',
        kontext_anforderungen: ['valid_var', '', '  spaced_var  ', 'invalid var']
      }

      const sanitized = TemplateValidator.sanitizeTemplateData(dirtyData)

      expect(sanitized.titel).toBe('Title with spaces')
      expect(sanitized.kategorie).toBe('Category with spaces')
      expect(sanitized.kontext_anforderungen).toEqual(['valid_var', 'spaced_var'])
    })

    it('should limit field lengths during sanitization', () => {
      const dataWithLongFields = {
        titel: 'A'.repeat(300),
        kategorie: 'B'.repeat(150)
      }

      const sanitized = TemplateValidator.sanitizeTemplateData(dataWithLongFields)

      expect(sanitized.titel.length).toBeLessThanOrEqual(VALIDATION_LIMITS.TITLE_MAX_LENGTH)
      expect(sanitized.kategorie.length).toBeLessThanOrEqual(VALIDATION_LIMITS.CATEGORY_MAX_LENGTH)
    })
  })

  describe('Custom Validation Rules', () => {
    it('should use custom validation rules', () => {
      const customValidator = new TemplateValidator({
        titel: {
          required: true,
          minLength: 10,
          maxLength: 50,
          pattern: /^[A-Z]/
        }
      } as any)

      const result = customValidator['validateTitle']('short')

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'TITLE_TOO_SHORT')).toBe(true)
    })

    it('should disable Zod validation when requested', () => {
      const legacyValidator = new TemplateValidator(undefined, false)

      const result = legacyValidator.validate({
        titel: 'Test Title',
        kategorie: 'Test Category'
      })

      // Should still work with legacy validation
      expect(result.isValid).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle validation exceptions gracefully', () => {
      // Mock a method to throw an error
      jest.spyOn(validator as any, 'validateTitle').mockImplementation(() => {
        throw new Error('Validation error')
      })

      const result = validator.validate({
        titel: 'Test Title'
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'VALIDATION_SYSTEM_ERROR')).toBe(true)
    })
  })
})