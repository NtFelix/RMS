"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, AlertCircle, RotateCcw, X, Wifi, WifiOff, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEnhancedAIAssistant } from "@/hooks/use-enhanced-ai-assistant";
import { BRAND_NAME } from "@/lib/constants";

interface AIAssistantInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  documentationContext?: any[];
  className?: string;
  onFallbackToSearch?: () => void;
}

export default function AIAssistantInterface({
  isOpen,
  onClose,
  documentationContext = [],
  className,
  onFallbackToSearch
}: AIAssistantInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    state,
    actions,
    networkStatus,
    retryState
  } = useEnhancedAIAssistant(documentationContext);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    actions.clearMessages();
    onClose();
  }, [actions, onClose]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
      actions.clearMessages();
      return;
    }

    // Ctrl/Cmd + R to retry last message
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && state.error) {
      e.preventDefault();
      actions.retryLastMessage();
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

  // Handle input changes with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const message = state.inputValue.trim();
    if (!message || state.isLoading) return;

    await actions.sendMessage(message);
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
              <div className="flex items-center gap-2">
                <h2 id="ai-assistant-title" className="font-semibold text-foreground">{BRAND_NAME} AI Assistent</h2>
                {/* Network Status Indicator */}
                {networkStatus.isOffline && (
                  <Badge variant="destructive" className="text-xs">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {retryState.isRetrying && (
                  <Badge variant="secondary" className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Wiederholung {retryState.attemptCount}
                  </Badge>
                )}
              </div>
              <p id="ai-assistant-description" className="text-xs text-muted-foreground">
                {networkStatus.isOffline
                  ? 'Keine Internetverbindung - Funktionen eingeschränkt'
                  : `Fragen Sie mich alles über ${BRAND_NAME}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Network Status Icon */}
            <div className="flex items-center">
              {networkStatus.isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            {state.messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={actions.clearMessages}
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
                  Willkommen beim {BRAND_NAME} AI Assistenten
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Stellen Sie mir Fragen über {BRAND_NAME}-Funktionen, Immobilienverwaltung,
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

        {/* Enhanced Error Display */}
        <AnimatePresence>
          {(state.error || state.validationError || retryState.nextRetryIn > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4"
            >
              {/* Main Error */}
              {state.error && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{state.error}</span>
                    <div className="flex items-center gap-2">
                      {state.fallbackToSearch && onFallbackToSearch && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onFallbackToSearch}
                          className="h-auto p-1 text-destructive-foreground hover:bg-destructive/20"
                          title="Zur normalen Suche wechseln"
                        >
                          <Search className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={actions.retryLastMessage}
                        disabled={retryState.isRetrying}
                        className="h-auto p-1 text-destructive-foreground hover:bg-destructive/20"
                        aria-label="Erneut versuchen (Strg+R)"
                        title="Erneut versuchen (Strg+R)"
                      >
                        <RotateCcw className={cn("w-3 h-3", retryState.isRetrying && "animate-spin")} />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Error */}
              {state.validationError && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.validationError}</AlertDescription>
                </Alert>
              )}

              {/* Retry Countdown */}
              {retryState.nextRetryIn > 0 && (
                <Alert className="mb-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Wiederholung in {retryState.nextRetryIn} Sekunden... (Versuch {retryState.attemptCount})
                  </AlertDescription>
                </Alert>
              )}

              {/* Fallback Suggestion */}
              {state.fallbackToSearch && onFallbackToSearch && (
                <Alert className="mb-2">
                  <Search className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Sie können stattdessen die normale Dokumentationssuche verwenden.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onFallbackToSearch}
                      className="ml-2"
                    >
                      Zur Suche
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Input Area */}
        <div className="p-4 border-t border-border bg-muted/30">
          {/* Input Suggestions */}
          {state.inputSuggestions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Vorschläge:</p>
              <div className="space-y-1">
                {state.inputSuggestions.slice(0, 2).map((suggestion, index) => (
                  <p key={index} className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {state.validationWarning && (
            <Alert className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{state.validationWarning}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={state.inputValue}
                onChange={handleInputChange}
                placeholder={
                  networkStatus.isOffline
                    ? "Offline - Keine AI-Anfragen möglich"
                    : `Stellen Sie eine Frage über ${BRAND_NAME}...`
                }
                disabled={state.isLoading || networkStatus.isOffline}
                className={cn(
                  "pr-12",
                  state.validationError && "border-destructive",
                  state.validationWarning && "border-yellow-500"
                )}
                maxLength={2000}
              />
              {/* Character Counter */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {state.inputValue.length}/2000
              </div>
            </div>
            <Button
              type="submit"
              disabled={
                !state.inputValue.trim() ||
                state.isLoading ||
                networkStatus.isOffline ||
                !!state.validationError ||
                retryState.isRetrying
              }
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
          {/* Enhanced Help Text */}
          <div className="text-xs text-muted-foreground mt-2 text-center space-y-1">
            <div className="flex items-center justify-between">
              <span>Drücken Sie Enter zum Senden</span>
              <span className="flex items-center gap-2">
                {networkStatus.isOnline && (
                  <Badge variant="outline" className="text-xs">
                    <Wifi className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                )}
                {retryState.isRetrying && (
                  <Badge variant="secondary" className="text-xs">
                    Wiederholung läuft...
                  </Badge>
                )}
              </span>
            </div>
            <p className="text-xs opacity-75">
              Tastenkürzel: Escape (Schließen) • Strg+K (Löschen) • Strg+R (Wiederholen) • Alt+↑↓ (Scrollen)
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}