/**
 * Template Error Handling Tests
 * 
 * Tests for the comprehensive error handling system
 */

import { 
  TemplateErrorHandler, 
  TemplateErrorType, 
  TemplateErrorRecovery 
} from '@/lib/template-error-handler'
import { TemplateErrorLogger, TemplateErrorReporter } from '@/lib/template-error-logger'
import { TemplateValidator } from '@/lib/template-validation'

// Mock toast function
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}))

describe('TemplateErrorHandler', () => {
  beforeEach(() => {
    TemplateErrorHandler.clearErrorLog()
  })

  describe('createError', () => {
    it('should create a template error with all required fields', () => {
      const error = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_NOT_FOUND,
        'Template not found',
        { templateId: 'test-123' },
        { templateId: 'test-123', userId: 'user-456' }
      )

      expect(error.type).toBe(TemplateErrorType.TEMPLATE_NOT_FOUND)
      expect(error.message).toBe('Template not found')
      expect(error.details).toEqual({ templateId: 'test-123' })
      expect(error.context).toEqual({ templateId: 'test-123', userId: 'user-456' })
      expect(error.recoverable).toBe(false)
      expect(error.timestamp).toBeInstanceOf(Date)
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
  })

  describe('fromException', () => {
    it('should create error from generic exception', () => {
      const exception = new Error('Something went wrong')
      const error = TemplateErrorHandler.fromException(exception)

      expect(error.type).toBe(TemplateErrorType.UNKNOWN_ERROR)
      expect(error.message).toBe('Something went wrong')
      expect(error.details).toBe(exception)
    })

    it('should detect network errors', () => {
      const networkException = new Error('fetch failed')
      const error = TemplateErrorHandler.fromException(networkException)

      expect(error.type).toBe(TemplateErrorType.NETWORK_ERROR)
    })

    it('should detect database errors', () => {
      const dbException = new Error('database connection failed')
      const error = TemplateErrorHandler.fromException(dbException)

      expect(error.type).toBe(TemplateErrorType.DATABASE_ERROR)
    })

    it('should detect permission errors', () => {
      const permissionException = new Error('permission denied')
      const error = TemplateErrorHandler.fromException(permissionException)

      expect(error.type).toBe(TemplateErrorType.PERMISSION_DENIED)
    })
  })

  describe('error logging', () => {
    it('should log errors to internal log', () => {
      const error = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed'
      )

      const errorLog = TemplateErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0]).toEqual(error)
    })

    it('should limit error log size', () => {
      // Create more than 100 errors
      for (let i = 0; i < 150; i++) {
        TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          `Error ${i}`
        )
      }

      const errorLog = TemplateErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(100)
    })
  })
})

describe('TemplateErrorRecovery', () => {
  describe('retryOperation', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await TemplateErrorRecovery.retryOperation(operation, 3)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')
      
      const result = await TemplateErrorRecovery.retryOperation(operation, 3)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('always fails'))
      
      await expect(
        TemplateErrorRecovery.retryOperation(operation, 2)
      ).rejects.toThrow('always fails')
      
      expect(operation).toHaveBeenCalledTimes(3) // initial + 2 retries
    })
  })

  describe('safeOperation', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await TemplateErrorRecovery.safeOperation(operation)
      
      expect(result).toBe('success')
    })

    it('should return fallback on error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failed'))
      
      const result = await TemplateErrorRecovery.safeOperation(
        operation,
        'fallback'
      )
      
      expect(result).toBe('fallback')
    })

    it('should return undefined when no fallback provided', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failed'))
      
      const result = await TemplateErrorRecovery.safeOperation(operation)
      
      expect(result).toBeUndefined()
    })
  })
})

