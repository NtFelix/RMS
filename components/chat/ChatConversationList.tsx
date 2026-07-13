'use client';

import React from 'react';
import { Plus, Archive, Trash2, MessageSquare, Sparkles } from 'lucide-react';

interface Conversation {
  id: string;
  titel: string;
  letzter_zugriff: string;
  status: string;
}

interface ListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const ChatConversationList: React.FC<ListProps> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onArchive,
  onDelete,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-950/10">
      <div className="p-4 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/80 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Verlauf</h3>
        </div>
        <button
          onClick={onCreate}
          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all duration-150 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center shadow-sm"
          title="Neue Konversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2 stroke-[1.5]" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Keine aktiven Chats</p>
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isActive
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50 shadow-sm shadow-indigo-500/5'
                    : 'hover:bg-white dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="text-xs font-semibold truncate leading-tight">{c.titel || 'Neue Konversation'}</span>
                </div>
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={(e) => onArchive(c.id, e)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-100"
                    title="Archivieren"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => onDelete(c.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all duration-100"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
