/**
 * Template variable validation utilities
 * Provides real-time validation and error highlighting for template variables
 */

import {
  PREDEFINED_VARIABLES,
  VALIDATION_ERROR_CODES,
  VALIDATION_WARNING_CODES,
  getVariableById,
  isValidVariableId
} from './template-variables'
import type { ValidationError, ValidationWarning, MentionItem } from '../types/template'

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Variable validation result
 */
export interface VariableValidationResult {
  variableId: string
  isValid: boolean
  severity: ValidationSeverity
  message: string
  code: string
  variable?: MentionItem
  suggestions?: string[]
}

/**
 * Content validation result with position information
 */
export interface ContentValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  variableResults: VariableValidationResult[]
  totalVariables: number
  validVariables: number
  invalidVariables: number
}

/**
 * Validate a single variable ID
 */
export function validateVariable(variableId: string): VariableValidationResult {
  // Check variable ID format first
  if (!isValidVariableId(variableId)) {
    return {
      variableId,
      isValid: false,
      severity: ValidationSeverity.ERROR,
      message: `Ungültiges Variablen-Format "${variableId}"`,
      code: VALIDATION_ERROR_CODES.INVALID_VARIABLE_ID
    }
  }

  const variable = getVariableById(variableId)

  // Check if variable exists
  if (!variable) {
    const suggestions = getSimilarVariables(variableId)
    return {
      variableId,
      isValid: false,
      severity: ValidationSeverity.ERROR,
      message: `Unbekannte Variable "${variableId}"`,
      code: VALIDATION_ERROR_CODES.UNKNOWN_VARIABLE,
      suggestions
    }
  }

  // Check if variable requires context
  if (variable.context && variable.context.length > 0) {
    return {
      variableId,
      isValid: true,
      severity: ValidationSeverity.WARNING,
      message: `Variable "${variable.label}" benötigt Kontext: ${variable.context.join(', ')}`,
      code: VALIDATION_WARNING_CODES.CONTEXT_REQUIRED,
      variable
    }
  }

  // Variable is valid
  return {
    variableId,
    isValid: true,
    severity: ValidationSeverity.INFO,
    message: `Variable "${variable.label}" ist gültig`,
    code: 'VALID_VARIABLE',
    variable
  }
}

/**
 * Validate multiple variables
 */
export function validateVariables(variableIds: string[]): VariableValidationResult[] {
  return variableIds.map(validateVariable)
}

/**
 * Get similar variables for suggestions (fuzzy matching)
 */
export function getSimilarVariables(input: string, maxSuggestions: number = 3): string[] {
  const lowercaseInput = input.toLowerCase()
  const suggestions: Array<{ id: string; score: number }> = []

  PREDEFINED_VARIABLES.forEach(variable => {
    const score = calculateSimilarity(lowercaseInput, variable.id.toLowerCase())
    if (score > 0.3) { // Minimum similarity threshold
      suggestions.push({ id: variable.id, score })
    }
  })

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map(s => s.id)
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
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
 * Validate template content and extract variable information
 */
export function validateTemplateContent(content: any): ContentValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const variableResults: VariableValidationResult[] = []
  const variableIds = new Set<string>()

  // Extract and validate variables from content
  const extractAndValidateVariables = (node: any): void => {
    if (!node || typeof node !== 'object') return

    // Check for mention nodes
    if (node.type === 'mention' && node.attrs?.id) {
      const variableId = node.attrs.id
      variableIds.add(variableId)

      // Validate the variable
      const result = validateVariable(variableId)
      variableResults.push(result)

      // Add to errors/warnings based on severity
      if (result.severity === ValidationSeverity.ERROR) {
        errors.push({
          field: 'content',
          message: result.message,
          code: result.code
        })
      } else if (result.severity === ValidationSeverity.WARNING) {
        warnings.push({
          field: 'content',
          message: result.message,
          code: result.code
        })
      }
    }

    // Recursively check content
    if (Array.isArray(node.content)) {
      node.content.forEach(extractAndValidateVariables)
    }

    // Check marks for inline mentions
    if (Array.isArray(node.marks)) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'mention' && mark.attrs?.id) {
          const variableId = mark.attrs.id
          variableIds.add(variableId)

          const result = validateVariable(variableId)
          variableResults.push(result)

          if (result.severity === ValidationSeverity.ERROR) {
            errors.push({
              field: 'content',
              message: result.message,
              code: result.code
            })
          } else if (result.severity === ValidationSeverity.WARNING) {
            warnings.push({
              field: 'content',
              message: result.message,
              code: result.code
            })
          }
        }
      })
    }
  }

  // Process content
  if (Array.isArray(content)) {
    content.forEach(extractAndValidateVariables)
  } else {
    extractAndValidateVariables(content)
  }

  const totalVariables = variableIds.size
  const validVariables = variableResults.filter(r => r.isValid).length
  const invalidVariables = totalVariables - validVariables

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    variableResults,
    totalVariables,
    validVariables,
    invalidVariables
  }
}

