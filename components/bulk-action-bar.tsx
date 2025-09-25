'use client'

import React, { useEffect, useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { BulkOperation, ValidationResult } from '@/types/bulk-operations'
import { BulkOperationDropdown } from './bulk-operation-dropdown'
import { BulkValidationFeedback } from './bulk-validation-feedback'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  operations?: BulkOperation[]
  position?: 'top' | 'bottom'
  className?: string
  getAffectedItemsPreview?: (selectedIds: string[]) => string[]
}

export function BulkActionBar({ 
  operations = [], 
  position = 'top',
  className,
  getAffectedItemsPreview
}: BulkActionBarProps) {
  const { state, clearSelection, performBulkOperation, validateOperation } = useBulkOperations()
  const { selectedIds, tableType } = state
  const selectedCount = selectedIds.size
  
  // Confirmation dialog state
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [affectedItems, setAffectedItems] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [operationData, setOperationData] = useState<any>(null)

  // Handle escape key to clear selections
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showConfirmation) {
        setShowConfirmation(false)
        setSelectedOperation(null)
      } else {
        clearSelection()
      }
    }
  }, [clearSelection, showConfirmation])

  // Add/remove escape key listener
  useEffect(() => {
    if (selectedCount > 0 || showConfirmation) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [selectedCount, showConfirmation, handleEscapeKey])

  // Handle operation selection
  const handleOperationSelect = useCallback(async (operation: BulkOperation) => {
    setSelectedOperation(operation)
    setOperationData(null)
    setValidationResult(null)
    
    // Get affected items preview if function is provided
    if (getAffectedItemsPreview) {
      const selectedIdsArray = Array.from(selectedIds)
      const preview = getAffectedItemsPreview(selectedIdsArray)
      setAffectedItems(preview)
    }
    
    // Perform initial validation
    if (tableType) {
      try {
        const result = await validateOperation(operation)
        setValidationResult(result)
      } catch (error) {
        console.error('Initial validation failed:', error)
      }
    }
    
    // Always show confirmation for operations with custom components
    setShowConfirmation(true)
  }, [selectedIds, getAffectedItemsPreview, tableType, validateOperation])

  // Handle operation confirmation with data from the component
  const handleConfirmOperation = useCallback(async (data?: any) => {
    if (!selectedOperation) return
    
    setIsExecuting(true)
    
    try {
      await performBulkOperation(selectedOperation, data || {})
      setShowConfirmation(false)
      setSelectedOperation(null)
      setAffectedItems([])
      setValidationResult(null)
      setOperationData(null)
    } catch (error) {
      console.error('Bulk operation failed:', error)
      // Error handling is managed by the context
    } finally {
      setIsExecuting(false)
    }
  }, [selectedOperation, performBulkOperation])

  // Handle data changes from operation components
  const handleDataChange = useCallback((data: any) => {
    setOperationData(data)
  }, [])

  // Handle operation cancellation
  const handleCancelOperation = useCallback(() => {
    setShowConfirmation(false)
    setSelectedOperation(null)
    setAffectedItems([])
    setIsExecuting(false)
    setValidationResult(null)
    setOperationData(null)
  }, [])

  // Handle validation result changes
  const handleValidationChange = useCallback((result: ValidationResult | null) => {
    setValidationResult(result)
  }, [])

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
        <BulkOperationDropdown
          operations={operations}
          selectedCount={selectedCount}
          isLoading={state.isLoading || isExecuting}
          onOperationSelect={handleOperationSelect}
        />
      )}

      {/* Clear Selection Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearSelection}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        disabled={state.isLoading || isExecuting}
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Loading Indicator */}
      {(state.isLoading || isExecuting) && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Processing...
        </div>
      )}

      {/* Operation Dialog */}
      {selectedOperation && (
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="sm:max-w-2xl">
            <div className="space-y-4">
              {/* Validation Feedback */}
              <BulkValidationFeedback
                operation={selectedOperation}
                selectedIds={Array.from(selectedIds)}
                tableType={tableType}
                operationData={operationData}
                onValidationChange={handleValidationChange}
              />
              
              {/* Operation Component */}
              <selectedOperation.component
                selectedIds={Array.from(selectedIds)}
                onConfirm={handleConfirmOperation}
                onCancel={handleCancelOperation}
                onDataChange={handleDataChange}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}