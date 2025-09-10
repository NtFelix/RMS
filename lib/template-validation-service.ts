/**
 * Template Validation Service
 * 
 * Centralized service for all template validation operations
 * Integrates Zod schemas, variable validation, and business logic validation
 */

import { z } from 'zod'
import { TemplateValidator } from './template-validation'
import { validateTemplateContent } from './template-variable-validation'
import {
  CreateTemplateRequestSchema,
  UpdateTemplateRequestSchema,
  TemplateFormDataSchema,
  validateCreateTemplateRequest,
  validateUpdateTemplateRequest,
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS
} from './template-validation-schemas'
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './template-validation'
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFormData
} from '../types/template'

/**
 * Validation context for enhanced validation
 */
export interface ValidationContext {
  userId?: string
  existingTitles?: string[]
  existingCategories?: string[]
  isUpdate?: boolean
  templateId?: string
  strictMode?: boolean
}

/**
 * Validation options
 */
export interface ValidationOptions {
  validateVariables?: boolean
  validateDuplicates?: boolean
  validateComplexity?: boolean
  validateBusinessRules?: boolean
  sanitizeInput?: boolean
}

/**
 * Template Validation Service Class
 */
export class TemplateValidationService {
  private validator: TemplateValidator
  
  constructor() {
    this.validator = new TemplateValidator(undefined, true) // Use Zod validation by default
  }
  
  /**
   * Validate template creation request
   */
  async validateCreateTemplate(
    data: any,
    context: ValidationContext = {},
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      validateVariables = true,
      validateDuplicates = true,
      validateComplexity = true,
      validateBusinessRules = true,
      sanitizeInput = true
    } = options
    
