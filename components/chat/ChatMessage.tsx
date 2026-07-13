'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: string;
}

export const ChatMessage: React.FC<MessageProps> = ({ role, content, status }) => {
  const isUser = role === 'user';
  
  if (role === 'system') return null;

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-none border border-indigo-500/20 shadow-indigo-500/10'
            : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border border-gray-200/50 dark:border-gray-800/80 rounded-bl-none'
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
        {status === 'generiert' && (
          <span className="text-[10px] opacity-70 mt-1.5 block text-right animate-pulse font-medium">
            schreibt...
          </span>
        )}
      </div>
    </div>
  );
};
