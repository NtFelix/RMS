/**
 * Enhanced toast component specifically for bulk operation feedback
 * Provides detailed success/error information with retry capabilities
 */

"use client"

import React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BulkOperationResult } from '@/lib/bulk-operations-error-handling'
import { cn } from '@/lib/utils'

interface BulkOperationFeedbackToastProps {
  result: BulkOperationResult
  onRetry?: () => void
  onViewDetails?: () => void
  isRetrying?: boolean
  className?: string
}

export function BulkOperationFeedbackToast({
  result,
  onRetry,
  onViewDetails,
  isRetrying = false,
  className
}: BulkOperationFeedbackToastProps) {
  const { updatedCount, failedCount, skippedCount, totalCount, canRetry, summary } = result
  
  // Calculate progress percentage
  const progressPercentage = totalCount > 0 ? (updatedCount / totalCount) * 100 : 0
  
  // Determine toast variant based on result
  const getToastVariant = () => {
    if (updatedCount === totalCount && failedCount === 0) {
      return 'success'
    } else if (updatedCount > 0) {
      return 'warning'
    } else {
      return 'error'
    }
  }
  
  const variant = getToastVariant()
  
  return (
    <div className={cn(
      "w-full max-w-md p-4 rounded-lg border shadow-lg",
      variant === 'success' && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
      variant === 'warning' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
      variant === 'error' && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          {variant === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
          {variant === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
          {variant === 'error' && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-sm",
            variant === 'success' && "text-green-900 dark:text-green-100",
            variant === 'warning' && "text-yellow-900 dark:text-yellow-100",
            variant === 'error' && "text-red-900 dark:text-red-100"
          )}>
            {getTitle(variant, updatedCount, failedCount)}
          </h4>
          
          <p className={cn(
            "text-sm mt-1",
            variant === 'success' && "text-green-700 dark:text-green-300",
            variant === 'warning' && "text-yellow-700 dark:text-yellow-300",
            variant === 'error' && "text-red-700 dark:text-red-300"
          )}>
            {summary}
          </p>
        </div>
      </div>
      
      {/* Progress bar for partial success/failure */}
      {totalCount > 0 && (updatedCount > 0 || failedCount > 0) && (
        <div className="mb-3">
          <Progress 
            value={progressPercentage} 
            className={cn(
              "h-2",
              variant === 'success' && "[&>div]:bg-green-600",
              variant === 'warning' && "[&>div]:bg-yellow-600",
              variant === 'error' && "[&>div]:bg-red-600"
            )}
          />
          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
            <span>{updatedCount} von {totalCount} erfolgreich</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      )}
      
      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {updatedCount > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {updatedCount} erfolgreich
          </Badge>
        )}
        {failedCount > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {failedCount} fehlgeschlagen
          </Badge>
        )}
        {skippedCount > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            {skippedCount} übersprungen
          </Badge>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        {canRetry && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
            {isRetrying ? 'Wird wiederholt...' : 'Wiederholen'}
          </Button>
        )}
        
        {(failedCount > 0 || skippedCount > 0) && onViewDetails && (
          <Button
            onClick={onViewDetails}
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
          >
            <Eye className="h-3 w-3" />
            Details anzeigen
          </Button>
        )}
      </div>
      
      {/* Retry information */}
      {canRetry && !isRetrying && (
        <div className={cn(
          "mt-3 p-2 rounded text-xs",
          variant === 'success' && "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
          variant === 'warning' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
          variant === 'error' && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
        )}>
          {result.retryableIds.length} {result.retryableIds.length === 1 ? 'Eintrag kann' : 'Einträge können'} wiederholt werden.
        </div>
      )}
    </div>
  )
}

function getTitle(variant: 'success' | 'warning' | 'error', updatedCount: number, failedCount: number): string {
  switch (variant) {
    case 'success':
      return 'Erfolgreich abgeschlossen'
    case 'warning':
      return 'Teilweise erfolgreich'
    case 'error':
      return failedCount > 0 ? 'Vorgang fehlgeschlagen' : 'Keine Änderungen'
    default:
      return 'Bulk-Operation abgeschlossen'
  }
}