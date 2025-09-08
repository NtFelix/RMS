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
  const { openFileMoveModal, openMarkdownEditorModal, openTemplateUsageModal } = useModalStore()

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
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'md', 'vorlage'].includes(extension || '')
  }

  // Check if this is a template file
  const isTemplateFile = (fileName: string) => {
    return fileName.endsWith('.vorlage')
  }

  // Get template ID from file name (assuming format: templateId.vorlage)
  const getTemplateIdFromFileName = (fileName: string): string | null => {
    if (!isTemplateFile(fileName)) return null
    // For now, we'll need to fetch the template by name
    // This is a temporary solution until we have a better file-to-template mapping
    return null
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
      if (isTemplateFile(file.name)) {
        await handleTemplateDelete()
      } else {
        await deleteFile(file)
        toast({
          title: "Datei gelöscht",
          description: `${file.name} wurde erfolgreich gelöscht.`,
        })
      }
    } catch (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handleTemplateDelete = async () => {
    try {
      // Get template by name first
      const response = await fetch('/api/vorlagen')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const templates = await response.json()
      const templateName = file.name.replace('.vorlage', '')
      const template = templates.find((t: any) => t.titel === templateName)
      
      if (!template) {
        throw new Error('Template not found')
      }

      // Delete template from database
      const deleteResponse = await fetch(`/api/vorlagen/${template.id}`, {
        method: 'DELETE'
      })

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete template')
      }

      toast({
        title: "Template gelöscht",
        description: `Das Template "${templateName}" wurde erfolgreich gelöscht.`,
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  const handleTemplateUsage = async () => {
    try {
      // Get template by name first
      const response = await fetch('/api/vorlagen')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const templates = await response.json()
      const templateName = file.name.replace('.vorlage', '')
      const template = templates.find((t: any) => t.titel === templateName)
      
      if (!template) {
        toast({
          title: "Template nicht gefunden",
          description: "Das Template konnte nicht gefunden werden.",
          variant: "destructive",
        })
        return
      }

      // Open template usage modal
      openTemplateUsageModal(template, (processedContent: string) => {
        // Handle the generated document content
        // For now, we'll just show a success message
        toast({
          title: "Dokument erstellt",
          description: "Das Dokument wurde erfolgreich aus dem Template erstellt.",
        })
        
        // TODO: In a real implementation, you might want to:
        // - Save the processed content as a new file
        // - Open it in an editor
        // - Download it
        console.log('Generated document content:', processedContent)
      })
    } catch (error) {
      console.error('Error opening template usage modal:', error)
      toast({
        title: "Fehler",
        description: "Das Template konnte nicht geöffnet werden.",
        variant: "destructive",
      })
    }
  }

  const handleTemplateRename = async (newName: string) => {
    try {
      // Get template by current name first
      const response = await fetch('/api/vorlagen')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const templates = await response.json()
      const currentTemplateName = file.name.replace('.vorlage', '')
      const template = templates.find((t: any) => t.titel === currentTemplateName)
      
      if (!template) {
        throw new Error('Template not found')
      }

      // The FileRenameModal already adds the .vorlage extension back
      // So we need to remove it to get the clean template name
      const cleanNewName = newName.replace('.vorlage', '')

      // Update template in database
      const updateResponse = await fetch(`/api/vorlagen/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titel: cleanNewName
        })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Failed to rename template')
      }

      toast({
        title: "Template umbenannt",
        description: `Das Template wurde erfolgreich zu "${cleanNewName}" umbenannt.`,
      })
    } catch (error) {
      console.error('Error renaming template:', error)
      throw error
    }
  }

  const handlePreview = () => {
    if (canPreview(file.name)) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      // Open enhanced file editor for .vorlage files (templates)
      if (fileExtension === 'vorlage' && currentPath) {
        openMarkdownEditorModal({
          filePath: currentPath,
          fileName: file.name,
          isNewFile: false,
          enableAutocomplete: true // Enable autocomplete for template files
        })
      }
      // Open markdown editor for .md files
      else if (fileExtension === 'md' && currentPath) {
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
          {isTemplateFile(file.name) && (
            <>
              <ContextMenuItem onClick={handleTemplateUsage}>
                <FileText className="mr-2 h-4 w-4" />
                Template verwenden
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          
          {canPreview(file.name) && (
            <>
              <ContextMenuItem onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                {isTemplateFile(file.name) ? 'Template bearbeiten' : 'Vorschau anzeigen'}
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
            onSelect={(e) => {
              e.preventDefault()
              // Close the context menu by focusing outside of it
              document.dispatchEvent(new MouseEvent('mousedown'))
              // Show the rename modal after a small delay
              setTimeout(() => {
                setShowRenameModal(true)
              }, 0)
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Umbenennen
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={handleMove}
            disabled={isOperationInProgress || !currentPath || !userId}
          >
            <Move className="mr-2 h-4 w-4" />
            Verschieben
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

      <FileRenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        fileName={file.name}
        onRename={async (newName) => {
          if (isTemplateFile(file.name)) {
            await handleTemplateRename(newName)
          } else {
            await renameFile(file, newName)
          }
        }}
      />
    </>
  )
}