    try {
      // Sanitize input if requested
      const processedData = sanitizeInput ? this.sanitizeInput(data) : data
      
      // Schema validation
      const schemaResult = validateCreateTemplateRequest(processedData)
      if (!schemaResult.success) {
        const errors = schemaResult.errors || []
        // Handle both ZodIssue[] and custom error format
        const validationErrors = Array.isArray(errors) && errors.length > 0 && 'code' in errors[0]
          ? this.convertZodErrorsToValidationErrors(errors as any[], 'CREATE_VALIDATION')
          : errors.map((err: any) => ({
              field: 'general',
              message: err.message || 'Validation error',
              code: 'VALIDATION_ERROR',
              value: undefined
            }))
        
        return {
          isValid: false,
          errors: validationErrors,
          warnings: []
        }
      }
      
      const validatedData = schemaResult.data
      if (!validatedData) {
        return {
          isValid: false,
          errors: [{ field: 'general', message: 'Validation data is missing', code: 'MISSING_DATA', value: undefined }],
          warnings: []
        }
      }
      
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      // Enhanced title validation
      if (validateDuplicates && context.existingTitles) {
        const titleValidation = this.validator.validateTitleEnhanced(
          validatedData.titel,
          context.existingTitles
        )
        errors.push(...titleValidation.errors)
        warnings.push(...titleValidation.warnings)
      }
      
      // Enhanced category validation
      if (context.existingCategories) {
        const categoryValidation = this.validator.validateCategoryEnhanced(
          validatedData.kategorie,
          context.existingCategories
        )
        errors.push(...categoryValidation.errors)
        warnings.push(...categoryValidation.warnings)
      }
      
      // Enhanced content validation
      if (validateComplexity) {
        const contentValidation = this.validator.validateContentEnhanced(validatedData.inhalt)
        errors.push(...contentValidation.errors)
        warnings.push(...contentValidation.warnings)
      }
      
      // Variable validation
      if (validateVariables) {
        const variableValidation = validateTemplateContent(validatedData.inhalt)
        errors.push(...variableValidation.errors)
        warnings.push(...variableValidation.warnings)
      }
      
      // Business rules validation
      if (validateBusinessRules) {
        const businessValidation = await this.validateBusinessRules(validatedData, context)
        errors.push(...businessValidation.errors)
        warnings.push(...businessValidation.warnings)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_SYSTEM_ERROR',
          value: error
        }],
        warnings: []
      }
    }
  }
  
  /**
   * Validate template update request
   */
  async validateUpdateTemplate(
    data: any,
    context: ValidationContext = {},
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      validateVariables = true,
      validateDuplicates = true,
      validateComplexity = true,
      validateBusinessRules = true,
      sanitizeInput = true
    } = options
    
    try {
      // Sanitize input if requested
      const processedData = sanitizeInput ? this.sanitizeInput(data) : data
      
      // Schema validation
      const schemaResult = validateUpdateTemplateRequest(processedData)
      if (!schemaResult.success) {
        const errors = schemaResult.errors || []
        // Handle both ZodIssue[] and custom error format
        const validationErrors = Array.isArray(errors) && errors.length > 0 && 'code' in errors[0]
          ? this.convertZodErrorsToValidationErrors(errors as any[], 'UPDATE_VALIDATION')
          : errors.map((err: any) => ({
              field: 'general',
              message: err.message || 'Validation error',
              code: 'VALIDATION_ERROR',
              value: undefined
            }))
        
        return {
          isValid: false,
          errors: validationErrors,
          warnings: []
        }
      }
      
      const validatedData = schemaResult.data
      if (!validatedData) {
        return {
          isValid: false,
          errors: [{ field: 'general', message: 'Validation data is missing', code: 'MISSING_DATA', value: undefined }],
          warnings: []
        }
      }
      
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      // Enhanced title validation (if title is being updated)
      if (validatedData.titel && validateDuplicates && context.existingTitles) {
        const titleValidation = this.validator.validateTitleEnhanced(
          validatedData.titel,
          context.existingTitles
        )
        errors.push(...titleValidation.errors)
        warnings.push(...titleValidation.warnings)
      }
      
      // Enhanced category validation (if category is being updated)
      if (validatedData.kategorie && context.existingCategories) {
        const categoryValidation = this.validator.validateCategoryEnhanced(
          validatedData.kategorie,
          context.existingCategories
        )
        errors.push(...categoryValidation.errors)
        warnings.push(...categoryValidation.warnings)
      }
      
      // Enhanced content validation (if content is being updated)
      if (validatedData.inhalt && validateComplexity) {
        const contentValidation = this.validator.validateContentEnhanced(validatedData.inhalt)
        errors.push(...contentValidation.errors)
        warnings.push(...contentValidation.warnings)
      }
      
      // Variable validation (if content is being updated)
      if (validatedData.inhalt && validateVariables) {
        const variableValidation = validateTemplateContent(validatedData.inhalt)
        errors.push(...variableValidation.errors)
        warnings.push(...variableValidation.warnings)
      }
      
      // Business rules validation
      if (validateBusinessRules) {
        const businessValidation = await this.validateBusinessRules(validatedData, context)
        errors.push(...businessValidation.errors)
        warnings.push(...businessValidation.warnings)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_SYSTEM_ERROR',
          value: error
        }],
        warnings: []
      }
    }
  }
  
  /**
   * Validate template form data (for frontend forms)
   */
  validateFormData(data: any, context: ValidationContext = {}): ValidationResult {
    try {
      const result = z.object({
        titel: z.string(),
        inhalt: z.any(),
        kategorie: z.string(),
        kontext_anforderungen: z.array(z.string()).optional()
      }).safeParse(data)
      
      if (!result.success) {
        return {
          isValid: false,
          errors: this.convertZodErrorsToValidationErrors(result.error.errors, 'FORM_VALIDATION'),
          warnings: []
        }
      }
      
      // Additional form-specific validation
      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      // Check required fields
      if (!data.titel || data.titel.trim().length === 0) {
        errors.push({
          field: 'titel',
          message: 'Titel ist erforderlich',
          code: 'TITLE_REQUIRED'
        })
      }
      
      if (!data.kategorie || data.kategorie.trim().length === 0) {
        errors.push({
          field: 'kategorie',
          message: 'Kategorie ist erforderlich',
          code: 'CATEGORY_REQUIRED'
        })
      }
      
      if (!data.inhalt || (typeof data.inhalt === 'object' && Object.keys(data.inhalt).length === 0)) {
        errors.push({
          field: 'inhalt',
          message: 'Inhalt ist erforderlich',
          code: 'CONTENT_REQUIRED'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: `Form validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'FORM_VALIDATION_ERROR',
          value: error
        }],
        warnings: []
      }
    }
  }
  
  /**
   * Quick validation for individual fields
   */
  validateField(field: string, value: any, context: ValidationContext = {}): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    try {
      switch (field) {
        case 'titel':
          if (context.existingTitles) {
            const result = this.validator.validateTitleEnhanced(value, context.existingTitles)
            errors.push(...result.errors)
            warnings.push(...result.warnings)
          } else {
            const result = TemplateValidator.validateTitle(value)
            if (!result) {
              errors.push({
                field: 'titel',
                message: 'Ungültiger Titel',
                code: 'INVALID_TITLE',
                value
              })
            }
          }
          break
          
        case 'kategorie':
          if (context.existingCategories) {
            const result = this.validator.validateCategoryEnhanced(value, context.existingCategories)
            errors.push(...result.errors)
            warnings.push(...result.warnings)
          } else {
            const result = TemplateValidator.validateCategory(value)
            if (!result) {
              errors.push({
                field: 'kategorie',
                message: 'Ungültige Kategorie',
                code: 'INVALID_CATEGORY',
                value
              })
            }
          }
          break
          
        case 'inhalt':
          const contentResult = this.validator.validateContentEnhanced(value)
          errors.push(...contentResult.errors)
          warnings.push(...contentResult.warnings)
          
          // Also validate variables in content
          const variableResult = validateTemplateContent(value)
          errors.push(...variableResult.errors)
          warnings.push(...variableResult.warnings)
          break
          
        default:
          warnings.push({
            field,
            message: `Unknown field: ${field}`,
            code: 'UNKNOWN_FIELD',
            value
          })
      }
      
    } catch (error) {
      errors.push({
        field,
        message: `Field validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'FIELD_VALIDATION_ERROR',
        value: error
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    data: Partial<CreateTemplateRequest | UpdateTemplateRequest>,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Rule: Template title should be descriptive
    if (data.titel) {
      const words = data.titel.trim().split(/\s+/)
      if (words.length === 1 && words[0].length < 5) {
        warnings.push({
          field: 'titel',
          message: 'Titel ist sehr kurz - erwägen Sie einen beschreibenderen Namen',
          code: 'TITLE_TOO_SHORT_DESCRIPTIVE',
          value: data.titel
        })
      }
    }
    
    // Rule: Category should follow naming conventions
    if (data.kategorie) {
      const category = data.kategorie.trim()
      if (category.includes('_') || category.includes('-')) {
        warnings.push({
          field: 'kategorie',
          message: 'Kategorie enthält Sonderzeichen - verwenden Sie Leerzeichen für bessere Lesbarkeit',
          code: 'CATEGORY_NAMING_CONVENTION',
          value: category
        })
      }
    }
    
    // Rule: Content should have reasonable structure
    if (data.inhalt) {
      const textContent = this.extractTextFromContent(data.inhalt)
      if (textContent.length > 1000 && !this.hasHeadings(data.inhalt)) {
        warnings.push({
          field: 'inhalt',
          message: 'Langer Inhalt ohne Überschriften - erwägen Sie die Strukturierung',
          code: 'CONTENT_NEEDS_STRUCTURE'
        })
      }
    }
    
    // Rule: Strict mode validations
    if (context.strictMode) {
      if (data.titel && data.titel.toLowerCase().includes('test')) {
        errors.push({
          field: 'titel',
          message: 'Test-Titel sind im Strict-Modus nicht erlaubt',
          code: 'STRICT_NO_TEST_TITLES',
          value: data.titel
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Extract text content from Tiptap JSON
   */
  private extractTextFromContent(content: any): string {
    if (!content || typeof content !== 'object') return ''
    
    const extractFromNode = (node: any): string => {
      if (!node || typeof node !== 'object') return ''
      
      if (node.type === 'text') {
        return node.text || ''
      }
      
      if (Array.isArray(node.content)) {
        return node.content.map(extractFromNode).join('')
      }
      
      return ''
    }
    
    if (Array.isArray(content)) {
      return content.map(extractFromNode).join('')
    }
    
    return extractFromNode(content)
  }
  
  /**
   * Check if content has headings
   */
  private hasHeadings(content: any): boolean {
    if (!content || typeof content !== 'object') return false
    
    const checkForHeadings = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false
      
      if (node.type === 'heading') {
        return true
      }
      
      if (Array.isArray(node.content)) {
        return node.content.some(checkForHeadings)
      }
      
      return false
    }
    
    if (Array.isArray(content)) {
      return content.some(checkForHeadings)
    }
    
    return checkForHeadings(content)
  }
  
  /**
   * Sanitize input data
   */
  private sanitizeInput(data: any): any {
    return TemplateValidator.sanitizeTemplateData(data)
  }
  
  /**
   * Convert Zod errors to ValidationError format
   */
  private convertZodErrorsToValidationErrors(
    zodErrors: z.ZodIssue[],
    codePrefix: string
  ): ValidationError[] {
    return zodErrors.map(error => ({
      field: error.path.join('.') || 'unknown',
      message: error.message,
      code: `${codePrefix}_${error.code.toUpperCase()}`,
      value: 'received' in error ? error.received : undefined
    }))
  }
  
  /**
   * Get validation summary for a template
   */
  async getValidationSummary(
    template: Template,
    context: ValidationContext = {}
  ): Promise<{
    isValid: boolean
    score: number // 0-100
    issues: number
    recommendations: string[]
  }> {
    const validation = await this.validateUpdateTemplate(template, context, {
      validateVariables: true,
      validateDuplicates: false, // Skip for existing templates
      validateComplexity: true,
      validateBusinessRules: true,
      sanitizeInput: false
    })
    
    const totalIssues = validation.errors.length + validation.warnings.length
    const errorWeight = 10
    const warningWeight = 2
    const maxScore = 100
    
    const deductions = (validation.errors.length * errorWeight) + (validation.warnings.length * warningWeight)
    const score = Math.max(0, maxScore - deductions)
    
    const recommendations: string[] = []
    
    if (validation.errors.length > 0) {
      recommendations.push('Beheben Sie alle Fehler vor der Verwendung')
    }
    
    if (validation.warnings.length > 0) {
      recommendations.push('Überprüfen Sie die Warnungen für bessere Qualität')
    }
    
    if (score < 70) {
      recommendations.push('Template benötigt Überarbeitung für optimale Qualität')
    }
    
    return {
      isValid: validation.isValid,
      score,
      issues: totalIssues,
      recommendations
    }
  }
}

// Export singleton instance
export const templateValidationService = new TemplateValidationService()

// Export validation utilities
export {
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS
} from './template-validation-schemas'