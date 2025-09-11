'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Lightbulb, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { 
  RealTimeValidationResult, 
  RealTimeValidationError, 
  RealTimeValidationWarning,
  RealTimeValidationSuggestion 
} from '@/lib/template-real-time-validation'

interface ValidationFeedbackProps {
  result: RealTimeValidationResult
  className?: string
  showSuggestions?: boolean
  onQuickFix?: (error: RealTimeValidationError) => void
  onSuggestionAction?: (suggestion: RealTimeValidationSuggestion) => void
}

/**
 * Main validation feedback component that displays errors, warnings, and suggestions
 */
export function ValidationFeedback({
  result,
  className,
  showSuggestions = true,
  onQuickFix,
  onSuggestionAction
}: ValidationFeedbackProps) {
  if (!result.errors.length && !result.warnings.length && (!showSuggestions || !result.suggestions.length)) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Errors */}
      {result.errors.map((error, index) => (
        <ValidationErrorAlert
          key={`error-${index}`}
          error={error}
          onQuickFix={onQuickFix}
        />
      ))}

      {/* Warnings */}
      {result.warnings.map((warning, index) => (
        <ValidationWarningAlert
          key={`warning-${index}`}
          warning={warning}
        />
      ))}

      {/* Suggestions */}
      {showSuggestions && result.suggestions.map((suggestion, index) => (
        <ValidationSuggestionAlert
          key={`suggestion-${index}`}
          suggestion={suggestion}
          onAction={onSuggestionAction}
        />
      ))}
    </div>
  )
}

interface ValidationErrorAlertProps {
  error: RealTimeValidationError
  onQuickFix?: (error: RealTimeValidationError) => void
}

