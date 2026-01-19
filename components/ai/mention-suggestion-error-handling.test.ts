/**
 * @jest-environment jsdom
 */

import {
  MentionSuggestionErrorType,
  createMentionSuggestionError,
  logMentionSuggestionError,
  safeExecute,
  handleSuggestionInitializationError,
  handleFilterError,
  handleRenderError,
  handlePositionError,
  handleKeyboardNavigationError,
  createGracefulFallback,
  MentionSuggestionErrorRecovery,
  mentionSuggestionErrorRecovery,
} from '@/lib/mention-suggestion-error-handling';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
  
  // Reset global error recovery instance
  mentionSuggestionErrorRecovery.reset();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
});

describe('MentionSuggestionErrorHandling', () => {
  describe('createMentionSuggestionError', () => {
    it('should create a standardized error object', () => {
      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.FILTER_ERROR,
        'Test error message',
        new Error('Original error'),
        { testContext: 'value' }
      );

      expect(error.type).toBe(MentionSuggestionErrorType.FILTER_ERROR);
      expect(error.message).toBe('Test error message');
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.context).toMatchObject({ testContext: 'value' });
      expect(error.timestamp).toBeDefined();
      expect(error.errorId).toBeDefined();
      expect(error.recoverable).toBe(true);
    });

    it('should mark non-recoverable errors correctly', () => {
      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.INITIALIZATION_FAILED,
        'Init failed'
      );

      expect(error.recoverable).toBe(false);
    });
  });

  describe('logMentionSuggestionError', () => {
    it('should log errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });

      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.RENDER_ERROR,
        'Render failed'
      );

      logMentionSuggestionError(error);

      expect(console.group).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
    });

    it('should log minimal info in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.RENDER_ERROR,
        'Render failed'
      );

      logMentionSuggestionError(error);

      expect(console.error).toHaveBeenCalledWith(
        'Mention Suggestion Error:',
        expect.objectContaining({
          errorId: error.errorId,
          type: error.type,
          message: error.message,
          recoverable: error.recoverable,
        })
      );

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
    });
  });

  describe('safeExecute', () => {
    it('should execute operation successfully', async () => {
      const operation = () => 'success';
      const result = await safeExecute(
        operation,
        MentionSuggestionErrorType.FILTER_ERROR
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should handle operation failure with retries', async () => {
      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation failed');
        }
        return 'success after retries';
      };

      const result = await safeExecute(
        operation,
        MentionSuggestionErrorType.FILTER_ERROR,
        {},
        { maxRetries: 3, retryDelay: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success after retries');
      expect(attempts).toBe(3);
    });

    it('should return error after max retries exceeded', async () => {
      const operation = () => {
        throw new Error('Always fails');
      };

      const result = await safeExecute(
        operation,
        MentionSuggestionErrorType.FILTER_ERROR,
        {},
        { maxRetries: 2, retryDelay: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(MentionSuggestionErrorType.FILTER_ERROR);
    });

    it('should handle async operations', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async success';
      };

      const result = await safeExecute(
        operation,
        MentionSuggestionErrorType.FILTER_ERROR
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('async success');
    });
  });

  describe('Error Handlers', () => {
    it('should handle suggestion initialization errors', () => {
      const originalError = new Error('Init failed');
      const context = { query: 'test' };

      const error = handleSuggestionInitializationError(originalError, context);

      expect(error.type).toBe(MentionSuggestionErrorType.INITIALIZATION_FAILED);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toMatchObject(context);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle filter errors', () => {
      const originalError = new Error('Filter failed');
      const query = 'test query';
      const variableCount = 10;

      const error = handleFilterError(originalError, query, variableCount);

      expect(error.type).toBe(MentionSuggestionErrorType.FILTER_ERROR);
      expect(error.context).toMatchObject({ query, variableCount });
    });

    it('should handle render errors', () => {
      const originalError = new Error('Render failed');
      const componentName = 'TestComponent';
      const props = { test: 'prop' };

      const error = handleRenderError(originalError, componentName, props);

      expect(error.type).toBe(MentionSuggestionErrorType.RENDER_ERROR);
      expect(error.context).toMatchObject({ componentName, props });
    });

    it('should handle position errors', () => {
      const originalError = new Error('Position failed');
      const clientRect = new DOMRect(10, 20, 100, 50);

      const error = handlePositionError(originalError, clientRect);

      expect(error.type).toBe(MentionSuggestionErrorType.POSITION_ERROR);
      expect(error.context?.clientRect).toMatchObject({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });

    it('should handle keyboard navigation errors', () => {
      const originalError = new Error('Keyboard failed');
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const selectedIndex = 2;
      const itemCount = 5;

      const error = handleKeyboardNavigationError(
        originalError,
        keyEvent,
        selectedIndex,
        itemCount
      );

      expect(error.type).toBe(MentionSuggestionErrorType.KEYBOARD_NAVIGATION_ERROR);
      expect(error.context).toMatchObject({
        key: 'ArrowDown',
        selectedIndex: 2,
        itemCount: 5,
      });
    });
  });

  describe('createGracefulFallback', () => {
    it('should provide fallback filter function', () => {
      const fallback = createGracefulFallback();
      const variables = [
        { id: '1', label: 'Test Variable', description: 'Test description', category: 'test' },
        { id: '2', label: 'Another Variable', description: 'Another description', category: 'test' },
      ];

      const result = fallback.fallbackFilter(variables, 'test');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Test Variable');
    });

    it('should handle empty query in fallback filter', () => {
      const fallback = createGracefulFallback();
      const variables = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        label: `Variable ${i}`,
        description: `Description ${i}`,
        category: 'test',
      }));

      const result = fallback.fallbackFilter(variables, '');
      expect(result).toHaveLength(10); // Should limit to 10
    });

    it('should determine when to use fallback mode', () => {
      const fallback = createGracefulFallback();

      expect(fallback.shouldUseFallback(2, 3)).toBe(false);
      expect(fallback.shouldUseFallback(3, 3)).toBe(true);
      expect(fallback.shouldUseFallback(5, 3)).toBe(true);
    });
  });

  describe('MentionSuggestionErrorRecovery', () => {
    it('should track error count and enter fallback mode', () => {
      const recovery = new MentionSuggestionErrorRecovery(2);

      const error1 = createMentionSuggestionError(
        MentionSuggestionErrorType.FILTER_ERROR,
        'Error 1'
      );
      const error2 = createMentionSuggestionError(
        MentionSuggestionErrorType.RENDER_ERROR,
        'Error 2'
      );

      expect(recovery.recordError(error1)).toBe(false);
      expect(recovery.isInFallbackMode()).toBe(false);

      expect(recovery.recordError(error2)).toBe(true);
      expect(recovery.isInFallbackMode()).toBe(true);
    });

    it('should reset error state', () => {
      const recovery = new MentionSuggestionErrorRecovery(1);

      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.FILTER_ERROR,
        'Error'
      );

      recovery.recordError(error);
      expect(recovery.isInFallbackMode()).toBe(true);

      recovery.reset();
      expect(recovery.isInFallbackMode()).toBe(false);

      const stats = recovery.getErrorStats();
      expect(stats.errorCount).toBe(0);
      expect(stats.fallbackMode).toBe(false);
    });

    it('should provide error statistics', () => {
      const recovery = new MentionSuggestionErrorRecovery(3);

      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.FILTER_ERROR,
        'Error'
      );

      recovery.recordError(error);

      const stats = recovery.getErrorStats();
      expect(stats.errorCount).toBe(1);
      expect(stats.maxErrors).toBe(3);
      expect(stats.fallbackMode).toBe(false);
      expect(stats.lastError).toBe(error);
    });
  });

  describe('Global error recovery instance', () => {
    it('should be available and functional', () => {
      expect(mentionSuggestionErrorRecovery).toBeInstanceOf(MentionSuggestionErrorRecovery);
      expect(mentionSuggestionErrorRecovery.isInFallbackMode()).toBe(false);

      const error = createMentionSuggestionError(
        MentionSuggestionErrorType.FILTER_ERROR,
        'Test error'
      );

      mentionSuggestionErrorRecovery.recordError(error);
      expect(mentionSuggestionErrorRecovery.getErrorStats().errorCount).toBe(1);
    });
  });
});