/**
 * Get validation CSS classes for variable highlighting
 */
export function getVariableValidationClasses(variableId: string): string {
  const result = validateVariable(variableId)
  
  const baseClasses = 'mention-variable'
  
  switch (result.severity) {
    case ValidationSeverity.ERROR:
      return `${baseClasses} mention-error border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300`
    case ValidationSeverity.WARNING:
      return `${baseClasses} mention-warning border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300`
    case ValidationSeverity.INFO:
      return `${baseClasses} mention-valid border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300`
    default:
      return baseClasses
  }
}

/**
 * Get validation icon for variable
 */
export function getVariableValidationIcon(variableId: string): string {
  const result = validateVariable(variableId)
  
  switch (result.severity) {
    case ValidationSeverity.ERROR:
      return '❌'
    case ValidationSeverity.WARNING:
      return '⚠️'
    case ValidationSeverity.INFO:
      return '✅'
    default:
      return '❓'
  }
}

/**
 * Format validation message for display
 */
export function formatValidationMessage(result: VariableValidationResult): string {
  let message = result.message

  if (result.suggestions && result.suggestions.length > 0) {
    message += ` Meinten Sie: ${result.suggestions.join(', ')}?`
  }

  return message
}

/**
 * Check if variable is deprecated or has special handling
 */
export function isVariableDeprecated(variableId: string): boolean {
  // For future use - mark variables as deprecated
  const deprecatedVariables = new Set<string>([
    // Add deprecated variable IDs here
  ])

  return deprecatedVariables.has(variableId)
}

/**
 * Get variable usage statistics from validation results
 */
export function getVariableUsageStats(results: VariableValidationResult[]): {
  total: number
  valid: number
  invalid: number
  warnings: number
  errors: number
  byCategory: Record<string, number>
} {
  const stats = {
    total: results.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    errors: 0,
    byCategory: {} as Record<string, number>
  }

  results.forEach(result => {
    if (result.isValid) {
      stats.valid++
    } else {
      stats.invalid++
    }

    if (result.severity === ValidationSeverity.ERROR) {
      stats.errors++
    } else if (result.severity === ValidationSeverity.WARNING) {
      stats.warnings++
    }

    if (result.variable) {
      const category = result.variable.category
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    }
  })

  return stats
}

/**
 * Generate validation report for template
 */
export function generateValidationReport(content: any): {
  summary: string
  details: string[]
  recommendations: string[]
} {
  const validation = validateTemplateContent(content)
  const stats = getVariableUsageStats(validation.variableResults)

  const summary = `Vorlage enthält ${stats.total} Variable(n): ${stats.valid} gültig, ${stats.invalid} ungültig, ${stats.warnings} Warnungen`

  const details: string[] = []
  const recommendations: string[] = []

  if (stats.errors > 0) {
    details.push(`❌ ${stats.errors} Fehler gefunden`)
    recommendations.push('Beheben Sie alle Fehler vor dem Speichern')
  }

  if (stats.warnings > 0) {
    details.push(`⚠️ ${stats.warnings} Warnungen`)
    recommendations.push('Überprüfen Sie Variablen mit Kontextanforderungen')
  }

  if (stats.valid > 0) {
    details.push(`✅ ${stats.valid} gültige Variablen`)
  }

  if (stats.total === 0) {
    recommendations.push('Fügen Sie Variablen mit "@" hinzu, um die Vorlage dynamisch zu gestalten')
  }

  return {
    summary,
    details,
    recommendations
  }
}