import { Logger, logger, createRequestLogger } from '@/utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => { }),
      info: jest.spyOn(console, 'info').mockImplementation(() => { }),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => { }),
      error: jest.spyOn(console, 'error').mockImplementation(() => { }),
    };
    // Reset instance to ensure clean state (though it's a singleton, we can't easily reset private static without a helper or accessing it directly if possible, or we just rely on setLogLevel)
    Logger.getInstance().setLogLevel('debug');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = Logger.getInstance();
    const instance2 = Logger.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should log info messages when level is debug', () => {
    logger.setLogLevel('debug');
    logger.info('test info');
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('test info'));
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should log info messages when level is info', () => {
    logger.setLogLevel('info');
    logger.info('test info');
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('test info'));
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should not log info messages when level is warn', () => {
    logger.setLogLevel('warn');
    logger.info('test info');
    expect(consoleSpy.info).not.toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    logger.warn('test warn');
    expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('test warn'));
    expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
  });

  it('should log error messages with error object', () => {
    const error = new Error('test error obj');
    logger.error('test error', error);
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('test error'));
    expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('test error obj'));
  });

  it('should format message with context', () => {
    logger.info('test context', { userId: '123' });
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('test context'));
    expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('"userId": "123"'));
  });

  describe('createRequestLogger', () => {
    it('should attach path and method to logs', () => {
      // Mock Request object
      const req = new Request('http://localhost/api/test', { method: 'POST' });
      const reqLogger = createRequestLogger(req);

      reqLogger.info('test request');
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('test request'));
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('"path": "/api/test"'));
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('"method": "POST"'));
    });
  });

  describe('apiError', () => {
    it('should log api error with context', () => {
      const req = new Request('http://localhost/api/error', { method: 'GET' });
      const error = new Error('api failure');
      Logger.apiError(error, 'Something went wrong', req, { additional: 'info' });

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('api failure'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('"path": "/api/error"'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('"additional": "info"'));
    });
  });
});
