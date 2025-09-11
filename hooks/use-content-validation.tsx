/**
 * Content Validation Hook
 * 
 * React hook for managing template content validation with real-time feedback,
 * validation summaries, and rule configuration.
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { debounce } from 'lodash'
import { 
  contentValidationSystem,
  type ContentValidationSummary,
  type ContentValidationContext,
  type ContentValidationRule,
  type ContentValidationIssue
} from '@/lib/template-content-validation-system'
import { 
  realTimeValidator,
  type RealTimeValidationResult,
  type ValidationContext
} from '@/lib/template-real-time-validation'

// Hook options interface
export interface UseContentValidationOptions {
  debounceDelay?: number
  enableRealTime?: boolean
  enableSummary?: boolean
  autoValidate?: boolean
  strictMode?: boolean
  context?: ContentValidationContext
}

// Hook return type
export interface UseContentValidationReturn {
  // Validation results
  summary: ContentValidationSummary | null
  realTimeResult: RealTimeValidationResult | null
  isValidating: boolean
  lastValidated: Date | null

  // Validation functions
  validateContent: (content: any) => Promise<ContentValidationSummary>
  validateRealTime: (content: any) => Promise<RealTimeValidationResult>
  clearValidation: () => void

  // Rule management
  rules: ContentValidationRule[]
  enabledRules: Set<string>
  configureRule: (ruleId: string, enabled: boolean) => void
  resetRules: () => void

  // Validation state
  hasErrors: boolean
  hasWarnings: boolean
  hasSuggestions: boolean
  validationScore: number
  totalIssues: number

  // Issue handling
  getIssuesByCategory: () => Record<string, ContentValidationIssue[]>
  getIssuesBySeverity: (severity: 'error' | 'warning' | 'info') => ContentValidationIssue[]
  handleQuickFix: (issue: ContentValidationIssue) => void
}

/**
 * Content validation hook
 */
