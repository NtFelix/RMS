"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Archive,
  RotateCcw,
  Trash2,
  Download,
  Search,
  Calendar,
  FolderOpen,
  File,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useCloudStorageArchive, StorageObject } from "@/hooks/use-cloud-storage-store"
import { extractArchiveTimestamp, reconstructOriginalPath } from "@/lib/path-utils"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ArchiveBrowserModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

interface ArchivedFileWithMetadata extends StorageObject {
  timestamp: string
  originalPath: string | null
  archiveDate: Date
}

export function ArchiveBrowserModal({ isOpen, onClose, userId }: ArchiveBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'originalPath'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const {
    archivedFiles,
    isArchiveLoading,
    archiveError,
    loadArchivedFiles,
    restoreFile,
    permanentlyDeleteFile,
    setArchiveError
  } = useCloudStorageArchive()

  const { toast } = useToast()

  // Load archived files when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadArchivedFiles(userId)
    }
  }, [isOpen, userId, loadArchivedFiles])

  // Process archived files with metadata
  const processedFiles: ArchivedFileWithMetadata[] = archivedFiles.map(file => {
    const timestamp = extractArchiveTimestamp(file.name) || ''
    const originalPath = reconstructOriginalPath(file.name)
    const archiveDate = timestamp ? new Date(timestamp.replace(/-/g, ':')) : new Date(file.created_at)

    return {
      ...file,
      timestamp,
      originalPath,
      archiveDate
    }
  })

  // Filter and sort files
  const filteredAndSortedFiles = processedFiles
    .filter(file => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        file.name.toLowerCase().includes(query) ||
        (file.originalPath && file.originalPath.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = a.archiveDate.getTime() - b.archiveDate.getTime()
          break
        case 'originalPath':
          const pathA = a.originalPath || ''
          const pathB = b.originalPath || ''
          comparison = pathA.localeCompare(pathB)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleRestore = async (file: ArchivedFileWithMetadata) => {
    try {
      await restoreFile(file, file.originalPath || undefined)
      toast({
        title: "Datei wiederhergestellt",
        description: `${file.name} wurde erfolgreich wiederhergestellt.`,
      })
    } catch (error) {
      toast({
        title: "Wiederherstellung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async (file: ArchivedFileWithMetadata) => {
    if (!confirm(`Sind Sie sicher, dass Sie "${file.name}" dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    try {
      await permanentlyDeleteFile(file)
      toast({
        title: "Datei dauerhaft gelöscht",
        description: `${file.name} wurde dauerhaft gelöscht.`,
      })
    } catch (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    }
  }

  const handleBulkRestore = async () => {
    const filesToRestore = filteredAndSortedFiles.filter(file => selectedFiles.has(file.id))

    for (const file of filesToRestore) {
      try {
        await restoreFile(file, file.originalPath || undefined)
      } catch (error) {
        console.error(`Failed to restore ${file.name}:`, error)
      }
    }

    setSelectedFiles(new Set())
    toast({
      title: "Dateien wiederhergestellt",
      description: `${filesToRestore.length} Dateien wurden wiederhergestellt.`,
    })
  }

  const handleBulkDelete = async () => {
    const filesToDelete = filteredAndSortedFiles.filter(file => selectedFiles.has(file.id))

    if (!confirm(`Sind Sie sicher, dass Sie ${filesToDelete.length} Dateien dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    for (const file of filesToDelete) {
      try {
        await permanentlyDeleteFile(file)
      } catch (error) {
        console.error(`Failed to delete ${file.name}:`, error)
      }
    }

    setSelectedFiles(new Set())
    toast({
      title: "Dateien gelöscht",
      description: `${filesToDelete.length} Dateien wurden dauerhaft gelöscht.`,
    })
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const selectAllFiles = () => {
    setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.id)))
  }

  const clearSelection = () => {
    setSelectedFiles(new Set())
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archiv Browser
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Dateien durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as 'name' | 'date' | 'originalPath')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="date-desc">Neueste zuerst</option>
              <option value="date-asc">Älteste zuerst</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="originalPath-asc">Pfad A-Z</option>
              <option value="originalPath-desc">Pfad Z-A</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedFiles.size} Dateien ausgewählt
              </span>
              <Separator orientation="vertical" className="h-4" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkRestore}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Wiederherstellen
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Dauerhaft löschen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
              >
                Auswahl aufheben
              </Button>
            </div>
          )}

          {/* File List */}
          <ScrollArea className="h-96">
            {isArchiveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Archiv wird geladen...</span>
              </div>
            ) : archiveError ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{archiveError}</span>
              </div>
            ) : filteredAndSortedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mb-2" />
                <p className="text-lg font-medium">Archiv ist leer</p>
                <p className="text-sm">Gelöschte Dateien werden hier angezeigt</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllFiles}
                  >
                    Alle auswählen
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {filteredAndSortedFiles.length} Dateien gefunden
                  </span>
                </div>

                {filteredAndSortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors",
                      selectedFiles.has(file.id) && "bg-accent border-primary"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="rounded"
                    />

                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {file.name.split('/').pop()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>

                      {file.originalPath && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <FolderOpen className="h-3 w-3" />
                          <span className="truncate">{file.originalPath}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Archiviert {formatDistanceToNow(file.archiveDate, {
                            addSuffix: true,
                            locale: de
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(file)}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Wiederherstellen
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(file)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Löschen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}