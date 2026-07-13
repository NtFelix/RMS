'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, History, MessageSquare, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ChatConversationList } from './ChatConversationList';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import { ChatErrorBoundary } from './ChatErrorBoundary';

interface ChatSidebarProps {
  orgId: string;
}

interface Conversation {
  id: string;
  titel: string;
  letzter_zugriff: string;
  status: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  inhalt: string;
  status?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ orgId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const realtimeChannelRef = useRef<any>(null);

  // Load conversations list
  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/conversations?orgId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('[ChatSidebar] Error loading conversations:', err);
    }
  };

  // Load specific conversation messages
  const loadConversationDetails = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // If the latest message from assistant is still generating, subscribe to realtime updates immediately
        const latestMsg = data.messages?.[data.messages.length - 1];
        if (latestMsg && latestMsg.role === 'assistant' && latestMsg.status === 'generiert') {
          setIsGenerating(true);
          subscribeToRealtime(id);
        } else {
          setIsGenerating(false);
          unsubscribeFromRealtime();
        }
      }
    } catch (err) {
      console.error('[ChatSidebar] Error loading conversation details:', err);
      setError('Fehler beim Laden des Chat-Verlaufs.');
    }
  };

  // Create a new conversation
  const handleCreateConversation = async () => {
    try {
      setError(null);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, titel: 'Neue Konversation' }),
      });
      if (response.ok) {
        const data = await response.json();
        setActiveConversationId(data.id);
        setMessages([]);
        setShowHistory(false);
        await loadConversations();
      }
    } catch (err) {
      console.error('[ChatSidebar] Error creating conversation:', err);
      setError('Konnte keine neue Konversation erstellen.');
    }
  };

  // Archive a conversation
  const handleArchiveConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archiviert' }),
      });
      if (response.ok) {
        if (activeConversationId === id) {
          setActiveConversationId(undefined);
          setMessages([]);
        }
        await loadConversations();
      }
    } catch (err) {
      console.error('[ChatSidebar] Error archiving conversation:', err);
    }
  };

  // Delete a conversation (soft delete)
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Möchtest du diese Konversation wirklich löschen?')) return;
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        if (activeConversationId === id) {
          setActiveConversationId(undefined);
          setMessages([]);
        }
        await loadConversations();
      }
    } catch (err) {
      console.error('[ChatSidebar] Error deleting conversation:', err);
    }
  };

  // Subscribe to Supabase Realtime for message updates (Fallback or Multi-Device sync)
  const subscribeToRealtime = (conversationId: string) => {
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
          if (newMsg && newMsg.rolle === 'assistant') {
            setMessages((prev) => {
              const exists = prev.findIndex((m) => m.id === newMsg.id);
              if (exists !== -1) {
                // Update existing message content and status
                const updated = [...prev];
                updated[exists] = {
                  ...updated[exists],
                  inhalt: newMsg.inhalt,
                  status: newMsg.status,
                };
                return updated;
              } else {
                // Insert new message
                return [
                  ...prev,
                  {
                    id: newMsg.id,
                    role: newMsg.rolle,
                    inhalt: newMsg.inhalt,
                    status: newMsg.status,
                  },
                ];
              }
            });

            if (newMsg.status === 'abgeschlossen' || newMsg.status === 'fehler') {
              setIsGenerating(false);
              unsubscribeFromRealtime();
              loadConversations(); // Reload list to update titles/access times
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const unsubscribeFromRealtime = () => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
      realtimeChannelRef.current = null;
    }
  };

  // Send message via SSE
  const handleSendMessage = async (text: string) => {
    let currentConvId = activeConversationId;
    setError(null);
    setIsGenerating(true);

    try {
      // 1. Create conversation first if not active
      if (!currentConvId) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, titel: text.slice(0, 40) }),
        });
        if (response.ok) {
          const data = await response.json();
          currentConvId = data.id;
          setActiveConversationId(data.id);
        } else {
          throw new Error('Konnte Konversation nicht initialisieren.');
        }
      }

      // Appending local user message state immediately for responsive design
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { role: 'user', inhalt: text },
        { id: assistantMsgId, role: 'assistant', inhalt: '', status: 'generiert' },
      ]);

      const clientNachrichtId = crypto.randomUUID();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': clientNachrichtId,
        },
        body: JSON.stringify({
          message: text,
          conversationId: currentConvId,
          orgId,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // 2. Stream SSE responses
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDoneSignal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonText = line.trim().slice(6);
            if (jsonText === '[DONE]') {
              receivedDoneSignal = true;
              setIsGenerating(false);
              break;
            }
            try {
              const data = JSON.parse(jsonText);
              if (data.type === 'token') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx].inhalt += data.text;
                  }
                  return updated;
                });
              } else if (data.type === 'done') {
                receivedDoneSignal = true;
                setIsGenerating(false);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (err) {
              // Ignore line parses if malformed JSON, continue streaming
            }
          }
        }
      }

      // 3. Trigger Realtime fallback if connection dropped early without done signal
      if (currentConvId) {
        if (!receivedDoneSignal) {
          console.log('[ChatSidebar] Connection dropped. Activating Realtime fallback...');
          subscribeToRealtime(currentConvId);
        } else {
          // Load clean db states
          await loadConversationDetails(currentConvId);
          await loadConversations();
        }
      }

    } catch (err: any) {
      console.error('[ChatSidebar] Send message failed:', err);
      setError(err.message || 'Verbindung zum KI-Service fehlgeschlagen.');
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      if (activeConversationId) {
        loadConversationDetails(activeConversationId);
      }
    } else {
      unsubscribeFromRealtime();
    }
    return () => unsubscribeFromRealtime();
  }, [isOpen, activeConversationId]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-indigo-500/20"
      >
        <Bot className="w-6 h-6 animate-pulse" />
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200/60 dark:border-gray-800/80 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/10">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-none">Mietevo Copilot</h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Bereit für deine Fragen</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150"
              title="Verlauf anzeigen"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs border-b border-red-100 dark:border-red-950/40 font-medium animate-in slide-in-from-top-1 duration-150">
            {error}
          </div>
        )}

        {/* Content Area */}
        <ChatErrorBoundary>
          {showHistory ? (
            <ChatConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={(id) => {
                setActiveConversationId(id);
                setShowHistory(false);
              }}
              onCreate={handleCreateConversation}
              onArchive={handleArchiveConversation}
              onDelete={handleDeleteConversation}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-950/5">
              <ChatMessageList messages={messages} isGenerating={isGenerating} />
              <ChatMessageInput onSend={handleSendMessage} disabled={isGenerating} />
            </div>
          )}
        </ChatErrorBoundary>
      </div>
    </>
  );
};
