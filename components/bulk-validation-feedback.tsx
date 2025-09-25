'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { validationService } from '@/lib/bulk-operations-validation'
import { BulkOperation, TableType, ValidationResult } from '@/types/bulk-operations'

interface BulkValidationFeedbackProps {
  operation: BulkOperation | null
  selectedIds: string[]
  tableType: TableType | null
  operationData?: any
  onValidationChange?: (result: ValidationResult | null) => void
  className?: string
}

export function BulkValidationFeedback({
  operation,
  selectedIds,
  tableType,
  operationData,
  onValidationChange,
  className
}: BulkValidationFeedbackProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Perform validation when inputs change
  useEffect(() => {
    if (!operation || !tableType || selectedIds.length === 0) {
      setValidationResult(null)
      onValidationChange?.(null)
      return
    }

    const validateOperation = async () => {
      setIsValidating(true)
      try {
        const result = await validationService.validateRealTime(
          operation,
          selectedIds,
          tableType,
          operationData
        )
        setValidationResult(result)
        onValidationChange?.(result)
      } catch (error) {
        console.error('Validation error:', error)
        const errorResult: ValidationResult = {
          isValid: false,
          validIds: [],
          invalidIds: selectedIds,
          errors: [{
            id: 'general',
            field: 'general',
            message: 'Validation failed. Please try again.'
          }]
        }
        setValidationResult(errorResult)
        onValidationChange?.(errorResult)
      } finally {
        setIsValidating(false)
      }
    }

    // Debounce validation to avoid excessive API calls
    const timeoutId = setTimeout(validateOperation, 300)
    return () => clearTimeout(timeoutId)
  }, [operation, selectedIds, tableType, operationData, onValidationChange])

  if (!operation || !tableType || selectedIds.length === 0) {
    return null
  }

  if (isValidating) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Validating selected records...
        </AlertDescription>
      </Alert>
    )
  }

  if (!validationResult) {
    return null
  }

  const summary = validationService.getValidationSummary(validationResult)
  const { canProceed, message, details } = summary

  const getAlertVariant = () => {
    if (validationResult.isValid) return 'default'
    if (canProceed) return 'default'
    return 'destructive'
  }

  const getIcon = () => {
    if (validationResult.isValid) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (canProceed) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <Alert variant={getAlertVariant()} className={className}>
      {getIcon()}
      <AlertDescription>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>{message}</span>
            <div className="flex items-center gap-2">
              {validationResult.validIds.length > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {validationResult.validIds.length} valid
                </Badge>
              )}
              {validationResult.invalidIds.length > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {validationResult.invalidIds.length} invalid
                </Badge>
              )}
            </div>
          </div>

          {details.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-sm">
                  {showDetails ? 'Hide details' : 'Show details'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-1">
                  {details.map((detail, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {detail}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Hook for using validation feedback in components
export function useValidationFeedback(
  operation: BulkOperation | null,
  selectedIds: string[],
  tableType: TableType | null,
  operationData?: any
) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const canProceed = validationResult ? 
    validationService.getValidationSummary(validationResult).canProceed : 
    false

  const hasValidRecords = validationResult ? validationResult.validIds.length > 0 : false
  const hasInvalidRecords = validationResult ? validationResult.invalidIds.length > 0 : false

  return {
    validationResult,
    isValidating,
    canProceed,
    hasValidRecords,
    hasInvalidRecords,
    setValidationResult,
    setIsValidating
  }
}