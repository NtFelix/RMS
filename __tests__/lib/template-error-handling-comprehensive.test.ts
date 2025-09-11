/**
 * Comprehensive Unit Tests for Template Error Handling
 * 
 * Tests all aspects of error handling including:
 * - Error creation and classification
 * - Error recovery mechanisms
 * - Error reporting and logging
 * - Network error handling
 * - Validation error scenarios
 * - User-friendly error messages
 */

import {
  TemplateErrorHandler,
  TemplateErrorType,
  TemplateErrorRecovery,
  type TemplateError,
  type ErrorContext,
  type RecoveryOptions
} from '../../lib/template-error-handler'
import { TemplateErrorReporter } from '../../lib/template-error-logger'

// Mock dependencies
jest.mock('../../lib/template-error-logger')

describe('Template Error Handling Comprehensive Tests', () => {
  let mockErrorReporter: jest.Mocked<typeof TemplateErrorReporter>

  beforeEach(() => {
    jest.clearAllMocks()
    mockErrorReporter = TemplateErrorReporter as jest.Mocked<typeof TemplateErrorReporter>
  })

  describe('TemplateErrorHandler', () => {
    describe('Error Creation', () => {
      it('should create basic template error', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_NOT_FOUND,
          'Template not found',
          null,
          { templateId: 'test-123' }
        )

        expect(error.type).toBe(TemplateErrorType.TEMPLATE_NOT_FOUND)
        expect(error.message).toBe('Template not found')
        expect(error.context).toEqual({ templateId: 'test-123' })
        expect(error.timestamp).toBeDefined()
        expect(error.recoverable).toBe(false) // Default for NOT_FOUND
      })

      it('should create error with nested cause', () => {
        const originalError = new Error('Database connection failed')
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_LOAD_FAILED,
          'Failed to load template',
          originalError,
          { templateId: 'test-123' }
        )

        expect(error.cause).toBe(originalError)
        expect(error.message).toBe('Failed to load template')
        expect(error.recoverable).toBe(true) // Load failures are recoverable
      })

      it('should determine recoverability based on error type', () => {
        const testCases = [
          { type: TemplateErrorType.TEMPLATE_NOT_FOUND, expectedRecoverable: false },
          { type: TemplateErrorType.PERMISSION_DENIED, expectedRecoverable: false },
          { type: TemplateErrorType.INVALID_TEMPLATE_DATA, expectedRecoverable: false },
          { type: TemplateErrorType.TEMPLATE_LOAD_FAILED, expectedRecoverable: true },
          { type: TemplateErrorType.TEMPLATE_SAVE_FAILED, expectedRecoverable: true },
          { type: TemplateErrorType.NETWORK_ERROR, expectedRecoverable: true }
        ]

        testCases.forEach(testCase => {
          const error = TemplateErrorHandler.createError(
            testCase.type,
            'Test error',
            null,
            {}
          )
          expect(error.recoverable).toBe(testCase.expectedRecoverable)
        })
      })

      it('should generate user-friendly messages', () => {
        const testCases = [
          {
            type: TemplateErrorType.TEMPLATE_NOT_FOUND,
            expectedMessage: expect.stringContaining('nicht gefunden')
          },
          {
            type: TemplateErrorType.PERMISSION_DENIED,
            expectedMessage: expect.stringContaining('Berechtigung')
          },
          {
            type: TemplateErrorType.NETWORK_ERROR,
            expectedMessage: expect.stringContaining('Netzwerk')
          },
          {
            type: TemplateErrorType.TEMPLATE_SAVE_FAILED,
            expectedMessage: expect.stringContaining('Speichern')
          }
        ]

        testCases.forEach(testCase => {
          const error = TemplateErrorHandler.createError(
            testCase.type,
            'Technical error message',
            null,
            {}
          )
          expect(error.userMessage).toEqual(testCase.expectedMessage)
        })
      })

      it('should suggest appropriate actions based on error type', () => {
        const networkError = TemplateErrorHandler.createError(
          TemplateErrorType.NETWORK_ERROR,
          'Network failed',
          null,
          {}
        )

        expect(networkError.actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('erneut'),
              isPrimary: true
            })
          ])
        )

        const permissionError = TemplateErrorHandler.createError(
          TemplateErrorType.PERMISSION_DENIED,
          'Access denied',
          null,
          {}
        )

        expect(permissionError.actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('Anmelden'),
              isPrimary: true
            })
          ])
        )
      })
    })

    describe('Error Classification', () => {
      it('should classify errors from exceptions', () => {
        const testCases = [
          {
            exception: new Error('fetch failed'),
            expectedType: TemplateErrorType.NETWORK_ERROR
          },
          {
            exception: new Error('Network request failed'),
            expectedType: TemplateErrorType.NETWORK_ERROR
          },
          {
            exception: new Error('Validation failed: title required'),
            expectedType: TemplateErrorType.INVALID_TEMPLATE_DATA
          },
          {
            exception: new Error('Permission denied'),
            expectedType: TemplateErrorType.PERMISSION_DENIED
          },
          {
            exception: new Error('Template not found'),
            expectedType: TemplateErrorType.TEMPLATE_NOT_FOUND
          },
          {
            exception: new Error('Unknown error'),
            expectedType: TemplateErrorType.UNKNOWN_ERROR
          }
        ]

        testCases.forEach(testCase => {
          const error = TemplateErrorHandler.fromException(
            testCase.exception,
            { operation: 'test' }
          )
          expect(error.type).toBe(testCase.expectedType)
        })
      })

      it('should handle HTTP status codes', () => {
        const testCases = [
          { status: 400, expectedType: TemplateErrorType.INVALID_TEMPLATE_DATA },
          { status: 401, expectedType: TemplateErrorType.PERMISSION_DENIED },
          { status: 403, expectedType: TemplateErrorType.PERMISSION_DENIED },
          { status: 404, expectedType: TemplateErrorType.TEMPLATE_NOT_FOUND },
          { status: 500, expectedType: TemplateErrorType.SERVER_ERROR },
          { status: 502, expectedType: TemplateErrorType.NETWORK_ERROR },
          { status: 503, expectedType: TemplateErrorType.NETWORK_ERROR }
        ]

        testCases.forEach(testCase => {
          const httpError = new Error(`HTTP ${testCase.status}`)
          ;(httpError as any).status = testCase.status

          const error = TemplateErrorHandler.fromException(httpError, {})
          expect(error.type).toBe(testCase.expectedType)
        })
      })

      it('should handle Supabase errors', () => {
        const supabaseErrors = [
          {
            error: { code: 'PGRST116', message: 'Not found' },
            expectedType: TemplateErrorType.TEMPLATE_NOT_FOUND
          },
          {
            error: { code: '42501', message: 'Permission denied' },
            expectedType: TemplateErrorType.PERMISSION_DENIED
          },
          {
            error: { code: '23505', message: 'Unique constraint violation' },
            expectedType: TemplateErrorType.INVALID_TEMPLATE_DATA
          }
        ]

        supabaseErrors.forEach(testCase => {
          const error = TemplateErrorHandler.fromSupabaseError(
            testCase.error,
            { operation: 'test' }
          )
          expect(error.type).toBe(testCase.expectedType)
        })
      })
    })

    describe('Error Context Enhancement', () => {
      it('should enhance error context with additional information', () => {
        const baseContext: ErrorContext = {
          templateId: 'test-123',
          operation: 'save'
        }

        const enhancedContext = TemplateErrorHandler.enhanceContext(baseContext, {
          userId: 'user-456',
          timestamp: new Date().toISOString(),
          userAgent: 'Test Browser'
        })

        expect(enhancedContext).toEqual({
          ...baseContext,
          userId: 'user-456',
          timestamp: expect.any(String),
          userAgent: 'Test Browser'
        })
      })

      it('should sanitize sensitive information from context', () => {
        const contextWithSensitiveData = {
          templateId: 'test-123',
          password: 'secret123',
          apiKey: 'key-456',
          token: 'bearer-token',
          email: 'user@example.com'
        }

        const sanitized = TemplateErrorHandler.sanitizeContext(contextWithSensitiveData)

        expect(sanitized.templateId).toBe('test-123')
        expect(sanitized.email).toBe('user@example.com') // Email is allowed
        expect(sanitized.password).toBe('[REDACTED]')
        expect(sanitized.apiKey).toBe('[REDACTED]')
        expect(sanitized.token).toBe('[REDACTED]')
      })
    })

    describe('Error Severity Assessment', () => {
      it('should assess error severity correctly', () => {
        const testCases = [
          { type: TemplateErrorType.TEMPLATE_NOT_FOUND, expectedSeverity: 'medium' },
          { type: TemplateErrorType.PERMISSION_DENIED, expectedSeverity: 'high' },
          { type: TemplateErrorType.INVALID_TEMPLATE_DATA, expectedSeverity: 'medium' },
          { type: TemplateErrorType.NETWORK_ERROR, expectedSeverity: 'low' },
          { type: TemplateErrorType.SERVER_ERROR, expectedSeverity: 'high' },
          { type: TemplateErrorType.UNKNOWN_ERROR, expectedSeverity: 'medium' }
        ]

        testCases.forEach(testCase => {
          const error = TemplateErrorHandler.createError(
            testCase.type,
            'Test error',
            null,
            {}
          )
          expect(error.severity).toBe(testCase.expectedSeverity)
        })
      })

      it('should escalate severity for repeated errors', () => {
        const baseError = TemplateErrorHandler.createError(
          TemplateErrorType.NETWORK_ERROR,
          'Network error',
          null,
          { attemptCount: 1 }
        )
        expect(baseError.severity).toBe('low')

        const repeatedError = TemplateErrorHandler.createError(
          TemplateErrorType.NETWORK_ERROR,
          'Network error',
          null,
          { attemptCount: 5 }
        )
        expect(repeatedError.severity).toBe('medium')
      })
    })
  })

  describe('TemplateErrorRecovery', () => {
    describe('Safe Operations', () => {
      it('should execute operation successfully', async () => {
        const successfulOperation = jest.fn().mockResolvedValue('success')
        
        const result = await TemplateErrorRecovery.safeOperation(
          successfulOperation,
          'fallback',
          { operation: 'test' }
        )

        expect(result).toBe('success')
        expect(successfulOperation).toHaveBeenCalled()
      })

      it('should return fallback on operation failure', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))
        
        const result = await TemplateErrorRecovery.safeOperation(
          failingOperation,
          'fallback',
          { operation: 'test' }
        )

        expect(result).toBe('fallback')
        expect(mockErrorReporter.reportError).toHaveBeenCalled()
      })

      it('should execute fallback function', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))
        const fallbackFunction = jest.fn().mockReturnValue('dynamic fallback')
        
        const result = await TemplateErrorRecovery.safeOperation(
          failingOperation,
          fallbackFunction,
          { operation: 'test' }
        )

        expect(result).toBe('dynamic fallback')
        expect(fallbackFunction).toHaveBeenCalled()
      })

      it('should handle fallback function errors', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))
        const failingFallback = jest.fn().mockImplementation(() => {
          throw new Error('Fallback failed')
        })
        
        const result = await TemplateErrorRecovery.safeOperation(
          failingOperation,
          failingFallback,
          { operation: 'test' }
        )

        expect(result).toBeNull()
        expect(mockErrorReporter.reportError).toHaveBeenCalledTimes(2) // Original + fallback error
      })
    })

    describe('Retry Operations', () => {
      it('should retry operation with exponential backoff', async () => {
        let attemptCount = 0
        const retryableOperation = jest.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Temporary failure')
          }
          return 'success'
        })

        const startTime = Date.now()
        const result = await TemplateErrorRecovery.retryOperation(
          retryableOperation,
          { maxAttempts: 3, baseDelay: 100 },
          { operation: 'test' }
        )
        const endTime = Date.now()

        expect(result).toBe('success')
        expect(attemptCount).toBe(3)
        expect(endTime - startTime).toBeGreaterThan(200) // Should have delays
      })

      it('should fail after max attempts', async () => {
        const alwaysFailingOperation = jest.fn().mockRejectedValue(new Error('Always fails'))

        await expect(
          TemplateErrorRecovery.retryOperation(
            alwaysFailingOperation,
            { maxAttempts: 3, baseDelay: 10 },
            { operation: 'test' }
          )
        ).rejects.toThrow('Always fails')

        expect(alwaysFailingOperation).toHaveBeenCalledTimes(3)
      })

      it('should not retry non-retryable errors', async () => {
        const nonRetryableOperation = jest.fn().mockRejectedValue(
          TemplateErrorHandler.createError(
            TemplateErrorType.PERMISSION_DENIED,
            'Access denied',
            null,
            {}
          )
        )

        await expect(
          TemplateErrorRecovery.retryOperation(
            nonRetryableOperation,
            { maxAttempts: 3, baseDelay: 10 },
            { operation: 'test' }
          )
        ).rejects.toThrow('Access denied')

        expect(nonRetryableOperation).toHaveBeenCalledTimes(1) // No retries
      })

      it('should use custom retry condition', async () => {
        let attemptCount = 0
        const operation = jest.fn().mockImplementation(() => {
          attemptCount++
          const error = new Error(`Attempt ${attemptCount}`)
          ;(error as any).code = attemptCount < 2 ? 'RETRYABLE' : 'NON_RETRYABLE'
          throw error
        })

        const customRetryCondition = (error: any) => error.code === 'RETRYABLE'

        await expect(
          TemplateErrorRecovery.retryOperation(
            operation,
            { 
              maxAttempts: 5, 
              baseDelay: 10,
              retryCondition: customRetryCondition
            },
            { operation: 'test' }
          )
        ).rejects.toThrow('Attempt 2')

        expect(attemptCount).toBe(2) // Should stop when condition returns false
      })
    })

    describe('Circuit Breaker', () => {
      it('should allow operations when circuit is closed', async () => {
        const operation = jest.fn().mockResolvedValue('success')
        
        const result = await TemplateErrorRecovery.withCircuitBreaker(
          'test-operation',
          operation,
          { failureThreshold: 3, resetTimeout: 1000 },
          { operation: 'test' }
        )

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalled()
      })

      it('should open circuit after failure threshold', async () => {
        const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))
        
        // Trigger failures to open circuit
        for (let i = 0; i < 3; i++) {
          try {
            await TemplateErrorRecovery.withCircuitBreaker(
              'failing-operation',
              failingOperation,
              { failureThreshold: 3, resetTimeout: 1000 },
              { operation: 'test' }
            )
          } catch (error) {
            // Expected to fail
          }
        }

        // Circuit should now be open
        await expect(
          TemplateErrorRecovery.withCircuitBreaker(
            'failing-operation',
            failingOperation,
            { failureThreshold: 3, resetTimeout: 1000 },
            { operation: 'test' }
          )
        ).rejects.toThrow('Circuit breaker is open')

        // Should not call operation when circuit is open
        expect(failingOperation).toHaveBeenCalledTimes(3)
      })

      it('should reset circuit after timeout', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockRejectedValueOnce(new Error('Fail 3'))
          .mockResolvedValueOnce('success')

        // Trigger failures to open circuit
        for (let i = 0; i < 3; i++) {
          try {
            await TemplateErrorRecovery.withCircuitBreaker(
              'reset-test-operation',
              operation,
              { failureThreshold: 3, resetTimeout: 100 },
              { operation: 'test' }
            )
          } catch (error) {
            // Expected to fail
          }
        }

        // Wait for reset timeout
        await new Promise(resolve => setTimeout(resolve, 150))

        // Circuit should be half-open, allowing one test
        const result = await TemplateErrorRecovery.withCircuitBreaker(
          'reset-test-operation',
          operation,
          { failureThreshold: 3, resetTimeout: 100 },
          { operation: 'test' }
        )

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(4)
      })
    })

    describe('Graceful Degradation', () => {
      it('should provide degraded functionality', async () => {
        const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'))
        const degradedOperation = jest.fn().mockResolvedValue('degraded result')

        const result = await TemplateErrorRecovery.withGracefulDegradation(
          primaryOperation,
          degradedOperation,
          { operation: 'test' }
        )

        expect(result).toBe('degraded result')
        expect(primaryOperation).toHaveBeenCalled()
        expect(degradedOperation).toHaveBeenCalled()
      })

      it('should use primary operation when successful', async () => {
        const primaryOperation = jest.fn().mockResolvedValue('primary result')
        const degradedOperation = jest.fn().mockResolvedValue('degraded result')

        const result = await TemplateErrorRecovery.withGracefulDegradation(
          primaryOperation,
          degradedOperation,
          { operation: 'test' }
        )

        expect(result).toBe('primary result')
        expect(primaryOperation).toHaveBeenCalled()
        expect(degradedOperation).not.toHaveBeenCalled()
      })

      it('should handle degraded operation failure', async () => {
        const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'))
        const degradedOperation = jest.fn().mockRejectedValue(new Error('Degraded failed'))

        await expect(
          TemplateErrorRecovery.withGracefulDegradation(
            primaryOperation,
            degradedOperation,
            { operation: 'test' }
          )
        ).rejects.toThrow('Degraded failed')

        expect(mockErrorReporter.reportError).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('TemplateErrorReporter', () => {
    describe('Error Reporting', () => {
      it('should report error with context', () => {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Save failed',
          null,
          { templateId: 'test-123' }
        )

        TemplateErrorReporter.reportError(error)

        expect(mockErrorReporter.reportError).toHaveBeenCalledWith(error)
      })

      it('should batch error reports', () => {
        const errors = [
          TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 1', null, {}),
          TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 2', null, {}),
          TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 3', null, {})
        ]

        TemplateErrorReporter.reportErrors(errors)

        expect(mockErrorReporter.reportErrors).toHaveBeenCalledWith(errors)
      })

      it('should handle reporting errors gracefully', () => {
        mockErrorReporter.reportError.mockImplementationOnce(() => {
          throw new Error('Reporting failed')
        })

        const error = TemplateErrorHandler.createError(
          TemplateErrorType.TEMPLATE_SAVE_FAILED,
          'Save failed',
          null,
          {}
        )

        // Should not throw when reporting fails
        expect(() => {
          TemplateErrorReporter.reportError(error)
        }).not.toThrow()
      })
    })

    describe('Error Metrics', () => {
      it('should track error metrics', () => {
        const errors = [
          TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 1', null, {}),
          TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 2', null, {}),
          TemplateErrorHandler.createError(TemplateErrorType.TEMPLATE_SAVE_FAILED, 'Error 3', null, {})
        ]

        errors.forEach(error => TemplateErrorReporter.reportError(error))

        const metrics = TemplateErrorReporter.getErrorMetrics()

        expect(metrics.totalErrors).toBe(3)
        expect(metrics.errorsByType[TemplateErrorType.NETWORK_ERROR]).toBe(2)
        expect(metrics.errorsByType[TemplateErrorType.TEMPLATE_SAVE_FAILED]).toBe(1)
      })

      it('should track error trends over time', () => {
        const now = Date.now()
        const errors = [
          { ...TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 1', null, {}), timestamp: now - 3600000 }, // 1 hour ago
          { ...TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 2', null, {}), timestamp: now - 1800000 }, // 30 min ago
          { ...TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, 'Error 3', null, {}), timestamp: now } // Now
        ]

        errors.forEach(error => TemplateErrorReporter.reportError(error))

        const trends = TemplateErrorReporter.getErrorTrends('1h')

        expect(trends.length).toBeGreaterThan(0)
        expect(trends[trends.length - 1].count).toBe(3) // All errors in last hour
      })
    })
  })

  describe('Integration Scenarios', () => {
    describe('Template Loading Error Scenarios', () => {
      it('should handle template not found with recovery', async () => {
        const loadOperation = jest.fn().mockRejectedValue(
          TemplateErrorHandler.createError(
            TemplateErrorType.TEMPLATE_NOT_FOUND,
            'Template not found',
            null,
            { templateId: 'missing-123' }
          )
        )

        const fallbackTemplate = { id: 'fallback', title: 'Default Template' }

        const result = await TemplateErrorRecovery.safeOperation(
          loadOperation,
          fallbackTemplate,
          { operation: 'load', templateId: 'missing-123' }
        )

        expect(result).toEqual(fallbackTemplate)
        expect(mockErrorReporter.reportError).toHaveBeenCalled()
      })

      it('should handle network errors with retry', async () => {
        let attemptCount = 0
        const networkOperation = jest.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            throw TemplateErrorHandler.createError(
              TemplateErrorType.NETWORK_ERROR,
              'Network timeout',
              null,
              { attempt: attemptCount }
            )
          }
          return { id: 'template-123', title: 'Loaded Template' }
        })

        const result = await TemplateErrorRecovery.retryOperation(
          networkOperation,
          { maxAttempts: 3, baseDelay: 10 },
          { operation: 'load' }
        )

        expect(result).toEqual({ id: 'template-123', title: 'Loaded Template' })
        expect(attemptCount).toBe(3)
      })
    })

    describe('Template Saving Error Scenarios', () => {
      it('should handle validation errors without retry', async () => {
        const saveOperation = jest.fn().mockRejectedValue(
          TemplateErrorHandler.createError(
            TemplateErrorType.INVALID_TEMPLATE_DATA,
            'Title is required',
            null,
            { field: 'title' }
          )
        )

        await expect(
          TemplateErrorRecovery.retryOperation(
            saveOperation,
            { maxAttempts: 3, baseDelay: 10 },
            { operation: 'save' }
          )
        ).rejects.toThrow('Title is required')

        expect(saveOperation).toHaveBeenCalledTimes(1) // No retries for validation errors
      })

      it('should handle permission errors with appropriate actions', () => {
        const permissionError = TemplateErrorHandler.createError(
          TemplateErrorType.PERMISSION_DENIED,
          'Access denied',
          null,
          { operation: 'save', templateId: 'protected-123' }
        )

        expect(permissionError.actions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('Anmelden'),
              isPrimary: true
            })
          ])
        )
        expect(permissionError.recoverable).toBe(false)
      })
    })

    describe('Complex Error Recovery Scenarios', () => {
      it('should handle cascading failures with circuit breaker', async () => {
        const cascadingOperation = jest.fn()
          .mockRejectedValue(new Error('Service A failed'))
          .mockRejectedValue(new Error('Service A failed'))
          .mockRejectedValue(new Error('Service A failed'))
          .mockRejectedValue(new Error('Circuit breaker is open'))

        // First three calls should fail and open circuit
        for (let i = 0; i < 3; i++) {
          try {
            await TemplateErrorRecovery.withCircuitBreaker(
              'cascading-service',
              cascadingOperation,
              { failureThreshold: 3, resetTimeout: 1000 },
              { operation: 'cascade-test' }
            )
          } catch (error) {
            // Expected failures
          }
        }

        // Fourth call should be blocked by circuit breaker
        await expect(
          TemplateErrorRecovery.withCircuitBreaker(
            'cascading-service',
            cascadingOperation,
            { failureThreshold: 3, resetTimeout: 1000 },
            { operation: 'cascade-test' }
          )
        ).rejects.toThrow('Circuit breaker is open')

        expect(cascadingOperation).toHaveBeenCalledTimes(3)
      })

      it('should provide graceful degradation for template features', async () => {
        const fullFeatureOperation = jest.fn().mockRejectedValue(new Error('Full feature unavailable'))
        const basicFeatureOperation = jest.fn().mockResolvedValue({
          template: { id: 'basic-123', title: 'Basic Template' },
          features: ['basic-editing']
        })

        const result = await TemplateErrorRecovery.withGracefulDegradation(
          fullFeatureOperation,
          basicFeatureOperation,
          { operation: 'load-with-features' }
        )

        expect(result.template.id).toBe('basic-123')
        expect(result.features).toEqual(['basic-editing'])
        expect(mockErrorReporter.reportError).toHaveBeenCalled()
      })
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle high error volumes efficiently', () => {
      const startTime = Date.now()
      
      // Generate many errors
      for (let i = 0; i < 1000; i++) {
        const error = TemplateErrorHandler.createError(
          TemplateErrorType.NETWORK_ERROR,
          `Error ${i}`,
          null,
          { index: i }
        )
        TemplateErrorReporter.reportError(error)
      }
      
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should handle 1000 errors in under 1 second
    })

    it('should clean up old error data', () => {
      // Generate errors with old timestamps
      const oldTimestamp = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
      
      for (let i = 0; i < 100; i++) {
        const error = {
          ...TemplateErrorHandler.createError(TemplateErrorType.NETWORK_ERROR, `Old error ${i}`, null, {}),
          timestamp: oldTimestamp
        }
        TemplateErrorReporter.reportError(error)
      }

      // Trigger cleanup
      TemplateErrorReporter.cleanupOldErrors(12 * 60 * 60 * 1000) // Keep last 12 hours

      const metrics = TemplateErrorReporter.getErrorMetrics()
      expect(metrics.totalErrors).toBe(0) // Old errors should be cleaned up
    })
  })
})