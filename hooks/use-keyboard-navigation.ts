import { useCallback, useState, useEffect } from 'react';

export interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onEscape?: () => void;
  initialIndex?: number;
}

export interface UseKeyboardNavigationReturn {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectCurrentItem: () => void;
  handleKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Custom hook for managing keyboard navigation in suggestion lists
 * Handles arrow key navigation, Enter/Tab selection, and Escape key
 */
export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEscape,
  initialIndex = 0,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Reset selected index when item count changes
  useEffect(() => {
    if (itemCount === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= itemCount) {
      setSelectedIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, selectedIndex]);

  // Navigate to next item with bounds checking
  const selectNext = useCallback(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => (prev + 1) % itemCount);
  }, [itemCount]);

  // Navigate to previous item with bounds checking
  const selectPrevious = useCallback(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
  }, [itemCount]);

  // Select the currently highlighted item
  const selectCurrentItem = useCallback(() => {
    if (itemCount > 0 && selectedIndex >= 0 && selectedIndex < itemCount) {
      onSelect(selectedIndex);
    }
  }, [itemCount, selectedIndex, onSelect]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent): boolean => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        selectNext();
        return true;

      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        selectPrevious();
        return true;

      case 'Home':
        event.preventDefault();
        event.stopPropagation();
        if (itemCount > 0) {
          setSelectedIndex(0);
        }
        return true;

      case 'End':
        event.preventDefault();
        event.stopPropagation();
        if (itemCount > 0) {
          setSelectedIndex(itemCount - 1);
        }
        return true;

      case 'PageDown':
        event.preventDefault();
        event.stopPropagation();
        if (itemCount > 0) {
          const jumpSize = Math.min(5, itemCount - 1);
          setSelectedIndex((prev) => Math.min(prev + jumpSize, itemCount - 1));
        }
        return true;

      case 'PageUp':
        event.preventDefault();
        event.stopPropagation();
        if (itemCount > 0) {
          const jumpSize = Math.min(5, itemCount - 1);
          setSelectedIndex((prev) => Math.max(prev - jumpSize, 0));
        }
        return true;

      case 'Enter':
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        selectCurrentItem();
        return true;

      case ' ': // Space key
        event.preventDefault();
        event.stopPropagation();
        selectCurrentItem();
        return true;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        if (onEscape) {
          onEscape();
        }
        return true;

      default:
        return false;
    }
  }, [selectNext, selectPrevious, selectCurrentItem, onEscape, itemCount, setSelectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    selectCurrentItem,
    handleKeyDown,
  };
}