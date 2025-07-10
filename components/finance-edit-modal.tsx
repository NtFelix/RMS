"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast"; // Changed import path
import { format, parseISO } from "date-fns";
import { createClient } from "@/utils/supabase/client"; // For fetching Wohnungen

// Interfaces (can be moved to a types file)
interface Finanz {
  id: string;
  wohnung_id?: string | null;
  name: string;
  datum?: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string | null;
}

interface Wohnung {
  id: string;
  name: string;
}

interface FinanceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Finanz;
  initialWohnungen?: Wohnung[];
  serverAction: (id: string | null, payload: Omit<Finanz, "id" | "Wohnungen">) => Promise<{ success: boolean; error?: any; data?: any }>;
  onSuccess?: (data: any) => void;
  // loading prop can be added if server action is slow
}

export function FinanceEditModal(props: FinanceEditModalProps) {
  const {
    open,
    onOpenChange,
    initialData,
    initialWohnungen = [],
    serverAction,
    onSuccess
  } = props;
  const router = useRouter();
  // Form state
  const [formData, setFormData] = useState({
    wohnung_id: "", name: "", datum: "", betrag: "", ist_einnahmen: false, notiz: ""
  });

  // For dirty checking
  const [initialFormStateForDirtyCheck, setInitialFormStateForDirtyCheck] = useState<any>({});
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apartmentOptions: ComboboxOption[] = internalWohnungen.map(w => ({ value: w.id, label: w.name }));

  // Initialize form state and dirty check states
  useEffect(() => {
    const currentFormData = {
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      datum: initialData?.datum ? format(parseISO(initialData.datum), "yyyy-MM-dd") : "",
      betrag: initialData?.betrag?.toString() || "",
      ist_einnahmen: initialData?.ist_einnahmen || false,
      notiz: initialData?.notiz || "",
    };
    setFormData(currentFormData);
    setInitialFormStateForDirtyCheck(JSON.parse(JSON.stringify(currentFormData)));

    if (!open) { // Reset confirmation modal when main modal closes
      setShowConfirmDiscardModal(false);
    }
  }, [initialData, open]);

  const isFormDataDirty = useCallback(() => {
    if (formData.name !== initialFormStateForDirtyCheck.name) return true;
    if (formData.betrag !== initialFormStateForDirtyCheck.betrag) return true;
    if (formData.datum !== initialFormStateForDirtyCheck.datum) return true;
    if (formData.wohnung_id !== initialFormStateForDirtyCheck.wohnung_id) return true;
    if (formData.ist_einnahmen !== initialFormStateForDirtyCheck.ist_einnahmen) return true;
    if (formData.notiz !== initialFormStateForDirtyCheck.notiz) return true;
    return false;
  }, [formData, initialFormStateForDirtyCheck]);

  useEffect(() => {
    if (open && (!initialWohnungen || initialWohnungen.length === 0)) {
      const fetchWohnungen = async () => {
        setIsLoadingWohnungen(true);
        const supabase = createClient();
        const { data, error } = await supabase.from("Wohnungen").select("id, name");
        if (error) {
          console.error("Error fetching wohnungen for finance modal:", error);
          toast({ title: "Fehler", description: "Wohnungen konnten nicht geladen werden.", variant: "destructive" });
        } else {
          setInternalWohnungen(data || []);
        }
        setIsLoadingWohnungen(false);
      };
      fetchWohnungen();
    } else if (initialWohnungen && initialWohnungen.length > 0) {
      setInternalWohnungen(initialWohnungen);
    }
  }, [open, initialWohnungen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData({ ...formData, datum: formattedDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.betrag) {
      toast({ title: "Fehler", description: "Name und Betrag sind erforderlich.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const payload = {
      name: formData.name,
      betrag: parseFloat(formData.betrag),
      ist_einnahmen: formData.ist_einnahmen,
      wohnung_id: formData.wohnung_id || null,
      datum: formData.datum || null,
      notiz: formData.notiz || null,
    };

    try {
      const result = await serverAction(initialData?.id || null, payload);

      if (result.success) {
        toast({
          title: initialData ? "Finanzeintrag aktualisiert" : "Finanzeintrag erstellt",
          description: `Der Finanzeintrag "${payload.name}" wurde erfolgreich ${initialData ? "aktualisiert" : "erstellt"}.`,
          variant: "success",
        });
        
        // Call the onSuccess callback with the result data
        if (onSuccess) {
          const successData = result.data || { ...payload, id: initialData?.id || '' };
          onSuccess(successData);
        }
        
        // Close the modal
        onOpenChange(false);
      } else {
        throw new Error(result.error?.message || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
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
      onOpenChange(false);
    }
  }, [isFormDataDirty, onOpenChange]);

  const handleMainModalOpenChange = (isOpen: boolean) => {
    if (!isOpen && isFormDataDirty()) {
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(isOpen);
    }
  };

  const handleConfirmDiscard = () => {
    onOpenChange(false); // This will trigger useEffect to reset form
    setShowConfirmDiscardModal(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainModalOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutsideOptional={(e) => {
          if (open && isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (open) {
            onOpenChange(false);
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else {
            onOpenChange(false);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{initialData ? "Transaktion bearbeiten" : "Transaktion hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie die erforderlichen Felder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Bezeichnung</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="betrag">Betrag (€)</Label>
              <Input id="betrag" name="betrag" type="number" step="0.01" value={formData.betrag} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="datum">Datum</Label>
              <DatePicker
                value={formData.datum} // DatePicker expects string in yyyy-MM-dd or Date object
                onChange={handleDateChange}
                placeholder="TT.MM.JJJJ"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="wohnung_id">Wohnung</Label>
              <CustomCombobox
                width="w-full"
                options={apartmentOptions}
                value={formData.wohnung_id}
                onChange={(value) => setFormData({ ...formData, wohnung_id: value || "" })}
                placeholder={isLoadingWohnungen ? "Lädt..." : "Wohnung auswählen"}
                searchPlaceholder="Wohnung suchen..."
                emptyText="Keine Wohnung gefunden."
                disabled={isLoadingWohnungen || isSubmitting}
                // The ID "wohnung_id" is for the Label's htmlFor.
              />
            </div>
            <div>
              <Label htmlFor="ist_einnahmen">Typ</Label>
              <Select
                name="ist_einnahmen"
                value={formData.ist_einnahmen ? "Einnahmen" : "Ausgaben"}
                onValueChange={(v) => setFormData({ ...formData, ist_einnahmen: v === "Einnahmen" })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ist_einnahmen">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Einnahmen">Einnahmen</SelectItem>
                  <SelectItem value="Ausgaben">Ausgaben</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="notiz">Notiz</Label>
              <Input id="notiz" name="notiz" value={formData.notiz || ""} onChange={handleChange} disabled={isSubmitting} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleAttemptClose()} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingWohnungen}>
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
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
  );
}
