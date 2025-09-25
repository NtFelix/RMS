'use client'

import React, { useCallback, memo, useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { cn } from '@/lib/utils'
import { 
  ARIA_LABELS, 
  SCREEN_READER_ANNOUNCEMENTS, 
  KEYBOARD_SHORTCUTS,
  announceToScreenReader 
} from '@/lib/accessibility-constants'

interface RowSelectionCheckboxProps {
  rowId: string
  disabled?: boolean
  className?: string
  rowLabel?: string // Optional human-readable label for the row
}

// Optimized component for large datasets - prevents unnecessary re-renders
const RowSelectionCheckboxComponent = ({ 
  rowId, 
  disabled = false, 
  className,
  rowLabel
}: RowSelectionCheckboxProps) => {
  const { state, selectRow } = useBulkOperations()
  
  // Memoize selection state to prevent recalculation
  const isSelected = useMemo(() => state.selectedIds.has(rowId), [state.selectedIds, rowId])
  
  // Memoize event handlers to prevent recreation on every render
  const handleClick = useCallback((event: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering row click handlers
    event.stopPropagation()
  }, [])
  
  const handleCheckedChange = useCallback((checked: boolean) => {
    if (!disabled) {
      selectRow(rowId)
      
      // Use the current selection state (inverted) for announcements since selectRow toggles
      const displayLabel = rowLabel || rowId
      const willBeSelected = !isSelected
      const announcement = willBeSelected
        ? SCREEN_READER_ANNOUNCEMENTS.rowSelected(displayLabel)
        : SCREEN_READER_ANNOUNCEMENTS.rowDeselected(displayLabel)
      
      // Only announce if not in batch mode (to prevent announcement spam)
      if (!state.isLoading) {
        announceToScreenReader(announcement, 'polite')
      }
    }
  }, [disabled, selectRow, rowId, rowLabel, isSelected, state.isLoading])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Space key for checkbox toggle
    if (event.key === ' ' && !disabled) {
      event.preventDefault()
      event.stopPropagation()
      
      selectRow(rowId)
      
      const displayLabel = rowLabel || rowId
      const willBeSelected = !isSelected
      const announcement = willBeSelected
        ? SCREEN_READER_ANNOUNCEMENTS.rowSelected(displayLabel)
        : SCREEN_READER_ANNOUNCEMENTS.rowDeselected(displayLabel)
      
      if (!state.isLoading) {
        announceToScreenReader(announcement, 'polite')
      }
    }
  }, [disabled, selectRow, rowId, rowLabel, isSelected, state.isLoading])

  // Memoize accessible label to prevent recalculation
  const ariaLabel = useMemo(() => {
    return rowLabel 
      ? `${isSelected ? 'Abwählen' : 'Auswählen'} ${rowLabel}`
      : ARIA_LABELS.rowSelectionCheckbox(rowId)
  }, [rowLabel, isSelected, rowId])

  // Memoize description ID to prevent string concatenation on every render
  const descriptionId = useMemo(() => `row-${rowId}-description`, [rowId])

  // Memoize checkbox classes to prevent recalculation
  const checkboxClasses = useMemo(() => cn(
    "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
    "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    "transition-all duration-200"
  ), [])

  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      onClick={handleClick}
      data-row-selection-checkbox
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleCheckedChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || state.isLoading}
        aria-label={ariaLabel}
        aria-describedby={descriptionId}
        className={checkboxClasses}
        title={`${KEYBOARD_SHORTCUTS.selectRow} zum Auswählen/Abwählen`}
      />
      
      {/* Hidden description for screen readers - memoized content */}
      <span 
        id={descriptionId}
        className="sr-only"
      >
        {isSelected ? 'Ausgewählt' : 'Nicht ausgewählt'}. 
        Drücken Sie {KEYBOARD_SHORTCUTS.selectRow} zum Umschalten.
      </span>
    </div>
  )
}

// Export memoized component with optimized comparison function for large datasets
export const RowSelectionCheckbox = memo(RowSelectionCheckboxComponent, (prevProps, nextProps) => {
  // Optimized comparison for large datasets - only re-render if props actually change
  // This prevents unnecessary re-renders when parent components update
  return (
    prevProps.rowId === nextProps.rowId &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className &&
    prevProps.rowLabel === nextProps.rowLabel
  )
})

// Set display name for debugging
RowSelectionCheckbox.displayName = 'RowSelectionCheckbox'