"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import { v4 as uuidv4 } from "uuid";
import { usePathname } from "next/navigation";
import { useFeatureFlagEnabled } from "@posthog/react";
import { useTheme } from "next-themes";
import { useAIChatStore } from "@/hooks/use-ai-chat-store";
import type { ToolCallRecord } from '@/types/llm-steps';
import { useGeminiSteps } from '@/hooks/useGeminiSteps';
import type { Message, MessageVersion } from "./ai-chat-types";
import { EmptyState } from "./ai-chat-empty-state";
import { UserMessageBubble } from "./ai-chat-user-message";
import { AIMessageCard } from "./ai-chat-ai-message";
import { ChatInput } from "./ai-chat-input";
import { SidebarHeader } from "./ai-chat-header";
import { SidebarFloatingButton } from "./ai-chat-floating-button";
import { IntelligenceInsight } from "./ai-chat-intelligence-insight";

export function AIChatSidebar() {
  const isAIAgentEnabled = useFeatureFlagEnabled('mietevo-ai-agent')
  
  const { isOpen, displayMode, toggleDisplayMode, toggleOpen, enabledToolIds, toggleTool } = useAIChatStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  if (sessionIdRef.current === null) sessionIdRef.current = uuidv4();
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite-preview");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { theme, resolvedTheme } = useTheme();
  
  const { steps: llmSteps, stepsRef, start: startSteps, finish: finishSteps, addStep, updateStep, setAllDone } = useGeminiSteps();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const isDark = currentTheme === 'dark';

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



  // Hotkey listener for Cmd/Ctrl + J
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleOpen]);

  // Focus textarea when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to wait for sidebar spring animation to start/complete enough
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-scroll to bottom of messages smoothly
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  if (!isAIAgentEnabled) return null;

  const toggleSidebar = () => {
    if (!isOpen) {
      posthog.capture("ai_chat_opened", { current_page: pathname });
    } else {
      posthog.capture("ai_chat_closed", {
        total_turns: messages.filter((m) => m.role === "user").length,
        current_page: pathname,
      });
    }
    toggleOpen();
  };

  const clearChat = () => {
    setMessages([]);
    sessionIdRef.current = uuidv4(); // Start a new session
  };

  const switchVersion = (messageId: string, versionIndex: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.versions && m.versions[versionIndex]) {
        const v = m.versions[versionIndex];
        return {
          ...m,
          currentVersionIndex: versionIndex,
          content: v.content,
          traceId: v.traceId,
          feedback: v.feedback,
          toolCalls: v.toolCalls,
          steps: v.steps
        };
      }
      return m;
    }));
  };

  const performAIExchange = async (
    messageContent: string, 
    messageAttachment: { name: string; type: string; data: string } | null | undefined, 
    historyOverride?: Message[],
    regenerateId?: string,
    existingVersions?: MessageVersion[]
  ) => {
    const aiMessageId = regenerateId || uuidv4();
    setIsLoading(true);
    setActiveId(aiMessageId);
    startSteps();

    // Immediately create/clear content to start fresh or hide previous answer
    setMessages(prev => {
      if (regenerateId) {
        return prev.map(m => m.id === regenerateId ? {
          ...m,
          content: "",
          steps: [],
          toolCalls: undefined,
          traceId: undefined,
          versions: existingVersions,
          currentVersionIndex: existingVersions?.length || 0
        } : m);
      } else {
        const initialAiMessage: Message = {
          id: aiMessageId,
          role: "model",
          content: "",
          steps: [],
          currentVersionIndex: 0,
          versions: []
        };
        return [...prev, initialAiMessage];
      }
    });

    try {
      const currentHistory = historyOverride || messages;
      // Truncate history to last 20 turns and remove attachment data from old messages
      const recentHistory = currentHistory.slice(-40);
      const history = recentHistory.map((m, i) => {
        const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [];
        if (m.content) parts.push({ text: m.content });
        if (m.attachment) {
          const isRecent = i >= recentHistory.length - 4;
          parts.push({
            inlineData: {
              data: isRecent ? m.attachment.data : "",
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
          message: messageContent || "Hier ist eine Datei zur Analyse.",
          attachment: messageAttachment,
          history,
          pathname,
          sessionId: sessionIdRef.current!,
          model: selectedModel,
          enabledToolIds,
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
              if (currentStepId) {
                updateStep(currentStepId, { status: "done" });
                currentStepId = null;
              }
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
            else if (data.type === "content") {
              setMessages(prev => prev.map(m => 
                m.id === aiMessageId ? { ...m, content: m.content + data.content } : m
              ));
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

      const finalStepsList = [...stepsRef.current];
      const newVersion: MessageVersion = {
        content: finalReply,
        traceId: traceId,
        toolCalls: toolResults.length > 0 ? toolResults : undefined,
        steps: finalStepsList
      };

      const finalVersions = [...(existingVersions || []), newVersion];

      // Update the message with final details and versioning
      setMessages(prev => prev.map(m => m.id === aiMessageId ? {
        ...m,
        content: finalReply || m.content, 
        traceId,
        toolCalls: toolResults.length > 0 ? toolResults : undefined,
        steps: finalStepsList,
        versions: finalVersions,
        currentVersionIndex: finalVersions.length - 1
      } : m));
    } catch (error) {
      console.error("AI Chat Error:", error);
      finishSteps(false);
      setMessages((prev) => prev.map(m =>
        m.id === aiMessageId
          ? { ...m, role: "model" as const, content: "Es tut mir leid, es gab einen Fehler bei der Kommunikation mit der KI. Bitte versuche es später noch einmal." }
          : m
      ));
    } finally {
      setIsLoading(false);
      setActiveId(null);
    }
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

    const turnCount = messages.filter((m) => m.role === "user").length + 1;
    posthog.capture("ai_message_sent", {
      message_length: userMessage.content.length,
      has_attachment: !!userMessage.attachment,
      current_page: pathname,
      conversation_turn: turnCount,
    });

    await performAIExchange(userMessage.content, userMessage.attachment);
  };

  const regenerateMessage = async (id: string) => {
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return;

    const aiMessage = messages[index];
    if (aiMessage.role !== 'model') return;

    const prevUserMessage = messages[index - 1];
    if (!prevUserMessage || prevUserMessage.role !== 'user') return;

    // Capture current state into versions if not already tracked
    const updatedVersions = aiMessage.versions ? [...aiMessage.versions] : [{
      content: aiMessage.content,
      traceId: aiMessage.traceId,
      feedback: aiMessage.feedback,
      toolCalls: aiMessage.toolCalls,
      steps: aiMessage.steps
    }];

    const historyBeforeUser = messages.slice(0, index - 1);
    const content = prevUserMessage.content;
    const att = prevUserMessage.attachment;

    posthog.capture("ai_message_regenerated", {
      traceId: aiMessage.traceId,
      current_page: pathname,
      model: selectedModel,
      version_count: updatedVersions.length + 1
    });

    await performAIExchange(content, att, historyBeforeUser, id, updatedVersions);
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
            <SidebarHeader
              isDark={isDark}
              onClearChat={clearChat}
              onToggleDisplayMode={toggleDisplayMode}
              onToggleSidebar={toggleSidebar}
              displayMode={displayMode}
            />

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6"
              ref={scrollRef}
            >
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <AnimatePresence initial={false}>
                   {messages.map((m) => (
                     <motion.div
                       key={m.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`flex w-full flex-col ${
                         m.role === "user" ? "items-end" : "items-start"
                       }`}
                     >
                       {m.role === "user" ? (
                         <UserMessageBubble message={m} />
                       ) : (
                         <AIMessageCard
                           content={m.content}
                           traceId={m.traceId}
                           currentVersionIndex={m.currentVersionIndex}
                           totalVersions={m.versions?.length}
                           steps={m.steps}
                           toolCalls={m.toolCalls}
                           isActive={m.id === activeId}
                           isLoading={isLoading}
                           liveSteps={llmSteps}
                           onRegenerate={() => regenerateMessage(m.id)}
                           onVersionChange={(idx) => switchVersion(m.id, idx)}
                         />
                       )}
                     </motion.div>
                   ))}
                 </AnimatePresence>
              )}
                {isLoading && activeId === null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <IntelligenceInsight steps={llmSteps} isLoading={true} />
                  </motion.div>
                )}
            </div>

            <ChatInput
              inputValue={inputValue}
              setInputValue={setInputValue}
              attachment={attachment}
              setAttachment={setAttachment}
              isLoading={isLoading}
              isDark={isDark}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              enabledToolIds={enabledToolIds}
              toggleTool={toggleTool}
              handleFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
              textareaRef={textareaRef}
              handleKeyDown={handleKeyDown}
              sendMessage={sendMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SidebarFloatingButton isOpen={isOpen} isDark={isDark} onToggle={toggleSidebar} />
    </>
  );
}
