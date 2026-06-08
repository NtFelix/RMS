import { safeRpcCall, withRetry, PerformanceMonitor, generateUserFriendlyErrorMessage, getErrorRecoveryActions, ErrorCategory } from './error-handling';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    error: jest.fn()
  }
}));

describe('error-handling utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PerformanceMonitor as any).metrics = [];
  });

  describe('safeRpcCall', () => {
    it('should successfully execute rpc call', async () => {
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: 'success', error: null })
      };
      const result = await safeRpcCall(mockSupabase, 'test_func');
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle rpc error', async () => {
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      };
      const result = await safeRpcCall(mockSupabase, 'test_func');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Die angeforderten Daten wurden nicht gefunden.');
      expect(logger.error).toHaveBeenCalled();
      expect(posthogLogger.error).toHaveBeenCalled();
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();
      const mockSupabase = {
        rpc: jest.fn().mockImplementation(() => new Promise(() => {}))
      };
      const promise = safeRpcCall(mockSupabase, 'test_func', {}, { timeoutMs: 10 });
      jest.advanceTimersByTime(10);
      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.message).toContain('dauerte zu lange');
      expect(logger.error).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should handle fetch errors', async () => {
        const mockSupabase = {
            rpc: jest.fn().mockRejectedValue(new Error('fetch failed'))
        };
        const result = await safeRpcCall(mockSupabase, 'test_func');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Netzwerkfehler');
    });
  });

  describe('withRetry', () => {
    it('should return on first success', async () => {
      const mockOp = jest.fn().mockResolvedValue({ success: true, data: 'ok' });
      const result = await withRetry(mockOp);
      expect(result.success).toBe(true);
      expect(mockOp).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure if condition met', async () => {
      const mockOp = jest.fn()
        .mockResolvedValueOnce({ success: false, performanceMetrics: { errorMessage: 'network error' } })
        .mockResolvedValueOnce({ success: true, data: 'ok' });

      const result = await withRetry(mockOp, { baseDelayMs: 1 });
      expect(result.success).toBe(true);
      expect(mockOp).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries', async () => {
      const mockOp = jest.fn().mockResolvedValue({ success: false, performanceMetrics: { errorMessage: 'network error' } });
      const result = await withRetry(mockOp, { maxRetries: 2, baseDelayMs: 1 });
      expect(result.success).toBe(false);
      expect(mockOp).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('PerformanceMonitor', () => {
    it('should track metrics', () => {
      const metric = { functionName: 'test', executionTime: 100, success: true, timestamp: new Date() };
      PerformanceMonitor.addMetric(metric);
      const metrics = PerformanceMonitor.getMetrics('test');
      expect(metrics.length).toBeGreaterThan(0);
      expect(PerformanceMonitor.getAverageExecutionTime('test')).toBeGreaterThan(0);
      expect(PerformanceMonitor.getSuccessRate('test')).toBe(1);
    });
  });

  describe('generateUserFriendlyErrorMessage', () => {
    it('should generate message with operation context', () => {
      const msg = generateUserFriendlyErrorMessage({ code: 'PGRST116' }, 'Laden');
      expect(msg).toContain('Die angeforderten Daten wurden nicht gefunden.');
      expect(msg).toContain('(Laden)');
    });
  });

  describe('getErrorRecoveryActions', () => {
    it('should return correct actions based on category', () => {
      const actions = getErrorRecoveryActions({ category: ErrorCategory.NETWORK, message: '', userMessage: '', retryable: true });
      expect(actions[0]).toContain('Internetverbindung');
    });
  });
});
