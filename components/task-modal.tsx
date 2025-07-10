"use client"

import { useState, useEffect, useCallback } from "react" // Added useEffect, useCallback
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
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
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For dirty checking
  const [initialName, setInitialName] = useState("");
  const [initialBeschreibung, setInitialBeschreibung] = useState("");
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Capture initial state when modal opens (for a new task, it's empty)
      setInitialName("");
      setInitialBeschreibung("");
      // Reset form fields (though they should be empty for a new task modal already)
      setName("");
      setBeschreibung("");
    } else {
      // Reset confirmation modal when main modal closes
      setShowConfirmDiscardModal(false);
    }
  }, [isOpen]);

  const isFormDataDirty = useCallback(() => {
    return name.trim() !== initialName || beschreibung.trim() !== initialBeschreibung;
    // Since initial is always empty for this "add new" modal,
    // this simplifies to checking if name or beschreibung have any content.
  }, [name, beschreibung, initialName, initialBeschreibung]);

  const resetForm = () => {
    setName("");
    setBeschreibung("");
    setInitialName("");
    setInitialBeschreibung("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !beschreibung.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
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
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern der Aufgabe");
      }

      toast({
        title: "Erfolg",
        description: "Die Aufgabe wurde erfolgreich hinzugefügt.",
        variant: "success",
      });
      
      resetForm();
      onTaskAdded();
      onClose(); // Close main modal
    } catch (error) {
      console.error("Fehler beim Erstellen der Aufgabe:", error);
      toast({
        title: "Fehler",
        description: "Die Aufgabe konnte nicht gespeichert werden. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttemptClose = useCallback((event?: Event) => {
    if (isFormDataDirty()) {
      if (event) event.preventDefault();
      setShowConfirmDiscardModal(true);
    } else {
      onClose();
    }
  }, [isFormDataDirty, onClose]);

  const handleMainModalOpenChange = (openStatus: boolean) => {
    if (!openStatus && isFormDataDirty()) {
      setShowConfirmDiscardModal(true);
    } else if (!openStatus) { // Closing and not dirty
      resetForm(); // Ensure form is reset if closed without saving (e.g. via X or ESC on clean form)
      onClose();
    }
    // If openStatus is true, Dialog handles it.
  };

  const handleConfirmDiscard = () => {
    resetForm();
    onClose(); // Close main modal
    setShowConfirmDiscardModal(false);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleMainModalOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutsideOptional={(e) => {
          if (isOpen && isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (isOpen) {
            handleMainModalOpenChange(false); // Trigger reset and close
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else {
            handleMainModalOpenChange(false); // Trigger reset and close
          }
        }}
      >
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
            <Button variant="outline" type="button" onClick={() => handleAttemptClose()}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : "Aufgabe speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmationAlertDialog
        isOpen={showConfirmDiscardModal}
        onOpenChange={setShowConfirmDiscardModal}
        onConfirm={handleConfirmDiscard}
        title="Änderungen verwerfen?"
        description="Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?"
        confirmButtonText="Verwerfen"
        cancelButtonText="Weiter bearbeiten"
        confirmButtonVariant="destructive"
      />
  </>
  )
}
