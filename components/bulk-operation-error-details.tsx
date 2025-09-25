/**
 * Component for displaying detailed error information from bulk operations
 * Shows categorized errors with user-friendly messages and retry options
 */

"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BulkOperationResult,
  EnhancedError,
  ErrorCategory,
  ErrorSeverity,
  groupErrorsByCategory
} from '@/lib/bulk-operations-error-handling'
import { cn } from '@/lib/utils'

interface BulkOperationErrorDetailsProps {
  result: BulkOperationResult
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function BulkOperationErrorDetails({
  result,
  onRetry,
  isRetrying = false,
  className
}: BulkOperationErrorDetailsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ErrorCategory>>(new Set())
  
  if (result.errors.length === 0) {
    return null
  }

  const errorsByCategory = groupErrorsByCategory(result.errors)
  const categories = Object.keys(errorsByCategory) as ErrorCategory[]

  const toggleCategory = (category: ErrorCategory) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fehlerdetails
          </CardTitle>
          {result.canRetry && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
              {isRetrying ? 'Wird wiederholt...' : 'Wiederholen'}
            </Button>
          )}
        </div>
        
        {/* Summary */}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {result.updatedCount} erfolgreich
          </Badge>
          {result.failedCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              {result.failedCount} fehlgeschlagen
            </Badge>
          )}
          {result.skippedCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              {result.skippedCount} übersprungen
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {categories.map((category, index) => {
          const categoryErrors = errorsByCategory[category]
          const isExpanded = expandedCategories.has(category)
          
          return (
            <div key={category}>
              <Collapsible
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(category)}
                      <div className="text-left">
                        <div className="font-medium">
                          {getCategoryTitle(category)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {categoryErrors.length} {categoryErrors.length === 1 ? 'Fehler' : 'Fehler'}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2 pl-4">
                    {categoryErrors.map((error, errorIndex) => (
                      <ErrorItem key={`${error.id}-${errorIndex}`} error={error} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {index < categories.length - 1 && <Separator className="mt-4" />}
            </div>
          )
        })}

        {/* Retry information */}
        {result.canRetry && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Wiederholbare Fehler
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  {result.retryableIds.length} {result.retryableIds.length === 1 ? 'Eintrag kann' : 'Einträge können'} wiederholt werden. 
                  Diese Fehler sind möglicherweise temporär und können durch einen erneuten Versuch behoben werden.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ErrorItemProps {
  error: EnhancedError
}

function ErrorItem({ error }: ErrorItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        {getSeverityIcon(error.severity)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">ID: {error.id}</span>
          <Badge variant={getSeverityVariant(error.severity)} className="text-xs">
            {getSeverityLabel(error.severity)}
          </Badge>
          {error.retryable && (
            <Badge variant="outline" className="text-xs">
              Wiederholbar
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground mb-1">
          {error.userMessage}
        </p>
        {error.technicalDetails && (
          <p className="text-xs text-muted-foreground font-mono">
            {error.technicalDetails}
          </p>
        )}
      </div>
    </div>
  )
}

function getCategoryIcon(category: ErrorCategory) {
  switch (category) {
    case 'network':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'server':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    case 'validation':
      return <Info className="h-5 w-5 text-blue-500" />
    case 'permission':
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />
  }
}

function getCategoryTitle(category: ErrorCategory): string {
  switch (category) {
    case 'network':
      return 'Netzwerkfehler'
    case 'server':
      return 'Serverfehler'
    case 'validation':
      return 'Validierungsfehler'
    case 'permission':
      return 'Berechtigungsfehler'
    default:
      return 'Unbekannte Fehler'
  }
}

function getSeverityIcon(severity: ErrorSeverity) {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

function getSeverityLabel(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Kritisch'
    case 'high':
      return 'Hoch'
    case 'medium':
      return 'Mittel'
    case 'low':
      return 'Niedrig'
  }
}

function getSeverityVariant(severity: ErrorSeverity): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
  }
}