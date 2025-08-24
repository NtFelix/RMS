"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { 
  Upload,
  RefreshCw,
  FolderOpen,
  Zap,
  Plus,
  ArrowUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { useReliableNavigation } from "@/hooks/use-reliable-navigation"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage-item-card"
import { cn } from "@/lib/utils"

interface CloudStorageReliableProps {
  userId: string
  initialFiles?: StorageObject[]
  initialFolders?: VirtualFolder[]
  initialPath?: string
  initialBreadcrumbs?: BreadcrumbItem[]
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

/**
 * Reliable Cloud Storage Component
 * 
 * This is a simplified, more reliable version of the cloud storage component
 * that focuses on stability and consistent navigation behavior.
 */
export function CloudStorageReliable({ 
  userId, 
  initialFiles = [], 
  initialFolders = [], 
  initialPath = `user_${userId}`, 
  initialBreadcrumbs = []
}: CloudStorageReliableProps) {
  // Use the reliable navigation hook
  const navigation = useReliableNavigation(userId)
  
  // Use the existing cloud storage store for data management
  const { 
    files, 
    folders, 
    isLoading, 
    error: storeError,
    breadcrumbs,
    setCurrentPath,
    setFiles,
    setFolders,
    setBreadcrumbs,
    setLoading,
    setError,
    refreshCurrentPath,
    downloadFile,
    deleteFile
  } = useCloudStorageStore()
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  const { openUploadModal } = useModalStore()
  const { toast } = useToast()
  
  /**
   * Initialize component with initial data
   */
  useEffect(() => {
    if (initialPath) {
      navigation.setCurrentPath(initialPath)
      setCurrentPath(initialPath)
      
      if (initialFiles.length > 0) setFiles(initialFiles)
      if (initialFolders.length > 0) setFolders(initialFolders)
      if (initialBreadcrumbs.length > 0) setBreadcrumbs(initialBreadcrumbs)
      
      setError(null)
      setLoading(false)
    }
  }, [initialPath, initialFiles, initialFolders, initialBreadcrumbs])
  
  /**
   * Handle folder navigation
   */
  const handleFolderClick = useCallback((folder: VirtualFolder) => {
    // Clear selections when navigating
    setSelectedItems(new Set())
    
    // Use reliable navigation
    navigation.navigate(folder.path)
  }, [navigation])
  
  /**
   * Handle breadcrumb navigation
   */
  const handleBreadcrumbClick = useCallback((breadcrumb: BreadcrumbItem) => {
    // Clear selections when navigating
    setSelectedItems(new Set())
    
    // Use reliable navigation
    navigation.navigate(breadcrumb.path)
  }, [navigation])
  
  /**
   * Handle navigate up
   */
  const handleNavigateUp = useCallback(() => {
    navigation.navigateUp()
  }, [navigation])
  
  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setSelectedItems(new Set())
    refreshCurrentPath()
  }, [refreshCurrentPath])
  
  /**
   * Filter and sort items
   */
  const { filteredFiles, filteredFolders } = useMemo(() => {
    let filteredFiles = files
    let filteredFolders = folders

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredFiles = files.filter(file => file.name.toLowerCase().includes(query))
      filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(query))
    }

    // Apply type filter
    switch (activeFilter) {
      case 'folders':
        filteredFiles = []
        break
      case 'images':
        filteredFiles = files.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase()
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
        })
        filteredFolders = []
        break
      case 'documents':
        filteredFiles = files.filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase()
          return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext || '')
        })
        filteredFolders = []
        break
      case 'recent':
        // Show files modified in last 7 days
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        filteredFiles = files.filter(file => 
          new Date(file.updated_at) > weekAgo
        )
        break
    }

    return { filteredFiles, filteredFolders }
  }, [files, folders, searchQuery, activeFilter])
  
  /**
   * Sort items
   */
  const sortItems = useCallback(<T extends { name: string; updated_at?: string; size?: number }>(items: T[]): T[] => {
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
  }, [sortBy])

  const sortedFiles = useMemo(() => sortItems(filteredFiles), [sortItems, filteredFiles])
  const sortedFolders = useMemo(() => 
    sortItems(filteredFolders.map(f => ({ ...f, updated_at: '', size: 0 }))), 
    [sortItems, filteredFolders]
  )
  
  /**
   * Handle item selection
   */
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev)
      if (selected) {
        newSelection.add(itemId)
      } else {
        newSelection.delete(itemId)
      }
      return newSelection
    })
  }, [])
  
  /**
   * Handle bulk operations
   */
  const handleBulkDownload = useCallback(async () => {
    const selectedFiles = sortedFiles.filter(file => selectedItems.has(file.id))
    
    try {
      await Promise.all(selectedFiles.map(file => downloadFile(file)))
      toast({
        title: "Download gestartet",
        description: `${selectedFiles.length} Dateien werden heruntergeladen.`
      })
    } catch (error) {
      toast({
        title: "Download Fehler",
        description: "Einige Dateien konnten nicht heruntergeladen werden.",
        variant: "destructive"
      })
    }
    
    setSelectedItems(new Set())
  }, [sortedFiles, selectedItems, downloadFile, toast])

  const handleBulkDelete = useCallback(async () => {
    const selectedFiles = sortedFiles.filter(file => selectedItems.has(file.id))
    
    try {
      await Promise.all(selectedFiles.map(file => deleteFile(file)))
      toast({
        description: `${selectedFiles.length} Dateien wurden ins Archiv verschoben.`
      })
    } catch (error) {
      toast({
        title: "Lösch-Fehler",
        description: "Einige Dateien konnten nicht gelöscht werden.",
        variant: "destructive"
      })
    }
    
    setSelectedItems(new Set())
  }, [sortedFiles, selectedItems, deleteFile, toast])
  
  /**
   * Handle file operations
   */
  const handleFileDownload = useCallback(async (file: StorageObject) => {
    try {
      await downloadFile(file)
      toast({
        description: `${file.name} wurde heruntergeladen.`
      })
    } catch (error) {
      toast({
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      })
    }
  }, [downloadFile, toast])

  const handleFileDelete = useCallback(async (file: StorageObject) => {
    try {
      await deleteFile(file)
      toast({
        description: `${file.name} wurde ins Archiv verschoben.`
      })
    } catch (error) {
      toast({
        description: "Die Datei konnte nicht gelöscht werden.",
        variant: "destructive"
      })
    }
  }, [deleteFile, toast])
  
  /**
   * Handle upload
   */
  const handleUpload = useCallback(() => {
    const targetPath = navigation.currentPath || initialPath
    if (targetPath) {
      openUploadModal(targetPath, () => {
        handleRefresh()
        toast({
          description: "Dateien wurden erfolgreich hochgeladen."
        })
      })
    }
  }, [navigation.currentPath, initialPath, openUploadModal, handleRefresh, toast])
  
  // Determine loading state
  const showLoading = isLoading || navigation.isNavigating
  const displayError = storeError || navigation.error
  
  // Clear navigation error when store error is cleared
  useEffect(() => {
    if (!storeError && navigation.error) {
      navigation.clearError()
    }
  }, [storeError, navigation.error])
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
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

          {/* Navigation Loading Indicator */}
          {navigation.isNavigating && (
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Navigiere...
            </div>
          )}

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-1 text-base mt-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
              {breadcrumbs.map((breadcrumb, index) => {
                const isLast = index === breadcrumbs.length - 1
                
                return (
                  <li key={breadcrumb.path} className="flex items-center">
                    {index > 0 && (
                      <span className="mx-2.5 text-muted-foreground/50">/</span>
                    )}
                    
                    {isLast ? (
                      <span
                        className={cn(
                          "flex items-center px-2.5 py-1.5 rounded-md transition-colors",
                          "text-foreground font-medium cursor-default"
                        )}
                        aria-current="page"
                      >
                        {breadcrumb.type === 'root' && (
                          <FolderOpen className="h-4 w-4 mr-1.5" />
                        )}
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">
                          {breadcrumb.name}
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBreadcrumbClick(breadcrumb)}
                        disabled={navigation.isNavigating}
                        className={cn(
                          "flex items-center px-2.5 py-1.5 rounded-md transition-colors",
                          "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {breadcrumb.type === 'root' && (
                          <FolderOpen className="h-4 w-4 mr-1.5" />
                        )}
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">
                          {breadcrumb.name}
                        </span>
                      </button>
                    )}
                  </li>
                )
              })}
              
              {/* Navigate Up Button */}
              {breadcrumbs.length > 1 && (
                <li className="flex items-center ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNavigateUp}
                    disabled={navigation.isNavigating}
                    className="h-8 px-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </li>
              )}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Loading State */}
          {showLoading && (
            <div className="text-center py-16">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Lade Dateien...</p>
            </div>
          )}

          {/* Error State */}
          {displayError && !showLoading && (
            <div className="text-center py-16">
              <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{displayError}</p>
              <div className="flex items-center justify-center space-x-3">
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
                {navigation.error && (
                  <Button variant="outline" onClick={navigation.clearError}>
                    Fehler ignorieren
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!showLoading && !displayError && sortedFolders.length === 0 && sortedFiles.length === 0 && (
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
          {!showLoading && !displayError && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
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
                  onDelete={() => handleFileDelete(file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}