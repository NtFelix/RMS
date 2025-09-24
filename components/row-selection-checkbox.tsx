'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { cn } from '@/lib/utils'

interface RowSelectionCheckboxProps {
  rowId: string
  disabled?: boolean
  className?: string
}

export function RowSelectionCheckbox({ 
  rowId, 
  disabled = false, 
  className 
}: RowSelectionCheckboxProps) {
  const { state, selectRow } = useBulkOperations()
  
  const isSelected = state.selectedIds.has(rowId)
  
  const handleClick = (event: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering row click handlers
    event.stopPropagation()
  }
  
  const handleCheckedChange = (checked: boolean) => {
    if (!disabled) {
      selectRow(rowId)
    }
  }

  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      onClick={handleClick}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleCheckedChange}
        disabled={disabled || state.isLoading}
        aria-label={`Select row ${rowId}`}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
    </div>
  )
}