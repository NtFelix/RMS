import { toast } from '@/hooks/use-toast'
import { TemplateError, TemplateErrorType } from '@/types/template'

/**
 * Template Error Handler
 * Provides centralized error handling for template operations
 */
export class TemplateErrorHandler {
  /**
   * Handle template operation errors with user-friendly messages
   */
  static handleTemplateError(error: TemplateError | Error | unknown): void {
    if (error instanceof Error && 'type' in error && 'recoverable' in error) {
      const templateError = error as TemplateError
      this.handleTypedError(templateError)
    } else if (error instanceof Error) {
      this.handleGenericError(error)
    } else {
      this.handleUnknownError(error)
    }
  }

  /**
   * Handle typed template errors
   */
  private static handleTypedError(error: TemplateError): void {
    switch (error.type) {
      case TemplateErrorType.TEMPLATE_NOT_FOUND:
        toast({
          title: "Vorlage nicht gefunden",
          description: "Die angeforderte Vorlage existiert nicht mehr.",
          variant: "destructive"
        })
        break
      
      case TemplateErrorType.SAVE_FAILED:
        toast({
          title: "Speichern fehlgeschlagen",
          description: "Die Vorlage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
      
      case TemplateErrorType.LOAD_FAILED:
        toast({
          title: "Laden fehlgeschlagen",
          description: "Die Vorlage konnte nicht geladen werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
      
      case TemplateErrorType.INVALID_CONTENT:
        toast({
          title: "Ungültiger Inhalt",
          description: "Der Vorlageninhalt ist ungültig. Bitte überprüfen Sie Ihre Eingaben.",
          variant: "destructive"
        })
        break
      
      case TemplateErrorType.CATEGORY_REQUIRED:
        toast({
          title: "Kategorie erforderlich",
          description: "Bitte wählen Sie eine Kategorie für Ihre Vorlage aus.",
          variant: "destructive"
        })
        break
      
      case TemplateErrorType.TITLE_REQUIRED:
        toast({
          title: "Titel erforderlich",
          description: "Bitte geben Sie einen Titel für Ihre Vorlage ein.",
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
      
      default:
        this.handleGenericError(new Error(error.message))
        break
    }
  }

  /**
   * Handle generic JavaScript errors
   */
  private static handleGenericError(error: Error): void {
    console.error('Template operation error:', error)
    
    // Check for common error patterns
    if (error.message.includes('fetch')) {
      toast({
        title: "Verbindungsfehler",
        description: "Es gab ein Problem bei der Verbindung zum Server. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      })
    } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melden Sie sich an, um fortzufahren.",
        variant: "destructive"
      })
    } else if (error.message.includes('validation')) {
      toast({
        title: "Validierungsfehler",
        description: "Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Unerwarteter Fehler",
        description: error.message || "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      })
    }
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: unknown): void {
    console.error('Unknown template error:', error)
    
    toast({
      title: "Unbekannter Fehler",
      description: "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      variant: "destructive"
    })
  }

  /**
   * Create a template error with proper typing
   */
  static createTemplateError(
    type: TemplateErrorType,
    message: string,
    details?: any,
    recoverable: boolean = true
  ): TemplateError {
    return {
      type,
      message,
      details,
      recoverable
    }
  }

  /**
   * Handle API response errors
   */
  static async handleApiError(response: Response): Promise<never> {
    let errorMessage = 'API request failed'
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage
    }

    // Map HTTP status codes to template error types
    let errorType: TemplateErrorType
    
    switch (response.status) {
      case 401:
        errorType = TemplateErrorType.PERMISSION_DENIED
        break
      case 404:
        errorType = TemplateErrorType.TEMPLATE_NOT_FOUND
        break
      case 400:
        errorType = TemplateErrorType.INVALID_CONTENT
        break
      default:
        errorType = TemplateErrorType.SAVE_FAILED
        break
    }

    const templateError = this.createTemplateError(
      errorType,
      errorMessage,
      { status: response.status, statusText: response.statusText }
    )

    this.handleTemplateError(templateError)
    throw templateError
  }

  /**
   * Wrap async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string = 'Template operation'
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      console.error(`${context} failed:`, error)
      this.handleTemplateError(error)
      return null
    }
  }

  /**
   * Validate template data before operations
   */
  static validateTemplateData(data: {
    titel?: string
    kategorie?: string
    inhalt?: object
  }): void {
    if (data.titel !== undefined && (!data.titel || !data.titel.trim())) {
      throw this.createTemplateError(
        TemplateErrorType.TITLE_REQUIRED,
        'Template title is required and cannot be empty'
      )
    }

    if (data.kategorie !== undefined && (!data.kategorie || !data.kategorie.trim())) {
      throw this.createTemplateError(
        TemplateErrorType.CATEGORY_REQUIRED,
        'Template category is required and cannot be empty'
      )
    }

    if (data.inhalt !== undefined && (!data.inhalt || typeof data.inhalt !== 'object')) {
      throw this.createTemplateError(
        TemplateErrorType.INVALID_CONTENT,
        'Template content must be a valid object'
      )
    }
  }
}

// Export convenience functions
export const handleTemplateError = TemplateErrorHandler.handleTemplateError.bind(TemplateErrorHandler)
export const createTemplateError = TemplateErrorHandler.createTemplateError.bind(TemplateErrorHandler)
export const handleApiError = TemplateErrorHandler.handleApiError.bind(TemplateErrorHandler)
export const withErrorHandling = TemplateErrorHandler.withErrorHandling.bind(TemplateErrorHandler)
export const validateTemplateData = TemplateErrorHandler.validateTemplateData.bind(TemplateErrorHandler)