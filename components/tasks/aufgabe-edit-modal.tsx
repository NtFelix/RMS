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
import { toast } from "@/hooks/use-toast"; // Changed import path
import { Checkbox } from "@/components/ui/checkbox"; // Added for ist_erledigt

// Define interfaces based on expected data structure
interface AufgabePayload {
  name: string;
  beschreibung?: string | null;
  ist_erledigt?: boolean;
}

// Import useModalStore
import { useModalStore } from "@/hooks/use-modal-store";

interface AufgabeEditModalProps {
  // open: boolean; // Now from useModalStore: isAufgabeModalOpen
  // onOpenChange: (open: boolean) => void; // Now from useModalStore: closeAufgabeModal
  // initialData?: AufgabePayload & { id?: string }; // Now from useModalStore: aufgabeInitialData
  serverAction: (
    id: string | null,
    data: AufgabePayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
  // onSuccess?: (data: any) => void; // Now from useModalStore: aufgabeModalOnSuccess
}

export function AufgabeEditModal({
  serverAction,
}: AufgabeEditModalProps) {
  const {
    isAufgabeModalOpen,
    closeAufgabeModal,
    aufgabeInitialData,
    aufgabeModalOnSuccess,
    isAufgabeModalDirty,
    setAufgabeModalDirty,
  } = useModalStore();

  const router = useRouter(); // Keep if used, though not in current snippet for direct use
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [istErledigt, setIstErledigt] = useState(false); // This is part of AufgabePayload
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAufgabeModalOpen && aufgabeInitialData) {
      setName(aufgabeInitialData.name || "");
      setBeschreibung(aufgabeInitialData.beschreibung || "");
      setIstErledigt(aufgabeInitialData.ist_erledigt || false);
      setAufgabeModalDirty(false);
    } else if (isAufgabeModalOpen && !aufgabeInitialData) {
      setName("");
      setBeschreibung("");
      setIstErledigt(false);
      setAufgabeModalDirty(false);
    }
  }, [isAufgabeModalOpen, aufgabeInitialData, setAufgabeModalDirty]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setAufgabeModalDirty(true);
  };

  const handleBeschreibungChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBeschreibung(e.target.value);
    setAufgabeModalDirty(true);
  };

  const handleErledigtChange = (checked: boolean) => {
    setIstErledigt(checked);
    setAufgabeModalDirty(true);
  };

  const attemptClose = () => {
    closeAufgabeModal(); // Store handles confirmation for outside click/X
  };

  const handleCancelClick = () => {
    closeAufgabeModal({ force: true }); // Force close for "Abbrechen" button
  };

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
      name: name.trim(),
      beschreibung: beschreibung.trim() || null,
      ist_erledigt: istErledigt,
    };

    const isEditing = !!aufgabeInitialData?.id;
    const result = await serverAction(aufgabeInitialData?.id || null, payload);

    if (result.success) {
      toast({
        title: isEditing ? "Aufgabe aktualisiert" : "Aufgabe erstellt",
        description: `Die Aufgabe "${payload.name}" wurde erfolgreich ${isEditing ? "aktualisiert" : "erstellt"}.`,
        variant: "success",
      });
      
      setAufgabeModalDirty(false);
      if (aufgabeModalOnSuccess) {
        const returnedData = result.data || {};
        const finalTaskData = {
          id: aufgabeInitialData?.id || returnedData.id,
          ...payload,
          ...returnedData
        };
        aufgabeModalOnSuccess(finalTaskData);
      }
      closeAufgabeModal();
    } else {
      toast({
        title: "Fehler",
        description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
      setAufgabeModalDirty(true); // Keep dirty on error
    }
    setIsSubmitting(false);
  };

  if (!isAufgabeModalOpen) {
    return null;
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
            <DialogTitle>{aufgabeInitialData?.id ? "Aufgabe bearbeiten" : "Neue Aufgabe erstellen"}</DialogTitle>
            <DialogDescription>
              {aufgabeInitialData?.id ? "Aktualisieren Sie die Details dieser Aufgabe." : "Erstellen Sie eine neue Aufgabe mit Namen und optionaler Beschreibung."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange} // Use handler
                placeholder="Aufgabentitel eingeben"
                required
                disabled={isSubmitting}
              />
            </div>
            {aufgabeInitialData && ( // Use aufgabeInitialData from store
              <div className="grid gap-2">
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="ist_erledigt"
                    checked={istErledigt}
                    onCheckedChange={handleErledigtChange} // Use handler
                    disabled={isSubmitting}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="ist_erledigt" className="text-sm">
                    Erledigt
                  </Label>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
              <Textarea
                id="beschreibung"
                value={beschreibung}
                onChange={handleBeschreibungChange} // Use handler
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleCancelClick} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (aufgabeInitialData?.id ? "Wird aktualisiert..." : "Wird erstellt...") : (aufgabeInitialData?.id ? "Änderungen speichern" : "Aufgabe erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
