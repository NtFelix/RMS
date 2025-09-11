/**
 * Template Error Handling System
 * 
 * Provides comprehensive error handling for template operations including
 * error types, error boundaries, recovery mechanisms, and user feedback.
 */

import { toast } from '@/hooks/use-toast'

// Template Error Types
export enum TemplateErrorType {
  // Template CRUD Errors
  TEMPLATE_NOT_FOUND = 'template_not_found',
  TEMPLATE_LOAD_FAILED = 'template_load_failed',
  TEMPLATE_SAVE_FAILED = 'template_save_failed',
  TEMPLATE_DELETE_FAILED = 'template_delete_failed',
  TEMPLATE_CREATE_FAILED = 'template_create_failed',
  
  // Content and Validation Errors
  INVALID_CONTENT = 'invalid_content',
  INVALID_TEMPLATE_DATA = 'invalid_template_data',
  CONTENT_PARSE_ERROR = 'content_parse_error',
  VARIABLE_EXTRACTION_FAILED = 'variable_extraction_failed',
  
  // Category Errors
  CATEGORY_REQUIRED = 'category_required',
  INVALID_CATEGORY = 'invalid_category',
  CATEGORY_LOAD_FAILED = 'category_load_failed',
  
  // Title and Metadata Errors
  TITLE_REQUIRED = 'title_required',
  TITLE_TOO_LONG = 'title_too_long',
  DUPLICATE_TITLE = 'duplicate_title',
  
  // Permission and Access Errors
  PERMISSION_DENIED = 'permission_denied',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  USER_NOT_AUTHENTICATED = 'user_not_authenticated',
  
  // Editor Errors
  EDITOR_INITIALIZATION_FAILED = 'editor_initialization_failed',
  EDITOR_CONTENT_CORRUPTION = 'editor_content_corruption',
  EDITOR_EXTENSION_ERROR = 'editor_extension_error',
  
  // Network and Database Errors
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  CONNECTION_TIMEOUT = 'connection_timeout',
  
  // System Errors
  UNKNOWN_ERROR = 'unknown_error',
  SYSTEM_ERROR = 'system_error'
}

// Template Error Interface
export interface TemplateError {
  type: TemplateErrorType
  message: string
  details?: any
  recoverable: boolean
  timestamp: Date
  context?: {
    templateId?: string
    userId?: string
    operation?: string
    component?: string
  }
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error Recovery Actions
export interface ErrorRecoveryAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

// Template Error Class
export class TemplateErrorHandler {
  private static errorLog: TemplateError[] = []
  
  /**
   * Create a new template error
   */
  static createError(
    type: TemplateErrorType,
    message: string,
    details?: any,
    context?: TemplateError['context']
  ): TemplateError {
    const error: TemplateError = {
      type,
      message,
      details,
      recoverable: this.isRecoverable(type),
      timestamp: new Date(),
      context
    }
    
    // Log the error
    this.logError(error)
    
    return error
  }
  
