"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox"; // Added for ist_erledigt

// Define interfaces based on expected data structure
interface AufgabePayload {
  name: string;
  beschreibung?: string | null;
  ist_erledigt?: boolean;
}

interface AufgabeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AufgabePayload & { id?: string }; // Allow id for editing
  serverAction: (
    id: string | null,
    data: AufgabePayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
}

export function AufgabeEditModal({
  open,
  onOpenChange,
  initialData,
  serverAction,
}: AufgabeEditModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [istErledigt, setIstErledigt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || "");
      setBeschreibung(initialData.beschreibung || "");
      setIstErledigt(initialData.ist_erledigt || false);
    } else if (open && !initialData) {
      // Reset for new task
      setName("");
      setBeschreibung("");
      setIstErledigt(false);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { // Beschreibung can be optional
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für die Aufgabe ein.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const payload: AufgabePayload = {
      name,
      beschreibung: beschreibung.trim() || null,
      ist_erledigt: istErledigt,
    };

    try {
      const result = await serverAction(initialData?.id || null, payload);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Die Aufgabe "${name}" wurde erfolgreich ${initialData ? "aktualisiert" : "hinzugefügt"}.`,
        });
        onOpenChange(false); // Close modal
        router.refresh(); // Refresh page to show changes
      } else {
        throw new Error(result.error?.message || "Fehler beim Speichern der Aufgabe");
      }
    } catch (error: any) {
      console.error("Fehler beim Speichern der Aufgabe:", error);
      toast({
        title: "Fehler",
        description: error.message || "Die Aufgabe konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for the Dialog's onOpenChange, ensuring clean state if modal is dismissed
  const handleDialogOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset form fields if needed when closing via X or overlay click
        // This is already handled by useEffect when `open` prop changes to false
    }
    onOpenChange(isOpen);
  };


  return (
    <Dialog open={open} onOpenChange={handleDialogOnOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? "Aufgabe bearbeiten" : "Neue Aufgabe erstellen"}</DialogTitle>
            <DialogDescription>
              {initialData ? "Aktualisieren Sie die Details dieser Aufgabe." : "Erstellen Sie eine neue Aufgabe mit Namen und optionaler Beschreibung."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aufgabentitel eingeben"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
              <Textarea
                id="beschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
            </div>
            {initialData && ( // Only show "erledigt" checkbox when editing
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ist_erledigt" 
                  checked={istErledigt} 
                  onCheckedChange={(checked) => setIstErledigt(!!checked)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="ist_erledigt">Erledigt</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (initialData ? "Wird aktualisiert..." : "Wird erstellt...") : (initialData ? "Änderungen speichern" : "Aufgabe erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
