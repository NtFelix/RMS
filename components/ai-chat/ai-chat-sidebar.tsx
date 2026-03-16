"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Trash2, Sparkles, Plus, File as FileIcon, ThumbsUp, ThumbsDown, Database, Search, CheckCircle, XCircle, Loader2, Brain, Wrench, ChevronDown, Terminal, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import { v4 as uuidv4 } from "uuid";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-ignore - useThumbSurvey is available in recent posthog-js/react but types might be lagging
import { useThumbSurvey } from 'posthog-js/react/surveys'
import type { LLMStep, StepType, ToolCallRecord } from '@/types/llm-steps';
import { useGeminiSteps } from '@/hooks/useGeminiSteps';

// Define message type
type Message = {
  id: string;
  role: "user" | "model";
  content: string;
  attachment?: {
    name: string;
    type: string;
    data: string;
  };
  traceId?: string;
  feedback?: 'up' | 'down' | null;
  toolCalls?: ToolCallRecord[];
  steps?: LLMStep[];
};

// ─── ShimmerText: smooth left-to-right shimmer for the active step ──────────
function ShimmerText({ text }: { text: string }) {
  return (
    <motion.span
      className="text-[13px] font-medium text-muted-foreground/40 bg-clip-text"
      style={{
        backgroundImage: "linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.6) 50%, currentColor 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      } as React.CSSProperties}
      animate={{ backgroundPosition: ["100% 0", "-100% 0"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}

// ─── IntelligenceInsight: no-container, inline step list ────────────────────
function IntelligenceInsight({
  steps,
  isLoading,
  toolCalls,
}: {
  steps: LLMStep[];
  isLoading: boolean;
  toolCalls?: ToolCallRecord[];
}) {
  const [isExpanded, setIsExpanded] = useState(isLoading);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  // Auto-expand when loading starts
  useEffect(() => {
    if (isLoading) setIsExpanded(true);
  }, [isLoading]);

  const hasToolData = toolCalls && toolCalls.length > 0;
  const hasSteps = steps && steps.length > 0;
  
  // Don't render if nothing to show
  if (!isLoading && !hasToolData && !hasSteps) return null;

  // Visible steps: during loading show all, after loading only done/error ones
  const visibleSteps = isLoading
    ? steps.filter(s => s.status !== "pending" || steps.find(x => x.status === "loading") === undefined)
    : steps.filter(s => s.status === "done" || s.status === "error");

  return (
    <div className="mb-6 group/insight">
      {/* Top-level collapsible trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground/65 hover:text-muted-foreground transition-all duration-200 outline-none"
      >
        <span>Thought</span>
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden relative mt-3 ml-1"
          >
            {/* Thread line connecting all steps */}
            <div className="absolute left-[3px] top-1 bottom-1 w-[1px] bg-foreground/10" />

            <div className="space-y-4 pt-1 ml-5">
              {/* Step rows */}
              {visibleSteps.map((step, i) => {
                const isActive = step.status === "loading";
                const isDone   = step.status === "done";
                const isError  = step.status === "error";

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="relative flex flex-col"
                  >
                    {/* Timeline Bullet */}
                    <div className="absolute -left-[20px] top-[7px]">
                      {isActive ? (
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 ring-4 ring-background"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ring-4 ring-background ${
                          isDone ? "bg-foreground/20" : isError ? "bg-red-400/60" : "bg-foreground/10"
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 pr-4">
                      {step.toolResult ? (
                        <button
                          onClick={() => setExpandedToolId(expandedToolId === step.id ? null : step.id)}
                          className="flex flex-col items-start text-left w-full group/toolstep outline-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-medium leading-snug transition-colors ${
                              isDone   ? "text-muted-foreground/60 group-hover/toolstep:text-muted-foreground" :
                              isError  ? "text-red-400/70" :
                              "text-muted-foreground/40"
                            }`}>
                              {step.label}
                            </span>
                            <motion.span
                              animate={{ rotate: expandedToolId === step.id ? 0 : -90 }}
                              transition={{ duration: 0.15 }}
                            >
                              <ChevronDown className="w-3 h-3 text-muted-foreground/30" />
                            </motion.span>
                          </div>

                          {step.detail && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground/40 truncate max-w-full italic">
                                {step.detail}
                              </span>
                              {isDone && step.duration && (
                                <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">
                                  {step.duration}ms
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      ) : (
                        <>
                          {isActive ? (
                            <ShimmerText text={step.label} />
                          ) : (
                            <span className={`text-[13px] font-medium block leading-snug ${
                              isDone   ? "text-muted-foreground/60" :
                              isError  ? "text-red-400/70" :
                              "text-muted-foreground/40"
                            }`}>
                              {step.label}
                            </span>
                          )}

                          {step.detail && step.status !== "pending" && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground/40 truncate max-w-full italic">
                                {step.detail}
                              </span>
                              {isDone && step.duration && (
                                <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">
                                  {step.duration}ms
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Tool data content */}
                      {step.toolResult && (
                        <AnimatePresence>
                          {expandedToolId === step.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2.5 pb-2 space-y-3 pl-3 border-l border-border/20">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35">Input</span>
                                  <pre className="p-2.5 rounded-lg text-[11px] font-mono bg-muted/20 text-muted-foreground/75 overflow-x-auto overflow-y-auto max-h-[160px] border border-border/5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-track]:bg-transparent">
                                    {JSON.stringify(step.toolResult.args, null, 2)}
                                  </pre>
                                </div>

                                {step.toolResult.result && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Output</span>
                                    <pre className="p-2.5 rounded-lg text-[11px] font-mono bg-primary/[0.04] text-foreground/70 overflow-x-auto overflow-y-auto max-h-[220px] border border-primary/10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 [&::-webkit-scrollbar-track]:bg-transparent">
                                      {JSON.stringify(step.toolResult.result, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



function PostHogFeedback({ traceId, isDark }: { traceId?: string; isDark: boolean }) {
  if (!traceId) return null;

  const { respond, response, triggerRef } = useThumbSurvey({
    surveyId: '019ce11d-f79c-0000-4959-8e5eb60be080',
    properties: {
      $ai_trace_id: traceId,
    },
  })

  return (
    <div ref={triggerRef} className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/10">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
        War diese Antwort hilfreich?
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => respond('up')}
          className={`h-8 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 border ${
            response === 'up' 
              ? 'bg-green-500/10 border-green-500/30 text-green-600' 
              : 'bg-transparent border-border/30 text-muted-foreground hover:bg-green-500/5 hover:border-green-500/20 hover:text-green-500'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${response === 'up' ? 'fill-current' : ''}`} />
          <span className="text-[12px] font-semibold">Hilfreich</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => respond('down')}
          className={`h-8 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 border ${
            response === 'down' 
              ? 'bg-red-500/10 border-red-500/30 text-red-600' 
              : 'bg-transparent border-border/30 text-muted-foreground hover:bg-red-500/5 hover:border-red-500/20 hover:text-red-500'
          }`}
        >
          <ThumbsDown className={`w-3.5 h-3.5 ${response === 'down' ? 'fill-current' : ''}`} />
          <span className="text-[12px] font-semibold">Nicht hilfreich</span>
        </Button>
      </div>
    </div>
  )
}

export function AIChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite-preview");
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const isDark = currentTheme === 'dark';
  
  const { steps: llmSteps, stepsRef, isVisible: stepsVisible, start: startSteps, finish: finishSteps, addStep, updateStep, setAllDone } = useGeminiSteps();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Datei ist zu groß (max 20MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setAttachment({
        name: file.name,
        type: file.type,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };



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
    if (!inputValue.trim() && !attachment) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: inputValue.trim(),
      attachment: attachment ? { ...attachment } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setAttachment(null);
    setIsLoading(true);
    startSteps();

    const turnCount = messages.filter((m) => m.role === "user").length + 1;
    posthog.capture("ai_message_sent", {
      message_length: userMessage.content.length,
      has_attachment: !!userMessage.attachment,
      current_page: pathname,
      conversation_turn: turnCount,
    });

    try {
      const history = messages.map((m) => {
        const parts: any[] = [];
        if (m.content) parts.push({ text: m.content });
        if (m.attachment) {
          parts.push({
            inlineData: {
              data: m.attachment.data,
              mimeType: m.attachment.type
            }
          });
        }
        if (parts.length === 0) parts.push({ text: " " });
        return { role: m.role, parts };
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content || "Hier ist eine Datei zur Analyse.",
          attachment: userMessage.attachment,
          history,
          pathname,
          sessionId,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`API responded with an error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader found on response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentStepId: string | null = null;
      let finalReply = "";
      let traceId = "";
      let toolResults: ToolCallRecord[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === "step_start") {
              if (currentStepId) updateStep(currentStepId, { status: "done" });
              currentStepId = addStep(data.stepType, data.label, "loading", data.detail);
            } 
            else if (data.type === "step_done") {
              if (currentStepId) {
                updateStep(currentStepId, { status: "done" });
                currentStepId = null;
              }
            } 
            else if (data.type === "tool_result") {
              toolResults.push(data.toolCall);
              if (currentStepId) {
                updateStep(currentStepId, { toolResult: data.toolCall });
              }
            } 
            else if (data.type === "final_reply") {
              finalReply = data.reply;
              traceId = data.traceId;
              toolResults = data.toolCalls || toolResults;
            }
            else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Error parsing stream line:", e, line);
          }
        }
      }

      setAllDone();
      finishSteps(true);

      const aiMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: finalReply || "Entschuldigung, ich konnte keine Antwort generieren.",
        traceId: traceId,
        toolCalls: toolResults.length > 0 ? toolResults : undefined,
        steps: [...stepsRef.current],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      finishSteps(false);
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
            className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-background/90 dark:bg-background/90 backdrop-blur-2xl border-l border-border/50 dark:border-white/10 shadow-2xl z-50 flex flex-col pt-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 bg-transparent z-20">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner overflow-hidden">
                  <Image src={LOGO_URL} alt="Mietevo Mascot" width={24} height={24} className="object-contain" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 dark:to-white/70">
                    Mietevo Copilot
                  </h2>
                </div>
              </div>
              <div className={`flex items-center gap-1 rounded-full p-1 border transition-all duration-300 ${isDark ? 'bg-muted/40 border-white/10 shadow-none' : 'bg-white border-black/[0.08] shadow-sm'}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  title="Chat leeren"
                  className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${isDark ? 'hover:bg-white/5 hover:text-destructive' : 'hover:bg-black/5 hover:text-red-500 text-muted-foreground'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5 text-muted-foreground'}`}
                >
                  <ChevronsRight className="w-5 h-5" />
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
                  <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm overflow-hidden">
                    <Image src={LOGO_URL} alt="Mietevo Mascot" width={50} height={50} className="object-contain" />
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
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`flex w-full flex-col ${
                         m.role === "user" ? "items-end" : "items-start"
                       }`}
                     >
                       {m.role === "user" ? (
                         <div className="flex flex-col items-end max-w-[85%]">
                            <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-[20px] rounded-tr-[4px] shadow-sm border border-primary/10 relative overflow-hidden group/message">
                              {m.attachment && (
                                <div className="flex flex-col gap-2 mb-3 p-0 rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 group/attachment relative z-10">
                                  {m.attachment.type.startsWith('image/') ? (
                                    <div className="relative aspect-auto max-h-[220px] w-full overflow-hidden bg-black/40">
                                      <img src={`data:${m.attachment.type};base64,${m.attachment.data}`} alt={m.attachment.name} className="object-contain w-full h-full transform transition-transform duration-700 group-hover/attachment:scale-105" />
                                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10 uppercase tracking-widest shadow-lg">
                                        Bild
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-4 p-4 bg-white/5">
                                      <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 group-hover/attachment:bg-white/20 transition-colors duration-300">
                                        <FileIcon className="w-6 h-6 text-white" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] truncate font-bold text-white leading-tight">{m.attachment.name}</span>
                                        <span className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5 font-medium">Dokument</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap relative z-10 font-medium">{m.content}</p>
                            </div>
                         </div>
                       ) : (
                         <div className="w-full space-y-4 group">
                           <div className="flex items-center justify-between px-1">
                             <div className="flex items-center gap-2.5">
                               <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center border border-primary/20 shadow-sm overflow-hidden p-[2px] transition-transform group-hover:scale-105 duration-300">
                                 <Image src={LOGO_URL} alt="AI" width={20} height={20} className="object-contain" />
                               </div>
                               <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-70">Mietevo Copilot</span>
                             </div>
                           </div>
                           
                            {((m.toolCalls && m.toolCalls.length > 0) || (m.steps && m.steps.length > 0)) && (
                              <IntelligenceInsight steps={m.steps || []} isLoading={false} toolCalls={m.toolCalls} />
                            )}

                           <div className="prose prose-sm dark:prose-invert max-w-none px-1 text-[15px] leading-relaxed text-foreground/90 font-medium">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                           </div>
                           
                           {/* PostHog Survey Feedback Component */}
                           <PostHogFeedback traceId={m.traceId} isDark={isDark} />
                           
                           <div className="h-px w-full bg-gradient-to-r from-border/50 via-border/10 to-transparent my-6 opacity-30" />
                         </div>
                       )}
                     </motion.div>
                   ))}
                 </AnimatePresence>
              )}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <IntelligenceInsight steps={llmSteps} isLoading={true} />
                  </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border/50 shadow-sm z-20">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className={`relative border border-border/10 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white text-foreground border-border/80'}`}
              >
                <div className="px-4 pt-3">
                  {attachment && (
                    <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-muted border border-border/40 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {attachment.type.startsWith('image/') ? (
                          <div className="relative shrink-0 w-8 h-8 overflow-hidden rounded bg-background shadow-sm">
                            <img src={`data:${attachment.type};base64,${attachment.data}`} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded bg-background shadow-sm">
                            <FileIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-sm truncate text-foreground font-medium">{attachment.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAttachment(null)}
                        className="w-7 h-7 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  <textarea
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      e.target.style.height = 'auto'; // Reset to auto to shrink if needed
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={attachment ? "Frage zum Anhang hinzufügen..." : "Alles mit KI erledigen..."}
                    disabled={isLoading}
                    rows={1}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none max-h-[150px] text-[15px] placeholder:text-muted-foreground disabled:opacity-50 min-h-[48px] outline-none"
                    style={{ overflowY: inputValue.length > 50 ? 'auto' : 'hidden' }}
                  />
                </div>
                
                {/* Bottom row: tools left, send right */}
                <div className="flex items-center justify-between px-3 pb-3">
                  <div className="flex items-center gap-1">
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      accept="image/*,.pdf,.doc,.docx,.csv,.txt"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                      title="Datei hochladen"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                    >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="14" y2="14"/><line x1="4" x2="20" y1="7" y2="7"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="8" cy="7" r="1"/></svg>
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                    >
                      <SelectTrigger className={`h-9 border-none bg-transparent hover:scale-100 active:scale-100 hover:shadow-none px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors gap-1.5 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isDark ? 'hover:bg-white/5 data-[state=open]:bg-white/5' : 'hover:bg-black/5 data-[state=open]:bg-black/5'}`}>
                        <div className="flex items-center gap-1.5 min-w-[85px]">
                          <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                          <SelectValue placeholder="Modell wählen" />
                        </div>
                      </SelectTrigger>
                      <SelectContent align="end" className={`w-[160px] border-border/10 shadow-xl rounded-xl p-1 ${isDark ? 'bg-[#1A1A1A]/95 text-white' : 'bg-white text-foreground'}`}>
                        <SelectItem 
                          value="gemini-3.1-flash-lite-preview"
                          className={`font-medium cursor-pointer ${selectedModel === "gemini-3.1-flash-lite-preview" ? (isDark ? "bg-white/10" : "bg-black/10") : (isDark ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-black/5 focus:bg-black/5")}`}
                        >
                          Flash Lite 3.1
                        </SelectItem>
                        <SelectItem 
                          value="gemini-3-flash-preview"
                          className={`font-medium cursor-pointer ${selectedModel === "gemini-3-flash-preview" ? (isDark ? "bg-white/10" : "bg-black/10") : (isDark ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-black/5 focus:bg-black/5")}`}
                        >
                          Flash 3.0
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || (!inputValue.trim() && !attachment)}
                      className={`rounded-full w-9 h-9 shrink-0 shadow-none transition-all active:scale-95 disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white disabled:hover:bg-white/10' : 'bg-black/10 hover:bg-black/20 text-foreground disabled:hover:bg-black/10'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                    </Button>
                  </div>
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="fixed bottom-6 right-6 z-40 group"
          >
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-primary rounded-full blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
            
            <Button
              size="icon"
              className="relative h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground border border-primary-foreground/10 overflow-hidden"
              onClick={toggleSidebar}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
