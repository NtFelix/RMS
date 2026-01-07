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
import { NumberInput } from "@/components/ui/number-input";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { FinanceFileUpload } from "@/components/finance/finance-file-upload";

import { useModalStore } from "@/hooks/use-modal-store";

// Interfaces (can be moved to a types file if not already covered by store types)
interface Finanz {
  id: string;
  wohnung_id?: string | null;
  name: string;
  datum?: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string | null;
  dokument_id?: string | null;
  Wohnungen?: {
    name: string;
  };
}

interface Wohnung { // This should align with `financeModalWohnungen` items type from store
  id: string;
  name: string;
}

interface FinanceEditModalProps {
  // Props like open, onOpenChange, initialData, initialWohnungen, onSuccess are now from useModalStore
  serverAction: (id: string | null, payload: Omit<Finanz, "id" | "Wohnungen">) => Promise<{ success: boolean; error?: any; data?: any }>;
  // loading prop can be added if server action is slow
}

export function FinanceEditModal(props: FinanceEditModalProps) {
  const { serverAction } = props; // Keep serverAction as a prop for now

  const {
    isFinanceModalOpen,
    closeFinanceModal,
    financeInitialData,
    financeModalWohnungen, // Use this from store
    financeModalOnSuccess,
    isFinanceModalDirty,
    setFinanceModalDirty,
    openConfirmationModal,
  } = useModalStore();

  const router = useRouter(); // Keep router if needed for other operations
  const [formData, setFormData] = useState({
    wohnung_id: financeInitialData?.wohnung_id || "",
    name: financeInitialData?.name || "",
    datum: financeInitialData?.datum || "",
    betrag: financeInitialData?.betrag?.toString() || "",
    ist_einnahmen: financeInitialData?.ist_einnahmen || false,
    notiz: financeInitialData?.notiz || "",
    dokument_id: financeInitialData?.dokument_id || null,
  });

  // internalWohnungen is now financeModalWohnungen from the store
  // const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false); // Keep this if fetching logic remains
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track if document was changed for existing entries (auto-saved, needs refresh on close)
  const [documentWasChanged, setDocumentWasChanged] = useState(false);

  const apartmentOptions: ComboboxOption[] = (financeModalWohnungen || []).map(w => ({ value: w.id, label: w.name }));

  useEffect(() => {
    if (isFinanceModalOpen) {
      setFormData({
        wohnung_id: financeInitialData?.wohnung_id || "",
        name: financeInitialData?.name || "",
        datum: financeInitialData?.datum ? format(parseISO(financeInitialData.datum), "yyyy-MM-dd") : "",
        betrag: financeInitialData?.betrag?.toString() || "",
        ist_einnahmen: financeInitialData?.ist_einnahmen || false,
        notiz: financeInitialData?.notiz || "",
        dokument_id: financeInitialData?.dokument_id || null,
      });
      setFinanceModalDirty(false); // Reset dirty state when modal opens or data changes
      setDocumentWasChanged(false); // Reset document change tracking
    }
  }, [financeInitialData, isFinanceModalOpen, setFinanceModalDirty]);

  // Fetching Wohnungen might need to be triggered via openFinanceModal or handled by parent
  // For now, let's assume financeModalWohnungen is populated by the time the modal opens.
  // If not, the original useEffect for fetching Wohnungen can be adapted.
  // useEffect(() => {
  //   if (isFinanceModalOpen && (!financeModalWohnungen || financeModalWohnungen.length === 0)) {
  //     // ... fetch logic ... update store or handle locally if store doesn't own this data fetch
  //   }
  // }, [isFinanceModalOpen, financeModalWohnungen]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFinanceModalDirty(true);
  };

  const handleDateChange = (date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData({ ...formData, datum: formattedDate });
    setFinanceModalDirty(true);
  };

  const handleComboboxChange = (value: string | null) => {
    setFormData({ ...formData, wohnung_id: value || "" });
    setFinanceModalDirty(true);
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, ist_einnahmen: value === "Einnahmen" });
    setFinanceModalDirty(true);
  };

  const handleClose = (force = false) => {
    // If document was changed for existing entry, trigger refresh before closing
    if (documentWasChanged && financeInitialData?.id && financeModalOnSuccess) {
      financeModalOnSuccess({ ...financeInitialData, dokument_id: formData.dokument_id });
    }
    if (force) {
      closeFinanceModal({ force: true });
    } else {
      closeFinanceModal();
    }
  };

  const attemptClose = () => {
    handleClose(); // Store handles confirmation logic for outside clicks/X button
  };

  const handleCancelClick = () => {
    handleClose(true); // Force close for "Abbrechen" button
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
      dokument_id: formData.dokument_id || null,
    };

    try {
      const result = await serverAction(financeInitialData?.id || null, payload);

      if (result.success) {
        toast({
          title: financeInitialData ? "Finanzeintrag aktualisiert" : "Finanzeintrag erstellt",
          description: `Der Finanzeintrag "${payload.name}" wurde erfolgreich ${financeInitialData ? "aktualisiert" : "erstellt"}.`,
          variant: "success",
        });

        setFinanceModalDirty(false); // Reset dirty state on success
        if (financeModalOnSuccess) {
          const successData = result.data || { ...payload, id: financeInitialData?.id || result.data?.id || '' };
          financeModalOnSuccess(successData);
        }

        closeFinanceModal(); // Will close directly as dirty is false
      } else {
        throw new Error(result.error?.message || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
      // Do not reset dirty flag here, error occurred, changes are still pending
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFinanceModalOpen) {
    return null;
  }

  return (
    <Dialog open={isFinanceModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="sm:max-w-[500px] md:max-w-[550px]"
        isDirty={isFinanceModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>{financeInitialData ? "Transaktion bearbeiten" : "Transaktion hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie die erforderlichen Felder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-3 pt-3 pb-2 sm:gap-4 sm:pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <LabelWithTooltip htmlFor="name" infoText="Kurze, allgemeine Bezeichnung (z.B. 'Handwerker', 'Hausverwaltung'). Detaillierte Informationen können im Notizfeld ergänzt werden. Erleichtert die spätere Suche und Kategorisierung.">
                Bezeichnung
              </LabelWithTooltip>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="betrag" infoText="Betrag der Transaktion in Euro.">
                Betrag (€)
              </LabelWithTooltip>
              <NumberInput id="betrag" name="betrag" step="0.01" value={formData.betrag} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="datum" infoText="Buchungs- oder Zahlungsdatum. Wird für Monats- und Jahresauswertungen, Cashflow-Berechnungen und die korrekte Zuordnung von Transaktionen verwendet.">
                Datum
              </LabelWithTooltip>
              <DatePicker
                id="datum"
                value={formData.datum}
                onChange={handleDateChange}
                placeholder="TT.MM.JJJJ"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="wohnung_id" infoText="Optionale Zuordnung zu einer Wohnung. Erleichtert die Auswertung pro Objekt.">
                Wohnung
              </LabelWithTooltip>
              <CustomCombobox
                id="wohnung_id"
                width="w-full"
                options={apartmentOptions}
                value={formData.wohnung_id}
                onChange={handleComboboxChange}
                placeholder={isLoadingWohnungen ? "Lädt..." : "Wohnung auswählen"}
                searchPlaceholder="Wohnung suchen..."
                emptyText="Keine Wohnung gefunden."
                disabled={isLoadingWohnungen || isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="ist_einnahmen" infoText="Einnahmen oder Ausgaben auswählen. Beeinflusst Auswertungen.">
                Typ
              </LabelWithTooltip>
              <Select
                name="ist_einnahmen"
                value={formData.ist_einnahmen ? "Einnahmen" : "Ausgaben"}
                onValueChange={handleSelectChange}
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
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <LabelWithTooltip
                htmlFor="notiz"
                infoText="Optionale interne Notiz. Hier können zusätzliche Details wie Rechnungsnummern, spezifische Leistungen oder weitere Informationen eingetragen werden. Der Inhalt ist durchsuchbar und erleichtert das spätere Auffinden spezifischer Transaktionen."
              >
                Notiz
              </LabelWithTooltip>
              <Input id="notiz" name="notiz" value={formData.notiz || ""} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="col-span-2 space-y-2">
              <LabelWithTooltip
                htmlFor="dokument"
                infoText="Optionaler Dateianhang wie Rechnung, Beleg oder Vertrag. Die Datei wird automatisch im Ordner Rechnungen nach Haus und Wohnung organisiert."
              >
                Dokument
              </LabelWithTooltip>
              <FinanceFileUpload
                dokumentId={formData.dokument_id}
                wohnungId={formData.wohnung_id || null}
                financeId={financeInitialData?.id || null}
                onDocumentChange={(dokumentId) => {
                  setFormData({ ...formData, dokument_id: dokumentId });
                  // Only mark as dirty for new entries (no financeInitialData.id)
                  // For existing entries, the document link is auto-saved by the upload API
                  if (!financeInitialData?.id) {
                    setFinanceModalDirty(true);
                  } else {
                    // Track that document was changed for existing entry (for refresh on close)
                    setDocumentWasChanged(true);
                  }
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingWohnungen}>
              {isSubmitting ? "Wird gespeichert..." : (financeInitialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
