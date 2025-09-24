'use client'

import React, { useEffect, useCallback } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { BulkOperation } from '@/types/bulk-operations'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  operations?: BulkOperation[]
  position?: 'top' | 'bottom'
  className?: string
}

export function BulkActionBar({ 
  operations = [], 
  position = 'top',
  className 
}: BulkActionBarProps) {
  const { state, clearSelection } = useBulkOperations()
  const { selectedIds } = state
  const selectedCount = selectedIds.size

  // Handle escape key to clear selections
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      clearSelection()
    }
  }, [clearSelection])

  // Add/remove escape key listener
  useEffect(() => {
    if (selectedCount > 0) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [selectedCount, handleEscapeKey])

  // Don't render if no rows are selected
  if (selectedCount === 0) {
    return null
  }

  return (
    <div
      className={cn(
        // Base styles
        "fixed left-1/2 transform -translate-x-1/2 z-50",
        "bg-white border border-gray-200 rounded-lg shadow-lg",
        "px-4 py-3 flex items-center gap-4",
        "min-w-[300px] max-w-[600px]",
        // Animation
        "animate-in slide-in-from-bottom-2 duration-200",
        // Position
        position === 'top' ? "top-4" : "bottom-4",
        className
      )}
      role="toolbar"
      aria-label={`Bulk actions for ${selectedCount} selected items`}
    >
      {/* Selection Counter */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <span>
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      {/* Operations Dropdown */}
      {operations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8"
              disabled={state.isLoading}
            >
              Actions
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {operations.map((operation) => (
              <button
                key={operation.id}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm",
                  "hover:bg-gray-100 focus:bg-gray-100",
                  "focus:outline-none transition-colors",
                  "flex items-center gap-2"
                )}
                onClick={() => {
                  // This will be implemented in later tasks when we add the actual operation handlers
                  console.log(`Executing operation: ${operation.id}`)
                }}
                disabled={state.isLoading}
              >
                {operation.icon && (
                  <operation.icon className="h-4 w-4 text-gray-500" />
                )}
                {operation.label}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clear Selection Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearSelection}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        disabled={state.isLoading}
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Loading Indicator */}
      {state.isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Processing...
        </div>
      )}
    </div>
  )
}