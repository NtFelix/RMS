/**
 * Unit tests for Template Error Handling System
 * Tests error creation, handling, recovery mechanisms, and user feedback
 */

import { 
  TemplateErrorHandler, 
  TemplateErrorType, 
  TemplateErrorRecovery,
  ErrorSeverity 
} from '../../lib/template-error-handler'
import type { TemplateError, ErrorRecoveryAction } from '../../lib/template-error-handler'

// Mock toast hook
jest.mock('../../hooks/use-toast', () => ({
  toast: jest.fn()
}))

// Mock PostHog
const mockPostHog = {
  capture: jest.fn()
}

// Mock window.posthog
Object.defineProperty(window, 'posthog', {
  value: mockPostHog,
  writable: true
})

describe('Template Error Handling Unit Tests', () => {
  let mockToast: jest.Mock

  beforeEach(() => {
    // Get the mocked toast function
    const { toast } = require('../../hooks/use-toast')
    mockToast = toast as jest.Mock
    
    jest.clearAllMocks()
    TemplateErrorHandler.clearErrorLog()
    
    // Reset console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('TemplateErrorHandler', () => {
    describe('createError', () => {
      it('should create error with all properties', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_NOT_FOUND,
          'Template not found',
          { templateId: 'test-123' },
          { templateId: 'test-123', userId: 'user-456', operation: 'get' }
        )

        expect(error).toEqual({
          type: TemplateErrorType.TEMPLATE_NOT_FOUND,
          message: 'Template not found',
          details: { templateId: 'test-123' },
          recoverable: false,
          timestamp: expect.any(Date),
          context: {
            templateId: 'test-123',
            userId: 'user-456',
            operation: 'get'
          }
        })
      })

      it('should determine recoverability correctly', () => {
        const recoverableError = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Save failed'
        )
        expect(recoverableError.recoverable).toBe(true)

        const nonRecoverableError = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_NOT_FOUND,
          'Not found'
        )
        expect(nonRecoverableError.recoverable).toBe(false)
      })

      it('should log error to error log', () => {
        TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Save failed'
        )

        const errorLog = TemplateErrorHandler.getErrorLog()
        expect(errorLog).toHaveLength(1)
        expect(errorLog[0].type).toBe(TemplateErrorType.TEMPLATE_SAVE_FAILED)
      })

      it('should limit error log size', () => {
        // Create more than 100 errors
        for (let i = 0; i < 105; i++) {
          TemplateErrorHandler.createError(
            TemplateErrorType.TEMPLATE_SAVE_FAILED,
            `Error ${i}`
          )
        }

        const errorLog = TemplateErrorHandler.getErrorLog()
        expect(errorLog).toHaveLength(100)
      })
    })

    describe('handleError', () => {
      it('should show appropriate toast for template not found', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_NOT_FOUND,
          'Template not found'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Vorlage nicht gefunden",
          description: "Die angeforderte Vorlage existiert nicht mehr oder wurde gelöscht.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for save failed', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Save failed'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Speichern fehlgeschlagen",
          description: "Die Vorlage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for load failed', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_LOAD_FAILED,
          'Load failed'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Laden fehlgeschlagen",
          description: "Die Vorlage konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for delete failed', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_DELETE_FAILED,
          'Delete failed'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Löschen fehlgeschlagen",
          description: "Die Vorlage konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for invalid content', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.INVALID_CONTENT,
          'Invalid content'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Ungültiger Inhalt",
          description: "Der Vorlageninhalt ist ungültig oder beschädigt.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for validation errors', () => {
        const categoryError = TemplateErrorHandler.createError(
          TemplateErrorType.CATEGORY_REQUIRED,
          'Category required'
        )

        TemplateErrorHandler.handleError(categoryError)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Kategorie erforderlich",
          description: "Bitte wählen Sie eine Kategorie für die Vorlage aus.",
          variant: "destructive"
        })

        const titleError = TemplateErrorHandler.createError(
          TemplateErrorType.TITLE_REQUIRED,
          'Title required'
        )

        TemplateErrorHandler.handleError(titleError)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Titel erforderlich",
          description: "Bitte geben Sie einen Titel für die Vorlage ein.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for permission errors', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.PERMISSION_DENIED,
          'Permission denied'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung für diese Aktion.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for editor errors', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.EDITOR_INITIALIZATION_FAILED,
          'Editor failed'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Editor-Fehler",
          description: "Der Vorlagen-Editor konnte nicht initialisiert werden. Bitte laden Sie die Seite neu.",
          variant: "destructive"
        })
      })

      it('should show appropriate toast for network errors', () => {
        const networkError = TemplateErrorHandler.createError(
          TemplateErrorType.NETWORK_ERROR,
          'Network error'
        )

        TemplateErrorHandler.handleError(networkError)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Netzwerkfehler",
          description: "Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung.",
          variant: "destructive"
        })

        const databaseError = TemplateErrorHandler.createError(
          TemplateErrorType.DATABASE_ERROR,
          'Database error'
        )

        TemplateErrorHandler.handleError(databaseError)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Datenbankfehler",
          description: "Ein Datenbankfehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
          variant: "destructive"
        })
      })

      it('should show generic toast for unknown errors', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.UNKNOWN_ERROR,
          'Unknown error'
        )

        TemplateErrorHandler.handleError(error)

        expect(mockToast).toHaveBeenCalledWith({
          title: "Unbekannter Fehler",
          description: "Unknown error",
          variant: "destructive"
        })
      })

      it('should report critical errors', () => {
        const criticalError = TemplateErrorHandler.createError(
          TemplateErrorType.DATABASE_ERROR,
          'Critical database error'
        )

        TemplateErrorHandler.handleError(criticalError)

        expect(mockPostHog.capture).toHaveBeenCalledWith('template_error', {
          error_type: TemplateErrorType.DATABASE_ERROR,
          error_message: 'Critical database error',
          error_context: undefined,
          error_severity: ErrorSeverity.CRITICAL
        })
      })
    })

    describe('fromException', () => {
      it('should create error from generic exception', () => {
        const exception = new Error('Generic error')
        
        const error = TemplateErrorHandler.fromException(exception)

        expect(error.type).toBe(TemplateErrorType.UNKNOWN_ERROR)
        expect(error.message).toBe('Generic error')
        expect(error.details).toBe(exception)
      })

      it('should detect network errors', () => {
        const networkException = new Error('fetch failed')
        
        const error = TemplateErrorHandler.fromException(networkException)

        expect(error.type).toBe(TemplateErrorType.NETWORK_ERROR)
        expect(error.message).toBe('fetch failed')
      })

      it('should detect database errors', () => {
        const dbException = new Error('supabase connection failed')
        
        const error = TemplateErrorHandler.fromException(dbException)

        expect(error.type).toBe(TemplateErrorType.DATABASE_ERROR)
        expect(error.message).toBe('supabase connection failed')
      })

      it('should detect permission errors', () => {
        const permissionException = new Error('unauthorized access')
        
        const error = TemplateErrorHandler.fromException(permissionException)

        expect(error.type).toBe(TemplateErrorType.PERMISSION_DENIED)
        expect(error.message).toBe('unauthorized access')
      })

      it('should include context when provided', () => {
        const exception = new Error('Test error')
        const context = { templateId: 'test-123', operation: 'update' }
        
        const error = TemplateErrorHandler.fromException(exception, context)

        expect(error.context).toEqual(context)
      })
    })

    describe('Error severity classification', () => {
      it('should classify critical errors correctly', () => {
        const criticalErrors = [
          TemplateErrorType.SYSTEM_ERROR,
          TemplateErrorType.DATABASE_ERROR,
          TemplateErrorType.EDITOR_CONTENT_CORRUPTION
        ]

        criticalErrors.forEach(errorType => {
          const error = TemplateErrorHandler.createError(errorType, 'Test error')
          TemplateErrorHandler.handleError(error)
          
          expect(mockPostHog.capture).toHaveBeenCalledWith('template_error', 
            expect.objectContaining({
              error_severity: ErrorSeverity.CRITICAL
            })
          )
        })
      })

      it('should classify high severity errors correctly', () => {
        const highSeverityErrors = [
          TemplateErrorType.PERMISSION_DENIED,
          TemplateErrorType.UNAUTHORIZED_ACCESS,
          TemplateErrorType.TEMPLATE_DELETE_FAILED
        ]

        highSeverityErrors.forEach(errorType => {
          const error = TemplateErrorHandler.createError(errorType, 'Test error')
          // High severity errors don't trigger PostHog by default
          TemplateErrorHandler.handleError(error)
          
          expect(mockPostHog.capture).not.toHaveBeenCalled()
        })
      })
    })

    describe('Error log management', () => {
      it('should maintain error log', () => {
        const error1 = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Error 1'
        )
        const error2 = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_LOAD_FAILED,
          'Error 2'
        )

        const errorLog = TemplateErrorHandler.getErrorLog()
        expect(errorLog).toHaveLength(2)
        expect(errorLog[0]).toBe(error1)
        expect(errorLog[1]).toBe(error2)
      })

      it('should clear error log', () => {
        TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Error'
        )

        expect(TemplateErrorHandler.getErrorLog()).toHaveLength(1)

        TemplateErrorHandler.clearErrorLog()

        expect(TemplateErrorHandler.getErrorLog()).toHaveLength(0)
      })
    })

    describe('Development logging', () => {
      it('should log errors in development mode', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Development error'
        )

        expect(console.error).toHaveBeenCalledWith('Template Error:', {
          type: error.type,
          message: error.message,
          details: error.details,
          context: error.context,
          timestamp: error.timestamp
        })

        process.env.NODE_ENV = originalEnv
      })

      it('should not log errors in production mode', () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Production error'
        )

        expect(console.error).not.toHaveBeenCalled()

        process.env.NODE_ENV = originalEnv
      })
    })
  })

  describe('TemplateErrorRecovery', () => {
    describe('retryOperation', () => {
      it('should succeed on first attempt', async () => {
        const successfulOperation = jest.fn().mockResolvedValue('success')

        const result = await TemplateErrorRecovery.retryOperation(successfulOperation)

        expect(result).toBe('success')
        expect(successfulOperation).toHaveBeenCalledTimes(1)
      })

      it('should retry failed operations', async () => {
        const failingOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Attempt 1 failed'))
          .mockRejectedValueOnce(new Error('Attempt 2 failed'))
          .mockResolvedValueOnce('success')

        const result = await TemplateErrorRecovery.retryOperation(failingOperation, 3, 10)

        expect(result).toBe('success')
        expect(failingOperation).toHaveBeenCalledTimes(3)
      })

      it('should throw error after max retries', async () => {
        const alwaysFailingOperation = jest.fn()
          .mockRejectedValue(new Error('Always fails'))

        await expect(
          TemplateErrorRecovery.retryOperation(alwaysFailingOperation, 2, 10)
        ).rejects.toThrow('Always fails')

        expect(alwaysFailingOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      })

      it('should implement exponential backoff', async () => {
        const failingOperation = jest.fn()
          .mockRejectedValueOnce(new Error('Attempt 1 failed'))
          .mockResolvedValueOnce('success')

        const startTime = Date.now()
        await TemplateErrorRecovery.retryOperation(failingOperation, 2, 100)
        const endTime = Date.now()

        // Should have waited at least 100ms for the first retry
        expect(endTime - startTime).toBeGreaterThanOrEqual(100)
      })
    })

    describe('safeOperation', () => {
      it('should return result on success', async () => {
        const successfulOperation = jest.fn().mockResolvedValue('success')

        const result = await TemplateErrorRecovery.safeOperation(successfulOperation)

        expect(result).toBe('success')
      })

      it('should return fallback on error', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Failed'))
        const fallback = 'fallback value'

        const result = await TemplateErrorRecovery.safeOperation(
          failingOperation,
          fallback
        )

        expect(result).toBe(fallback)
      })

      it('should return undefined when no fallback provided', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Failed'))

        const result = await TemplateErrorRecovery.safeOperation(failingOperation)

        expect(result).toBeUndefined()
      })

      it('should handle error and show toast', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))
        const context = { templateId: 'test-123', operation: 'test' }

        await TemplateErrorRecovery.safeOperation(failingOperation, undefined, context)

        expect(mockToast).toHaveBeenCalled()
      })
    })
  })

  describe('Error Type Classification', () => {
    it('should identify recoverable errors correctly', () => {
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

      recoverableErrors.forEach(errorType => {
        const error = TemplateErrorHandler.createError(errorType, 'Test error')
        expect(error.recoverable).toBe(true)
      })
    })

    it('should identify non-recoverable errors correctly', () => {
      const nonRecoverableErrors = [
        TemplateErrorType.TEMPLATE_NOT_FOUND,
        TemplateErrorType.PERMISSION_DENIED,
        TemplateErrorType.UNAUTHORIZED_ACCESS,
        TemplateErrorType.SYSTEM_ERROR,
        TemplateErrorType.DATABASE_ERROR
      ]

      nonRecoverableErrors.forEach(errorType => {
        const error = TemplateErrorHandler.createError(errorType, 'Test error')
        expect(error.recoverable).toBe(false)
      })
    })
  })

  describe('PostHog Integration', () => {
    it('should not capture events when PostHog is not available', () => {
      // Remove PostHog from window
      delete (window as any).posthog

      const criticalError = TemplateErrorHandler.createError(
        TemplateErrorType.DATABASE_ERROR,
        'Critical error'
      )

      TemplateErrorHandler.handleError(criticalError)

      // Should not throw error
      expect(() => TemplateErrorHandler.handleError(criticalError)).not.toThrow()
    })

    it('should capture events when PostHog is available', () => {
      // Restore PostHog
      ;(window as any).posthog = mockPostHog

      const criticalError = TemplateErrorHandler.createError(
        TemplateErrorType.DATABASE_ERROR,
        'Critical error'
      )

      TemplateErrorHandler.handleError(criticalError)

      expect(mockPostHog.capture).toHaveBeenCalledWith('template_error', {
        error_type: TemplateErrorType.DATABASE_ERROR,
        error_message: 'Critical error',
        error_context: undefined,
        error_severity: ErrorSeverity.CRITICAL
      })
    })
  })

  describe('Error Context', () => {
    it('should preserve error context through handling', () => {
      const context = {
        templateId: 'test-123',
        userId: 'user-456',
        operation: 'update',
        component: 'TemplateEditor'
      }

      const error = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed',
        { reason: 'network timeout' },
        context
      )

      expect(error.context).toEqual(context)

      const errorLog = TemplateErrorHandler.getErrorLog()
      expect(errorLog[0].context).toEqual(context)
    })
  })
})