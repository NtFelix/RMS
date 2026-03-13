"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import { v4 as uuidv4 } from "uuid";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";

// Define message type
type Message = {
  id: string;
  role: "user" | "model";
  content: string;
};

export function AIChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize session ID on mount
  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  // Auto-scroll to bottom of messages smoothly
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  const toggleSidebar = () => {
    if (!isOpen) {
      posthog.capture("ai_chat_opened", { current_page: pathname });
    } else {
      posthog.capture("ai_chat_closed", {
        total_turns: messages.filter((m) => m.role === "user").length,
        current_page: pathname,
      });
    }
    setIsOpen(!isOpen);
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(uuidv4()); // Start a new session
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    const turnCount = messages.filter((m) => m.role === "user").length + 1;
    posthog.capture("ai_message_sent", {
      message_length: userMessage.content.length,
      current_page: pathname,
      conversation_turn: turnCount,
    });

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          pathname,
          sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`API responded with an error: ${res.status}`);
      }

      const data = await res.json();

      const aiMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: data.reply || "Entschuldigung, ich konnte keine Antwort generieren.",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: "model",
        content:
          "Es tut mir leid, es gab einen Fehler bei der Kommunikation mit der KI. Bitte versuche es später noch einmal.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0, filter: "blur(8px)" }}
            animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ x: "100%", opacity: 0, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-background/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 flex flex-col pt-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-background/50 backdrop-blur-xl z-20">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner overflow-hidden">
                  <Image src={LOGO_URL} alt="Mietevo Mascot" width={24} height={24} className="object-contain" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Mietevo Copilot
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3 text-primary" /> KI Assistent
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1 border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  title="Chat leeren"
                  className="rounded-full w-8 h-8 hover:bg-background hover:text-destructive flex-shrink-0 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="rounded-full w-8 h-8 hover:bg-background flex-shrink-0 transition-all"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-5 space-y-6"
              ref={scrollRef}
            >
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-[85%] mx-auto pb-10"
                >
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent flex items-center justify-center ring-1 ring-primary/20 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)] overflow-hidden">
                    <Image src={LOGO_URL} alt="Mietevo Mascot" width={60} height={60} className="object-contain drop-shadow-md" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">Wie kann ich helfen?</h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      Schneller Datenabruf. Frage mich nach deinen Objekten, Mietern, Aufgaben oder Transaktionen.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      layout
                      key={m.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex w-full ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "model" && (
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 flex-shrink-0 mt-1 shadow-sm overflow-hidden p-[2px]">
                            <Image src={LOGO_URL} alt="AI" width={24} height={24} className="object-contain" />
                         </div>
                      )}
                      
                      <div
                        className={`max-w-[82%] px-5 py-3.5 shadow-sm text-[15px] leading-relaxed relative ${
                          m.role === "user"
                            ? "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground rounded-[24px] rounded-tr-[4px]"
                            : "bg-card text-card-foreground border border-border/80 rounded-[24px] rounded-tl-[4px]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mr-3 flex-shrink-0 mt-1 shadow-sm relative overflow-hidden">
                     <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                     <Sparkles className="w-4 h-4 text-primary animate-[spin_3s_linear_infinite]" />
                  </div>
                  <div className="bg-card border border-border/80 rounded-[24px] rounded-tl-[4px] px-5 py-4 flex items-center gap-2 shadow-sm relative overflow-hidden w-[100px]">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent z-0" />
                    <div className="flex space-x-1.5 z-10 w-full justify-center">
                      <motion.div 
                        animate={{ y: [0, -5, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                        className="w-2 h-2 bg-primary/40 rounded-full" 
                      />
                      <motion.div 
                        animate={{ y: [0, -5, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.15 }}
                        className="w-2 h-2 bg-primary/70 rounded-full" 
                      />
                      <motion.div 
                        animate={{ y: [0, -5, 0] }} 
                        transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.3 }}
                        className="w-2 h-2 bg-primary rounded-full" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/90 backdrop-blur-2xl border-t border-border/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="relative bg-[#1A1A1A] text-white border border-border/10 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300"
              >
                <div className="px-4 py-3">
                  <textarea
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      e.target.style.height = 'auto'; // Reset to auto to shrink if needed
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Alles mit KI erledigen..."
                    disabled={isLoading}
                    rows={1}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none max-h-[150px] text-[15px] placeholder:text-muted-foreground disabled:opacity-50 min-h-[48px] outline-none"
                    style={{ overflowY: inputValue.length > 50 ? 'auto' : 'hidden' }}
                  />
                </div>
                
                {/* Bottom row: tools left, send right */}
                <div className="flex items-center justify-between px-3 pb-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      {/* Using generic lucide-react icons as fill-ins for the + and slider icons in the image */}
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="14" y2="14"/><line x1="4" x2="20" y1="7" y2="7"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="8" cy="7" r="1"/></svg>
                    </Button>
                  </div>
                  
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !inputValue.trim()}
                    className="rounded-full w-9 h-9 shrink-0 bg-white/10 hover:bg-white/20 text-white shadow-none transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-white/10"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 group"
          >
            {/* Pulsing ring effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary to-primary/50 rounded-full blur-xl opacity-20 group-hover:opacity-60 transition duration-500 animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
            
            <Button
              size="icon"
              className="relative h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-2 border-primary-foreground/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)] overflow-hidden"
              onClick={toggleSidebar}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Sparkles className="absolute top-3 right-3 w-4 h-4 opacity-70 animate-pulse text-primary-foreground" />
              <MessageCircle className="w-7 h-7 ml-[-2px] mt-[-2px]" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
