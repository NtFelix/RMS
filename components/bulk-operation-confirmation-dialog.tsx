"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
import { 
  ARIA_LABELS, 
  SCREEN_READER_ANNOUNCEMENTS, 
  KEYBOARD_SHORTCUTS,
  announceToScreenReader 
} from '@/lib/accessibility-constants'

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

  const handleConfirm = useCallback(() => {
    if (isConfirmationValid && !isLoading) {
      onConfirm()
      
      // Announce operation start to screen readers
      if (operation) {
        announceToScreenReader(
          SCREEN_READER_ANNOUNCEMENTS.bulkOperationStarted(operation.label, selectedCount),
          'assertive'
        )
      }
    }
  }, [isConfirmationValid, isLoading, onConfirm, operation, selectedCount])

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onCancel()
      onOpenChange(false)
      
      // Announce cancellation to screen readers
      announceToScreenReader('Bulk-Operation abgebrochen', 'polite')
    }
  }, [isLoading, onCancel, onOpenChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmationValid && !isLoading) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape' && !isLoading) {
      e.preventDefault()
      handleCancel()
    }
  }, [isConfirmationValid, isLoading, handleConfirm, handleCancel])

  if (!operation) return null

  const defaultMessage = customMessage || 
    `Are you sure you want to ${operation.label.toLowerCase()} ${selectedCount} item${selectedCount === 1 ? '' : 's'}?`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
      >
        <DialogHeader>
          <DialogTitle 
            id="confirmation-dialog-title"
            className="flex items-center gap-2"
          >
            {isDestructive && (
              <AlertTriangle 
                className="h-5 w-5 text-amber-500" 
                aria-hidden="true"
              />
            )}
            Bulk-Operation bestätigen
          </DialogTitle>
          <DialogDescription 
            id="confirmation-dialog-description"
            className="text-left"
          >
            {defaultMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* High-impact operation warning */}
          {requiresTypedConfirmation && (
            <Alert 
              className={cn(
                "border-amber-200 bg-amber-50",
                isDestructive && "border-red-200 bg-red-50"
              )}
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Diese Operation betrifft <strong>{selectedCount} Datensätze</strong>. 
                Diese Aktion kann nicht rückgängig gemacht werden. Bitte geben Sie{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                  {REQUIRED_CONFIRMATION_PHRASE}
                </code>{' '}
                ein, um zu bestätigen.
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
                Geben Sie <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                  {REQUIRED_CONFIRMATION_PHRASE}
                </code> ein, um zu bestätigen:
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
                  "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  confirmationText && !isConfirmationValid && "border-red-300 focus:border-red-300"
                )}
                autoFocus
                aria-describedby="confirmation-input-description confirmation-input-error"
                aria-invalid={confirmationText && !isConfirmationValid ? true : false}
              />
              <span 
                id="confirmation-input-description"
                className="sr-only"
              >
                Geben Sie {REQUIRED_CONFIRMATION_PHRASE} genau wie angezeigt ein, um die Operation zu bestätigen.
              </span>
              {confirmationText && !isConfirmationValid && (
                <p 
                  id="confirmation-input-error"
                  className="text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  Bitte geben Sie "{REQUIRED_CONFIRMATION_PHRASE}" genau wie angezeigt ein.
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
            className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={`Abbrechen - ${KEYBOARD_SHORTCUTS.cancelAction}`}
          >
            Abbrechen
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isLoading}
            className={cn(
              "min-w-[100px]",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              isDestructive 
                ? "focus-visible:ring-red-500" 
                : "focus-visible:ring-blue-500"
            )}
            aria-label={`${operation?.label} bestätigen - ${KEYBOARD_SHORTCUTS.confirmAction}`}
            aria-describedby={!isConfirmationValid ? "confirmation-validation-error" : undefined}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                <span>Verarbeitung...</span>
              </>
            ) : (
              `${operation?.label} bestätigen`
            )}
          </Button>
          
          {/* Hidden validation error for screen readers */}
          {!isConfirmationValid && requiresTypedConfirmation && (
            <span 
              id="confirmation-validation-error"
              className="sr-only"
            >
              Bestätigung erforderlich. Geben Sie {REQUIRED_CONFIRMATION_PHRASE} ein, um fortzufahren.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}