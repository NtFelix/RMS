'use client';

import { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Editor, Range } from '@tiptap/react';
import { MentionVariable } from '@/lib/template-constants';
import { cn } from '@/lib/utils';

// Props interface for the MentionSuggestionList component
export interface MentionSuggestionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
  editor: Editor;
  range: Range;
  query: string;
}

// Ref interface for keyboard navigation methods
export interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// Main component with forwardRef for keyboard navigation
export const MentionSuggestionList = forwardRef<
  MentionSuggestionListRef,
  MentionSuggestionListProps
>(({ items, command, editor, range, query }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard navigation methods
  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const selectCurrentItem = useCallback(() => {
    if (items[selectedIndex]) {
      command(items[selectedIndex]);
    }
  }, [items, selectedIndex, command]);

  // Handle keyboard events
  const onKeyDown = useCallback(({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectPrevious();
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectNext();
      return true;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectCurrentItem();
      return true;
    }

    return false;
  }, [selectNext, selectPrevious, selectCurrentItem]);

  // Expose keyboard navigation methods via ref
  useImperativeHandle(ref, () => ({
    onKeyDown,
  }), [onKeyDown]);

  // Handle item selection via click
  const handleItemClick = useCallback((item: MentionVariable) => {
    command(item);
  }, [command]);

  // Reset selected index when items change
  useState(() => {
    setSelectedIndex(0);
  });

  return (
    <div
      className={cn(
        'bg-background border border-border rounded-md shadow-lg',
        'max-w-xs w-full max-h-60 overflow-y-auto',
        'py-1'
      )}
      role="listbox"
      aria-label="Variable suggestions"
      aria-expanded="true"
      aria-activedescendant={items[selectedIndex] ? `suggestion-${items[selectedIndex].id}` : undefined}
    >
      {items.length === 0 ? (
        <div
          className="px-3 py-2 text-sm text-muted-foreground"
          role="option"
          aria-selected="false"
        >
          No matches found
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={item.id}
            id={`suggestion-${item.id}`}
            className={cn(
              'px-3 py-2 cursor-pointer transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'text-sm',
              index === selectedIndex && 'bg-accent text-accent-foreground'
            )}
            role="option"
            aria-selected={index === selectedIndex}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="font-medium">{item.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </div>
          </div>
        ))
      )}
    </div>
  );
});

MentionSuggestionList.displayName = 'MentionSuggestionList';