  /**
   * Handle template errors with appropriate user feedback
   */
  static handleError(
    error: TemplateError,
    recoveryActions?: ErrorRecoveryAction[]
  ): void {
    const severity = this.getErrorSeverity(error.type)
    
    // Show user feedback based on error type
    switch (error.type) {
      case TemplateErrorType.TEMPLATE_NOT_FOUND:
        toast({
          title: "Vorlage nicht gefunden",
          description: "Die angeforderte Vorlage existiert nicht mehr oder wurde gelöscht.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.TEMPLATE_SAVE_FAILED:
        toast({
          title: "Speichern fehlgeschlagen",
          description: "Die Vorlage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.TEMPLATE_LOAD_FAILED:
        toast({
          title: "Laden fehlgeschlagen",
          description: "Die Vorlage konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.TEMPLATE_DELETE_FAILED:
        toast({
          title: "Löschen fehlgeschlagen",
          description: "Die Vorlage konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.INVALID_CONTENT:
        toast({
          title: "Ungültiger Inhalt",
          description: "Der Vorlageninhalt ist ungültig oder beschädigt.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.CATEGORY_REQUIRED:
        toast({
          title: "Kategorie erforderlich",
          description: "Bitte wählen Sie eine Kategorie für die Vorlage aus.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.TITLE_REQUIRED:
        toast({
          title: "Titel erforderlich",
          description: "Bitte geben Sie einen Titel für die Vorlage ein.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.TITLE_TOO_LONG:
        toast({
          title: "Titel zu lang",
          description: "Der Vorlagentitel darf maximal 255 Zeichen lang sein.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.PERMISSION_DENIED:
        toast({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung für diese Aktion.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.EDITOR_INITIALIZATION_FAILED:
        toast({
          title: "Editor-Fehler",
          description: "Der Vorlagen-Editor konnte nicht initialisiert werden. Bitte laden Sie die Seite neu.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.NETWORK_ERROR:
        toast({
          title: "Netzwerkfehler",
          description: "Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung.",
          variant: "destructive"
        })
        break
        
      case TemplateErrorType.DATABASE_ERROR:
        toast({
          title: "Datenbankfehler",
          description: "Ein Datenbankfehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
          variant: "destructive"
        })
        break
        
      default:
        toast({
          title: "Unbekannter Fehler",
          description: error.message || "Ein unerwarteter Fehler ist aufgetreten.",
          variant: "destructive"
        })
        break
    }
    
    // Report critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.reportError(error)
    }
  }
  
  /**
   * Determine if an error type is recoverable
   */
  private static isRecoverable(type: TemplateErrorType): boolean {
    const recoverableErrors = [
      TemplateErrorType.TEMPLATE_SAVE_FAILED,
      TemplateErrorType.TEMPLATE_LOAD_FAILED,
      TemplateErrorType.NETWORK_ERROR,
      TemplateErrorType.CONNECTION_TIMEOUT,
      TemplateErrorType.CATEGORY_REQUIRED,
      TemplateErrorType.TITLE_REQUIRED,
      TemplateErrorType.TITLE_TOO_LONG,
      TemplateErrorType.INVALID_CATEGORY
    ]
    
    return recoverableErrors.includes(type)
  }
  
  /**
   * Get error severity level
   */
  private static getErrorSeverity(type: TemplateErrorType): ErrorSeverity {
    switch (type) {
      case TemplateErrorType.SYSTEM_ERROR:
      case TemplateErrorType.DATABASE_ERROR:
      case TemplateErrorType.EDITOR_CONTENT_CORRUPTION:
        return ErrorSeverity.CRITICAL
        
      case TemplateErrorType.PERMISSION_DENIED:
      case TemplateErrorType.UNAUTHORIZED_ACCESS:
      case TemplateErrorType.TEMPLATE_DELETE_FAILED:
        return ErrorSeverity.HIGH
        
      case TemplateErrorType.TEMPLATE_SAVE_FAILED:
      case TemplateErrorType.TEMPLATE_LOAD_FAILED:
      case TemplateErrorType.NETWORK_ERROR:
      case TemplateErrorType.EDITOR_INITIALIZATION_FAILED:
        return ErrorSeverity.MEDIUM
        
      default:
        return ErrorSeverity.LOW
    }
  }
  
  /**
   * Log error for debugging and monitoring
   */
  private static logError(error: TemplateError): void {
    // Add to in-memory log
    this.errorLog.push(error)
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100)
    }
    
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Template Error:', {
        type: error.type,
        message: error.message,
        details: error.details,
        context: error.context,
        timestamp: error.timestamp
      })
    }
  }
  
  /**
   * Report critical errors to monitoring service
   */
  private static reportError(error: TemplateError): void {
    // In a real application, this would send to a monitoring service
    // like Sentry, LogRocket, or similar
    console.error('CRITICAL Template Error:', error)
    
    // Could integrate with PostHog for error tracking
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('template_error', {
        error_type: error.type,
        error_message: error.message,
        error_context: error.context,
        error_severity: this.getErrorSeverity(error.type),
        error_timestamp: error.timestamp.toISOString(),
        user_agent: window.navigator.userAgent,
        url: window.location.href
      })
    }

    // Send to error reporting service (example implementation)
    this.sendToErrorService(error)
  }

  /**
   * Send error to external error reporting service
   */
  private static async sendToErrorService(error: TemplateError): Promise<void> {
    try {
      // Example implementation - replace with actual service
      const errorReport = {
        id: `template_error_${Date.now()}`,
        type: error.type,
        message: error.message,
        details: error.details,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
        severity: this.getErrorSeverity(error.type),
        recoverable: error.recoverable,
        environment: process.env.NODE_ENV,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }

      // In production, this would be sent to your error reporting service
      if (process.env.NODE_ENV === 'development') {
        console.log('Error report would be sent:', errorReport)
      } else {
        // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }
  
  /**
   * Get error log for debugging
   */
  static getErrorLog(): TemplateError[] {
    return [...this.errorLog]
  }
  
  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * Get error statistics
   */
  static getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<TemplateErrorType, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    recentErrors: TemplateError[]
  } {
    const errorsByType = {} as Record<TemplateErrorType, number>
    const errorsBySeverity = {} as Record<ErrorSeverity, number>

    // Initialize counters
    Object.values(TemplateErrorType).forEach(type => {
      errorsByType[type] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0
    })

    // Count errors
    this.errorLog.forEach(error => {
      errorsByType[error.type]++
      errorsBySeverity[this.getErrorSeverity(error.type)]++
    })

    // Get recent errors (last 10)
    const recentErrors = this.errorLog.slice(-10)

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsBySeverity,
      recentErrors
    }
  }

  /**
   * Check if error type is critical
   */
  static isCriticalError(type: TemplateErrorType): boolean {
    return this.getErrorSeverity(type) === ErrorSeverity.CRITICAL
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: TemplateError): string {
    const baseMessages: Record<TemplateErrorType, string> = {
      [TemplateErrorType.TEMPLATE_NOT_FOUND]: 'Die angeforderte Vorlage wurde nicht gefunden.',
      [TemplateErrorType.TEMPLATE_LOAD_FAILED]: 'Die Vorlage konnte nicht geladen werden.',
      [TemplateErrorType.TEMPLATE_SAVE_FAILED]: 'Die Vorlage konnte nicht gespeichert werden.',
      [TemplateErrorType.TEMPLATE_DELETE_FAILED]: 'Die Vorlage konnte nicht gelöscht werden.',
      [TemplateErrorType.TEMPLATE_CREATE_FAILED]: 'Die Vorlage konnte nicht erstellt werden.',
      [TemplateErrorType.INVALID_CONTENT]: 'Der Vorlageninhalt ist ungültig.',
      [TemplateErrorType.INVALID_TEMPLATE_DATA]: 'Die Vorlagendaten sind ungültig.',
      [TemplateErrorType.CONTENT_PARSE_ERROR]: 'Der Vorlageninhalt konnte nicht verarbeitet werden.',
      [TemplateErrorType.VARIABLE_EXTRACTION_FAILED]: 'Die Variablen konnten nicht extrahiert werden.',
      [TemplateErrorType.CATEGORY_REQUIRED]: 'Eine Kategorie ist erforderlich.',
      [TemplateErrorType.INVALID_CATEGORY]: 'Die gewählte Kategorie ist ungültig.',
      [TemplateErrorType.CATEGORY_LOAD_FAILED]: 'Die Kategorien konnten nicht geladen werden.',
      [TemplateErrorType.TITLE_REQUIRED]: 'Ein Titel ist erforderlich.',
      [TemplateErrorType.TITLE_TOO_LONG]: 'Der Titel ist zu lang.',
      [TemplateErrorType.DUPLICATE_TITLE]: 'Eine Vorlage mit diesem Titel existiert bereits.',
      [TemplateErrorType.PERMISSION_DENIED]: 'Sie haben keine Berechtigung für diese Aktion.',
      [TemplateErrorType.UNAUTHORIZED_ACCESS]: 'Zugriff verweigert.',
      [TemplateErrorType.USER_NOT_AUTHENTICATED]: 'Sie sind nicht angemeldet.',
      [TemplateErrorType.EDITOR_INITIALIZATION_FAILED]: 'Der Editor konnte nicht initialisiert werden.',
      [TemplateErrorType.EDITOR_CONTENT_CORRUPTION]: 'Der Editorinhalt ist beschädigt.',
      [TemplateErrorType.EDITOR_EXTENSION_ERROR]: 'Ein Editor-Plugin ist fehlerhaft.',
      [TemplateErrorType.NETWORK_ERROR]: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
      [TemplateErrorType.DATABASE_ERROR]: 'Datenbankfehler. Bitte versuchen Sie es später erneut.',
      [TemplateErrorType.CONNECTION_TIMEOUT]: 'Verbindung unterbrochen. Bitte versuchen Sie es erneut.',
      [TemplateErrorType.UNKNOWN_ERROR]: 'Ein unbekannter Fehler ist aufgetreten.',
      [TemplateErrorType.SYSTEM_ERROR]: 'Ein Systemfehler ist aufgetreten.'
    }

    return baseMessages[error.type] || error.message
  }
  
  /**
   * Create error from caught exception
   */
  static fromException(
    exception: any,
    context?: TemplateError['context']
  ): TemplateError {
    let type = TemplateErrorType.UNKNOWN_ERROR
    let message = 'Ein unerwarteter Fehler ist aufgetreten'
    
    // Try to determine error type from exception
    if (exception?.message) {
      message = exception.message
      
      // Network errors
      if (exception.message.includes('fetch') || exception.message.includes('network')) {
        type = TemplateErrorType.NETWORK_ERROR
      }
      // Database errors
      else if (exception.message.includes('database') || exception.message.includes('supabase')) {
        type = TemplateErrorType.DATABASE_ERROR
      }
      // Permission errors
      else if (exception.message.includes('permission') || exception.message.includes('unauthorized')) {
        type = TemplateErrorType.PERMISSION_DENIED
      }
    }
    
    return this.createError(type, message, exception, context)
  }
}

// Error Recovery Utilities
export class TemplateErrorRecovery {
  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
  
  /**
   * Safe operation wrapper that handles errors gracefully
   */
  static async safeOperation<T>(
    operation: () => Promise<T>,
    fallback?: T,
    context?: TemplateError['context']
  ): Promise<T | undefined> {
    try {
      return await operation()
    } catch (error) {
      const templateError = TemplateErrorHandler.fromException(error, context)
      TemplateErrorHandler.handleError(templateError)
      return fallback
    }
  }
}