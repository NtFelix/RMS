/**
 * Tests for storage error handling utilities
 */

import {
  StorageErrorType,
  ErrorSeverity,
  mapError,
  withRetry,
  ErrorLogger,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/storage-error-handling';

describe('Storage Error Handling', () => {
  describe('mapError', () => {
    it('maps file not found error', () => {
      const error = { error: { message: 'File not found', statusCode: 404 } };
      const mapped = mapError(error, 'download_file');

      expect(mapped.type).toBe(StorageErrorType.FILE_NOT_FOUND);
      expect(mapped.severity).toBe(ErrorSeverity.MEDIUM);
      expect(mapped.retryable).toBe(false);
      expect(mapped.operation).toBe('download_file');
    });

    it('maps authentication error', () => {
      const error = { error: { message: 'unauthorized', statusCode: 401 } };
      const mapped = mapError(error, 'upload_file');

      expect(mapped.type).toBe(StorageErrorType.AUTHENTICATION_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.HIGH);
      expect(mapped.retryable).toBe(false);
    });

    it('maps permission error', () => {
      const error = { error: { message: 'forbidden', statusCode: 403 } };
      const mapped = mapError(error, 'delete_file');

      expect(mapped.type).toBe(StorageErrorType.PERMISSION_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.HIGH);
      expect(mapped.retryable).toBe(false);
    });

    it('maps file too large error', () => {
      const error = { error: { message: 'payload too large', statusCode: 413 } };
      const mapped = mapError(error, 'upload_file');

      expect(mapped.type).toBe(StorageErrorType.FILE_TOO_LARGE);
      expect(mapped.severity).toBe(ErrorSeverity.MEDIUM);
      expect(mapped.retryable).toBe(false);
    });

    it('maps quota exceeded error', () => {
      const error = { error: { message: 'quota exceeded', statusCode: 507 } };
      const mapped = mapError(error, 'upload_file');

      expect(mapped.type).toBe(StorageErrorType.QUOTA_EXCEEDED);
      expect(mapped.severity).toBe(ErrorSeverity.HIGH);
      expect(mapped.retryable).toBe(false);
    });

    it('maps server error', () => {
      const error = { error: { message: 'Internal server error', statusCode: 500 } };
      const mapped = mapError(error, 'list_files');

      expect(mapped.type).toBe(StorageErrorType.SERVER_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.HIGH);
      expect(mapped.retryable).toBe(true);
    });

    it('maps network error', () => {
      const error = { name: 'NetworkError', message: 'network error occurred' };
      const mapped = mapError(error, 'fetch_data');

      expect(mapped.type).toBe(StorageErrorType.NETWORK_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.MEDIUM);
      expect(mapped.retryable).toBe(true);
    });

    it('maps validation error', () => {
      const error = { message: 'validation failed' };
      const mapped = mapError(error, 'create_folder');

      expect(mapped.type).toBe(StorageErrorType.VALIDATION_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.MEDIUM);
      expect(mapped.retryable).toBe(false);
    });

    it('maps unknown error', () => {
      const error = { message: 'Something went wrong' };
      const mapped = mapError(error, 'unknown_operation');

      expect(mapped.type).toBe(StorageErrorType.UNKNOWN_ERROR);
      expect(mapped.severity).toBe(ErrorSeverity.MEDIUM);
      expect(mapped.retryable).toBe(true);
    });

    it('includes timestamp', () => {
      const error = { message: 'Test error' };
      const mapped = mapError(error);

      expect(mapped.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, {}, 'test_operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ name: 'NetworkError', message: 'network error' })
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, { maxRetries: 2, baseDelay: 10 }, 'test_operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      const operation = jest.fn().mockRejectedValue({ name: 'NetworkError', message: 'network error' });

      await expect(withRetry(operation, { maxRetries: 2, baseDelay: 10 }, 'test_operation')).rejects.toMatchObject({
        type: StorageErrorType.NETWORK_ERROR,
      });

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('does not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue({ 
        error: { message: 'not found', statusCode: 404 } 
      });

      await expect(withRetry(operation, {}, 'test_operation')).rejects.toMatchObject({
        type: StorageErrorType.FILE_NOT_FOUND,
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('respects retryableErrors configuration', async () => {
      const operation = jest.fn().mockRejectedValue({ 
        error: { message: 'Internal server error', statusCode: 500 } 
      });

      await expect(withRetry(operation, {
        maxRetries: 2,
        retryableErrors: [StorageErrorType.NETWORK_ERROR], // Server error not in list
      }, 'test_operation')).rejects.toMatchObject({
        type: StorageErrorType.SERVER_ERROR,
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorLogger', () => {
    let logger: ErrorLogger;

    beforeEach(() => {
      logger = new ErrorLogger();
    });

    it('logs errors', () => {
      const error = mapError({ message: 'Test error' }, 'test_operation');
      logger.log(error);

      const errors = logger.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(error);
    });

    it('filters errors by type', () => {
      logger.log(mapError({ name: 'NetworkError', message: 'network error' }));
      logger.log(mapError({ error: { message: 'not found', statusCode: 404 } }));

      const networkErrors = logger.getErrors({ type: StorageErrorType.NETWORK_ERROR });
      expect(networkErrors).toHaveLength(1);
      expect(networkErrors[0].type).toBe(StorageErrorType.NETWORK_ERROR);
    });

    it('filters errors by severity', () => {
      logger.log(mapError({ error: { message: 'unauthorized', statusCode: 401 } }));
      logger.log(mapError({ message: 'validation failed' }));

      const highSeverityErrors = logger.getErrors({ severity: ErrorSeverity.HIGH });
      expect(highSeverityErrors).toHaveLength(1);
      expect(highSeverityErrors[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('provides error stats', () => {
      logger.log(mapError({ name: 'NetworkError', message: 'network error' }));
      logger.log(mapError({ name: 'NetworkError', message: 'network error' }));
      logger.log(mapError({ error: { message: 'not found', statusCode: 404 } }));

      const stats = logger.getErrorStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[StorageErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[StorageErrorType.FILE_NOT_FOUND]).toBe(1);
    });

    it('clears errors', () => {
      logger.log(mapError({ message: 'Test error' }));
      expect(logger.getErrors()).toHaveLength(1);

      logger.clear();
      expect(logger.getErrors()).toHaveLength(0);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(3, 1000, 5000);
    });

    it('executes operation when closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('opens after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // Fail 3 times to reach threshold
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();

      expect(breaker.getState().state).toBe('OPEN');
      expect(breaker.getState().failures).toBe(3);
    });

    it('rejects operations when open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();

      // Next operation should be rejected immediately
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('resets on success', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success');

      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.getState().failures).toBe(1);

      await breaker.execute(operation);
      expect(breaker.getState().failures).toBe(0);
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('can be manually reset', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();

      expect(breaker.getState().state).toBe('OPEN');

      breaker.reset();
      expect(breaker.getState().state).toBe('CLOSED');
      expect(breaker.getState().failures).toBe(0);
    });
  });
});
