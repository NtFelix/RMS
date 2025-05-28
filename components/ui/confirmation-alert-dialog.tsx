"use client"; // Required for event handlers and stateful logic (even if passed from parent)

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Not used directly as dialog is controlled by isOpen prop
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button"; // For potential destructive styling

interface ConfirmationAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: "default" | "destructive"; // Retained for logic, applied via className
}

export function ConfirmationAlertDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  confirmButtonVariant = "default", // Default to 'default'
}: ConfirmationAlertDialogProps) {
  
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false); // Close dialog after confirmation
  };

  const handleCancel = () => {
    onOpenChange(false); // Close dialog on cancel
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelButtonText || "Abbrechen"}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            // Apply destructive styling if variant is 'destructive'
            // This uses buttonVariants from ui/button to get the correct classes
            className={confirmButtonVariant === 'destructive' ? buttonVariants({ variant: 'destructive' }) : ''}
          >
            {confirmButtonText || "Bestätigen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationAlertDialog;
