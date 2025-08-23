"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { FolderTreeNavigation } from "@/components/folder-tree-navigation"
import { FileListDisplay, FileAction } from "@/components/file-list-display"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Cloud, 
  Upload, 
  Menu, 
  X, 
  ChevronRight,
  HardDrive,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Minimize2,
  Maximize2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FileItem, FolderNode, SubscriptionLimits, StorageQuota } from "@/types/cloud-storage"
import { useToast } from "@/hooks/use-toast"

// Upload queue management interfaces
interface UploadQueueItem {
  id: string
  file: File
  folderPath: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  startTime?: number
  completedTime?: number
}

interface UploadQueueState {
  items: UploadQueueItem[]
  isUploading: boolean
  totalProgress: number
  completedCount: number
  errorCount: number
}

// Mock data for development - will be replaced with real data fetching
const mockFolders: FolderNode[] = [
  {
    id: "1",
    name: "Häuser",
    path: "/haeuser",
    type: "category",
    children: [
      {
        id: "2",
        name: "Musterstraße 123",
        path: "/haeuser/haus-1",
        type: "entity",
        entityType: "haus",
        entityId: "haus-1",
        children: [],
        fileCount: 5
      }
    ],
    fileCount: 5
  },
  {
    id: "3",
    name: "Wohnungen",
    path: "/wohnungen",
    type: "category",
    children: [
      {
        id: "4",
        name: "Wohnung 1A",
        path: "/wohnungen/wohnung-1",
        type: "entity",
        entityType: "wohnung",
        entityId: "wohnung-1",
        children: [],
        fileCount: 3
      }
    ],
    fileCount: 3
  },
  {
    id: "5",
    name: "Mieter",
    path: "/mieter",
    type: "category",
    children: [
      {
        id: "6",
        name: "Max Mustermann",
        path: "/mieter/mieter-1",
        type: "entity",
        entityType: "mieter",
        entityId: "mieter-1",
        children: [],
        fileCount: 2
      }
    ],
    fileCount: 2
  },
  {
    id: "7",
    name: "Sonstiges",
    path: "/sonstiges",
    type: "category",
    children: [],
    fileCount: 1
  }
]

const mockFiles: FileItem[] = [
  {
    id: "file-1",
    name: "Mietvertrag_Mustermann.pdf",
    size: 2048576,
    mimeType: "application/pdf",
    uploadedAt: "2024-01-15T10:30:00Z",
    path: "/mieter/mieter-1",
    storagePath: "user123/mieter/mieter-1/Mietvertrag_Mustermann.pdf",
    entityType: "mieter",
    entityId: "mieter-1"
  },
  {
    id: "file-2",
    name: "Hausansicht.jpg",
    size: 1536000,
    mimeType: "image/jpeg",
    uploadedAt: "2024-01-10T14:20:00Z",
    path: "/haeuser/haus-1",
    storagePath: "user123/haeuser/haus-1/Hausansicht.jpg",
    entityType: "haus",
    entityId: "haus-1"
  }
]

const mockSubscriptionLimits: SubscriptionLimits = {
  maxStorageBytes: 1073741824, // 1GB
  maxFileSize: 10485760, // 10MB
  allowedFileTypes: ["application/pdf", "image/jpeg", "image/png", "application/msword"],
  canShare: true,
  canBulkOperations: true
}

const mockStorageQuota: StorageQuota = {
  used: 104857600, // 100MB
  limit: 1073741824, // 1GB
  percentage: 10
}

