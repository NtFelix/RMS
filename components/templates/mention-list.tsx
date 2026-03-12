'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MentionVariable } from '@/lib/template-constants';
import { cn } from '@/lib/utils';
import { Hash } from 'lucide-react';

export interface MentionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selected = list.querySelector('[data-mention-item="true"][aria-selected="true"]') as HTMLElement | null;
    if (!selected) return;

    const listRect = list.getBoundingClientRect();
    const itemRect = selected.getBoundingClientRect();

    if (itemRect.top < listRect.top) {
      list.scrollTop -= (listRect.top - itemRect.top);
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += (itemRect.bottom - listRect.bottom);
    }
  }, [selectedIndex, props.items.length]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!props.items.length) {
        return false;
      }

      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }), [selectedIndex, props.items, props.command]);

  return (
    <div
      ref={listRef}
      className="z-50 min-w-[240px] max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
      onMouseDown={(event) => event.preventDefault()}
    >
      {props.items.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {props.items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              tabIndex={-1}
              data-mention-item="true"
              aria-selected={index === selectedIndex}
              className={cn(
                "relative flex w-full cursor-default select-none items-start gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors",
                index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground">
                <Hash className="h-3 w-3" />
              </div>
              <div className="flex flex-col items-start overflow-hidden text-left">
                <span className="font-medium truncate w-full">{item.label}</span>
                <span className="text-xs text-muted-foreground truncate w-full">{item.description}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
          Keine Variablen gefunden
        </div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';
