"use client"

import { useState, useEffect, useCallback } from "react"
import { Move, Folder, FolderOpen, File, ChevronRight, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { StorageObject, VirtualFolder } from "@/hooks/use-cloud-storage-store"

interface TreeNode {
  id: string
  name: string
  path: string
  type: 'folder' | 'file'
  displayName?: string
  children?: TreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
  isEmpty?: boolean
  fileCount?: number
}

interface FileMoveModalProps {
  isOpen: boolean
  onClose: () => void
  item: StorageObject | VirtualFolder
  itemType: 'file' | 'folder'
  currentPath: string
  userId: string
  onMove: (targetPath: string) => Promise<void>
}

export function FileMoveModal({
  isOpen,
  onClose,
  item,
  itemType,
  currentPath,
  userId,
  onMove
}: FileMoveModalProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const { toast } = useToast()

  // Load the folder tree structure
  const loadFolderTree = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/dateien/tree?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to load folder structure')
      }
      
      const data = await response.json()
      setTreeData(data.tree || [])
    } catch (error) {
      console.error('Error loading folder tree:', error)
      toast({
        title: "Fehler beim Laden",
        description: "Die Ordnerstruktur konnte nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, toast])

  // Load folder children when expanding
  const loadFolderChildren = useCallback(async (folderPath: string) => {
    try {
      const response = await fetch(`/api/dateien/tree?userId=${userId}&path=${encodeURIComponent(folderPath)}`)
      if (!response.ok) {
        throw new Error('Failed to load folder children')
      }
      
      const data = await response.json()
      return data.children || []
    } catch (error) {
      console.error('Error loading folder children:', error)
      toast({
        title: "Fehler beim Laden",
        description: "Die Unterordner konnten nicht geladen werden.",
        variant: "destructive"
      })
      return []
    }
  }, [userId, toast])

  // Toggle folder expansion
  const toggleFolder = useCallback(async (nodePath: string) => {
    setTreeData(prevTree => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.path === nodePath) {
            if (node.isExpanded) {
              // Collapse
              return { ...node, isExpanded: false }
            } else {
              // Expand - load children if not already loaded
              if (!node.children || node.children.length === 0) {
                // Mark as loading
                const updatedNode = { ...node, isExpanded: true, isLoading: true }
                
                // Load children asynchronously
                loadFolderChildren(nodePath).then(children => {
                  setTreeData(currentTree => {
                    const updateWithChildren = (nodes: TreeNode[]): TreeNode[] => {
                      return nodes.map(n => {
                        if (n.path === nodePath) {
                          return { ...n, children, isLoading: false }
                        }
                        if (n.children) {
                          return { ...n, children: updateWithChildren(n.children) }
                        }
                        return n
                      })
                    }
                    return updateWithChildren(currentTree)
                  })
                })
                
                return updatedNode
              } else {
                return { ...node, isExpanded: true }
              }
            }
          }
          
          if (node.children) {
            return { ...node, children: updateNode(node.children) }
          }
          
          return node
        })
      }
      
      return updateNode(prevTree)
    })
  }, [loadFolderChildren])

  // Handle folder selection
  const handleFolderSelect = useCallback((folderPath: string) => {
    // Don't allow selecting the current folder or its parent
    if (folderPath === currentPath || currentPath.startsWith(folderPath + '/')) {
      toast({
        title: "Ungültiges Ziel",
        description: "Sie können das Element nicht in den aktuellen Ordner oder einen Unterordner verschieben.",
        variant: "destructive"
      })
      return
    }
    
    setSelectedPath(folderPath)
  }, [currentPath, toast])

  // Handle move operation
  const handleMove = useCallback(async () => {
    if (!selectedPath) {
      toast({
        title: "Kein Ziel ausgewählt",
        description: "Bitte wählen Sie einen Zielordner aus.",
        variant: "destructive"
      })
      return
    }

    setIsMoving(true)
    try {
      await onMove(selectedPath)
      toast({
        title: "Erfolgreich verschoben",
        description: itemType === 'file' 
          ? `Datei "${itemName}" wurde erfolgreich verschoben.`
          : `Ordner "${itemName}" und alle enthaltenen Dateien wurden erfolgreich verschoben.`
      })
      onClose()
    } catch (error) {
      toast({
        title: "Verschieben fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      })
    } finally {
      setIsMoving(false)
    }
  }, [selectedPath, onMove, itemType, toast, onClose])

  // Load tree data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFolderTree()
      setSelectedPath('')
    }
  }, [isOpen, loadFolderTree])

  // Render tree node
  const renderTreeNode = useCallback((node: TreeNode, level: number = 0) => {
    const isSelected = selectedPath === node.path
    const canSelect = node.type === 'folder' && node.path !== currentPath && !currentPath.startsWith(node.path + '/')
    
    return (
      <div key={node.path} className="select-none">
        <div
          className={cn(
            "flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
            isSelected && "bg-primary/10 border border-primary/20",
            !canSelect && "opacity-50 cursor-not-allowed",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              if (canSelect) {
                handleFolderSelect(node.path)
              }
              toggleFolder(node.path)
            }
          }}
        >
          {node.type === 'folder' && (
            <div className="flex items-center mr-2">
              {node.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : node.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          )}
          
          <div className="flex items-center flex-1 min-w-0">
            {node.type === 'folder' ? (
              node.isExpanded ? (
                <FolderOpen className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
              )
            ) : (
              <File className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />
            )}
            
            <span className="truncate text-sm">
              {node.displayName || node.name}
            </span>
            
            {node.isEmpty ? (
              <span className="ml-2 text-xs text-muted-foreground">(leer)</span>
            ) : node.fileCount !== undefined && node.fileCount > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                ({node.fileCount} {node.fileCount === 1 ? 'Datei' : 'Dateien'})
              </span>
            ) : null}
          </div>
        </div>
        
        {node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }, [selectedPath, currentPath, handleFolderSelect, toggleFolder])

  const itemName = (item as any).displayName || (item as any).name || 'Unknown'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Move className="h-5 w-5 mr-2" />
            {itemType === 'file' ? 'Datei' : 'Ordner'} verschieben
          </DialogTitle>
          <DialogDescription>
            {itemType === 'file' 
              ? `Wählen Sie den Zielordner für die Datei "${itemName}" aus.`
              : `Wählen Sie den Zielordner für den Ordner "${itemName}" und alle enthaltenen Dateien aus.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Lade Ordnerstruktur...</span>
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-md p-2">
              {treeData.length > 0 ? (
                <div className="space-y-1">
                  {treeData.map(node => renderTreeNode(node))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Ordner gefunden</p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!selectedPath || isMoving}
          >
            {isMoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verschieben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}