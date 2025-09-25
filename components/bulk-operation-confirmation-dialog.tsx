"use client"

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { BulkOperation } from '@/types/bulk-operations'

interface BulkOperationConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operation: BulkOperation | null
  selectedCount: number
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
  customMessage?: string
  affectedItems?: string[]
}

const CONFIRMATION_THRESHOLD = 10
const REQUIRED_CONFIRMATION_PHRASE = "CONFIRM"

export function BulkOperationConfirmationDialog({
  open,
  onOpenChange,
  operation,
  selectedCount,
  isLoading = false,
  onConfirm,
  onCancel,
  customMessage,
  affectedItems = []
}: BulkOperationConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")
  const [isConfirmationValid, setIsConfirmationValid] = useState(false)

  const requiresTypedConfirmation = selectedCount > CONFIRMATION_THRESHOLD
  const isDestructive = operation?.destructive || false

  // Reset confirmation text when dialog opens/closes or operation changes
  useEffect(() => {
    if (!open || !operation) {
      setConfirmationText("")
      setIsConfirmationValid(false)
    }
  }, [open, operation])

  // Validate confirmation text
  useEffect(() => {
    if (requiresTypedConfirmation) {
      setIsConfirmationValid(confirmationText.trim().toUpperCase() === REQUIRED_CONFIRMATION_PHRASE)
    } else {
      setIsConfirmationValid(true)
    }
  }, [confirmationText, requiresTypedConfirmation])

  const handleConfirm = () => {
    if (isConfirmationValid && !isLoading) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onCancel()
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmationValid && !isLoading) {
      handleConfirm()
    } else if (e.key === 'Escape' && !isLoading) {
      handleCancel()
    }
  }

  if (!operation) return null

  const defaultMessage = customMessage || 
    `Are you sure you want to ${operation.label.toLowerCase()} ${selectedCount} item${selectedCount === 1 ? '' : 's'}?`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDestructive && (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Confirm Bulk Operation
          </DialogTitle>
          <DialogDescription className="text-left">
            {defaultMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* High-impact operation warning */}
          {requiresTypedConfirmation && (
            <Alert className={cn(
              "border-amber-200 bg-amber-50",
              isDestructive && "border-red-200 bg-red-50"
            )}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation will affect <strong>{selectedCount} records</strong>. 
                This action cannot be undone. Please type{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                  {REQUIRED_CONFIRMATION_PHRASE}
                </code>{' '}
                to confirm.
              </AlertDescription>
            </Alert>
          )}

          {/* Show affected items preview for smaller operations */}
          {!requiresTypedConfirmation && affectedItems.length > 0 && affectedItems.length <= 5 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Affected items:</Label>
              <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {affectedItems.map((item, index) => (
                    <li key={index} className="text-gray-700">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Typed confirmation input */}
          {requiresTypedConfirmation && (
            <div className="space-y-2">
              <Label htmlFor="confirmation-input" className="text-sm font-medium">
                Type <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                  {REQUIRED_CONFIRMATION_PHRASE}
                </code> to confirm:
              </Label>
              <Input
                id="confirmation-input"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={REQUIRED_CONFIRMATION_PHRASE}
                disabled={isLoading}
                className={cn(
                  "font-mono",
                  confirmationText && !isConfirmationValid && "border-red-300 focus:border-red-300"
                )}
                autoFocus
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-sm text-red-600">
                  Please type "{REQUIRED_CONFIRMATION_PHRASE}" exactly as shown.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Confirm ${operation.label}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}