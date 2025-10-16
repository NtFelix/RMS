"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, Trash2 } from "lucide-react"

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemCount = 0,
  isFolder = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemCount?: number
  isFolder?: boolean
}) {
  const itemText = itemCount > 1 ? `${itemCount} ${isFolder ? 'Ordner' : 'Dateien'}` : isFolder ? 'diesen Ordner' : 'diese Datei'
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>Löschen bestätigen</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Möchten Sie wirklich {itemText} unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="mt-2 sm:mt-0"
          >
            Abbrechen
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Endgültig löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
