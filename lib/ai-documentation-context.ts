/**
 * Error tracking utilities for AI assistant
 */

export interface AIErrorDetails {
  errorType: string;
  errorCode: string;
  errorMessage: string;
  httpStatus?: number;
  retryable: boolean;
  failureStage: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Categorizes errors for consistent tracking across client and server
 */
export function categorizeAIError(error: Error | string, context?: any): AIErrorDetails {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();
  
  // Network errors
  if (errorLower.includes('network') || errorLower.includes('fetch') || 
      errorLower.includes('econnreset') || errorLower.includes('etimedout')) {
    return {
      errorType: 'network_error',
      errorCode: 'NETWORK_ERROR',
      errorMessage: errorMessage,
      httpStatus: 0,
      retryable: true,
      failureStage: 'network',
      ...context
    };
  }
  
  // Rate limiting
  if (errorLower.includes('rate limit') || errorLower.includes('quota') || 
      errorLower.includes('429') || errorMessage.includes('429')) {
    return {
      errorType: 'rate_limit',
      errorCode: 'RATE_LIMIT',
      errorMessage: errorMessage,
      httpStatus: 429,
      retryable: true,
      failureStage: 'api_limit',
      ...context
    };
  }
  
  // Authentication errors
  if (errorLower.includes('api key') || errorLower.includes('authentication') || 
      errorLower.includes('unauthorized') || errorLower.includes('401')) {
    return {
      errorType: 'authentication_error',
      errorCode: 'AUTHENTICATION_ERROR',
      errorMessage: errorMessage,
      httpStatus: 401,
      retryable: false,
      failureStage: 'authentication',
      ...context
    };
  }
  
  // Inference errors
  if (errorLower.includes('inference failed')) {
    return {
      errorType: 'inference_error',
      errorCode: 'INFERENCE_ERROR',
      errorMessage: errorMessage,
      httpStatus: 500,
      retryable: true,
      failureStage: 'inference',
      ...context
    };
  }
  
  // Server errors
  if (
    (typeof error !== 'string' && (error as any).status === 500) ||
    errorLower.includes('internal server') || 
    errorLower.includes('server error')
  ) {
    return {
      errorType: 'server_error',
      errorCode: 'SERVER_ERROR',
      errorMessage: errorMessage,
      httpStatus: 500,
      retryable: true,
      failureStage: 'server',
      ...context
    };
  }
  
  // Gemini API specific errors
  if (errorLower.includes('safety') || errorLower.includes('content policy')) {
    return {
      errorType: 'content_safety_error',
      errorCode: 'CONTENT_SAFETY_ERROR',
      errorMessage: errorMessage,
      httpStatus: 400,
      retryable: false,
      failureStage: 'content_filter',
      ...context
    };
  }
  
  // Model overloaded
  if (errorLower.includes('overloaded') || errorLower.includes('503')) {
    return {
      errorType: 'model_overloaded',
      errorCode: 'MODEL_OVERLOADED',
      errorMessage: errorMessage,
      httpStatus: 503,
      retryable: true,
      failureStage: 'model_capacity',
      ...context
    };
  }
  
  // Timeout errors
  if (errorLower.includes('timeout')) {
    return {
      errorType: 'timeout_error',
      errorCode: 'TIMEOUT_ERROR',
      errorMessage: errorMessage,
      httpStatus: 408,
      retryable: true,
      failureStage: 'timeout',
      ...context
    };
  }
  
  // Validation errors
  if (errorLower.includes('validation') || errorLower.includes('invalid request')) {
    return {
      errorType: 'validation_error',
      errorCode: 'VALIDATION_ERROR',
      errorMessage: errorMessage,
      httpStatus: 400,
      retryable: false,
      failureStage: 'validation',
      ...context
    };
  }
  
  // Generic API error
  return {
    errorType: 'api_error',
    errorCode: 'GEMINI_API_ERROR',
    errorMessage: errorMessage,
    httpStatus: 500,
    retryable: true,
    failureStage: 'api',
    ...context
  };
}

/**
 * Tracks AI request failures with PostHog (client-side)
 */
export function trackAIRequestFailure(
  posthog: any,
  errorDetails: AIErrorDetails,
  requestContext?: {
    sessionId?: string;
    responseTimeMs?: number;
    questionLength?: number;
    hasContext?: boolean;
    contextArticlesCount?: number;
    messageCount?: number;
  }
) {
  if (!posthog || !posthog.has_opted_in_capturing?.()) {
    return;
  }

  posthog.capture('ai_request_failed', {
    ...errorDetails,
    response_time_ms: requestContext?.responseTimeMs || 0,
    session_id: requestContext?.sessionId || errorDetails.sessionId,
    question_length: requestContext?.questionLength || 0,
    has_context: requestContext?.hasContext || false,
    context_articles_count: requestContext?.contextArticlesCount || 0,
    message_count: requestContext?.messageCount || 0,
    timestamp: new Date().toISOString(),
    ...errorDetails.additionalData
  });
}
