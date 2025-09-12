'use client';

import { forwardRef, useImperativeHandle, useState, useCallback, useMemo, useEffect } from 'react';
import { Editor, Range } from '@tiptap/react';
import { MentionVariable, CATEGORY_CONFIGS, getCategoryConfig } from '@/lib/template-constants';
import { groupMentionVariablesByCategory, getOrderedCategories } from '@/lib/mention-utils';
import { cn } from '@/lib/utils';
import { 
  User, 
  Home, 
  Building, 
  Calendar, 
  UserCheck,
  LucideIcon
} from 'lucide-react';

// Props interface for the MentionSuggestionList component
export interface MentionSuggestionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
  editor: Editor;
  range: Range;
  query: string;
}

// Icon mapping for categories
const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Home,
  Building,
  Calendar,
  UserCheck,
};

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

  // Group and order items by category
  const { groupedItems, orderedCategories, flatItems } = useMemo(() => {
    const grouped = groupMentionVariablesByCategory(items);
    const ordered = getOrderedCategories(grouped);
    const flat = ordered.flatMap(categoryId => grouped[categoryId] || []);
    
    return {
      groupedItems: grouped,
      orderedCategories: ordered,
      flatItems: flat
    };
  }, [items]);

  // Keyboard navigation methods
  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % flatItems.length);
  }, [flatItems.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
  }, [flatItems.length]);

  const selectCurrentItem = useCallback(() => {
    if (flatItems[selectedIndex]) {
      command(flatItems[selectedIndex]);
    }
  }, [flatItems, selectedIndex, command]);

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
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Get the currently selected item for ARIA
  const selectedItem = flatItems[selectedIndex];

  // Helper to get flat index of an item
  const getFlatIndex = useCallback((item: MentionVariable): number => {
    return flatItems.findIndex(flatItem => flatItem.id === item.id);
  }, [flatItems]);

  return (
    <div
      className={cn(
        'bg-background border border-border rounded-md shadow-lg',
        'w-full max-w-sm max-h-80 overflow-y-auto',
        'py-1'
      )}
      role="listbox"
      aria-label="Variable suggestions"
      aria-expanded="true"
      aria-activedescendant={selectedItem ? `suggestion-${selectedItem.id}` : undefined}
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
        orderedCategories.map((categoryId, categoryIndex) => {
          const categoryItems = groupedItems[categoryId] || [];
          const categoryConfig = getCategoryConfig(categoryId);
          
          if (categoryItems.length === 0) return null;
          
          const IconComponent = categoryConfig?.icon ? ICON_MAP[categoryConfig.icon] : null;
          
          return (
            <div key={categoryId}>
              {/* Category separator - only show if not first category */}
              {categoryIndex > 0 && (
                <div className="border-t border-border my-1" />
              )}
              
              {/* Category header */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                {IconComponent && (
                  <IconComponent 
                    className={cn(
                      'h-3 w-3',
                      categoryConfig?.color || 'text-muted-foreground'
                    )} 
                  />
                )}
                <span>{categoryConfig?.label || categoryId}</span>
              </div>
              
              {/* Category items */}
              {categoryItems.map((item) => {
                const flatIndex = getFlatIndex(item);
                const isSelected = flatIndex === selectedIndex;
                
                return (
                  <div
                    key={item.id}
                    id={`suggestion-${item.id}`}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'text-sm ml-2', // Indent items under category
                      // Mobile-friendly touch targets
                      'min-h-[44px] sm:min-h-0 flex flex-col justify-center',
                      isSelected && 'bg-accent text-accent-foreground'
                    )}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.description}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
});

MentionSuggestionList.displayName = 'MentionSuggestionList';