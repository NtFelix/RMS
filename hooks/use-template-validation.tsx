import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  realTimeValidator, 
  type RealTimeValidationResult,
  type ValidationContext 
} from '@/lib/template-real-time-validation'

interface UseTemplateValidationOptions {
  debounceDelay?: number
  validateOnMount?: boolean
  context?: ValidationContext
}

interface TemplateFormData {
  title: string
  content: any
  category: string
  variables?: string[]
}

/**
 * Hook for managing real-time template validation
 */
export function useTemplateValidation(
  initialData: Partial<TemplateFormData> = {},
  options: UseTemplateValidationOptions = {}
) {
  const {
    debounceDelay = 300,
    validateOnMount = false,
    context
  } = options

  const [formData, setFormData] = useState<TemplateFormData>({
    title: initialData.title || '',
    content: initialData.content || null,
    category: initialData.category || '',
    variables: initialData.variables || []
  })

  const [validationResults, setValidationResults] = useState<{
    title: RealTimeValidationResult
    content: RealTimeValidationResult
    category: RealTimeValidationResult
    variables: RealTimeValidationResult
    overall: RealTimeValidationResult
  }>({
    title: { isValid: true, errors: [], warnings: [], suggestions: [] },
    content: { isValid: true, errors: [], warnings: [], suggestions: [] },
    category: { isValid: true, errors: [], warnings: [], suggestions: [] },
    variables: { isValid: true, errors: [], warnings: [], suggestions: [] },
    overall: { isValid: true, errors: [], warnings: [], suggestions: [] }
  })

  const [isValidating, setIsValidating] = useState(false)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Validate individual fields
  const validateField = useCallback(async (
    field: keyof TemplateFormData,
    value: any
  ): Promise<RealTimeValidationResult> => {
    try {
      switch (field) {
        case 'title':
          return await realTimeValidator.validateTitle(value, context)
        case 'content':
          return await realTimeValidator.validateContent(value, context)
        case 'category':
          return await realTimeValidator.validateCategory(value, context)
        case 'variables':
          return await realTimeValidator.validateVariables(value, formData.content, context)
        default:
          return { isValid: true, errors: [], warnings: [], suggestions: [] }
      }
    } catch (error) {
      console.error(`Validation error for ${field}:`, error)
      return {
        isValid: false,
        errors: [{
          field,
          message: 'Validierung fehlgeschlagen',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
    }
  }, [context, formData.content])

  // Validate complete form
  const validateCompleteForm = useCallback(async (
    data: TemplateFormData
  ): Promise<RealTimeValidationResult> => {
    try {
      return await realTimeValidator.validateCompleteTemplate(data, context)
    } catch (error) {
      console.error('Complete form validation error:', error)
      return {
        isValid: false,
        errors: [{
          field: 'form',
          message: 'Formular-Validierung fehlgeschlagen',
          code: 'FORM_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      }
    }
  }, [context])

  // Debounced validation function
  const debouncedValidate = useCallback(async (data: TemplateFormData) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(async () => {
      setIsValidating(true)

      try {
        // Validate individual fields
        const [titleResult, contentResult, categoryResult, variablesResult] = await Promise.all([
          validateField('title', data.title),
          validateField('content', data.content),
          validateField('category', data.category),
          validateField('variables', data.variables || [])
        ])

        // Validate complete form
        const overallResult = await validateCompleteForm(data)

        setValidationResults({
          title: titleResult,
          content: contentResult,
          category: categoryResult,
          variables: variablesResult,
          overall: overallResult
        })
      } catch (error) {
        console.error('Validation error:', error)
      } finally {
        setIsValidating(false)
      }
    }, debounceDelay)
  }, [debounceDelay, validateField, validateCompleteForm])

  // Update form data and trigger validation
  const updateField = useCallback((field: keyof TemplateFormData, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    debouncedValidate(newData)
  }, [formData, debouncedValidate])

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<TemplateFormData>) => {
    const newData = { ...formData, ...updates }
    setFormData(newData)
    debouncedValidate(newData)
  }, [formData, debouncedValidate])

  // Get validation result for a specific field
  const getFieldValidation = useCallback((field: keyof TemplateFormData) => {
    return validationResults[field] || { isValid: true, errors: [], warnings: [], suggestions: [] }
  }, [validationResults])

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return Object.values(validationResults).every(result => result.isValid)
  }, [validationResults])

  // Get all errors across all fields
  const getAllErrors = useCallback(() => {
    return Object.values(validationResults).flatMap(result => result.errors)
  }, [validationResults])

  // Get all warnings across all fields
  const getAllWarnings = useCallback(() => {
    return Object.values(validationResults).flatMap(result => result.warnings)
  }, [validationResults])

  // Get all suggestions across all fields
  const getAllSuggestions = useCallback(() => {
    return Object.values(validationResults).flatMap(result => result.suggestions)
  }, [validationResults])

  // Reset validation state
  const resetValidation = useCallback(() => {
    setValidationResults({
      title: { isValid: true, errors: [], warnings: [], suggestions: [] },
      content: { isValid: true, errors: [], warnings: [], suggestions: [] },
      category: { isValid: true, errors: [], warnings: [], suggestions: [] },
      variables: { isValid: true, errors: [], warnings: [], suggestions: [] },
      overall: { isValid: true, errors: [], warnings: [], suggestions: [] }
    })
    setIsValidating(false)
  }, [])

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      debouncedValidate(formData)
    }
  }, [validateOnMount, debouncedValidate, formData])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Form data
    formData,
    updateField,
    updateFields,
    
    // Validation results
    validationResults,
    getFieldValidation,
    isFormValid,
    isValidating,
    
    // Aggregated results
    getAllErrors,
    getAllWarnings,
    getAllSuggestions,
    
    // Actions
    resetValidation,
    validateNow: () => debouncedValidate(formData)
  }
}

/**
 * Hook for validating a single field with real-time feedback
 */
export function useFieldValidation(
  fieldName: keyof TemplateFormData,
  initialValue: any = '',
  options: UseTemplateValidationOptions = {}
) {
  const [value, setValue] = useState(initialValue)
  const [validationResult, setValidationResult] = useState<RealTimeValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  })
  const [isValidating, setIsValidating] = useState(false)

  const {
    debounceDelay = 300,
    validateOnMount = false,
    context
  } = options

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const validateField = useCallback(async (fieldValue: any) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(async () => {
      setIsValidating(true)

      try {
        let result: RealTimeValidationResult

        switch (fieldName) {
          case 'title':
            result = await realTimeValidator.validateTitle(fieldValue, context)
            break
          case 'content':
            result = await realTimeValidator.validateContent(fieldValue, context)
            break
          case 'category':
            result = await realTimeValidator.validateCategory(fieldValue, context)
            break
          case 'variables':
            result = await realTimeValidator.validateVariables(fieldValue, undefined, context)
            break
          default:
            result = { isValid: true, errors: [], warnings: [], suggestions: [] }
        }

        setValidationResult(result)
      } catch (error) {
        console.error(`Field validation error for ${fieldName}:`, error)
        setValidationResult({
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
    }, debounceDelay)
  }, [fieldName, debounceDelay, context])

  const updateValue = useCallback((newValue: any) => {
    setValue(newValue)
    validateField(newValue)
  }, [validateField])

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validateField(value)
    }
  }, [validateOnMount, validateField, value])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [])

  return {
    value,
    updateValue,
    validationResult,
    isValidating,
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
    suggestions: validationResult.suggestions
  }
}