"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  File,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  Building,
  Home,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  Share2,
  Edit3,
  Move,
  Loader2
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
import { StorageObject, VirtualFolder } from "@/hooks/use-cloud-storage-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { useCloudStorageStore } from "@/hooks/use-cloud-storage-store"
import { DeleteConfirmationDialog } from "@/components/modals/delete-confirmation-dialog"

// Global dropdown manager to ensure only one dropdown is open at a time
// Using a more React-friendly approach that works with SSR and strict mode
const globalDropdownManager = {
  callbacks: new Set<() => void>(),
  register: (closeCallback: () => void) => {
    globalDropdownManager.callbacks.add(closeCallback)
    return () => {
      globalDropdownManager.callbacks.delete(closeCallback)
    }
  },
  closeAll: (except?: () => void) => {
    globalDropdownManager.callbacks.forEach(callback => {
      if (callback !== except) {
        try {
          callback()
        } catch (error) {
          // Silently handle errors to prevent crashes
          console.warn('Error closing dropdown:', error)
        }
      }
    })
  }
}

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
  className
}: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { openMarkdownEditorModal, openFileRenameModal } = useModalStore()
  const { currentPath, renameFile } = useCloudStorageStore()
  const supabase = createClient()

  // Constants for configuration
  const STORAGE_BUCKET = 'documents'
  const URL_EXPIRY_SECONDS = 3600 // 1 hour

  // Helper function to join path segments and normalize the result
  const getFullPath = (path: string, name: string): string => {
    // Remove any leading/trailing slashes and join with a single slash
    return [path.replace(/^\/+|\/+$/g, ''), name.replace(/^\/+|\/+$/g, '')]
      .filter(Boolean)
      .join('/')
  }

  // Create a unique close callback for this dropdown
  const closeThisDropdown = useCallback(() => setIsDropdownOpen(false), [])

  // Register this dropdown with the global manager
  useEffect(() => {
    const unregister = globalDropdownManager.register(closeThisDropdown)
    return unregister
  }, []) // Remove closeThisDropdown from dependency array to prevent infinite re-renders

  // Handle dropdown open change with global management
  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      // Close all other dropdowns before opening this one
      globalDropdownManager.closeAll(closeThisDropdown)
    }
    setIsDropdownOpen(open)
  }

  // Check if file can be previewed
  const canPreview = () => {
    if (type !== 'file') return false
    const file = item as StorageObject
    const extension = file.name.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'md'].includes(extension || '')
  }

  // Handle preview action - opens file in new tab
  const handlePreview = async () => {
    if (type !== 'file' || isLoading) return

    const file = item as StorageObject

    // Handle markdown files with the markdown editor
    if (file.name.endsWith('.md')) {
      openMarkdownEditorModal({
        filePath: getFullPath(currentPath, ''), // Just the directory path
        fileName: file.name,
        isNewFile: false
      })
      return
    }

    // For other file types, get a signed URL and open in new tab
    try {
      setIsLoading(true)

      // Get signed URL for the file
      const filePath = getFullPath(currentPath, file.name)
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, URL_EXPIRY_SECONDS)

      if (error) throw error

      // Open the file in a new tab
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error opening file:', error)
      toast({
        title: "Fehler beim Öffnen der Datei",
        description: "Die Datei konnte nicht geöffnet werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle rename action
  const handleRename = () => {
    if (type === 'file') {
      const file = item as StorageObject
      openFileRenameModal({
        fileName: file.name,
        filePath: getFullPath(currentPath, file.name),
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
        <ContextMenuItem onSelect={() => {
          if (onOpen) onOpen()
        }}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Öffnen
        </ContextMenuItem>
      ) : (
        <>
          {canPreview() ? (
            <ContextMenuItem onSelect={() => {
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
            <ContextMenuItem onSelect={() => {
              if (onOpen) onOpen()
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Öffnen
            </ContextMenuItem>
          )}
        </>
      )}

      {type === 'file' && onDownload && (
        <ContextMenuItem onSelect={() => {
          onDownload()
        }}>
          <Download className="h-4 w-4 mr-2" />
          Herunterladen
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />

      {type === 'file' && (
        <ContextMenuItem onSelect={() => {
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

      <ContextMenuItem onSelect={onMove || (() => console.log('Move placeholder'))}>
        <Move className="h-4 w-4 mr-2" />
        Verschieben
      </ContextMenuItem>

      {type === 'file' && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => {
            if (onShare) {
              onShare()
            } else {
              const { openShareDocumentModal } = useModalStore.getState()
              const file = item as StorageObject
              openShareDocumentModal({
                fileName: file.name,
                filePath: getFullPath(currentPath, file.name)
              })
            }
          }}>
            <Share2 className="h-4 w-4 mr-2" />
            Teilen
          </ContextMenuItem>
        </>
      )}

      {onDelete && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault()
              setIsDropdownOpen(false)
              setIsDeleteDialogOpen(true)
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {type === 'folder' ? 'Ordner löschen' : 'Löschen'}
          </ContextMenuItem>
        </>
      )}
    </>
  )

  const deleteConfirmationDialog = onDelete ? (
    <DeleteConfirmationDialog
      isOpen={isDeleteDialogOpen}
      onOpenChange={setIsDeleteDialogOpen}
      onConfirm={onDelete}
      title={type === 'folder' ? 'Ordner löschen' : 'Datei löschen'}
      description={`Sie sind dabei, "${getDisplayName()}" zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.`}
      itemCount={1}
    />
  ) : null

  if (viewMode === 'grid') {
    return (
      <>
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
              onClick={(e) => {
                // Don't trigger card click if dropdown is open or was just closed
                if (isDropdownOpen) {
                  e.preventDefault()
                  e.stopPropagation()
                  return
                }

                // Normal card click behavior
                if (type === 'file' && canPreview()) {
                  if (onPreview) {
                    onPreview()
                  } else {
                    handlePreview()
                  }
                } else if (onOpen) {
                  onOpen()
                }
              }}
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
                  <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {type === 'folder' ? (
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault()
                          setIsDropdownOpen(false)
                          if (onOpen) onOpen()
                        }}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Öffnen
                        </DropdownMenuItem>
                      ) : (
                        <>
                          {canPreview() ? (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                if (isLoading) return
                                setIsDropdownOpen(false)
                                if (onPreview) {
                                  onPreview()
                                } else {
                                  handlePreview()
                                }
                              }}
                              className="flex items-center"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-2" />
                              )}
                              {isLoading ? 'Wird geladen...' : 'Vorschau'}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault()
                              setIsDropdownOpen(false)
                              if (onOpen) onOpen()
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Öffnen
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {type === 'file' && onDownload && (
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault()
                          setIsDropdownOpen(false)
                          onDownload()
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Herunterladen
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {type === 'file' && (
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault()
                          setIsDropdownOpen(false)
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

                      <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault()
                        setIsDropdownOpen(false)
                        if (onMove) {
                          onMove()
                        } else {
                          console.log('Move placeholder')
                        }
                      }}>
                        <Move className="h-4 w-4 mr-2" />
                        Verschieben
                      </DropdownMenuItem>

                      {type === 'file' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault()
                            setIsDropdownOpen(false)
                            if (onShare) {
                              onShare()
                            } else {
                              const { openShareDocumentModal } = useModalStore.getState()
                              const file = item as StorageObject
                              openShareDocumentModal({
                                fileName: file.name,
                                filePath: `${currentPath}/${file.name}`
                              })
                            }
                          }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Teilen
                          </DropdownMenuItem>
                        </>
                      )}

                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={(event) => {
                            event.preventDefault()
                            setIsDropdownOpen(false)
                            setIsDeleteDialogOpen(true)
                          }} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {type === 'folder' ? 'Ordner löschen' : 'Löschen'}
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
                    {isLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className={cn("h-8 w-8", color)} />
                    )}
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
          <ContextMenuContent className="w-48">
            {contextMenuItems}
          </ContextMenuContent>
        </ContextMenu>
        {deleteConfirmationDialog}
      </>
    )
  }

  // List view
  return (
    <>
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
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsDeleteDialogOpen(true)
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title={type === 'folder' ? 'Ordner löschen' : 'Datei löschen'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {contextMenuItems}
        </ContextMenuContent>
      </ContextMenu>
      {deleteConfirmationDialog}
    </>
  )
}