"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog" // Assuming this is the path to your existing dialog components
import { Button } from "./button" // Assuming this is the path to your Button component

export type ConfirmationDialogVariant = Extract<
  React.ComponentProps<typeof Button>['variant'],
  'default' | 'destructive'
>

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmationDialogVariant
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Bestätigen",
  cancelText = "Abbrechen",
  variant = "default",
}) => {
  if (!isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        // We don't want this confirmation dialog to trigger another confirmation
        isDirty={false}
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on click outside by default for this specific dialog
        onEscapeKeyDown={onClose} // Allow closing with Escape key
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
