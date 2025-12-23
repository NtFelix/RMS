"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAIConversation } from "@/hooks/use-ai-conversation";

interface AIAssistantInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  documentationContext?: any;
  className?: string;
  onFallbackToSearch?: () => void;
}

export default function AIAssistantInterfaceSimple({
  isOpen,
  onClose,
  documentationContext,
  className,
  onFallbackToSearch
}: AIAssistantInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // AI conversation hook
  const {
    inputValue,
    isLoading,
    error,
    messages,
    handleInputChange,
    handleSubmit,
    clearMessages: clearConversationMessages,
    formatTime
  } = useAIConversation({
    documentationContext,
    onFallbackToSearch,
    interface: 'simple'
  });

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    clearConversationMessages();
    onClose();
  }, [clearConversationMessages, onClose]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Clear messages action for the button
  const clearMessages = useCallback(() => {
    clearConversationMessages();
  }, [clearConversationMessages]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      clearMessages();
      return;
    }
  }, [isOpen, handleClose, clearMessages]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

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
                <h2 id="ai-assistant-title" className="font-semibold text-foreground">Mietevo AI Assistent</h2>
              </div>
            </div>
          </div>
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  Willkommen beim Mietevo AI Assistenten
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Stellen Sie mir Fragen über Mietevo-Funktionen, Immobilienverwaltung,
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
        {error && (
          <div className="px-4">
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                {onFallbackToSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onFallbackToSearch}
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
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Stellen Sie eine Frage über Mietevo..."
                disabled={isLoading}
                className="pr-12"
                maxLength={2000}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {inputValue.length}/2000
              </div>
            </div>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="px-3"
              aria-label="Nachricht senden"
            >
              {isLoading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            <p>Drücken Sie Enter zum Senden • Escape zum Schließen • Strg+K zum Löschen</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}