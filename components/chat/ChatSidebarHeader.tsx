'use client';

import React from 'react';
import { X, History, Bot } from 'lucide-react';

interface HeaderProps {
  showHistory: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
}

export const ChatSidebarHeader: React.FC<HeaderProps> = ({
  showHistory,
  onToggleHistory,
  onClose,
}) => (
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
        type="button"
        onClick={onToggleHistory}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150"
        aria-label="Verlauf anzeigen"
      >
        <History className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150"
        aria-label="Chat schließen"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
