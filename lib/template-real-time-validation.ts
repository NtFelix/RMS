/**
 * Real-time Template Validation System
 * 
 * Provides real-time validation with visual feedback for template content,
 * variables, and form fields with debounced validation to prevent excessive
 * validation calls during user input.
 */

import { z } from 'zod'
import { debounce } from 'lodash'
import { 
  TemplateTitleSchema,
  TemplateCategorySchema,
  TemplateContentSchema,
  ContextRequirementsSchema,
  VariableIdSchema,
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS
} from './template-validation-schemas'
import { extractVariablesFromContent } from './template-variable-extraction'
import { getVariableById, isValidVariableId } from './template-variables'

// Real-time validation result types
export interface RealTimeValidationResult {
  isValid: boolean
  errors: RealTimeValidationError[]
  warnings: RealTimeValidationWarning[]
  suggestions: RealTimeValidationSuggestion[]
}

export interface RealTimeValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
  position?: {
    start: number
    end: number
  }
  quickFix?: QuickFix
}

export interface RealTimeValidationWarning {
  field: string
  message: string
  code: string
  severity: 'warning' | 'info'
  position?: {
    start: number
    end: number
  }
  suggestion?: string
}

export interface RealTimeValidationSuggestion {
  field: string
  message: string
  code: string
  action: string
  actionLabel: string
  priority: 'high' | 'medium' | 'low'
}

export interface QuickFix {
  label: string
  action: () => void
  description?: string
}

// Validation context for enhanced validation
export interface ValidationContext {
  existingTitles?: string[]
  existingCategories?: string[]
  userId?: string
  templateId?: string
  isUpdate?: boolean
}

/**
 * Real-time Template Validator Class
 */
export class RealTimeTemplateValidator {
  private titleValidationDebounced: (title: string, context?: ValidationContext) => Promise<RealTimeValidationResult>
  private contentValidationDebounced: (content: any, context?: ValidationContext) => Promise<RealTimeValidationResult>
  private categoryValidationDebounced: (category: string, context?: ValidationContext) => Promise<RealTimeValidationResult>
  private variableValidationDebounced: (variables: string[], content?: any, context?: ValidationContext) => Promise<RealTimeValidationResult>

  constructor(debounceDelay: number = 300) {
    // Create debounced validation functions
    this.titleValidationDebounced = debounce(this.validateTitleImmediate.bind(this), debounceDelay)
    this.contentValidationDebounced = debounce(this.validateContentImmediate.bind(this), debounceDelay)
    this.categoryValidationDebounced = debounce(this.validateCategoryImmediate.bind(this), debounceDelay)
    this.variableValidationDebounced = debounce(this.validateVariablesImmediate.bind(this), debounceDelay)
  }

  /**
   * Validate template title with real-time feedback
   */
  async validateTitle(title: string, context?: ValidationContext): Promise<RealTimeValidationResult> {
    return this.titleValidationDebounced(title, context)
  }

  /**
   * Validate template content with real-time feedback
   */
  async validateContent(content: any, context?: ValidationContext): Promise<RealTimeValidationResult> {
    return this.contentValidationDebounced(content, context)
  }

  /**
   * Validate template category with real-time feedback
   */
  async validateCategory(category: string, context?: ValidationContext): Promise<RealTimeValidationResult> {
    return this.categoryValidationDebounced(category, context)
  }

  /**
   * Validate template variables with real-time feedback
   */
  async validateVariables(variables: string[], content?: any, context?: ValidationContext): Promise<RealTimeValidationResult> {
    return this.variableValidationDebounced(variables, content, context)
  }

  /**
   * Validate complete template form with real-time feedback
   */
  async validateCompleteTemplate(data: {
    title: string
    content: any
    category: string
    variables?: string[]
  }, context?: ValidationContext): Promise<RealTimeValidationResult> {
    const results = await Promise.all([
      this.validateTitleImmediate(data.title, context),
      this.validateContentImmediate(data.content, context),
      this.validateCategoryImmediate(data.category, context),
      this.validateVariablesImmediate(data.variables || [], data.content, context)
    ])

    // Combine all results
    const combinedResult: RealTimeValidationResult = {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
      suggestions: results.flatMap(r => r.suggestions)
    }

    // Add cross-field validation
    const crossFieldResult = await this.validateCrossFields(data, context)
    combinedResult.errors.push(...crossFieldResult.errors)
    combinedResult.warnings.push(...crossFieldResult.warnings)
    combinedResult.suggestions.push(...crossFieldResult.suggestions)
    combinedResult.isValid = combinedResult.isValid && crossFieldResult.isValid

    return combinedResult
  }

