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
import { useNavigationLoading } from "@/hooks/use-optimized-loading"
// Using simple implementations instead of complex render optimization hooks
import { 
  ContentAreaSkeleton, 
  NavigationLoadingOverlay, 
  OptimisticLoading,
  StaticUIWrapper,
  SmartSkeleton
} from "@/components/storage-loading-states"
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
  enableOptimisticUI?: boolean // Feature flag for optimistic UI updates
  enableNavigationCache?: boolean // Feature flag for navigation caching
  isDirectAccess?: boolean // Indicates if this is direct URL access
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
  enableClientNavigation = true,
  enableOptimisticUI = true,
  enableNavigationCache = true,
  isDirectAccess = false
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
  
  // Optimized loading states with feature flag support
  const navigationLoading = useNavigationLoading({
    enableOptimisticUI: enableOptimisticUI,
    contentType: 'mixed',
    minLoadingTime: 100,
    maxSkeletonTime: 2000
  })
  
  // Simple memoization for file list optimization
  const fileListOptimization = useMemo(() => ({
    createFilteredItems: (searchQuery: string, activeFilter: string) => {
      let filteredFiles = files
      let filteredFolders = folders

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filteredFiles = files.filter(file => file.name.toLowerCase().includes(query))
        filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(query))
      }

      switch (activeFilter) {
        case 'folders':
          filteredFiles = []
          break
        case 'images':
          filteredFiles = files.filter(file => {
            const ext = file.name.split('.').pop()?.toLowerCase()
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
          })
          break
        case 'documents':
          filteredFiles = files.filter(file => {
            const ext = file.name.split('.').pop()?.toLowerCase()
            return ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')
          })
          break
      }

      return { filteredFiles, filteredFolders }
    }
  }), [files, folders])
  
  // Simple optimized handlers
  const createSearchHandler = useCallback((setSearchQuery: (query: string) => void) => {
    return (query: string) => {
      setSearchQuery(query)
    }
  }, [])
  
  const createSelectionHandler = useCallback((setSelectedItems: (items: Set<string>) => void) => {
    return (itemId: string, selected: boolean, currentSelection: Set<string>) => {
      const newSelection = new Set(currentSelection)
      if (selected) {
        newSelection.add(itemId)
      } else {
        newSelection.delete(itemId)
      }
      setSelectedItems(newSelection)
    }
  }, [])
  
  // UI state - restored from navigation preferences
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  
  // Navigation mode detection with feature flag support
  const [navigationMode, setNavigationMode] = useState<'ssr' | 'client' | 'hybrid'>(() => {
    if (!enableClientNavigation) return 'ssr'
    if (isSSR && !isDirectAccess) return 'hybrid' // SSR with client navigation capability
    if (isSSR) return 'ssr' // Pure SSR for direct access
    return 'client' // Pure client-side navigation
  })
  
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
        
        // Ensure URL is correct for initial load
        if (enableClientNavigation && initialBreadcrumbs) {
          navigationStore.updateDocumentTitle(initialPath, initialBreadcrumbs)
          
          // Ensure browser history state is set correctly
          const currentUrl = window.location.pathname
          const expectedUrl = navigationStore.getCurrentUrl(initialPath)
          
          if (currentUrl === expectedUrl) {
            // URL is correct, just ensure history state is set
            window.history.replaceState(
              { 
                path: initialPath, 
                clientNavigation: true,
                timestamp: Date.now(),
                scrollPosition: 0
              }, 
              '', 
              currentUrl
            )
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
   * Handle URL synchronization and direct access
   */
  useEffect(() => {
    if (!enableClientNavigation) return
    
    const handleUrlSync = () => {
      const currentUrl = window.location.pathname
      const pathMatch = currentUrl.match(/^\/dateien(?:\/(.+))?$/)
      
      if (pathMatch) {
        const urlPath = pathMatch[1] || ''
        const expectedStoragePath = urlPath ? `user_${userId}/${urlPath}` : `user_${userId}`
        const activePath = currentPath || initialPath
        
        // Check if URL matches current path
        if (activePath && expectedStoragePath !== activePath) {
          // URL doesn't match current path - this might be direct access
          const expectedUrl = navigationStore.getCurrentUrl(activePath)
          
          if (currentUrl !== expectedUrl) {
            // Update URL to match current path
            window.history.replaceState(
              { 
                path: activePath, 
                clientNavigation: true,
                timestamp: Date.now(),
                scrollPosition: window.scrollY
              }, 
              '', 
              expectedUrl
            )
          }
        }
        
        // Update document title
        if (breadcrumbs.length > 0) {
          navigationStore.updateDocumentTitle(activePath || expectedStoragePath, breadcrumbs)
        }
      }
    }
    
    // Run on mount and when paths change
    handleUrlSync()
  }, [enableClientNavigation, userId, currentPath, initialPath, breadcrumbs, navigationStore])

  /**
   * Handle navigation with optimized loading states
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
    
    // Check if data is cached for optimized loading
    const cachedData = navigationStore.getCachedDirectory(targetPath)
    const fromCache = !!cachedData && !cachedData.error
    
    // Start optimized loading
    const startTime = navigationLoading.startNavigation(targetPath, fromCache)
    
    if (enableClientNavigation && (navigationMode === 'client' || navigationMode === 'hybrid')) {
      try {
        // Use client-side navigation for hybrid and client modes
        await handleFolderClick(targetPath, options)
        navigationLoading.completeNavigation(startTime, fromCache)
      } catch (error) {
        console.error('Client navigation failed, falling back to SSR:', error)
        navigationLoading.completeNavigation(startTime, false)
        // Fallback to SSR navigation
        setNavigationMode('ssr')
        router.push(pathToHref(targetPath))
      }
    } else {
      // Use SSR navigation for pure SSR mode or when client navigation is disabled
      navigationLoading.completeNavigation(startTime, false)
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
    saveViewPreferences,
    navigationStore,
    navigationLoading
  ])

  // Optimized filtering and sorting using render optimization
  const { filteredFiles, filteredFolders } = useMemo(() => 
    fileListOptimization.createFilteredItems(searchQuery, activeFilter), 
    [fileListOptimization, searchQuery, activeFilter]
  )

  // Sort items with memoization
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

  // Optimized item selection handler
  const optimizedSelectionHandler = createSelectionHandler(setSelectedItems)
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    optimizedSelectionHandler(itemId, selected, selectedItems)
  }, [optimizedSelectionHandler, selectedItems])

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
        if (enableClientNavigation && (navigationMode === 'client' || navigationMode === 'hybrid')) {
          // Invalidate cache and reload using client navigation
          if (enableNavigationCache) {
            navigationStore.invalidateCache(targetPath)
          }
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

  // Optimized loading state detection
  const showLoading = isLoading || navigationLoading.isNavigating || (enableClientNavigation && isNavigating)
  const showSkeleton = navigationLoading.shouldShowSkeleton && !isLoading
  const showOptimistic = navigationLoading.shouldShowOptimistic

  // Determine which breadcrumbs to show
  const displayBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : (initialBreadcrumbs || [])
  
  // Optimized search handler
  const optimizedSearchHandler = createSearchHandler(setSearchQuery)

  return (
    <NavigationInterceptor 
      userId={userId}
      fallbackToSSR={true}
      enableDebouncing={true}
    >
      <div className="h-full flex flex-col">
        {/* Static Header - preserved during navigation */}
        <StaticUIWrapper isNavigating={navigationLoading.isNavigating}>
          <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="p-6">
              {/* Quick Actions */}
              <CloudStorageQuickActions
                onUpload={handleUpload}
                onCreateFolder={() => {/* TODO: Create folder */}}
                onSearch={optimizedSearchHandler}
                onSort={(sortBy: string) => setSortBy(sortBy as SortBy)}
                onViewMode={setViewMode}
                onFilter={(filter: string) => setActiveFilter(filter as FilterType)}
                viewMode={viewMode}
                searchQuery={searchQuery}
                selectedCount={selectedItems.size}
                onBulkDownload={selectedItems.size > 0 ? handleBulkDownload : undefined}
                onBulkDelete={selectedItems.size > 0 ? handleBulkDelete : undefined}
              />

              {/* Optimistic UI feedback */}
              {enableOptimisticUI && showOptimistic && (
                <div className="mt-4">
                  <OptimisticLoading 
                    action="navigating" 
                    target={currentPath || initialPath}
                  />
                </div>
              )}

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
                          enableClientNavigation && (navigationMode === 'client' || navigationMode === 'hybrid') ? (
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
        </StaticUIWrapper>

        {/* Content Area with optimized loading */}
        <div className="flex-1 overflow-auto relative">
          {/* Navigation loading overlay */}
          <NavigationLoadingOverlay 
            isVisible={navigationLoading.isNavigating && !showSkeleton}
            message="Navigiere..."
            showProgress={navigationLoading.loadingProgress > 0}
            progress={navigationLoading.loadingProgress}
          />
          
          <div className="p-6">
            {/* Smart skeleton loading */}
            {showSkeleton && (
              <div className="animate-fade-in-up">
                <SmartSkeleton
                  type={activeFilter === 'folders' ? 'folders' : activeFilter === 'all' ? 'mixed' : 'files'}
                  viewMode={viewMode}
                  count={viewMode === 'grid' ? 16 : 8}
                />
              </div>
            )}

            {/* Traditional loading state for SSR fallback */}
            {showLoading && !showSkeleton && (
              <ContentAreaSkeleton
                viewMode={viewMode}
                showHeader={false}
                showBreadcrumbs={false}
                itemCount={viewMode === 'grid' ? 16 : 8}
              />
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

            {/* Content Grid/List with fade-in animation */}
            {!showLoading && !showSkeleton && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
              <div className={cn(
                "gap-4 animate-fade-in-up",
                viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8" 
                  : "space-y-2"
              )}>
                {/* Render Folders */}
                {sortedFolders.map((folder, index) => (
                  <div 
                    key={folder.path}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <CloudStorageItemCard
                      item={folder}
                      type="folder"
                      viewMode={viewMode}
                      isSelected={selectedItems.has(folder.path)}
                      onSelect={(selected) => handleItemSelect(folder.path, selected)}
                      onOpen={() => handleFolderClickLocal(folder)}
                      data-folder-path={folder.path}
                    />
                  </div>
                ))}

                {/* Render Files */}
                {sortedFiles.map((file, index) => (
                  <div 
                    key={file.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${(sortedFolders.length + index) * 20}ms` }}
                  >
                    <CloudStorageItemCard
                      item={file}
                      type="file"
                      viewMode={viewMode}
                      isSelected={selectedItems.has(file.id)}
                      onSelect={(selected) => handleItemSelect(file.id, selected)}
                      onDownload={() => handleFileDownload(file)}
                      onPreview={() => {/* TODO: Preview */}}
                      onDelete={() => handleFileDelete(file)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Results Summary with performance info */}
            {!showLoading && !showSkeleton && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
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
                  <div className="flex items-center justify-center space-x-4 mt-2 text-xs opacity-60">
                    <span>({navigationMode === 'client' ? 'Client' : 'SSR'} Mode)</span>
                    {navigationLoading.performanceMetrics.averageLoadTime > 0 && (
                      <span>
                        Ø {Math.round(navigationLoading.performanceMetrics.averageLoadTime)}ms
                      </span>
                    )}
                    {navigationLoading.performanceMetrics.cacheHitRate > 0 && (
                      <span>
                        Cache: {Math.round(navigationLoading.performanceMetrics.cacheHitRate * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationInterceptor>
  )
}