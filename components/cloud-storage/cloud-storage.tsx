"use client"

import { useEffect, useState, useCallback, useMemo, useRef, useTransition } from "react"
import { posthogLogger } from "@/lib/posthog-logger"
import {
    Upload,
    RefreshCw,
    FolderOpen,
    Plus,
    ArrowUp,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem, isFolderDeletable } from "@/hooks/use-cloud-storage-store"
import { useRouter } from "next/navigation"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { cancelAllPendingLoads } from "@/lib/file-loader"
import type { LoadResult } from "@/lib/file-loader"
import { FileGridSkeleton } from "@/components/cloud-storage/storage-loading-states"
import { useNavigation } from "@/lib/navigation-controller"
import { CloudStorageQuickActions } from "@/components/cloud-storage/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage/cloud-storage-item-card"
import { DocumentsSummaryCards } from "@/components/common/documents-summary-cards"
import { useStorageUsage } from "@/hooks/use-storage-usage"
import { useUserProfile } from "@/hooks/use-user-profile"

interface CloudStorageProps {
    userId: string
    initialFiles?: StorageObject[]
    initialFolders?: VirtualFolder[]
    initialPath?: string
    initialBreadcrumbs?: BreadcrumbItem[]
    initialTotalSize?: number
    initialStorageLimit?: number | null
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

/**
 * Cloud Storage Component without circular dependencies
 * 
 * Optimized with centralized NavigationController for:
 * - Request deduplication and cancellation
 * - Automatic retry with exponential backoff
 * - Clean state management
 */
export function CloudStorage({
    userId,
    initialFiles = [],
    initialFolders = [],
    initialPath = `user_${userId}`,
    initialBreadcrumbs = [],
    initialTotalSize = 0,
    initialStorageLimit
}: CloudStorageProps) {
    const router = useRouter()
    const { toast } = useToast()
    const { openUploadModal, openCreateFolderModal, openCreateFileModal } = useModalStore()

    // Get current user for storage usage hook
    const { user } = useUserProfile()

    // Get storage limit from subscription
    const { limit: storageLimit, isLoading: isLoadingLimit } = useStorageUsage(user, initialTotalSize)

    // Centralized navigation management
    const {
        isNavigating,
        error: navigationError,
        navigate,
        cancelAll: cancelAllNavigations,
        stats,
        clearError: clearNavigationError
    } = useNavigation()

    const MAX_RETRIES = 3

    // React 18 transition for optimistic UI updates
    const [isPending, startTransition] = useTransition()

    // Use the cloud storage store for data management
    const {
        files,
        folders,
        breadcrumbs,
        setCurrentPath,
        setFiles,
        setFolders,
        setBreadcrumbs,
        setLoading,
        setError,
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

    // Local tracking of current path - critical for proper navigation
    const [localCurrentPath, setLocalCurrentPath] = useState(initialPath)

    // Track initialization
    const isInitialized = useRef(false)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAllNavigations()
            cancelAllPendingLoads(userId)
        }
    }, [userId, cancelAllNavigations])

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
     * Initialize component with initial data and set history state
     */
    useEffect(() => {
        if (!isInitialized.current && initialPath) {
            isInitialized.current = true
            setCurrentPath(initialPath)
            setLocalCurrentPath(initialPath)

            if (initialFiles.length > 0) setFiles(initialFiles)
            if (initialFolders.length > 0) setFolders(initialFolders)
            if (initialBreadcrumbs.length > 0) setBreadcrumbs(initialBreadcrumbs)
            if (initialTotalSize > 0) setTotalStorageSize(initialTotalSize)

            setError(null)
            setLoading(false)

            // Replace the current history state so back/forward works from the initial page
            const url = pathToUrl(initialPath)
            window.history.replaceState(
                { path: initialPath, clientNavigation: true, timestamp: Date.now() },
                '',
                url
            )
        }
    }, [initialPath, initialFiles, initialFolders, initialBreadcrumbs, initialTotalSize, setCurrentPath, setFiles, setFolders, setBreadcrumbs, setError, setLoading, pathToUrl])

    /**
     * Handle efficient navigation using the navigation controller
     * 
     * Fetches data first via server actions, then updates the URL using
     * window.history.pushState to avoid Next.js RSC re-fetching.
     * This provides instant client-side navigation with proper URL updates.
     */
    const handleNavigate = useCallback(async (path: string, useClientSide = true, skipHistoryPush = false) => {
        // Use local path tracking for accurate navigation detection
        if (path === localCurrentPath) return

        // Clear selections immediately
        setSelectedItems(new Set())

        if (useClientSide) {
            // Start navigation via controller to fetch data FIRST
            const result = await navigate(path)

            if (result.success && result.data) {
                const data = result.data as LoadResult
                startTransition(() => {
                    setCurrentPath(path)
                    setLocalCurrentPath(path)
                    setFiles(data.files)
                    setFolders(data.folders)
                    if (data.breadcrumbs) setBreadcrumbs(data.breadcrumbs)
                    setTotalStorageSize(data.totalSize)
                    setError(null)
                })

                // Update URL AFTER successful data load using native History API
                // Skip for popstate (back/forward) navigation since browser already handles URL
                if (!skipHistoryPush) {
                    const url = pathToUrl(path)
                    window.history.pushState(
                        { path, clientNavigation: true, timestamp: Date.now() },
                        '',
                        url
                    )
                }
            }
        } else {
            router.push(pathToUrl(path))
        }
    }, [localCurrentPath, navigate, pathToUrl, router, setCurrentPath, setFiles, setFolders, setBreadcrumbs, setError, startTransition])

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
        handleNavigate(breadcrumb.path, true, false)
    }, [handleNavigate])

    /**
     * Handle navigate up
     */
    const handleNavigateUp = useCallback(() => {
        if (localCurrentPath) {
            const segments = localCurrentPath.split('/').filter(Boolean)
            if (segments.length > 1) {
                const parentPath = segments.slice(0, -1).join('/')
                handleNavigate(parentPath, true, false)
            }
        }
    }, [localCurrentPath, handleNavigate])

    /**
     * Optimized refresh that syncs both store and UI
     */
    const handleRefresh = useCallback(async (showToast = true) => {
        try {
            const result = await navigate(localCurrentPath, { force: true })

            if (result.success && result.data) {
                const data = result.data as LoadResult
                startTransition(() => {
                    setFiles(data.files)
                    setFolders(data.folders)
                    if (data.breadcrumbs) setBreadcrumbs(data.breadcrumbs)
                    setTotalStorageSize(data.totalSize)
                })

                if (showToast) {
                    toast({ description: "Dateien wurden aktualisiert." })
                }
            } else if (showToast) {
                throw new Error(result.error || 'Aktualisierung fehlgeschlagen')
            }
        } catch (error) {
            console.error('Failed to refresh:', error)
            if (showToast) {
                toast({
                    title: "Fehler",
                    description: "Die Aktualisierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
                    variant: "destructive",
                })
            }
        }
    }, [localCurrentPath, navigate, setFiles, setFolders, setBreadcrumbs, toast, startTransition])

    /**
     * Handle browser back/forward navigation
     * Required since we use window.history.pushState for URL updates
     */
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // Check if this is one of our client-side navigation states
            if (event.state?.clientNavigation && event.state?.path) {
                // Use skipHistoryPush=true since browser already updated the URL
                handleNavigate(event.state.path, true, true)
            } else {
                // Handle direct URL access or page refresh - parse path from URL
                const pathname = window.location.pathname
                const pathMatch = pathname.match(/^\/dateien(?:\/(.+))?$/)
                if (pathMatch) {
                    const urlPath = pathMatch[1] || ''
                    const storagePath = urlPath ? `user_${userId}/${urlPath}` : `user_${userId}`
                    if (storagePath !== localCurrentPath) {
                        handleNavigate(storagePath, true, true)
                    }
                }
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [handleNavigate, userId, localCurrentPath])

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
            handleRefresh(false)
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
            handleRefresh(false)
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
                    handleRefresh(false)
                    toast({
                        description: `Ordner "${folder.displayName || folder.name}" wurde dauerhaft gelöscht.`
                    })
                } catch (error) {
                    toast({
                        description: error instanceof Error ? error.message : "Der Ordner konnte nicht gelöscht werden.",
                        variant: "destructive"
                    })
                    throw error
                }
            }
        })
    }, [deleteFolder, toast])

    /**
     * Handle upload
     */
    const handleUpload = useCallback(() => {
        const targetPath = localCurrentPath || initialPath
        if (targetPath) {
            openUploadModal(targetPath, () => {
                handleRefresh(false)
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            })
        }
    }, [localCurrentPath, initialPath, openUploadModal, handleRefresh, toast])

    /**
     * Handle upload with files (for drag & drop)
     */
    const handleUploadWithFiles = useCallback((files: File[]) => {
        const targetPath = localCurrentPath || initialPath
        if (targetPath) {
            openUploadModal(targetPath, () => {
                handleRefresh(false)
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            }, files)
        }
    }, [localCurrentPath, initialPath, openUploadModal, handleRefresh, toast])

    /**
     * Handle create folder
     */
    const handleCreateFolder = useCallback(() => {
        const targetPath = localCurrentPath || initialPath
        if (targetPath) {
            openCreateFolderModal(targetPath, (folderName: string) => {
                const newFolder: VirtualFolder = {
                    name: folderName,
                    path: `${targetPath}/${folderName}`,
                    type: 'storage',
                    isEmpty: true,
                    children: [],
                    fileCount: 0,
                    displayName: folderName
                }

                setFolders([...folders, newFolder])
                handleRefresh(false)

                toast({
                    description: `Ordner "${folderName}" wurde erfolgreich erstellt.`
                })
            })
        }
    }, [localCurrentPath, initialPath, openCreateFolderModal, folders, setFolders, handleRefresh, toast])

    /**
     * Handle create file
     */
    const handleCreateFile = useCallback(() => {
        const targetPath = localCurrentPath || initialPath
        if (targetPath) {
            openCreateFileModal(targetPath, (fileName: string) => {
                handleRefresh(false)

                toast({
                    description: `Datei "${fileName}" wurde erfolgreich erstellt.`
                })
            })
        }
    }, [localCurrentPath, initialPath, openCreateFileModal, handleRefresh, toast])

    // Determine loading and error states
    const showLoading = isNavigating || isPending
    const displayError = navigationError

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
                storageLimit={storageLimit ?? initialStorageLimit}
                isLoadingLimit={isLoadingLimit}
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
                            isUploadDisabled={storageLimit === 0 || (storageLimit > 0 && totalFileSize >= storageLimit)}
                            storageDisabledMessage={
                                storageLimit === 0
                                    ? "Dokumentenspeicher ist in Ihrem aktuellen Tarif nicht enthalten. Bitte wechseln Sie zu einem höheren Tarif."
                                    : "Ihr Speicherlimit ist erreicht. Bitte löschen Sie Dateien oder wechseln Sie zu einem höheren Tarif."
                            }
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
                                {stats.retryCount > 0 && isNavigating && (
                                    <div className="flex items-center justify-center space-x-2 text-amber-600 mb-6 bg-amber-50 dark:bg-amber-900/10 py-3 rounded-xl border border-amber-100 dark:border-amber-900/20 animate-pulse">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span className="text-sm font-medium">
                                            Verbindungsproblem. Erneuter Versuch ({stats.retryCount}/{MAX_RETRIES})...
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
                                <p className="text-muted-foreground mb-4 max-w-md mx-auto">{displayError}</p>
                                <div className="flex items-center justify-center space-x-3">
                                    <Button onClick={() => handleRefresh(true)}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Erneut versuchen
                                    </Button>
                                    <Button variant="outline" onClick={clearNavigationError}>
                                        Fehler ignorieren
                                    </Button>
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
                                        onSelect={(selected) => handleItemSelect(folder.path, !!selected)}
                                        onOpen={() => handleFolderClick(folder)}
                                        onDelete={isFolderDeletable(folder) ? () => handleFolderDelete(folder) : undefined}
                                        onMove={() => {
                                            const { openFileMoveModal } = useModalStore.getState()
                                            openFileMoveModal({
                                                item: folder,
                                                itemType: 'folder',
                                                currentPath: localCurrentPath,
                                                userId,
                                                onMove: async (targetPath: string) => {
                                                    const { moveFolder } = await import('@/lib/storage-service')
                                                    const targetFolderPath = `${targetPath}/${folder.name}`
                                                    await moveFolder(folder.path, targetFolderPath)
                                                    handleRefresh(false)
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
                                        onSelect={(selected) => handleItemSelect(file.id, !!selected)}
                                        onDownload={() => handleFileDownload(file)}
                                        onDelete={() => handleFileDelete(file)}
                                        onMove={() => {
                                            const { openFileMoveModal } = useModalStore.getState()
                                            openFileMoveModal({
                                                item: file,
                                                itemType: 'file',
                                                currentPath: localCurrentPath,
                                                userId,
                                                onMove: async (targetPath: string) => {
                                                    const { moveFile } = await import('@/lib/storage-service')
                                                    const targetFilePath = `${targetPath}/${file.name}`
                                                    await moveFile(`${localCurrentPath}/${file.name}`, targetFilePath)
                                                    handleRefresh(false)
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