describe('TemplateValidator', () => {
  let validator: TemplateValidator

  beforeEach(() => {
    validator = new TemplateValidator(undefined, false) // Use legacy validation for tests
  })

  describe('validate', () => {
    it('should validate complete template data successfully', () => {
      const validData = {
        titel: 'Test Template',
        kategorie: 'Test Category',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                {
                  type: 'mention',
                  attrs: { id: 'tenant_name', label: 'Tenant Name' }
                }
              ]
            }
          ]
        },
        kontext_anforderungen: ['tenant_name']
      }

      const result = validator.validate(validData)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation for missing title', () => {
      const invalidData = {
        kategorie: 'Test Category',
        inhalt: { type: 'doc', content: [] }
      }

      const result = validator.validate(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'titel',
          code: 'TITLE_REQUIRED'
        })
      )
    })

    it('should fail validation for missing category', () => {
      const invalidData = {
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] }
      }

      const result = validator.validate(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'kategorie',
          code: 'CATEGORY_REQUIRED'
        })
      )
    })

    it('should fail validation for title too long', () => {
      const invalidData = {
        titel: 'a'.repeat(300), // Too long
        kategorie: 'Test Category',
        inhalt: { type: 'doc', content: [] }
      }

      const result = validator.validate(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'titel',
          code: 'TITLE_TOO_LONG'
        })
      )
    })

    it('should fail validation for invalid content structure', () => {
      const invalidData = {
        titel: 'Test Template',
        kategorie: 'Test Category',
        inhalt: { type: 'invalid' } // Invalid structure
      }

      const result = validator.validate(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'inhalt',
          code: 'CONTENT_INVALID_FORMAT'
        })
      )
    })

    it('should generate warnings for empty content', () => {
      const dataWithEmptyContent = {
        titel: 'Test Template',
        kategorie: 'Test Category',
        inhalt: { type: 'doc', content: [] }
      }

      const result = validator.validate(dataWithEmptyContent)
      
      expect(result.isValid).toBe(true) // Valid but with warnings
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'inhalt',
          code: 'CONTENT_EMPTY'
        })
      )
    })
  })

  describe('static validation methods', () => {
    it('should validate title correctly', () => {
      expect(TemplateValidator.validateTitle('Valid Title')).toBe(true)
      expect(TemplateValidator.validateTitle('')).toBe(false)
      expect(TemplateValidator.validateTitle('   ')).toBe(false) // whitespace only
      expect(TemplateValidator.validateTitle('a'.repeat(300))).toBe(false)
    })

    it('should validate category correctly', () => {
      expect(TemplateValidator.validateCategory('Valid Category')).toBe(true)
      expect(TemplateValidator.validateCategory('')).toBe(false)
      expect(TemplateValidator.validateCategory('   ')).toBe(false) // whitespace only
      expect(TemplateValidator.validateCategory('a'.repeat(150))).toBe(false)
    })

    it('should validate content correctly', () => {
      const validContent = { type: 'doc', content: [] }
      const invalidContent = { type: 'invalid' }
      
      expect(TemplateValidator.validateContent(validContent)).toBe(true)
      expect(TemplateValidator.validateContent(invalidContent)).toBe(false)
      expect(TemplateValidator.validateContent(null as any)).toBe(false)
      expect(TemplateValidator.validateContent(undefined as any)).toBe(false)
    })
  })
})

describe('TemplateErrorLogger', () => {
  let logger: TemplateErrorLogger

  beforeEach(() => {
    logger = TemplateErrorLogger.getInstance()
    logger.clearLogs()
  })

  describe('logError', () => {
    it('should log error with all metadata', () => {
      const error = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed',
        { details: 'test' },
        { templateId: 'test-123' }
      )

      logger.logError(error)
      
      const stats = logger.getStatistics()
      expect(stats.totalErrors).toBe(1)
      expect(stats.errorsByType[TemplateErrorType.TEMPLATE_SAVE_FAILED]).toBe(1)
    })

    it('should track error statistics correctly', () => {
      // Log multiple errors
      const error1 = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed'
      )
      const error2 = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_LOAD_FAILED,
        'Load failed'
      )
      const error3 = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed again'
      )

      logger.logError(error1)
      logger.logError(error2)
      logger.logError(error3)

      const stats = logger.getStatistics()
      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByType[TemplateErrorType.TEMPLATE_SAVE_FAILED]).toBe(2)
      expect(stats.errorsByType[TemplateErrorType.TEMPLATE_LOAD_FAILED]).toBe(1)
    })
  })

  describe('generateReport', () => {
    it('should generate comprehensive error report', () => {
      // Log some errors
      const error1 = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Save failed'
      )
      const error2 = TemplateErrorHandler.createError(
        TemplateErrorType.SYSTEM_ERROR,
        'Critical error'
      )

      logger.logError(error1)
      logger.logError(error2)

      const report = TemplateErrorReporter.generateReport()
      
      expect(report.summary).toContain('Total Errors: 2')
      expect(report.summary).toContain('Critical Errors: 1')
      expect(report.statistics.totalErrors).toBe(2)
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.recommendations.length).toBeGreaterThan(0)
    })
  })
})

// Integration tests
describe('Template Error Handling Integration', () => {
  beforeEach(() => {
    // Clear error log before each integration test
    TemplateErrorHandler.clearErrorLog()
    TemplateErrorLogger.getInstance().clearLogs()
  })

  it('should handle complete error flow', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    try {
      // Clear logs to ensure clean state
      TemplateErrorHandler.clearErrorLog()
      TemplateErrorLogger.getInstance().clearLogs()

      // Create an error
      const error = TemplateErrorHandler.createError(
        TemplateErrorType.TEMPLATE_SAVE_FAILED,
        'Integration test error',
        { test: true },
        { templateId: 'integration-test' }
      )

      // Handle the error (should show toast and log)
      TemplateErrorHandler.handleError(error)

      // Verify error was logged in TemplateErrorHandler
      const errorLog = TemplateErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0]).toEqual(error)

      // Note: TemplateErrorReporter uses TemplateErrorLogger which has separate storage
      // So we just verify the error was created and handled properly

    } finally {
      consoleSpy.mockRestore()
    }
  })
})