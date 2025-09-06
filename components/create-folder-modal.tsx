"use client"

import { useState } from "react"
import { FolderPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  currentPath: string
  onFolderCreated: (folderName: string) => void
}

export function CreateFolderModal({
  isOpen,
  onClose,
  currentPath,
  onFolderCreated
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!folderName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Ordnernamen ein.",
        variant: "destructive"
      })
      return
    }

    // Validate folder name
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(folderName.trim())) {
      toast({
        title: "Ungültiger Name",
        description: "Der Ordnername darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Unterstriche enthalten.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/dateien/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderPath: currentPath,
          folderName: folderName.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create folder')
      }

      toast({
        title: "Ordner erstellt",
        description: `Der Ordner "${folderName.trim()}" wurde erfolgreich erstellt.`
      })

      onFolderCreated(folderName.trim())
      handleClose()

    } catch (error) {
      console.error('Error creating folder:', error)
      toast({
        title: "Fehler beim Erstellen",
        description: error instanceof Error ? error.message : "Der Ordner konnte nicht erstellt werden.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setFolderName("")
    setIsCreating(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FolderPlus className="h-5 w-5 mr-2" />
            Neuen Ordner erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Ordner im aktuellen Verzeichnis.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                Name
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ordnername eingeben..."
                disabled={isCreating}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isCreating || !folderName.trim()}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}