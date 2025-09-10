/**
 * Template Validation System
 * 
 * Provides comprehensive validation for template data with detailed error reporting
 * Enhanced with Zod schema validation and improved error handling
 */

import { z } from 'zod'
import { TemplateErrorHandler, TemplateErrorType } from './template-error-handler'
import {
  CreateTemplateRequestSchema,
  UpdateTemplateRequestSchema,
  TemplateFormDataSchema,
  TemplateTitleSchema,
  TemplateCategorySchema,
  TemplateContentSchema,
  ContextRequirementsSchema,
  VariableIdSchema,
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS,
  validateTemplateTitle,
  validateTemplateCategory,
  validateTemplateContent,
  validateCreateTemplateRequest,
  validateUpdateTemplateRequest
} from './template-validation-schemas'
import { validateTemplateContent as validateVariableContent } from './template-variable-validation'

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
 * Enhanced Template Validator Class with Zod integration
 */
export class TemplateValidator {
  private rules: ValidationRules
  private useZodValidation: boolean
  
  constructor(customRules?: Partial<ValidationRules>, useZodValidation: boolean = true) {
    this.rules = { ...DEFAULT_VALIDATION_RULES, ...customRules }
    this.useZodValidation = useZodValidation
  }
  
  /**
   * Validate complete template data with enhanced Zod validation
   */
  validate(data: TemplateValidationData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    try {
      // Use Zod validation if enabled
      if (this.useZodValidation) {
        const zodValidation = this.validateWithZod(data)
        errors.push(...zodValidation.errors)
        warnings.push(...zodValidation.warnings)
        
        // If Zod validation fails, still run legacy validation for additional checks
        if (!zodValidation.isValid) {
          const legacyValidation = this.validateLegacy(data)
          // Only add legacy warnings that aren't already covered by Zod
          legacyValidation.warnings.forEach(warning => {
            if (!warnings.some(w => w.code === warning.code)) {
              warnings.push(warning)
            }
          })
        }
      } else {
        // Use legacy validation
        const legacyValidation = this.validateLegacy(data)
        errors.push(...legacyValidation.errors)
        warnings.push(...legacyValidation.warnings)
      }
      
      // Additional variable validation
      if (data.inhalt) {
        const variableValidation = validateVariableContent(data.inhalt)
        errors.push(...variableValidation.errors)
        warnings.push(...variableValidation.warnings)
      }
      
      // Cross-field validation
      const crossFieldValidation = this.validateCrossFields(data)
      errors.push(...crossFieldValidation.errors)
      warnings.push(...crossFieldValidation.warnings)
      
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
   * Validate using Zod schemas
   */
  private validateWithZod(data: TemplateValidationData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Validate title with Zod
    if (data.titel !== undefined) {
      const titleResult = validateTemplateTitle(data.titel)
      if (!titleResult.success && titleResult.errors) {
        titleResult.errors.forEach(error => {
          errors.push({
            field: 'titel',
            message: error.message,
            code: 'ZOD_TITLE_VALIDATION',
            value: data.titel
          })
        })
      }
    }
    
    // Validate category with Zod
    if (data.kategorie !== undefined) {
      const categoryResult = validateTemplateCategory(data.kategorie)
      if (!categoryResult.success && categoryResult.errors) {
        categoryResult.errors.forEach(error => {
          errors.push({
            field: 'kategorie',
            message: error.message,
            code: 'ZOD_CATEGORY_VALIDATION',
            value: data.kategorie
          })
        })
      }
    }
    
    // Validate content with Zod
    if (data.inhalt !== undefined) {
      const contentResult = validateTemplateContent(data.inhalt)
      if (!contentResult.success && contentResult.errors) {
        contentResult.errors.forEach(error => {
          errors.push({
            field: 'inhalt',
            message: error.message,
            code: 'ZOD_CONTENT_VALIDATION',
            value: data.inhalt
          })
        })
      }
    }
    
    // Validate context requirements with Zod
    if (data.kontext_anforderungen !== undefined) {
      try {
        ContextRequirementsSchema.parse(data.kontext_anforderungen)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(zodError => {
            errors.push({
              field: 'kontext_anforderungen',
              message: zodError.message,
              code: 'ZOD_CONTEXT_VALIDATION',
              value: data.kontext_anforderungen
            })
          })
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Legacy validation method (existing implementation)
   */
  private validateLegacy(data: TemplateValidationData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
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
  }
  
  /**
   * Cross-field validation for complex business rules
   */
  private validateCrossFields(data: TemplateValidationData): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Check if title matches category naming conventions
    if (data.titel && data.kategorie) {
      const titleLower = data.titel.toLowerCase()
      const categoryLower = data.kategorie.toLowerCase()
      
      // Warn if title doesn't seem to match category
      if (!titleLower.includes(categoryLower) && !categoryLower.includes(titleLower)) {
        warnings.push({
          field: 'titel',
          message: `Titel "${data.titel}" scheint nicht zur Kategorie "${data.kategorie}" zu passen`,
          code: 'TITLE_CATEGORY_MISMATCH',
          value: { titel: data.titel, kategorie: data.kategorie }
        })
      }
    }
    
    // Check if content has variables but no context requirements
    if (data.inhalt && data.kontext_anforderungen) {
      const hasVariables = this.contentHasVariables(data.inhalt)
      const hasContextRequirements = data.kontext_anforderungen.length > 0
      
      if (hasVariables && !hasContextRequirements) {
        warnings.push({
          field: 'kontext_anforderungen',
          message: 'Vorlage enthält Variablen, aber keine Kontext-Anforderungen sind definiert',
          code: 'MISSING_CONTEXT_REQUIREMENTS'
        })
      } else if (!hasVariables && hasContextRequirements) {
        warnings.push({
          field: 'kontext_anforderungen',
          message: 'Kontext-Anforderungen definiert, aber keine Variablen im Inhalt gefunden',
          code: 'UNUSED_CONTEXT_REQUIREMENTS'
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
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    const distance = matrix[len1][len2]
    const maxLength = Math.max(len1, len2)
    return 1 - distance / maxLength
  }
  
  /**
   * Check if content contains variables
   */
  private contentHasVariables(content: any): boolean {
    if (!content || typeof content !== 'object') return false
    
    const checkNode = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false
      
      if (node.type === 'mention' && node.attrs?.id) {
        return true
      }
      
      if (Array.isArray(node.content)) {
        return node.content.some(checkNode)
      }
      
      if (Array.isArray(node.marks)) {
        return node.marks.some((mark: any) => 
          mark.type === 'mention' && mark.attrs?.id
        )
      }
      
      return false
    }
    
    if (Array.isArray(content)) {
      return content.some(checkNode)
    }
    
    return checkNode(content)
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
   * Validate template for creation (all required fields)
   */
  validateForCreation(data: any): ValidationResult {
    const result = validateCreateTemplateRequest(data)
    
    if (!result.success) {
      return {
        isValid: false,
        errors: (result.errors || []).map((error: any) => ({
          field: error.path?.join?.('.') || 'unknown',
          message: error.message,
          code: 'ZOD_CREATION_VALIDATION',
          value: error.received
        })),
        warnings: []
      }
    }
    
    // Additional business logic validation
    return this.validate(data)
  }
  
  /**
   * Validate template for update (partial fields allowed)
   */
  validateForUpdate(data: any): ValidationResult {
    const result = validateUpdateTemplateRequest(data)
    
    if (!result.success) {
      return {
        isValid: false,
        errors: (result.errors || []).map((error: any) => ({
          field: error.path?.join?.('.') || 'unknown',
          message: error.message,
          code: 'ZOD_UPDATE_VALIDATION',
          value: error.received
        })),
        warnings: []
      }
    }
    
    // Additional business logic validation
    return this.validate(data)
  }
  
  /**
   * Validate template title with enhanced checks
   */
  validateTitleEnhanced(title: string, existingTitles: string[] = []): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Basic Zod validation
    const zodResult = validateTemplateTitle(title)
    if (!zodResult.success && zodResult.errors) {
      zodResult.errors.forEach(error => {
        errors.push({
          field: 'titel',
          message: error.message,
          code: 'TITLE_VALIDATION_ERROR',
          value: title
        })
      })
    }
    
    if (errors.length === 0) {
      // Check for duplicates
      if (existingTitles.includes(title.trim())) {
        errors.push({
          field: 'titel',
          message: 'Ein Template mit diesem Titel existiert bereits',
          code: 'TITLE_DUPLICATE',
          value: title
        })
      }
      
      // Check for potentially problematic titles
      const trimmedTitle = title.trim()
      if (trimmedTitle.toLowerCase().includes('test') || trimmedTitle.toLowerCase().includes('temp')) {
        warnings.push({
          field: 'titel',
          message: 'Titel scheint ein Test- oder temporärer Name zu sein',
          code: 'TITLE_TEMPORARY',
          value: title
        })
      }
      
      // Check for very generic titles
      const genericTitles = ['vorlage', 'template', 'dokument', 'document', 'neu', 'new']
      if (genericTitles.some(generic => trimmedTitle.toLowerCase() === generic)) {
        warnings.push({
          field: 'titel',
          message: 'Titel ist sehr generisch - erwägen Sie einen spezifischeren Namen',
          code: 'TITLE_GENERIC',
          value: title
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
   * Validate category with enhanced checks
   */
  validateCategoryEnhanced(category: string, existingCategories: string[] = []): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Basic Zod validation
    const zodResult = validateTemplateCategory(category)
    if (!zodResult.success && zodResult.errors) {
      zodResult.errors.forEach(error => {
        errors.push({
          field: 'kategorie',
          message: error.message,
          code: 'CATEGORY_VALIDATION_ERROR',
          value: category
        })
      })
    }
    
    if (errors.length === 0) {
      const trimmedCategory = category.trim()
      
      // Check if it's a new category
      if (!existingCategories.includes(trimmedCategory)) {
        warnings.push({
          field: 'kategorie',
          message: 'Neue Kategorie wird erstellt',
          code: 'CATEGORY_NEW',
          value: category
        })
      }
      
      // Suggest similar existing categories
      const similarCategories = existingCategories.filter(existing => {
        const existingLower = existing.toLowerCase()
        const categoryLower = trimmedCategory.toLowerCase()
        return existingLower.includes(categoryLower) ||
               categoryLower.includes(existingLower) ||
               this.calculateStringSimilarity(existingLower, categoryLower) > 0.6
      })
      
      if (similarCategories.length > 0 && !existingCategories.includes(trimmedCategory)) {
        warnings.push({
          field: 'kategorie',
          message: `Ähnliche Kategorien existieren bereits: ${similarCategories.join(', ')}`,
          code: 'CATEGORY_SIMILAR_EXISTS',
          value: { category, similar: similarCategories }
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
   * Validate content with enhanced structure checks
   */
  validateContentEnhanced(content: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    
    // Basic Zod validation
    const zodResult = validateTemplateContent(content)
    if (!zodResult.success && zodResult.errors) {
      zodResult.errors.forEach(error => {
        errors.push({
          field: 'inhalt',
          message: error.message,
          code: 'CONTENT_VALIDATION_ERROR',
          value: content
        })
      })
    }
    
    if (errors.length === 0 && content) {
      // Check content complexity
      const complexity = this.calculateContentComplexity(content)
      if (complexity.nodeCount > 100) {
        warnings.push({
          field: 'inhalt',
          message: `Sehr komplexer Inhalt (${complexity.nodeCount} Knoten) - könnte Performance-Probleme verursachen`,
          code: 'CONTENT_COMPLEX',
          value: complexity
        })
      }
      
      // Check for empty paragraphs
      if (complexity.emptyParagraphs > 0) {
        warnings.push({
          field: 'inhalt',
          message: `${complexity.emptyParagraphs} leere Absätze gefunden`,
          code: 'CONTENT_EMPTY_PARAGRAPHS',
          value: complexity.emptyParagraphs
        })
      }
      
      // Check for missing structure
      if (complexity.headingCount === 0 && complexity.nodeCount > 10) {
        warnings.push({
          field: 'inhalt',
          message: 'Längerer Inhalt ohne Überschriften - erwägen Sie die Strukturierung mit Überschriften',
          code: 'CONTENT_NO_HEADINGS'
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
   * Calculate content complexity metrics
   */
  private calculateContentComplexity(content: any): {
    nodeCount: number
    textLength: number
    variableCount: number
    headingCount: number
    emptyParagraphs: number
  } {
    let nodeCount = 0
    let textLength = 0
    let variableCount = 0
    let headingCount = 0
    let emptyParagraphs = 0
    
    const analyzeNode = (node: any): void => {
      if (!node || typeof node !== 'object') return
      
      nodeCount++
      
      if (node.type === 'text' && node.text) {
        textLength += node.text.length
      }
      
      if (node.type === 'mention') {
        variableCount++
      }
      
      if (node.type === 'heading') {
        headingCount++
      }
      
      if (node.type === 'paragraph') {
        const hasContent = node.content && node.content.some((child: any) => 
          child.type === 'text' && child.text && child.text.trim().length > 0
        )
        if (!hasContent) {
          emptyParagraphs++
        }
      }
      
      if (Array.isArray(node.content)) {
        node.content.forEach(analyzeNode)
      }
      
      if (Array.isArray(node.marks)) {
        node.marks.forEach(analyzeNode)
      }
    }
    
    if (Array.isArray(content)) {
      content.forEach(analyzeNode)
    } else {
      analyzeNode(content)
    }
    
    return {
      nodeCount,
      textLength,
      variableCount,
      headingCount,
      emptyParagraphs
    }
  }
  
  /**
   * Quick validation for specific fields (enhanced)
   */
  static validateTitle(title: string): boolean {
    const result = validateTemplateTitle(title)
    return result.success
  }
  
  static validateCategory(category: string): boolean {
    const result = validateTemplateCategory(category)
    return result.success
  }
  
  static validateContent(content: any): boolean {
    const result = validateTemplateContent(content)
    return result.success
  }
  
  /**
   * Sanitize input data
   */
  static sanitizeTemplateData(data: any): any {
    const sanitized = { ...data }
    
    if (sanitized.titel && typeof sanitized.titel === 'string') {
      sanitized.titel = sanitized.titel.trim().substring(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH)
    }
    
    if (sanitized.kategorie && typeof sanitized.kategorie === 'string') {
      sanitized.kategorie = sanitized.kategorie.trim().substring(0, VALIDATION_LIMITS.CATEGORY_MAX_LENGTH)
    }
    
    if (sanitized.kontext_anforderungen && Array.isArray(sanitized.kontext_anforderungen)) {
      sanitized.kontext_anforderungen = sanitized.kontext_anforderungen
        .filter((req: any) => typeof req === 'string' && req.trim().length > 0)
        .map((req: any) => req.trim())
        .slice(0, VALIDATION_LIMITS.MAX_CONTEXT_REQUIREMENTS)
    }
    
    return sanitized
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