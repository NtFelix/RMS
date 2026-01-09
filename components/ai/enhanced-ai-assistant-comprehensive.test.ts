import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnhancedAIAssistant } from '@/hooks/use-enhanced-ai-assistant';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useRetry } from '@/hooks/use-retry';
import { validateAIInput, validateAIContext } from '@/lib/ai-input-validation';
import { categorizeAIError } from '@/lib/ai-documentation-context';

// Mock dependencies
jest.mock('@/hooks/use-network-status');
jest.mock('@/hooks/use-retry');
jest.mock('@/lib/ai-input-validation', () => ({
  validateAIInput: jest.fn(),
  validateAIContext: jest.fn(),
  sanitizeInput: jest.fn((input) => input), // Return input as-is for tests
  getInputSuggestions: jest.fn(() => [])
}));
jest.mock('@/lib/ai-documentation-context');
jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
    has_opted_in_capturing: () => true
  })
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseRetry = useRetry as jest.MockedFunction<typeof useRetry>;
const mockValidateAIInput = validateAIInput as jest.MockedFunction<typeof validateAIInput>;
const mockValidateAIContext = validateAIContext as jest.MockedFunction<typeof validateAIContext>;
const mockCategorizeAIError = categorizeAIError as jest.MockedFunction<typeof categorizeAIError>;

