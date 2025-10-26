"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2, Archive, Star, Eye, EyeOff, Loader2, FolderInput } from "lucide-react"
import type { LegacyMail } from "@/types/Mail"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface MailBulkActionBarProps {
  selectedMails: Set<string>
  mails: LegacyMail[]
  onClearSelection: () => void
  onExport: () => void
  onMarkAsRead: () => void
  onMarkAsUnread: () => void
  onToggleFavorite: () => void
  onArchive: () => void
  onDelete: () => void
  onDeletePermanently: () => void
  onMoveToFolder: (folder: string) => void
}

export function MailBulkActionBar({
  selectedMails,
  mails,
  onClearSelection,
  onExport,
  onMarkAsRead,
  onMarkAsUnread,
  onToggleFavorite,
  onArchive,
  onDelete,
  onDeletePermanently,
  onMoveToFolder,
}: MailBulkActionBarProps) {
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>("inbox")
  const [isProcessing, setIsProcessing] = useState(false)

  if (selectedMails.size === 0) return null

  const handleMoveToFolder = async () => {
    if (!selectedFolder) {
      toast.error("Bitte wählen Sie einen Ordner aus")
      return
    }

    setIsProcessing(true)
    try {
      await onMoveToFolder(selectedFolder)
      setIsMoveDialogOpen(false)
      setSelectedFolder("inbox")
      toast.success(`${selectedMails.size} E-Mails verschoben`)
    } catch (error) {
      toast.error("Fehler beim Verschieben der E-Mails")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePermanently = async () => {
    setIsProcessing(true)
    try {
      await onDeletePermanently()
      setIsDeleteDialogOpen(false)
      toast.success(`${selectedMails.size} E-Mails endgültig gelöscht`)
    } catch (error) {
      toast.error("Fehler beim Löschen der E-Mails")
    } finally {
      setIsProcessing(false)
    }
  }

  const folders = [
    { value: "inbox", label: "Posteingang" },
    { value: "sent", label: "Gesendet" },
    { value: "drafts", label: "Entwürfe" },
    { value: "archive", label: "Archiv" },
    { value: "trash", label: "Papierkorb" },
    { value: "spam", label: "Spam" },
  ]

  return (
    <>
      <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={true}
              onCheckedChange={onClearSelection}
              className="data-[state=checked]:bg-primary"
            />
            <span className="font-medium text-sm">
              {selectedMails.size} {selectedMails.size === 1 ? 'E-Mail' : 'E-Mails'} ausgewählt
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2 hover:bg-primary/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAsRead}
            className="h-8 gap-2"
          >
            <Eye className="h-4 w-4" />
            Als gelesen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAsUnread}
            className="h-8 gap-2"
          >
            <EyeOff className="h-4 w-4" />
            Als ungelesen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFavorite}
            className="h-8 gap-2"
          >
            <Star className="h-4 w-4" />
            Favorit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMoveDialogOpen(true)}
            className="h-8 gap-2"
          >
            <FolderInput className="h-4 w-4" />
            Verschieben
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            className="h-8 gap-2"
          >
            <Archive className="h-4 w-4" />
            Archivieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-2"
          >
            <Download className="h-4 w-4" />
            Exportieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-8 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            In Papierkorb
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            Endgültig löschen
          </Button>
        </div>
      </div>

      {/* Move to Folder Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>E-Mails verschieben</DialogTitle>
            <DialogDescription>
              Verschieben Sie {selectedMails.size} {selectedMails.size === 1 ? 'ausgewählte E-Mail' : 'ausgewählte E-Mails'} in einen anderen Ordner.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder" className="text-right">
                Ordner
              </Label>
              <Select
                value={selectedFolder}
                onValueChange={setSelectedFolder}
                disabled={isProcessing}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Ordner auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.value} value={folder.value}>
                      {folder.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMoveDialogOpen(false)}
              disabled={isProcessing}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleMoveToFolder}
              disabled={!selectedFolder || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird verschoben...
                </>
              ) : 'Verschieben'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permanently Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Mails endgültig löschen?</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich {selectedMails.size} {selectedMails.size === 1 ? 'E-Mail' : 'E-Mails'} endgültig löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePermanently}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : 'Endgültig löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
