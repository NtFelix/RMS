"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
// Removed fetchWasserzaehlerModalData, kept types
import { Nebenkosten, Mieter, WasserzaehlerFormEntry, WasserzaehlerFormData, Wasserzaehler } from "@/lib/data-fetching";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { getWasserzaehlerModalDataAction } from "@/app/(dashboard)/haeuser/actions"; // Added server action import

interface WasserzaehlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkosten: Nebenkosten | null;
  mieterList: Mieter[];
  onSave: (data: WasserzaehlerFormData) => Promise<void>; // onSave will be the server action call
  existingReadings?: Wasserzaehler[] | null;
}

export function WasserzaehlerModal({
  isOpen,
  onClose,
  nebenkosten,
  mieterList,
  onSave,
  existingReadings,
}: WasserzaehlerModalProps) {
  const [formData, setFormData] = useState<WasserzaehlerFormEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // For dirty checking
  const [initialFormDataForDirtyCheck, setInitialFormDataForDirtyCheck] = useState<WasserzaehlerFormEntry[]>([]);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  // Effect for populating formData and initial state for dirty check
  useEffect(() => {
    if (isOpen && nebenkosten && mieterList) {
      const initialEntries = mieterList.map(mieter => {
        const existingReadingForMieter = existingReadings?.find(
          reading => reading.mieter_id === mieter.id
        );
        return {
          mieter_id: mieter.id,
          mieter_name: mieter.name,
          ablese_datum: existingReadingForMieter?.ablese_datum || null,
          zaehlerstand: existingReadingForMieter?.zaehlerstand != null ? String(existingReadingForMieter.zaehlerstand) : "",
          verbrauch: existingReadingForMieter?.verbrauch != null ? String(existingReadingForMieter.verbrauch) : "",
        };
      });
      setFormData(initialEntries);
      setInitialFormDataForDirtyCheck(JSON.parse(JSON.stringify(initialEntries)));
    } else if (!isOpen) {
      setFormData([]);
      setInitialFormDataForDirtyCheck([]);
      setShowConfirmDiscardModal(false);
    }
  }, [isOpen, nebenkosten, mieterList, existingReadings]);

  const isFormDataDirty = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormDataForDirtyCheck);
  }, [formData, initialFormDataForDirtyCheck]);

  const resetFormAndState = () => {
    const initialEntries = mieterList.map(mieter => {
        const existingReadingForMieter = existingReadings?.find(
          reading => reading.mieter_id === mieter.id
        );
        return {
          mieter_id: mieter.id,
          mieter_name: mieter.name,
          ablese_datum: existingReadingForMieter?.ablese_datum || null,
          zaehlerstand: existingReadingForMieter?.zaehlerstand != null ? String(existingReadingForMieter.zaehlerstand) : "",
          verbrauch: existingReadingForMieter?.verbrauch != null ? String(existingReadingForMieter.verbrauch) : "",
        };
      });
    setFormData(initialEntries);
    setInitialFormDataForDirtyCheck(JSON.parse(JSON.stringify(initialEntries)));
  }

  const handleInputChange = (index: number, field: keyof WasserzaehlerFormEntry, value: any) => {
    const updatedFormData = [...formData];
    // Type assertion for safety, ensure value matches field type
    (updatedFormData[index] as any)[field] = value;
    setFormData(updatedFormData);
  };

  const handleAbleseDatumChange = (index: number, date: Date | undefined) => {
    const updatedFormData = [...formData];
    updatedFormData[index].ablese_datum = date ? format(date, "yyyy-MM-dd") : null;
    setFormData(updatedFormData);
  };

  const handleSubmit = async () => {
    if (!nebenkosten) return;
    setIsLoading(true);
    const dataToSave: WasserzaehlerFormData = {
      nebenkosten_id: nebenkosten.id,
      entries: formData.map(entry => ({
        ...entry,
        // Convert string inputs to numbers, ensuring they are valid
        zaehlerstand: parseFloat(entry.zaehlerstand as string) || 0,
        verbrauch: parseFloat(entry.verbrauch as string) || 0,
      })),
    };
    try {
      await onSave(dataToSave);
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Wasserzählerstände wurden erfolgreich aktualisiert.",
        variant: "success",
      });
      onClose();
    } catch (error) {
      console.error("Error saving Wasserzaehler data:", error);
      // Potentially show an error message to the user within the modal
    } finally {
      setIsLoading(false);
    }
  };

  if (!nebenkosten) {
    return null;
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
      // resetFormAndState(); // Reset if closed without saving (e.g. X or ESC on clean form)
      onClose();
    }
    // If openStatus is true, Dialog handles it.
  };

  const handleConfirmDiscard = () => {
    // resetFormAndState(); // Reset form to initial state from props
    onClose();
    setShowConfirmDiscardModal(false);
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleMainModalOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]"
        onInteractOutsideOptional={(e) => {
          if (isOpen && isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (isOpen) {
            onClose(); // Or handleMainModalOpenChange(false) if reset is desired
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else {
            onClose(); // Or handleMainModalOpenChange(false)
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Wasserzählerstände für {nebenkosten.Haeuser?.name || "Unbekanntes Haus"} - {nebenkosten.jahr}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände und Verbräuche für jeden Mieter ein.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <>
              {formData.map((entry, index) => (
                <div key={entry.mieter_id} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 border-b pb-4 mb-4">
                  <Label htmlFor={`mieter_name-${index}`} className="md:col-span-1 md:text-right">
                    {entry.mieter_name}
                  </Label>
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`ablese_datum-${index}`} className="text-sm font-medium">Ablesedatum</Label>
                      <DatePicker
                        value={entry.ablese_datum} // Pass the string 'YYYY-MM-DD' or null
                        onChange={(date) => handleAbleseDatumChange(index, date)}
                        placeholder="TT.MM.JJJJ"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`zaehlerstand-${index}`} className="text-sm font-medium">Zählerstand</Label>
                      <Input
                        id={`zaehlerstand-${index}`}
                        type="number"
                        value={entry.zaehlerstand}
                        onChange={(e) => handleInputChange(index, "zaehlerstand", e.target.value)}
                        placeholder="z.B. 123.45"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`verbrauch-${index}`} className="text-sm font-medium">Verbrauch</Label>
                      <Input
                        id={`verbrauch-${index}`}
                        type="number"
                        value={entry.verbrauch}
                        onChange={(e) => handleInputChange(index, "verbrauch", e.target.value)}
                        placeholder="z.B. 10.5"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {formData.length === 0 && mieterList && mieterList.length === 0 && (
                <p>Keine Mieter für diesen Zeitraum und dieses Haus gefunden.</p>
              )}
              {formData.length === 0 && (!mieterList || mieterList.length > 0) && (
                 <p>Geben Sie die Zählerstände für die Mieter ein oder passen Sie die Filter an.</p>
               )}
            </>
        </div>

        <DialogFooter>
          {/* DialogClose removed as its default behavior is to call onOpenChange(false) which is now handleMainModalOpenChange */}
          <Button type="button" variant="outline" onClick={() => handleAttemptClose()} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
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
