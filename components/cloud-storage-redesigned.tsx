"use client"

import { useEffect, useState } from "react"
import { 
  Upload, 
  FolderOpen, 
  ArrowLeft,
  RefreshCw,
  Plus,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder } from "@/hooks/use-cloud-storage-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage-item-card"
import { cn } from "@/lib/utils"

interface CloudStorageRedesignedProps {
  userId: string
  initialFiles?: StorageObject[]
  initialFolders?: VirtualFolder[]
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

export function CloudStorageRedesigned({ userId, initialFiles, initialFolders }: CloudStorageRedesignedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  const { 
    currentPath, 
    files, 
    folders, 
    isLoading, 
    error,
    breadcrumbs,
    navigateToPath,
    refreshCurrentPath,
    downloadFile,
    deleteFile
  } = useCloudStorageStore()
  
  const { openUploadModal } = useModalStore()
  const { toast } = useToast()

  // Initialize with root path
  useEffect(() => {
    if (!currentPath && userId) {
      navigateToPath(`user_${userId}`)
    }
  }, [userId, currentPath, navigateToPath])

  // Filter items based on search and active filter
  const filterItems = () => {
    let filteredFiles = files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    let filteredFolders = folders.filter(folder => 
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Apply type filter
    switch (activeFilter) {
      case 'folders':
        filteredFiles = []
        break
      case 'images':
        filteredFolders = []
        filteredFiles = filteredFiles.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase()
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
        })
        break
      case 'documents':
        filteredFolders = []
        filteredFiles = filteredFiles.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase()
          return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')
        })
        break
      case 'recent':
        filteredFolders = []
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        filteredFiles = filteredFiles.filter(file => 
          new Date(file.updated_at) > weekAgo
        )
        break
    }

    return { filteredFiles, filteredFolders }
  }

  const { filteredFiles, filteredFolders } = filterItems()

  // Sort items
  const sortItems = <T extends { name: string; updated_at?: string; size?: number }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        case 'size':
          return (b.size || 0) - (a.size || 0)
        case 'type':
          const aExt = a.name.split('.').pop() || ''
          const bExt = b.name.split('.').pop() || ''
          return aExt.localeCompare(bExt)
        default:
          return 0
      }
    })
  }

  const sortedFiles = sortItems(filteredFiles)
  const sortedFolders = sortItems(filteredFolders.map(f => ({ ...f, updated_at: '', size: 0 })))

  // Handle item selection
  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(itemId)
      } else {
        newSet.delete(itemId)
      }
      return newSet
    })
  }

  // Handle bulk operations
  const handleBulkDownload = async () => {
    const selectedFiles = sortedFiles.filter(file => selectedItems.has(file.id))
    for (const file of selectedFiles) {
      try {
        await downloadFile(file)
      } catch (error) {
        console.error('Bulk download error:', error)
      }
    }
    setSelectedItems(new Set())
    toast({
      title: "Download gestartet",
      description: `${selectedFiles.length} Dateien werden heruntergeladen.`
    })
  }

  const handleBulkDelete = async () => {
    const selectedFiles = sortedFiles.filter(file => selectedItems.has(file.id))
    for (const file of selectedFiles) {
      try {
        await deleteFile(file)
      } catch (error) {
        console.error('Bulk delete error:', error)
      }
    }
    setSelectedItems(new Set())
    toast({
      title: "Dateien archiviert",
      description: `${selectedFiles.length} Dateien wurden ins Archiv verschoben.`
    })
  }

  // Handle navigation
  const handleNavigateUp = () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]
      navigateToPath(parentBreadcrumb.path)
    }
  }

  const handleFolderClick = (folder: VirtualFolder) => {
    navigateToPath(folder.path)
  }

  // Handle file operations
  const handleFileDownload = async (file: StorageObject) => {
    try {
      await downloadFile(file)
    } catch (error) {
      toast({
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      })
    }
  }

  const handleFileDelete = async (file: StorageObject) => {
    try {
      await deleteFile(file)
      toast({
        title: "Datei archiviert",
        description: `${file.name} wurde ins Archiv verschoben.`
      })
    } catch (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: "Die Datei konnte nicht gelöscht werden.",
        variant: "destructive"
      })
    }
  }

  // Handle upload
  const handleUpload = () => {
    if (currentPath) {
      openUploadModal(currentPath, () => {
        refreshCurrentPath()
        toast({
          title: "Upload erfolgreich",
          description: "Dateien wurden erfolgreich hochgeladen."
        })
      })
    }
  }

  // Get current location name
  const getCurrentLocationName = () => {
    if (breadcrumbs.length === 0) return "Cloud Storage"
    return breadcrumbs[breadcrumbs.length - 1].name
  }

  // Check if we're at root level
  const isAtRoot = breadcrumbs.length <= 1

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Modern Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          {/* Navigation and title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {!isAtRoot && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateUp}
                  className="h-9 w-9 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {getCurrentLocationName()}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="flex items-center">
                      {index > 0 && <span className="mx-1 text-muted-foreground/50">/</span>}
                      <button
                        onClick={() => navigateToPath(crumb.path)}
                        className="hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                        disabled={index === breadcrumbs.length - 1}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => refreshCurrentPath()}
                disabled={isLoading}
                className="h-9"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Aktualisieren
              </Button>
              <Button onClick={handleUpload} className="h-9">
                <Upload className="h-4 w-4 mr-2" />
                Hochladen
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <CloudStorageQuickActions
            onUpload={handleUpload}
            onCreateFolder={() => {/* TODO: Create folder */}}
            onSearch={setSearchQuery}
            onSort={(sortBy: string) => setSortBy(sortBy as SortBy)}
            onViewMode={setViewMode}
            onFilter={(filter: string) => setActiveFilter(filter as FilterType)}
            viewMode={viewMode}
            searchQuery={searchQuery}
            selectedCount={selectedItems.size}
            onBulkDownload={selectedItems.size > 0 ? handleBulkDownload : undefined}
            onBulkDelete={selectedItems.size > 0 ? handleBulkDelete : undefined}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Loading State */}
          {isLoading && (
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' 
                ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
                : "grid-cols-1"
            )}>
              {Array.from({ length: viewMode === 'grid' ? 16 : 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  {viewMode === 'grid' ? (
                    <>
                      <div className="bg-muted rounded-lg h-32 mb-3" />
                      <div className="bg-muted rounded h-4 w-3/4 mb-2" />
                      <div className="bg-muted rounded h-3 w-1/2" />
                    </>
                  ) : (
                    <div className="flex items-center p-4 space-x-4">
                      <div className="bg-muted rounded-lg h-12 w-12" />
                      <div className="flex-1 space-y-2">
                        <div className="bg-muted rounded h-4 w-3/4" />
                        <div className="bg-muted rounded h-3 w-1/2" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-16">
              <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
              <Button onClick={() => refreshCurrentPath()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sortedFolders.length === 0 && sortedFiles.length === 0 && (
            <div className="text-center py-16">
              <div className="bg-muted/50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'Keine Ergebnisse gefunden' : 'Noch keine Dateien'}
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {searchQuery 
                  ? `Keine Dateien oder Ordner entsprechen "${searchQuery}"`
                  : 'Laden Sie Ihre ersten Dateien hoch, um zu beginnen.'
                }
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center space-x-3">
                  <Button onClick={handleUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Dateien hochladen
                  </Button>
                  <Button variant="outline" onClick={() => {/* TODO: Create folder */}}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ordner erstellen
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Content Grid/List */}
          {!isLoading && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
            <div className={cn(
              "gap-4",
              viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
                : "space-y-2"
            )}>
              {/* Render Folders */}
              {sortedFolders.map((folder) => (
                <CloudStorageItemCard
                  key={folder.path}
                  item={folder}
                  type="folder"
                  viewMode={viewMode}
                  isSelected={selectedItems.has(folder.path)}
                  onSelect={(selected) => handleItemSelect(folder.path, selected)}
                  onOpen={() => handleFolderClick(folder)}
                />
              ))}

              {/* Render Files */}
              {sortedFiles.map((file) => (
                <CloudStorageItemCard
                  key={file.id}
                  item={file}
                  type="file"
                  viewMode={viewMode}
                  isSelected={selectedItems.has(file.id)}
                  onSelect={(selected) => handleItemSelect(file.id, selected)}
                  onDownload={() => handleFileDownload(file)}
                  onPreview={() => {/* TODO: Preview */}}
                  onDelete={() => handleFileDelete(file)}
                />
              ))}
            </div>
          )}

          {/* Results Summary */}
          {!isLoading && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
            <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
              {sortedFolders.length > 0 && sortedFiles.length > 0 ? (
                `${sortedFolders.length} Ordner, ${sortedFiles.length} Dateien`
              ) : sortedFolders.length > 0 ? (
                `${sortedFolders.length} ${sortedFolders.length === 1 ? 'Ordner' : 'Ordner'}`
              ) : (
                `${sortedFiles.length} ${sortedFiles.length === 1 ? 'Datei' : 'Dateien'}`
              )}
              {searchQuery && ` für "${searchQuery}"`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}