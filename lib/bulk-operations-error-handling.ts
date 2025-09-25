/**
 * Comprehensive error handling utilities for bulk operations
 * Provides error classification, retry mechanisms, and user-friendly messaging
 */

import { BulkOperationError, BulkOperationResponse } from '@/types/bulk-operations'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'network' | 'validation' | 'permission' | 'server' | 'unknown'

export interface EnhancedError {
  id: string
  message: string
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  userMessage: string
  technicalDetails?: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface BulkOperationResult {
  success: boolean
  updatedCount: number
  failedCount: number
  skippedCount: number
  totalCount: number
  errors: EnhancedError[]
  canRetry: boolean
  retryableIds: string[]
  summary: string
  detailedMessage: string
}

/**
 * Default retry configuration for bulk operations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
    'TEMPORARY_UNAVAILABLE',
    'RATE_LIMITED'
  ]
}

/**
 * Error code mappings to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, { message: string; category: ErrorCategory; severity: ErrorSeverity; retryable: boolean }> = {
  // Network errors
  'NETWORK_ERROR': {
    message: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
    category: 'network',
    severity: 'medium',
    retryable: true
  },
  'TIMEOUT': {
    message: 'Die Anfrage ist abgelaufen. Bitte versuchen Sie es erneut.',
    category: 'network',
    severity: 'medium',
    retryable: true
  },
  'CONNECTION_FAILED': {
    message: 'Verbindung zum Server fehlgeschlagen.',
    category: 'network',
    severity: 'high',
    retryable: true
  },

  // Server errors
  'SERVER_ERROR': {
    message: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    category: 'server',
    severity: 'high',
    retryable: true
  },
  'INTERNAL_ERROR': {
    message: 'Ein interner Fehler ist aufgetreten.',
    category: 'server',
    severity: 'critical',
    retryable: false
  },
  'DATABASE_ERROR': {
    message: 'Datenbankfehler. Bitte versuchen Sie es später erneut.',
    category: 'server',
    severity: 'high',
    retryable: true
  },

  // Permission errors
  'PERMISSION_DENIED': {
    message: 'Sie haben keine Berechtigung für diese Aktion.',
    category: 'permission',
    severity: 'high',
    retryable: false
  },
  'NOT_FOUND': {
    message: 'Der Eintrag wurde nicht gefunden oder Sie haben keinen Zugriff.',
    category: 'permission',
    severity: 'medium',
    retryable: false
  },
  'ACCESS_DENIED': {
    message: 'Zugriff verweigert.',
    category: 'permission',
    severity: 'high',
    retryable: false
  },

  // Validation errors
  'VALIDATION_FAILED': {
    message: 'Die Validierung ist fehlgeschlagen.',
    category: 'validation',
    severity: 'medium',
    retryable: false
  },
  'INVALID_DATA': {
    message: 'Die eingegebenen Daten sind ungültig.',
    category: 'validation',
    severity: 'medium',
    retryable: false
  },
  'CONSTRAINT_VIOLATION': {
    message: 'Die Aktion verletzt eine Datenbank-Einschränkung.',
    category: 'validation',
    severity: 'medium',
    retryable: false
  },

  // Operation-specific errors
  'UPDATE_FAILED': {
    message: 'Die Aktualisierung ist fehlgeschlagen.',
    category: 'server',
    severity: 'medium',
    retryable: true
  },
  'CONCURRENT_MODIFICATION': {
    message: 'Der Eintrag wurde von einem anderen Benutzer geändert.',
    category: 'validation',
    severity: 'medium',
    retryable: true
  },
  'RATE_LIMITED': {
    message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
    category: 'server',
    severity: 'medium',
    retryable: true
  }
}

/**
 * Enhances basic bulk operation errors with additional context and user-friendly messages
 */
export function enhanceErrors(errors: BulkOperationError[]): EnhancedError[] {
  return errors.map(error => {
    const errorInfo = ERROR_MESSAGES[error.code] || {
      message: 'Ein unbekannter Fehler ist aufgetreten.',
      category: 'unknown' as ErrorCategory,
      severity: 'medium' as ErrorSeverity,
      retryable: false
    }

    return {
      id: error.id,
      message: error.message,
      code: error.code,
      category: errorInfo.category,
      severity: errorInfo.severity,
      retryable: errorInfo.retryable,
      userMessage: errorInfo.message,
      technicalDetails: error.message !== errorInfo.message ? error.message : undefined
    }
  })
}

/**
 * Processes bulk operation response and creates a comprehensive result
 */
export function processBulkOperationResult(
  response: BulkOperationResponse,
  totalRequested: number,
  validationSkipped: number = 0
): BulkOperationResult {
  const enhancedErrors = enhanceErrors(response.errors)
  const failedCount = response.failedIds.length
  const updatedCount = response.updatedCount
  const skippedCount = validationSkipped
  const retryableErrors = enhancedErrors.filter(error => error.retryable)
  const canRetry = retryableErrors.length > 0
  const retryableIds = retryableErrors.map(error => error.id)

  // Generate summary message
  let summary = ''
  if (updatedCount > 0) {
    summary = `${updatedCount} ${updatedCount === 1 ? 'Eintrag' : 'Einträge'} erfolgreich aktualisiert`
  }
  
  if (failedCount > 0) {
    if (summary) summary += ', '
    summary += `${failedCount} fehlgeschlagen`
  }
  
  if (skippedCount > 0) {
    if (summary) summary += ', '
    summary += `${skippedCount} übersprungen`
  }

  if (!summary) {
    summary = 'Keine Änderungen vorgenommen'
  }

  // Generate detailed message
  let detailedMessage = summary + '.'
  
  if (canRetry) {
    detailedMessage += ` ${retryableErrors.length} ${retryableErrors.length === 1 ? 'Fehler kann' : 'Fehler können'} wiederholt werden.`
  }

  const criticalErrors = enhancedErrors.filter(error => error.severity === 'critical')
  if (criticalErrors.length > 0) {
    detailedMessage += ' Kritische Fehler erfordern möglicherweise Administratorunterstützung.'
  }

  return {
    success: response.success,
    updatedCount,
    failedCount,
    skippedCount,
    totalCount: totalRequested,
    errors: enhancedErrors,
    canRetry,
    retryableIds,
    summary,
    detailedMessage
  }
}

/**
 * Calculates delay for retry attempts using exponential backoff
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  )
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay
  return Math.floor(delay + jitter)
}

/**
 * Determines if an error is retryable based on its code
 */
export function isRetryableError(errorCode: string, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return config.retryableErrors.includes(errorCode)
}

/**
 * Groups errors by category for better user presentation
 */
export function groupErrorsByCategory(errors: EnhancedError[]): Record<ErrorCategory, EnhancedError[]> {
  return errors.reduce((groups, error) => {
    if (!groups[error.category]) {
      groups[error.category] = []
    }
    groups[error.category].push(error)
    return groups
  }, {} as Record<ErrorCategory, EnhancedError[]>)
}

/**
 * Gets the highest severity level from a list of errors
 */
export function getHighestSeverity(errors: EnhancedError[]): ErrorSeverity {
  const severityOrder: ErrorSeverity[] = ['low', 'medium', 'high', 'critical']
  
  return errors.reduce((highest, error) => {
    const currentIndex = severityOrder.indexOf(error.severity)
    const highestIndex = severityOrder.indexOf(highest)
    return currentIndex > highestIndex ? error.severity : highest
  }, 'low' as ErrorSeverity)
}

/**
 * Creates user-friendly error messages for different scenarios
 */
export function createUserErrorMessage(result: BulkOperationResult): {
  title: string
  description: string
  actionable: boolean
} {
  const { updatedCount, failedCount, skippedCount, errors, canRetry } = result
  
  if (updatedCount > 0 && failedCount === 0 && skippedCount === 0) {
    // Complete success
    return {
      title: 'Erfolgreich abgeschlossen',
      description: `${updatedCount} ${updatedCount === 1 ? 'Eintrag wurde' : 'Einträge wurden'} erfolgreich aktualisiert.`,
      actionable: false
    }
  }
  
  if (updatedCount === 0 && failedCount > 0) {
    // Complete failure
    const highestSeverity = getHighestSeverity(errors)
    const title = highestSeverity === 'critical' ? 'Kritischer Fehler' : 'Vorgang fehlgeschlagen'
    
    return {
      title,
      description: canRetry 
        ? `Alle ${failedCount} Einträge konnten nicht aktualisiert werden. Sie können es erneut versuchen.`
        : `Alle ${failedCount} Einträge konnten nicht aktualisiert werden.`,
      actionable: canRetry
    }
  }
  
  // Partial success/failure
  let description = `${updatedCount} ${updatedCount === 1 ? 'Eintrag wurde' : 'Einträge wurden'} erfolgreich aktualisiert`
  
  if (failedCount > 0) {
    description += `, ${failedCount} fehlgeschlagen`
  }
  
  if (skippedCount > 0) {
    description += `, ${skippedCount} übersprungen`
  }
  
  description += '.'
  
  if (canRetry) {
    description += ' Fehlgeschlagene Einträge können wiederholt werden.'
  }
  
  return {
    title: 'Teilweise erfolgreich',
    description,
    actionable: canRetry
  }
}

/**
 * Network error detection utility
 */
export function isNetworkError(error: Error): boolean {
  return (
    error.name === 'TypeError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  )
}

/**
 * Timeout error detection utility
 */
export function isTimeoutError(error: Error): boolean {
  return (
    error.name === 'TimeoutError' ||
    error.message.includes('timeout') ||
    error.message.includes('aborted')
  )
}

/**
 * Converts fetch errors to standardized error codes
 */
export function classifyFetchError(error: Error, response?: Response): string {
  if (isNetworkError(error)) {
    return 'NETWORK_ERROR'
  }
  
  if (isTimeoutError(error)) {
    return 'TIMEOUT'
  }
  
  if (response) {
    switch (response.status) {
      case 401:
      case 403:
        return 'PERMISSION_DENIED'
      case 404:
        return 'NOT_FOUND'
      case 429:
        return 'RATE_LIMITED'
      case 500:
      case 502:
      case 503:
      case 504:
        return 'SERVER_ERROR'
      default:
        return 'UNKNOWN_ERROR'
    }
  }
  
  return 'UNKNOWN_ERROR'
}