export function CloudStoragePage() {
  const { toast } = useToast()
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [folders] = useState<FolderNode[]>(mockFolders)
  const [files] = useState<FileItem[]>(mockFiles)
  const [storageQuota] = useState<StorageQuota>(mockStorageQuota)
  
  // Upload queue state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueState>({
    items: [],
    isUploading: false,
    totalProgress: 0,
    completedCount: 0,
    errorCount: 0
  })
  const [isUploadAreaMinimized, setIsUploadAreaMinimized] = useState(false)
  const [showUploadProgress, setShowUploadProgress] = useState(false)

  // Get current folder files
  const currentFolderFiles = selectedFolder 
    ? files.filter(file => file.path === selectedFolder.path)
    : []

  // Generate breadcrumb items
  const breadcrumbItems = React.useMemo(() => {
    if (!selectedFolder) return []
    
    const pathParts = selectedFolder.path.split('/').filter(Boolean)
    const items = [{ name: 'Cloud Storage', path: '/' }]
    
    let currentPath = ''
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`
      const folder = findFolderByPath(folders, currentPath)
      if (folder) {
        items.push({ name: folder.name, path: currentPath })
      }
    })
    
    return items
  }, [selectedFolder, folders])

  // Helper function to find folder by path
  function findFolderByPath(folders: FolderNode[], path: string): FolderNode | null {
    for (const folder of folders) {
      if (folder.path === path) return folder
      if (folder.children) {
        const found = findFolderByPath(folder.children, path)
        if (found) return found
      }
    }
    return null
  }

  const handleFolderSelect = (folder: FolderNode) => {
    setSelectedFolder(folder)
    setSelectedFiles([])
    setIsSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const handleFileSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => 
      selected 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedFiles(selected ? currentFolderFiles.map(f => f.id) : [])
  }

  const handleFileAction = async (action: FileAction, fileIds: string[]) => {
    try {
      // Mock implementation - replace with real API calls
      switch (action) {
        case "download":
          toast({
            title: "Download gestartet",
            description: `${fileIds.length} Datei(en) werden heruntergeladen.`
          })
          break
        case "delete":
          toast({
            title: "Dateien gelöscht",
            description: `${fileIds.length} Datei(en) wurden gelöscht.`
          })
          setSelectedFiles([])
          break
        case "move":
          toast({
            title: "Dateien verschoben",
            description: `${fileIds.length} Datei(en) wurden verschoben.`
          })
          break
        default:
          console.log(`Action ${action} for files:`, fileIds)
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Die Aktion konnte nicht ausgeführt werden.",
        variant: "destructive"
      })
    }
  }

  const handleCreateFolder = (parentPath: string) => {
    // Mock implementation
    toast({
      title: "Ordner erstellen",
      description: `Neuer Ordner in ${parentPath}`
    })
  }

  const handleRenameFolder = (folderPath: string, currentName: string) => {
    // Mock implementation
    toast({
      title: "Ordner umbenennen",
      description: `Ordner "${currentName}" umbenennen`
    })
  }

  const handleDeleteFolder = (folderPath: string, folderName: string) => {
    // Mock implementation
    toast({
      title: "Ordner löschen",
      description: `Ordner "${folderName}" löschen`
    })
  }

  // Upload queue management functions
  const addToUploadQueue = useCallback((files: File[], targetFolderPath: string) => {
    const newItems: UploadQueueItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      folderPath: targetFolderPath,
      progress: 0,
      status: 'pending'
    }))

    setUploadQueue(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }))

    setShowUploadProgress(true)
    
    toast({
      title: `${files.length} Datei(en) zur Warteschlange hinzugefügt`,
      description: `Upload nach ${targetFolderPath}`
    })
  }, [toast])

  const removeFromUploadQueue = useCallback((itemId: string) => {
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }, [])

  const clearUploadQueue = useCallback(() => {
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.filter(item => item.status === 'uploading')
    }))
  }, [])

  const retryFailedUploads = useCallback(() => {
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.status === 'error' 
          ? { ...item, status: 'pending', progress: 0, error: undefined }
          : item
      ),
      errorCount: 0
    }))
  }, [])

  const cancelUpload = useCallback((itemId: string) => {
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }, [])

  const processUploadQueue = useCallback(async () => {
    const pendingItems = uploadQueue.items.filter(item => item.status === 'pending')
    if (pendingItems.length === 0) return

    setUploadQueue(prev => ({ ...prev, isUploading: true }))

    for (const item of pendingItems) {
      try {
        // Update item status to uploading
        setUploadQueue(prev => ({
          ...prev,
          items: prev.items.map(queueItem => 
            queueItem.id === item.id 
              ? { ...queueItem, status: 'uploading', startTime: Date.now() }
              : queueItem
          )
        }))

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadQueue(prev => ({
            ...prev,
            items: prev.items.map(queueItem => {
              if (queueItem.id === item.id && queueItem.progress < 90) {
                return { ...queueItem, progress: queueItem.progress + 10 }
              }
              return queueItem
            })
          }))
        }, 200)

        // Mock upload implementation
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        clearInterval(progressInterval)

        // Mark as completed
        setUploadQueue(prev => ({
          ...prev,
          items: prev.items.map(queueItem => 
            queueItem.id === item.id 
              ? { 
                  ...queueItem, 
                  status: 'completed', 
                  progress: 100,
                  completedTime: Date.now()
                }
              : queueItem
          ),
          completedCount: prev.completedCount + 1
        }))

      } catch (error) {
        // Mark as error
        setUploadQueue(prev => ({
          ...prev,
          items: prev.items.map(queueItem => 
            queueItem.id === item.id 
              ? { 
                  ...queueItem, 
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload fehlgeschlagen'
                }
              : queueItem
          ),
          errorCount: prev.errorCount + 1
        }))
      }
    }

    setUploadQueue(prev => ({ ...prev, isUploading: false }))

    // Show completion toast
    const completedCount = uploadQueue.completedCount
    const errorCount = uploadQueue.errorCount
    
    if (errorCount === 0) {
      toast({
        title: "Upload erfolgreich",
        description: `${completedCount} Datei(en) wurden hochgeladen.`
      })
    } else {
      toast({
        title: "Upload abgeschlossen",
        description: `${completedCount} erfolgreich, ${errorCount} fehlgeschlagen.`,
        variant: errorCount > completedCount ? "destructive" : "default"
      })
    }
  }, [uploadQueue.items, uploadQueue.completedCount, uploadQueue.errorCount, toast])

  // Context-aware upload handler
  const handleFileUpload = useCallback(async (files: File[], folderPath: string) => {
    // Use current folder if no specific folder provided
    const targetPath = folderPath || selectedFolder?.path || '/sonstiges'
    addToUploadQueue(files, targetPath)
  }, [selectedFolder?.path, addToUploadQueue])

  // Auto-process queue when items are added
  useEffect(() => {
    const pendingItems = uploadQueue.items.filter(item => item.status === 'pending')
    if (pendingItems.length > 0 && !uploadQueue.isUploading) {
      const timer = setTimeout(() => {
        processUploadQueue()
      }, 1000) // Small delay to allow for batch additions
      
      return () => clearTimeout(timer)
    }
  }, [uploadQueue.items, uploadQueue.isUploading, processUploadQueue])

  // Calculate total progress
  useEffect(() => {
    const totalItems = uploadQueue.items.length
    if (totalItems === 0) {
      setUploadQueue(prev => ({ ...prev, totalProgress: 0 }))
      return
    }

    const totalProgress = uploadQueue.items.reduce((sum, item) => sum + item.progress, 0)
    const averageProgress = totalProgress / totalItems

    setUploadQueue(prev => ({ ...prev, totalProgress: averageProgress }))
  }, [uploadQueue.items])

  // Global drag and drop handlers
  const [isDragOverPage, setIsDragOverPage] = useState(false)

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploadQueue.isUploading) {
      setIsDragOverPage(true)
    }
  }, [uploadQueue.isUploading])

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide overlay if leaving the entire page area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverPage(false)
    }
  }, [])

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOverPage(false)

    if (uploadQueue.isUploading) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const targetPath = selectedFolder?.path || '/sonstiges'
      addToUploadQueue(files, targetPath)
    }
  }, [uploadQueue.isUploading, selectedFolder?.path, addToUploadQueue])

  const formatStorageUsage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Global Drag Overlay */}
      {isDragOverPage && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              Dateien hier ablegen
            </h3>
            <p className="text-muted-foreground">
              Upload nach: {selectedFolder?.name || 'Sonstiges'}
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Cloud Storage</h1>
          </div>

          {/* Upload Progress Indicator */}
          {uploadQueue.isUploading && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground">
                Uploading {uploadQueue.items.filter(item => item.status === 'uploading').length} file(s)...
              </span>
              <Badge variant="secondary" className="text-xs">
                {Math.round(uploadQueue.totalProgress)}%
              </Badge>
            </div>
          )}
        </div>

        {/* Storage Quota and Upload Queue Status */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Upload Queue Summary */}
          {uploadQueue.items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadProgress(!showUploadProgress)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>{uploadQueue.items.length}</span>
              {uploadQueue.isUploading && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </Button>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>
              {formatStorageUsage(storageQuota.used)} von {formatStorageUsage(storageQuota.limit)} verwendet
            </span>
            <Badge 
              variant={storageQuota.percentage > 80 ? "destructive" : "secondary"}
              className="text-xs"
            >
              {storageQuota.percentage}%
            </Badge>
          </div>
          {storageQuota.percentage > 80 && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Upload Progress Panel */}
      {showUploadProgress && uploadQueue.items.length > 0 && (
        <div className="border-b bg-muted/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <h3 className="text-sm font-medium">
                  Upload-Warteschlange ({uploadQueue.items.length})
                </h3>
                {uploadQueue.isUploading && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(uploadQueue.totalProgress)}%
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUploadAreaMinimized(!isUploadAreaMinimized)}
                >
                  {isUploadAreaMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadProgress(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isUploadAreaMinimized && (
              <div className="space-y-2">
                {/* Overall Progress */}
                {uploadQueue.isUploading && (
                  <div className="mb-3">
                    <Progress value={uploadQueue.totalProgress} className="h-2" />
                  </div>
                )}

                {/* Upload Items */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadQueue.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 bg-background rounded border"
                    >
                      <div className="flex-shrink-0">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : item.status === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : item.status === 'uploading' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {item.file.name}
                          </p>
                          <span className="text-xs text-muted-foreground ml-2">
                            {(item.file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            → {item.folderPath}
                          </span>
                          {item.status === 'uploading' && (
                            <div className="flex-1 max-w-20">
                              <Progress value={item.progress} className="h-1" />
                            </div>
                          )}
                          {item.error && (
                            <span className="text-xs text-red-600">
                              {item.error}
                            </span>
                          )}
                        </div>
                      </div>

                      {!uploadQueue.isUploading && item.status !== 'uploading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromUploadQueue(item.id)}
                          className="flex-shrink-0 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Queue Actions */}
                {!uploadQueue.isUploading && uploadQueue.items.length > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearUploadQueue}
                      >
                        Warteschlange leeren
                      </Button>
                      {uploadQueue.errorCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryFailedUploads}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          Fehlgeschlagene wiederholen
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {uploadQueue.completedCount > 0 && (
                        <span className="text-green-600">
                          {uploadQueue.completedCount} erfolgreich
                        </span>
                      )}
                      {uploadQueue.errorCount > 0 && (
                        <span className="text-red-600 ml-2">
                          {uploadQueue.errorCount} fehlgeschlagen
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {breadcrumbItems.length > 0 && (
        <div className="px-6 py-3 border-b bg-muted/30">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.path}>
                  {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>}
                  {index === breadcrumbItems.length - 1 ? (
                    <BreadcrumbPage>{item.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault()
                          if (item.path === '/') {
                            setSelectedFolder(null)
                          } else {
                            const folder = findFolderByPath(folders, item.path)
                            if (folder) handleFolderSelect(folder)
                          }
                        }}
                      >
                        {item.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  )}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Folder Tree Sidebar */}
        <div className={cn(
          "w-80 border-r bg-background flex-shrink-0 transition-transform duration-200 ease-in-out",
          "md:translate-x-0 md:static md:z-auto",
          isSidebarOpen 
            ? "fixed inset-y-0 left-0 z-50 translate-x-0" 
            : "fixed inset-y-0 left-0 z-50 -translate-x-full md:translate-x-0"
        )}>
          <FolderTreeNavigation
            folders={folders}
            selectedFolderPath={selectedFolder?.path}
            onFolderSelect={handleFolderSelect}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            className="h-full"
          />
        </div>

        {/* File Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFolder ? (
            <div className="flex flex-col h-full">
              {/* Context-Aware Upload Area */}
              <div className="p-6 border-b bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Upload nach: {selectedFolder.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedFolder.path}
                    </Badge>
                  </div>
                  {uploadQueue.items.filter(item => item.folderPath === selectedFolder.path).length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {uploadQueue.items.filter(item => item.folderPath === selectedFolder.path).length} in Warteschlange
                    </Badge>
                  )}
                </div>
                
                <FileUpload
                  onUpload={handleFileUpload}
                  folderPath={selectedFolder.path}
                  subscriptionPlan="premium"
                  disabled={uploadQueue.isUploading}
                  className="h-28"
                />

                {/* Quick Upload Status for Current Folder */}
                {uploadQueue.items.filter(item => item.folderPath === selectedFolder.path).length > 0 && (
                  <div className="mt-3 p-2 bg-background rounded border">
                    <div className="text-xs text-muted-foreground mb-1">
                      Uploads für diesen Ordner:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {uploadQueue.items
                        .filter(item => item.folderPath === selectedFolder.path)
                        .slice(0, 3)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                          >
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : item.status === 'error' ? (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            ) : item.status === 'uploading' ? (
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            ) : (
                              <FileText className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="truncate max-w-20">
                              {item.file.name}
                            </span>
                          </div>
                        ))}
                      {uploadQueue.items.filter(item => item.folderPath === selectedFolder.path).length > 3 && (
                        <div className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                          +{uploadQueue.items.filter(item => item.folderPath === selectedFolder.path).length - 3} weitere
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* File List */}
              <div className="flex-1 p-6 overflow-hidden">
                <FileListDisplay
                  files={currentFolderFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                  onFileAction={handleFileAction}
                  availableFolders={folders}
                  subscriptionLimits={mockSubscriptionLimits}
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            /* Welcome Screen with Global Upload */
            <div className="flex-1 flex flex-col">
              {/* Global Upload Area */}
              <div className="p-6 border-b">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Schnell-Upload
                    </span>
                    <Badge variant="outline" className="text-xs">
                      → Sonstiges
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dateien werden in den "Sonstiges" Ordner hochgeladen, wenn kein spezifischer Ordner ausgewählt ist.
                  </p>
                </div>
                
                <FileUpload
                  onUpload={handleFileUpload}
                  folderPath="/sonstiges"
                  subscriptionPlan="premium"
                  disabled={uploadQueue.isUploading}
                  className="h-32"
                />
              </div>

              {/* Welcome Content */}
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <Cloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Willkommen bei Cloud Storage</h2>
                  <p className="text-muted-foreground mb-6">
                    Wählen Sie einen Ordner aus der Seitenleiste aus, um Ihre Dateien zu verwalten, oder nutzen Sie den Schnell-Upload oben.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Organisierte Ordnerstruktur für Häuser, Wohnungen und Mieter</p>
                    <p>• Drag & Drop Upload mit Warteschlange</p>
                    <p>• Dateivorschau und -verwaltung</p>
                    <p>• Kontextbewusste Uploads</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Storage Quota and Upload Status */}
      <div className="sm:hidden border-t bg-muted/30">
        {/* Upload Progress on Mobile */}
        {uploadQueue.items.length > 0 && (
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Uploads ({uploadQueue.items.length})
                </span>
                {uploadQueue.isUploading && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadProgress(!showUploadProgress)}
                className="h-6 w-6 p-0"
              >
                {showUploadProgress ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {uploadQueue.isUploading && (
              <Progress value={uploadQueue.totalProgress} className="h-1" />
            )}
            
            {showUploadProgress && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {uploadQueue.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : item.status === 'error' ? (
                      <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    ) : item.status === 'uploading' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{item.file.name}</span>
                    {item.status === 'uploading' && (
                      <span className="text-muted-foreground">{item.progress}%</span>
                    )}
                  </div>
                ))}
                {uploadQueue.items.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{uploadQueue.items.length - 3} weitere
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Storage Quota */}
        <div className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              <span>Speicher</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {formatStorageUsage(storageQuota.used)} / {formatStorageUsage(storageQuota.limit)}
              </span>
              <Badge 
                variant={storageQuota.percentage > 80 ? "destructive" : "secondary"}
                className="text-xs"
              >
                {storageQuota.percentage}%
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}