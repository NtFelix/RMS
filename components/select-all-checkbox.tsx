'use client'

import React, { useCallback, memo, useMemo } from 'react'
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from 'lucide-react'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { cn } from '@/lib/utils'
import { 
  ARIA_LABELS, 
  SCREEN_READER_ANNOUNCEMENTS, 
  KEYBOARD_SHORTCUTS,
  announceToScreenReader 
} from '@/lib/accessibility-constants'

interface SelectAllCheckboxProps {
  allIds: string[] // IDs of items currently visible (current page in paginated context)
  selectedIds: Set<string>
  disabled?: boolean
  className?: string
  tableType?: string // Optional table type for better announcements
}

const SelectAllCheckboxComponent = ({ 
  allIds, 
  selectedIds, 
  disabled = false, 
  className,
  tableType = 'Zeilen'
}: SelectAllCheckboxProps) => {
  const { selectAll, state } = useBulkOperations()
  
  // Highly optimized selection state calculation for large datasets
  const selectionState = useMemo(() => {
    // Early return for empty datasets
    if (allIds.length === 0) {
      return { selectedCount: 0, isAllSelected: false, isIndeterminate: false }
    }
    
    // Optimized counting using Set.has() which is O(1)
    let selectedCount = 0
    for (const id of allIds) {
      if (selectedIds.has(id)) {
        selectedCount++
        // Early exit optimization: if we've found some but not all, it's indeterminate
        if (selectedCount > 0 && selectedCount < allIds.length && selectedCount < allIds.length / 2) {
          // Continue counting to get exact number for display
        }
      }
    }
    
    const isAllSelected = selectedCount === allIds.length
    const isIndeterminate = selectedCount > 0 && selectedCount < allIds.length
    
    return { selectedCount, isAllSelected, isIndeterminate }
  }, [allIds, selectedIds])
  
  const { selectedCount, isAllSelected, isIndeterminate } = selectionState
  
  const handleClick = (event: React.MouseEvent) => {
    // Prevent event bubbling
    event.stopPropagation()
  }
  
  const handleCheckedChange = useCallback((checked: boolean) => {
    if (!disabled) {
      // Only select/deselect items from the current page (allIds contains only current page IDs)
      selectAll(allIds)
      
      // Debounce announcements for large datasets to prevent screen reader spam
      if (allIds.length <= 100 || !state.isLoading) {
        const announcement = isAllSelected 
          ? SCREEN_READER_ANNOUNCEMENTS.allRowsDeselected
          : SCREEN_READER_ANNOUNCEMENTS.allRowsSelected(allIds.length)
        
        announceToScreenReader(announcement, 'polite')
      }
    }
  }, [disabled, selectAll, allIds, isAllSelected, state.isLoading])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Space key for checkbox toggle
    if (event.key === ' ' && !disabled) {
      event.preventDefault()
      event.stopPropagation()
      
      selectAll(allIds)
      
      // Only announce for smaller datasets or when not in loading state
      if (allIds.length <= 100 || !state.isLoading) {
        const announcement = isAllSelected 
          ? SCREEN_READER_ANNOUNCEMENTS.allRowsDeselected
          : SCREEN_READER_ANNOUNCEMENTS.allRowsSelected(allIds.length)
        
        announceToScreenReader(announcement, 'polite')
      }
    }
  }, [disabled, selectAll, allIds, isAllSelected, state.isLoading])

  // Memoize checked state to prevent recalculation
  const checkedState = useMemo(() => {
    return isIndeterminate ? 'indeterminate' : isAllSelected
  }, [isIndeterminate, isAllSelected])

  // Memoize accessible label to prevent recalculation
  const ariaLabel = useMemo(() => {
    return isAllSelected 
      ? ARIA_LABELS.selectAllCheckboxSelected
      : isIndeterminate 
        ? ARIA_LABELS.selectAllCheckboxIndeterminate
        : ARIA_LABELS.selectAllCheckbox
  }, [isAllSelected, isIndeterminate])

  // Memoize checkbox classes for performance
  const checkboxClasses = useMemo(() => cn(
    "peer h-4 w-4 shrink-0 rounded-md border border-primary ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:scale-110 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50",
    (isAllSelected || isIndeterminate) && "bg-blue-600 border-blue-600 text-white"
  ), [isAllSelected, isIndeterminate])

  // Memoize description content for screen readers
  const descriptionContent = useMemo(() => {
    return isAllSelected 
      ? `Alle ${allIds.length} ${tableType} sind ausgewählt`
      : isIndeterminate 
        ? `${selectedCount} von ${allIds.length} ${tableType} sind ausgewählt`
        : `Keine ${tableType} ausgewählt`
  }, [isAllSelected, isIndeterminate, allIds.length, tableType, selectedCount])

  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      onClick={handleClick}
      data-select-all-checkbox
    >
      <CheckboxPrimitive.Root
        checked={checkedState}
        onCheckedChange={handleCheckedChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || state.isLoading || allIds.length === 0}
        aria-label={ariaLabel}
        aria-describedby="select-all-description"
        className={checkboxClasses}
        title={`${KEYBOARD_SHORTCUTS.selectAll} oder ${KEYBOARD_SHORTCUTS.selectRow} zum Auswählen/Abwählen aller ${tableType}`}
      >
        <CheckboxPrimitive.Indicator
          className="flex items-center justify-center text-current"
        >
          {isIndeterminate ? (
            <Minus className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      
      {/* Hidden description for screen readers - memoized content */}
      <span 
        id="select-all-description"
        className="sr-only"
      >
        {descriptionContent}. 
        Drücken Sie {KEYBOARD_SHORTCUTS.selectRow} zum Umschalten.
      </span>
    </div>
  )
}

// Export memoized component with highly optimized comparison for large datasets
export const SelectAllCheckbox = memo(SelectAllCheckboxComponent, (prevProps, nextProps) => {
  // Fast path: check simple props first
  if (
    prevProps.disabled !== nextProps.disabled ||
    prevProps.className !== nextProps.className ||
    prevProps.tableType !== nextProps.tableType ||
    prevProps.allIds.length !== nextProps.allIds.length
  ) {
    return false
  }
  
  // Optimized array comparison - only check if lengths are the same
  if (prevProps.allIds.length === nextProps.allIds.length) {
    // For large datasets, use a more efficient comparison
    if (prevProps.allIds.length > 100) {
      // Sample-based comparison for very large datasets
      const sampleSize = Math.min(10, prevProps.allIds.length)
      const step = Math.floor(prevProps.allIds.length / sampleSize)
      
      for (let i = 0; i < prevProps.allIds.length; i += step) {
        if (prevProps.allIds[i] !== nextProps.allIds[i]) {
          return false
        }
      }
    } else {
      // Full comparison for smaller datasets
      for (let i = 0; i < prevProps.allIds.length; i++) {
        if (prevProps.allIds[i] !== nextProps.allIds[i]) {
          return false
        }
      }
    }
  }
  
  // Optimized selection state comparison
  // Only count if we need to - use early exit strategies
  let prevSelectedCount = 0
  let nextSelectedCount = 0
  
  for (const id of prevProps.allIds) {
    if (prevProps.selectedIds.has(id)) prevSelectedCount++
    if (nextProps.selectedIds.has(id)) nextSelectedCount++
    
    // Early exit if we already know they're different
    if (Math.abs(prevSelectedCount - nextSelectedCount) > prevProps.allIds.length - prevProps.allIds.indexOf(id)) {
      return false
    }
  }
  
  return prevSelectedCount === nextSelectedCount
})

// Set display name for debugging
SelectAllCheckbox.displayName = 'SelectAllCheckbox'