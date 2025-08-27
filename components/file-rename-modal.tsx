"use client"

import { useState, useEffect } from "react"
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
import { Loader2, FileText } from "lucide-react"

interface FileRenameModalProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  onRename: (newName: string) => Promise<void>
}

export function FileRenameModal({
  isOpen,
  onClose,
  fileName,
  onRename
}: FileRenameModalProps) {
  const [newName, setNewName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Initialize the input with the current filename (without extension)
  useEffect(() => {
    if (isOpen && fileName) {
      const nameWithoutExtension = fileName.includes('.') 
        ? fileName.substring(0, fileName.lastIndexOf('.'))
        : fileName
      setNewName(nameWithoutExtension)
    }
  }, [isOpen, fileName])

  // Get file extension
  const getFileExtension = () => {
    return fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newName.trim()) {
      toast({
        title: "Ungültiger Name",
        description: "Der Dateiname darf nicht leer sein.",
        variant: "destructive"
      })
      return
    }

    // Validate filename characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(newName)) {
      toast({
        title: "Ungültiger Name",
        description: "Der Dateiname darf keine der folgenden Zeichen enthalten: < > : \" / \\ | ? *",
        variant: "destructive"
      })
      return
    }

    // Add the original file extension back
    const extension = getFileExtension()
    const fullNewName = newName.trim() + extension

    // Check if the name actually changed
    if (fullNewName === fileName) {
      onClose()
      return
    }

    setIsLoading(true)
    
    try {
      await onRename(fullNewName)
      toast({
        description: `Datei wurde erfolgreich zu "${fullNewName}" umbenannt.`
      })
      onClose()
    } catch (error) {
      toast({
        title: "Fehler beim Umbenennen",
        description: error instanceof Error ? error.message : "Die Datei konnte nicht umbenannt werden.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Datei umbenennen
          </DialogTitle>
          <DialogDescription>
            Geben Sie einen neuen Namen für die Datei ein. Die Dateierweiterung wird automatisch beibehalten.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">Dateiname</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filename"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Neuer Dateiname"
                  disabled={isLoading}
                  className="flex-1"
                  autoFocus
                />
                {getFileExtension() && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {getFileExtension()}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Aktueller Name: {fileName}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !newName.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Umbenennen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}