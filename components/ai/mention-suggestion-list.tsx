'use client';

import React, { forwardRef, useImperativeHandle, useCallback, useMemo, useState, useEffect, memo, Fragment } from 'react';
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
  LucideIcon,
  Hash
} from 'lucide-react';
import {
  MentionSuggestionErrorType,
  handleRenderError,
  handleKeyboardNavigationError,
  safeExecute,
  createGracefulFallback,
  mentionSuggestionErrorRecovery,
} from '@/lib/mention-suggestion-error-handling';
import { MentionSuggestionErrorFallback, useMentionSuggestionErrorHandler } from '@/components/ai/mention-suggestion-error-boundary';

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

// Memoized suggestion item component with modern application styling
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
      "group relative flex cursor-pointer select-none items-start gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150",
      "hover:bg-accent hover:text-accent-foreground hover:scale-[1.01]",
      "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
      isSelected && "bg-accent text-accent-foreground shadow-sm ring-2 ring-primary/20"
    )}
    role="option"
    aria-selected={isSelected}
    aria-describedby={`suggestion-${item.id}-description`}
    aria-label={`${item.label}: ${item.description}`}
    tabIndex={isSelected ? 0 : -1}
    onClick={onSelect}
    onMouseEnter={onMouseEnter}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }
    }}
  >
    <div className={cn(
      "flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 mt-0.5 transition-all duration-150",
      "bg-primary/10 text-primary",
      "group-hover:bg-accent-foreground/10 group-hover:text-accent-foreground",
      isSelected && "bg-accent-foreground/15 text-accent-foreground"
    )}>
      <Hash className="h-3.5 w-3.5" />
    </div>
    <div className="flex-1 space-y-1 min-w-0">
      <div className="font-medium leading-none" aria-label={`Variable: ${item.label}`}>
        {highlightMatch(item.label, query)}
      </div>
      <div 
        id={`suggestion-${item.id}-description`}
        className="text-xs text-muted-foreground leading-relaxed"
        aria-label={`Description: ${item.description}`}
      >
        {highlightMatch(item.description, query)}
      </div>
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

  // Scroll selected item into view and manage focus
  useEffect(() => {
    if (selectedIndex >= 0 && flatItems.length > 0) {
      const selectedElement = document.getElementById(`suggestion-${flatItems[selectedIndex]?.id}`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
        
        // Announce the selected item to screen readers
        const itemLabel = flatItems[selectedIndex]?.label;
        const itemDescription = flatItems[selectedIndex]?.description;
        if (itemLabel) {
          // Create a live region announcement
          const announcement = `${itemLabel}. ${itemDescription || ''}`;
          const liveRegion = document.getElementById('suggestion-live-region');
          if (liveRegion) {
            liveRegion.textContent = announcement;
          }
        }
      }
    }
  }, [selectedIndex, flatItems]);

  // Ensure mouse wheel events work properly
  const handleWheel = useCallback((event: React.WheelEvent) => {
    // Allow the event to bubble up to the scrollable container
    event.stopPropagation();
  }, []);

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
    // Handle arrow keys for navigation
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (flatItems.length > 0) {
        const nextIndex = selectedIndex < flatItems.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(nextIndex);
      }
      return true;
    }
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (flatItems.length > 0) {
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : flatItems.length - 1;
        setSelectedIndex(prevIndex);
      }
      return true;
    }
    
    // Handle selection
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      if (flatItems[selectedIndex]) {
        handleSelect(selectedIndex);
      }
      return true;
    }
    
    return false;
  }, [flatItems, selectedIndex, setSelectedIndex, handleSelect]);

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
        regex.test(part) ? (
          <span 
            key={`match-${index}`} 
            className="bg-primary/20 text-primary px-1 py-0.5 rounded font-semibold"
          >
            {part}
          </span>
        ) : <Fragment key={`text-${index}`}>{part}</Fragment>
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
    <>
      {/* Live region for screen reader announcements */}
      <div
        id="suggestion-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <div
        className={cn(
          "z-50 w-80 rounded-2xl border bg-popover text-popover-foreground shadow-xl backdrop-blur-sm",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "pointer-events-auto",
          loading && 'opacity-90'
        )}
        role="listbox"
        aria-label={`Variable suggestions${query ? ` for "${query}"` : ''}. Use arrow keys to navigate, Enter to select, Escape to close.`}
        aria-expanded="true"
        aria-activedescendant={selectedItem ? `suggestion-${selectedItem.id}` : undefined}
        aria-multiselectable="false"
        aria-describedby="suggestion-instructions"
        tabIndex={-1}
        onWheel={handleWheel}
      >
      {/* Header with search indicator */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Vorlage-Variablen</span>
        {query && (
          <span className="ml-auto text-xs text-muted-foreground">
            "{query}"
          </span>
        )}
      </div>

      {/* Hidden instructions for screen readers */}
      <div id="suggestion-instructions" className="sr-only">
        Use arrow keys to navigate suggestions. Press Home to go to first item, End to go to last item. 
        Press Page Up or Page Down to jump by 5 items. Press Enter, Tab, or Space to select. Press Escape to close.
        {flatItems.length > 0 && ` ${flatItems.length} suggestions available.`}
      </div>

      {/* Scrollable content */}
      <div
        className="max-h-[320px] overflow-y-auto overflow-x-hidden"
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
        }}
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {loading ? (
          <>
            <div className="flex items-center gap-3 px-3 py-4" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading suggestions...</span>
            </div>
            {/* Skeleton items */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                <div className="h-6 w-6 rounded-md bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" style={{ width: '60%' }} />
                  <div className="h-3 bg-muted rounded animate-pulse" style={{ width: '80%' }} />
                </div>
              </div>
            ))}
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center" role="status" aria-live="polite">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">No matches found</div>
              <div className="text-xs text-muted-foreground">
                {query ? `No variables match "${query}"` : 'Start typing to search variables'}
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            {orderedCategories.map((categoryId, categoryIndex) => {
              const categoryItems = groupedItems[categoryId] || [];
              const categoryConfig = getCategoryConfig(categoryId);
              
              if (categoryItems.length === 0) return null;
              
              const IconComponent = categoryConfig?.icon ? ICON_MAP[categoryConfig.icon] : null;
              
              return (
                <div key={categoryId}>
                  {/* Category separator - only show if not first category */}
                  {categoryIndex > 0 && (
                    <div className="mx-2 my-1 h-px bg-border" />
                  )}
                  
                  {/* Category header */}
                  <div className="sticky top-0 z-20 flex items-center gap-2 bg-popover border-b border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
                    {IconComponent && (
                      <IconComponent className="h-3.5 w-3.5" />
                    )}
                    <span className="uppercase tracking-wide">{categoryConfig?.label || categoryId}</span>
                  </div>
                  
                  {/* Category items */}
                  <div className="px-2 py-1 space-y-0.5">
                    {categoryItems.map((item, itemIndex) => {
                      const flatIndex = getFlatIndex(item);
                      const isSelected = flatIndex === selectedIndex;
                      
                      return (
                        <MemoizedSuggestionItem
                          key={item?.id || `item-${itemIndex}`}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
});

MentionSuggestionList.displayName = 'MentionSuggestionList';