function ValidationErrorAlert({ error, onQuickFix }: ValidationErrorAlertProps) {
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      case 'warning':
        return <AlertCircle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getVariant = () => {
    switch (error.severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'destructive'
    }
  }

  return (
    <Alert variant={getVariant() as any} className="relative">
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <span className="font-medium">{error.field}:</span> {error.message}
                {error.position && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Position {error.position.start}-{error.position.end}
                  </Badge>
                )}
              </div>
              {error.quickFix && onQuickFix && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onQuickFix(error)}
                        className="h-6 px-2 text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {error.quickFix.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{error.quickFix.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

interface ValidationWarningAlertProps {
  warning: RealTimeValidationWarning
}

function ValidationWarningAlert({ warning }: ValidationWarningAlertProps) {
  const getIcon = () => {
    switch (warning.severity) {
      case 'warning':
        return <AlertCircle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getColorClass = () => {
    switch (warning.severity) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      default:
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200'
    }
  }

  return (
    <div className={cn('rounded-md border p-3', getColorClass())}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-medium">{warning.field}:</span> {warning.message}
            {warning.position && (
              <Badge variant="outline" className="ml-2 text-xs">
                Position {warning.position.start}-{warning.position.end}
              </Badge>
            )}
          </div>
          {warning.suggestion && (
            <div className="mt-1 text-xs opacity-80">
              💡 {warning.suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ValidationSuggestionAlertProps {
  suggestion: RealTimeValidationSuggestion
  onAction?: (suggestion: RealTimeValidationSuggestion) => void
}

function ValidationSuggestionAlert({ suggestion, onAction }: ValidationSuggestionAlertProps) {
  const getPriorityColor = () => {
    switch (suggestion.priority) {
      case 'high':
        return 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
      case 'medium':
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
      case 'low':
        return 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-200'
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
    }
  }

  return (
    <div className={cn('rounded-md border p-3', getPriorityColor())}>
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="text-sm">
                <span className="font-medium">{suggestion.field}:</span> {suggestion.message}
              </div>
              <Badge variant="outline" className="mt-1 text-xs">
                {suggestion.priority} Priorität
              </Badge>
            </div>
            {onAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(suggestion)}
                className="h-6 px-2 text-xs"
              >
                {suggestion.actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface InlineValidationIndicatorProps {
  hasErrors: boolean
  hasWarnings: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Inline validation indicator for form fields
 */
export function InlineValidationIndicator({
  hasErrors,
  hasWarnings,
  className,
  size = 'md'
}: InlineValidationIndicatorProps) {
  if (!hasErrors && !hasWarnings) {
    return (
      <CheckCircle className={cn(
        'text-green-500',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-4 w-4',
        size === 'lg' && 'h-5 w-5',
        className
      )} />
    )
  }

  if (hasErrors) {
    return (
      <AlertTriangle className={cn(
        'text-red-500',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-4 w-4',
        size === 'lg' && 'h-5 w-5',
        className
      )} />
    )
  }

  if (hasWarnings) {
    return (
      <AlertCircle className={cn(
        'text-yellow-500',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-4 w-4',
        size === 'lg' && 'h-5 w-5',
        className
      )} />
    )
  }

  return null
}

interface ValidationSummaryProps {
  result: RealTimeValidationResult
  className?: string
}

/**
 * Compact validation summary component
 */
export function ValidationSummary({ result, className }: ValidationSummaryProps) {
  const errorCount = result.errors.length
  const warningCount = result.warnings.length
  const suggestionCount = result.suggestions.length

  if (errorCount === 0 && warningCount === 0 && suggestionCount === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600 dark:text-green-400', className)}>
        <CheckCircle className="h-4 w-4" />
        <span>Alle Validierungen bestanden</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      {errorCount > 0 && (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>{errorCount} Fehler</span>
        </div>
      )}
      
      {warningCount > 0 && (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <span>{warningCount} Warnungen</span>
        </div>
      )}
      
      {suggestionCount > 0 && (
        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <Lightbulb className="h-4 w-4" />
          <span>{suggestionCount} Vorschläge</span>
        </div>
      )}
    </div>
  )
}

interface FieldValidationWrapperProps {
  children: React.ReactNode
  result?: RealTimeValidationResult
  fieldName: string
  className?: string
  showInlineIndicator?: boolean
}

/**
 * Wrapper component that adds validation styling to form fields
 */
export function FieldValidationWrapper({
  children,
  result,
  fieldName,
  className,
  showInlineIndicator = true
}: FieldValidationWrapperProps) {
  const fieldErrors = result?.errors.filter(e => e.field === fieldName) || []
  const fieldWarnings = result?.warnings.filter(w => w.field === fieldName) || []
  
  const hasErrors = fieldErrors.length > 0
  const hasWarnings = fieldWarnings.length > 0

  const getValidationClass = () => {
    if (hasErrors) {
      return 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
    }
    if (hasWarnings) {
      return 'border-yellow-300 focus-within:border-yellow-500 focus-within:ring-yellow-500'
    }
    if (result && !hasErrors && !hasWarnings) {
      return 'border-green-300 focus-within:border-green-500 focus-within:ring-green-500'
    }
    return ''
  }

  return (
    <div className={cn('relative', className)}>
      <div className={cn('relative', getValidationClass())}>
        {children}
        {showInlineIndicator && result && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <InlineValidationIndicator
              hasErrors={hasErrors}
              hasWarnings={hasWarnings}
              size="sm"
            />
          </div>
        )}
      </div>
      
      {/* Field-specific validation feedback */}
      {(fieldErrors.length > 0 || fieldWarnings.length > 0) && (
        <div className="mt-1">
          <ValidationFeedback
            result={{
              isValid: !hasErrors,
              errors: fieldErrors,
              warnings: fieldWarnings,
              suggestions: []
            }}
            showSuggestions={false}
          />
        </div>
      )}
    </div>
  )
}

interface ValidationProgressProps {
  result: RealTimeValidationResult
  className?: string
}

/**
 * Progress indicator showing validation completeness
 */
export function ValidationProgress({ result, className }: ValidationProgressProps) {
  const totalIssues = result.errors.length + result.warnings.length
  const criticalIssues = result.errors.length
  
  // Calculate progress (100% when no errors, partial when only warnings)
  const progress = totalIssues === 0 ? 100 : 
    criticalIssues === 0 ? 75 : 
    Math.max(0, 50 - (criticalIssues * 10))

  const getProgressColor = () => {
    if (progress === 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Validierung</span>
        <span className={cn(
          'font-medium',
          progress === 100 ? 'text-green-600 dark:text-green-400' :
          progress >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
          'text-red-600 dark:text-red-400'
        )}>
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', getProgressColor())}
          style={{ width: `${progress}%` }}
        />
      </div>
      {totalIssues > 0 && (
        <div className="text-xs text-muted-foreground">
          {criticalIssues > 0 && `${criticalIssues} Fehler`}
          {criticalIssues > 0 && result.warnings.length > 0 && ', '}
          {result.warnings.length > 0 && `${result.warnings.length} Warnungen`}
        </div>
      )}
    </div>
  )
}