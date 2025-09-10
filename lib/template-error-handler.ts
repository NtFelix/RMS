import { toast } from '@/hooks/use-toast'
import type { TemplateError, TemplateErrorType } from '../types/template'

/**
 * Centralized error handler for template operations
 * Provides consistent error messaging and user feedback
 */
export class TemplateErrorHandler {
  /**
   * Handle template operation errors with appropriate user feedback
   */
  static handleTemplateError(error: TemplateError): void {
    switch (error.type) {
      case 'template_not_found':
        toast({
          title: "Vorlage nicht gefunden",
          description: "Die angeforderte Vorlage existiert nicht mehr.",
          variant: "destructive"
        })
        break
      
      case 'save_failed':
        toast({
          title: "Speichern fehlgeschlagen",
          description: "Die Vorlage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
      
      case 'load_failed':
        toast({
          title: "Laden fehlgeschlagen",
          description: "Die Vorlage konnte nicht geladen werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
        break
      
      case 'invalid_content':
        toast({
          title: "Ungültiger Inhalt",
          description: "Der Vorlageninhalt ist ungültig oder beschädigt.",
          variant: "destructive"
        })
        break
      
      case 'category_required':
        toast({
          title: "Kategorie erforderlich",
          description: "Bitte wählen Sie eine Kategorie für die Vorlage aus.",
          variant: "destructive"
        })
        break
      
      case 'title_required':
        toast({
          title: "Titel erforderlich",
          description: "Bitte geben Sie einen Titel für die Vorlage ein.",
          variant: "destructive"
        })
        break
      
      case 'permission_denied':
        toast({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung für diese Aktion.",
          variant: "destructive"
        })
        break
      
      default:
        toast({
          title: "Unbekannter Fehler",
          description: error.message || "Ein unbekannter Fehler ist aufgetreten.",
          variant: "destructive"
        })
        break
    }
  }

  /**
   * Create a template error object
   */
  static createError(
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
   * Handle validation errors specifically
   */
  static handleValidationErrors(errors: Array<{ field: string; message: string }>): void {
    const errorMessages = errors.map(error => `${error.field}: ${error.message}`).join('\n')
    
    toast({
      title: "Validierungsfehler",
      description: errorMessages,
      variant: "destructive"
    })
  }

  /**
   * Handle network or database errors
   */
  static handleNetworkError(error: Error): void {
    console.error('Template service error:', error)
    
    toast({
      title: "Verbindungsfehler",
      description: "Es gab ein Problem bei der Verbindung zur Datenbank. Bitte versuchen Sie es erneut.",
      variant: "destructive"
    })
  }
}