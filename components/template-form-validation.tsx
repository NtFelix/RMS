'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  realTimeValidator, 
  type RealTimeValidationResult,
  type ValidationContext 
} from '@/lib/template-real-time-validation'
import { ValidationFeedback, FieldValidationWrapper, ValidationProgress } from './template-validation-feedback'
import { 
  GuidanceTooltip, 
  ContextualHelp, 
  SmartGuidance,
  ProgressiveDisclosure 
} from './template-guidance-tooltips'
import { 
  AccessibleFormField, 
  ValidationAnnouncer, 
  StatusAnnouncer,
  ScreenReaderOnly 
} from './template-accessibility'

interface ValidatedInputProps {
  value: string
  onChange: (value: string) => void
  fieldName: string
  label: string
  placeholder?: string
  description?: string
  required?: boolean
  validationContext?: ValidationContext
  className?: string
  showGuidance?: boolean
  guidanceContent?: string
  maxLength?: number
}

/**
 * Input component with real-time validation and accessibility features
 */
export function ValidatedInput({
  value,
  onChange,
  fieldName,
  label,
  placeholder,
  description,
  required = false,
  validationContext,
  className,
  showGuidance = true,
  guidanceContent,
  maxLength
}: ValidatedInputProps) {
  const [validationResult, setValidationResult] = useState<RealTimeValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  })
  const [isValidating, setIsValidating] = useState(false)

  const validateField = useCallback(async (inputValue: string) => {
    if (!inputValue.trim() && !required) {
      setValidationResult({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })
      return
    }

    setIsValidating(true)
    
    try {
      let result: RealTimeValidationResult
      
      switch (fieldName) {
        case 'title':
          result = await realTimeValidator.validateTitle(inputValue, validationContext)
          break
        case 'category':
          result = await realTimeValidator.validateCategory(inputValue, validationContext)
          break
        default:
          result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
          }
      }
      
      setValidationResult(result)
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        isValid: false,
        errors: [{
          field: fieldName,
          message: 'Validierung fehlgeschlagen',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      })
    } finally {
      setIsValidating(false)
    }
  }, [fieldName, required, validationContext])

  useEffect(() => {
    validateField(value)
  }, [value, validateField])

  const fieldId = `${fieldName}-input`
  const hasErrors = validationResult.errors.length > 0
  const hasWarnings = validationResult.warnings.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="erforderlich">
              *
            </span>
          )}
        </Label>
        
        {showGuidance && (
          <ContextualHelp topic={`template-${fieldName}`} />
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <FieldValidationWrapper
        result={validationResult}
        fieldName={fieldName}
        showInlineIndicator={true}
      >
        <Input
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            hasErrors && 'border-destructive focus-visible:ring-destructive',
            hasWarnings && !hasErrors && 'border-yellow-500 focus-visible:ring-yellow-500'
          )}
          aria-invalid={hasErrors}
          aria-describedby={`${fieldId}-validation`}
        />
      </FieldValidationWrapper>

      {maxLength && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value.length}/{maxLength} Zeichen</span>
          {isValidating && <span>Validierung...</span>}
        </div>
      )}

      <div id={`${fieldId}-validation`}>
        <ValidationFeedback
          result={validationResult}
          showSuggestions={true}
        />
      </div>

      <ValidationAnnouncer
        errors={validationResult.errors.map(e => e.message)}
        warnings={validationResult.warnings.map(w => w.message)}
        fieldName={label}
      />

      <ScreenReaderOnly>
        {isValidating && `${label} wird validiert`}
        {validationResult.isValid && !isValidating && `${label} ist gültig`}
      </ScreenReaderOnly>
    </div>
  )
}