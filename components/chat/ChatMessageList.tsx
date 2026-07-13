'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatTypingIndicator } from './ChatTypingIndicator';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  inhalt: string;
  status?: string;
}

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
}

export const ChatMessageList: React.FC<MessageListProps> = ({ messages, isGenerating }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 custom-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 text-xl shadow-sm border border-indigo-100/50 dark:border-indigo-900/30">
            ✨
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Willkommen im Mietevo Chat</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] leading-relaxed">
            Stelle mir Fragen zu Mietern, Finanzen oder erstelle neue Aufgaben.
          </p>
        </div>
      ) : (
        messages.map((msg, index) => (
          <ChatMessage
            key={msg.id || index}
            role={msg.role}
            content={msg.inhalt}
            status={msg.status}
          />
        ))
      )}
      {isGenerating && (
        <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
          <ChatTypingIndicator />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
