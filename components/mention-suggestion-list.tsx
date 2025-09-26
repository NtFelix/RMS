'use client';

import { forwardRef, useImperativeHandle, useCallback, useMemo, useState, useEffect, memo, useRef } from 'react';
import { Editor, Range } from '@tiptap/react';
import { MentionVariable, CATEGORY_CONFIGS, getCategoryConfig } from '@/lib/template-constants';
import { groupMentionVariablesByCategory, getOrderedCategories } from '@/lib/mention-utils';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { 
  suggestionPerformanceMonitor, 
  createResourceCleanupTracker,
  useRenderPerformanceMonitor 
} from '@/lib/mention-suggestion-performance';
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
import {
  MentionSuggestionErrorType,
  handleRenderError,
  handleKeyboardNavigationError,
  safeExecute,
  createGracefulFallback,
  mentionSuggestionErrorRecovery,
} from '@/lib/mention-suggestion-error-handling';
import { MentionSuggestionErrorFallback, useMentionSuggestionErrorHandler } from '@/components/mention-suggestion-error-boundary';

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

// Memoized suggestion item component for better performance
const MemoizedSuggestionItem = memo<{
  item: MentionVariable;
  isSelected: boolean;
  query: string;
  onSelect: () => void;
  onMouseEnter: () => void;
  highlightMatch: (text: string, query: string) => React.ReactNode;
}>(({ item, isSelected, query, onSelect, onMouseEnter, highlightMatch }) => (
  <div
    id={`suggestion-${item.id}`}
    className={cn(
      'mention-suggestion-item',
      isSelected && 'selected'
    )}
    role="option"
    aria-selected={isSelected}
    aria-describedby={`suggestion-${item.id}-description`}
    tabIndex={isSelected ? 0 : -1}
    onClick={onSelect}
    onMouseEnter={onMouseEnter}
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
));

MemoizedSuggestionItem.displayName = 'MemoizedSuggestionItem';

// Main component with forwardRef for keyboard navigation
export const MentionSuggestionList = forwardRef<
  MentionSuggestionListRef,
  MentionSuggestionListProps
