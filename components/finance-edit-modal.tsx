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
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
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

const isFormDataDirtyFinance = (currentData: any, initialDataState: any): boolean => {
  // Normalize boolean 'ist_einnahmen' for comparison if it's stored differently or comes as string from form
  const currentIstEinnahmen = typeof currentData.ist_einnahmen === 'boolean' ? currentData.ist_einnahmen : String(currentData.ist_einnahmen).toLowerCase() === 'true';
  const initialIstEinnahmen = typeof initialDataState?.ist_einnahmen === 'boolean' ? initialDataState.ist_einnahmen : String(initialDataState?.ist_einnahmen).toLowerCase() === 'true';

  if (currentIstEinnahmen !== initialIstEinnahmen) return true;

  return Object.keys(currentData).some(key => {
    if (key === 'ist_einnahmen') return false; // Already checked

    const currentValue = currentData[key] === null || currentData[key] === undefined ? "" : String(currentData[key]);
    const initialValue = initialDataState?.[key] === null || initialDataState?.[key] === undefined ? "" : String(initialDataState?.[key]);

    // Special handling for betrag to compare numeric values if they are strings
    if (key === "betrag") {
      const currentBetrag = parseFloat(currentValue) || 0;
      const initialBetrag = parseFloat(initialValue) || 0;
      // Using a small epsilon for float comparison might be robust, but direct string comparison after toString() from number is usually fine for this UI purpose.
      // For now, direct string comparison is used as they are stored as strings in state.
      return currentValue !== initialValue;
    }

    return currentValue !== initialValue;
  });
};


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

  const [initialFormState, setInitialFormState] = useState<any>({});
  const [formData, setFormData] = useState(() => {
    const data = {
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      datum: initialData?.datum ? format(parseISO(initialData.datum), "yyyy-MM-dd") : "",
      betrag: initialData?.betrag?.toString() || "",
      ist_einnahmen: initialData?.ist_einnahmen || false, // Store as boolean
      notiz: initialData?.notiz || "",
    };
    // setInitialFormState(JSON.parse(JSON.stringify(data))); // Set in useEffect
    return data;
  });

  const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  const apartmentOptions: ComboboxOption[] = internalWohnungen.map(w => ({ value: w.id, label: w.name }));

  useEffect(() => {
    const newFormData = {
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      datum: initialData?.datum ? format(parseISO(initialData.datum), "yyyy-MM-dd") : "",
      betrag: initialData?.betrag?.toString() || "",
      ist_einnahmen: initialData?.ist_einnahmen || false,
      notiz: initialData?.notiz || "",
    };
    setFormData(newFormData);
    setInitialFormState(JSON.parse(JSON.stringify(newFormData)));

    if (!open) {
      setShowConfirmDiscardModal(false);
    }
  }, [initialData, open]);

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

  const checkDirtyStateFinance = useCallback(() => {
    return isFormDataDirtyFinance(formData, initialFormState);
  }, [formData, initialFormState]);

  const handleAttemptCloseFinance = useCallback((event?: Event) => {
    if (checkDirtyStateFinance()) {
      if (event) event.preventDefault();
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(false);
    }
  }, [checkDirtyStateFinance, onOpenChange]);

  const handleMainModalOpenChangeFinance = (isOpen: boolean) => {
    if (!isOpen && checkDirtyStateFinance()) {
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(isOpen);
    }
  };

  const handleConfirmDiscardFinance = () => {
    onOpenChange(false); // Triggers useEffect to reset form
    setShowConfirmDiscardModal(false);
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
        
        if (onSuccess) {
          const successData = result.data || { ...payload, id: initialData?.id || '' };
          onSuccess(successData);
        }
        
        onOpenChange(false); // Close the modal
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

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainModalOpenChangeFinance}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutsideOptional={(e) => {
          if (open && checkDirtyStateFinance()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (open) {
            onOpenChange(false);
          }
        }}
        onEscapeKeyDown={(e) => {
          if (checkDirtyStateFinance()) {
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
            <Button type="button" variant="outline" onClick={() => handleAttemptCloseFinance()} disabled={isSubmitting}>
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
        onConfirm={handleConfirmDiscardFinance}
        title="Änderungen verwerfen?"
        description="Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?"
        confirmButtonText="Verwerfen"
        cancelButtonText="Weiter bearbeiten"
        confirmButtonVariant="destructive"
      />
    </>
  );
}
