/**
 * Comprehensive tests for error handling and logging system
 * 
 * Tests the enhanced error handling utilities, performance monitoring,
 * and recovery mechanisms for the betriebskosten optimization system.
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

// Mock Supabase client
const mockSupabaseClient = {
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Enhanced Error Handling and Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear performance metrics
    PerformanceMonitor['metrics'] = [];
  });

  describe('safeRpcCall', () => {
    it('should handle successful RPC calls with performance logging', async () => {
      const mockData = [{ id: '1', name: 'test' }];
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' },
        { userId: 'test-user', logPerformance: true }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.functionName).toBe('test_function');
      expect(result.performanceMetrics?.success).toBe(true);
      expect(result.performanceMetrics?.userId).toBe('test-user');
    });

    it('should handle database errors with structured error mapping', async () => {
      const mockError = {
        code: 'PGRST116',
        message: 'No rows found'
      };
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: mockError });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Die angeforderten Daten wurden nicht gefunden.');
      expect(result.performanceMetrics?.success).toBe(false);
      expect(result.performanceMetrics?.errorMessage).toBe('No rows found');
    });

    it('should handle timeout errors', async () => {
      mockSupabaseClient.rpc.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 2000))
      );

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' },
        { timeoutMs: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('dauerte zu lange');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('fetch failed');
      networkError.name = 'NetworkError';
      mockSupabaseClient.rpc.mockRejectedValue(networkError);

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Netzwerkfehler');
    });

    it('should log performance warnings for slow operations', async () => {
      const { logger } = require('@/utils/logger');
      
      // Mock a slow operation
      mockSupabaseClient.rpc.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: [], error: null }), 4000)
        )
      );

      await safeRpcCall(
        mockSupabaseClient as any,
        'slow_function',
        { user_id: 'test-user' },
        { logPerformance: true }
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow database operation detected'),
        expect.objectContaining({
          functionName: 'slow_function',
          executionTime: expect.any(Number)
        })
      );
    });
  });

  describe('withRetry', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let callCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ 
            success: false, 
            message: 'network error',
            performanceMetrics: { errorMessage: 'network timeout' }
          });
        }
        return Promise.resolve({ success: true, data: 'success' });
      });

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        baseDelayMs: 100,
        retryCondition: (result) => !result.success && result.performanceMetrics?.errorMessage?.includes('network')
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'validation error' 
      });

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        retryCondition: (result) => !result.success && result.message?.includes('network')
      });

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry limit', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'network error',
        performanceMetrics: { errorMessage: 'network timeout' }
      });

      const result = await withRetry(mockOperation, {
        maxRetries: 2,
        baseDelayMs: 10,
        retryCondition: (result) => !result.success
      });

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track performance metrics', () => {
      const metric1 = {
        functionName: 'test_function',
        executionTime: 1500,
        success: true,
        timestamp: new Date(),
        userId: 'user1'
      };

      const metric2 = {
        functionName: 'test_function',
        executionTime: 2500,
        success: true,
        timestamp: new Date(),
        userId: 'user1'
      };

      PerformanceMonitor.addMetric(metric1);
      PerformanceMonitor.addMetric(metric2);

      const metrics = PerformanceMonitor.getMetrics('test_function');
      expect(metrics).toHaveLength(2);
      expect(metrics).toContain(metric1);
      expect(metrics).toContain(metric2);
    });

    it('should calculate average execution time', () => {
      const metrics = [
        {
          functionName: 'test_function',
          executionTime: 1000,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          functionName: 'test_function',
          executionTime: 2000,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          functionName: 'test_function',
          executionTime: 3000,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        }
      ];

      metrics.forEach(metric => PerformanceMonitor.addMetric(metric));

      const averageTime = PerformanceMonitor.getAverageExecutionTime('test_function');
      expect(averageTime).toBe(2000);
    });

    it('should calculate success rate', () => {
      const metrics = [
        {
          functionName: 'test_function',
          executionTime: 1000,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          functionName: 'test_function',
          executionTime: 1500,
          success: false,
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          functionName: 'test_function',
          executionTime: 1200,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          functionName: 'test_function',
          executionTime: 1800,
          success: true,
          timestamp: new Date(),
          userId: 'user1'
        }
      ];

      metrics.forEach(metric => PerformanceMonitor.addMetric(metric));

      const successRate = PerformanceMonitor.getSuccessRate('test_function');
      expect(successRate).toBe(0.75); // 3 out of 4 successful
    });

    it('should identify slow operations', () => {
      const fastMetric = {
        functionName: 'fast_function',
        executionTime: 500,
        success: true,
        timestamp: new Date(),
        userId: 'user1'
      };

      const slowMetric = {
        functionName: 'slow_function',
        executionTime: 6000,
        success: true,
        timestamp: new Date(),
        userId: 'user1'
      };

      PerformanceMonitor.addMetric(fastMetric);
      PerformanceMonitor.addMetric(slowMetric);

      const slowOperations = PerformanceMonitor.getSlowOperations(5000);
      expect(slowOperations).toHaveLength(1);
      expect(slowOperations[0]).toEqual(slowMetric);
    });

    it('should filter metrics by date range', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const oldMetric = {
        functionName: 'test_function',
        executionTime: 1000,
        success: true,
        timestamp: oldDate,
        userId: 'user1'
      };

      const recentMetric = {
        functionName: 'test_function',
        executionTime: 1500,
        success: true,
        timestamp: recentDate,
        userId: 'user1'
      };

      PerformanceMonitor.addMetric(oldMetric);
      PerformanceMonitor.addMetric(recentMetric);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentMetrics = PerformanceMonitor.getMetrics('test_function', oneHourAgo);
      
      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0]).toEqual(recentMetric);
    });
  });

  describe('generateUserFriendlyErrorMessage', () => {
    it('should generate user-friendly messages for database errors', () => {
      const error = {
        code: 'PGRST301',
        message: 'Insufficient privileges'
      };

      const message = generateUserFriendlyErrorMessage(error, 'Daten laden');
      expect(message).toContain('keine Berechtigung');
      expect(message).toContain('Daten laden');
    });

    it('should handle unknown errors gracefully', () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong'
      };

      const message = generateUserFriendlyErrorMessage(error, 'Operation');
      expect(message).toContain('Datenbankfehler');
      expect(message).toContain('versuchen Sie es erneut');
    });
  });

  describe('getErrorRecoveryActions', () => {
    it('should provide recovery actions for network errors', () => {
      const error = {
        category: ErrorCategory.NETWORK,
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Netzwerkfehler',
        retryable: true
      };

      const actions = getErrorRecoveryActions(error);
      expect(actions).toContain('Überprüfen Sie Ihre Internetverbindung');
      expect(actions).toContain('Versuchen Sie es in wenigen Sekunden erneut');
    });

    it('should provide recovery actions for validation errors', () => {
      const error = {
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        userMessage: 'Ungültige Eingabe',
        retryable: false
      };

      const actions = getErrorRecoveryActions(error);
      expect(actions).toContain('Überprüfen Sie Ihre Eingaben');
      expect(actions).toContain('Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind');
    });

    it('should provide recovery actions for timeout errors', () => {
      const error = {
        category: ErrorCategory.TIMEOUT,
        code: 'TIMEOUT_ERROR',
        message: 'Operation timed out',
        userMessage: 'Zeitüberschreitung',
        retryable: true
      };

      const actions = getErrorRecoveryActions(error);
      expect(actions).toContain('Die Anfrage dauerte zu lange');
      expect(actions).toContain('Versuchen Sie es mit weniger Daten erneut');
    });

    it('should provide recovery actions for permission errors', () => {
      const error = {
        category: ErrorCategory.PERMISSION,
        code: 'PERMISSION_ERROR',
        message: 'Access denied',
        userMessage: 'Zugriff verweigert',
        retryable: false
      };

      const actions = getErrorRecoveryActions(error);
      expect(actions).toContain('Sie haben keine Berechtigung für diese Aktion');
      expect(actions).toContain('Kontaktieren Sie Ihren Administrator');
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle authentication failures gracefully', async () => {
      const authError = {
        code: 'AUTH_ERROR',
        message: 'Invalid token'
      };
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: authError });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Datenbankfehler');
    });

    it('should handle constraint violation errors', async () => {
      const constraintError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: constraintError });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Ein Eintrag mit diesen Daten existiert bereits.');
    });

    it('should handle foreign key constraint errors', async () => {
      const fkError = {
        code: '23503',
        message: 'foreign key constraint violation'
      };
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: fkError });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'test_function',
        { user_id: 'test-user' }
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Die referenzierten Daten sind nicht verfügbar.');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track metrics for successful operations', async () => {
      const mockData = [{ id: '1' }];
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'tracked_function',
        { user_id: 'test-user' },
        { userId: 'test-user', logPerformance: true }
      );

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.functionName).toBe('tracked_function');
      expect(result.performanceMetrics?.success).toBe(true);
      expect(result.performanceMetrics?.userId).toBe('test-user');
    });

    it('should track metrics for failed operations', async () => {
      const error = { code: 'ERROR', message: 'Test error' };
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error });

      const result = await safeRpcCall(
        mockSupabaseClient as any,
        'failed_function',
        { user_id: 'test-user' },
        { userId: 'test-user', logPerformance: true }
      );

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics?.functionName).toBe('failed_function');
      expect(result.performanceMetrics?.success).toBe(false);
      expect(result.performanceMetrics?.errorMessage).toBe('Test error');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete error recovery workflow', async () => {
    let callCount = 0;
    const mockOperation = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: network error (retryable)
        return Promise.resolve({
          success: false,
          message: 'Netzwerkfehler',
          performanceMetrics: { errorMessage: 'network timeout' }
        });
      } else if (callCount === 2) {
        // Second call: timeout error (retryable)
        return Promise.resolve({
          success: false,
          message: 'Zeitüberschreitung',
          performanceMetrics: { errorMessage: 'timeout' }
        });
      } else {
        // Third call: success
        return Promise.resolve({
          success: true,
          data: 'recovered successfully'
        });
      }
    });

    const result = await withRetry(mockOperation, {
      maxRetries: 3,
      baseDelayMs: 10,
      retryCondition: (result) => !result.success && (
        result.performanceMetrics?.errorMessage?.includes('network') ||
        result.performanceMetrics?.errorMessage?.includes('timeout')
      )
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe('recovered successfully');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });
});