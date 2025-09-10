/**
 * Template Validation System
 * 
 * Provides comprehensive validation for template data with detailed error reporting
 */

import { TemplateErrorHandler, TemplateErrorType } from './template-error-handler'

// Validation Result Types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  value?: any
}

// Template Data Interface for Validation
export interface TemplateValidationData {
  titel?: string
  inhalt?: any
  kategorie?: string
  kontext_anforderungen?: string[]
}

// Validation Rules Configuration
interface ValidationRules {
  titel: {
    required: boolean
    minLength: number
    maxLength: number
    pattern?: RegExp
  }
  kategorie: {
    required: boolean
    maxLength: number
    allowedValues?: string[]
  }
  inhalt: {
    required: boolean
    maxSize: number // in characters
  }
}

const DEFAULT_VALIDATION_RULES: ValidationRules = {
  titel: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[^<>{}]*$/ // No HTML tags or special characters
  },
  kategorie: {
    required: true,
    maxLength: 100
  },
  inhalt: {
    required: true,
    maxSize: 50000 // 50KB limit for content
  }
}

/**
 * Template Validator Class
 */
export class TemplateValidator {
  private rules: ValidationRules
  
  constructor(customRules?: Partial<ValidationRules>) {
    this.rules = { ...DEFAULT_VALIDATION_RULES, ...customRules }
  }
  
