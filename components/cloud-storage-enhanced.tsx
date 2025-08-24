"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { 
  Upload,
  RefreshCw,
  FolderOpen,
  Zap,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { useCloudStorageNavigation, useNavigationState, useViewPreferences } from "@/hooks/use-cloud-storage-navigation"
import { NavigationInterceptor, useFolderNavigation } from "@/components/navigation-interceptor"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage-item-card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface CloudStorageEnhancedProps {
  userId: string
  initialFiles?: StorageObject[]
  initialFolders?: VirtualFolder[]
  initialPath?: string
  initialBreadcrumbs?: BreadcrumbItem[]
  isSSR?: boolean // Indicates if this is server-side rendered
  enableClientNavigation?: boolean // Feature flag for client-side navigation
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

/**
 * Enhanced Cloud Storage Component with Hybrid Navigation
 * 
 * This component supports both SSR and client-side navigation modes:
 * - SSR mode: Traditional server-side rendering for initial loads and fallbacks
 * - Client mode: Fast client-side navigation with state preservation
 * 
 * Features:
 * - Automatic navigation mode detection
 * - View state preservation across navigation
 * - Intelligent caching and preloading
 * - Graceful fallback to SSR when needed
 * - Browser history integration
 */
export function CloudStorageEnhanced({ 
  userId, 
  initialFiles, 
  initialFolders, 
  initialPath, 
  initialBreadcrumbs,
  isSSR = false,
  enableClientNavigation = true
}: CloudStorageEnhancedProps) {
  // Navigation state from the enhanced navigation store
  const navigationStore = useCloudStorageNavigation()
  const { currentPath, isNavigating, navigateToPath } = useNavigationState()
  const { getViewPreferences, setViewPreferences } = useViewPreferences()
  
  // Original cloud storage store for backward compatibility
  const { 
    files, 
    folders, 
    isLoading, 
    error,
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
  
  // Enhanced folder navigation hook
  const { handleFolderClick, pathToHref } = useFolderNavigation(userId)
  
  // UI state - restored from navigation preferences
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  // Navigation mode detection
  const [navigationMode, setNavigationMode] = useState<'ssr' | 'client'>(
    isSSR ? 'ssr' : (enableClientNavigation ? 'client' : 'ssr')
  )
  
  const { openUploadModal } = useModalStore()
  const { toast } = useToast()
  const router = useRouter()

  /**
   * Detect if this is an initial load or client-side navigation
   */
  const isInitialLoad = useMemo(() => {
    return isSSR || !currentPath || currentPath !== initialPath
  }, [isSSR, currentPath, initialPath])

  /**
   * Initialize component with appropriate data source
   */
  useEffect(() => {
    const initializeComponent = async () => {
      if (isInitialLoad && initialPath) {
        // SSR or initial client load - use provided initial data
        setCurrentPath(initialPath)
        if (initialFiles) setFiles(initialFiles)
        if (initialFolders) setFolders(initialFolders)
        if (initialBreadcrumbs) setBreadcrumbs(initialBreadcrumbs)
        setError(null)
        setLoading(false)
        
        // Initialize navigation store with SSR data if using client navigation
        if (enableClientNavigation && !isSSR) {
          try {
            await navigationStore.navigateToPath(initialPath, { 
              skipHistory: true,
              force: true 
            })
          } catch (error) {
            console.warn('Failed to initialize navigation store:', error)
            // Continue with SSR mode as fallback
            setNavigationMode('ssr')
          }
        }
        
        // Restore view preferences for this path
        restoreViewPreferences(initialPath)
        
      } else if (enableClientNavigation && currentPath && currentPath !== initialPath) {
        // Client-side navigation - data should already be loaded by navigation store
        const cachedData = navigationStore.getCachedDirectory(currentPath)
        if (cachedData && !cachedData.error) {
          setFiles(cachedData.files)
          setFolders(cachedData.folders.map(folder => ({
            name: folder.name,
            path: folder.path,
            type: folder.type as any,
            isEmpty: folder.isEmpty,
            children: [],
            fileCount: folder.fileCount,
            displayName: folder.displayName
          })))
          setBreadcrumbs(cachedData.breadcrumbs)
          setError(null)
          setLoading(false)
        }
        
        // Restore view preferences for current path
        restoreViewPreferences(currentPath)
      }
    }

    initializeComponent()
  }, [
    isInitialLoad, 
    initialPath, 
    initialFiles, 
    initialFolders, 
    initialBreadcrumbs,
    currentPath,
    enableClientNavigation,
    isSSR,
    navigationStore,
    setCurrentPath,
    setFiles,
    setFolders,
    setBreadcrumbs,
    setError,
    setLoading
  ])

  /**
   * Restore view preferences from navigation store
   */
  const restoreViewPreferences = useCallback((path: string) => {
    if (!enableClientNavigation) return
    
    try {
      const preferences = getViewPreferences(path)
      setViewMode(preferences.viewMode)
      setSortBy(preferences.sortBy as SortBy)
      setSearchQuery(preferences.searchQuery || '')
      setSelectedItems(new Set(preferences.selectedItems))
      
      // Also restore from localStorage as fallback
      const viewModeStored = localStorage.getItem('cloudStorage:viewMode')
      const sortByStored = localStorage.getItem('cloudStorage:sortBy')
      const filterStored = localStorage.getItem('cloudStorage:filter')
      const searchStored = localStorage.getItem('cloudStorage:searchQuery')
      
      if (viewModeStored && (viewModeStored === 'grid' || viewModeStored === 'list')) {
        setViewMode(viewModeStored as ViewMode)
      }
      if (sortByStored && ['name', 'date', 'size', 'type'].includes(sortByStored)) {
        setSortBy(sortByStored as SortBy)
      }
      if (filterStored && ['all', 'folders', 'images', 'documents', 'recent'].includes(filterStored)) {
        setActiveFilter(filterStored as FilterType)
      }
      if (searchStored !== null) {
        setSearchQuery(searchStored)
      }
    } catch (error) {
      console.warn('Failed to restore view preferences:', error)
    }
  }, [enableClientNavigation, getViewPreferences])

  /**
   * Save current view preferences
   */
  const saveViewPreferences = useCallback((path: string) => {
    if (!enableClientNavigation || !path) return
    
    try {
      const preferences = {
        viewMode,
        sortBy,
        sortOrder: 'asc' as const,
        selectedItems,
        searchQuery
      }
      
      setViewPreferences(path, preferences)
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('cloudStorage:viewMode', viewMode)
      localStorage.setItem('cloudStorage:sortBy', sortBy)
      localStorage.setItem('cloudStorage:filter', activeFilter)
      localStorage.setItem('cloudStorage:searchQuery', searchQuery)
    } catch (error) {
      console.warn('Failed to save view preferences:', error)
    }
  }, [enableClientNavigation, viewMode, sortBy, selectedItems, searchQuery, activeFilter, setViewPreferences])

  /**
   * Save view preferences when they change
   */
  useEffect(() => {
    const path = currentPath || initialPath
    if (path) {
      saveViewPreferences(path)
    }
  }, [viewMode, sortBy, searchQuery, activeFilter, currentPath, initialPath, saveViewPreferences])

  /**
   * Handle navigation with mode detection
   */
  const handleNavigation = useCallback(async (targetPath: string, options: any = {}) => {
    // Clear selections when navigating to different directory
    if (targetPath !== (currentPath || initialPath)) {
      setSelectedItems(new Set())
    }
    
    // Save current view state before navigation
    const currentPathForSave = currentPath || initialPath
    if (currentPathForSave) {
      saveViewPreferences(currentPathForSave)
    }
    
    if (enableClientNavigation && navigationMode === 'client') {
      try {
        // Use client-side navigation
        await handleFolderClick(targetPath, options)
      } catch (error) {
        console.error('Client navigation failed, falling back to SSR:', error)
        // Fallback to SSR navigation
        setNavigationMode('ssr')
        router.push(pathToHref(targetPath))
      }
    } else {
      // Use SSR navigation
      router.push(pathToHref(targetPath))
    }
  }, [
    enableClientNavigation,
    navigationMode,
    currentPath,
    initialPath,
    handleFolderClick,
    pathToHref,
    router,
    saveViewPreferences
  ])

  // Filter items based on search and active filter
  const filterItems = useCallback(() => {
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
  }, [files, folders, searchQuery, activeFilter])

  const { filteredFiles, filteredFolders } = filterItems()

  // Sort items
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

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(itemId)
      } else {
        newSet.delete(itemId)
      }
      return newSet
    })
  }, [])

  // Handle bulk operations
  const handleBulkDownload = useCallback(async () => {
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
  }, [sortedFiles, selectedItems, downloadFile, toast])

  const handleBulkDelete = useCallback(async () => {
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
      description: `${selectedFiles.length} Dateien wurden ins Archiv verschoben.`
    })
  }, [sortedFiles, selectedItems, deleteFile, toast])

  // Handle navigation up
  const handleNavigateUp = useCallback(() => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]
      handleNavigation(parentBreadcrumb.path)
    }
  }, [breadcrumbs, handleNavigation])

  // Handle folder click
  const handleFolderClickLocal = useCallback((folder: VirtualFolder) => {
    handleNavigation(folder.path)
  }, [handleNavigation])

  // Handle file operations
  const handleFileDownload = useCallback(async (file: StorageObject) => {
    try {
      await downloadFile(file)
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

  // Handle upload
  const handleUpload = useCallback(() => {
    const targetPath = currentPath || initialPath
    if (targetPath) {
      openUploadModal(targetPath, () => {
        if (enableClientNavigation && navigationMode === 'client') {
          // Invalidate cache and reload
          navigationStore.invalidateCache(targetPath)
          handleNavigation(targetPath, { force: true })
        } else {
          // Refresh using traditional method
          refreshCurrentPath()
        }
        toast({
          description: "Dateien wurden erfolgreich hochgeladen."
        })
      })
    }
  }, [
    currentPath, 
    initialPath, 
    openUploadModal, 
    enableClientNavigation, 
    navigationMode, 
    navigationStore, 
    handleNavigation, 
    refreshCurrentPath, 
    toast
  ])

  // Show loading state during navigation
  const showLoading = isLoading || (enableClientNavigation && isNavigating)

  // Determine which breadcrumbs to show
  const displayBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : (initialBreadcrumbs || [])

  return (
    <NavigationInterceptor 
      userId={userId}
      fallbackToSSR={true}
      enableDebouncing={true}
    >
      <div className="h-full flex flex-col">
        {/* Header with Quick Actions */}
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

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-1 text-base mt-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-1">
                {displayBreadcrumbs.map((breadcrumb, index) => {
                  const isLast = index === displayBreadcrumbs.length - 1
                  
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
                        enableClientNavigation && navigationMode === 'client' ? (
                          <button
                            onClick={() => handleNavigation(breadcrumb.path)}
                            className={cn(
                              "flex items-center px-2.5 py-1.5 rounded-md transition-colors",
                              "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                            )}
                            data-folder-path={breadcrumb.path}
                          >
                            {breadcrumb.type === 'root' && (
                              <FolderOpen className="h-4 w-4 mr-1.5" />
                            )}
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">
                              {breadcrumb.name}
                            </span>
                          </button>
                        ) : (
                          <Link
                            href={pathToHref(breadcrumb.path)}
                            className={cn(
                              "flex items-center px-2.5 py-1.5 rounded-md transition-colors",
                              "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                            )}
                          >
                            {breadcrumb.type === 'root' && (
                              <FolderOpen className="h-4 w-4 mr-1.5" />
                            )}
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">
                              {breadcrumb.name}
                            </span>
                          </Link>
                        )
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Loading State */}
            {showLoading && (
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
            {error && !showLoading && (
              <div className="text-center py-16">
                <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
                <Button onClick={() => {
                  if (enableClientNavigation && navigationMode === 'client') {
                    const targetPath = currentPath || initialPath
                    if (targetPath) {
                      handleNavigation(targetPath, { force: true })
                    }
                  } else {
                    refreshCurrentPath()
                  }
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!showLoading && !error && sortedFolders.length === 0 && sortedFiles.length === 0 && (
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
            {!showLoading && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
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
                    onOpen={() => handleFolderClickLocal(folder)}
                    data-folder-path={folder.path}
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
            {!showLoading && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
              <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                {sortedFolders.length > 0 && sortedFiles.length > 0 ? (
                  `${sortedFolders.length} Ordner, ${sortedFiles.length} Dateien`
                ) : sortedFolders.length > 0 ? (
                  `${sortedFolders.length} ${sortedFolders.length === 1 ? 'Ordner' : 'Ordner'}`
                ) : (
                  `${sortedFiles.length} ${sortedFiles.length === 1 ? 'Datei' : 'Dateien'}`
                )}
                {searchQuery && ` für "${searchQuery}"`}
                {enableClientNavigation && (
                  <span className="ml-2 text-xs opacity-60">
                    ({navigationMode === 'client' ? 'Client' : 'SSR'} Mode)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationInterceptor>
  )
}