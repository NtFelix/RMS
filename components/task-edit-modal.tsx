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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

interface TaskEditModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: () => void
  task: {
    id: string
    name: string
    beschreibung: string
    ist_erledigt: boolean
  } | null
}

export function TaskEditModal({ isOpen, onClose, onTaskUpdated, task }: TaskEditModalProps) {
  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set initial values when task changes
  useEffect(() => {
    if (task) {
      setName(task.name)
      setBeschreibung(task.beschreibung)
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task || !name.trim() || !beschreibung.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/todos/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          beschreibung,
          ist_erledigt: task.ist_erledigt,
        }),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren der Aufgabe")
      }

      toast({
        title: "Erfolg",
        description: "Die Aufgabe wurde erfolgreich aktualisiert.",
      })
      
      onTaskUpdated()
      onClose()
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Aufgabe:", error)
      toast({
        title: "Fehler",
        description: "Die Aufgabe konnte nicht aktualisiert werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Aufgabe bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Details der Aufgabe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="required">
                Name
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aufgabentitel eingeben"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-beschreibung" className="required">
                Beschreibung
              </Label>
              <Textarea
                id="edit-beschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                className="min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
