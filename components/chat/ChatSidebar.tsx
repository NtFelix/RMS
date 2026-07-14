'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ChatConversationList } from './ChatConversationList';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessageInput } from './ChatMessageInput';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatSidebarHeader } from './ChatSidebarHeader';

interface ChatSidebarProps {
  orgId?: string;
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
  const [activeOrgId, setActiveOrgId] = useState<string | null>(orgId || null);
  const realtimeChannelRef = useRef<any>(null);

  // Fetch current organization id dynamically on mount if not provided as prop
  useEffect(() => {
    if (!orgId) {
      supabase.rpc('current_organisation_id').then(({ data, error }) => {
        if (!error && data) {
          setActiveOrgId(data);
        }
      });
    } else {
      setActiveOrgId(orgId);
    }
  }, [orgId, supabase]);

  const unsubscribeFromRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.unsubscribe();
      realtimeChannelRef.current = null;
    }
  }, []);

  const subscribeToRealtime = useCallback((conversationId: string): (() => void) => {
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
                const updated = [...prev];
                updated[exists] = {
                  ...updated[exists],
                  inhalt: newMsg.inhalt,
                  status: newMsg.status,
                };
                return updated;
              } else {
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
              loadConversations();
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
    return () => {
      channel.unsubscribe();
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
    };
  }, [unsubscribeFromRealtime]);

  const loadConversations = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      const response = await fetch(`/api/conversations?orgId=${activeOrgId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('[ChatSidebar] Error loading conversations:', err);
    }
  }, [activeOrgId]);

  const loadConversationDetails = useCallback(async (id: string) => {
    try {
      setError(null);
      await fetch(`/api/conversations/${id}`, { method: 'POST' });
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
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
  }, [subscribeToRealtime, unsubscribeFromRealtime]);

  const handleCreateConversation = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      setError(null);
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrgId, titel: 'Neue Konversation' }),
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
  }, [activeOrgId, loadConversations]);

  const handleArchiveConversation = useCallback(async (id: string, e: React.MouseEvent) => {
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
  }, [activeConversationId, loadConversations]);

  const handleDeleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
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
  }, [activeConversationId, loadConversations]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!activeOrgId) return;
    let currentConvId = activeConversationId;
    setError(null);
    setIsGenerating(true);

    try {
      if (!currentConvId) {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId: activeOrgId, titel: text.slice(0, 40) }),
        });
        if (response.ok) {
          const data = await response.json();
          currentConvId = data.id;
          setActiveConversationId(data.id);
        } else {
          throw new Error('Konnte Konversation nicht initialisieren.');
        }
      }

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
          orgId: activeOrgId,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

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
            }
          }
        }
      }

      if (currentConvId) {
        if (!receivedDoneSignal) {
          console.log('[ChatSidebar] Connection dropped. Activating Realtime fallback...');
          subscribeToRealtime(currentConvId);
        } else {
          await loadConversationDetails(currentConvId);
          await loadConversations();
        }
      }

    } catch (err: any) {
      console.error('[ChatSidebar] Send message failed:', err);
      setError(err.message || 'Verbindung zum KI-Service fehlgeschlagen.');
      setIsGenerating(false);
    }
  }, [activeOrgId, activeConversationId, subscribeToRealtime, loadConversationDetails, loadConversations]);

  useEffect(() => {
    if (isOpen && activeOrgId) {
      loadConversations();
      if (activeConversationId) {
        loadConversationDetails(activeConversationId);
      }
    } else {
      unsubscribeFromRealtime();
    }
    return () => unsubscribeFromRealtime();
  }, [isOpen, activeConversationId, activeOrgId, loadConversations, loadConversationDetails, unsubscribeFromRealtime]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Chat schließen' : 'Chat öffnen'}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-indigo-500/20 animate-in zoom-in-50 duration-300"
      >
        <Bot className="w-6 h-6 animate-pulse" />
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200/60 dark:border-gray-800/80 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <ChatSidebarHeader
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(!showHistory)}
          onClose={() => setIsOpen(false)}
        />

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