  /**
   * Validate complete template data
   */
  validate(data: TemplateValidationData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    try {
      // Validate title
      const titleValidation = this.validateTitle(data.titel)
      errors.push(...titleValidation.errors)
      warnings.push(...titleValidation.warnings)
      
      // Validate category
      const categoryValidation = this.validateCategory(data.kategorie)
      errors.push(...categoryValidation.errors)
      warnings.push(...categoryValidation.warnings)
      
      // Validate content
      const contentValidation = this.validateContent(data.inhalt)
      errors.push(...contentValidation.errors)
      warnings.push(...contentValidation.warnings)
      
      // Validate context requirements
      const contextValidation = this.validateContextRequirements(data.kontext_anforderungen)
      errors.push(...contextValidation.errors)
      warnings.push(...contextValidation.warnings)
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      // Handle validation system errors
      const templateError = TemplateErrorHandler.createError(
        TemplateErrorType.INVALID_TEMPLATE_DATA,
        'Validation system error',
        error
      )
      
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: 'Validation failed due to system error',
          code: 'VALIDATION_SYSTEM_ERROR',
          value: error
        }],
        warnings: []
      }
    }
  }
  
  /**
   * Validate template title
   */
  private validateTitle(titel?: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Required check
    if (this.rules.titel.required && (!titel || titel.trim().length === 0)) {
      errors.push({
        field: 'titel',
        message: 'Titel ist erforderlich',
        code: 'TITLE_REQUIRED'
      })
      return { isValid: false, errors, warnings }
    }
    
    if (titel) {
      const trimmedTitle = titel.trim()
      
      // Length checks
      if (trimmedTitle.length < this.rules.titel.minLength) {
        errors.push({
          field: 'titel',
          message: `Titel muss mindestens ${this.rules.titel.minLength} Zeichen lang sein`,
          code: 'TITLE_TOO_SHORT',
          value: trimmedTitle.length
        })
      }
      
      if (trimmedTitle.length > this.rules.titel.maxLength) {
        errors.push({
          field: 'titel',
          message: `Titel darf maximal ${this.rules.titel.maxLength} Zeichen lang sein`,
          code: 'TITLE_TOO_LONG',
          value: trimmedTitle.length
        })
      }
      
      // Pattern check
      if (this.rules.titel.pattern && !this.rules.titel.pattern.test(trimmedTitle)) {
        errors.push({
          field: 'titel',
          message: 'Titel enthält ungültige Zeichen',
          code: 'TITLE_INVALID_CHARACTERS',
          value: trimmedTitle
        })
      }
      
      // Warning for very long titles
      if (trimmedTitle.length > 100) {
        warnings.push({
          field: 'titel',
          message: 'Sehr langer Titel könnte in der Anzeige abgeschnitten werden',
          code: 'TITLE_VERY_LONG',
          value: trimmedTitle.length
        })
      }
      
      // Warning for special characters
      if (/[<>{}]/.test(trimmedTitle)) {
        warnings.push({
          field: 'titel',
          message: 'Titel enthält Sonderzeichen, die Probleme verursachen könnten',
          code: 'TITLE_SPECIAL_CHARACTERS',
          value: trimmedTitle
        })
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings }
  }
  
  /**
   * Validate template category
   */
  private validateCategory(kategorie?: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Required check
    if (this.rules.kategorie.required && (!kategorie || kategorie.trim().length === 0)) {
      errors.push({
        field: 'kategorie',
        message: 'Kategorie ist erforderlich',
        code: 'CATEGORY_REQUIRED'
      })
      return { isValid: false, errors, warnings }
    }
    
    if (kategorie) {
      const trimmedCategory = kategorie.trim()
      
      // Length check
      if (trimmedCategory.length > this.rules.kategorie.maxLength) {
        errors.push({
          field: 'kategorie',
          message: `Kategorie darf maximal ${this.rules.kategorie.maxLength} Zeichen lang sein`,
          code: 'CATEGORY_TOO_LONG',
          value: trimmedCategory.length
        })
      }
      
      // Allowed values check
      if (this.rules.kategorie.allowedValues && 
          !this.rules.kategorie.allowedValues.includes(trimmedCategory)) {
        warnings.push({
          field: 'kategorie',
          message: 'Unbekannte Kategorie - wird als neue Kategorie erstellt',
          code: 'CATEGORY_UNKNOWN',
          value: trimmedCategory
        })
      }
      
      // Warning for special characters
      if (/[<>{}\/\\]/.test(trimmedCategory)) {
        warnings.push({
          field: 'kategorie',
          message: 'Kategorie enthält Sonderzeichen, die Probleme verursachen könnten',
          code: 'CATEGORY_SPECIAL_CHARACTERS',
          value: trimmedCategory
        })
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings }
  }
  
  /**
   * Validate template content
   */
  private validateContent(inhalt?: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Required check
    if (this.rules.inhalt.required && !inhalt) {
      errors.push({
        field: 'inhalt',
        message: 'Inhalt ist erforderlich',
        code: 'CONTENT_REQUIRED'
      })
      return { isValid: false, errors, warnings }
    }
    
    if (inhalt) {
      try {
        // Validate JSON structure for Tiptap content
        if (typeof inhalt === 'object') {
          if (!inhalt.type || inhalt.type !== 'doc') {
            errors.push({
              field: 'inhalt',
              message: 'Ungültiges Inhaltsformat - muss ein gültiges Tiptap-Dokument sein',
              code: 'CONTENT_INVALID_FORMAT',
              value: inhalt.type
            })
          }
          
          if (!Array.isArray(inhalt.content)) {
            errors.push({
              field: 'inhalt',
              message: 'Ungültiger Dokumentinhalt - content muss ein Array sein',
              code: 'CONTENT_INVALID_STRUCTURE'
            })
          }
        } else {
          errors.push({
            field: 'inhalt',
            message: 'Inhalt muss ein Objekt sein',
            code: 'CONTENT_INVALID_TYPE',
            value: typeof inhalt
          })
        }
        
        // Size check
        const contentString = JSON.stringify(inhalt)
        if (contentString.length > this.rules.inhalt.maxSize) {
          errors.push({
            field: 'inhalt',
            message: `Inhalt ist zu groß (${contentString.length} Zeichen, maximal ${this.rules.inhalt.maxSize})`,
            code: 'CONTENT_TOO_LARGE',
            value: contentString.length
          })
        }
        
        // Warning for large content
        if (contentString.length > this.rules.inhalt.maxSize * 0.8) {
          warnings.push({
            field: 'inhalt',
            message: 'Inhalt ist sehr groß und könnte Performance-Probleme verursachen',
            code: 'CONTENT_LARGE',
            value: contentString.length
          })
        }
        
        // Check for empty content
        if (this.isContentEmpty(inhalt)) {
          warnings.push({
            field: 'inhalt',
            message: 'Inhalt ist leer',
            code: 'CONTENT_EMPTY'
          })
        }
        
      } catch (error) {
        errors.push({
          field: 'inhalt',
          message: 'Fehler beim Validieren des Inhalts',
          code: 'CONTENT_VALIDATION_ERROR',
          value: error
        })
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings }
  }
  
  /**
   * Validate context requirements
   */
  private validateContextRequirements(requirements?: string[]): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    if (requirements) {
      if (!Array.isArray(requirements)) {
        errors.push({
          field: 'kontext_anforderungen',
          message: 'Kontext-Anforderungen müssen ein Array sein',
          code: 'CONTEXT_INVALID_TYPE',
          value: typeof requirements
        })
        return { isValid: false, errors, warnings }
      }
      
      // Check for valid variable names
      const invalidVariables = requirements.filter(req => 
        typeof req !== 'string' || req.trim().length === 0 || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(req)
      )
      
      if (invalidVariables.length > 0) {
        errors.push({
          field: 'kontext_anforderungen',
          message: 'Ungültige Variablennamen in Kontext-Anforderungen',
          code: 'CONTEXT_INVALID_VARIABLES',
          value: invalidVariables
        })
      }
      
      // Check for duplicates
      const duplicates = requirements.filter((item, index) => requirements.indexOf(item) !== index)
      if (duplicates.length > 0) {
        warnings.push({
          field: 'kontext_anforderungen',
          message: 'Doppelte Einträge in Kontext-Anforderungen',
          code: 'CONTEXT_DUPLICATES',
          value: duplicates
        })
      }
      
      // Warning for many requirements
      if (requirements.length > 20) {
        warnings.push({
          field: 'kontext_anforderungen',
          message: 'Sehr viele Kontext-Anforderungen könnten die Performance beeinträchtigen',
          code: 'CONTEXT_MANY_REQUIREMENTS',
          value: requirements.length
        })
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings }
  }
  
  /**
   * Check if Tiptap content is empty
   */
  private isContentEmpty(content: any): boolean {
    if (!content || !content.content || !Array.isArray(content.content)) {
      return true
    }
    
    // Check if all content nodes are empty
    return content.content.every((node: any) => {
      if (node.type === 'paragraph') {
        return !node.content || node.content.length === 0 || 
               node.content.every((child: any) => !child.text || child.text.trim().length === 0)
      }
      return false
    })
  }
  
  /**
   * Quick validation for specific fields
   */
  static validateTitle(title: string): boolean {
    if (!title || typeof title !== 'string') return false
    const trimmed = title.trim()
    return trimmed.length > 0 && trimmed.length <= 255
  }
  
  static validateCategory(category: string): boolean {
    if (!category || typeof category !== 'string') return false
    const trimmed = category.trim()
    return trimmed.length > 0 && trimmed.length <= 100
  }
  
  static validateContent(content: any): boolean {
    if (!content || typeof content !== 'object') return false
    return content.type === 'doc' && Array.isArray(content.content)
  }
}

/**
 * Validation Error Formatter
 */
export class ValidationErrorFormatter {
  /**
   * Format validation errors for user display
   */
  static formatErrors(errors: ValidationError[]): string[] {
    return errors.map(error => error.message)
  }
  
  /**
   * Format validation warnings for user display
   */
  static formatWarnings(warnings: ValidationWarning[]): string[] {
    return warnings.map(warning => warning.message)
  }
  
  /**
   * Get first error message for a specific field
   */
  static getFieldError(errors: ValidationError[], field: string): string | undefined {
    const fieldError = errors.find(error => error.field === field)
    return fieldError?.message
  }
  
  /**
   * Check if field has errors
   */
  static hasFieldError(errors: ValidationError[], field: string): boolean {
    return errors.some(error => error.field === field)
  }
}