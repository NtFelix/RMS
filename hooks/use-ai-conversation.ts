import { useState, useCallback, useRef } from 'react';
import { useAIAssistantStore, type ChatMessage } from '@/hooks/use-ai-assistant-store';
import {
  startAIGeneration,
  completeAIGeneration,
  startAITrace,
  completeAITrace,
  trackStreamingUpdate,
  type LLMGeneration,
  type LLMTrace
} from '@/lib/posthog-llm-tracking';

interface AIConversationOptions {
  documentationContext?: any;
  onFallbackToSearch?: () => void;
  interface?: 'modal' | 'simple';
}

interface AIConversationReturn {
  inputValue: string;
  isLoading: boolean;
  error: string | null;
  messages: ChatMessage[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearMessages: () => void;
  formatTime: (date: Date) => string;
}

/**
 * Custom hook that extracts the common AI conversation logic
 * Used by both AIAssistantModal and AIAssistantInterfaceSimple
 */
export function useAIConversation(options: AIConversationOptions = {}): AIConversationReturn {
  const { documentationContext, onFallbackToSearch, interface: interfaceType = 'modal' } = options;

  // Local state for the interface
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Assistant store
  const {
    messages,
    addMessage,
    updateMessage,
    clearMessages: storeClearMessages,
    setLoading: setStoreLoading,
    setError: setStoreError
  } = useAIAssistantStore();

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Clear messages with cleanup
  const clearMessages = useCallback(() => {
    storeClearMessages();
    setInputValue('');
    setError(null);
  }, [storeClearMessages]);

  // Send message to AI
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const message = inputValue.trim();
    if (!message || isLoading) return;

    // Generate IDs for tracking
    const sessionId = `session_${Date.now()}`;
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    setStoreLoading(true);
    setError(null);
    setStoreError(null);

    // Create assistant message placeholder for streaming
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    addMessage(assistantMessage);

    // Start LLM tracking
    let trace: LLMTrace | null = null;
    let generation: LLMGeneration | null = null;

    try {
      // Start trace for the conversation
      trace = startAITrace({
        id: traceId,
        span_name: 'mietevo_ai_conversation',
        input_state: {
          user_message: message,
          context_articles: documentationContext?.articles?.length || 0,
          context_categories: documentationContext?.categories?.length || 0,
          interface: interfaceType,
          has_documentation_context: !!(documentationContext?.articles?.length),
          message_length: message.length
        },
        sessionId
      });

      // Start generation for the AI response
      generation = startAIGeneration({
        id: generationId,
        model: 'gemini-2.5-flash-lite',
        provider: 'google',
        input: [{ role: 'user', content: message }],
        sessionId,
        traceId
      });

      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) {
        console.error("NEXT_PUBLIC_WORKER_URL environment variable is not defined");
        throw new Error("AI Service configuration error: missing backend URL");
      }

      // Ensure we target the /ai endpoint
      const targetUrl = workerUrl.endsWith('/ai')
        ? workerUrl
        : `${workerUrl.replace(/\/$/, '')}/ai`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: documentationContext,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last line in the buffer as it might be incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                if (jsonStr.trim() === '') continue;

                const data = JSON.parse(jsonStr);

                if (data.type === 'chunk' && data.content) {
                  fullResponse += data.content;
                  // Update the assistant message with accumulated content
                  updateMessage(assistantMessageId, fullResponse);

                  // Track streaming update
                  if (generation) {
                    trackStreamingUpdate({
                      generationId: generation.id,
                      chunkContent: data.content,
                      chunkIndex: chunkCount++,
                      sessionId
                    });
                  }
                } else if (data.type === 'complete') {
                  fullResponse = data.content || fullResponse;
                  // Final update
                  updateMessage(assistantMessageId, fullResponse || 'Entschuldigung, ich konnte keine Antwort generieren.');

                  // Complete LLM tracking
                  if (generation) {
                    const responseTime = Date.now() - Date.parse(generation.start_time);
                    completeAIGeneration(generation, {
                      output: [{ role: 'assistant', content: fullResponse }],
                      status: 'success',
                      latency: responseTime / 1000, // Convert to seconds
                      usage: {
                        input_tokens: Math.ceil(message.length / 4), // Rough estimate
                        output_tokens: Math.ceil(fullResponse.length / 4),
                        total_tokens: Math.ceil((message.length + fullResponse.length) / 4)
                      },
                      httpStatus: 200
                    });
                  }

                  if (trace) {
                    const traceTime = Date.now() - Date.parse(trace.start_time);
                    completeAITrace(trace, {
                      output_state: {
                        assistant_response: fullResponse,
                        response_length: fullResponse.length,
                        chunks_received: chunkCount,
                        success: true
                      },
                      latency: traceTime / 1000,
                      status: 'success'
                    });
                  }

                  break;
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Unbekannter Fehler beim Streaming');
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line, parseError);
              }
            }
          }
        }
      } else {
        throw new Error('Response body is not readable');
      }

    } catch (error) {
      console.error('AI Assistant Error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.';
      setError(errorMessage);
      setStoreError(errorMessage);

      // Update the assistant message with error
      updateMessage(assistantMessageId, 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.');

      // Complete LLM tracking with error
      if (generation) {
        const responseTime = Date.now() - Date.parse(generation.start_time);
        completeAIGeneration(generation, {
          output: [{ role: 'assistant', content: errorMessage }],
          status: 'error',
          error: errorMessage,
          latency: responseTime / 1000,
          httpStatus: 500
        });
      }

      if (trace) {
        const traceTime = Date.now() - Date.parse(trace.start_time);
        completeAITrace(trace, {
          output_state: {
            error: errorMessage,
            error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
            success: false
          },
          latency: traceTime / 1000,
          status: 'error',
          error: errorMessage
        });
      }
    } finally {
      setIsLoading(false);
      setStoreLoading(false);
    }
  }, [
    inputValue,
    isLoading,
    documentationContext,
    interfaceType,
    addMessage,
    updateMessage,
    setStoreLoading,
    setStoreError
  ]);

  // Format time helper
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return {
    inputValue,
    isLoading,
    error,
    messages,
    handleInputChange,
    handleSubmit,
    clearMessages,
    formatTime
  };
}