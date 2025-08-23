"use client"

import { useState } from "react"
import { 
  Download, 
  Trash2, 
  RotateCcw, 
  Eye, 
  FileText,
  Image as ImageIcon,
  File
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"
import { useCloudStorageOperations, useCloudStoragePreview, useCloudStorageArchive } from "@/hooks/use-cloud-storage-store"
import { useToast } from "@/hooks/use-toast"
import { reconstructOriginalPath } from "@/lib/path-utils"
import type { StorageObject } from "@/hooks/use-cloud-storage-store"

interface ArchiveFileContextMenuProps {
  file: StorageObject
  children: React.ReactNode
}

export function ArchiveFileContextMenu({ file, children }: ArchiveFileContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const { toast } = useToast()
  
  const { downloadFile, isOperationInProgress } = useCloudStorageOperations()
  const { openPreview } = useCloudStoragePreview()
  const { restoreFile, permanentlyDeleteFile } = useCloudStorageArchive()

  // Get file type for icon display
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <ImageIcon className="h-4 w-4" />
    }
    
    if (['pdf', 'doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-4 w-4" />
    }
    
    return <File className="h-4 w-4" />
  }

  // Check if file can be previewed
  const canPreview = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(extension || '')
  }

  const handleDownload = async () => {
    try {
      await downloadFile(file)
      toast({
        title: "Download gestartet",
        description: `${file.name} wird heruntergeladen.`,
      })
    } catch (error) {
      toast({
        title: "Download fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handleRestore = async () => {
    try {
      const originalPath = reconstructOriginalPath(file.name)
      await restoreFile(file, originalPath || undefined)
      toast({
        title: "Datei wiederhergestellt",
        description: `${file.name} wurde erfolgreich wiederhergestellt.`,
      })
    } catch (error) {
      toast({
        title: "Wiederherstellung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async () => {
    try {
      await permanentlyDeleteFile(file)
      toast({
        title: "Datei dauerhaft gelöscht",
        description: `${file.name} wurde dauerhaft gelöscht.`,
      })
    } catch (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handlePreview = () => {
    if (canPreview(file.name)) {
      openPreview(file)
    } else {
      toast({
        title: "Vorschau nicht verfügbar",
        description: "Dieser Dateityp kann nicht in der Vorschau angezeigt werden.",
        variant: "destructive",
      })
    }
  }

  const originalPath = reconstructOriginalPath(file.name)

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {canPreview(file.name) && (
            <>
              <ContextMenuItem onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                Vorschau anzeigen
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          
          <ContextMenuItem 
            onClick={handleDownload}
            disabled={isOperationInProgress}
          >
            <Download className="mr-2 h-4 w-4" />
            Herunterladen
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={() => setShowRestoreDialog(true)}
            disabled={isOperationInProgress}
            className="text-blue-600 focus:text-blue-600"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Wiederherstellen
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            disabled={isOperationInProgress}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Dauerhaft löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmationAlertDialog
        isOpen={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onConfirm={handleRestore}
        title="Datei wiederherstellen"
        description={
          <>
            Möchten Sie die Datei <strong>{file.name.split('/').pop()}</strong> wirklich wiederherstellen?
            <br /><br />
            {originalPath ? (
              <span className="text-sm text-muted-foreground">
                Die Datei wird an den ursprünglichen Ort wiederhergestellt: <br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{originalPath}</code>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Der ursprüngliche Pfad konnte nicht ermittelt werden. Die Datei wird im Hauptverzeichnis wiederhergestellt.
              </span>
            )}
          </>
        }
        confirmButtonText="Wiederherstellen"
        confirmButtonVariant="default"
        cancelButtonText="Abbrechen"
      />

      <ConfirmationAlertDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handlePermanentDelete}
        title="Datei dauerhaft löschen"
        description={
          <>
            Möchten Sie die Datei <strong>{file.name.split('/').pop()}</strong> wirklich dauerhaft löschen?
            <br /><br />
            <span className="text-sm text-destructive font-medium">
              ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
            </span>
            <br />
            <span className="text-sm text-muted-foreground">
              Die Datei wird vollständig aus dem System entfernt.
            </span>
          </>
        }
        confirmButtonText="Dauerhaft löschen"
        confirmButtonVariant="destructive"
        cancelButtonText="Abbrechen"
      />
    </>
  )
}