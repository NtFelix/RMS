"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
    Upload,
    RefreshCw,
    FolderOpen,
    Zap,
    Plus,
    ArrowUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem, isFolderDeletable } from "@/hooks/use-cloud-storage-store"
import { useRouter } from "next/navigation"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage-item-card"
import { DocumentsSummaryCards } from "@/components/documents-summary-cards"
import { cn } from "@/lib/utils"

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

    // Local navigation state
    const [currentNavPath, setCurrentNavPath] = useState(initialPath)
    const [isNavigating, setIsNavigating] = useState(false)
    const [navigationError, setNavigationError] = useState<string | null>(null)

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

    // Track initialization
    const isInitialized = useRef(false)

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
     * Handle efficient navigation
     */
    const handleNavigate = useCallback(async (path: string, useClientSide = true) => {
        if (path === currentNavPath) return

        setIsNavigating(true)
        setNavigationError(null)
        setSelectedItems(new Set()) // Clear selections

        try {
            if (useClientSide) {
                // Update URL without page reload
                const url = pathToUrl(path)
                const currentUrl = window.location.pathname + window.location.search

                if (url !== currentUrl) {
                    window.history.pushState({ path, clientNavigation: true }, '', url)
                }

                // Update local navigation state
                setCurrentNavPath(path)

                // Load new data
                await navigateToPath(path)

                console.log('Client-side navigation successful:', path, '→', url)
            } else {
                // Use Next.js router for server-side navigation
                const url = pathToUrl(path)
                router.push(url)
            }
        } catch (error) {
            console.error('Navigation failed:', error)
            setNavigationError(error instanceof Error ? error.message : 'Navigation failed')

            // Fallback to server-side navigation
            if (useClientSide) {
                try {
                    const url = pathToUrl(path)
                    router.push(url)
                } catch (fallbackError) {
                    toast({
                        title: "Navigation Error",
                        description: "Failed to navigate to directory. Please try again.",
                        variant: "destructive"
                    })
                }
            }
        } finally {
            setIsNavigating(false)
        }
    }, [currentNavPath, pathToUrl, navigateToPath, router, toast])

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
     * Handle refresh
     */
    const handleRefresh = useCallback(async () => {
        setSelectedItems(new Set())
        refreshCurrentPath()

        // Refresh total storage size
        try {
            const { getTotalStorageUsage } = await import('@/app/(dashboard)/dateien/actions')
            const size = await getTotalStorageUsage(userId)
            setTotalStorageSize(size)
        } catch (error) {
            console.error('Failed to refresh total storage size:', error)
        }
    }, [refreshCurrentPath, userId])

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
                handleRefresh()
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            })
        }
    }, [currentNavPath, initialPath, openUploadModal, handleRefresh, toast])

    /**
     * Handle upload with files (for drag & drop)
     */
    const handleUploadWithFiles = useCallback((files: File[]) => {
        const targetPath = currentNavPath || initialPath
        if (targetPath) {
            openUploadModal(targetPath, () => {
                handleRefresh()
                toast({
                    description: "Dateien wurden erfolgreich hochgeladen."
                })
            }, files)
        }
    }, [currentNavPath, initialPath, openUploadModal, handleRefresh, toast])

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

                // Refresh to get the latest data from server
                handleRefresh()

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
                // Refresh to get the latest data from server
                handleRefresh()

                toast({
                    description: `Datei "${fileName}" wurde erfolgreich erstellt.`
                })
            })
        }
    }, [currentNavPath, initialPath, openCreateFileModal, handleRefresh, toast])

    // Determine loading and error states
    const showLoading = isLoading || isNavigating
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
                                    {navigationError && (
                                        <Button variant="outline" onClick={() => setNavigationError(null)}>
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

                                                    console.log('🎬 Component: Starting folder move operation:', {
                                                        folderName: folder.name,
                                                        folderDisplayName: folder.displayName,
                                                        sourceFolderPath,
                                                        targetFolderPath,
                                                        currentNavPath,
                                                        targetPath,
                                                        fullFolderObject: folder
                                                    })

                                                    try {
                                                        await moveFolder(sourceFolderPath, targetFolderPath)
                                                        console.log('🎉 Component: Folder move completed successfully')
                                                        handleRefresh()
                                                    } catch (error) {
                                                        console.error('❌ Component: Folder move failed:', error)
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

                                                    console.log('🎬 Component: Starting move operation:', {
                                                        fileName: file.name,
                                                        fileId: file.id,
                                                        fileSize: file.size,
                                                        fileMetadata: file.metadata,
                                                        sourcePath,
                                                        targetFilePath,
                                                        currentNavPath,
                                                        targetPath,
                                                        fullFileObject: file
                                                    })

                                                    try {
                                                        // Debug: List source directory before move
                                                        const { debugListDirectory } = await import('@/lib/storage-service')
                                                        await debugListDirectory(currentNavPath)

                                                        await moveFile(sourcePath, targetFilePath)
                                                        console.log('🎉 Component: Move completed successfully')
                                                        handleRefresh()
                                                    } catch (error) {
                                                        console.error('❌ Component: Move failed:', error)
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