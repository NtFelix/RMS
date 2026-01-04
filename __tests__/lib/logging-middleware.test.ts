import { withLogging, logAction, logApiRoute } from '@/lib/logging-middleware';
import { posthogLogger } from '@/lib/posthog-logger';
import { getLogsEndpoint, buildOTLPPayloadSingle } from '@/lib/otlp-utils';

// Mock dependencies
jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/otlp-utils', () => ({
  POSTHOG_API_KEY: 'test-api-key',
  getLogsEndpoint: jest.fn().mockReturnValue('https://api.posthog.com/logs'),
  buildOTLPPayloadSingle: jest.fn().mockReturnValue({ test: 'payload' }),
}));

describe('Logging Middleware', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('withLogging', () => {
    it('should log action start and success', async () => {
      const mockAction = jest.fn().mockResolvedValue({ success: true, data: 'test' });
      const wrappedAction = withLogging('testAction', mockAction);

      const result = await wrappedAction('arg1');

      expect(mockAction).toHaveBeenCalledWith('arg1');
      expect(result).toEqual({ success: true, data: 'test' });

      // Check start log
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action started: testAction',
        expect.objectContaining({
          'action.name': 'testAction',
          'action.status': 'started',
        })
      );

      // Check success log
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action completed: testAction',
        expect.objectContaining({
          'action.name': 'testAction',
          'action.status': 'success',
        })
      );
    });

    it('should log action failure (result success: false)', async () => {
      const mockAction = jest.fn().mockResolvedValue({ success: false, error: { message: 'failed' } });
      const wrappedAction = withLogging('testAction', mockAction);

      const result = await wrappedAction();

      expect(result).toEqual({ success: false, error: { message: 'failed' } });

      // Check failure log
      expect(posthogLogger.warn).toHaveBeenCalledWith(
        'Action failed: testAction',
        expect.objectContaining({
          'action.name': 'testAction',
          'action.status': 'failed',
          'action.error_message': 'failed',
        })
      );
    });

    it('should log unexpected errors', async () => {
      const error = new Error('unexpected error');
      const mockAction = jest.fn().mockRejectedValue(error);
      const wrappedAction = withLogging('testAction', mockAction);

      await expect(wrappedAction()).rejects.toThrow('unexpected error');

      // Check error log
      expect(posthogLogger.error).toHaveBeenCalledWith(
        'Action error: testAction',
        expect.objectContaining({
          'action.name': 'testAction',
          'action.status': 'error',
          'action.error_message': 'unexpected error',
        })
      );
    });

    it('should handle userId as string', async () => {
      const mockAction = jest.fn().mockResolvedValue({ success: true });
      const wrappedAction = withLogging('testAction', mockAction, { userId: 'user123' });

      await wrappedAction();

      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action started: testAction',
        expect.objectContaining({
          'action.user_id': 'user123',
        })
      );
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action completed: testAction',
        expect.objectContaining({
          'action.user_id': 'user123',
        })
      );
    });

    it('should handle userId as function', async () => {
      const mockAction = jest.fn().mockResolvedValue({ success: true });
      const userIdFn = jest.fn().mockResolvedValue('user123');
      const wrappedAction = withLogging('testAction', mockAction, { userId: userIdFn });

      await wrappedAction();

      expect(userIdFn).toHaveBeenCalled();
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action started: testAction',
        expect.objectContaining({
          'action.user_id': 'user123',
        })
      );
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action completed: testAction',
        expect.objectContaining({
          'action.user_id': 'user123',
        })
      );
    });
  });

  describe('logAction', () => {
    it('should log start event', () => {
      logAction('testAction', 'start', { extra: 'data' });
      expect(posthogLogger.info).toHaveBeenCalledWith(
        'Action start: testAction',
        expect.objectContaining({
          'action.name': 'testAction',
          'action.status': 'start',
          'extra': 'data',
        })
      );
    });

    it('should log failed event', () => {
      logAction('testAction', 'failed', { error: 'msg' });
      expect(posthogLogger.warn).toHaveBeenCalledWith(
        'Action failed: testAction',
        expect.objectContaining({
          'action.status': 'failed',
          'error': 'msg',
        })
      );
    });
  });

  describe('logApiRoute', () => {
    it('should send log immediately via fetch', () => {
      logApiRoute('/api/test', 'GET', 'request', { extra: 'info' });

      expect(getLogsEndpoint).toHaveBeenCalled();
      expect(buildOTLPPayloadSingle).toHaveBeenCalledWith(
        'info',
        'API request: GET /api/test',
        expect.objectContaining({
          'api.route': '/api/test',
          'api.method': 'GET',
          'api.event': 'request',
          'extra': 'info',
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.posthog.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should log error severity for error event', () => {
      logApiRoute('/api/test', 'GET', 'error');

      expect(buildOTLPPayloadSingle).toHaveBeenCalledWith(
        'error',
        'API error: GET /api/test',
        expect.objectContaining({
          'api.route': '/api/test',
          'api.method': 'GET',
          'api.event': 'error',
        })
      );
    });
  });
});
