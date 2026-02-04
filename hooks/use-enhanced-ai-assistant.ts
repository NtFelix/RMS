import { useState, useCallback, useRef, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useNetworkStatus } from './use-network-status';
import { useRetry } from './use-retry';
import { useAICacheClient, useAICacheWarming } from './use-ai-cache-client';
import { validateAIInput, validateAIContext, sanitizeInput, getInputSuggestions } from '@/lib/ai-input-validation';
import { categorizeAIError, trackAIRequestFailure, type AIErrorDetails } from '@/lib/ai-documentation-context';
import { createAIPerformanceMonitor, type AIPerformanceMetrics } from '@/lib/ai-performance-monitor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isRetry?: boolean;
  validationWarning?: string;
}

export interface AIAssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  streamingMessageId: string | null;
  sessionId: string | null;
  sessionStartTime: Date | null;
  validationError: string | null;
  validationWarning: string | null;
  inputSuggestions: string[];
  fallbackToSearch: boolean;
}

export interface UseEnhancedAIAssistantReturn {
  state: AIAssistantState;
  actions: {
    sendMessage: (message: string) => Promise<void>;
    retryLastMessage: () => Promise<void>;
    clearMessages: () => void;
    setInputValue: (value: string) => void;
    validateInput: (input: string) => boolean;
    fallbackToDocumentationSearch: () => void;
    resetFallback: () => void;
  };
  networkStatus: ReturnType<typeof useNetworkStatus>;
  retryState: ReturnType<typeof useRetry>['state'];
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Enhanced AI Assistant hook with comprehensive error handling
 * Includes network detection, retry mechanisms, input validation, and fallback options
 */
export function useEnhancedAIAssistant(
  documentationContext: any[] = []
): UseEnhancedAIAssistantReturn {
  const [state, setState] = useState<AIAssistantState>({
    messages: [],
    isLoading: false,
    error: null,
    inputValue: '',
    streamingMessageId: null,
    sessionId: null,
    sessionStartTime: null,
    validationError: null,
    validationWarning: null,
    inputSuggestions: [],
    fallbackToSearch: false
  });

  const posthog = usePostHog();
  const networkStatus = useNetworkStatus();
  const { retry, state: retryState, reset: resetRetry } = useRetry();
  const { cacheResponse, getCachedResponse, hasCachedResponse, stats: cacheStats } = useAICacheClient();
  const { preloadFrequentQueries } = useAICacheWarming();

  // Performance monitoring
  const performanceMonitor = useRef(createAIPerformanceMonitor(posthog));

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const contextHashRef = useRef<string>('');

  // Initialize session when component mounts
  useEffect(() => {
    if (!state.sessionId) {
      setState(prev => ({
        ...prev,
        sessionId: generateSessionId(),
        sessionStartTime: new Date()
      }));
    }
  }, [state.sessionId]);

  // Preload frequent queries when documentation context changes
  useEffect(() => {
    if (documentationContext.length > 0 && networkStatus.isOnline) {
      const contextHash = generateContextHash(documentationContext);

      // Preload common queries in the background
      preloadFrequentQueries(contextHash, async (query: string) => {
        try {
          const response = await fetch('/api/ai-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: query,
              context: documentationContext,
              sessionId: state.sessionId || generateSessionId()
            })
          });

          if (response.ok) {
            const data = await response.json();
            return data.response || '';
          }
          throw new Error('Failed to preload query');
        } catch (error) {
          console.warn('Failed to preload query:', query, error);
          throw error;
        }
      }).catch(error => {
        console.warn('Cache warming failed:', error);
      });
    }
  }, [documentationContext, networkStatus.isOnline, preloadFrequentQueries, state.sessionId]);

  // Monitor network status and handle reconnection
  useEffect(() => {
    if (networkStatus.isOnline && state.error && state.error.includes('Netzwerk')) {
      // Clear network-related errors when coming back online
      setState(prev => ({
        ...prev,
        error: null,
        fallbackToSearch: false
      }));
    }
  }, [networkStatus.isOnline, state.error]);

  // Input validation with real-time feedback
  const validateInput = useCallback((input: string): boolean => {
    const validation = validateAIInput(input, {
      minLength: 1,
      maxLength: 2000,
      sanitizeInput: true,
      checkForSpam: true
    });

    const contextValidation = validateAIContext(input);

    setState(prev => ({
      ...prev,
      validationError: validation.isValid ? (contextValidation.isValid ? null : contextValidation.error!) : validation.error!,
      validationWarning: validation.warning || contextValidation.warning || null,
      inputSuggestions: validation.isValid ? [] : getInputSuggestions(input)
    }));

    return validation.isValid && contextValidation.isValid;
  }, []);

  // Update input value with validation
  const setInputValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, inputValue: value }));

    // Validate input in real-time for better UX
    if (value.trim().length > 0) {
      validateInput(value);
    } else {
      setState(prev => ({
        ...prev,
        validationError: null,
        validationWarning: null,
        inputSuggestions: getInputSuggestions('')
      }));
    }
  }, [validateInput]);

  // Enhanced message sending with comprehensive error handling
  const sendMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Validate input
    if (!validateInput(trimmedMessage)) {
      return; // Validation errors are already set in state
    }

    // Check network connectivity
    if (networkStatus.isOffline) {
      setState(prev => ({
        ...prev,
        error: 'Keine Internetverbindung verfügbar. Bitte überprüfen Sie Ihre Netzwerkverbindung.',
        fallbackToSearch: true
      }));
      return;
    }

    // Sanitize input
    const sanitizedMessage = sanitizeInput(trimmedMessage);
    lastUserMessageRef.current = sanitizedMessage;

    const requestStartTime = Date.now();
    const sessionId = state.sessionId || generateSessionId();

    // Generate context hash for caching
    const contextHash = generateContextHash(documentationContext);
    contextHashRef.current = contextHash;

    // Start performance tracking
    performanceMonitor.current.startRequest(sessionId, {
      message: sanitizedMessage,
      contextSize: JSON.stringify(documentationContext).length,
      cacheHit: false
    });

    // Check for cached response first
    const cachedResponse = getCachedResponse(sanitizedMessage, contextHash);
    if (cachedResponse) {
      console.log('Using cached AI response');

      // Update performance tracking for cache hit
      performanceMonitor.current.completeRequest(sessionId, true);

      // Track cache hit
      if (posthog && posthog.has_opted_in_capturing?.()) {
        posthog.capture('ai_response_cache_hit', {
          session_id: sessionId,
          question_length: sanitizedMessage.length,
          context_hash: contextHash,
          cache_stats: cacheStats,
          timestamp: new Date().toISOString()
        });
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date(),
        validationWarning: state.validationWarning || undefined
      };

      // Add cached assistant message
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: cachedResponse,
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        inputValue: '',
        error: null,
        validationError: null,
        validationWarning: null,
        inputSuggestions: [],
        fallbackToSearch: false
      }));

      return;
    }

    // Track question submitted event
    if (posthog && posthog.has_opted_in_capturing?.()) {
      posthog.capture('ai_question_submitted', {
        question_length: sanitizedMessage.length,
        session_id: sessionId,
        has_context: documentationContext.length > 0,
        message_count: state.messages.length + 1,
        is_retry: false,
        network_type: networkStatus.connectionType,
        timestamp: new Date().toISOString()
      });
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date(),
      validationWarning: state.validationWarning || undefined
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputValue: '',
      isLoading: true,
      error: null,
      validationError: null,
      validationWarning: null,
      inputSuggestions: [],
      fallbackToSearch: false
    }));

    // Create placeholder assistant message for streaming
    const assistantMessageId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      streamingMessageId: assistantMessageId
    }));

    try {
      // Use retry mechanism for the AI request
      await retry(async () => {
        // Cancel previous request if it exists
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new AbortController
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Check connectivity before making request
        const isConnected = await networkStatus.checkConnectivity();
        if (!isConnected) {
          throw new Error('Network connectivity check failed');
        }

        const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
        if (!workerUrl) {
          console.error("NEXT_PUBLIC_WORKER_URL environment variable is not defined");
          throw new Error("AI Service configuration error: missing backend URL");
        }

        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: sanitizedMessage,
            context: documentationContext,
            sessionId: sessionId
          }),
          signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          throw error;
        }

        // Handle streaming response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/event-stream')) {
          performanceMonitor.current.trackStreamingStart(sessionId);
          await handleStreamingResponse(response, assistantMessageId, sessionId, requestStartTime, sanitizedMessage);
        } else {
          // Fallback to regular JSON response
          const data = await response.json();
          updateAssistantMessage(assistantMessageId, data.response || 'Entschuldigung, ich konnte keine Antwort generieren.');

          // Complete performance tracking
          performanceMonitor.current.completeRequest(sessionId, true);

          // Track successful response
          if (posthog && posthog.has_opted_in_capturing?.()) {
            const responseTime = Date.now() - requestStartTime;
            posthog.capture('ai_response_received', {
              response_time_ms: responseTime,
              session_id: sessionId,
              success: true,
              response_type: 'json',
              timestamp: new Date().toISOString()
            });
          }
        }
      }, {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryCondition: (error: Error) => {
          const errorDetails = categorizeAIError(error);
          return errorDetails.retryable;
        }
      });

    } catch (error) {
      console.error('AI Assistant Error:', error);

      // Categorize error for proper handling
      const errorDetails = categorizeAIError(error instanceof Error ? error : String(error), {
        sessionId: sessionId,
        failureStage: 'client_request'
      });

      // Track error in performance monitor
      performanceMonitor.current.trackError(sessionId, {
        type: errorDetails.errorType,
        message: errorDetails.errorMessage,
        retryable: errorDetails.retryable
      });

      // Complete performance tracking with error
      performanceMonitor.current.completeRequest(sessionId, false);

      // Get user-friendly error message in German
      let errorMessage = getGermanErrorMessage(errorDetails);
      let shouldFallback = false;

      // Determine if we should suggest fallback to documentation search
      if (errorDetails.errorType === 'network_error' ||
        errorDetails.errorType === 'timeout_error' ||
        errorDetails.errorType === 'server_error' ||
        errorDetails.errorType === 'model_overloaded') {
        shouldFallback = true;
        errorMessage += ' Sie können stattdessen die normale Dokumentationssuche verwenden.';
      }

      // Track failed response
      if (posthog && posthog.has_opted_in_capturing?.()) {
        const responseTime = Date.now() - requestStartTime;

        trackAIRequestFailure(posthog, errorDetails, {
          sessionId: sessionId,
          responseTimeMs: responseTime,
          questionLength: sanitizedMessage.length,
          hasContext: documentationContext.length > 0,
          contextArticlesCount: documentationContext.length,
          messageCount: state.messages.length + 1
        });
      }

      // Remove the placeholder assistant message and show error
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== assistantMessageId),
        error: errorMessage,
        fallbackToSearch: shouldFallback
      }));

    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        streamingMessageId: null
      }));
      resetRetry();
    }
  }, [
    validateInput,
    networkStatus,
    state.sessionId,
    state.messages.length,
    state.validationWarning,
    documentationContext,
    posthog,
    retry,
    resetRetry
  ]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      const sessionId = state.sessionId || generateSessionId();
      performanceMonitor.current.trackRetry(sessionId, (retryState.attemptCount || 0) + 1);
      setState(prev => ({ ...prev, error: null }));
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage, state.sessionId, retryState.attemptCount]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
      validationError: null,
      validationWarning: null,
      inputSuggestions: [],
      fallbackToSearch: false,
      streamingMessageId: null
    }));
    resetRetry();
  }, [resetRetry]);

  // Fallback to documentation search
  const fallbackToDocumentationSearch = useCallback(() => {
    setState(prev => ({ ...prev, fallbackToSearch: true }));
  }, []);

  // Reset fallback state
  const resetFallback = useCallback(() => {
    setState(prev => ({ ...prev, fallbackToSearch: false }));
  }, []);

  // Helper function to update assistant message
  const updateAssistantMessage = useCallback((messageId: string, content: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, content }
          : msg
      )
    }));
  }, []);

  // Helper function to append to assistant message
  const appendToAssistantMessage = useCallback((messageId: string, chunk: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, content: msg.content + chunk }
          : msg
      )
    }));
  }, []);

  // Handle streaming response
  const handleStreamingResponse = useCallback(async (
    response: Response,
    messageId: string,
    sessionId: string,
    requestStartTime: number,
    sanitizedMessage: string
  ) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let hasReceivedContent = false;
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (!hasReceivedContent) {
            updateAssistantMessage(messageId, 'Entschuldigung, ich konnte keine Antwort generieren.');
          }
          break;
        }

        // Decode and process chunks
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);

            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'chunk' && data.content) {
                if (!hasReceivedContent) {
                  performanceMonitor.current.trackFirstChunk(sessionId);
                  hasReceivedContent = true;
                }
                performanceMonitor.current.trackChunk(sessionId, data.content.length);
                appendToAssistantMessage(messageId, data.content);
              } else if (data.type === 'complete') {
                if (data.content) {
                  updateAssistantMessage(messageId, data.content);
                  hasReceivedContent = true;
                }

                // Cache the response
                if (data.content) {
                  cacheResponse(sanitizedMessage, data.content, contextHashRef.current);
                }

                // Complete performance tracking
                performanceMonitor.current.completeRequest(sessionId, true);

                // Track successful streaming response
                if (posthog && posthog.has_opted_in_capturing?.()) {
                  const responseTime = Date.now() - requestStartTime;
                  posthog.capture('ai_response_received', {
                    response_time_ms: responseTime,
                    session_id: sessionId,
                    success: true,
                    response_type: 'streaming',
                    cached: false,
                    context_hash: contextHashRef.current,
                    cache_stats: cacheStats,
                    timestamp: new Date().toISOString()
                  });
                }
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error occurred');
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', dataStr, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, [updateAssistantMessage, appendToAssistantMessage, posthog]);

  return {
    state,
    actions: {
      sendMessage,
      retryLastMessage,
      clearMessages,
      setInputValue,
      validateInput,
      fallbackToDocumentationSearch,
      resetFallback
    },
    networkStatus,
    retryState
  };
}

