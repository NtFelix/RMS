"use client"

import React, { useState, useCallback } from 'react'
import { TemplatesModalErrorHandler } from '@/lib/template-error-handler'

export interface UseTemplateErrorHandlingOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: Error) => void
  onRetry?: (attempt: number) => void
  onSuccess?: () => void
}

export interface TemplateOperationState {
  isLoading: boolean
  error: Error | null
  retryCount: number
  canRetry: boolean
}

/**
 * Hook for handling template operations with built-in error handling and retry mechanisms
 */
export function useTemplateErrorHandling(options: UseTemplateErrorHandlingOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    onSuccess
  } = options

  const [state, setState] = useState<TemplateOperationState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    canRetry: true
  })

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
          retryCount: 0,
          canRetry: true
        }))

        if (onSuccess) {
          onSuccess()
        }

        return result
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          setState(prev => ({
            ...prev,
            retryCount: attempt + 1,
            canRetry: true
          }))

          if (onRetry) {
            onRetry(attempt + 1)
          }

          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: lastError,
            retryCount: attempt + 1,
            canRetry: false
          }))

          // Handle the error using our centralized error handler
          TemplatesModalErrorHandler.handleGenericError(
            lastError,
            operationName,
            context
          )

          if (onError) {
            onError(lastError)
          }
        }
      }
    }

    return null
  }, [maxRetries, retryDelay, onError, onRetry, onSuccess])

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      retryCount: 0,
      canRetry: true,
      error: null
    }))

    return executeWithErrorHandling(operation, operationName, context)
  }, [executeWithErrorHandling])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      canRetry: true
    })
  }, [])

  return {
    ...state,
    executeWithErrorHandling,
    retry,
    reset
  }
}

/**
 * Specialized hook for template loading operations
 */
export function useTemplateLoadingErrorHandling() {
  return useTemplateErrorHandling({
    maxRetries: 2,
    retryDelay: 1000,
    onError: (error) => {
      TemplatesModalErrorHandler.handleLoadError(error)
    }
  })
}

/**
 * Specialized hook for template deletion operations
 */
export function useTemplateDeletionErrorHandling() {
  return useTemplateErrorHandling({
    maxRetries: 1,
    retryDelay: 500,
    onError: (error) => {
      // Error handling is done in the component with template title context
    }
  })
}

/**
 * Specialized hook for template search operations
 */
export function useTemplateSearchErrorHandling() {
  return useTemplateErrorHandling({
    maxRetries: 1,
    retryDelay: 500,
    onError: (error) => {
      TemplatesModalErrorHandler.handleSearchError(error, 'search operation')
    }
  })
}

/**
 * Hook for handling network-related errors specifically
 */
export function useNetworkErrorHandling() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const checkNetworkStatus = useCallback(() => {
    setIsOnline(navigator.onLine)
    return navigator.onLine
  }, [])

  const handleNetworkError = useCallback((error: Error, operation: string) => {
    if (!checkNetworkStatus()) {
      TemplatesModalErrorHandler.handleNetworkError(
        new Error('No internet connection'),
        operation
      )
    } else {
      TemplatesModalErrorHandler.handleNetworkError(error, operation)
    }
  }, [checkNetworkStatus])

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    checkNetworkStatus,
    handleNetworkError
  }
}

/**
 * Hook for graceful degradation when errors occur
 */
export function useGracefulDegradation<T>(
  fallbackValue: T,
  operation: () => Promise<T>,
  operationName: string
) {
  const [value, setValue] = useState<T>(fallbackValue)
  const [isUsingFallback, setIsUsingFallback] = useState(false)
  
  const { executeWithErrorHandling, isLoading, error } = useTemplateErrorHandling({
    onError: () => {
      setValue(fallbackValue)
      setIsUsingFallback(true)
    },
    onSuccess: () => {
      setIsUsingFallback(false)
    }
  })

  const execute = useCallback(async () => {
    const result = await executeWithErrorHandling(operation, operationName)
    if (result !== null) {
      setValue(result)
    }
  }, [executeWithErrorHandling, operation, operationName])

  return {
    value,
    isLoading,
    error,
    isUsingFallback,
    execute
  }
}