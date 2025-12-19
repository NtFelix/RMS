import { Logger, createRequestLogger, logger } from '@/utils/logger';

// Mock console methods
const consoleMock = {
  debug: jest.spyOn(console, 'debug').mockImplementation(),
  info: jest.spyOn(console, 'info').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
    // Reset log level to ensure info/debug logs are captured
    Logger.getInstance().setLogLevel('debug');
  });

  afterAll(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Log Levels', () => {
    it('should respect log level settings', () => {
      const loggerInstance = Logger.getInstance();

      // Set level to 'info', so 'debug' should be ignored
      loggerInstance.setLogLevel('info');
      loggerInstance.debug('Debug message');
      expect(consoleMock.debug).not.toHaveBeenCalled();

      loggerInstance.info('Info message');
      expect(consoleMock.info).toHaveBeenCalled();
    });

    it('should log all levels when set to debug', () => {
        const loggerInstance = Logger.getInstance();
        loggerInstance.setLogLevel('debug');

        loggerInstance.debug('Debug message');
        expect(consoleMock.debug).toHaveBeenCalled();

        loggerInstance.info('Info message');
        expect(consoleMock.info).toHaveBeenCalled();
    });
  });

  describe('Formatting', () => {
    it('should format messages with context correctly', () => {
      const loggerInstance = Logger.getInstance();
      loggerInstance.setLogLevel('info');

      const context = { userId: '123' };
      loggerInstance.info('Test message', context);

      const loggedArgs = consoleMock.info.mock.calls[0][0];
      expect(loggedArgs).toContain('[INFO] Test message');
      expect(loggedArgs).toContain('Context:');
      expect(loggedArgs).toContain('"userId": "123"');
    });

    it('should format error messages correctly', () => {
        const loggerInstance = Logger.getInstance();
        loggerInstance.setLogLevel('error');

        const error = new Error('Test Error');
        loggerInstance.error('Error occurred', error);

        const loggedArgs = consoleMock.error.mock.calls[0][0];
        expect(loggedArgs).toContain('[ERROR] Error occurred');
        expect(loggedArgs).toContain('Error: Test Error');
      });
  });

  describe('createRequestLogger', () => {
    it('should create a logger with request context', () => {
        // Mock global Request if needed, but the util uses it.
        // We can pass a dummy object that looks like a Request.
        const req = new Request('http://localhost/api/test', { method: 'POST' });
        const requestLogger = createRequestLogger(req);

        requestLogger.info('Request Log');

        expect(consoleMock.info).toHaveBeenCalled();
        const loggedArgs = consoleMock.info.mock.calls[0][0];
        expect(loggedArgs).toContain('"path": "/api/test"');
        expect(loggedArgs).toContain('"method": "POST"');
    });
  });

  describe('apiError', () => {
      it('should log API error with request details', () => {
          const req = new Request('http://localhost/api/fail', { method: 'GET' });
          const error = new Error('API Failure');

          Logger.apiError(error, 'API Failed', req, { additional: 'info' });

          expect(consoleMock.error).toHaveBeenCalled();
          const loggedArgs = consoleMock.error.mock.calls[0][0];
          expect(loggedArgs).toContain('[ERROR] API Failed');
          expect(loggedArgs).toContain('API Failure');
          expect(loggedArgs).toContain('"path": "/api/fail"');
          expect(loggedArgs).toContain('"additional": "info"');
      });
  });
});
