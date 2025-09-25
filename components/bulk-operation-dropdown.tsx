"use client"

import React, { useCallback } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BulkOperation } from '@/types/bulk-operations'
import { cn } from '@/lib/utils'
import { 
  ARIA_LABELS, 
  KEYBOARD_SHORTCUTS,
  announceToScreenReader 
} from '@/lib/accessibility-constants'

interface BulkOperationDropdownProps {
  operations: BulkOperation[]
  selectedCount: number
  isLoading?: boolean
  onOperationSelect: (operation: BulkOperation) => void
  className?: string
}

export function BulkOperationDropdown({
  operations,
  selectedCount,
  isLoading = false,
  onOperationSelect,
  className
}: BulkOperationDropdownProps) {
  const availableOperations = operations.filter(op => !op.disabled)
  const hasOperations = availableOperations.length > 0

  const handleOperationSelect = useCallback((operation: BulkOperation) => {
    onOperationSelect(operation)
    
    // Announce operation selection to screen readers
    announceToScreenReader(
      `${operation.label} für ${selectedCount} Elemente ausgewählt`,
      'polite'
    )
  }, [onOperationSelect, selectedCount])

  if (!hasOperations) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || selectedCount === 0}
          className={cn(
            "h-8 gap-2 text-sm font-medium",
            "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            className
          )}
          aria-label={ARIA_LABELS.bulkOperationsDropdownTrigger}
          aria-describedby="bulk-operations-description"
          title={`${KEYBOARD_SHORTCUTS.openBulkActions} zum Öffnen der Bulk-Aktionen`}
          data-bulk-operations-dropdown
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Verarbeitung...</span>
            </>
          ) : (
            <>
              <span>Bulk-Aktionen</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-48"
        role="menu"
        aria-label={ARIA_LABELS.bulkOperationsDropdown}
      >
        {availableOperations.map((operation) => {
          const IconComponent = operation.icon
          
          return (
            <DropdownMenuItem
              key={operation.id}
              onClick={() => handleOperationSelect(operation)}
              disabled={operation.disabled}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                "focus:bg-blue-50 focus:text-blue-900",
                operation.destructive && "text-red-600 focus:text-red-600 focus:bg-red-50"
              )}
              role="menuitem"
              aria-describedby={operation.disabled ? `${operation.id}-disabled-reason` : undefined}
              data-bulk-operation-button={operation.id}
            >
              {IconComponent && (
                <IconComponent className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{operation.label}</span>
              {operation.disabled && operation.disabledReason && (
                <>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {operation.disabledReason}
                  </span>
                  <span 
                    id={`${operation.id}-disabled-reason`}
                    className="sr-only"
                  >
                    Nicht verfügbar: {operation.disabledReason}
                  </span>
                </>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
      
      {/* Hidden description for screen readers */}
      <span 
        id="bulk-operations-description"
        className="sr-only"
      >
        Wählen Sie eine Aktion für {selectedCount} ausgewählte Elemente. 
        Verwenden Sie die Pfeiltasten zur Navigation und {KEYBOARD_SHORTCUTS.selectItem} zur Auswahl.
      </span>
    </DropdownMenu>
  )
}