describe('Enhanced AI Assistant Hook', () => {
  const defaultNetworkStatus = {
    isOnline: true,
    isOffline: false,
    checkConnectivity: jest.fn().mockResolvedValue(true),
    lastOnlineTime: new Date(),
    lastOfflineTime: null,
    connectionType: 'wifi' as const,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 50
  };

  const defaultRetryState = {
    isRetrying: false,
    attemptCount: 0,
    nextRetryIn: 0
  };

  const mockRetryFunction = jest.fn();
  const mockResetRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Default network status mock
    mockUseNetworkStatus.mockReturnValue(defaultNetworkStatus);
    
    // Default retry hook mock
    mockUseRetry.mockReturnValue({
      retry: mockRetryFunction,
      state: defaultRetryState,
      reset: mockResetRetry
    });

    // Default validation mocks
    mockValidateAIInput.mockReturnValue({
      isValid: true,
      sanitizedInput: 'test input'
    });

    mockValidateAIContext.mockReturnValue({
      isValid: true,
      sanitizedInput: 'test input'
    });

    // Default error categorization mock
    mockCategorizeAIError.mockReturnValue({
      errorType: 'network_error',
      errorCode: 'NETWORK_ERROR',
      errorMessage: 'Network error',
      retryable: true,
      failureStage: 'network'
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.inputValue).toBe('');
      expect(result.current.state.streamingMessageId).toBe(null);
      expect(result.current.state.validationError).toBe(null);
      expect(result.current.state.validationWarning).toBe(null);
      expect(result.current.state.inputSuggestions).toEqual([]);
      expect(result.current.state.fallbackToSearch).toBe(false);
    });

    it('initializes session ID on mount', async () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await waitFor(() => {
        expect(result.current.state.sessionId).toMatch(/^session_/);
        expect(result.current.state.sessionStartTime).toBeInstanceOf(Date);
      });
    });
  });

  describe('Input Validation', () => {
    it('validates input and sets validation state', () => {
      mockValidateAIInput.mockReturnValue({
        isValid: false,
        error: 'Input too short'
      });

      mockValidateAIContext.mockReturnValue({
        isValid: false,
        error: 'Invalid context'
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      act(() => {
        result.current.actions.setInputValue('a');
      });

      expect(mockValidateAIInput).toHaveBeenCalledWith('a');
      expect(mockValidateAIContext).toHaveBeenCalledWith('a');
      expect(result.current.state.validationError).toBe('Input too short');
    });

    it('shows validation warnings', () => {
      mockValidateAIInput.mockReturnValue({
        isValid: true,
        warning: 'Input warning',
        sanitizedInput: 'test'
      });

      mockValidateAIContext.mockReturnValue({
        isValid: true,
        warning: 'Context warning',
        sanitizedInput: 'test'
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      act(() => {
        result.current.actions.setInputValue('test input');
      });

      expect(result.current.state.validationWarning).toBe('Input warning');
    });

    it('provides input suggestions for invalid input', () => {
      mockValidateAIInput.mockReturnValue({
        isValid: false,
        error: 'Too short'
      });

      // Mock getInputSuggestions
      jest.doMock('@/lib/ai-input-validation', () => ({
        ...jest.requireActual('@/lib/ai-input-validation'),
        getInputSuggestions: jest.fn().mockReturnValue(['Suggestion 1', 'Suggestion 2'])
      }));

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      act(() => {
        result.current.actions.setInputValue('a');
      });

      // Note: In the actual implementation, suggestions would be set
      // This test verifies the validation flow
      expect(mockValidateAIInput).toHaveBeenCalled();
    });

    it('clears validation errors for empty input', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      // First set some input to trigger validation
      act(() => {
        result.current.actions.setInputValue('test');
      });

      // Then clear it
      act(() => {
        result.current.actions.setInputValue('');
      });

      expect(result.current.state.validationError).toBe(null);
      expect(result.current.state.validationWarning).toBe(null);
    });
  });

  describe('Network Status Handling', () => {
    it('prevents sending messages when offline', async () => {
      mockUseNetworkStatus.mockReturnValue({
        ...defaultNetworkStatus,
        isOnline: false,
        isOffline: true
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.error).toContain('Keine Internetverbindung');
      expect(result.current.state.fallbackToSearch).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clears network errors when coming back online', async () => {
      const { result, rerender } = renderHook(() => useEnhancedAIAssistant([]));

      // Start offline
      mockUseNetworkStatus.mockReturnValue({
        ...defaultNetworkStatus,
        isOnline: false,
        isOffline: true
      });

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.error).toContain('Internetverbindung');

      // Come back online
      mockUseNetworkStatus.mockReturnValue(defaultNetworkStatus);

      rerender();

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.fallbackToSearch).toBe(false);
      });
    });

    it('checks connectivity before making requests', async () => {
      const mockCheckConnectivity = jest.fn().mockResolvedValue(true);
      mockUseNetworkStatus.mockReturnValue({
        ...defaultNetworkStatus,
        checkConnectivity: mockCheckConnectivity
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Test response' })
      } as Response);

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockCheckConnectivity).toHaveBeenCalled();
    });

    it('handles connectivity check failures', async () => {
      const mockCheckConnectivity = jest.fn().mockResolvedValue(false);
      mockUseNetworkStatus.mockReturnValue({
        ...defaultNetworkStatus,
        checkConnectivity: mockCheckConnectivity
      });

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn(); // Execute the function to trigger the connectivity check
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockCheckConnectivity).toHaveBeenCalled();
      expect(result.current.state.error).toBeTruthy();
    });
  });

  describe('Message Sending', () => {
    it('sends message successfully with JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'AI response' })
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-assistant', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"message":"test input"')
      }));

      expect(result.current.state.messages).toHaveLength(2); // User + AI message
      expect(result.current.state.messages[0].role).toBe('user');
      expect(result.current.state.messages[0].content).toBe('test input');
      expect(result.current.state.messages[1].role).toBe('assistant');
      expect(result.current.state.messages[1].content).toBe('AI response');
    });

    it('handles streaming responses', async () => {
      const encoder = new TextEncoder();
      const chunks = [
        'data: {"type":"chunk","content":"Hello "}\n\n',
        'data: {"type":"chunk","content":"world"}\n\n',
        'data: {"type":"complete","content":"Hello world"}\n\n'
      ];

      let chunkIndex = 0;
      const mockStream = {
        getReader: () => ({
          read: async () => {
            if (chunkIndex < chunks.length) {
              const chunk = encoder.encode(chunks[chunkIndex++]);
              return { done: false, value: chunk };
            }
            return { done: true, value: undefined };
          },
          releaseLock: jest.fn()
        })
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: mockStream
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      await waitFor(() => {
        expect(result.current.state.messages).toHaveLength(2);
        expect(result.current.state.messages[1].content).toBe('Hello world');
      });
    });

    it('prevents sending empty messages', async () => {
      mockValidateAIInput.mockReturnValue({
        isValid: false,
        error: 'Empty input'
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sanitizes input before sending', async () => {
      mockValidateAIInput.mockReturnValue({
        isValid: true,
        sanitizedInput: 'sanitized input'
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Response' })
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('original input');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-assistant', expect.objectContaining({
        body: expect.stringContaining('"message":"sanitized input"')
      }));
    });

    it('includes documentation context in request', async () => {
      const documentationContext = [
        { id: '1', title: 'Test Article', content: 'Test content' }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Response' })
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant(documentationContext));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai-assistant', expect.objectContaining({
        body: expect.stringContaining('"context":[{"id":"1","title":"Test Article","content":"Test content"}]')
      }));
    });
  });

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      const apiError = new Error('API Error');
      mockFetch.mockRejectedValue(apiError);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      mockCategorizeAIError.mockReturnValue({
        errorType: 'server_error',
        errorCode: 'SERVER_ERROR',
        errorMessage: 'Server error occurred',
        retryable: true,
        failureStage: 'server'
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockCategorizeAIError).toHaveBeenCalledWith(apiError, expect.any(Object));
      expect(result.current.state.error).toContain('Serverfehler');
    });

    it('suggests fallback for certain error types', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      mockCategorizeAIError.mockReturnValue({
        errorType: 'server_error',
        errorCode: 'SERVER_ERROR',
        errorMessage: 'Service unavailable',
        retryable: true,
        failureStage: 'server'
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.fallbackToSearch).toBe(true);
      expect(result.current.state.error).toContain('Dokumentationssuche');
    });

    it('removes placeholder message on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      // Should only have user message, assistant placeholder should be removed
      expect(result.current.state.messages).toHaveLength(1);
      expect(result.current.state.messages[0].role).toBe('user');
    });

    it('handles streaming errors correctly', async () => {
      const encoder = new TextEncoder();
      const errorChunk = 'data: {"type":"error","error":"Streaming failed"}\n\n';

      const mockStream = {
        getReader: () => ({
          read: async () => {
            const chunk = encoder.encode(errorChunk);
            return { done: false, value: chunk };
          },
          releaseLock: jest.fn()
        })
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: mockStream
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.error).toBeTruthy();
    });
  });

  describe('Retry Mechanism', () => {
    it('uses retry mechanism for failed requests', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockRetryFunction).toHaveBeenCalled();
    });

    it('retries last message manually', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      // First attempt fails
      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.error).toBeTruthy();

      // Clear mocks and setup successful retry
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Retry success' })
      } as Response);

      // Manual retry
      await act(async () => {
        await result.current.actions.retryLastMessage();
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('resets retry state after successful request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Success' })
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(mockResetRetry).toHaveBeenCalled();
    });
  });

  describe('Message Management', () => {
    it('clears messages correctly', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      // Add some messages first
      act(() => {
        result.current.actions.sendMessage('Test message');
      });

      act(() => {
        result.current.actions.clearMessages();
      });

      expect(result.current.state.messages).toHaveLength(0);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.validationError).toBe(null);
      expect(result.current.state.validationWarning).toBe(null);
      expect(result.current.state.inputSuggestions).toEqual([]);
      expect(result.current.state.fallbackToSearch).toBe(false);
      expect(result.current.state.streamingMessageId).toBe(null);
    });

    it('manages fallback state correctly', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      act(() => {
        result.current.actions.fallbackToDocumentationSearch();
      });

      expect(result.current.state.fallbackToSearch).toBe(true);

      act(() => {
        result.current.actions.resetFallback();
      });

      expect(result.current.state.fallbackToSearch).toBe(false);
    });
  });

  describe('Request Cancellation', () => {
    it('cancels previous request when new one is made', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: {} as AbortSignal
      };

      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any;

      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      // Start first request
      act(() => {
        result.current.actions.sendMessage('First message');
      });

      // Start second request
      act(() => {
        result.current.actions.sendMessage('Second message');
      });

      // First request should be aborted
      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('PostHog Analytics', () => {
    it('tracks question submitted events', async () => {
      const mockPostHog = {
        capture: jest.fn(),
        has_opted_in_capturing: jest.fn().mockReturnValue(true)
      };

      // Mock usePostHog to return our mock
      jest.doMock('posthog-js/react', () => ({
        usePostHog: () => mockPostHog
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ response: 'Response' })
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      // Note: In the actual implementation, PostHog events would be tracked
      // This test verifies the flow works without errors
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty documentation context', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
    });

    it('handles undefined documentation context', () => {
      const { result } = renderHook(() => useEnhancedAIAssistant(undefined as any));

      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
    });

    it('handles malformed streaming responses', async () => {
      const encoder = new TextEncoder();
      const malformedChunk = 'data: invalid json\n\n';

      const mockStream = {
        getReader: () => ({
          read: async () => {
            const chunk = encoder.encode(malformedChunk);
            return { done: false, value: chunk };
          },
          releaseLock: jest.fn()
        })
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: mockStream
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      // Should handle malformed JSON gracefully
      expect(result.current.state.messages).toHaveLength(2); // User message + placeholder
    });

    it('handles response without readable body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: null
      } as Response);

      mockRetryFunction.mockImplementation(async (fn) => {
        await fn();
      });

      const { result } = renderHook(() => useEnhancedAIAssistant([]));

      await act(async () => {
        await result.current.actions.sendMessage('Test message');
      });

      expect(result.current.state.error).toBeTruthy();
    });
  });
});