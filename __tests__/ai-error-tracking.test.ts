import { categorizeAIError, trackAIRequestFailure, type AIErrorDetails } from '@/lib/ai-documentation-context';

// Mock PostHog
const mockPostHog = {
  has_opted_in_capturing: jest.fn(() => true),
  capture: jest.fn()
};

describe('AI Error Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('categorizeAIError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const result = categorizeAIError(networkError);
      
      expect(result.errorType).toBe('network_error');
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('network');
    });

    it('should categorize rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded - quota exhausted');
      const result = categorizeAIError(rateLimitError);
      
      expect(result.errorType).toBe('rate_limit');
      expect(result.errorCode).toBe('RATE_LIMIT');
      expect(result.httpStatus).toBe(429);
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('api_limit');
    });

    it('should categorize authentication errors correctly', () => {
      const authError = new Error('Invalid API key provided');
      const result = categorizeAIError(authError);
      
      expect(result.errorType).toBe('authentication_error');
      expect(result.errorCode).toBe('AUTHENTICATION_ERROR');
      expect(result.httpStatus).toBe(401);
      expect(result.retryable).toBe(false);
      expect(result.failureStage).toBe('authentication');
    });

    it('should categorize server errors correctly', () => {
      const serverError = new Error('Internal server error occurred');
      const result = categorizeAIError(serverError);
      
      expect(result.errorType).toBe('server_error');
      expect(result.errorCode).toBe('SERVER_ERROR');
      expect(result.httpStatus).toBe(500);
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('server');
    });

    it('should categorize content safety errors correctly', () => {
      const safetyError = new Error('Content violates safety guidelines');
      const result = categorizeAIError(safetyError);
      
      expect(result.errorType).toBe('content_safety_error');
      expect(result.errorCode).toBe('CONTENT_SAFETY_ERROR');
      expect(result.httpStatus).toBe(400);
      expect(result.retryable).toBe(false);
      expect(result.failureStage).toBe('content_filter');
    });

    it('should categorize model overloaded errors correctly', () => {
      const overloadedError = new Error('Model is currently overloaded');
      const result = categorizeAIError(overloadedError);
      
      expect(result.errorType).toBe('model_overloaded');
      expect(result.errorCode).toBe('MODEL_OVERLOADED');
      expect(result.httpStatus).toBe(503);
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('model_capacity');
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout after 30 seconds');
      const result = categorizeAIError(timeoutError);
      
      expect(result.errorType).toBe('timeout_error');
      expect(result.errorCode).toBe('TIMEOUT_ERROR');
      expect(result.httpStatus).toBe(408);
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('timeout');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid request format provided');
      const result = categorizeAIError(validationError);
      
      expect(result.errorType).toBe('validation_error');
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.httpStatus).toBe(400);
      expect(result.retryable).toBe(false);
      expect(result.failureStage).toBe('validation');
    });

    it('should handle generic API errors', () => {
      const genericError = new Error('Something went wrong');
      const result = categorizeAIError(genericError);
      
      expect(result.errorType).toBe('api_error');
      expect(result.errorCode).toBe('GEMINI_API_ERROR');
      expect(result.httpStatus).toBe(500);
      expect(result.retryable).toBe(true);
      expect(result.failureStage).toBe('api');
    });

    it('should handle string errors', () => {
      const stringError = 'Network connection failed';
      const result = categorizeAIError(stringError);
      
      expect(result.errorType).toBe('network_error');
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should include additional context', () => {
      const error = new Error('Test error');
      const context = {
        sessionId: 'test-session-123',
        failureStage: 'custom_stage',
        additionalData: { customField: 'customValue' }
      };
      
      const result = categorizeAIError(error, context);
      
      expect(result.sessionId).toBe('test-session-123');
      expect(result.failureStage).toBe('custom_stage');
      expect(result.additionalData).toEqual({ customField: 'customValue' });
    });
  });

  describe('trackAIRequestFailure', () => {
    it('should track AI request failure with PostHog', () => {
      const errorDetails: AIErrorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Failed to fetch',
        httpStatus: 0,
        retryable: true,
        failureStage: 'network',
        sessionId: 'test-session'
      };

      const requestContext = {
        sessionId: 'test-session-123',
        responseTimeMs: 5000,
        questionLength: 50,
        hasContext: true,
        contextArticlesCount: 5,
        messageCount: 3
      };

      trackAIRequestFailure(mockPostHog, errorDetails, requestContext);

      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_failed', {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Failed to fetch',
        httpStatus: 0,
        retryable: true,
        failureStage: 'network',
        sessionId: 'test-session',
        response_time_ms: 5000,
        session_id: 'test-session-123',
        question_length: 50,
        has_context: true,
        context_articles_count: 5,
        message_count: 3,
        timestamp: expect.any(String)
      });
    });

    it('should not track if PostHog is not available', () => {
      const errorDetails: AIErrorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Failed to fetch',
        retryable: true,
        failureStage: 'network'
      };

      trackAIRequestFailure(null, errorDetails);

      expect(mockPostHog.capture).not.toHaveBeenCalled();
    });

    it('should not track if user has not opted in', () => {
      const mockPostHogNoOptIn = {
        has_opted_in_capturing: jest.fn(() => false),
        capture: jest.fn()
      };

      const errorDetails: AIErrorDetails = {
        errorType: 'network_error',
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Failed to fetch',
        retryable: true,
        failureStage: 'network'
      };

      trackAIRequestFailure(mockPostHogNoOptIn, errorDetails);

      expect(mockPostHogNoOptIn.capture).not.toHaveBeenCalled();
    });

    it('should include additional data from error details', () => {
      const errorDetails: AIErrorDetails = {
        errorType: 'streaming_error',
        errorCode: 'STREAMING_ERROR',
        errorMessage: 'Stream failed',
        retryable: true,
        failureStage: 'streaming',
        additionalData: {
          stream_duration_ms: 2000,
          chunks_received: 5,
          bytes_received: 1024
        }
      };

      trackAIRequestFailure(mockPostHog, errorDetails);

      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_failed', expect.objectContaining({
        stream_duration_ms: 2000,
        chunks_received: 5,
        bytes_received: 1024
      }));
    });
  });

  describe('Error categorization edge cases', () => {
    it('should handle HTTP status codes in error messages', () => {
      const errorWith429 = new Error('HTTP 429: Too Many Requests');
      const result = categorizeAIError(errorWith429);
      
      expect(result.errorType).toBe('rate_limit');
      expect(result.httpStatus).toBe(429);
    });

    it('should handle multiple error indicators', () => {
      const complexError = new Error('Network timeout: ETIMEDOUT after 30s');
      const result = categorizeAIError(complexError);
      
      // Should prioritize network error over timeout in this case
      expect(result.errorType).toBe('network_error');
      expect(result.errorCode).toBe('NETWORK_ERROR');
    });

    it('should handle case-insensitive error matching', () => {
      const upperCaseError = new Error('RATE LIMIT EXCEEDED');
      const result = categorizeAIError(upperCaseError);
      
      expect(result.errorType).toBe('rate_limit');
      expect(result.errorCode).toBe('RATE_LIMIT');
    });
  });
});