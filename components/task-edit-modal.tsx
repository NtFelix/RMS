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
import { useModalStore } from "@/hooks/use-modal-store" // Import the modal store

// Props are now controlled by useModalStore
interface TaskEditModalProps {
  // isOpen, onClose, onTaskUpdated, task are now from store
  serverAction: (id: string | null, data: { name: string; beschreibung: string; ist_erledigt: boolean }) => Promise<{ success: boolean; error?: any; data?: any }>;
}

export function TaskEditModal({ serverAction }: TaskEditModalProps) {
  const {
    isAufgabeModalOpen,
    closeAufgabeModal,
    aufgabeInitialData,
    aufgabeModalOnSuccess,
    isAufgabeModalDirty,
    setAufgabeModalDirty,
    openConfirmationModal,
  } = useModalStore();

  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAufgabeModalOpen && aufgabeInitialData) {
      setName(aufgabeInitialData.name || "")
      setBeschreibung(aufgabeInitialData.beschreibung || "")
      setAufgabeModalDirty(false); // Reset dirty state
    } else if (isAufgabeModalOpen) { // New task, reset fields
      setName("")
      setBeschreibung("")
      setAufgabeModalDirty(false);
    }
  }, [aufgabeInitialData, isAufgabeModalOpen, setAufgabeModalDirty])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setAufgabeModalDirty(true);
  };

  const handleBeschreibungChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBeschreibung(e.target.value);
    setAufgabeModalDirty(true);
  };

  const attemptClose = () => {
    closeAufgabeModal(); // Store handles confirmation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For new tasks, aufgabeInitialData might be null or an empty object.
    // For existing tasks, aufgabeInitialData.id will be present.
    const isEditing = !!aufgabeInitialData?.id;

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

      const payload = {
        name,
        beschreibung,
        // For new tasks, default ist_erledigt to false. For existing, preserve it.
        ist_erledigt: isEditing ? aufgabeInitialData.ist_erledigt : false,
      };

      const taskId = isEditing ? aufgabeInitialData.id : null;
      const result = await serverAction(taskId, payload);

      if (!result.success) {
        throw new Error(result.error?.message || "Fehler beim Speichern der Aufgabe")
      }

      toast({
        title: "Erfolg",
        description: `Die Aufgabe wurde erfolgreich ${isEditing ? "aktualisiert" : "erstellt"}.`,
        variant: "success",
      })
      
      setAufgabeModalDirty(false); // Reset dirty state on success
      if (aufgabeModalOnSuccess) {
        // If creating, result.data might contain the new task with ID.
        // If editing, we can merge.
        const returnedData = result.data || {};
        const finalTaskData = {
          ...(aufgabeInitialData || {}), // Base for existing or empty for new
          id: taskId || returnedData.id, // Use existing ID or ID from creation response
          name,
          beschreibung,
          ist_erledigt: payload.ist_erledigt,
          ...returnedData // Overlay with any other fields from response
        };
        aufgabeModalOnSuccess(finalTaskData);
      }
      closeAufgabeModal(); // Will close directly
    } catch (error) {
      console.error(`Fehler beim ${isEditing ? "Aktualisieren" : "Erstellen"} der Aufgabe:`, error)
      toast({
        title: "Fehler",
        description: "Die Aufgabe konnte nicht aktualisiert werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
      // Do not reset dirty flag here, error occurred
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAufgabeModalOpen) return null // Controlled by store

  // Ensure we have data if the modal is open for an existing task
  // This check might be redundant if openAufgabeModal ensures initialData is set for edits.
  if (isAufgabeModalOpen && !aufgabeInitialData && !aufgabeInitialData?.id) {
    // This case should ideally be handled by how openAufgabeModal is called.
    // If it means editing an existing task, aufgabeInitialData should be populated.
    // If it means creating a new task, the form should be blank (handled by useEffect).
    // For safety, we can prevent rendering or show an error if data is inconsistent.
    // console.error("TaskEditModal opened without initial data for an existing task.");
    // return null; // Or some error display
  }


  return (
    <Dialog open={isAufgabeModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="sm:max-w-[500px]"
        isDirty={isAufgabeModalDirty}
        onAttemptClose={attemptClose}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            {/* Title can be dynamic if we differentiate Add vs Edit in store/initialData */}
            <DialogTitle>{aufgabeInitialData?.id ? "Aufgabe bearbeiten" : "Aufgabe erstellen"}</DialogTitle>
            <DialogDescription>
              {aufgabeInitialData?.id ? "Aktualisieren Sie die Details der Aufgabe." : "Erstellen Sie eine neue Aufgabe."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="required">
                Name
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={handleNameChange}
                placeholder="Aufgabentitel eingeben"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-beschreibung" className="required">
                Beschreibung
              </Label>
              <Textarea
                id="edit-beschreibung"
                value={beschreibung}
                onChange={handleBeschreibungChange}
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                className="min-h-[100px]"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={attemptClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : (aufgabeInitialData?.id ? "Speichern" : "Erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
