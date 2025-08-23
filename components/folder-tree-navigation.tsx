"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Home, Building, User, Plus, Edit, Trash2, FolderPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { FolderNode } from "@/types/cloud-storage"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FolderTreeNavigationProps {
  folders: FolderNode[]
  selectedFolderPath?: string
  onFolderSelect: (folder: FolderNode) => void
  onCreateFolder?: (parentPath: string) => void
  onRenameFolder?: (folderPath: string, currentName: string) => void
  onDeleteFolder?: (folderPath: string, folderName: string) => void
  className?: string
}

interface FolderItemProps {
  folder: FolderNode
  level: number
  selectedFolderPath?: string
  onFolderSelect: (folder: FolderNode) => void
  onCreateFolder?: (parentPath: string) => void
  onRenameFolder?: (folderPath: string, currentName: string) => void
  onDeleteFolder?: (folderPath: string, folderName: string) => void
}

const getFolderIcon = (folder: FolderNode, isOpen: boolean) => {
  // Entity-specific icons
  if (folder.type === 'entity') {
    switch (folder.entityType) {
      case 'haus':
        return <Home className="h-4 w-4" />
      case 'wohnung':
        return <Building className="h-4 w-4" />
      case 'mieter':
        return <User className="h-4 w-4" />
      default:
        return isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
    }
  }

  // Category folder icons
  if (folder.type === 'category') {
    switch (folder.name.toLowerCase()) {
      case 'häuser':
      case 'haeuser':
        return <Home className="h-4 w-4" />
      case 'wohnungen':
        return <Building className="h-4 w-4" />
      case 'mieter':
        return <User className="h-4 w-4" />
      default:
        return isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
    }
  }

  // Default folder icon
  return isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  level,
  selectedFolderPath,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolderPath === folder.path
  const canDelete = folder.type === 'custom' // Only custom folders can be deleted
  const canRename = folder.type === 'custom' // Only custom folders can be renamed
  const canCreateSubfolder = true // All folders can have subfolders

  const handleFolderClick = () => {
    onFolderSelect(folder)
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleCreateFolder = () => {
    onCreateFolder?.(folder.path)
  }

  const handleRenameFolder = () => {
    onRenameFolder?.(folder.path, folder.name)
  }

  const handleDeleteFolder = () => {
    onDeleteFolder?.(folder.path, folder.name)
  }

  const folderIcon = getFolderIcon(folder, isExpanded)

  return (
    <div className="select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
              isSelected && "bg-accent text-accent-foreground",
              "group"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleFolderClick}
          >
            {hasChildren ? (
              <button
                className="flex items-center justify-center w-4 h-4 hover:bg-accent-foreground/10 rounded-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {folderIcon}
              <span className="text-sm font-medium truncate">
                {folder.name}
              </span>
              {folder.fileCount > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {folder.fileCount}
                </span>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-48">
          {canCreateSubfolder && (
            <ContextMenuItem 
              onClick={handleCreateFolder}
              className="flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Neuer Ordner</span>
            </ContextMenuItem>
          )}
          
          {canRename && (
            <ContextMenuItem 
              onClick={handleRenameFolder}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              <span>Umbenennen</span>
            </ContextMenuItem>
          )}
          
          {(canCreateSubfolder || canRename) && canDelete && (
            <ContextMenuSeparator />
          )}
          
          {canDelete && (
            <ContextMenuItem 
              onClick={handleDeleteFolder}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Löschen</span>
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {folder.children.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              selectedFolderPath={selectedFolderPath}
              onFolderSelect={onFolderSelect}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const FolderTreeNavigation: React.FC<FolderTreeNavigationProps> = ({
  folders,
  selectedFolderPath,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
}) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">Ordner</h3>
        {onCreateFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateFolder('/')}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {folders.length > 0 ? (
            folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                level={0}
                selectedFolderPath={selectedFolderPath}
                onFolderSelect={onFolderSelect}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Folder className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Keine Ordner vorhanden
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}