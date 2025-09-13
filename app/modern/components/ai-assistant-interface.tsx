"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { usePostHog } from 'posthog-js/react';
import { categorizeAIError, trackAIRequestFailure } from '@/lib/ai-documentation-context';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  documentationContext?: any[];
  className?: string;
}

interface AIAssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  streamingMessageId: string | null;
}

export default function AIAssistantInterface({
  isOpen,
  onClose,
  documentationContext = [],
  className
}: AIAssistantInterfaceProps) {
  const [state, setState] = useState<AIAssistantState>({
    messages: [],
    isLoading: false,
    error: null,
    inputValue: "",
    streamingMessageId: null
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const posthog = usePostHog();

  // Define handleClose function early so it can be used in useEffect dependencies
  const handleClose = useCallback(() => {
    // Track AI assistant closed event
    if (posthog && posthog.has_opted_in_capturing?.() && sessionStartTimeRef.current) {
      const sessionDuration = Date.now() - sessionStartTimeRef.current.getTime();
      posthog.capture('ai_assistant_closed', {
        session_duration_ms: sessionDuration,
        message_count: state.messages.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // Reset session start time
    sessionStartTimeRef.current = null;
    
    // Call the original onClose
    onClose();
  }, [posthog, state.messages.length, onClose]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Focus input when modal opens and track analytics
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Track AI assistant opened event
      if (posthog && posthog.has_opted_in_capturing?.()) {
        sessionStartTimeRef.current = new Date();
        posthog.capture('ai_assistant_opened', {
          source: 'documentation_search',
          timestamp: sessionStartTimeRef.current.toISOString(),
          has_documentation_context: documentationContext.length > 0
        });
      }

      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, posthog, documentationContext.length]);

  // Keyboard navigation and accessibility
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    // Escape key to close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }

    // Ctrl/Cmd + K to clear conversation
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      clearMessages();
      return;
    }

    // Ctrl/Cmd + R to retry last message
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && state.error) {
      e.preventDefault();
      handleRetry();
      return;
    }

    // Arrow up to scroll messages up
    if (e.key === 'ArrowUp' && e.altKey && scrollAreaRef.current) {
      e.preventDefault();
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollBy({ top: -100, behavior: 'smooth' });
      }
      return;
    }

    // Arrow down to scroll messages down
    if (e.key === 'ArrowDown' && e.altKey && scrollAreaRef.current) {
      e.preventDefault();
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollBy({ top: 100, behavior: 'smooth' });
      }
      return;
    }
  }, [isOpen, handleClose, state.error]);

  // Add keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleTabKey);
    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, state.messages.length]); // Re-run when messages change to update focusable elements

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const clearMessages = () => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
      streamingMessageId: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = state.inputValue.trim();
    if (!message || state.isLoading) return;

    const requestStartTime = Date.now();
    const sessionId = `session_${Date.now()}`;

    // Track question submitted event
    if (posthog && posthog.has_opted_in_capturing?.()) {
      posthog.capture('ai_question_submitted', {
        question_length: message.length,
        session_id: sessionId,
        has_context: documentationContext.length > 0,
        message_count: state.messages.length + 1, // +1 for the message being submitted
        timestamp: new Date().toISOString()
      });
    }

    // Add user message
    addMessage({
      role: 'user',
      content: message
    });

    // Clear input and set loading
    setState(prev => ({
      ...prev,
      inputValue: "",
      isLoading: true,
      error: null
    }));

    // Create a placeholder message for the assistant response that will be updated with streaming content
    const assistantMessageId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    // Add empty assistant message that will be updated with streaming content
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      streamingMessageId: assistantMessageId
    }));

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: documentationContext,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is streaming (SSE)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Add timeout for streaming responses
        const streamingTimeout = setTimeout(() => {
          throw new Error('Streaming response timeout');
        }, 30000); // 30 second timeout

        try {
          await handleStreamingResponse(response, assistantMessageId);
          
          // Track successful response
          if (posthog && posthog.has_opted_in_capturing?.()) {
            const responseTime = Date.now() - requestStartTime;
            posthog.capture('ai_response_received', {
              response_time_ms: responseTime,
              session_id: sessionId,
              success: true,
              response_type: 'streaming',
              timestamp: new Date().toISOString()
            });
          }
        } finally {
          clearTimeout(streamingTimeout);
        }
      } else {
        // Fallback to regular JSON response
        const data = await response.json();
        updateAssistantMessage(assistantMessageId, data.response || 'Entschuldigung, ich konnte keine Antwort generieren.');
        
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

    } catch (error) {
      console.error('AI Assistant Error:', error);
      
      // Use the new error categorization utility
      const errorDetails = categorizeAIError(error instanceof Error ? error : String(error), {
        sessionId: sessionId,
        failureStage: 'client_request'
      });
      
      // Get user-friendly error message in German
      let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
      
      switch (errorDetails.errorType) {
        case 'network_error':
          errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
          break;
        case 'rate_limit':
          errorMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
          break;
        case 'server_error':
          errorMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
          break;
        case 'authentication_error':
          errorMessage = 'Authentifizierungsfehler. Der Service ist momentan nicht verfügbar.';
          break;
        case 'content_safety_error':
          errorMessage = 'Ihre Anfrage konnte aufgrund von Inhaltsrichtlinien nicht verarbeitet werden.';
          break;
        case 'model_overloaded':
          errorMessage = 'Der AI-Service ist überlastet. Bitte versuchen Sie es in wenigen Minuten erneut.';
          break;
        case 'timeout_error':
          errorMessage = 'Die Anfrage ist abgelaufen. Bitte versuchen Sie es erneut.';
          break;
        case 'validation_error':
          errorMessage = 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingabe.';
          break;
        default:
          errorMessage = errorDetails.errorMessage || 'Ein unerwarteter Fehler ist aufgetreten.';
      }

      // Track failed response using the new utility
      if (posthog && posthog.has_opted_in_capturing?.()) {
        const responseTime = Date.now() - requestStartTime;
        
        trackAIRequestFailure(posthog, errorDetails, {
          sessionId: sessionId,
          responseTimeMs: responseTime,
          questionLength: message.length,
          hasContext: documentationContext.length > 0,
          contextArticlesCount: documentationContext.length,
          messageCount: state.messages.length + 1
        });

        // Also track the legacy event for backward compatibility
        posthog.capture('ai_response_received', {
          response_time_ms: responseTime,
          session_id: sessionId,
          success: false,
          error_type: errorDetails.errorType,
          error_message: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove the placeholder assistant message and show error
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== assistantMessageId)
      }));
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setState(prev => ({ ...prev, streamingMessageId: null }));
    }
  };

  const updateAssistantMessage = (messageId: string, content: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content }
          : msg
      )
    }));
  };

  const appendToAssistantMessage = (messageId: string, chunk: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: msg.content + chunk }
          : msg
      )
    }));
  };

  const handleStreamingResponse = async (response: Response, messageId: string) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const streamStartTime = Date.now();
    let hasReceivedContent = false;
    let chunksReceived = 0;
    let totalBytesReceived = 0;

    try {
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // If stream ended without receiving any content, show fallback message
          if (!hasReceivedContent) {
            updateAssistantMessage(messageId, 'Entschuldigung, ich konnte keine Antwort generieren.');
            
            // Track streaming failure - no content received
            if (posthog && posthog.has_opted_in_capturing?.()) {
              posthog.capture('ai_request_failed', {
                session_id: `session_${Date.now()}`,
                error_type: 'streaming_no_content',
                error_code: 'STREAMING_ERROR',
                error_message: 'Stream ended without receiving content',
                http_status: response.status,
                retryable: true,
                failure_stage: 'streaming_completion',
                stream_duration_ms: Date.now() - streamStartTime,
                chunks_received: chunksReceived,
                bytes_received: totalBytesReceived,
                timestamp: new Date().toISOString()
              });
            }
          }
          break;
        }

        // Track streaming progress
        if (value) {
          chunksReceived++;
          totalBytesReceived += value.length;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines and comments
          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }
          
          // Parse SSE data
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6); // Remove 'data: ' prefix
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'chunk' && data.content) {
                // Append chunk to the assistant message
                appendToAssistantMessage(messageId, data.content);
                hasReceivedContent = true;
              } else if (data.type === 'complete') {
                // Final response received, ensure message is complete
                if (data.content) {
                  updateAssistantMessage(messageId, data.content);
                  hasReceivedContent = true;
                }
                return; // Stream complete
              } else if (data.type === 'error') {
                // Handle streaming error from server
                const errorMessage = data.error || 'Streaming error occurred';
                
                // Track server-side streaming error
                if (posthog && posthog.has_opted_in_capturing?.()) {
                  posthog.capture('ai_request_failed', {
                    session_id: `session_${Date.now()}`,
                    error_type: 'streaming_server_error',
                    error_code: data.code || 'STREAMING_ERROR',
                    error_message: errorMessage,
                    http_status: response.status,
                    retryable: data.retryable !== false,
                    failure_stage: 'streaming_server',
                    stream_duration_ms: Date.now() - streamStartTime,
                    chunks_received: chunksReceived,
                    bytes_received: totalBytesReceived,
                    timestamp: new Date().toISOString()
                  });
                }
                
                throw new Error(errorMessage);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', dataStr, parseError);
              
              // Track parsing error but continue processing
              if (posthog && posthog.has_opted_in_capturing?.()) {
                posthog.capture('ai_request_failed', {
                  session_id: `session_${Date.now()}`,
                  error_type: 'streaming_parse_error',
                  error_code: 'STREAMING_PARSE_ERROR',
                  error_message: parseError instanceof Error ? parseError.message : 'Failed to parse SSE data',
                  http_status: response.status,
                  retryable: false,
                  failure_stage: 'streaming_parse',
                  stream_duration_ms: Date.now() - streamStartTime,
                  chunks_received: chunksReceived,
                  bytes_received: totalBytesReceived,
                  raw_data: dataStr.substring(0, 200), // First 200 chars for debugging
                  timestamp: new Date().toISOString()
                });
              }
              
              // Continue processing other chunks
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      
      // Categorize streaming error using the utility
      const errorDetails = categorizeAIError(streamError instanceof Error ? streamError : String(streamError), {
        sessionId: `session_${Date.now()}`,
        failureStage: 'streaming_client',
        additionalData: {
          stream_duration_ms: Date.now() - streamStartTime,
          chunks_received: chunksReceived,
          bytes_received: totalBytesReceived,
          had_content: hasReceivedContent,
          http_status: response.status
        }
      });
      
      // Override error type for streaming-specific errors
      if (streamError instanceof Error) {
        if (streamError.message.includes('timeout') || streamError.message.includes('ETIMEDOUT')) {
          errorDetails.errorType = 'streaming_timeout';
          errorDetails.errorCode = 'STREAMING_TIMEOUT';
        } else if (streamError.message.includes('network') || streamError.message.includes('ECONNRESET')) {
          errorDetails.errorType = 'streaming_network_error';
          errorDetails.errorCode = 'STREAMING_NETWORK_ERROR';
        } else if (streamError.message.includes('abort')) {
          errorDetails.errorType = 'streaming_aborted';
          errorDetails.errorCode = 'STREAMING_ABORTED';
          errorDetails.retryable = false;
        } else {
          errorDetails.errorType = 'streaming_error';
          errorDetails.errorCode = 'STREAMING_ERROR';
        }
      }
      
      // Track streaming error using the utility
      if (posthog && posthog.has_opted_in_capturing?.()) {
        trackAIRequestFailure(posthog, errorDetails);
      }
      
      // Update the message with an error indicator if no content was received
      const currentMessage = state.messages.find(msg => msg.id === messageId);
      if (!currentMessage?.content) {
        updateAssistantMessage(messageId, 'Fehler beim Empfangen der Antwort. Bitte versuchen Sie es erneut.');
      }
      
      throw streamError;
    } finally {
      reader.releaseLock();
    }
  };

  const handleRetry = () => {
    if (state.messages.length > 0) {
      const lastUserMessage = [...state.messages].reverse().find(msg => msg.role === 'user');
      if (lastUserMessage) {
        // Remove any incomplete assistant messages
        setState(prev => ({
          ...prev,
          inputValue: lastUserMessage.content,
          error: null,
          messages: prev.messages.filter(msg => 
            !(msg.role === 'assistant' && msg.content === '')
          )
        }));
        
        // Focus input after retry
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4",
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        ref={dialogRef}
        role="dialog" 
        aria-labelledby="ai-assistant-title"
        aria-describedby="ai-assistant-description"
        aria-modal="true"
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 id="ai-assistant-title" className="font-semibold text-foreground">Mietfluss AI Assistent</h2>
              <p id="ai-assistant-description" className="text-xs text-muted-foreground">
                Fragen Sie mich alles über Mietfluss
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Unterhaltung löschen (Strg+K)"
                title="Unterhaltung löschen (Strg+K)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="AI Assistent schließen (Escape)"
              title="AI Assistent schließen (Escape)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 p-4"
          aria-label="Unterhaltungsverlauf (Alt+Pfeiltasten zum Scrollen)"
        >
          <div className="space-y-4">
            {state.messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  Willkommen beim Mietfluss AI Assistenten
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Stellen Sie mir Fragen über Mietfluss-Funktionen, Immobilienverwaltung, 
                  Betriebskosten oder alles andere rund um die Anwendung.
                </p>
              </div>
            )}

            {state.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div 
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted border border-border"
                  )}
                  role="article"
                  aria-label={`${message.role === 'user' ? 'Ihre Nachricht' : 'AI Antwort'} um ${formatTime(message.timestamp)}`}
                >
                  {message.role === 'assistant' && message.content === '' ? (
                    // Show typing indicator for empty assistant messages (streaming in progress)
                    <div className="flex items-center gap-2">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm text-muted-foreground">
                        Schreibt...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap break-words flex-1">
                          {message.content}
                        </p>
                        {/* Show streaming indicator for assistant messages that are being updated */}
                        {message.role === 'assistant' && state.streamingMessageId === message.id && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" 
                                 title="Nachricht wird empfangen..." />
                          </div>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-2 opacity-70",
                        message.role === 'user' ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {formatTime(message.timestamp)}
                      </p>
                    </>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator - only show when loading and no assistant message is being streamed */}
            {state.isLoading && !state.messages.some(msg => msg.role === 'assistant' && msg.content === '') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">
                    Verbinde mit AI...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Display */}
        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4"
            >
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{state.error}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-2 h-auto p-1 text-destructive-foreground hover:bg-destructive/20"
                    aria-label="Erneut versuchen (Strg+R)"
                    title="Erneut versuchen (Strg+R)"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-muted/30">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={state.inputValue}
              onChange={(e) => setState(prev => ({ ...prev, inputValue: e.target.value }))}
              placeholder="Stellen Sie eine Frage über Mietfluss..."
              disabled={state.isLoading}
              className="flex-1"
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={!state.inputValue.trim() || state.isLoading}
              size="sm"
              className="px-3"
              aria-label="Nachricht senden"
            >
              {state.isLoading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <div className="text-xs text-muted-foreground mt-2 text-center space-y-1">
            <p>Drücken Sie Enter zum Senden • {state.inputValue.length}/500 Zeichen</p>
            <p className="text-xs opacity-75">
              Tastenkürzel: Escape (Schließen) • Strg+K (Löschen) • Alt+↑↓ (Scrollen)
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}