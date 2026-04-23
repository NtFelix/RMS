"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/hooks/use-modal-store";

interface AufgabePayload {
  name: string;
  beschreibung?: string | null;
  ist_erledigt?: boolean;
  faelligkeitsdatum?: string | null;
}

interface AufgabeEditModalProps {
  serverAction: (
    id: string | null,
    data: AufgabePayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
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

  const router = useRouter();
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [istErledigt, setIstErledigt] = useState(false);
  const [faelligkeitsdatum, setFaelligkeitsdatum] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (isAufgabeModalOpen && aufgabeInitialData) {
      setName(aufgabeInitialData.name || "");
      setBeschreibung(aufgabeInitialData.beschreibung || "");
      setIstErledigt(aufgabeInitialData.ist_erledigt || false);
      // Handle due date from initial data
      if (aufgabeInitialData.faelligkeitsdatum) {
        setFaelligkeitsdatum(new Date(aufgabeInitialData.faelligkeitsdatum));
      } else {
        setFaelligkeitsdatum(undefined);
      }
      setAufgabeModalDirty(false);
    } else if (isAufgabeModalOpen && !aufgabeInitialData) {
      setName("");
      setBeschreibung("");
      setIstErledigt(false);
      setFaelligkeitsdatum(undefined);
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

  const handleDateChange = (date: Date | undefined) => {
    setFaelligkeitsdatum(date);
    setAufgabeModalDirty(true);
    setIsDatePickerOpen(false);
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFaelligkeitsdatum(undefined);
    setAufgabeModalDirty(true);
  };

  const attemptClose = () => {
    closeAufgabeModal();
  };

  const handleCancelClick = () => {
    closeAufgabeModal({ force: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
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
      faelligkeitsdatum: faelligkeitsdatum
        ? format(faelligkeitsdatum, "yyyy-MM-dd")
        : null,
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
      setAufgabeModalDirty(true);
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
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="Aufgabentitel eingeben"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Due Date Field */}
            <div className="space-y-2">
              <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum (optional)</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="faelligkeitsdatum"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !faelligkeitsdatum && "text-muted-foreground"
                    )}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {faelligkeitsdatum ? (
                      <span className="flex-1">
                        {format(faelligkeitsdatum, "dd. MMMM yyyy", { locale: de })}
                      </span>
                    ) : (
                      <span className="flex-1">Datum auswählen</span>
                    )}
                    {faelligkeitsdatum && (
                      <X
                        className="h-4 w-4 opacity-50 hover:opacity-100"
                        onClick={handleClearDate}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={faelligkeitsdatum}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Completed Checkbox (only for editing) */}
            {aufgabeInitialData && (
              <div className="grid gap-2">
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="ist_erledigt"
                    checked={istErledigt}
                    onCheckedChange={handleErledigtChange}
                    disabled={isSubmitting}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="ist_erledigt" className="text-sm">
                    Erledigt
                  </Label>
                </div>
              </div>
            )}

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
              <Textarea
                id="beschreibung"
                value={beschreibung}
                onChange={handleBeschreibungChange}
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
