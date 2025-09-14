"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Send, User, AlertCircle, RotateCcw, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/hooks/use-modal-store";
import { useAIAssistantStore, type ChatMessage } from "@/hooks/use-ai-assistant-store";
import { startAIGeneration, completeAIGeneration, startAITrace, completeAITrace, trackStreamingUpdate, type LLMGeneration, type LLMTrace } from "@/lib/posthog-llm-tracking";

export function AIAssistantModal() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal store
  const {
    isAIAssistantModalOpen,
    aiAssistantModalData,
    closeAIAssistantModal,
  } = useModalStore();

  // Local state for the interface
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Assistant store
  const { 
    messages, 
    addMessage, 
    updateMessage,
    clearMessages,
    setLoading: setStoreLoading,
    setError: setStoreError
  } = useAIAssistantStore();

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    clearMessages();
    setInputValue('');
    setError(null);
    closeAIAssistantModal();
  }, [clearMessages, closeAIAssistantModal]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isAIAssistantModalOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAIAssistantModalOpen]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Send message to AI
  const handleSubmit = async (e: React.FormEvent) => {
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
        span_name: 'mietfluss_ai_conversation',
        input_state: {
          user_message: message,
          context_articles: aiAssistantModalData?.documentationContext?.articles?.length || 0,
          context_categories: aiAssistantModalData?.documentationContext?.categories?.length || 0,
          interface: 'modal',
          has_documentation_context: !!(aiAssistantModalData?.documentationContext?.articles?.length),
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

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: aiAssistantModalData?.documentationContext,
          sessionId: `session_${Date.now()}`
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

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
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isAIAssistantModalOpen) return null;

  return (
    <Dialog open={isAIAssistantModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[600px] max-h-[90vh] p-0 flex flex-col bg-background border-0 shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mt-3">
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              Mietfluss AI Assistent
            </DialogTitle>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
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
            </div>
          </div>
          <DialogDescription className="sr-only">
            AI-Assistent für Fragen zu Mietfluss-Funktionen und Immobilienverwaltung
          </DialogDescription>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <img 
                  src="/mascot/normal.png" 
                  alt="Mietfluss AI Assistent Maskottchen" 
                  className="w-24 h-24 mx-auto mb-4 object-contain"
                />
                <h3 className="font-medium text-foreground mb-2">
                  Willkommen beim Mietfluss AI Assistenten
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Stellen Sie mir Fragen über Mietfluss-Funktionen, Immobilienverwaltung, 
                  Betriebskosten oder alles andere rund um die Anwendung.
                </p>
              </div>
            )}

            {messages.map((message) => (
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
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 p-1">
                    <img 
                      src="/mascot/normal.png" 
                      alt="Mietfluss Maskottchen" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                <div 
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted border border-border"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p className={cn(
                    "text-xs mt-2 opacity-70",
                    message.role === 'user' ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 p-1">
                  <img 
                    src="/mascot/normal.png" 
                    alt="Mietfluss Maskottchen" 
                    className="w-full h-full object-contain"
                  />
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
        {error && (
          <div className="px-4">
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                {aiAssistantModalData?.onFallbackToSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={aiAssistantModalData.onFallbackToSearch}
                    className="ml-2"
                  >
                    Zur Suche
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-muted/30">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-background border border-border rounded-full px-4 py-3 pr-16 shadow-sm">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Stellen Sie eine Frage über Mietfluss..."
                disabled={isLoading}
                className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                maxLength={2000}
              />
              <div className="absolute right-16 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {inputValue.length}/2000
              </div>
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/90"
                aria-label="Nachricht senden"
              >
                {isLoading ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}