>(({ items, command, editor, range, query, loading = false }, ref) => {
  // Performance monitoring
  useRenderPerformanceMonitor('MentionSuggestionList');

  // Error handling state
  const { error, hasError, handleError, retry, reset } = useMentionSuggestionErrorHandler();
  const [fallbackMode, setFallbackMode] = useState(false);
  const fallback = useMemo(() => createGracefulFallback(), []);

  // Resource cleanup tracker
  const cleanupTracker = useMemo(() => createResourceCleanupTracker(), []);

  // Group and order items by category with error handling and performance monitoring
  const { groupedItems, orderedCategories, flatItems } = useMemo(() => {
    const endTiming = suggestionPerformanceMonitor.startTiming('groupMentionVariables');
    
    try {
      const grouped = groupMentionVariablesByCategory(items);
      const ordered = getOrderedCategories(grouped);
      const flat = ordered.flatMap(categoryId => grouped[categoryId] || []);
      
      const duration = endTiming();
      
      return {
        groupedItems: grouped,
        orderedCategories: ordered,
        flatItems: flat
      };
    } catch (error) {
      endTiming();
      
      const suggestionError = handleRenderError(
        error instanceof Error ? error : new Error('Unknown grouping error'),
        'MentionSuggestionList',
        { itemCount: items.length, query }
      );
      
      handleError(suggestionError.originalError || new Error(suggestionError.message));
      
      // Check if we should enter fallback mode
      if (mentionSuggestionErrorRecovery.recordError(suggestionError)) {
        setFallbackMode(true);
      }
      
      // Return safe fallback data
      return {
        groupedItems: {},
        orderedCategories: [],
        flatItems: []
      };
    }
  }, [items, query, handleError]);

  // Handle item selection with error handling
  const handleSelect = useCallback((index: number) => {
    try {
      if (flatItems[index]) {
        command(flatItems[index]);
        // Reset error state on successful selection
        reset();
      }
    } catch (error) {
      const suggestionError = handleRenderError(
        error instanceof Error ? error : new Error('Selection failed'),
        'MentionSuggestionList.handleSelect',
        { index, itemCount: flatItems.length }
      );
      
      handleError(suggestionError.originalError || new Error(suggestionError.message));
      
      // Try fallback selection
      if (fallbackMode || mentionSuggestionErrorRecovery.isInFallbackMode()) {
        fallback.fallbackSuggestion(editor, query);
      }
    }
  }, [flatItems, command, reset, handleError, fallbackMode, fallback, editor, query]);

  // Use keyboard navigation hook with error handling
  const {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown: originalHandleKeyDown,
  } = useKeyboardNavigation({
    itemCount: flatItems.length,
    onSelect: handleSelect,
    initialIndex: 0,
  });

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && selectedIndex < flatItems.length) {
      const itemNode = listRef.current.querySelector(
        `#suggestion-${flatItems[selectedIndex].id}`
      );
      if (itemNode) {
        itemNode.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [selectedIndex, flatItems]);

  // Wrap keyboard handling with error recovery
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    try {
      return originalHandleKeyDown(event);
    } catch (error) {
      const suggestionError = handleKeyboardNavigationError(
        error instanceof Error ? error : new Error('Keyboard navigation failed'),
        event,
        selectedIndex,
        flatItems.length
      );
      
      handleError(suggestionError.originalError || new Error(suggestionError.message));
      
      // Fallback: handle basic navigation manually
      if (event.key === 'Enter' || event.key === 'Tab') {
        handleSelect(selectedIndex);
        return true;
      }
      
      return false;
    }
  }, [originalHandleKeyDown, selectedIndex, flatItems.length, handleError, handleSelect]);

  // Handle keyboard events for TipTap integration
  const onKeyDown = useCallback(({ event }: { event: KeyboardEvent }) => {
    return handleKeyDown(event);
  }, [handleKeyDown]);

  // Expose keyboard navigation methods via ref
  useImperativeHandle(ref, () => ({
    onKeyDown,
  }), [onKeyDown]);

  // Handle item selection via click with error handling
  const handleItemClick = useCallback((item: MentionVariable) => {
    try {
      command(item);
      reset();
    } catch (error) {
      const suggestionError = handleRenderError(
        error instanceof Error ? error : new Error('Click selection failed'),
        'MentionSuggestionList.handleItemClick',
        { itemId: item.id, itemLabel: item.label }
      );
      
      handleError(suggestionError.originalError || new Error(suggestionError.message));
      
      // Try fallback
      if (fallbackMode || mentionSuggestionErrorRecovery.isInFallbackMode()) {
        fallback.fallbackSuggestion(editor, item.label);
      }
    }
  }, [command, reset, handleError, fallbackMode, fallback, editor]);

  // Get the currently selected item for ARIA
  const selectedItem = flatItems[selectedIndex];

  // Helper to get flat index of an item
  const getFlatIndex = useCallback((item: MentionVariable): number => {
    return flatItems.findIndex(flatItem => flatItem.id === item.id);
  }, [flatItems]);

  // Helper to highlight matching text in query with error handling
  const highlightMatch = useCallback((text: string, query: string) => {
    try {
      if (!query.trim()) return text;
      
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => 
        regex.test(part) ? <mark key={index}>{part}</mark> : part
      );
    } catch (error) {
      // Fallback to plain text if highlighting fails
      console.warn('Text highlighting failed, using plain text:', error);
      return text;
    }
  }, []);

  // Effect to handle error recovery
  useEffect(() => {
    if (hasError && mentionSuggestionErrorRecovery.isInFallbackMode()) {
      setFallbackMode(true);
    }
  }, [hasError]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      cleanupTracker.cleanup();
    };
  }, [cleanupTracker]);

  // If we have a critical error, show error fallback
  if (hasError && !fallbackMode) {
    return (
      <MentionSuggestionErrorFallback
        error={error || undefined}
        onRetry={retry}
        onDismiss={reset}
        canRetry={!mentionSuggestionErrorRecovery.isInFallbackMode()}
      />
    );
  }

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
      <div ref={listRef}>
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
                    <MemoizedSuggestionItem
                      key={item.id}
                      item={item}
                      isSelected={isSelected}
                      query={query}
                      onSelect={() => handleItemClick(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      highlightMatch={highlightMatch}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

MentionSuggestionList.displayName = 'MentionSuggestionList';