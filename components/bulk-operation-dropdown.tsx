"use client"

import React from 'react'
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
            className
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Bulk Actions
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {availableOperations.map((operation) => {
          const IconComponent = operation.icon
          
          return (
            <DropdownMenuItem
              key={operation.id}
              onClick={() => onOperationSelect(operation)}
              disabled={operation.disabled}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                operation.destructive && "text-red-600 focus:text-red-600"
              )}
            >
              {IconComponent && (
                <IconComponent className="h-4 w-4" />
              )}
              <span>{operation.label}</span>
              {operation.disabled && operation.disabledReason && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {operation.disabledReason}
                </span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}