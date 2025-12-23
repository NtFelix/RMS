/**
 * Integration tests for error handling and logging in betriebskosten optimization
 * 
 * Tests the error handling system integration without mocking the actual functions,
 * focusing on the error handling utilities and their behavior.
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 9
 */

import { 
  safeRpcCall, 
  withRetry, 
  PerformanceMonitor,
  generateUserFriendlyErrorMessage,
  getErrorRecoveryActions,
  ErrorCategory
} from '@/lib/error-handling';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Error Handling Integration Tests', () => {
  const { logger } = require('@/utils/logger');
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear performance metrics
    PerformanceMonitor['metrics'] = [];
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle database connection timeout with proper logging and retry', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn()
      };

      // Simulate timeout on first two calls, success on third
      let callCount = 0;
      mockSupabaseClient.rpc.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 100);
          });
        }
        return Promise.resolve({ 
          data: [{ id: '1', name: 'Success after retry' }], 
          error: null 
        });
      });

      const operation = () => safeRpcCall(
        mockSupabaseClient as any,
        'get_nebenkosten_with_metrics',
        { user_id: 'test-user' },
        { userId: 'test-user', timeoutMs: 50 }
      );

      const result = await withRetry(operation, {
        maxRetries: 3,
        baseDelayMs: 10,
        retryCondition: (result) => !result.success && result.message?.includes('dauerte zu lange')
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: '1', name: 'Success after retry' }]);
      expect(callCount).toBe(3);

      // Verify logging
      expect(logger.error).toHaveBeenCalledTimes(2); // Two timeout errors
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('RPC call completed'),
        expect.objectContaining({
          functionName: 'get_nebenkosten_with_metrics',
          success: true
        })
      );
    });

    it('should handle permission errors without retry', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST301',
            message: 'Insufficient privileges'
          }
        })
      };

      const operation = () => safeRpcCall(
        mockSupabaseClient as any,
        'get_wasserzaehler_modal_data',
        { nebenkosten_id: 'test-id', user_id: 'test-user' },
        { userId: 'test-user' }
      );

      const result = await withRetry(operation, {
        maxRetries: 2,
        retryCondition: (result) => !result.success && result.message?.includes('Netzwerk')
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sie haben keine Berechtigung für diese Aktion.');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1); // No retry for permission errors

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('RPC call failed'),
        expect.any(Object),
        expect.objectContaining({
          errorCategory: ErrorCategory.PERMISSION,
          errorCode: 'PGRST301'
        })
      );
    });

    it('should handle slow operations with performance warnings', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ data: [], error: null }), 4000)
          )
        )
      };

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'save_wasserzaehler_batch',
        { nebenkosten_id: 'test-id', readings: '[]' },
        { userId: 'test-user', logPerformance: true }
      );

      expect(result.success).toBe(true);
      expect(result.performanceMetrics?.executionTime).toBeGreaterThan(3000);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow database operation detected'),
        expect.objectContaining({
          functionName: 'save_wasserzaehler_batch',
          executionTime: expect.any(Number)
        })
      );
    });

    it('should handle constraint violations with user-friendly messages', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "wasserzaehler_unique"'
          }
        })
      };

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'save_wasserzaehler_batch',
        { nebenkosten_id: 'test-id', readings: '[]' },
        { userId: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Ein Eintrag mit diesen Daten existiert bereits.');

      const userMessage = generateUserFriendlyErrorMessage(
        { code: '23505', message: 'duplicate key' },
        'Speichern der Wasserzählerdaten'
      );
      expect(userMessage).toContain('Ein Eintrag mit diesen Daten existiert bereits.');
      expect(userMessage).toContain('Speichern der Wasserzählerdaten');
    });

    it('should provide appropriate recovery actions for different error types', () => {
      const networkError = {
        category: ErrorCategory.NETWORK,
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Netzwerkfehler',
        retryable: true
      };

      const validationError = {
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        userMessage: 'Ungültige Eingabe',
        retryable: false
      };

      const timeoutError = {
        category: ErrorCategory.TIMEOUT,
        code: 'TIMEOUT_ERROR',
        message: 'Operation timed out',
        userMessage: 'Zeitüberschreitung',
        retryable: true
      };

      const networkActions = getErrorRecoveryActions(networkError);
      expect(networkActions).toContain('Überprüfen Sie Ihre Internetverbindung');
      expect(networkActions).toContain('Versuchen Sie es in wenigen Sekunden erneut');

      const validationActions = getErrorRecoveryActions(validationError);
      expect(validationActions).toContain('Überprüfen Sie Ihre Eingaben');
      expect(validationActions).toContain('Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind');

      const timeoutActions = getErrorRecoveryActions(timeoutError);
      expect(timeoutActions).toContain('Die Anfrage dauerte zu lange');
      expect(timeoutActions).toContain('Versuchen Sie es mit weniger Daten erneut');
    });
  });

  describe('Performance Monitoring in Real Scenarios', () => {
    it('should track performance metrics across multiple operations', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn()
      };

      // Simulate different operations with varying performance
      const operations = [
        { name: 'get_nebenkosten_with_metrics', delay: 500, success: true },
        { name: 'get_wasserzaehler_modal_data', delay: 1500, success: true },
        { name: 'save_wasserzaehler_batch', delay: 3000, success: false },
        { name: 'get_abrechnung_modal_data', delay: 800, success: true }
      ];

      for (const op of operations) {
        mockSupabaseClient.rpc.mockImplementation(() => 
          new Promise((resolve) => 
            setTimeout(() => resolve({ 
              data: op.success ? [{ id: '1' }] : null, 
              error: op.success ? null : { code: 'ERROR', message: 'Test error' }
            }), op.delay)
          )
        );

        const result = await safeRpcCall(
          mockSupabaseClient as any,
          op.name,
          { user_id: 'test-user' },
          { userId: 'test-user', logPerformance: true }
        );

        if (result.performanceMetrics) {
          PerformanceMonitor.addMetric(result.performanceMetrics);
        }
      }

      // Verify metrics collection
      const allMetrics = PerformanceMonitor.getMetrics();
      expect(allMetrics).toHaveLength(4);

      // Check specific function metrics
      const nebenkostenMetrics = PerformanceMonitor.getMetrics('get_nebenkosten_with_metrics');
      expect(nebenkostenMetrics).toHaveLength(1);
      expect(nebenkostenMetrics[0].success).toBe(true);

      const saveMetrics = PerformanceMonitor.getMetrics('save_wasserzaehler_batch');
      expect(saveMetrics).toHaveLength(1);
      expect(saveMetrics[0].success).toBe(false);

      // Check performance calculations
      const avgTime = PerformanceMonitor.getAverageExecutionTime('get_nebenkosten_with_metrics');
      expect(avgTime).toBeGreaterThan(400);
      expect(avgTime).toBeLessThan(600);

      const successRate = PerformanceMonitor.getSuccessRate('save_wasserzaehler_batch');
      expect(successRate).toBe(0);

      // Check slow operations
      const slowOps = PerformanceMonitor.getSlowOperations(2000);
      expect(slowOps).toHaveLength(1);
      expect(slowOps[0].functionName).toBe('save_wasserzaehler_batch');
    });

    it('should filter metrics by time range correctly', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      // Add old metric
      const oldMetric = {
        functionName: 'old_function',
        executionTime: 1000,
        success: true,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        userId: 'test-user'
      };
      PerformanceMonitor.addMetric(oldMetric);

      // Add recent metric via safeRpcCall
      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'recent_function',
        { user_id: 'test-user' },
        { userId: 'test-user', logPerformance: true }
      );

      // Manually add the metric since safeRpcCall might not be adding it in test
      if (result.performanceMetrics) {
        PerformanceMonitor.addMetric(result.performanceMetrics);
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentMetrics = PerformanceMonitor.getMetrics(undefined, oneHourAgo);
      
      expect(recentMetrics.length).toBeGreaterThanOrEqual(1);
      expect(recentMetrics.some(m => m.functionName === 'recent_function')).toBe(true);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle complete error recovery workflow for critical operations', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn()
      };

      let callCount = 0;
      mockSupabaseClient.rpc.mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // First call: network timeout
          return Promise.reject(new Error('Network timeout'));
        } else if (callCount === 2) {
          // Second call: database error (retryable)
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST204', message: 'Connection failed' }
          });
        } else {
          // Third call: success
          return Promise.resolve({
            data: [{ id: '1', saved: true }],
            error: null
          });
        }
      });

      const operation = () => safeRpcCall(
        mockSupabaseClient as any,
        'save_wasserzaehler_batch',
        { nebenkosten_id: 'critical-save', readings: '[{"mieter_id":"1"}]' },
        { userId: 'test-user', logPerformance: true }
      );

      const result = await withRetry(operation, {
        maxRetries: 3,
        baseDelayMs: 10,
        retryCondition: (result) => !result.success && (
          result.message?.includes('Netzwerkfehler') ||
          result.message?.includes('Verbindungsfehler') ||
          result.message?.includes('versuchen Sie es erneut')
        )
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: '1', saved: true }]);
      expect(callCount).toBe(3);

      // Verify comprehensive logging occurred (at least some error logs)
      expect(logger.error).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();

      // Verify performance tracking
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.functionName).toBe('save_wasserzaehler_batch');
      expect(result.performanceMetrics?.success).toBe(true);
    });

    it('should stop retrying for non-retryable errors', async () => {
      const mockSupabaseClient = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23503', message: 'Foreign key constraint violation' }
        })
      };

      const operation = () => safeRpcCall(
        mockSupabaseClient as any,
        'save_wasserzaehler_batch',
        { nebenkosten_id: 'invalid-ref', readings: '[]' },
        { userId: 'test-user' }
      );

      const result = await withRetry(operation, {
        maxRetries: 3,
        retryCondition: (result) => !result.success && result.message?.includes('Netzwerk')
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Die referenzierten Daten sind nicht verfügbar.');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1); // No retry

      const recoveryActions = getErrorRecoveryActions({
        category: ErrorCategory.VALIDATION,
        code: '23503',
        message: 'Foreign key constraint violation',
        userMessage: 'Die referenzierten Daten sind nicht verfügbar.',
        retryable: false
      });

      expect(recoveryActions).toContain('Überprüfen Sie Ihre Eingaben');
    });
  });
});