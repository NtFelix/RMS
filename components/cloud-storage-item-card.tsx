"use client"

import { useState } from "react"
import { 
  File, 
  FileText, 
  Image as ImageIcon, 
  FolderOpen, 
  Building, 
  Home, 
  Users,
  Download, 
  Eye, 
  Trash2, 
  MoreHorizontal,
  Star,
  Share2,
  Edit3,
  Copy,
  Move
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import { StorageObject, VirtualFolder } from "@/hooks/use-simple-cloud-storage-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { useSimpleCloudStorageStore } from "@/hooks/use-simple-cloud-storage-store"

interface ItemCardProps {
  item: StorageObject | VirtualFolder
  type: 'file' | 'folder'
  viewMode: 'grid' | 'list'
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onOpen?: () => void
  onDownload?: () => void
  onPreview?: () => void
  onDelete?: () => void
  onRename?: () => void
  onMove?: () => void
  onShare?: () => void
  onStar?: () => void
  className?: string
}

export function CloudStorageItemCard({
  item,
  type,
  viewMode,
  isSelected = false,
  onSelect,
  onOpen,
  onDownload,
  onPreview,
  onDelete,
  onRename,
  onMove,
  onShare,
  onStar,
  className
}: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { openFilePreviewModal, openFileRenameModal } = useModalStore()
  const { currentPath, renameFile } = useSimpleCloudStorageStore()

  // Check if file can be previewed
  const canPreview = () => {
    if (type !== 'file') return false
    const file = item as StorageObject
    const extension = file.name.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'].includes(extension || '')
  }

  // Handle preview action
  const handlePreview = () => {
    if (type === 'file' && canPreview()) {
      const file = item as StorageObject
      // Construct the file path from current path and file name
      const filePath = `${currentPath}/${file.name}`
      
      openFilePreviewModal({
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.name.split('.').pop()?.toLowerCase()
      })
    }
  }

  // Handle rename action
  const handleRename = () => {
    if (type === 'file') {
      const file = item as StorageObject
      openFileRenameModal({
        fileName: file.name,
        filePath: `${currentPath}/${file.name}`,
        onRename: async (newName: string) => {
          await renameFile(file, newName)
        }
      })
    }
  }

  // Get icon and color based on item type
  const getItemIcon = () => {
    if (type === 'folder') {
      const folder = item as VirtualFolder
      switch (folder.type) {
        case 'house':
          return { icon: Building, color: 'text-blue-500', bgColor: 'bg-blue-50' }
        case 'apartment':
          return { icon: Home, color: 'text-green-500', bgColor: 'bg-green-50' }
        case 'category':
          if (folder.name.includes('documents')) {
            return { icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-50' }
          }
          return { icon: FolderOpen, color: 'text-orange-500', bgColor: 'bg-orange-50' }
        default:
          return { icon: FolderOpen, color: 'text-blue-500', bgColor: 'bg-blue-50' }
      }
    } else {
      const file = item as StorageObject
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
        return { icon: ImageIcon, color: 'text-green-500', bgColor: 'bg-green-50' }
      }
      if (['pdf'].includes(extension || '')) {
        return { icon: FileText, color: 'text-red-500', bgColor: 'bg-red-50' }
      }
      if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
        return { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50' }
      }
      return { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-50' }
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Get display name
  const getDisplayName = () => {
    if (type === 'folder') {
      const folder = item as VirtualFolder
      return folder.displayName || folder.name
    }
    return item.name
  }

  // Get subtitle
  const getSubtitle = () => {
    if (type === 'folder') {
      const folder = item as VirtualFolder
      return folder.isEmpty ? 'Leer' : `${folder.fileCount} Dateien`
    } else {
      const file = item as StorageObject
      return `${formatFileSize(file.size)} • ${new Date(file.updated_at).toLocaleDateString('de-DE')}`
    }
  }

  // Get type badge
  const getTypeBadge = () => {
    if (type === 'folder') {
      const folder = item as VirtualFolder
      switch (folder.type) {
        case 'house':
          return { label: 'Haus', variant: 'default' as const }
        case 'apartment':
          return { label: 'Wohnung', variant: 'secondary' as const }
        case 'category':
          return { label: 'Kategorie', variant: 'outline' as const }
        default:
          return { label: 'Ordner', variant: 'outline' as const }
      }
    } else {
      const file = item as StorageObject
      const extension = file.name.split('.').pop()?.toUpperCase()
      return { label: extension || 'Datei', variant: 'secondary' as const }
    }
  }

  const { icon: Icon, color, bgColor } = getItemIcon()
  const displayName = getDisplayName()
  const subtitle = getSubtitle()
  const typeBadge = getTypeBadge()

  // Context menu items
  const contextMenuItems = (
    <>
      {type === 'folder' ? (
        <ContextMenuItem onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (onOpen) onOpen()
        }}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Öffnen
        </ContextMenuItem>
      ) : (
        <>
          {canPreview() ? (
            <ContextMenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onPreview) {
                onPreview()
              } else {
                handlePreview()
              }
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Vorschau
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onOpen) onOpen()
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Öffnen
            </ContextMenuItem>
          )}
        </>
      )}
      
      {type === 'file' && onDownload && (
        <ContextMenuItem onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDownload()
        }}>
          <Download className="h-4 w-4 mr-2" />
          Herunterladen
        </ContextMenuItem>
      )}
      
      <ContextMenuSeparator />
      
      {type === 'file' && (
        <ContextMenuItem onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (onRename) {
            onRename()
          } else {
            handleRename()
          }
        }}>
          <Edit3 className="h-4 w-4 mr-2" />
          Umbenennen
        </ContextMenuItem>
      )}
      
      <ContextMenuItem onClick={onMove || (() => console.log('Move placeholder'))}>
        <Move className="h-4 w-4 mr-2" />
        Verschieben
      </ContextMenuItem>
      
      <ContextMenuItem onClick={() => console.log('Copy placeholder')}>
        <Copy className="h-4 w-4 mr-2" />
        Kopieren
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={onShare || (() => console.log('Share placeholder'))}>
        <Share2 className="h-4 w-4 mr-2" />
        Teilen
      </ContextMenuItem>
      
      <ContextMenuItem onClick={onStar || (() => console.log('Star placeholder'))}>
        <Star className="h-4 w-4 mr-2" />
        Zu Favoriten hinzufügen
      </ContextMenuItem>
      
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => console.log('Properties placeholder')}>
        <Eye className="h-4 w-4 mr-2" />
        Eigenschaften
      </ContextMenuItem>
      
      {onDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </ContextMenuItem>
        </>
      )}
    </>
  )

  if (viewMode === 'grid') {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-md group",
              isSelected && "ring-2 ring-primary",
              className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={type === 'file' && canPreview() ? (onPreview || handlePreview) : onOpen}
          >
            <div className="p-4">
              {/* Selection checkbox */}
              {onSelect && (
                <div className={cn(
                  "absolute top-2 left-2 transition-opacity",
                  isSelected || isHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Actions dropdown */}
              <div className={cn(
                "absolute top-2 right-2 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {type === 'folder' ? (
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onOpen) onOpen()
                      }}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Öffnen
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {canPreview() ? (
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (onPreview) {
                              onPreview()
                            } else {
                              handlePreview()
                            }
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Vorschau
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (onOpen) onOpen()
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Öffnen
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    
                    {type === 'file' && onDownload && (
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDownload()
                      }}>
                        <Download className="h-4 w-4 mr-2" />
                        Herunterladen
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {type === 'file' && (
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onRename) {
                          onRename()
                        } else {
                          handleRename()
                        }
                      }}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Umbenennen
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={onMove || (() => console.log('Move placeholder'))}>
                      <Move className="h-4 w-4 mr-2" />
                      Verschieben
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => console.log('Copy placeholder')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieren
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={onShare || (() => console.log('Share placeholder'))}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Teilen
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={onStar || (() => console.log('Star placeholder'))}>
                      <Star className="h-4 w-4 mr-2" />
                      Zu Favoriten hinzufügen
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => console.log('Properties placeholder')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Eigenschaften
                    </DropdownMenuItem>
                    
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete()
                        }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                {/* Icon */}
                <div className={cn(
                  "p-3 rounded-xl transition-colors",
                  bgColor,
                  "group-hover:scale-105 transition-transform"
                )}>
                  <Icon className={cn("h-8 w-8", color)} />
                </div>

                {/* Content */}
                <div className="w-full space-y-1">
                  <p 
                    className="font-medium text-sm truncate leading-tight" 
                    title={displayName}
                  >
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {subtitle}
                  </p>
                  <Badge variant={typeBadge.variant} className="text-xs">
                    {typeBadge.label}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {contextMenuItems}
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  // List view
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "flex items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group",
            isSelected && "bg-muted",
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onOpen}
        >
          {/* Selection checkbox */}
          {onSelect && (
            <div className="mr-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Icon */}
          <div className={cn("mr-3 p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="font-medium truncate">{displayName}</p>
              <Badge variant={typeBadge.variant} className="text-xs">
                {typeBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {subtitle}
            </p>
          </div>

          {/* Actions */}
          <div className={cn(
            "flex items-center space-x-1 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {type === 'file' && onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload()
                }}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {(onPreview || (type === 'file' && canPreview())) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onPreview) {
                    onPreview()
                  } else {
                    handlePreview()
                  }
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {contextMenuItems}
      </ContextMenuContent>
    </ContextMenu>
  )
}