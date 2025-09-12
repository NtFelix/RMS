'use client';

import { forwardRef, useImperativeHandle, useCallback, useMemo, useState } from 'react';
import { Editor, Range } from '@tiptap/react';
import { MentionVariable, CATEGORY_CONFIGS, getCategoryConfig } from '@/lib/template-constants';
import { groupMentionVariablesByCategory, getOrderedCategories } from '@/lib/mention-utils';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { cn } from '@/lib/utils';
import { 
  User, 
  Home, 
  Building, 
  Calendar, 
  UserCheck,
  Search,
  Loader2,
  LucideIcon
} from 'lucide-react';

// Props interface for the MentionSuggestionList component
export interface MentionSuggestionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
  editor: Editor;
  range: Range;
  query: string;
  loading?: boolean;
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
>(({ items, command, editor, range, query, loading = false }, ref) => {
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

  // Handle item selection
  const handleSelect = useCallback((index: number) => {
    if (flatItems[index]) {
      command(flatItems[index]);
    }
  }, [flatItems, command]);

  // Use keyboard navigation hook
  const {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  } = useKeyboardNavigation({
    itemCount: flatItems.length,
    onSelect: handleSelect,
    initialIndex: 0,
  });

  // Handle keyboard events for TipTap integration
  const onKeyDown = useCallback(({ event }: { event: KeyboardEvent }) => {
    return handleKeyDown(event);
  }, [handleKeyDown]);

  // Expose keyboard navigation methods via ref
  useImperativeHandle(ref, () => ({
    onKeyDown,
  }), [onKeyDown]);

  // Handle item selection via click
  const handleItemClick = useCallback((item: MentionVariable) => {
    command(item);
  }, [command]);

  // Get the currently selected item for ARIA
  const selectedItem = flatItems[selectedIndex];

  // Helper to get flat index of an item
  const getFlatIndex = useCallback((item: MentionVariable): number => {
    return flatItems.findIndex(flatItem => flatItem.id === item.id);
  }, [flatItems]);

  // Helper to highlight matching text in query
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index}>{part}</mark> : part
    );
  }, []);

  return (
    <div
      className={cn(
        'mention-suggestion-modal',
        loading && 'mention-suggestion-loading-state'
      )}
      role="listbox"
      aria-label="Variable suggestions"
      aria-expanded="true"
      aria-activedescendant={selectedItem ? `suggestion-${selectedItem.id}` : undefined}
      aria-multiselectable="false"
      tabIndex={-1}
    >
      {loading ? (
        <>
          <div className="mention-suggestion-loading" role="status" aria-live="polite">
            <Loader2 className="mention-suggestion-loading-spinner" />
            <span className="mention-suggestion-loading-text">Loading suggestions...</span>
          </div>
          {/* Skeleton items for better UX */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="mention-suggestion-skeleton">
              <div className="mention-suggestion-skeleton-label" />
              <div className="mention-suggestion-skeleton-description" />
            </div>
          ))}
        </>
      ) : items.length === 0 ? (
        <div className="mention-suggestion-empty" role="status" aria-live="polite">
          <Search className="mention-suggestion-empty-icon" />
          <div className="mention-suggestion-empty-text">No matches found</div>
          <div className="mention-suggestion-empty-subtext">
            {query ? `No variables match "${query}"` : 'Start typing to search variables'}
          </div>
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
                <div className="mention-category-separator" />
              )}
              
              {/* Category header */}
              <div className={cn(
                'mention-category-header',
                `mention-category-${categoryId}`
              )}>
                {IconComponent && (
                  <IconComponent className="mention-category-icon" />
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
                      'mention-suggestion-item',
                      isSelected && 'selected'
                    )}
                    role="option"
                    aria-selected={isSelected}
                    aria-describedby={`suggestion-${item.id}-description`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                  >
                    <div className="mention-suggestion-label" aria-label={`Variable: ${item.label}`}>
                      {highlightMatch(item.label, query)}
                    </div>
                    <div 
                      id={`suggestion-${item.id}-description`}
                      className="mention-suggestion-description"
                      aria-label={`Description: ${item.description}`}
                    >
                      {highlightMatch(item.description, query)}
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