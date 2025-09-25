/**
 * Custom hook for handling bulk operations errors with retry mechanisms
 * and user feedback
 */

import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  BulkOperationResult,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateRetryDelay,
  processBulkOperationResult,
  createUserErrorMessage,
  classifyFetchError
} from '@/lib/bulk-operations-error-handling'
import { BulkOperation, BulkOperationResponse } from '@/types/bulk-operations'

interface RetryState {
  isRetrying: boolean
  retryCount: number
  retryableIds: string[]
  lastError: Error | null
}

interface BulkOperationErrorHandler {
  retryState: RetryState
  handleBulkOperationResult: (
    response: BulkOperationResponse,
    totalRequested: number,
    validationSkipped?: number
  ) => BulkOperationResult
  handleBulkOperationError: (
    error: Error,
    operation: BulkOperation,
    selectedIds: string[]
  ) => void
  retryFailedOperation: (
    operation: BulkOperation,
    data: any,
    performOperation: (operation: BulkOperation, data: any) => Promise<BulkOperationResponse>
  ) => Promise<void>
  clearRetryState: () => void
  showSuccessToast: (result: BulkOperationResult) => void
  showErrorToast: (result: BulkOperationResult) => void
  showRetryToast: (retryCount: number, maxRetries: number) => void
}

export function useBulkOperationsErrorHandler(
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): BulkOperationErrorHandler {
  const { toast } = useToast()
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    retryableIds: [],
    lastError: null
  })
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Handles successful bulk operation results and shows appropriate feedback
   */
  const handleBulkOperationResult = useCallback((
    response: BulkOperationResponse,
    totalRequested: number,
    validationSkipped: number = 0
  ): BulkOperationResult => {
    const result = processBulkOperationResult(response, totalRequested, validationSkipped)
    
    // Update retry state with retryable IDs
    setRetryState(prev => ({
      ...prev,
      retryableIds: result.retryableIds,
      lastError: null
    }))
    
    // Show appropriate toast notification
    if (result.success && result.failedCount === 0) {
      showSuccessToast(result)
    } else if (result.updatedCount > 0) {
      // Partial success - show warning toast
      showPartialSuccessToast(result)
    } else {
      showErrorToast(result)
    }
    
    return result
  }, [])

  /**
   * Handles bulk operation errors (network, server, etc.)
   */
  const handleBulkOperationError = useCallback((
    error: Error,
    operation: BulkOperation,
    selectedIds: string[]
  ) => {
    const errorCode = classifyFetchError(error)
    
    setRetryState(prev => ({
      ...prev,
      lastError: error,
      retryableIds: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(errorCode) 
        ? selectedIds 
        : []
    }))
    
    // Show error toast with retry option if applicable
    const canRetry = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(errorCode)
    
    toast({
      variant: "destructive",
      title: "Fehler bei der Bulk-Operation",
      description: getErrorDescription(error, canRetry)
    })
  }, [toast])

  /**
   * Retries a failed bulk operation with exponential backoff
   */
  const retryFailedOperation = useCallback(async (
    operation: BulkOperation,
    data: any,
    performOperation: (operation: BulkOperation, data: any) => Promise<BulkOperationResponse>
  ) => {
    if (retryState.retryCount >= config.maxRetries) {
      toast({
        variant: "destructive",
        title: "Maximale Wiederholungen erreicht",
        description: "Die Operation konnte nach mehreren Versuchen nicht abgeschlossen werden."
      })
      return
    }

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }))

    const delay = calculateRetryDelay(retryState.retryCount + 1, config)
    
    showRetryToast(retryState.retryCount + 1, config.maxRetries)

    try {
      // Wait for the calculated delay
      await new Promise(resolve => {
        retryTimeoutRef.current = setTimeout(resolve, delay)
      })

      // Perform the retry with only retryable IDs
      const retryData = {
        ...data,
        selectedIds: retryState.retryableIds
      }

      const response = await performOperation(operation, retryData)
      const result = handleBulkOperationResult(response, retryState.retryableIds.length)

      if (result.success || result.updatedCount > 0) {
        setRetryState({
          isRetrying: false,
          retryCount: 0,
          retryableIds: [],
          lastError: null
        })
      } else if (result.canRetry && retryState.retryCount < config.maxRetries) {
        // Continue retrying if there are still retryable errors
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
          retryableIds: result.retryableIds
        }))
      } else {
        // No more retries possible
        setRetryState(prev => ({
          ...prev,
          isRetrying: false,
          retryableIds: []
        }))
      }

    } catch (error) {
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: error as Error
      }))

      handleBulkOperationError(error as Error, operation, retryState.retryableIds)
    }
  }, [retryState, config, toast, handleBulkOperationResult, handleBulkOperationError])

  /**
   * Clears the retry state
   */
  const clearRetryState = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      retryableIds: [],
      lastError: null
    })
  }, [])

  /**
   * Shows success toast notification
   */
  const showSuccessToast = useCallback((result: BulkOperationResult) => {
    const message = createUserErrorMessage(result)
    
    toast({
      variant: "default", // Using default instead of success for now
      title: message.title,
      description: message.description
    })
  }, [toast])

  /**
   * Shows partial success toast notification
   */
  const showPartialSuccessToast = useCallback((result: BulkOperationResult) => {
    const message = createUserErrorMessage(result)
    
    toast({
      variant: "default",
      title: message.title,
      description: message.description,

    })
  }, [toast])

  /**
   * Shows error toast notification
   */
  const showErrorToast = useCallback((result: BulkOperationResult) => {
    const message = createUserErrorMessage(result)
    
    toast({
      variant: "destructive",
      title: message.title,
      description: message.description,

    })
  }, [toast])

  /**
   * Shows retry attempt toast notification
   */
  const showRetryToast = useCallback((retryCount: number, maxRetries: number) => {
    toast({
      variant: "default",
      title: "Wiederholung läuft...",
      description: `Versuch ${retryCount} von ${maxRetries}. Bitte warten Sie einen Moment.`
    })
  }, [toast])

  return {
    retryState,
    handleBulkOperationResult,
    handleBulkOperationError,
    retryFailedOperation,
    clearRetryState,
    showSuccessToast,
    showErrorToast,
    showRetryToast
  }
}

/**
 * Helper function to get user-friendly error descriptions
 */
function getErrorDescription(error: Error, canRetry: boolean): string {
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return canRetry 
      ? 'Netzwerkfehler aufgetreten. Klicken Sie auf "Wiederholen" um es erneut zu versuchen.'
      : 'Netzwerkfehler aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.'
  }
  
  if (error.message.includes('timeout')) {
    return canRetry
      ? 'Die Anfrage ist abgelaufen. Klicken Sie auf "Wiederholen" um es erneut zu versuchen.'
      : 'Die Anfrage ist abgelaufen. Bitte versuchen Sie es später erneut.'
  }
  
  return canRetry
    ? 'Ein Fehler ist aufgetreten. Klicken Sie auf "Wiederholen" um es erneut zu versuchen.'
    : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
}