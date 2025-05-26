"use client"

import { useState } from "react"
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

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
}

export function TaskModal({ isOpen, onClose, onTaskAdded }: TaskModalProps) {
  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !beschreibung.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          beschreibung,
          ist_erledigt: false,
        }),
      })

      if (!response.ok) {
        throw new Error("Fehler beim Speichern der Aufgabe")
      }

      toast({
        title: "Erfolg",
        description: "Die Aufgabe wurde erfolgreich hinzugefügt.",
        variant: "success",
      })
      
      // Reset form and close modal
      setName("")
      setBeschreibung("")
      onTaskAdded()
      onClose()
    } catch (error) {
      console.error("Fehler beim Erstellen der Aufgabe:", error)
      toast({
        title: "Fehler",
        description: "Die Aufgabe konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Neue Aufgabe hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Aufgabe mit Namen und Beschreibung.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="required">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aufgabentitel eingeben"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beschreibung" className="required">
                Beschreibung
              </Label>
              <Textarea
                id="beschreibung"
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
              {isSubmitting ? "Wird gespeichert..." : "Aufgabe speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
