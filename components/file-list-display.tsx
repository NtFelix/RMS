"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { 
  ChevronsUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search,
  Download,
  Edit,
  Trash2,
  Move,
  Copy,
  Eye,
  MoreHorizontal,
  FileText,
  Image,
  File,
  Archive,
  Table as TableIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FileItem, FolderNode, SubscriptionLimits } from "@/types/cloud-storage"
import { formatNumber } from "@/utils/format"
import { useModalStore } from "@/hooks/use-modal-store"

// File sorting and filtering types
type FileSortKey = "name" | "size" | "uploadedAt" | "mimeType"
type SortDirection = "asc" | "desc"

interface FileListDisplayProps {
  files: FileItem[]
  selectedFiles: string[]
  onFileSelect: (fileId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onFileAction: (action: FileAction, fileIds: string[]) => void
  onFilePreview?: (file: FileItem) => void
  availableFolders?: FolderNode[]
  subscriptionLimits?: SubscriptionLimits
  className?: string
  loading?: boolean
}

export type FileAction = 
  | "download" 
  | "preview" 
  | "rename" 
  | "delete" 
  | "move" 
  | "copy"

// File type utilities
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4" />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <TableIcon className="h-4 w-4" />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return <Archive className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

const getFileTypeLabel = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'Bild'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'Tabelle'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Dokument'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archiv'
  if (mimeType.startsWith('text/')) return 'Text'
  return 'Datei'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${formatNumber(bytes / Math.pow(k, i), 1)} ${sizes[i]}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const supportsPreview = (mimeType: string): boolean => {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
}

export const FileListDisplay: React.FC<FileListDisplayProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onFileAction,
  onFilePreview,
  availableFolders = [],
  subscriptionLimits,
  className,
  loading = false
}) => {
  const { openFilePreviewModal } = useModalStore()
  const [sortKey, setSortKey] = useState<FileSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")

  // Get unique file types for filtering
  const fileTypes = useMemo(() => {
    const types = new Set(files.map(file => getFileTypeLabel(file.mimeType)))
    return Array.from(types).sort()
  }, [files])

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(file => 
        file.name.toLowerCase().includes(query)
      )
    }

    // Apply file type filter
    if (fileTypeFilter !== "all") {
      result = result.filter(file => 
        getFileTypeLabel(file.mimeType) === fileTypeFilter
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA: any, valB: any

      switch (sortKey) {
        case 'name':
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
          break
        case 'size':
          valA = a.size
          valB = b.size
          break
        case 'uploadedAt':
          valA = new Date(a.uploadedAt).getTime()
          valB = new Date(b.uploadedAt).getTime()
          break
        case 'mimeType':
          valA = getFileTypeLabel(a.mimeType).toLowerCase()
          valB = getFileTypeLabel(b.mimeType).toLowerCase()
          break
        default:
          return 0
      }

      if (typeof valA === 'string') {
        const comparison = valA.localeCompare(valB, 'de')
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        const comparison = valA - valB
        return sortDirection === "asc" ? comparison : -comparison
      }
    })

    return result
  }, [files, searchQuery, fileTypeFilter, sortKey, sortDirection])

  const handleSort = (key: FileSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: FileSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked)
  }

  const handleFileSelect = (fileId: string, checked: boolean) => {
    onFileSelect(fileId, checked)
  }

  const handleSingleFileAction = (action: FileAction, file: FileItem) => {
    if (action === "preview") {
      if (subscriptionLimits) {
        // Use the new modal store approach
        openFilePreviewModal(
          file,
          availableFolders,
          subscriptionLimits,
          async (actionType: string, fileId: string, data?: any) => {
            // Convert single file action to array format for consistency
            await new Promise<void>((resolve, reject) => {
              try {
                onFileAction(actionType as FileAction, [fileId])
                resolve()
              } catch (error) {
                reject(error)
              }
            })
          }
        )
      } else if (onFilePreview) {
        // Fallback to legacy approach
        onFilePreview(file)
      }
    } else {
      onFileAction(action, [file.id])
    }
  }

  const handleBulkAction = (action: FileAction) => {
    onFileAction(action, selectedFiles)
  }

  const allSelected = files.length > 0 && selectedFiles.length === files.length
  const someSelected = selectedFiles.length > 0 && selectedFiles.length < files.length

  const TableHeaderCell = ({ 
    sortKey, 
    children, 
    className 
  }: { 
    sortKey: FileSortKey
    children: React.ReactNode
    className?: string 
  }) => (
    <TableHead className={className}>
      <div
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2"
      >
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  if (loading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Dateien werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Dateien suchen..."
              className="pl-8 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9">
                {fileTypeFilter === "all" ? "Alle Dateitypen" : fileTypeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFileTypeFilter("all")}>
                Alle Dateitypen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {fileTypes.map((type) => (
                <DropdownMenuItem 
                  key={type} 
                  onClick={() => setFileTypeFilter(type)}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk Actions */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedFiles.length} ausgewählt
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("download")}
            >
              <Download className="h-4 w-4 mr-2" />
              Herunterladen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      {/* File Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el) {
                      // @ts-ignore - indeterminate is a valid property but not in the type definition
                      el.indeterminate = someSelected
                    }
                  }}
                />
              </TableHead>
              <TableHeaderCell sortKey="name" className="min-w-[250px]">
                Name
              </TableHeaderCell>
              <TableHeaderCell sortKey="mimeType">
                Typ
              </TableHeaderCell>
              <TableHeaderCell sortKey="size">
                Größe
              </TableHeaderCell>
              <TableHeaderCell sortKey="uploadedAt">
                Hochgeladen
              </TableHeaderCell>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchQuery || fileTypeFilter !== "all" 
                    ? "Keine Dateien gefunden, die den Filterkriterien entsprechen."
                    : "Keine Dateien vorhanden."
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedFiles.map((file) => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow 
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        selectedFiles.includes(file.id) && "bg-muted/30"
                      )}
                      onClick={() => handleFileSelect(file.id, !selectedFiles.includes(file.id))}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={(checked) => 
                            handleFileSelect(file.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.mimeType)}
                          <span className="font-medium truncate">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getFileTypeLabel(file.mimeType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(file.uploadedAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {supportsPreview(file.mimeType) && (
                              <DropdownMenuItem 
                                onClick={() => handleSingleFileAction("preview", file)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Vorschau
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleSingleFileAction("download", file)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Herunterladen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleSingleFileAction("rename", file)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Umbenennen
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSingleFileAction("move", file)}
                            >
                              <Move className="h-4 w-4 mr-2" />
                              Verschieben
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSingleFileAction("copy", file)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Kopieren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleSingleFileAction("delete", file)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {supportsPreview(file.mimeType) && (
                      <ContextMenuItem 
                        onClick={() => handleSingleFileAction("preview", file)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vorschau
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem 
                      onClick={() => handleSingleFileAction("download", file)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Herunterladen
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => handleSingleFileAction("rename", file)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Umbenennen
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => handleSingleFileAction("move", file)}
                    >
                      <Move className="h-4 w-4 mr-2" />
                      Verschieben
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => handleSingleFileAction("copy", file)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieren
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => handleSingleFileAction("delete", file)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* File Count Summary */}
      {filteredAndSortedFiles.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedFiles.length} von {files.length} Dateien
          {selectedFiles.length > 0 && ` • ${selectedFiles.length} ausgewählt`}
        </div>
      )}
    </div>
  )
}