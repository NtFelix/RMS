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
import { FileRenameModal } from "@/components/file-rename-modal"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import type { StorageObject } from "@/hooks/use-cloud-storage-store"

interface FileContextMenuProps {
  file: StorageObject
  children: React.ReactNode
  showArchiveOption?: boolean
  currentPath?: string
  userId?: string
}

export function FileContextMenu({
  file,
  children,
  showArchiveOption = true,
  currentPath,
  userId
}: FileContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const { toast } = useToast()

  const {
    downloadFile,
    deleteFile,
    renameFile,
    moveFile,
    isOperationInProgress,
  } = useCloudStorageOperations()

  const { openPreview } = useCloudStoragePreview()
  const { archiveFile, openArchiveView } = useCloudStorageArchive()
  const { openFileMoveModal, openMarkdownEditorModal } = useModalStore()

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
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'md'].includes(extension || '')
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
      const fileExtension = file.name.split('.').pop()?.toLowerCase()

      // Open markdown editor for .md files
      if (fileExtension === 'md' && currentPath) {
        openMarkdownEditorModal({
          filePath: currentPath,
          fileName: file.name,
          isNewFile: false
        })
      } else {
        openPreview(file)
      }
    } else {
      toast({
        title: "Vorschau nicht verfügbar",
        description: "Dieser Dateityp kann nicht in der Vorschau angezeigt werden.",
        variant: "destructive",
      })
    }
  }

  const handleMove = () => {
    if (!currentPath || !userId) {
      toast({
        title: "Verschieben nicht möglich",
        description: "Pfad oder Benutzer-ID fehlt.",
        variant: "destructive",
      })
      return
    }

    openFileMoveModal({
      item: file,
      itemType: 'file',
      currentPath,
      userId,
      onMove: async (targetPath: string) => {
        // Import moveFile function
        const { moveFile } = await import('@/lib/storage-service')

        // Construct source and target paths properly
        const sourcePath = `${currentPath}/${file.name}`
        const targetFilePath = `${targetPath}/${file.name}`

        console.log('🎬 Context Menu: Starting move operation:', {
          fileName: file.name,
          fileId: file.id,
          fileSize: file.size,
          fileMetadata: file.metadata,
          sourcePath,
          targetFilePath,
          currentPath,
          targetPath,
          fullFileObject: file
        })

        try {
          await moveFile(sourcePath, targetFilePath)
          console.log('🎉 Context Menu: Move completed successfully')
        } catch (error) {
          console.error('❌ Context Menu: Move failed:', error)
          throw error
        }
      }
    })
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
              <ContextMenuItem onClick={handlePreview} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Vorschau anzeigen</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          <ContextMenuItem
            onClick={handleDownload}
            disabled={isOperationInProgress}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Herunterladen</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault()
              // Close the context menu by focusing outside of it
              document.dispatchEvent(new MouseEvent('mousedown'))
              // Show the rename modal after a small delay
              setTimeout(() => {
                setShowRenameModal(true)
              }, 0)
            }}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            <span>Umbenennen</span>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={handleMove}
            disabled={isOperationInProgress || !currentPath || !userId}
            className="flex items-center gap-2"
          >
            <Move className="h-4 w-4" />
            <span>Verschieben</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          {showArchiveOption && (
            <ContextMenuItem onClick={openArchiveView} className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span>Archiv öffnen</span>
            </ContextMenuItem>
          )}

          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isOperationInProgress}
            className="text-destructive focus:text-destructive flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Endgültig löschen</span>
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

      <FileRenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        fileName={file.name}
        onRename={async (newName) => {
          await renameFile(file, newName)
        }}
      />
    </>
  )
}