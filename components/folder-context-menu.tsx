"use client"

import { useState } from "react"
import { 
  FolderOpen, 
  Trash2, 
  Edit3, 
  Move, 
  Plus,
  Upload
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import type { VirtualFolder } from "@/hooks/use-cloud-storage-store"

interface FolderContextMenuProps {
  folder: VirtualFolder
  children: React.ReactNode
  currentPath?: string
  userId?: string
  onNavigate?: (path: string) => void
  onUpload?: (targetPath: string) => void
  onCreateFolder?: (targetPath: string) => void
  onDelete?: (folder: VirtualFolder) => void
  canDelete?: boolean
}

export function FolderContextMenu({ 
  folder, 
  children, 
  currentPath,
  userId,
  onNavigate,
  onUpload,
  onCreateFolder,
  onDelete,
  canDelete = false
}: FolderContextMenuProps) {
  const { toast } = useToast()
  const { openFileMoveModal } = useModalStore()

  const handleOpen = () => {
    if (onNavigate) {
      onNavigate(folder.path)
    }
  }

  const handleUpload = () => {
    if (onUpload) {
      onUpload(folder.path)
    }
  }

  const handleCreateFolder = () => {
    if (onCreateFolder) {
      onCreateFolder(folder.path)
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
      item: folder,
      itemType: 'folder',
      currentPath,
      userId,
      onMove: async (targetPath: string) => {
        // Import moveFile function dynamically
        const { moveFile } = await import('@/lib/storage-service')
        
        // Move all files in the folder to the new location
        // This is a simplified approach - in a real implementation,
        // you might want to move the entire folder structure
        const newFolderPath = `${targetPath}/${folder.name}`
        
        // For now, we'll show a message that folder moving is complex
        toast({
          title: "Ordner verschieben",
          description: "Das Verschieben von Ordnern wird in einer zukünftigen Version implementiert.",
          variant: "default",
        })
        
        throw new Error("Folder moving not yet implemented")
      }
    })
  }

  const handleDelete = () => {
    if (onDelete && canDelete) {
      onDelete(folder)
    } else {
      toast({
        title: "Löschen nicht möglich",
        description: "Dieser Ordner kann nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleOpen}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Öffnen
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {onUpload && (
          <ContextMenuItem onClick={handleUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Dateien hochladen
          </ContextMenuItem>
        )}
        
        {onCreateFolder && (
          <ContextMenuItem onClick={handleCreateFolder}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Ordner
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={handleMove}
          disabled={!currentPath || !userId}
        >
          <Move className="mr-2 h-4 w-4" />
          Verschieben
        </ContextMenuItem>
        
        {canDelete && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}