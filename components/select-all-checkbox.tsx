'use client'

import React, { useCallback } from 'react'
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

export function SelectAllCheckbox({ 
  allIds, 
  selectedIds, 
  disabled = false, 
  className,
  tableType = 'Zeilen'
}: SelectAllCheckboxProps) {
  const { selectAll, state } = useBulkOperations()
  
  // Calculate selection state for current page only
  const selectedCount = allIds.filter(id => selectedIds.has(id)).length
  const isAllSelected = selectedCount === allIds.length && allIds.length > 0
  const isIndeterminate = selectedCount > 0 && selectedCount < allIds.length
  
  const handleClick = (event: React.MouseEvent) => {
    // Prevent event bubbling
    event.stopPropagation()
  }
  
  const handleCheckedChange = useCallback((checked: boolean) => {
    if (!disabled) {
      // Only select/deselect items from the current page (allIds contains only current page IDs)
      selectAll(allIds)
      
      // Announce selection change to screen readers
      const announcement = isAllSelected 
        ? SCREEN_READER_ANNOUNCEMENTS.allRowsDeselected
        : SCREEN_READER_ANNOUNCEMENTS.allRowsSelected(allIds.length)
      
      announceToScreenReader(announcement, 'polite')
    }
  }, [disabled, selectAll, allIds, isAllSelected])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle Space key for checkbox toggle
    if (event.key === ' ' && !disabled) {
      event.preventDefault()
      event.stopPropagation()
      selectAll(allIds)
      
      const announcement = isAllSelected 
        ? SCREEN_READER_ANNOUNCEMENTS.allRowsDeselected
        : SCREEN_READER_ANNOUNCEMENTS.allRowsSelected(allIds.length)
      
      announceToScreenReader(announcement, 'polite')
    }
  }, [disabled, selectAll, allIds, isAllSelected])

  // Use indeterminate as the checked state for Radix
  const checkedState = isIndeterminate ? 'indeterminate' : isAllSelected

  // Generate accessible label based on current state
  const ariaLabel = isAllSelected 
    ? ARIA_LABELS.selectAllCheckboxSelected
    : isIndeterminate 
      ? ARIA_LABELS.selectAllCheckboxIndeterminate
      : ARIA_LABELS.selectAllCheckbox

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
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-md border border-primary ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:scale-110 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50",
          (isAllSelected || isIndeterminate) && "bg-blue-600 border-blue-600 text-white"
        )}
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
      
      {/* Hidden description for screen readers */}
      <span 
        id="select-all-description"
        className="sr-only"
      >
        {isAllSelected 
          ? `Alle ${allIds.length} ${tableType} sind ausgewählt`
          : isIndeterminate 
            ? `${selectedCount} von ${allIds.length} ${tableType} sind ausgewählt`
            : `Keine ${tableType} ausgewählt`
        }. 
        Drücken Sie {KEYBOARD_SHORTCUTS.selectRow} zum Umschalten.
      </span>
    </div>
  )
}