  /**
   * Immediate title validation (not debounced)
   */
  private async validateTitleImmediate(title: string, context?: ValidationContext): Promise<RealTimeValidationResult> {
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    try {
      // Basic Zod validation
      TemplateTitleSchema.parse(title)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(zodError => {
          errors.push({
            field: 'title',
            message: zodError.message,
            code: 'TITLE_VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    if (errors.length === 0) {
      const trimmedTitle = title.trim()

      // Check for duplicate titles
      if (context?.existingTitles && context.existingTitles.includes(trimmedTitle)) {
        errors.push({
          field: 'title',
          message: 'Ein Template mit diesem Titel existiert bereits',
          code: 'TITLE_DUPLICATE',
          severity: 'error',
          quickFix: {
            label: 'Titel ändern',
            action: () => {
              // This would be handled by the UI component
            },
            description: 'Fügen Sie eine Nummer oder zusätzliche Beschreibung hinzu'
          }
        })
      }

      // Check for very short titles
      if (trimmedTitle.length < 3) {
        warnings.push({
          field: 'title',
          message: 'Sehr kurzer Titel - erwägen Sie eine aussagekräftigere Beschreibung',
          code: 'TITLE_TOO_SHORT',
          severity: 'warning',
          suggestion: 'Fügen Sie mehr Details hinzu, um den Titel aussagekräftiger zu machen'
        })
      }

      // Check for very long titles
      if (trimmedTitle.length > 50) {
        warnings.push({
          field: 'title',
          message: 'Langer Titel könnte in der Anzeige abgeschnitten werden',
          code: 'TITLE_LONG',
          severity: 'warning',
          suggestion: 'Erwägen Sie eine kürzere, prägnantere Formulierung'
        })
      }

      // Check for generic titles
      const genericTitles = ['vorlage', 'template', 'dokument', 'document', 'neu', 'new', 'test']
      if (genericTitles.some(generic => trimmedTitle.toLowerCase().includes(generic))) {
        suggestions.push({
          field: 'title',
          message: 'Titel ist sehr generisch',
          code: 'TITLE_GENERIC',
          action: 'make_specific',
          actionLabel: 'Spezifischer machen',
          priority: 'medium'
        })
      }

      // Check for special characters that might cause issues
      if (/[<>{}]/.test(trimmedTitle)) {
        warnings.push({
          field: 'title',
          message: 'Titel enthält Sonderzeichen, die Probleme verursachen könnten',
          code: 'TITLE_SPECIAL_CHARACTERS',
          severity: 'warning',
          suggestion: 'Entfernen Sie <, >, { und } Zeichen'
        })
      }

      // Suggest improvements based on category
      if (context?.existingCategories && trimmedTitle.length > 0) {
        const titleWords = trimmedTitle.toLowerCase().split(/\s+/)
        const matchingCategories = context.existingCategories.filter(cat =>
          titleWords.some(word => cat.toLowerCase().includes(word))
        )

        if (matchingCategories.length > 0) {
          suggestions.push({
            field: 'title',
            message: `Titel passt zu Kategorie(n): ${matchingCategories.join(', ')}`,
            code: 'TITLE_CATEGORY_MATCH',
            action: 'suggest_category',
            actionLabel: 'Kategorie vorschlagen',
            priority: 'low'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Immediate content validation (not debounced)
   */
  private async validateContentImmediate(content: any, context?: ValidationContext): Promise<RealTimeValidationResult> {
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    try {
      // Basic Zod validation
      TemplateContentSchema.parse(content)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(zodError => {
          errors.push({
            field: 'content',
            message: zodError.message,
            code: 'CONTENT_VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    if (content && typeof content === 'object') {
      // Check content complexity
      const complexity = this.analyzeContentComplexity(content)

      // Warn about very complex content
      if (complexity.nodeCount > 100) {
        warnings.push({
          field: 'content',
          message: `Sehr komplexer Inhalt (${complexity.nodeCount} Elemente) - könnte Performance-Probleme verursachen`,
          code: 'CONTENT_COMPLEX',
          severity: 'warning',
          suggestion: 'Erwägen Sie die Aufteilung in mehrere kleinere Vorlagen'
        })
      }

      // Check for empty paragraphs
      if (complexity.emptyParagraphs > 3) {
        warnings.push({
          field: 'content',
          message: `${complexity.emptyParagraphs} leere Absätze gefunden`,
          code: 'CONTENT_EMPTY_PARAGRAPHS',
          severity: 'warning',
          suggestion: 'Entfernen Sie überflüssige leere Absätze für bessere Lesbarkeit'
        })
      }

      // Suggest structure improvements
      if (complexity.textLength > 500 && complexity.headingCount === 0) {
        suggestions.push({
          field: 'content',
          message: 'Längerer Text ohne Überschriften',
          code: 'CONTENT_NO_STRUCTURE',
          action: 'add_headings',
          actionLabel: 'Überschriften hinzufügen',
          priority: 'medium'
        })
      }

      // Check for very short content
      if (complexity.textLength < 10 && complexity.variableCount === 0) {
        warnings.push({
          field: 'content',
          message: 'Sehr kurzer Inhalt ohne Variablen',
          code: 'CONTENT_TOO_SHORT',
          severity: 'info',
          suggestion: 'Fügen Sie mehr Text oder Variablen hinzu'
        })
      }

      // Suggest variable usage
      if (complexity.textLength > 100 && complexity.variableCount === 0) {
        suggestions.push({
          field: 'content',
          message: 'Inhalt könnte von Variablen profitieren',
          code: 'CONTENT_NO_VARIABLES',
          action: 'suggest_variables',
          actionLabel: 'Variablen vorschlagen',
          priority: 'low'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Immediate category validation (not debounced)
   */
  private async validateCategoryImmediate(category: string, context?: ValidationContext): Promise<RealTimeValidationResult> {
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    try {
      // Basic Zod validation
      TemplateCategorySchema.parse(category)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(zodError => {
          errors.push({
            field: 'category',
            message: zodError.message,
            code: 'CATEGORY_VALIDATION_ERROR',
            severity: 'error'
          })
        })
      }
    }

    if (errors.length === 0) {
      const trimmedCategory = category.trim()

      // Check if it's a new category
      if (context?.existingCategories && !context.existingCategories.includes(trimmedCategory)) {
        warnings.push({
          field: 'category',
          message: 'Neue Kategorie wird erstellt',
          code: 'CATEGORY_NEW',
          severity: 'info',
          suggestion: 'Stellen Sie sicher, dass dies gewünscht ist'
        })

        // Suggest similar existing categories
        const similarCategories = context.existingCategories.filter(existing => {
          const similarity = this.calculateStringSimilarity(
            existing.toLowerCase(),
            trimmedCategory.toLowerCase()
          )
          return similarity > 0.6
        })

        if (similarCategories.length > 0) {
          suggestions.push({
            field: 'category',
            message: `Ähnliche Kategorien existieren: ${similarCategories.join(', ')}`,
            code: 'CATEGORY_SIMILAR_EXISTS',
            action: 'suggest_existing',
            actionLabel: 'Bestehende verwenden',
            priority: 'high'
          })
        }
      }

      // Check for special characters
      if (/[<>{}\/\\]/.test(trimmedCategory)) {
        warnings.push({
          field: 'category',
          message: 'Kategorie enthält Sonderzeichen, die Probleme verursachen könnten',
          code: 'CATEGORY_SPECIAL_CHARACTERS',
          severity: 'warning',
          suggestion: 'Entfernen Sie <, >, {, }, /, \\ Zeichen'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Immediate variable validation (not debounced)
   */
  private async validateVariablesImmediate(
    variables: string[], 
    content?: any, 
    context?: ValidationContext
  ): Promise<RealTimeValidationResult> {
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    // Extract variables from content if provided
    const contentVariables = content ? extractVariablesFromContent(content) : []

    // Check for invalid variable IDs
    variables.forEach((variableId, index) => {
      if (!isValidVariableId(variableId)) {
        errors.push({
          field: 'variables',
          message: `Ungültige Variable: ${variableId}`,
          code: 'VARIABLE_INVALID_ID',
          severity: 'error',
          position: { start: index, end: index + 1 },
          quickFix: {
            label: 'Variable entfernen',
            action: () => {
              // This would be handled by the UI component
            },
            description: 'Entfernt die ungültige Variable aus der Liste'
          }
        })
      }

      // Check if variable is defined
      const variableDefinition = getVariableById(variableId)
      if (!variableDefinition) {
        warnings.push({
          field: 'variables',
          message: `Unbekannte Variable: ${variableId}`,
          code: 'VARIABLE_UNKNOWN',
          severity: 'warning',
          position: { start: index, end: index + 1 },
          suggestion: 'Überprüfen Sie die Schreibweise oder definieren Sie die Variable'
        })
      }
    })

    // Check for variables in content that are not in the list
    const missingVariables = contentVariables.filter(v => !variables.includes(v))
    if (missingVariables.length > 0) {
      warnings.push({
        field: 'variables',
        message: `Variablen im Inhalt gefunden, die nicht in der Liste stehen: ${missingVariables.join(', ')}`,
        code: 'VARIABLES_MISSING_FROM_LIST',
        severity: 'warning',
        suggestion: 'Diese Variablen werden automatisch hinzugefügt'
      })
    }

    // Check for variables in list that are not in content
    const unusedVariables = variables.filter(v => !contentVariables.includes(v))
    if (unusedVariables.length > 0) {
      warnings.push({
        field: 'variables',
        message: `Ungenutzte Variablen in der Liste: ${unusedVariables.join(', ')}`,
        code: 'VARIABLES_UNUSED',
        severity: 'info',
        suggestion: 'Diese Variablen werden automatisch entfernt'
      })
    }

    // Check for too many variables
    if (variables.length > VALIDATION_LIMITS.MAX_VARIABLES_PER_TEMPLATE) {
      warnings.push({
        field: 'variables',
        message: `Sehr viele Variablen (${variables.length}) - könnte Performance beeinträchtigen`,
        code: 'VARIABLES_TOO_MANY',
        severity: 'warning',
        suggestion: 'Erwägen Sie die Aufteilung in mehrere Vorlagen'
      })
    }

    // Check for duplicates
    const duplicates = variables.filter((item, index) => variables.indexOf(item) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'variables',
        message: `Doppelte Variablen gefunden: ${duplicates.join(', ')}`,
        code: 'VARIABLES_DUPLICATES',
        severity: 'error',
        quickFix: {
          label: 'Duplikate entfernen',
          action: () => {
            // This would be handled by the UI component
          },
          description: 'Entfernt doppelte Variablen aus der Liste'
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Cross-field validation
   */
  private async validateCrossFields(data: {
    title: string
    content: any
    category: string
    variables?: string[]
  }, context?: ValidationContext): Promise<RealTimeValidationResult> {
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    // Check title-category consistency
    if (data.title && data.category) {
      const titleLower = data.title.toLowerCase()
      const categoryLower = data.category.toLowerCase()

      if (!titleLower.includes(categoryLower) && !categoryLower.includes(titleLower)) {
        const similarity = this.calculateStringSimilarity(titleLower, categoryLower)
        if (similarity < 0.3) {
          suggestions.push({
            field: 'title',
            message: `Titel "${data.title}" scheint nicht zur Kategorie "${data.category}" zu passen`,
            code: 'TITLE_CATEGORY_MISMATCH',
            action: 'suggest_alignment',
            actionLabel: 'Anpassung vorschlagen',
            priority: 'low'
          })
        }
      }
    }

    // Check content-variables consistency
    if (data.content && data.variables) {
      const contentVariables = extractVariablesFromContent(data.content)
      const hasVariablesInContent = contentVariables.length > 0
      const hasVariablesInList = data.variables.length > 0

      if (hasVariablesInContent && !hasVariablesInList) {
        warnings.push({
          field: 'variables',
          message: 'Variablen im Inhalt gefunden, aber keine in der Liste',
          code: 'CONTENT_VARIABLES_NOT_LISTED',
          severity: 'info',
          suggestion: 'Variablen werden automatisch extrahiert'
        })
      } else if (!hasVariablesInContent && hasVariablesInList) {
        warnings.push({
          field: 'variables',
          message: 'Variablen in der Liste, aber keine im Inhalt verwendet',
          code: 'LISTED_VARIABLES_NOT_USED',
          severity: 'info',
          suggestion: 'Ungenutzte Variablen werden entfernt'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Analyze content complexity
   */
  private analyzeContentComplexity(content: any): {
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
}

// Export singleton instance
export const realTimeValidator = new RealTimeTemplateValidator()

// Export validation hooks for React components
export const useRealTimeValidation = (debounceDelay: number = 300) => {
  return new RealTimeTemplateValidator(debounceDelay)
}