export function useContentValidation(
  initialContent?: any,
  options: UseContentValidationOptions = {}
): UseContentValidationReturn {
  const {
    debounceDelay = 500,
    enableRealTime = true,
    enableSummary = true,
    autoValidate = true,
    strictMode = false,
    context = {}
  } = options

  // State
  const [summary, setSummary] = useState<ContentValidationSummary | null>(null)
  const [realTimeResult, setRealTimeResult] = useState<RealTimeValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidated, setLastValidated] = useState<Date | null>(null)
  const [enabledRules, setEnabledRules] = useState<Set<string>>(new Set())

  // Refs
  const contentRef = useRef<any>(initialContent)
  const validationTimeoutRef = useRef<NodeJS.Timeout>()

  // Get all available rules
  const rules = useMemo(() => {
    return contentValidationSystem.getAllRules()
  }, [])

  // Initialize enabled rules
  useEffect(() => {
    const defaultEnabledRules = new Set(
      rules.filter(rule => rule.enabled).map(rule => rule.id)
    )
    setEnabledRules(defaultEnabledRules)
  }, [rules])

  // Debounced validation functions
  const debouncedValidateContent = useCallback(
    debounce(async (content: any) => {
      if (!enableSummary) return

      setIsValidating(true)
      try {
        const validationContext: ContentValidationContext = {
          ...context,
          strictMode
        }
        
        const result = contentValidationSystem.validateContent(content, validationContext)
        setSummary(result)
        setLastValidated(new Date())
      } catch (error) {
        console.error('Content validation failed:', error)
        setSummary({
          isValid: false,
          score: 0,
          totalIssues: 1,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          issuesByCategory: {
            system: [{
              ruleId: 'validation_error',
              severity: 'error',
              message: 'Validierung fehlgeschlagen',
              description: error instanceof Error ? error.message : 'Unbekannter Fehler'
            }]
          },
          recommendations: ['Überprüfen Sie den Inhalt und versuchen Sie es erneut']
        })
      } finally {
        setIsValidating(false)
      }
    }, debounceDelay),
    [enableSummary, context, strictMode, debounceDelay]
  )

  const debouncedValidateRealTime = useCallback(
    debounce(async (content: any) => {
      if (!enableRealTime) return

      try {
        const validationContext: ValidationContext = {
          ...context,
          strictMode
        }
        
        const result = await realTimeValidator.validateContent(content, validationContext)
        setRealTimeResult(result)
      } catch (error) {
        console.error('Real-time validation failed:', error)
        setRealTimeResult({
          isValid: false,
          errors: [{
            field: 'content',
            message: 'Validierung fehlgeschlagen',
            code: 'VALIDATION_ERROR',
            severity: 'error'
          }],
          warnings: [],
          suggestions: []
        })
      }
    }, Math.min(debounceDelay, 300)), // Real-time validation should be faster
    [enableRealTime, context, strictMode, debounceDelay]
  )

  // Manual validation functions
  const validateContent = useCallback(async (content: any): Promise<ContentValidationSummary> => {
    contentRef.current = content
    setIsValidating(true)

    try {
      const validationContext: ContentValidationContext = {
        ...context,
        strictMode
      }
      
      const result = contentValidationSystem.validateContent(content, validationContext)
      setSummary(result)
      setLastValidated(new Date())
      return result
    } catch (error) {
      console.error('Content validation failed:', error)
      const errorResult: ContentValidationSummary = {
        isValid: false,
        score: 0,
        totalIssues: 1,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        issuesByCategory: {
          system: [{
            ruleId: 'validation_error',
            severity: 'error',
            message: 'Validierung fehlgeschlagen',
            description: error instanceof Error ? error.message : 'Unbekannter Fehler'
          }]
        },
        recommendations: ['Überprüfen Sie den Inhalt und versuchen Sie es erneut']
      }
      setSummary(errorResult)
      return errorResult
    } finally {
      setIsValidating(false)
    }
  }, [context, strictMode])

  const validateRealTime = useCallback(async (content: any): Promise<RealTimeValidationResult> => {
    contentRef.current = content

    try {
      const validationContext: ValidationContext = {
        ...context,
        strictMode
      }
      
      const result = await realTimeValidator.validateContent(content, validationContext)
      setRealTimeResult(result)
      return result
    } catch (error) {
      console.error('Real-time validation failed:', error)
      const errorResult: RealTimeValidationResult = {
        isValid: false,
        errors: [{
          field: 'content',
          message: 'Validierung fehlgeschlagen',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
      setRealTimeResult(errorResult)
      return errorResult
    }
  }, [context, strictMode])

  // Auto-validation effect
  useEffect(() => {
    if (!autoValidate || !initialContent) return

    contentRef.current = initialContent

    if (enableSummary) {
      debouncedValidateContent(initialContent)
    }

    if (enableRealTime) {
      debouncedValidateRealTime(initialContent)
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [initialContent, autoValidate, enableSummary, enableRealTime, debouncedValidateContent, debouncedValidateRealTime])

  // Rule configuration
  const configureRule = useCallback((ruleId: string, enabled: boolean) => {
    setEnabledRules(prev => {
      const newSet = new Set(prev)
      if (enabled) {
        newSet.add(ruleId)
      } else {
        newSet.delete(ruleId)
      }
      return newSet
    })

    // Update the validation system
    contentValidationSystem.configureRule(ruleId, enabled)

    // Re-validate if content exists
    if (contentRef.current && autoValidate) {
      if (enableSummary) {
        debouncedValidateContent(contentRef.current)
      }
      if (enableRealTime) {
        debouncedValidateRealTime(contentRef.current)
      }
    }
  }, [autoValidate, enableSummary, enableRealTime, debouncedValidateContent, debouncedValidateRealTime])

  const resetRules = useCallback(() => {
    const defaultEnabledRules = new Set(
      rules.filter(rule => rule.enabled).map(rule => rule.id)
    )
    setEnabledRules(defaultEnabledRules)

    // Reset validation system rules
    rules.forEach(rule => {
      contentValidationSystem.configureRule(rule.id, rule.enabled)
    })

    // Re-validate if content exists
    if (contentRef.current && autoValidate) {
      if (enableSummary) {
        debouncedValidateContent(contentRef.current)
      }
      if (enableRealTime) {
        debouncedValidateRealTime(contentRef.current)
      }
    }
  }, [rules, autoValidate, enableSummary, enableRealTime, debouncedValidateContent, debouncedValidateRealTime])

  // Clear validation results
  const clearValidation = useCallback(() => {
    setSummary(null)
    setRealTimeResult(null)
    setLastValidated(null)
    setIsValidating(false)
  }, [])

  // Computed values
  const hasErrors = useMemo(() => {
    return (summary?.errorCount || 0) > 0 || (realTimeResult?.errors.length || 0) > 0
  }, [summary, realTimeResult])

  const hasWarnings = useMemo(() => {
    return (summary?.warningCount || 0) > 0 || (realTimeResult?.warnings.length || 0) > 0
  }, [summary, realTimeResult])

  const hasSuggestions = useMemo(() => {
    return (summary?.infoCount || 0) > 0 || (realTimeResult?.suggestions.length || 0) > 0
  }, [summary, realTimeResult])

  const validationScore = useMemo(() => {
    return summary?.score || 0
  }, [summary])

  const totalIssues = useMemo(() => {
    return summary?.totalIssues || 0
  }, [summary])

  // Issue helpers
  const getIssuesByCategory = useCallback(() => {
    return summary?.issuesByCategory || {}
  }, [summary])

  const getIssuesBySeverity = useCallback((severity: 'error' | 'warning' | 'info') => {
    if (!summary) return []
    
    return Object.values(summary.issuesByCategory)
      .flat()
      .filter(issue => issue.severity === severity)
  }, [summary])

  const handleQuickFix = useCallback((issue: ContentValidationIssue) => {
    if (issue.quickFix) {
      try {
        issue.quickFix.action()
        
        // Re-validate after quick fix
        if (contentRef.current && autoValidate) {
          if (enableSummary) {
            debouncedValidateContent(contentRef.current)
          }
          if (enableRealTime) {
            debouncedValidateRealTime(contentRef.current)
          }
        }
      } catch (error) {
        console.error('Quick fix failed:', error)
      }
    }
  }, [autoValidate, enableSummary, enableRealTime, debouncedValidateContent, debouncedValidateRealTime])

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedValidateContent.cancel()
      debouncedValidateRealTime.cancel()
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [debouncedValidateContent, debouncedValidateRealTime])

  return {
    // Validation results
    summary,
    realTimeResult,
    isValidating,
    lastValidated,

    // Validation functions
    validateContent,
    validateRealTime,
    clearValidation,

    // Rule management
    rules,
    enabledRules,
    configureRule,
    resetRules,

    // Validation state
    hasErrors,
    hasWarnings,
    hasSuggestions,
    validationScore,
    totalIssues,

    // Issue handling
    getIssuesByCategory,
    getIssuesBySeverity,
    handleQuickFix
  }
}

/**
 * Hook for validating specific content fields
 */
export function useFieldValidation(
  fieldName: string,
  initialValue?: any,
  options: UseContentValidationOptions = {}
) {
  const [value, setValue] = useState(initialValue)
  const [fieldResult, setFieldResult] = useState<RealTimeValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const {
    debounceDelay = 300,
    context = {}
  } = options

  const debouncedValidate = useCallback(
    debounce(async (fieldValue: any) => {
      setIsValidating(true)
      try {
        const validationContext: ValidationContext = {
          ...context
        }
        
        let result: RealTimeValidationResult

        switch (fieldName) {
          case 'title':
            result = await realTimeValidator.validateTitle(fieldValue, validationContext)
            break
          case 'category':
            result = await realTimeValidator.validateCategory(fieldValue, validationContext)
            break
          case 'content':
            result = await realTimeValidator.validateContent(fieldValue, validationContext)
            break
          default:
            result = {
              isValid: true,
              errors: [],
              warnings: [],
              suggestions: []
            }
        }

        setFieldResult(result)
      } catch (error) {
        console.error(`Field validation failed for ${fieldName}:`, error)
        setFieldResult({
          isValid: false,
          errors: [{
            field: fieldName,
            message: 'Validierung fehlgeschlagen',
            code: 'FIELD_VALIDATION_ERROR',
            severity: 'error'
          }],
          warnings: [],
          suggestions: []
        })
      } finally {
        setIsValidating(false)
      }
    }, debounceDelay),
    [fieldName, context, debounceDelay]
  )

  const updateValue = useCallback((newValue: any) => {
    setValue(newValue)
    debouncedValidate(newValue)
  }, [debouncedValidate])

  useEffect(() => {
    if (initialValue !== undefined) {
      setValue(initialValue)
      debouncedValidate(initialValue)
    }
  }, [initialValue, debouncedValidate])

  useEffect(() => {
    return () => {
      debouncedValidate.cancel()
    }
  }, [debouncedValidate])

  return {
    value,
    setValue: updateValue,
    result: fieldResult,
    isValidating,
    isValid: fieldResult?.isValid ?? true,
    hasErrors: (fieldResult?.errors.length || 0) > 0,
    hasWarnings: (fieldResult?.warnings.length || 0) > 0,
    hasSuggestions: (fieldResult?.suggestions.length || 0) > 0
  }
}