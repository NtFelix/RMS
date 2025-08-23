"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { FolderTreeNavigation } from "@/components/folder-tree-navigation"
import { FileListDisplay, FileAction } from "@/components/file-list-display"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Cloud, 
  Upload, 
  Search, 
  Menu, 
  X, 
  Home,
  ChevronRight,
  HardDrive,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FileItem, FolderNode, SubscriptionLimits, StorageQuota } from "@/types/cloud-storage"
import { useToast } from "@/hooks/use-toast"

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
  const [isUploading, setIsUploading] = useState(false)
  const [folders] = useState<FolderNode[]>(mockFolders)
  const [files] = useState<FileItem[]>(mockFiles)
  const [storageQuota] = useState<StorageQuota>(mockStorageQuota)

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

  const handleFileUpload = async (files: File[], folderPath: string) => {
    setIsUploading(true)
    try {
      // Mock upload implementation
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: "Upload erfolgreich",
        description: `${files.length} Datei(en) wurden in ${folderPath} hochgeladen.`
      })
    } catch (error) {
      toast({
        title: "Upload fehlgeschlagen",
        description: "Die Dateien konnten nicht hochgeladen werden.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatStorageUsage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div className="flex flex-col h-full">
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
        </div>

        {/* Storage Quota */}
        <div className="hidden sm:flex items-center gap-4">
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
              {/* Upload Area */}
              <div className="p-6 border-b">
                <FileUpload
                  onUpload={handleFileUpload}
                  folderPath={selectedFolder.path}
                  subscriptionPlan="premium"
                  disabled={isUploading}
                  className="h-32"
                />
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
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <Cloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Willkommen bei Cloud Storage</h2>
                <p className="text-muted-foreground mb-6">
                  Wählen Sie einen Ordner aus der Seitenleiste aus, um Ihre Dateien zu verwalten.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Organisierte Ordnerstruktur für Häuser, Wohnungen und Mieter</p>
                  <p>• Drag & Drop Upload</p>
                  <p>• Dateivorschau und -verwaltung</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Storage Quota */}
      <div className="sm:hidden p-4 border-t bg-muted/30">
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
  )
}