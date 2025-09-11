"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TemplatesManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplatesManagementModal({ open, onOpenChange }: TemplatesManagementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full">
        <DialogHeader>
          <DialogTitle>Vorlagen verwalten</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Templates management modal - to be implemented</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}