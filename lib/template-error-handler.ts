/**
 * Comprehensive error handling system for templates modal
 * Provides centralized error management, logging, and user feedback
 */

import { toast } from "@/hooks/use-toast"

export enum TemplatesModalErrorType {
  LOAD_TEMPLATES_ERROR = 'load_templates_error',
  DELETE_TEMPLATE_ERROR = 'delete_template_error',
  SEARCH_ERROR = 'search_error',
  FILTER_ERROR = 'filter_error',
  MODAL_INITIALIZATION_ERROR = 'modal_initialization_error',
  TEMPLATE_VALIDATION_ERROR = 'template_validation_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error'
}

export interface TemplatesModalError {
  type: TemplatesModalErrorType
  message: string
  details?: any
  recoverable: boolean
  userMessage: string
  actions: ErrorAction[]
  timestamp: Date
  context?: Record<string, any>
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  variant?: 'default' | 'destructive' | 'outline'
}

export class TemplatesModalErrorHandler {
  private static errorLog: TemplatesModalError[] = []
  private static maxLogSize = 100

  /**
   * Log error for debugging and monitoring
   */
  private static logError(error: TemplatesModalError): void {
    this.errorLog.push(error)
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    // Log to console for development
    console.error(`[TemplatesModal] ${error.type}:`, {
      message: error.message,
      details: error.details,
      context: error.context,
      timestamp: error.timestamp
    })

    // In production, you might want to send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // monitoringService.logError(error)
    }
  }

  /**
   * Handle template loading errors
   */
  static handleLoadError(error: Error, context?: Record<string, any>): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.LOAD_TEMPLATES_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: "Vorlagen konnten nicht geladen werden",
      timestamp: new Date(),
      context,
      actions: [
        {
          label: "Erneut versuchen",
          action: () => window.location.reload(),
          variant: 'default'
        }
      ]
    }

    this.logError(templateError)

    toast({
      title: "Fehler beim Laden der Vorlagen",
      description: "Die Vorlagen konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
      variant: "destructive",
      action: {
        altText: "Erneut versuchen",
        onClick: () => window.location.reload()
      }
    })
  }

  /**
   * Handle template deletion errors
   */
  static handleDeleteError(
    error: Error, 
    templateTitle: string, 
    retryCallback?: () => Promise<void>
  ): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.DELETE_TEMPLATE_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: `Vorlage "${templateTitle}" konnte nicht gelöscht werden`,
      timestamp: new Date(),
      context: { templateTitle },
      actions: retryCallback ? [
        {
          label: "Erneut versuchen",
          action: retryCallback,
          variant: 'default'
        }
      ] : []
    }

    this.logError(templateError)

    toast({
      title: "Löschen fehlgeschlagen",
      description: `Die Vorlage "${templateTitle}" konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.`,
      variant: "destructive",
      action: retryCallback ? {
        altText: "Erneut versuchen",
        onClick: retryCallback
      } : undefined
    })
  }

  /**
   * Handle search errors
   */
  static handleSearchError(error: Error, searchQuery: string): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.SEARCH_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: "Suche konnte nicht ausgeführt werden",
      timestamp: new Date(),
      context: { searchQuery },
      actions: []
    }

    this.logError(templateError)

    toast({
      title: "Suche fehlgeschlagen",
      description: "Die Suche konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.",
      variant: "destructive"
    })
  }

  /**
   * Handle filter errors
   */
  static handleFilterError(error: Error, filterType: string, filterValue: string): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.FILTER_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: "Filter konnte nicht angewendet werden",
      timestamp: new Date(),
      context: { filterType, filterValue },
      actions: []
    }

    this.logError(templateError)

    toast({
      title: "Filter-Fehler",
      description: "Der Filter konnte nicht angewendet werden. Die Ansicht wurde zurückgesetzt.",
      variant: "destructive"
    })
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: Error, operation: string): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.NETWORK_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: "Netzwerkfehler aufgetreten",
      timestamp: new Date(),
      context: { operation },
      actions: [
        {
          label: "Erneut versuchen",
          action: () => window.location.reload(),
          variant: 'default'
        }
      ]
    }

    this.logError(templateError)

    toast({
      title: "Verbindungsfehler",
      description: "Es gab ein Problem mit der Internetverbindung. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      variant: "destructive",
      action: {
        altText: "Erneut versuchen",
        onClick: () => window.location.reload()
      }
    })
  }

  /**
   * Handle permission errors
   */
  static handlePermissionError(error: Error, operation: string): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.PERMISSION_ERROR,
      message: error.message,
      details: error,
      recoverable: false,
      userMessage: "Keine Berechtigung für diese Aktion",
      timestamp: new Date(),
      context: { operation },
      actions: []
    }

    this.logError(templateError)

    toast({
      title: "Keine Berechtigung",
      description: "Sie haben keine Berechtigung für diese Aktion. Bitte wenden Sie sich an den Administrator.",
      variant: "destructive"
    })
  }

  /**
   * Handle modal initialization errors
   */
  static handleModalInitializationError(error: Error): void {
    const templateError: TemplatesModalError = {
      type: TemplatesModalErrorType.MODAL_INITIALIZATION_ERROR,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: "Modal konnte nicht initialisiert werden",
      timestamp: new Date(),
      actions: [
        {
          label: "Seite neu laden",
          action: () => window.location.reload(),
          variant: 'default'
        }
      ]
    }

    this.logError(templateError)

    toast({
      title: "Initialisierungsfehler",
      description: "Das Vorlagen-Modal konnte nicht geöffnet werden. Bitte laden Sie die Seite neu.",
      variant: "destructive",
      action: {
        altText: "Seite neu laden",
        onClick: () => window.location.reload()
      }
    })
  }

  /**
   * Generic error handler with automatic error type detection
   */
  static handleGenericError(
    error: Error, 
    operation: string, 
    context?: Record<string, any>,
    retryCallback?: () => Promise<void>
  ): void {
    // Try to determine error type from error message or properties
    let errorType = TemplatesModalErrorType.MODAL_INITIALIZATION_ERROR

    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = TemplatesModalErrorType.NETWORK_ERROR
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      errorType = TemplatesModalErrorType.PERMISSION_ERROR
    } else if (operation.includes('search')) {
      errorType = TemplatesModalErrorType.SEARCH_ERROR
    } else if (operation.includes('filter')) {
      errorType = TemplatesModalErrorType.FILTER_ERROR
    } else if (operation.includes('load')) {
      errorType = TemplatesModalErrorType.LOAD_TEMPLATES_ERROR
    } else if (operation.includes('delete')) {
      errorType = TemplatesModalErrorType.DELETE_TEMPLATE_ERROR
    }

    const templateError: TemplatesModalError = {
      type: errorType,
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: `Fehler bei: ${operation}`,
      timestamp: new Date(),
      context: { operation, ...context },
      actions: retryCallback ? [
        {
          label: "Erneut versuchen",
          action: retryCallback,
          variant: 'default'
        }
      ] : []
    }

    this.logError(templateError)

    toast({
      title: "Ein Fehler ist aufgetreten",
      description: `Bei der Ausführung von "${operation}" ist ein Fehler aufgetreten.`,
      variant: "destructive",
      action: retryCallback ? {
        altText: "Erneut versuchen",
        onClick: retryCallback
      } : undefined
    })
  }

  /**
   * Get error log for debugging
   */
  static getErrorLog(): TemplatesModalError[] {
    return [...this.errorLog]
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: TemplatesModalError): boolean {
    return error.recoverable
  }

  /**
   * Create retry mechanism with exponential backoff
   */
  static createRetryMechanism(
    operation: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): () => Promise<void> {
    return async () => {
      let retries = 0
      
      while (retries < maxRetries) {
        try {
          await operation()
          return
        } catch (error) {
          retries++
          
          if (retries >= maxRetries) {
            throw error
          }
          
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, retries - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
  }
}