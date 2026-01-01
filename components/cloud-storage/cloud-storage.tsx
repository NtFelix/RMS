"use client"

import { useEffect, useState, useCallback, useMemo, useRef, useTransition } from "react"
import { posthogLogger } from "@/lib/posthog-logger"
import {
    Upload,
    RefreshCw,
    FolderOpen,
    Zap,
    Plus,
    ArrowUp,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem, isFolderDeletable } from "@/hooks/use-cloud-storage-store"
import { useRouter } from "next/navigation"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage/cloud-storage-item-card"
import { DocumentsSummaryCards } from "@/components/common/documents-summary-cards"
import { cn } from "@/lib/utils"
import { loadFilesOptimized, cancelPendingLoad, cancelAllPendingLoads } from "@/lib/optimized-file-loader"
import { FileGridSkeleton } from "@/components/cloud-storage/storage-loading-states"

interface CloudStorageProps {
    userId: string
    initialFiles?: StorageObject[]
    initialFolders?: VirtualFolder[]
    initialPath?: string
    initialBreadcrumbs?: BreadcrumbItem[]
    initialTotalSize?: number
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

/**
 * Cloud Storage Component without circular dependencies
 * 
 * This version avoids the infinite loop issues by:
 * - Managing navigation state locally
 * - Using direct store calls for data loading
 * - Avoiding circular dependencies between hooks
 */
export function CloudStorage({
    userId,
    initialFiles = [],
    initialFolders = [],
    initialPath = `user_${userId}`,
    initialBreadcrumbs = [],
    initialTotalSize = 0
}: CloudStorageProps) {
    const router = useRouter()
    const { toast } = useToast()
    const { openUploadModal, openCreateFolderModal, openCreateFileModal } = useModalStore()

    // Local navigation state with enhanced reliability
    const [currentNavPath, setCurrentNavPath] = useState(initialPath)
    const [isNavigating, setIsNavigating] = useState(false)
    const [navigationError, setNavigationError] = useState<string | null>(null)

    // React 18 transition for optimistic UI updates
    const [isPending, startTransition] = useTransition()

    // Abort controller for request cancellation
    const navigationAbortRef = useRef<AbortController | null>(null)
    const navigationVersionRef = useRef(0) // Version counter to track stale requests
    const lastNavigationTimeRef = useRef(0) // Debounce rapid navigations
    const NAVIGATION_DEBOUNCE_MS = 50

    // Use the cloud storage store for data management
    const {
        files,
        folders,
        isLoading,
        error: storeError,
        breadcrumbs,
        currentPath: storePath,
        setCurrentPath,
        setFiles,
        setFolders,
        setBreadcrumbs,
        setLoading,
        setError,
        navigateToPath,
        refreshCurrentPath,
        downloadFile,
        deleteFile,
        deleteFolder
    } = useCloudStorageStore()

    // UI state
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [sortBy, setSortBy] = useState<SortBy>('name')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [activeFilter, setActiveFilter] = useState<FilterType>('all')
    const [totalStorageSize, setTotalStorageSize] = useState(initialTotalSize)
    const [retryCount, setRetryCount] = useState(0)
    const MAX_RETRIES = 3

    // Track initialization
    const isInitialized = useRef(false)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel any pending navigations when component unmounts
            if (navigationAbortRef.current) {
                navigationAbortRef.current.abort()
            }
            cancelAllPendingLoads(userId)
        }
    }, [userId])

    /**
     * Convert storage path to URL path
     */
    const pathToUrl = useCallback((path: string): string => {
        const base = `user_${userId}`
        if (!path || path === base) return "/dateien"

        const prefix = `${base}/`
        if (path.startsWith(prefix)) {
            const rest = path.slice(prefix.length)
            return `/dateien/${rest}`
        }
        return "/dateien"
    }, [userId])

    /**
     * Initialize component with initial data
     */
    useEffect(() => {
        if (!isInitialized.current && initialPath) {
            isInitialized.current = true

            setCurrentNavPath(initialPath)
            setCurrentPath(initialPath)

            if (initialFiles.length > 0) setFiles(initialFiles)
            if (initialFolders.length > 0) setFolders(initialFolders)
            if (initialBreadcrumbs.length > 0) setBreadcrumbs(initialBreadcrumbs)

            setError(null)
            setLoading(false)
        }
    }, [initialPath, initialFiles, initialFolders, initialBreadcrumbs, setCurrentPath, setFiles, setFolders, setBreadcrumbs, setError, setLoading])

    /**
     * Handle efficient navigation with cancellation, debouncing, and retry logic
     */
    const handleNavigate = useCallback(async (path: string, useClientSide = true) => {
        // Skip if navigating to same path
        if (path === currentNavPath) return

        // Debounce rapid navigations
        const now = Date.now()
        if (now - lastNavigationTimeRef.current < NAVIGATION_DEBOUNCE_MS) {
            return
        }
        lastNavigationTimeRef.current = now

        // Cancel any previous navigation
        if (navigationAbortRef.current) {
            navigationAbortRef.current.abort()
            cancelPendingLoad(userId, currentNavPath)
        }

        // Create new abort controller for this navigation
        const abortController = new AbortController()
        navigationAbortRef.current = abortController

        // Increment version to detect stale responses
        const navigationVersion = ++navigationVersionRef.current

        // Optimistic update: immediately update the path and clear selections
        startTransition(() => {
            setCurrentNavPath(path)
            setSelectedItems(new Set())
            setNavigationError(null)
        })

        setIsNavigating(true)

        try {
            if (useClientSide) {
                // Update URL without page reload
                const url = pathToUrl(path)
                const currentUrl = window.location.pathname + window.location.search

                if (url !== currentUrl) {
                    window.history.pushState({ path, clientNavigation: true }, '', url)
                }

                // Use optimized file loader with abort support
                const result = await loadFilesOptimized(userId, path, abortController.signal)

                // Check if this navigation is still current
                if (navigationVersionRef.current !== navigationVersion) {
                    console.log('Stale navigation response, ignoring:', path)
                    return
                }

                // Check if aborted
                if (abortController.signal.aborted) {
                    return
                }

                if (result.error && !result.error.includes('cancelled')) {
                    throw new Error(result.error)
                }

                // Update store with new data
                startTransition(() => {
                    setCurrentPath(path)
                    setFiles(result.files)
                    setFolders(result.folders)
                    if (result.breadcrumbs.length > 0) {
                        setBreadcrumbs(result.breadcrumbs)
                    }
                    setError(null)
                })

                setRetryCount(0) // Reset retry count on success

            } else {
                // Use Next.js router for server-side navigation
                const url = pathToUrl(path)
                router.push(url)
            }
        } catch (error) {
            // Check if this navigation is still current
            if (navigationVersionRef.current !== navigationVersion) {
                return
            }

            // Don't show error for cancelled requests
            if (abortController.signal.aborted) {
                return
            }

            const errorMessage = error instanceof Error ? error.message : 'Navigation failed'
            console.error('Navigation failed:', errorMessage)

            // Auto-retry logic with exponential backoff
            if (retryCount < MAX_RETRIES && !errorMessage.includes('cancelled')) {
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000)
                setRetryCount(prev => prev + 1)

                console.log(`Retrying navigation in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)

                setTimeout(() => {
                    if (navigationVersionRef.current === navigationVersion) {
                        handleNavigate(path, useClientSide)
                    }
                }, retryDelay)

                return
            }

            setNavigationError(errorMessage)

            // Fallback to server-side navigation
            if (useClientSide && retryCount >= MAX_RETRIES) {
                toast({
                    title: "Navigation Error",
                    description: "Verbindungsproblem. Die Seite wird neu geladen...",
                    variant: "destructive"
                })

                // Force server-side navigation as last resort
                setTimeout(() => {
                    const url = pathToUrl(path)
                    router.push(url)
                }, 1500)
            }
        } finally {
            // Only update navigating state if this is the current navigation
            if (navigationVersionRef.current === navigationVersion) {
                setIsNavigating(false)
            }
        }
    }, [currentNavPath, pathToUrl, router, toast, userId, setCurrentPath, setFiles, setFolders, setBreadcrumbs, setError, retryCount, startTransition])

    /**
     * Handle folder navigation
     */
    const handleFolderClick = useCallback((folder: VirtualFolder) => {
        handleNavigate(folder.path, true)
    }, [handleNavigate])

    /**
     * Handle breadcrumb navigation
     */
    const handleBreadcrumbClick = useCallback((breadcrumb: BreadcrumbItem) => {
        handleNavigate(breadcrumb.path, true)
    }, [handleNavigate])

    /**
     * Handle navigate up
     */
    const handleNavigateUp = useCallback(() => {
        if (currentNavPath) {
            const segments = currentNavPath.split('/').filter(Boolean)
            if (segments.length > 1) {
                const parentPath = segments.slice(0, -1).join('/')
                handleNavigate(parentPath, true)
            }
        }
    }, [currentNavPath, handleNavigate])

    /**
     * Handle refresh with optimized parallel loading
     * @param showToast - Whether to show a toast notification (default: true for manual refresh)
     */
    const handleRefresh = useCallback(async (showToast = true) => {
        setSelectedItems(new Set())
        setIsNavigating(true)
        setNavigationError(null)

        try {
            // Load files and storage size in parallel
            const [fileResult, size] = await Promise.all([
                loadFilesOptimized(userId, currentNavPath),
                import('@/app/(dashboard)/dateien/actions').then(mod =>
                    mod.getTotalStorageUsage(userId)
                )
            ])

            // Update UI with fresh data
            startTransition(() => {
                if (!fileResult.error) {
                    setFiles(fileResult.files)
                    setFolders(fileResult.folders)
                    if (fileResult.breadcrumbs.length > 0) {
                        setBreadcrumbs(fileResult.breadcrumbs)
                    }
                    setError(null)
                }
                setTotalStorageSize(size)
            })

            // Only show toast for manual refresh
            if (showToast) {
                toast({
                    description: "Dateien wurden aktualisiert."
                })
            }
        } catch (error) {
            console.error('Failed to refresh:', error)
            // Silent fail for refresh, just log
        } finally {
            setIsNavigating(false)
        }
    }, [userId, currentNavPath, setFiles, setFolders, setBreadcrumbs, setError, toast, startTransition])

    /**
     * Handle browser back/forward navigation
     */
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.clientNavigation && event.state?.path) {
                console.log('Handling browser navigation to:', event.state.path)
                setCurrentNavPath(event.state.path)
                navigateToPath(event.state.path).catch((error) => {
                    console.error('Browser navigation failed:', error)
                    setNavigationError(error instanceof Error ? error.message : 'Navigation failed')
                })
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [navigateToPath])

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
     * Calculate total file size
     */
    /**
     * Calculate total file size - NOW USING SERVER-SIDE TOTAL
     */
    // We use the state variable totalStorageSize which is initialized from server and updated on refresh
    const totalFileSize = totalStorageSize

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
                description: `${selectedFiles.length} Dateien wurden dauerhaft gelöscht.`
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
                description: `${file.name} wurde dauerhaft gelöscht.`
            })
        } catch (error) {
            toast({
                description: "Die Datei konnte nicht gelöscht werden.",
                variant: "destructive"
            })
        }
    }, [deleteFile, toast])

    const handleFolderDelete = useCallback(async (folder: VirtualFolder) => {
        const { openFolderDeleteConfirmationModal } = useModalStore.getState()

        openFolderDeleteConfirmationModal({
            folderName: folder.displayName || folder.name,
            folderPath: folder.path,
            fileCount: folder.fileCount,
            onConfirm: async () => {
                try {
                    await deleteFolder(folder)
                    toast({
                        description: `Ordner "${folder.displayName || folder.name}" wurde dauerhaft gelöscht.`
                    })
                } catch (error) {
                    toast({
                        description: error instanceof Error ? error.message : "Der Ordner konnte nicht gelöscht werden.",
                        variant: "destructive"
                    })
                    throw error // Re-throw to let the modal handle the error state
                }
            }
        })
    }, [deleteFolder, toast])

    /**
     * Handle upload
     */
    const handleUpload = useCallback(() => {
        const targetPath = currentNavPath || initialPath
        if (targetPath) {
            openUploadModal(targetPath, () => {
                // Note: Modal already refreshes, just show success toast
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            })
        }
    }, [currentNavPath, initialPath, openUploadModal, toast])

    /**
     * Handle upload with files (for drag & drop)
     */
    const handleUploadWithFiles = useCallback((files: File[]) => {
        const targetPath = currentNavPath || initialPath
        if (targetPath) {
            openUploadModal(targetPath, () => {
                // Note: Modal already refreshes, just show success toast
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            }, files)
        }
    }, [currentNavPath, initialPath, openUploadModal, toast])

    /**
     * Handle create folder
     */
    const handleCreateFolder = useCallback(() => {
        const targetPath = currentNavPath || initialPath
        if (targetPath) {
            openCreateFolderModal(targetPath, (folderName: string) => {
                // Add the new folder to the current folders list immediately for better UX
                const newFolder: VirtualFolder = {
                    name: folderName,
                    path: `${targetPath}/${folderName}`,
                    type: 'storage',
                    isEmpty: true,
                    children: [],
                    fileCount: 0,
                    displayName: folderName
                }

                // Update the folders list
                setFolders([...folders, newFolder])

                // Refresh to get the latest data from server (no toast - we show our own)
                handleRefresh(false)

                toast({
                    description: `Ordner "${folderName}" wurde erfolgreich erstellt.`
                })
            })
        }
    }, [currentNavPath, initialPath, openCreateFolderModal, folders, setFolders, handleRefresh, toast])

    /**
     * Handle create file
     */
    const handleCreateFile = useCallback(() => {
        const targetPath = currentNavPath || initialPath
        if (targetPath) {
            openCreateFileModal(targetPath, (fileName: string) => {
                // Refresh to get the latest data from server (no toast - we show our own)
                handleRefresh(false)

                toast({
                    description: `Datei "${fileName}" wurde erfolgreich erstellt.`
                })
            })
        }
    }, [currentNavPath, initialPath, openCreateFileModal, handleRefresh, toast])

    // Determine loading and error states (include isPending for smoother transitions)
    // Determine loading and error states (include isPending for smoother transitions)
    const showLoading = isLoading || isNavigating || isPending
    const displayError = storeError || navigationError

    return (
        <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
            <div
                className="absolute inset-0 z-[-1]"
                style={{
                    backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
                }}
            />

            {/* Summary Cards Container */}
            <DocumentsSummaryCards
                totalSize={totalFileSize}
                onUpload={handleUploadWithFiles}
                onCreateFolder={handleCreateFolder}
            />

            {/* Main File Container */}
            <div className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem] h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                        <div className="flex flex-row items-start justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-semibold">Dateien</h1>
                                <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Dateien und Ordner</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <CloudStorageQuickActions
                            onUpload={handleUpload}
                            onCreateFolder={handleCreateFolder}
                            onCreateFile={handleCreateFile}
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
                                                    disabled={isNavigating}
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
                                            disabled={isNavigating}
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

                        {/* Loading State - Premium Skeleton Loading */}
                        {showLoading && (
                            <div className="animate-in fade-in duration-300">
                                {retryCount > 0 && (
                                    <div className="flex items-center justify-center space-x-2 text-amber-600 mb-6 bg-amber-50 dark:bg-amber-900/10 py-3 rounded-xl border border-amber-100 dark:border-amber-900/20 animate-pulse">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span className="text-sm font-medium">
                                            Verbindungsproblem. Erneuter Versuch ({retryCount}/{MAX_RETRIES})...
                                        </span>
                                    </div>
                                )}
                                <FileGridSkeleton
                                    viewMode={viewMode}
                                    count={files.length > 0 ? Math.max(files.length + folders.length, 8) : 12}
                                />
                            </div>
                        )}

                        {/* Error State */}
                        {displayError && !showLoading && (
                            <div className="text-center py-16">
                                <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <AlertCircle className="h-8 w-8 text-destructive" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
                                <p className="text-muted-foreground mb-2 max-w-md mx-auto">{displayError}</p>
                                {retryCount >= MAX_RETRIES && (
                                    <p className="text-xs text-muted-foreground/70 mb-4">
                                        Alle automatischen Versuche fehlgeschlagen
                                    </p>
                                )}
                                <div className="flex items-center justify-center space-x-3">
                                    <Button onClick={() => {
                                        setRetryCount(0)
                                        setNavigationError(null)
                                        handleRefresh()
                                    }}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Erneut versuchen
                                    </Button>
                                    {navigationError && (
                                        <Button variant="outline" onClick={() => {
                                            setNavigationError(null)
                                            setRetryCount(0)
                                        }}>
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
                                        <Button variant="outline" onClick={handleCreateFolder}>
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
                                        onDelete={isFolderDeletable(folder) ? () => handleFolderDelete(folder) : undefined}
                                        onMove={() => {
                                            const { openFileMoveModal } = useModalStore.getState()
                                            openFileMoveModal({
                                                item: folder,
                                                itemType: 'folder',
                                                currentPath: currentNavPath,
                                                userId,
                                                onMove: async (targetPath: string) => {
                                                    const { moveFolder } = await import('@/lib/storage-service')

                                                    // Construct source and target paths properly
                                                    const sourceFolderPath = folder.path
                                                    const targetFolderPath = `${targetPath}/${folder.name}`

                                                    try {
                                                        await moveFolder(sourceFolderPath, targetFolderPath)
                                                        handleRefresh(false) // Silent refresh after move
                                                    } catch (error) {
                                                        posthogLogger.error('Folder move failed', {
                                                            folder_name: folder.name,
                                                            source_path: sourceFolderPath,
                                                            target_path: targetFolderPath,
                                                            error_message: error instanceof Error ? error.message : 'Unknown error'
                                                        })
                                                        throw error
                                                    }
                                                }
                                            })
                                        }}
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
                                        onMove={() => {
                                            const { openFileMoveModal } = useModalStore.getState()
                                            openFileMoveModal({
                                                item: file,
                                                itemType: 'file',
                                                currentPath: currentNavPath,
                                                userId,
                                                onMove: async (targetPath: string) => {
                                                    const { moveFile } = await import('@/lib/storage-service')

                                                    // Construct source and target paths properly
                                                    const sourcePath = `${currentNavPath}/${file.name}`
                                                    const targetFilePath = `${targetPath}/${file.name}`

                                                    try {
                                                        await moveFile(sourcePath, targetFilePath)
                                                        handleRefresh(false) // Silent refresh after move
                                                    } catch (error) {
                                                        posthogLogger.error('File move failed', {
                                                            file_name: file.name,
                                                            file_id: file.id,
                                                            source_path: sourcePath,
                                                            target_path: targetFilePath,
                                                            error_message: error instanceof Error ? error.message : 'Unknown error'
                                                        })
                                                        throw error
                                                    }
                                                }
                                            })
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}