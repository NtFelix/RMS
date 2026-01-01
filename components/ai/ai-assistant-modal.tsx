"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, User, AlertCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/hooks/use-modal-store";
import { useAIConversation } from "@/hooks/use-ai-conversation";

export function AIAssistantModal() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal store
  const {
    isAIAssistantModalOpen,
    aiAssistantModalData,
    closeAIAssistantModal,
  } = useModalStore();

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
    documentationContext: aiAssistantModalData?.documentationContext,
    onFallbackToSearch: aiAssistantModalData?.onFallbackToSearch,
    interface: 'modal'
  });

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    clearConversationMessages();
    closeAIAssistantModal();
  }, [clearConversationMessages, closeAIAssistantModal]);

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

  // Clear messages action for the button
  const clearMessages = useCallback(() => {
    clearConversationMessages();
  }, [clearConversationMessages]);

  if (!isAIAssistantModalOpen) return null;

  return (
    <Dialog open={isAIAssistantModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl h-[600px] max-h-[90vh] p-0 flex flex-col bg-background border-0 shadow-2xl rounded-lg overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mt-3">
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              Mietevo AI Assistent
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
            AI-Assistent für Fragen zu Mietevo-Funktionen und Immobilienverwaltung
          </DialogDescription>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <img
                  src="/mascot/normal.png"
                  alt="Mietevo AI Assistent Maskottchen"
                  className="w-24 h-24 mx-auto mb-4 object-contain"
                />
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
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 p-1">
                    <img
                      src="/mascot/normal.png"
                      alt="Mietevo Maskottchen"
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
                    alt="Mietevo Maskottchen"
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
            <div className="relative bg-background border-2 border-input rounded-full px-4 py-1 pr-16 shadow-sm focus-within:border-ring hover:shadow-md hover:scale-[1.01] transition-all duration-200">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Stellen Sie eine Frage über Mietevo..."
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
                  <ArrowUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}