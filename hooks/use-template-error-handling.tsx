'use client'

/**
 * Template Error Handling Hook
 * 
 * Provides React hooks for template error handling, recovery, and user feedback
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { 
  TemplateError, 
  TemplateErrorHandler, 
  TemplateErrorType,
  TemplateErrorRecovery 
} from '@/lib/template-error-handler'
import { TemplateErrorLogger, TemplateErrorReporter } from '@/lib/template-error-logger'

// Hook return type
interface UseTemplateErrorHandling {
  // Error state
  error: TemplateError | null
  hasError: boolean
  isRecovering: boolean
  
  // Error handling functions
  handleError: (error: TemplateError) => void
  handleException: (exception: any, context?: TemplateError['context']) => void
  clearError: () => void
  
  // Recovery functions
  retry: (operation: () => Promise<void> | void) => Promise<void>
  safeExecute: <T>(operation: () => Promise<T>, fallback?: T) => Promise<T | undefined>
  
  // Utility functions
  createError: (type: TemplateErrorType, message: string, details?: any) => TemplateError
  reportError: (error: TemplateError) => void
}

// Hook options
interface UseTemplateErrorHandlingOptions {
  context?: {
    templateId?: string
    userId?: string
    component?: string
  }
  onError?: (error: TemplateError) => void
  onRecovery?: () => void
  autoReport?: boolean
  showToast?: boolean
}

/**
 * Main template error handling hook
 */
export function useTemplateErrorHandling(
  options: UseTemplateErrorHandlingOptions = {}
): UseTemplateErrorHandling {
  const [error, setError] = useState<TemplateError | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  
  const {
    context,
    onError,
    onRecovery,
    autoReport = true,
    showToast = true
  } = options
  
  // Handle error
  const handleError = useCallback((templateError: TemplateError) => {
    setError(templateError)
    
    // Show user feedback
    if (showToast) {
      TemplateErrorHandler.handleError(templateError)
    }
    
    // Report error
    if (autoReport) {
      TemplateErrorReporter.reportError(templateError)
    }
    
    // Call custom error handler
    onError?.(templateError)
  }, [onError, autoReport, showToast])
  
  // Handle exception
  const handleException = useCallback((exception: any, errorContext?: TemplateError['context']) => {
    const templateError = TemplateErrorHandler.fromException(
      exception,
      { ...context, ...errorContext }
    )
    handleError(templateError)
  }, [handleError, context])
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null)
    setIsRecovering(false)
  }, [])
  
  // Retry operation
  const retry = useCallback(async (operation: () => Promise<void> | void) => {
    setIsRecovering(true)
    
    try {
      await operation()
      clearError()
      onRecovery?.()
      
      if (showToast) {
        toast({
          title: "Erfolgreich wiederhergestellt",
          description: "Der Vorgang wurde erfolgreich wiederholt.",
          variant: "default"
        })
      }
    } catch (exception) {
      handleException(exception, { ...context, operation: 'retry' })
    } finally {
      setIsRecovering(false)
    }
  }, [clearError, handleException, onRecovery, showToast, context])
  
  // Safe execute with error handling
  const safeExecute = useCallback(async <T,>(
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await operation()
    } catch (exception) {
      handleException(exception, { ...context, operation: 'safeExecute' })
      return fallback
    }
  }, [handleException, context])
  
  // Create error
  const createError = useCallback((
    type: TemplateErrorType,
    message: string,
    details?: any
  ): TemplateError => {
    return TemplateErrorHandler.createError(type, message, details, context)
  }, [context])
  
  // Report error
  const reportError = useCallback((templateError: TemplateError) => {
    TemplateErrorReporter.reportError(templateError)
  }, [])
  
  return {
    error,
    hasError: error !== null,
    isRecovering,
    handleError,
    handleException,
    clearError,
    retry,
    safeExecute,
    createError,
    reportError
  }
}

/**
 * Hook for template operation error handling
 */
export function useTemplateOperationError(templateId?: string) {
  return useTemplateErrorHandling({
    context: {
      templateId,
      component: 'TemplateOperation'
    }
  })
}

/**
 * Hook for template editor error handling
 */
export function useTemplateEditorError(templateId?: string) {
  return useTemplateErrorHandling({
    context: {
      templateId,
      component: 'TemplateEditor'
    },
    showToast: true,
    autoReport: true
  })
}

/**
 * Hook for template list error handling
 */
export function useTemplateListError() {
  return useTemplateErrorHandling({
    context: {
      component: 'TemplateList'
    }
  })
}

/**
 * Hook for safe async operations with retry
 */
export function useSafeAsyncOperation<T>() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<TemplateError | null>(null)
  const [data, setData] = useState<T | null>(null)
  
  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: {
      retries?: number
      onError?: (error: TemplateError) => void
      context?: TemplateError['context']
    } = {}
  ) => {
    const { retries = 3, onError, context } = options
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await TemplateErrorRecovery.retryOperation(operation, retries)
      setData(result)
      return result
    } catch (exception) {
      const templateError = TemplateErrorHandler.fromException(exception, context)
      setError(templateError)
      
      TemplateErrorHandler.handleError(templateError)
      TemplateErrorReporter.reportError(templateError)
      
      onError?.(templateError)
      throw templateError
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const reset = useCallback(() => {
    setError(null)
    setData(null)
    setIsLoading(false)
  }, [])
  
  return {
    execute,
    reset,
    isLoading,
    error,
    data,
    hasError: error !== null
  }
}

/**
 * Hook for error statistics and monitoring
 */
export function useTemplateErrorStatistics() {
  const [statistics, setStatistics] = useState(() => 
    TemplateErrorReporter.getDashboardData()
  )
  
  const refreshStatistics = useCallback(() => {
    setStatistics(TemplateErrorReporter.getDashboardData())
  }, [])
  
  // Auto-refresh statistics
  useEffect(() => {
    const interval = setInterval(refreshStatistics, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [refreshStatistics])
  
  const generateReport = useCallback(() => {
    return TemplateErrorReporter.generateReport()
  }, [])
  
  const clearLogs = useCallback(() => {
    TemplateErrorLogger.getInstance().clearLogs()
    refreshStatistics()
  }, [refreshStatistics])
  
  return {
    statistics,
    refreshStatistics,
    generateReport,
    clearLogs
  }
}

/**
 * Hook for form validation error handling
 */
export function useTemplateFormError() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }, [])
  
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const { [field]: _, ...rest } = prev
      return rest
    })
  }, [])
  
  const clearAllErrors = useCallback(() => {
    setFieldErrors({})
  }, [])
  
  const hasFieldError = useCallback((field: string) => {
    return field in fieldErrors
  }, [fieldErrors])
  
  const getFieldError = useCallback((field: string) => {
    return fieldErrors[field]
  }, [fieldErrors])
  
  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasFieldError,
    getFieldError
  }
}