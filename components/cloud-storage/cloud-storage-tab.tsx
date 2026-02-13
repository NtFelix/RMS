"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Folder, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  RefreshCw,
  File,
  AlertCircle,
  Archive
} from "lucide-react"
import { FileTreeView } from "@/components/cloud-storage/file-tree-view"
import { FileBreadcrumbNavigation } from "@/components/cloud-storage/file-breadcrumb-navigation"
import { FileUploadZone } from "@/components/cloud-storage/file-upload-zone"
import { FileContextMenu } from "@/components/cloud-storage/file-context-menu"
import { ArchiveBrowserModal } from "@/components/cloud-storage/archive-browser-modal"
import { useCloudStorageStore, useCloudStorageOperations, useCloudStorageArchive, useCloudStorageUpload, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import { StorageErrorBoundary, LoadingErrorBoundary } from "@/components/cloud-storage/storage-error-boundary"
import { 
  FileGridSkeleton, 
  EmptyFileList, 
  EmptyFolder,
  FileOperationLoading,
  ConnectionStatus,
  PerformanceIndicator 
} from "@/components/cloud-storage/storage-loading-states"
import { useErrorBoundary } from "@/lib/storage-error-handling"
import { performanceMonitor } from "@/lib/storage-performance"
import { useRouter } from "next/navigation"

interface VirtualFolder {
  name: string
  path: string
  type: 'house' | 'apartment' | 'category' | 'storage'
  isEmpty: boolean
  fileCount: number
  displayName?: string
}

interface CloudStorageTabProps {
  userId?: string
  initialFiles?: any[]
  initialFolders?: VirtualFolder[]
}

export function CloudStorageTab({ userId, initialFiles, initialFolders }: CloudStorageTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [performanceStats, setPerformanceStats] = useState<any>(null)
  const [actualUserId, setActualUserId] = useState<string | null>(userId || null)
  const { toast } = useToast()
  const { handleAsyncErrorWithRetry } = useErrorBoundary()
  const { openUploadModal } = useModalStore()
  
  const { 
    currentPath, 
    files, 
    folders, 
    isLoading, 
    error,
    breadcrumbs,
    navigateToPath: originalNavigateToPath,
    setBreadcrumbs,
    setFiles,
    setFolders,
    setLoading,
    setError,
    refreshCurrentPath
  } = useCloudStorageStore()
  const router = useRouter()

  // Map storage path like user_<id>/a/b to SSR route /dateien/a/b
  const pathToHref = (path: string) => {
    const match = path.match(/^user_[^/]+(?:\/(.*))?$/)
    const rest = match && match[1] ? match[1] : ""
    return rest ? `/dateien/${rest}` : "/dateien"
  }

  // Enhanced navigation function that routes to SSR URL
  const navigateToPath = (path: string) => {
    if (!path) return
    // Optionally clear local lists for snappier UX before navigation
    if (path !== currentPath) {
      setFiles([])
      setFolders([])
    }
    router.push(pathToHref(path))
  }
  
  const {
    isOperationInProgress,
    operationError,
  } = useCloudStorageOperations()
  
  const {
    isArchiveViewOpen,
    closeArchiveView,
    openArchiveView,
  } = useCloudStorageArchive()

  const {
    uploadQueue,
    removeFromUploadQueue,
  } = useCloudStorageUpload()

  // Get actual user ID from Supabase auth
  useEffect(() => {
    const getUserId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setActualUserId(user.id)
        }
      } catch (error) {
        console.error('Failed to get user ID:', error)
      }
    }
    
    if (!actualUserId) {
      getUserId()
    }
  }, [actualUserId])

  // Initialize with root path and load initial files
  useEffect(() => {
    if (!currentPath && actualUserId) {
      const rootPath = `user_${actualUserId}`
      navigateToPath(rootPath)
      setBreadcrumbs([{ name: 'Cloud Storage', path: rootPath, type: 'root' }])
    }
  }, [actualUserId, currentPath, navigateToPath, setBreadcrumbs])

  // Set initial files and folders if provided
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !files.length) {
      setFiles(initialFiles)
    }
  }, [initialFiles, files.length, setFiles])

  useEffect(() => {
    if (initialFolders && initialFolders.length > 0 && !folders.length) {
      const virtualFolders = initialFolders.map(folder => ({
        name: folder.name,
        path: folder.path,
        type: folder.type,
        isEmpty: folder.isEmpty,
        children: [],
        fileCount: folder.fileCount,
        displayName: folder.displayName
      }))
      setFolders(virtualFolders)
    }
  }, [initialFolders, folders.length, setFolders])

  // Load files when path changes
  useEffect(() => {
    if (currentPath && actualUserId) {
      // Only refresh if we don't have initial files for the root path, or if the path has changed
      const isRootPath = currentPath === `user_${actualUserId}`
      const hasInitialData = initialFiles && initialFiles.length > 0
      
      if (!isRootPath || !hasInitialData) {
        refreshCurrentPath()
      }
    }
  }, [currentPath, actualUserId, refreshCurrentPath, initialFiles])

  // Update breadcrumbs when path changes
  useEffect(() => {
    if (currentPath && actualUserId) {
      // Generate breadcrumbs based on current path
      const generateBreadcrumbs = async (): Promise<BreadcrumbItem[]> => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: 'Cloud Storage', path: `user_${actualUserId}`, type: 'root' }
        ]
        
        const userPath = `user_${actualUserId}`
        if (currentPath !== userPath) {
          const relativePath = currentPath.startsWith(userPath) 
            ? currentPath.substring(userPath.length + 1) 
            : currentPath
          const segments = relativePath.split('/').filter(Boolean)
          
          let currentSegmentPath = userPath
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            currentSegmentPath += `/${segment}`
            
            let displayName = segment
            let breadcrumbType: BreadcrumbItem['type'] = 'category'
            
            // Try to get display names for houses and apartments
            if (i === 0 && segment !== 'Miscellaneous') {
              // This might be a house ID
              try {
                const supabase = createClient()
                const { data: house } = await supabase
                  .from('Haeuser')
                  .select('name')
                  .eq('id', segment)
                  .eq('user_id', actualUserId)
                  .single()
                
                if (house) {
                  displayName = house.name
                  breadcrumbType = 'house'
                }
              } catch (error) {
                // If it fails, keep the original segment name
              }
            } else if (i === 1 && segments[0] !== 'Miscellaneous') {
              // This might be an apartment ID
              try {
                const supabase = createClient()
                const { data: apartment } = await supabase
                  .from('Wohnungen')
                  .select('name')
                  .eq('id', segment)
                  .eq('user_id', actualUserId)
                  .single()
                
                if (apartment) {
                  displayName = apartment.name
                  breadcrumbType = 'apartment'
                }
              } catch (error) {
                // If it fails, keep the original segment name
              }
            } else if (segment === 'house_documents') {
              displayName = 'Hausdokumente'
            } else if (segment === 'apartment_documents') {
              displayName = 'Wohnungsdokumente'
            } else if (segment === 'Miscellaneous') {
              displayName = 'Sonstiges'
            }
            
            breadcrumbs.push({
              name: displayName,
              path: currentSegmentPath,
              type: breadcrumbType
            })
          }
        }
        
        return breadcrumbs
      }
      
      generateBreadcrumbs().then(setBreadcrumbs)
    }
  }, [currentPath, actualUserId, setBreadcrumbs])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update performance stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceStats(performanceMonitor.getStats())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Show operation error toast
  useEffect(() => {
    if (operationError) {
      toast({
        title: "Fehler bei Dateioperation",
        description: operationError,
        variant: "destructive",
      })
    }
  }, [operationError, toast])

  // Auto-clear completed uploads after a delay
  useEffect(() => {
    const completedItems = uploadQueue.filter(item => item.status === 'completed')
    if (completedItems.length > 0) {
      const timeoutId = setTimeout(() => {
        completedItems.forEach(item => {
          removeFromUploadQueue(item.id)
        })
      }, 3000) // Clear after 3 seconds
      
      return () => clearTimeout(timeoutId)
    }
  }, [uploadQueue, removeFromUploadQueue])

  // Show loading state while getting user ID
  if (!actualUserId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Lade Benutzerinformationen...</p>
        </div>
      </div>
    )
  }

  // Handle refresh with error handling
  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    const result = await handleAsyncErrorWithRetry(
      () => refreshCurrentPath(),
      'refresh_files'
    )
    
    if (result !== null) {
      toast({
        title: "Aktualisiert",
        description: "Dateien wurden erfolgreich aktualisiert",
        duration: 2000,
      })
    }
    
    setIsRefreshing(false)
  }

  // Get file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <ImageIcon className="h-8 w-8 text-green-500" />
    }
    
    if (['pdf'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    
    if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-500" />
    }
    
    return <File className="h-8 w-8 text-gray-500" />
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get current folder name for display
  const getCurrentFolderName = () => {
    if (breadcrumbs.length === 0) return "Cloud Storage"
    return breadcrumbs[breadcrumbs.length - 1].name
  }

  // Handle upload completion
  const handleUploadComplete = async () => {
    try {
      // Refresh the current path to show new files
      await refreshCurrentPath()
      
      toast({
        title: "Upload erfolgreich",
        description: "Dateien wurden erfolgreich hochgeladen",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error refreshing files after upload:', error)
      toast({
        title: "Warnung",
        description: "Dateien wurden hochgeladen, aber die Ansicht konnte nicht aktualisiert werden. Bitte aktualisieren Sie die Seite.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Open upload modal
  const openUpload = () => {
    if (currentPath) {
      openUploadModal(currentPath, handleUploadComplete)
    }
  }

  // Toggle upload zone (keep for backward compatibility)
  const toggleUploadZone = () => {
    setShowUploadZone(!showUploadZone)
  }

  return (
    <StorageErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">Cloud Storage</h1>
              <ConnectionStatus isOnline={isOnline} />
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-muted-foreground">
                Verwalten Sie Ihre Dokumente und Dateien zentral
              </p>
              {performanceStats && (
                <PerformanceIndicator 
                  queryTime={performanceStats.averageQueryTime}
                  cacheHit={performanceStats.cacheHitRate > 0.5}
                />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !isOnline}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={openArchiveView}
              disabled={!isOnline}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archiv
            </Button>
            <Button 
              onClick={openUpload}
              disabled={!isOnline || !currentPath}
            >
              <Upload className="mr-2 h-4 w-4" />
              Dateien hochladen
            </Button>
            {uploadQueue.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  const completedItems = uploadQueue.filter(item => item.status === 'completed')
                  completedItems.forEach(item => removeFromUploadQueue(item.id))
                }}
                disabled={!uploadQueue.some(item => item.status === 'completed')}
              >
                Abgeschlossene löschen ({uploadQueue.filter(item => item.status === 'completed').length})
              </Button>
            )}
          </div>
        </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-muted/30 rounded-lg p-3">
        {userId && <FileBreadcrumbNavigation userId={userId} />}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {isOperationInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-600">Dateioperation wird ausgeführt...</p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {showUploadZone && (
        <FileUploadZone
          targetPath={currentPath}
          onUploadComplete={handleUploadComplete}
          disabled={!currentPath}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Tree Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Navigation</CardTitle>
            <CardDescription>
              Ordnerstruktur durchsuchen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <FileTreeView userId={actualUserId || 'demo-user'} />
          </CardContent>
        </Card>

        {/* File List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                {getCurrentFolderName()}
                {isLoading && (
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                )}
              </CardTitle>
              <CardDescription>
                {isLoading 
                  ? "Lade Dateien..." 
                  : files.length === 0 && folders.length === 0
                    ? "Noch keine Dateien vorhanden" 
                    : `${files.length} Dateien${folders.length > 0 ? `, ${folders.length} Ordner` : ''}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoadingErrorBoundary
                isLoading={isLoading}
                error={error}
                onRetry={handleRefresh}
                isEmpty={files.length === 0 && folders.length === 0}
                loadingComponent={<FileGridSkeleton count={8} />}
                emptyComponent={
                  // Show EmptyFolder for specific folders, EmptyFileList for root
                  breadcrumbs.length > 1 ? (
                    <EmptyFolder 
                      folderName={getCurrentFolderName()}
                      onUpload={isOnline && currentPath ? openUpload : undefined}
                    />
                  ) : (
                    <EmptyFileList 
                      onUpload={isOnline && currentPath ? openUpload : undefined}
                    />
                  )
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Render folders first */}
                  {folders.map((folder) => {
                    const displayName = folder.displayName || folder.name
                    
                    // Determine folder icon and color based on type
                    let folderIcon
                    let folderTypeLabel
                    
                    switch (folder.type) {
                      case 'house':
                        folderIcon = <Folder className="h-8 w-8 text-green-600" />
                        folderTypeLabel = 'Haus'
                        break
                      case 'apartment':
                        folderIcon = <Folder className="h-8 w-8 text-blue-600" />
                        folderTypeLabel = 'Wohnung'
                        break
                      case 'category':
                        // Special handling for different category types
                        if (folder.name === 'house_documents' || folder.name === 'apartment_documents') {
                          folderIcon = <FileText className="h-8 w-8 text-purple-600" />
                          folderTypeLabel = 'Dokumente'
                        } else if (folder.name === 'Miscellaneous') {
                          folderIcon = <Folder className="h-8 w-8 text-gray-600" />
                          folderTypeLabel = 'Sonstiges'
                        } else {
                          // Likely a tenant folder
                          folderIcon = <Folder className="h-8 w-8 text-orange-600" />
                          folderTypeLabel = 'Mieter'
                        }
                        break
                      default:
                        folderIcon = <Folder className="h-8 w-8 text-blue-500" />
                        folderTypeLabel = 'Ordner'
                    }
                    
                    return (
                      <div 
                        key={folder.path} 
                        className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                        onClick={() => navigateToPath(folder.path)}
                      >
                        <div className="flex flex-col items-center space-y-3">
                          {folderIcon}
                          
                          <div className="text-center w-full">
                            <span 
                              className="text-sm font-medium block truncate w-full" 
                              title={displayName}
                            >
                              {displayName}
                            </span>
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              {folderTypeLabel}
                            </div>
                            
                            {folder.isEmpty ? (
                              <div className="text-xs text-muted-foreground">
                                Leer
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {folder.fileCount} {folder.fileCount === 1 ? 'Datei' : 'Dateien'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Render files */}
                  {files.map((file) => (
                    <FileContextMenu key={file.id} file={file}>
                      <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors group">
                        <div className="flex flex-col items-center space-y-3">
                          {getFileIcon(file.name)}
                          
                          <div className="text-center w-full">
                            <span 
                              className="text-sm font-medium block truncate w-full" 
                              title={file.name}
                            >
                              {file.name}
                            </span>
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(file.size)}
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              {new Date(file.updated_at).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          
                          {/* Quick action buttons - shown on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Rechtsklick für weitere Optionen"
                              className="text-xs px-2 py-1 h-auto"
                              disabled={!isOnline}
                            >
                              Optionen
                            </Button>
                          </div>
                        </div>
                      </div>
                    </FileContextMenu>
                  ))}
                </div>
              </LoadingErrorBoundary>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Show operation loading state */}
        {isOperationInProgress && (
          <FileOperationLoading 
            operation="delete" 
            className="mb-4"
          />
        )}

        {/* Archive Browser Modal */}
        <ArchiveBrowserModal 
          isOpen={isArchiveViewOpen}
          onClose={closeArchiveView}
          userId={actualUserId || 'demo-user'}
        />
      </div>
    </StorageErrorBoundary>
  )
}