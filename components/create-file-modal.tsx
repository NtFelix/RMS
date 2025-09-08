"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
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
import { useModalStore } from "@/hooks/use-modal-store"

interface CreateFileModalProps {
  isOpen: boolean
  onClose: () => void
  currentPath: string
  onFileCreated: (fileName: string) => void
}

export function CreateFileModal({
  isOpen,
  onClose,
  currentPath,
  onFileCreated
}: CreateFileModalProps) {
  const [fileName, setFileName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const { openMarkdownEditorModal } = useModalStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fileName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Dateinamen ein.",
        variant: "destructive"
      })
      return
    }

    // Add .md extension if not provided
    let finalFileName = fileName.trim()
    if (!finalFileName.endsWith('.md')) {
      finalFileName += '.md'
    }

    // Validate file name
    if (!/^[a-zA-Z0-9_\-\s.]+$/.test(finalFileName)) {
      toast({
        title: "Ungültiger Name",
        description: "Der Dateiname darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche, Unterstriche und Punkte enthalten.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Generate initial content once to avoid duplication
      const initialContent = `# ${finalFileName.replace('.md', '')}\n\n## Beschreibung\n\n\n\n## Inhalt\n\n\n\n---\n\n*Erstellt am: ${new Date().toLocaleDateString('de-DE')}*`
      
      const response = await fetch('/api/dateien/create-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: currentPath,
          fileName: finalFileName,
          content: initialContent
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create file')
      }

      toast({
        title: "Datei erstellt",
        description: `Die Datei "${finalFileName}" wurde erfolgreich erstellt.`
      })

      onFileCreated(finalFileName)
      handleClose()

      // Open the markdown editor for the newly created file
      
      openMarkdownEditorModal({
        filePath: currentPath,
        fileName: finalFileName,
        initialContent: initialContent,
        isNewFile: false
      })

    } catch (error) {
      console.error('Error creating file:', error)
      toast({
        title: "Fehler beim Erstellen",
        description: error instanceof Error ? error.message : "Die Datei konnte nicht erstellt werden.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setFileName("")
    setIsCreating(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Neue Datei erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie eine neue Markdown-Datei im aktuellen Verzeichnis.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">
                Name
              </Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Dateiname eingeben..."
                disabled={isCreating}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Die Datei wird automatisch als .md-Datei erstellt.
              </p>
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
            <Button type="submit" disabled={isCreating || !fileName.trim()}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}