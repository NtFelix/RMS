"use client"

import { useEffect, useState } from "react"
import { 
  Upload,
  RefreshCw,
  FolderOpen,
  Zap,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCloudStorageStore, StorageObject, VirtualFolder, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageQuickActions } from "@/components/cloud-storage-quick-actions"
import { CloudStorageItemCard } from "@/components/cloud-storage-item-card"
import { SmartSkeleton, StaticUIWrapper } from "@/components/storage-loading-states"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useFolderNavigation } from "@/components/navigation-interceptor"

interface CloudStorageRedesignedProps {
  userId: string
  initialFiles?: StorageObject[]
  initialFolders?: VirtualFolder[]
  initialPath?: string
  initialBreadcrumbs?: BreadcrumbItem[]
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type FilterType = 'all' | 'folders' | 'images' | 'documents' | 'recent'

export function CloudStorageRedesigned({ userId, initialFiles, initialFolders, initialPath, initialBreadcrumbs }: CloudStorageRedesignedProps) {
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
  
  const { openUploadModal } = useModalStore()
  const { toast } = useToast()
  const { handleFolderClick, isNavigating, pathToHref } = useFolderNavigation(userId)



  // Hydrate store from server-provided initial data; re-hydrate on SSR route transitions
  useEffect(() => {
    if (initialPath && initialPath !== currentPath) {
      setCurrentPath(initialPath)
      if (initialFiles) setFiles(initialFiles)
      if (initialFolders) setFolders(initialFolders)
      if (initialBreadcrumbs) setBreadcrumbs(initialBreadcrumbs)
      setError(null)
      setLoading(false)
      return
    }
    if (!currentPath && userId) {
      // Use navigation interceptor for initial navigation
      handleFolderClick(`user_${userId}`, { replace: true }).catch(() => {
        // Fallback to direct navigation if client-side fails
        window.location.href = '/dateien'
      })
    }
  }, [currentPath, initialPath, initialFiles, initialFolders, initialBreadcrumbs, userId, handleFolderClick, setCurrentPath, setFiles, setFolders, setBreadcrumbs, setLoading, setError])

  // Restore persisted UI state on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem('cloudStorage:viewMode')
      if (v === 'grid' || v === 'list') setViewMode(v as ViewMode)

      const s = localStorage.getItem('cloudStorage:sortBy')
      if (s === 'name' || s === 'date' || s === 'size' || s === 'type') setSortBy(s as SortBy)

      const f = localStorage.getItem('cloudStorage:filter')
      if (f === 'all' || f === 'folders' || f === 'images' || f === 'documents' || f === 'recent') setActiveFilter(f as FilterType)

      const q = localStorage.getItem('cloudStorage:searchQuery')
      if (q !== null) setSearchQuery(q)
    } catch {}
  }, [])

  // Persist UI state whenever it changes
  useEffect(() => {
    try { localStorage.setItem('cloudStorage:viewMode', viewMode) } catch {}
  }, [viewMode])

  useEffect(() => {
    try { localStorage.setItem('cloudStorage:sortBy', sortBy) } catch {}
  }, [sortBy])

  useEffect(() => {
    try { localStorage.setItem('cloudStorage:filter', activeFilter) } catch {}
  }, [activeFilter])

  useEffect(() => {
    try { localStorage.setItem('cloudStorage:searchQuery', searchQuery) } catch {}
  }, [searchQuery])

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
      description: `${selectedFiles.length} Dateien wurden dauerhaft gelöscht.`
    })
  }

  // Handle navigation
  const handleNavigateUp = async () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]
      try {
        await handleFolderClick(parentBreadcrumb.path)
      } catch (error) {
        console.error('Navigation up failed:', error)
      }
    }
  }

  const handleFolderClickInternal = async (folder: VirtualFolder) => {
    try {
      await handleFolderClick(folder.path)
    } catch (error) {
      console.error('Folder navigation failed:', error)
    }
  }

  // Handle file operations
  const handleFileDownload = async (file: StorageObject) => {
    try {
      await downloadFile(file)
    } catch (error) {
      toast({
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      })
    }
  }

  const handleFileDelete = async (file: StorageObject) => {
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
  }

  // Handle upload
  const handleUpload = () => {
    if (currentPath) {
      openUploadModal(currentPath, () => {
        refreshCurrentPath()
        toast({
          description: "Dateien wurden erfolgreich hochgeladen."
        })
      })
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Static Header - preserved during navigation */}
      <StaticUIWrapper isNavigating={isNavigating}>
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
                    )}
                  </li>
                )
              })}
            </ol>
            </nav>
          </div>
        </div>
      </StaticUIWrapper>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Optimized Loading State */}
          {(isLoading || isNavigating) && (
            <div className="animate-fade-in-up">
              <SmartSkeleton
                type={activeFilter === 'folders' ? 'folders' : activeFilter === 'all' ? 'mixed' : 'files'}
                viewMode={viewMode}
                count={viewMode === 'grid' ? 16 : 8}
              />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && !isNavigating && (
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
          {!isLoading && !isNavigating && !error && sortedFolders.length === 0 && sortedFiles.length === 0 && (
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
          {!isLoading && !isNavigating && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
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
                  data-folder-path={folder.path}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <CloudStorageItemCard
                    item={folder}
                    type="folder"
                    viewMode={viewMode}
                    isSelected={selectedItems.has(folder.path)}
                    onSelect={(selected) => handleItemSelect(folder.path, selected)}
                    onOpen={() => handleFolderClickInternal(folder)}
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

          {/* Results Summary */}
          {!isLoading && !isNavigating && !error && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
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