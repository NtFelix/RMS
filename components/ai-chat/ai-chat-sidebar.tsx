"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { MessagesList } from "./ai-chat-messages-list";
import { ChatInput } from "./ai-chat-input";
import { SidebarHeader } from "./ai-chat-header";
import { SidebarFloatingButton } from "./ai-chat-floating-button";
import { createClient } from "@/utils/supabase/client";
import { ChatConversationList } from "../chat/ChatConversationList";

export function AIChatSidebar() {
  const isAIAgentEnabled = useFeatureFlagEnabled('mietevo-ai-agent')
  
  const { isOpen, displayMode, toggleDisplayMode, toggleOpen, enabledToolIds, toggleTool } = useAIChatStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
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

  const supabase = createClient();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Resolve current organization context on mount
  useEffect(() => {
    supabase.rpc('current_organisation_id').then(async ({ data: orgId }) => {
      if (!orgId) {
        const { data: membership } = await supabase
          .from('Organisation_Mitglieder')
          .select('organisation_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('status', 'aktiv')
          .limit(1)
          .maybeSingle();
        orgId = membership?.organisation_id;
      }
      if (orgId) {
        setActiveOrgId(orgId);
      }
    });
  }, [supabase]);

  // Unsubscribe helper
  const unsubscribeFromRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
      realtimeChannelRef.current = null;
    }
  }, []);

  // Subscribe fallback helper
  const subscribeToRealtime = useCallback((conversationId: string, aiMessageId: string) => {
    unsubscribeFromRealtime();
    const channel = supabase
      .channel(`konversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'KI_Nachrichten',
          filter: `konversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.rolle === 'assistant' && newMsg.id === aiMessageId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId
                  ? { ...m, content: newMsg.inhalt, status: newMsg.status }
                  : m
              )
            );
            if (newMsg.status === 'abgeschlossen' || newMsg.status === 'fehler') {
              setIsLoading(false);
              setActiveId(null);
              unsubscribeFromRealtime();
            }
          }
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;
  }, [unsubscribeFromRealtime, supabase]);

  const loadConversationsList = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      const res = await fetch(`/api/conversations?orgId=${activeOrgId}`);
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch (err) {
      console.error('[AIChatSidebar] Error loading list:', err);
    }
  }, [activeOrgId]);

  // Load latest active conversation on sidebar open
  useEffect(() => {
    if (isOpen && activeOrgId) {
      const loadHistory = async () => {
        try {
          const res = await fetch(`/api/conversations?orgId=${activeOrgId}`);
          if (res.ok) {
            const convs = await res.json();
            setConversations(convs);
            if (convs && convs.length > 0) {
              const latest = convs[0];
              setActiveConversationId(latest.id);
              
              const detailsRes = await fetch(`/api/conversations/${latest.id}`);
              if (detailsRes.ok) {
                const details = await detailsRes.json();
                const mapped = (details.messages || []).map((m: any) => ({
                  id: m.id,
                  role: m.rolle === 'assistant' ? 'model' : m.rolle,
                  content: m.inhalt || '',
                  status: m.status,
                  steps: m.steps || [],
                  versions: m.versions || []
                }));
                setMessages(mapped);
                
                const lastMsg = details.messages?.[details.messages.length - 1];
                if (lastMsg && lastMsg.rolle === 'assistant' && lastMsg.status === 'generiert') {
                  setIsLoading(true);
                  setActiveId(lastMsg.id);
                  subscribeToRealtime(latest.id, lastMsg.id);
                }
              }
            }
          }
        } catch (err) {
          console.error('[AIChatSidebar] Failed to load history:', err);
        }
      };
      loadHistory();
    } else if (!isOpen) {
      unsubscribeFromRealtime();
    }
    return () => unsubscribeFromRealtime();
  }, [isOpen, activeOrgId, subscribeToRealtime, unsubscribeFromRealtime]);

  // Refresh conversations list whenever history toggled open
  useEffect(() => {
    if (showHistory) {
      loadConversationsList();
    }
  }, [showHistory, loadConversationsList]);

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

  const clearChat = async () => {
    if (activeConversationId) {
      try {
        await fetch(`/api/conversations/${activeConversationId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('[AIChatSidebar] Failed to delete conversation:', err);
      }
    }
    setMessages([]);
    setActiveConversationId(null);
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
    setError(null);

    // Auto-initialize conversation if not yet active
    let currentConvId = activeConversationId;
    if (!currentConvId && activeOrgId) {
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId: activeOrgId, titel: messageContent.slice(0, 40) }),
        });
        if (response.ok) {
          const data = await response.json();
          currentConvId = data.id;
          setActiveConversationId(data.id);
          loadConversationsList();
        } else {
          const errBody = await response.json().catch(() => ({}));
          console.error('[AIChatSidebar] POST /api/conversations failed:', response.status, errBody);
          throw new Error(errBody.error || 'Konnte Konversation nicht initialisieren.');
        }
      } catch (err: any) {
        console.error('[AIChatSidebar] Failed to initialize conversation:', err);
        setError(err.message || 'Konnte Konversation nicht initialisieren.');
        setIsLoading(false);
        setActiveId(null);
        return;
      }
    }

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
      const clientNachrichtId = uuidv4();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Idempotency-Key": clientNachrichtId
        },
        body: JSON.stringify({
          message: messageContent || "Hier ist eine Datei zur Analyse.",
          attachment: messageAttachment,
          conversationId: currentConvId,
          orgId: activeOrgId,
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
      let receivedDone = false;

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
              receivedDone = true;
            }
            else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Error parsing stream line:", e, line);
          }
        }
      }

      // If stream ended early without final reply payload, fall back to realtime tracking
      if (!receivedDone && currentConvId) {
        console.log('[AIChatSidebar] Stream disconnected early. Activating Realtime fallback...');
        subscribeToRealtime(currentConvId, aiMessageId);
        return; // Don't finalize state yet
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

    } catch (error: any) {
      console.error("AI Chat Error:", error);
      setError(error.message || "Kommunikationsfehler");
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
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(!showHistory)}
            />

            {error && (
              <div className="px-6 py-2.5 bg-destructive/10 dark:bg-destructive/25 text-destructive-foreground dark:text-red-300 text-xs border-b border-destructive/20 font-medium">
                {error}
              </div>
            )}

            {showHistory ? (
              <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-950/10">
                <ChatConversationList
                  conversations={conversations}
                  activeId={activeConversationId || undefined}
                  onSelect={async (id) => {
                    setActiveConversationId(id);
                    setShowHistory(false);
                    setError(null);
                    try {
                      const detailsRes = await fetch(`/api/conversations/${id}`);
                      if (detailsRes.ok) {
                        const data = await detailsRes.json();
                        const mapped = (data.messages || []).map((m: any) => ({
                          id: m.id,
                          role: m.rolle === 'assistant' ? 'model' : m.rolle,
                          content: m.inhalt || '',
                          status: m.status,
                          steps: m.steps || [],
                          versions: m.versions || []
                        }));
                        setMessages(mapped);
                        
                        const lastMsg = data.messages?.[data.messages.length - 1];
                        if (lastMsg && lastMsg.rolle === 'assistant' && lastMsg.status === 'generiert') {
                          setIsLoading(true);
                          setActiveId(lastMsg.id);
                          subscribeToRealtime(id, lastMsg.id);
                        } else {
                          setIsLoading(false);
                          unsubscribeFromRealtime();
                        }
                      }
                    } catch (err) {
                      console.error('[AIChatSidebar] Failed to load conversation details:', err);
                    }
                  }}
                  onCreate={() => {
                    clearChat();
                    setShowHistory(false);
                  }}
                  onArchive={async (id, e) => {
                    e.stopPropagation();
                    try {
                      const response = await fetch(`/api/conversations/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'archiviert' }),
                      });
                      if (response.ok) {
                        if (activeConversationId === id) {
                          setActiveConversationId(null);
                          setMessages([]);
                        }
                        loadConversationsList();
                      }
                    } catch (err) {
                      console.error('[AIChatSidebar] Archive error:', err);
                    }
                  }}
                  onDelete={async (id, e) => {
                    e.stopPropagation();
                    if (!confirm('Möchtest du diese Konversation wirklich löschen?')) return;
                    try {
                      const response = await fetch(`/api/conversations/${id}`, {
                        method: 'DELETE',
                      });
                      if (response.ok) {
                        if (activeConversationId === id) {
                          setActiveConversationId(null);
                          setMessages([]);
                        }
                        loadConversationsList();
                      }
                    } catch (err) {
                      console.error('[AIChatSidebar] Delete error:', err);
                    }
                  }}
                />
              </div>
            ) : (
              <>
                <MessagesList
                  messages={messages}
                  isLoading={isLoading}
                  activeId={activeId}
                  llmSteps={llmSteps}
                  scrollRef={scrollRef}
                  regenerateMessage={regenerateMessage}
                  switchVersion={switchVersion}
                />

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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SidebarFloatingButton isOpen={isOpen} isDark={isDark} onToggle={toggleSidebar} />
    </>
  );
}
