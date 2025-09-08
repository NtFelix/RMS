/**
 * Template Error Handler Tests
 * Tests for comprehensive template error handling system
 */

import { 
  TemplateErrorHandler,
  TemplateErrorType,
  withTemplateErrorHandling
} from '@/lib/template-system/template-error-handler';
import type { ErrorContext, EnhancedTemplateError } from '@/lib/template-system/template-error-handler';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Template Error Handler', () => {
  const mockContext: ErrorContext = {
    operation: 'test-operation',
    templateId: 'test-template-id',
    userId: 'test-user-id',
    timestamp: new Date('2024-01-01T00:00:00Z')
  };

  describe('Error Type Detection', () => {
    it('should detect validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('validation');
      expect(result.message).toContain('Validierungsfehler');
    });

    it('should detect security errors', () => {
      const error = new Error('Security violation detected');
      error.name = 'SecurityError';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('validation');
      expect(result.message).toContain('Sicherheitsfehler');
    });

    it('should detect network errors', () => {
      const error = new Error('Network request failed');
      error.name = 'NetworkError';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('processing');
      expect(result.message).toContain('Netzwerkfehler');
    });

    it('should detect timeout errors', () => {
      const error = new Error('Operation timed out');

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('processing');
      expect(result.message).toContain('dauerte zu lange');
    });

    it('should detect database errors', () => {
      const error = new Error('Database connection failed');
      (error as any).code = 'PGRST204';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('database');
      expect(result.message).toContain('Datenbankfehler');
    });

    it('should detect permission errors', () => {
      const error = new Error('Access denied');
      (error as any).code = 'PGRST301';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('database');
      expect(result.message).toContain('keine Berechtigung');
    });

    it('should detect not found errors', () => {
      const error = new Error('Resource not found');
      (error as any).code = 'PGRST116';

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.type).toBe('database');
      expect(result.message).toContain('nicht gefunden');
    });
  });

  describe('Error Enhancement', () => {
    it('should generate unique error IDs', () => {
      const error = new Error('Test error');

      const result1 = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });
      const result2 = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result1.errorId).toBeDefined();
      expect(result2.errorId).toBeDefined();
      expect(result1.errorId).not.toBe(result2.errorId);
    });

    it('should include context information', () => {
      const error = new Error('Test error');

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.userId).toBe(mockContext.userId);
      expect(result.templateId).toBe(mockContext.templateId);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should determine correct severity levels', () => {
      const securityError = new Error('Security violation');
      securityError.name = 'SecurityError';

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      const securityResult = TemplateErrorHandler.handleError(securityError, mockContext, {
        logError: false
      });
      const validationResult = TemplateErrorHandler.handleError(validationError, mockContext, {
        logError: false
      });
      const networkResult = TemplateErrorHandler.handleError(networkError, mockContext, {
        logError: false
      });

      expect(securityResult.severity).toBe('critical');
      expect(validationResult.severity).toBe('medium');
      expect(networkResult.severity).toBe('low');
    });

    it('should provide appropriate recovery actions', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      const result = TemplateErrorHandler.handleError(validationError, mockContext, {
        logError: false
      });

      expect(result.recoveryActions).toContain('Überprüfen Sie Ihre Eingaben');
      expect(result.recoveryActions.length).toBeGreaterThan(0);
    });

    it('should mark retryable errors correctly', () => {
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      const networkResult = TemplateErrorHandler.handleError(networkError, mockContext, {
        logError: false
      });
      const validationResult = TemplateErrorHandler.handleError(validationError, mockContext, {
        logError: false
      });

      expect(networkResult.retryable).toBe(true);
      expect(validationResult.retryable).toBe(false);
    });
  });

  describe('Error Rate Limiting', () => {
    beforeEach(() => {
      // Reset error count for clean tests
      (TemplateErrorHandler as any).errorCount.clear();
    });

    it('should track error rates per user', () => {
      const error = new Error('Test error');

      // Generate multiple errors for the same user
      for (let i = 0; i < 5; i++) {
        TemplateErrorHandler.handleError(error, mockContext, {
          logError: false
        });
      }

      expect(TemplateErrorHandler.isErrorRateLimitExceeded(mockContext.userId!)).toBe(false);

      // Generate more errors to exceed limit
      for (let i = 0; i < 10; i++) {
        TemplateErrorHandler.handleError(error, mockContext, {
          logError: false
        });
      }

      expect(TemplateErrorHandler.isErrorRateLimitExceeded(mockContext.userId!)).toBe(true);
    });

    it('should not affect other users', () => {
      const error = new Error('Test error');
      const otherUserContext = { ...mockContext, userId: 'other-user' };

      // Generate errors for first user
      for (let i = 0; i < 15; i++) {
        TemplateErrorHandler.handleError(error, mockContext, {
          logError: false
        });
      }

      expect(TemplateErrorHandler.isErrorRateLimitExceeded(mockContext.userId!)).toBe(true);
      expect(TemplateErrorHandler.isErrorRateLimitExceeded(otherUserContext.userId!)).toBe(false);
    });
  });

  describe('Field and Placeholder Extraction', () => {
    it('should extract field from validation error', () => {
      const error = {
        message: 'Validation failed',
        path: ['titel'],
        name: 'ValidationError'
      };

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.field).toBe('titel');
    });

    it('should extract placeholder from error message', () => {
      const error = new Error('Invalid placeholder @mieter.invalid found');

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.placeholder).toBe('@mieter.invalid');
    });

    it('should handle errors without field or placeholder', () => {
      const error = new Error('Generic error');

      const result = TemplateErrorHandler.handleError(error, mockContext, {
        logError: false
      });

      expect(result.field).toBeUndefined();
      expect(result.placeholder).toBeUndefined();
    });
  });
});

