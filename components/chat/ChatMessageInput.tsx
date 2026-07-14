'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface InputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const ChatMessageInput: React.FC<InputProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="p-3 border-t border-gray-100 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
      <div className="relative flex items-end bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800/80 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all duration-200 pr-1.5 pb-1.5">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Frag mich etwas..."
          className="flex-1 max-h-[160px] min-h-[44px] resize-none outline-none text-sm py-3.5 px-4 bg-transparent border-0 placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-100"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          aria-label="Nachricht senden"
          className="p-2.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 rounded-xl transition-all duration-150 flex items-center justify-center shadow-sm disabled:shadow-none"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
