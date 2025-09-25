'use client'

import React from 'react'
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from 'lucide-react'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { cn } from '@/lib/utils'

interface SelectAllCheckboxProps {
  allIds: string[] // IDs of items currently visible (current page in paginated context)
  selectedIds: Set<string>
  disabled?: boolean
  className?: string
}

export function SelectAllCheckbox({ 
  allIds, 
  selectedIds, 
  disabled = false, 
  className 
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
  
  const handleCheckedChange = (checked: boolean) => {
    if (!disabled) {
      // Only select/deselect items from the current page (allIds contains only current page IDs)
      selectAll(allIds)
    }
  }

  // Use indeterminate as the checked state for Radix
  const checkedState = isIndeterminate ? 'indeterminate' : isAllSelected

  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      onClick={handleClick}
    >
      <CheckboxPrimitive.Root
        checked={checkedState}
        onCheckedChange={handleCheckedChange}
        disabled={disabled || state.isLoading || allIds.length === 0}
        aria-label={
          isAllSelected 
            ? "Deselect all rows" 
            : isIndeterminate 
              ? "Select all rows (some selected)" 
              : "Select all rows"
        }
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-md border border-primary ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:scale-110 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50",
          (isAllSelected || isIndeterminate) && "bg-blue-600 border-blue-600 text-white"
        )}
      >
        <CheckboxPrimitive.Indicator
          className="flex items-center justify-center text-current"
        >
          {isIndeterminate ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    </div>
  )
}