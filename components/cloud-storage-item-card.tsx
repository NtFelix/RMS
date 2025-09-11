"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  FileType,
  Hash,
  Calendar,
  Tag
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
import { TemplateContextMenu } from "@/components/template-context-menu"
import type { TemplateItem } from "@/types/template"

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
  // Template-specific props
  templateItem?: TemplateItem
  onTemplateDeleted?: () => void
  onTemplateUpdated?: () => void
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
  className,
  templateItem,
  onTemplateDeleted,
  onTemplateUpdated
}: ItemCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { openFilePreviewModal, openFileRenameModal, openMarkdownEditorModal } = useModalStore()
  const { currentPath, renameFile } = useSimpleCloudStorageStore()
  
  // Use a ref to prevent infinite loops in checkbox callbacks
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Create a unique close callback for this dropdown
  const closeThisDropdown = useCallback(() => setIsDropdownOpen(false), [])

  // Register this dropdown with the global manager
  useEffect(() => {
    const unregister = globalDropdownManager.register(closeThisDropdown)
    return unregister
  }, [closeThisDropdown])

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
    
    // Templates can always be previewed
    if (isTemplate()) return true
    
    const extension = file.name.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'md'].includes(extension || '')
  }

  // Handle preview action
  const handlePreview = () => {
    if (type === 'file' && canPreview()) {
      const file = item as StorageObject
      
      // Handle template preview
      if (isTemplate() && templateItem) {
        // For templates, open the template editor in preview/edit mode
        const { openTemplateEditorModal } = useModalStore.getState()
        openTemplateEditorModal({
          templateId: templateItem.id,
          initialTitle: templateItem.name,
          initialContent: JSON.parse(templateItem.content),
          initialCategory: templateItem.category || '',
          isNewTemplate: false,
          onSave: async (templateData) => {
            // Handle template save if needed
            if (onTemplateUpdated) {
              onTemplateUpdated()
            }
          },
          onCancel: () => {
            // Template editor modal will handle the cancel logic
          }
        })
        return
      }
      
      // Construct the file path from current path and file name
      const filePath = `${currentPath}/${file.name}`
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      // Open markdown editor directly for .md files
      if (fileExtension === 'md') {
        openMarkdownEditorModal({
          filePath: currentPath,
          fileName: file.name,
          isNewFile: false
        })
      } else {
        openFilePreviewModal({
          name: file.name,
          path: filePath,
          size: file.size,
          type: fileExtension
        })
      }
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

  // Check if item is a template
  const isTemplate = () => {
    if (type !== 'file') return false
    const file = item as StorageObject
    return file.metadata?.type === 'template' || file.name.endsWith('.template') || templateItem !== undefined
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
          if (folder.name === 'Vorlagen' || folder.name.includes('Vorlagen')) {
            return { icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-50' }
          }
          if (folder.name.includes('documents')) {
            return { icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-50' }
          }
          return { icon: FolderOpen, color: 'text-orange-500', bgColor: 'bg-orange-50' }
        case 'template_root':
        case 'template_category':
          return { icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-50' }
        default:
          return { icon: FolderOpen, color: 'text-blue-500', bgColor: 'bg-blue-50' }
      }
    } else {
      const file = item as StorageObject
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      // Check if this is a template file
      if (extension === 'template' || file.metadata?.type === 'template' || templateItem) {
        return { icon: FileType, color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
      }
      
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
      if (folder.type === 'template_root') {
        return folder.isEmpty ? 'Keine Vorlagen' : `${folder.fileCount} Vorlagen`
      }
      if (folder.type === 'template_category') {
        return folder.isEmpty ? 'Keine Vorlagen' : `${folder.fileCount} Vorlagen`
      }
      return folder.isEmpty ? 'Leer' : `${folder.fileCount} Dateien`
    } else {
      const file = item as StorageObject
      
      // Check if this is a template file
      if (file.metadata?.type === 'template' || templateItem) {
        const variables = templateItem?.variables || (file.metadata?.variables as string[] || [])
        const variableCount = variables.length
        const category = templateItem?.category || file.metadata?.category
        const dateStr = templateItem?.updatedAt 
          ? templateItem.updatedAt.toLocaleDateString('de-DE')
          : new Date(file.updated_at).toLocaleDateString('de-DE')
        
        const parts = []
        if (category) parts.push(category)
        if (variableCount > 0) parts.push(`${variableCount} Variable${variableCount !== 1 ? 'n' : ''}`)
        parts.push(dateStr)
        
        return parts.join(' • ')
      }
      
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
        case 'template_root':
          return { label: 'Vorlagen', variant: 'default' as const }
        case 'template_category':
          return { label: 'Kategorie', variant: 'outline' as const }
        case 'category':
          return { label: 'Kategorie', variant: 'outline' as const }
        default:
          return { label: 'Ordner', variant: 'outline' as const }
      }
    } else {
      const file = item as StorageObject
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      // Check if this is a template file
      if (extension === 'template' || file.metadata?.type === 'template' || templateItem) {
        return { label: 'Vorlage', variant: 'default' as const }
      }
      
      const upperExtension = extension?.toUpperCase()
      return { label: upperExtension || 'Datei', variant: 'secondary' as const }
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
                filePath: `${currentPath}/${file.name}`
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
            onSelect={() => {
              // onSelect automatically closes the context menu
              onDelete()
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

  if (viewMode === 'grid') {
    const cardContent = (
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
              
              // Handle template clicks
              if (isTemplate() && templateItem) {
                handlePreview() // This will open the template editor
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
                    onCheckedChange={(checked) => {
                      // Use ref to prevent infinite loops and ensure stable callback
                      if (onSelectRef.current) {
                        onSelectRef.current(checked === true)
                      }
                    }}
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
                          <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault()
                            setIsDropdownOpen(false)
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
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault()
                          setIsDropdownOpen(false)
                          onDelete()
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
                  "relative p-3 rounded-xl transition-colors",
                  bgColor,
                  "group-hover:scale-105 transition-transform",
                  // Add special styling for templates
                  isTemplate() && templateItem && "ring-2 ring-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50"
                )}>
                  <Icon className={cn("h-8 w-8", color)} />
                  
                  {/* Template indicator badge */}
                  {isTemplate() && templateItem && templateItem.variables.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {templateItem.variables.length}
                    </div>
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
                  
                  {/* Template-specific metadata */}
                  {(isTemplate() && templateItem) && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      {templateItem.variables.length > 0 && (
                        <div className="flex items-center gap-1" title={`Variablen: ${templateItem.variables.join(', ')}`}>
                          <Hash className="h-3 w-3" />
                          <span>{templateItem.variables.length}</span>
                        </div>
                      )}
                      {templateItem.category && (
                        <div className="flex items-center gap-1" title={`Kategorie: ${templateItem.category}`}>
                          <Tag className="h-3 w-3" />
                          <span className="truncate max-w-16">{templateItem.category}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Badge variant={typeBadge.variant} className="text-xs">
                    {typeBadge.label}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
    )

    // Conditionally wrap with template context menu or regular context menu
    if (isTemplate() && templateItem) {
      return (
        <TemplateContextMenu 
          template={templateItem}
          onTemplateDeleted={onTemplateDeleted}
          onTemplateUpdated={onTemplateUpdated}
        >
          {cardContent}
        </TemplateContextMenu>
      )
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          {cardContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {contextMenuItems}
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  // List view
  const listContent = (
        <div
          className={cn(
            "flex items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group",
            isSelected && "bg-muted",
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            // Handle template clicks
            if (isTemplate() && templateItem) {
              handlePreview() // This will open the template editor
              return
            }
            
            // Normal click behavior
            if (onOpen) {
              onOpen()
            }
          }}
        >
          {/* Selection checkbox */}
          {onSelect && (
            <div className="mr-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  // Use ref to prevent infinite loops and ensure stable callback
                  if (onSelectRef.current) {
                    onSelectRef.current(checked === true)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Icon */}
          <div className={cn(
            "relative mr-3 p-2 rounded-lg", 
            bgColor,
            // Add special styling for templates
            isTemplate() && templateItem && "ring-1 ring-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50"
          )}>
            <Icon className={cn("h-5 w-5", color)} />
            
            {/* Template indicator badge for list view */}
            {isTemplate() && templateItem && templateItem.variables.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                {templateItem.variables.length > 9 ? '9+' : templateItem.variables.length}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="font-medium truncate">{displayName}</p>
              <Badge variant={typeBadge.variant} className="text-xs">
                {typeBadge.label}
              </Badge>
              
              {/* Template-specific badges in list view */}
              {(isTemplate() && templateItem) && (
                <>
                  {templateItem.variables.length > 0 && (
                    <Badge variant="outline" className="text-xs" title={`Variablen: ${templateItem.variables.join(', ')}`}>
                      <Hash className="h-3 w-3 mr-1" />
                      {templateItem.variables.length}
                    </Badge>
                  )}
                  {templateItem.category && (
                    <Badge variant="secondary" className="text-xs" title={`Kategorie: ${templateItem.category}`}>
                      <Tag className="h-3 w-3 mr-1" />
                      {templateItem.category}
                    </Badge>
                  )}
                </>
              )}
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
                title={type === 'folder' ? 'Ordner löschen' : 'Datei löschen'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
  )

  // Conditionally wrap with template context menu or regular context menu
  if (isTemplate() && templateItem) {
    return (
      <TemplateContextMenu 
        template={templateItem}
        onTemplateDeleted={onTemplateDeleted}
        onTemplateUpdated={onTemplateUpdated}
      >
        {listContent}
      </TemplateContextMenu>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {listContent}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {contextMenuItems}
      </ContextMenuContent>
    </ContextMenu>
  )
}