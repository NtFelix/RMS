"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FolderDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  folderName: string
  folderPath: string
  fileCount: number
  onConfirm: () => Promise<void>
}

export function FolderDeleteConfirmationModal({
  isOpen,
  onClose,
  folderName,
  folderPath,
  fileCount,
  onConfirm
}: FolderDeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Ordner löschen bestätigen
          </DialogTitle>
          <DialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Achtung:</strong> Sie sind dabei, den Ordner "{folderName}" dauerhaft zu löschen.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p><strong>Ordnername:</strong> {folderName}</p>
            <p><strong>Pfad:</strong> {folderPath}</p>
            <p><strong>Anzahl Dateien:</strong> {fileCount === 0 ? 'Leer' : `${fileCount} Datei${fileCount !== 1 ? 'en' : ''}`}</p>
          </div>

          {fileCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Alle {fileCount} Datei{fileCount !== 1 ? 'en' : ''} in diesem Ordner werden ebenfalls dauerhaft gelöscht.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
            <p>Diese Aktion wird:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Den Ordner "{folderName}" dauerhaft löschen</li>
              {fileCount > 0 && <li>Alle {fileCount} Datei{fileCount !== 1 ? 'en' : ''} im Ordner löschen</li>}
              <li>Alle Unterordner und deren Inhalte löschen</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Wird gelöscht...' : 'Dauerhaft löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}