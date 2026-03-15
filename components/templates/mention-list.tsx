'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MentionVariable } from '@/lib/template-constants';
import { cn } from '@/lib/utils';
import {
  Hash,
  User,
  Home,
  Building,
  Calendar,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Ruler,
  ChevronRight
} from 'lucide-react';

export interface MentionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  User,
  Home,
  Building,
  Calendar,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Ruler,
  Hash
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  mieter: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Mieter' },
  wohnung: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Wohnung' },
  haus: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', label: 'Haus' },
  datum: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Datum' },
  vermieter: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Vermieter' },
};

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectedIndexRef = useRef(selectedIndex);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

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
      if (!props.items || props.items.length === 0) {
        return false;
      }

      const activeIndex = selectedIndexRef.current;

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((activeIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((activeIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        selectItem(activeIndex);
        return true;
      }

      return false;
    },
  }), [props.items, props.command]);

  const renderItems = () => {
    const categories: Record<string, number[]> = {};
    props.items.forEach((item, index) => {
      const category = item.category || 'allgemein';
      if (!categories[category]) categories[category] = [];
      categories[category].push(index);
    });

    return Object.entries(categories).map(([category, indices]) => {
      const categoryStyle = CATEGORY_STYLES[category] || { label: category };
      
      return (
        <React.Fragment key={category}>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {categoryStyle.label}
          </div>
          
          <div className="flex flex-col gap-px">
            {indices.map((index) => {
              const item = props.items[index];
              const Icon = (item.icon && ICON_MAP[item.icon]) || Hash;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={-1}
                  data-mention-item="true"
                  aria-selected={isSelected}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    isSelected 
                      ? "bg-accent text-accent-foreground" 
                      : "text-foreground"
                  )}
                  onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                  onClick={() => selectItem(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  
                  <div className="flex flex-col flex-1 text-left min-w-0">
                    <span className="truncate">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground truncate opacity-80">
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <motion.div
      ref={listRef}
      initial={{ opacity: 0, scale: 0.98, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="z-[9999] w-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none"
      onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
    >
      <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
        {props.items.length > 0 ? (
          renderItems()
        ) : (
          <div className="py-6 text-center text-sm text-foreground">
            Keine Variablen gefunden.
          </div>
        )}
      </div>
    </motion.div>
  );
});

MentionList.displayName = 'MentionList';
