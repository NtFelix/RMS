"use client"

import { useState } from "react"
import { 
  Download, 
  Trash2, 
  Edit3, 
  Move, 
  Eye, 
  FileText,
  Image as ImageIcon,
  File,
  Archive
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
import type { StorageObject } from "@/hooks/use-cloud-storage-store"

interface FileContextMenuProps {
  file: StorageObject
  children: React.ReactNode
  showArchiveOption?: boolean
}

export function FileContextMenu({ file, children, showArchiveOption = true }: FileContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()
  
  const {
    downloadFile,
    deleteFile,
    isOperationInProgress,
  } = useCloudStorageOperations()
  
  const { openPreview } = useCloudStoragePreview()
  const { archiveFile, openArchiveView } = useCloudStorageArchive()

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

  const handleDelete = async () => {
    try {
      await deleteFile(file)
      toast({
        title: "Datei gelöscht",
        description: `${file.name} wurde erfolgreich gelöscht.`,
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
            disabled={true} // TODO: Implement rename functionality in future
            className="text-muted-foreground"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Umbenennen (bald verfügbar)
          </ContextMenuItem>
          
          <ContextMenuItem 
            disabled={true} // TODO: Implement move functionality in future
            className="text-muted-foreground"
          >
            <Move className="mr-2 h-4 w-4" />
            Verschieben (bald verfügbar)
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {showArchiveOption && (
            <ContextMenuItem onClick={openArchiveView}>
              <Archive className="mr-2 h-4 w-4" />
              Archiv öffnen
            </ContextMenuItem>
          )}
          
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            disabled={isOperationInProgress}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Endgültig löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmationAlertDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Datei löschen"
        description={
          <>
            Möchten Sie die Datei <strong>{file.name}</strong> wirklich dauerhaft löschen?
            <br /><br />
            <span className="text-sm text-muted-foreground">
              Diese Aktion kann nicht rückgängig gemacht werden. Die Datei wird dauerhaft aus dem System entfernt.
            </span>
          </>
        }
        confirmButtonText="Endgültig löschen"
        confirmButtonVariant="destructive"
        cancelButtonText="Abbrechen"
      />
    </>
  )
}