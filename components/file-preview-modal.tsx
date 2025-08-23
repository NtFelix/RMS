"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Download,
  Edit,
  Trash2,
  Move,
  Copy,
  Share,
  X,
  FileText,
  Image,
  File,
  Archive,
  Table as TableIcon,
  Crown,
  Loader2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { FileItem, FolderNode, SubscriptionLimits } from "@/types/cloud-storage"
import { formatNumber } from "@/utils/format"

// File type utilities
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5" />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <TableIcon className="h-5 w-5" />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return <Archive className="h-5 w-5" />
  return <File className="h-5 w-5" />
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
  const value = bytes / Math.pow(k, i)
  // Use German number formatting with comma as decimal separator
  const formattedValue = value.toLocaleString('de-DE', { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  })
  return `${formattedValue} ${sizes[i]}`
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

interface FilePreviewModalProps {
  file: FileItem | null
  isOpen: boolean
  onClose: () => void
  onFileAction: (action: string, fileId: string, data?: any) => Promise<void>
  availableFolders?: FolderNode[]
  subscriptionLimits?: SubscriptionLimits
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onFileAction,
  availableFolders = [],
  subscriptionLimits
}: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  
  // Form states
  const [newFileName, setNewFileName] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [shareExpiry, setShareExpiry] = useState("24h")

  // Reset form states when file changes
  useEffect(() => {
    if (file) {
      setNewFileName(file.name)
      setSelectedFolderId("")
      setShareUrl("")
      setShareExpiry("24h")
    }
  }, [file])

  const handleDownload = async () => {
    if (!file) return
    
    setIsLoading(true)
    try {
      await onFileAction('download', file.id)
      toast({
        title: "Download gestartet",
        description: `${file.name} wird heruntergeladen.`,
      })
    } catch (error) {
      toast({
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRename = async () => {
    if (!file || !newFileName.trim()) return
    
    setIsLoading(true)
    try {
      await onFileAction('rename', file.id, { newName: newFileName.trim() })
      toast({
        title: "Datei umbenannt",
        description: `Datei wurde erfolgreich zu "${newFileName}" umbenannt.`,
      })
      setShowRenameDialog(false)
      onClose()
    } catch (error) {
      toast({
        title: "Umbenennung fehlgeschlagen",
        description: "Die Datei konnte nicht umbenannt werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMove = async () => {
    if (!file || !selectedFolderId) return
    
    setIsLoading(true)
    try {
      await onFileAction('move', file.id, { newFolderPath: selectedFolderId })
      toast({
        title: "Datei verschoben",
        description: "Die Datei wurde erfolgreich verschoben.",
      })
      setShowMoveDialog(false)
      onClose()
    } catch (error) {
      toast({
        title: "Verschieben fehlgeschlagen",
        description: "Die Datei konnte nicht verschoben werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!file) return
    
    setIsLoading(true)
    try {
      await onFileAction('delete', file.id)
      toast({
        title: "Datei gelöscht",
        description: `${file.name} wurde erfolgreich gelöscht.`,
      })
      setShowDeleteDialog(false)
      onClose()
    } catch (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: "Die Datei konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    if (!file) return
    
    setIsLoading(true)
    try {
      const result = await onFileAction('share', file.id, { expiry: shareExpiry })
      if (result && typeof result === 'object' && 'shareUrl' in result) {
        setShareUrl(result.shareUrl as string)
        toast({
          title: "Freigabe-Link erstellt",
          description: "Der Freigabe-Link wurde erfolgreich erstellt.",
        })
      } else if (typeof result === 'string') {
        // Handle case where result is directly a string URL
        setShareUrl(result)
        toast({
          title: "Freigabe-Link erstellt",
          description: "Der Freigabe-Link wurde erfolgreich erstellt.",
        })
      }
    } catch (error) {
      toast({
        title: "Freigabe fehlgeschlagen",
        description: "Der Freigabe-Link konnte nicht erstellt werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyShareUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link kopiert",
        description: "Der Freigabe-Link wurde in die Zwischenablage kopiert.",
      })
    }
  }

  const canShare = subscriptionLimits?.canShare ?? false

  if (!file) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-describedby="file-preview-description">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(file.mimeType)}
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    {file.name}
                  </DialogTitle>
                  <div id="file-preview-description" className="sr-only">
                    Dateivorschau und Aktionen für {file.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeLabel(file.mimeType)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(file.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Preview Area */}
            <div className="flex-1 p-6">
              {supportsPreview(file.mimeType) ? (
                <div className="w-full h-full min-h-[400px] bg-muted/30 rounded-lg flex items-center justify-center">
                  {file.mimeType === 'application/pdf' ? (
                    <div className="text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        PDF-Vorschau wird geladen...
                      </p>
                      {file.url && (
                        <iframe
                          src={file.url}
                          className="w-full h-96 border rounded"
                          title={`PDF Preview: ${file.name}`}
                        />
                      )}
                    </div>
                  ) : file.mimeType.startsWith('image/') ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {file.url ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="max-w-full max-h-full object-contain rounded"
                        />
                      ) : (
                        <div className="text-center">
                          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">
                            Bild wird geladen...
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="w-full h-full min-h-[400px] bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {getFileIcon(file.mimeType)}
                    <p className="text-sm text-muted-foreground mt-4">
                      Keine Vorschau verfügbar für diesen Dateityp
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="w-80 border-l bg-muted/20 p-6">
              <h3 className="font-semibold mb-4">Aktionen</h3>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDownload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Herunterladen
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowRenameDialog(true)}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Umbenennen
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowMoveDialog(true)}
                  disabled={isLoading}
                >
                  <Move className="h-4 w-4 mr-2" />
                  Verschieben
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowShareDialog(true)}
                  disabled={isLoading || !canShare}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Teilen
                  {!canShare && <Crown className="h-3 w-3 ml-auto text-amber-500" />}
                </Button>

                <Separator className="my-4" />

                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>

              {!canShare && (
                <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 text-sm">
                    <Crown className="h-4 w-4" />
                    <span className="font-medium">Premium Feature</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Datei-Freigabe ist nur für Premium-Nutzer verfügbar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei umbenennen</AlertDialogTitle>
            <AlertDialogDescription>
              Geben Sie einen neuen Namen für die Datei ein.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="fileName">Dateiname</Label>
            <Input
              id="fileName"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRename}
              disabled={!newFileName.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Umbenennen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Dialog */}
      <AlertDialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei verschieben</AlertDialogTitle>
            <AlertDialogDescription>
              Wählen Sie den Zielordner für die Datei aus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="targetFolder">Zielordner</Label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Ordner auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {availableFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.path}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMove}
              disabled={!selectedFolderId || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei teilen</AlertDialogTitle>
            <AlertDialogDescription>
              Erstellen Sie einen Freigabe-Link für diese Datei.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="shareExpiry">Gültigkeitsdauer</Label>
              <Select value={shareExpiry} onValueChange={setShareExpiry}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Stunde</SelectItem>
                  <SelectItem value="24h">24 Stunden</SelectItem>
                  <SelectItem value="7d">7 Tage</SelectItem>
                  <SelectItem value="30d">30 Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {shareUrl && (
              <div>
                <Label htmlFor="shareUrl">Freigabe-Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="shareUrl"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
            {!shareUrl && (
              <AlertDialogAction
                onClick={handleShare}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Link erstellen
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie "{file.name}" löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}