/**
 * Generate context hash for caching
 */
function generateContextHash(documentationContext: any[]): string {
  if (!documentationContext || documentationContext.length === 0) {
    return 'no-context';
  }

  const contextString = JSON.stringify({
    articleIds: documentationContext.map(article => article.id || article.titel).sort(),
    count: documentationContext.length
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < contextString.length; i++) {
    const char = contextString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get user-friendly German error messages based on error type
 */
function getGermanErrorMessage(errorDetails: AIErrorDetails): string {
  switch (errorDetails.errorType) {
    case 'network_error':
      return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
    case 'rate_limit':
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
    case 'server_error':
      return 'Serverfehler. Bitte versuchen Sie es später erneut.';
    case 'authentication_error':
      return 'Authentifizierungsfehler. Der Service ist momentan nicht verfügbar.';
    case 'content_safety_error':
      return 'Ihre Anfrage konnte aufgrund von Inhaltsrichtlinien nicht verarbeitet werden.';
    case 'model_overloaded':
      return 'Der AI-Service ist überlastet. Bitte versuchen Sie es in wenigen Minuten erneut.';
    case 'timeout_error':
      return 'Die Anfrage ist abgelaufen. Bitte versuchen Sie es erneut.';
    case 'validation_error':
      return 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingabe.';
    case 'streaming_timeout':
      return 'Zeitüberschreitung beim Empfangen der Antwort. Bitte versuchen Sie es erneut.';
    case 'streaming_network_error':
      return 'Netzwerkfehler beim Empfangen der Antwort. Bitte überprüfen Sie Ihre Verbindung.';
    case 'streaming_aborted':
      return 'Die Anfrage wurde abgebrochen.';
    default:
      return errorDetails.errorMessage || 'Ein unerwarteter Fehler ist aufgetreten.';
  }
}