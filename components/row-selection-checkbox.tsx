'use client'

import React, { useCallback } from 'react'
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

export function RowSelectionCheckbox({ 
  rowId, 
  disabled = false, 
  className,
  rowLabel
}: RowSelectionCheckboxProps) {
  const { state, selectRow } = useBulkOperations()
  
  const isSelected = state.selectedIds.has(rowId)
  
  const handleClick = (event: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering row click handlers
    event.stopPropagation()
  }
  
  const handleCheckedChange = useCallback((checked: boolean) => {
    if (!disabled) {
      selectRow(rowId)
      
      // Announce selection change to screen readers
      const displayLabel = rowLabel || rowId
      const announcement = checked 
        ? SCREEN_READER_ANNOUNCEMENTS.rowSelected(displayLabel)
        : SCREEN_READER_ANNOUNCEMENTS.rowDeselected(displayLabel)
      
      announceToScreenReader(announcement, 'polite')
    }
  }, [disabled, selectRow, rowId, rowLabel])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Space key for checkbox toggle
    if (event.key === ' ' && !disabled) {
      event.preventDefault()
      event.stopPropagation()
      selectRow(rowId)
      
      const displayLabel = rowLabel || rowId
      const announcement = !isSelected 
        ? SCREEN_READER_ANNOUNCEMENTS.rowSelected(displayLabel)
        : SCREEN_READER_ANNOUNCEMENTS.rowDeselected(displayLabel)
      
      announceToScreenReader(announcement, 'polite')
    }
  }, [disabled, selectRow, rowId, rowLabel, isSelected])

  // Generate accessible label
  const ariaLabel = rowLabel 
    ? `${isSelected ? 'Abwählen' : 'Auswählen'} ${rowLabel}`
    : ARIA_LABELS.rowSelectionCheckbox(rowId)

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
        aria-describedby={`row-${rowId}-description`}
        className={cn(
          "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "transition-all duration-200"
        )}
        title={`${KEYBOARD_SHORTCUTS.selectRow} zum Auswählen/Abwählen`}
      />
      
      {/* Hidden description for screen readers */}
      <span 
        id={`row-${rowId}-description`}
        className="sr-only"
      >
        {isSelected ? 'Ausgewählt' : 'Nicht ausgewählt'}. 
        Drücken Sie {KEYBOARD_SHORTCUTS.selectRow} zum Umschalten.
      </span>
    </div>
  )
}