'use client';

import React from 'react';
import { Plus, Archive, Trash2, MessageSquare, Sparkles, RotateCcw, Inbox } from 'lucide-react';

interface Conversation {
  id: string;
  titel: string;
  letzter_zugriff: string;
  status: string;
  storage_status?: string;
}

interface ListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
  onRestore: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const ChatConversationList: React.FC<ListProps> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onArchive,
  onRestore,
  onDelete,
}) => {
  const activeConvs = conversations.filter(c => c.status === 'aktiv');
  const archivedConvs = conversations.filter(c => c.status === 'archiviert');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-950/10">
      <div className="p-4 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/80 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Verlauf</h3>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all duration-150 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center shadow-sm"
          aria-label="Neue Konversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {activeConvs.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Aktive Chats
            </div>
            {activeConvs.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isActive={c.id === activeId}
                onSelect={onSelect}
                actions={
                  <>
                    <ActionButton
                      onClick={(e) => onArchive(c.id, e)}
                      className="hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      ariaLabel="Archivieren"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => onDelete(c.id, e)}
                      className="hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      ariaLabel="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </ActionButton>
                  </>
                }
              />
            ))}
          </>
        )}

        {archivedConvs.length > 0 && (
          <>
            <div className="pt-4 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Inbox className="w-3 h-3" />
              Archivierte Chats
            </div>
            {archivedConvs.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                isActive={c.id === activeId}
                onSelect={onSelect}
                actions={
                  <ActionButton
                    onClick={(e) => onRestore(c.id, e)}
                    className="hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    ariaLabel="Wiederherstellen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </ActionButton>
                }
              />
            ))}
          </>
        )}

        {conversations.length === 0 && (
          <div className="py-8 text-center">
            <Inbox className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2 stroke-[1.5]" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Keine Chats</p>
          </div>
        )}
      </div>
    </div>
  );
};

function ConversationRow({
  conversation: c,
  isActive,
  onSelect,
  actions,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  actions: React.ReactNode;
}) {
  const isArchived = c.status === 'archiviert';
  return (
    <div
      key={c.id}
      onClick={() => onSelect(c.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(c.id); } }}
      role="button"
      tabIndex={0}
      aria-label={c.titel || 'Neue Konversation'}
      className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border ${
        isActive
          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50 shadow-sm shadow-indigo-500/5'
          : 'hover:bg-white dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 border-transparent'
      } ${isArchived ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {isArchived
          ? <Archive className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
          : <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        }
        <span className="text-xs font-semibold truncate leading-tight">{c.titel || 'Neue Konversation'}</span>
      </div>
      <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {actions}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  className,
  ariaLabel,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  className: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1 text-gray-400 rounded-lg transition-all duration-100 ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
