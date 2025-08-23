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
import { FileTreeView } from "@/components/file-tree-view"
import { FileBreadcrumbNavigation } from "@/components/file-breadcrumb-navigation"
import { FileUploadZone } from "@/components/file-upload-zone"
import { FileContextMenu } from "@/components/file-context-menu"
import { FilePreviewModal } from "@/components/file-preview-modal"
import { ArchiveBrowserModal } from "@/components/archive-browser-modal"
import { useCloudStorageStore, useCloudStorageOperations, useCloudStorageArchive } from "@/hooks/use-cloud-storage-store"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import { StorageErrorBoundary, LoadingErrorBoundary } from "@/components/storage-error-boundary"
import { 
  FileGridSkeleton, 
  EmptyFileList, 
  FileOperationLoading,
  ConnectionStatus,
  PerformanceIndicator 
} from "@/components/storage-loading-states"
import { useErrorBoundary } from "@/lib/storage-error-handling"
import { performanceMonitor } from "@/lib/storage-performance"

interface CloudStorageTabProps {
  userId?: string
}

export function CloudStorageTab({ userId = "demo-user" }: CloudStorageTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [performanceStats, setPerformanceStats] = useState<any>(null)
  const { toast } = useToast()
  const { handleAsyncErrorWithRetry } = useErrorBoundary()
  
  const { 
    currentPath, 
    files, 
    folders, 
    isLoading, 
    error,
    breadcrumbs,
    navigateToPath,
    setBreadcrumbs,
    setFiles,
    setFolders,
    setLoading,
    setError,
    refreshCurrentPath
  } = useCloudStorageStore()
  
  const {
    isOperationInProgress,
    operationError,
  } = useCloudStorageOperations()
  
  const {
    isArchiveViewOpen,
    closeArchiveView,
    openArchiveView,
  } = useCloudStorageArchive()

  // Initialize with root path
  useEffect(() => {
    if (!currentPath) {
      navigateToPath(`user_${userId}`)
      setBreadcrumbs([{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }])
    }
  }, [userId, currentPath, navigateToPath, setBreadcrumbs])

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

  // Get current folder name for display
  const getCurrentFolderName = () => {
    if (breadcrumbs.length === 0) return "Cloud Storage"
    return breadcrumbs[breadcrumbs.length - 1].name
  }

  // Handle upload completion
  const handleUploadComplete = () => {
    refreshCurrentPath()
    setShowUploadZone(false)
  }

  // Toggle upload zone
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
              onClick={toggleUploadZone}
              disabled={!isOnline}
            >
              <Upload className="mr-2 h-4 w-4" />
              {showUploadZone ? "Upload schließen" : "Dateien hochladen"}
            </Button>
          </div>
        </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-muted/30 rounded-lg p-3">
        <FileBreadcrumbNavigation />
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
            <FileTreeView userId={userId} />
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
                  : files.length === 0 
                    ? "Noch keine Dateien vorhanden" 
                    : `${files.length} Dateien`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoadingErrorBoundary
                isLoading={isLoading}
                error={error}
                onRetry={handleRefresh}
                isEmpty={files.length === 0}
                loadingComponent={<FileGridSkeleton count={8} />}
                emptyComponent={
                  <EmptyFileList 
                    onUpload={isOnline ? toggleUploadZone : undefined}
                  />
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

        {/* File Preview Modal */}
        <FilePreviewModal />
        
        {/* Archive Browser Modal */}
        <ArchiveBrowserModal 
          isOpen={isArchiveViewOpen}
          onClose={closeArchiveView}
          userId={userId}
        />
      </div>
    </StorageErrorBoundary>
  )
}