describe('withTemplateErrorHandling', () => {
  const mockContext: ErrorContext = {
    operation: 'test-operation',
    timestamp: new Date()
  };

  it('should handle successful operations', async () => {
    const successfulOperation = jest.fn().mockResolvedValue('success');

    const result = await withTemplateErrorHandling(
      successfulOperation,
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.error).toBeUndefined();
    expect(successfulOperation).toHaveBeenCalledTimes(1);
  });

  it('should handle failed operations', async () => {
    const failedOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

    const result = await withTemplateErrorHandling(
      failedOperation,
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    // The error message should be translated to German
    expect(result.error?.message).toContain('unerwarteter Fehler');
  });

  it('should retry retryable operations', async () => {
    const networkError = new Error('Network failed');
    networkError.name = 'NetworkError';

    const retryableOperation = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const result = await withTemplateErrorHandling(
      retryableOperation,
      mockContext,
      {
        retryCount: 2,
        retryDelay: 10 // Short delay for testing
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(retryableOperation).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable operations', async () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';

    const nonRetryableOperation = jest.fn().mockRejectedValue(validationError);

    const result = await withTemplateErrorHandling(
      nonRetryableOperation,
      mockContext,
      {
        retryCount: 2
      }
    );

    expect(result.success).toBe(false);
    expect(nonRetryableOperation).toHaveBeenCalledTimes(1);
  });

  it('should stop retrying after max attempts', async () => {
    const networkError = new Error('Network failed');
    networkError.name = 'NetworkError';

    const alwaysFailingOperation = jest.fn().mockRejectedValue(networkError);

    const result = await withTemplateErrorHandling(
      alwaysFailingOperation,
      mockContext,
      {
        retryCount: 2,
        retryDelay: 10
      }
    );

    expect(result.success).toBe(false);
    expect(alwaysFailingOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should handle operations that throw non-Error objects', async () => {
    const stringError = 'String error';
    const throwStringOperation = jest.fn().mockRejectedValue(stringError);

    const result = await withTemplateErrorHandling(
      throwStringOperation,
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});