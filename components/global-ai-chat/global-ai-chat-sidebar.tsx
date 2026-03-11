"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, User, AlertCircle, RotateCcw, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAIConversation } from "@/hooks/use-ai-conversation";
import { LOGO_URL } from "@/lib/constants";

interface GlobalAIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalAIChatSidebar({ isOpen, onClose }: GlobalAIChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    interface: 'simple'
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Wait for open animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const clearMessages = useCallback(() => {
    clearConversationMessages();
  }, [clearConversationMessages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background border-l border-border shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center p-1">
                {LOGO_URL ? (
                  <img src={LOGO_URL} alt="Mietevo" className="w-full h-full object-contain" />
                ) : (
                  <Bot className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm leading-tight">Mietevo AI</h3>
                <p className="text-xs text-muted-foreground">Ihr digitaler Assistent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={clearMessages}
                  title="Unterhaltung löschen"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground sm:hidden"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 px-4 h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary/40" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">Wie kann ich helfen?</h4>
                  <p className="text-sm">
                    Stellen Sie mir Fragen zu Mietevo, Immobilienverwaltung oder Betriebskosten.
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
                      {LOGO_URL ? (
                        <img src={LOGO_URL} alt="Mietevo" className="w-full h-full object-contain" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-background border border-border shadow-sm rounded-tl-sm"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                    <p className={cn(
                      "text-[10px] mt-1.5 opacity-70 flex justify-end",
                      message.role === 'user' ? "text-primary-foreground/80" : "text-muted-foreground"
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
                     {LOGO_URL ? (
                        <img src={LOGO_URL} alt="Mietevo" className="w-full h-full object-contain" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                     )}
                  </div>
                  <div className="bg-background border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <span className="flex space-x-1">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-1.5 h-1.5 bg-primary rounded-full block" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full block" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full block" />
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 bg-muted/10">
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-muted/50 focus-within:bg-background border-2 border-transparent focus-within:border-primary/50 rounded-xl transition-colors duration-200">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Ihre Frage an die AI..."
                  disabled={isLoading}
                  className="border-0 bg-transparent pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground shadow-none min-h-[50px]"
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg transition-transform",
                    (!inputValue.trim() || isLoading) ? "opacity-50" : "bg-primary hover:bg-primary/90 shadow-sm hover:scale-105"
                  )}
                  aria-label="Nachricht senden"
                >
                  {isLoading ? (
                    <Spinner className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-primary-foreground" />
                  )}
                </Button>
              </div>
              <div className="text-[10px] text-center text-muted-foreground mt-2">
                AI kann Fehler machen. Bitte überprüfen Sie wichtige Informationen.
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
