"use client";

import { useEffect, useState } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Nebenkosten, Mieter, WasserzaehlerFormEntry, WasserzaehlerFormData, Wasserzaehler } from "@/lib/data-fetching";
import { toast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";

export function WasserzaehlerModal() {
  const {
    isWasserzaehlerModalOpen,
    wasserzaehlerNebenkosten,
    wasserzaehlerMieterList,
    wasserzaehlerExistingReadings,
    wasserzaehlerOnSave,
    isWasserzaehlerModalDirty,
    closeWasserzaehlerModal,
    setWasserzaehlerModalDirty,
  } = useModalStore();

  const [formData, setFormData] = useState<WasserzaehlerFormEntry[]>([]);
  const [initialFormData, setInitialFormData] = useState<WasserzaehlerFormEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Effect for populating formData based on fetched data
  useEffect(() => {
    if (isWasserzaehlerModalOpen && wasserzaehlerNebenkosten && wasserzaehlerMieterList) {
      const newFormData = wasserzaehlerMieterList.map(mieter => {
        const existingReadingForMieter = wasserzaehlerExistingReadings?.find(
          reading => reading.mieter_id === mieter.id
        );

        if (existingReadingForMieter) {
          return {
            mieter_id: mieter.id,
            mieter_name: mieter.name,
            ablese_datum: existingReadingForMieter.ablese_datum || null,
            zaehlerstand: existingReadingForMieter.zaehlerstand !== null && existingReadingForMieter.zaehlerstand !== undefined
                          ? String(existingReadingForMieter.zaehlerstand)
                          : "",
            verbrauch: existingReadingForMieter.verbrauch !== null && existingReadingForMieter.verbrauch !== undefined
                       ? String(existingReadingForMieter.verbrauch)
                       : "",
          };
        } else {
          return {
            mieter_id: mieter.id,
            mieter_name: mieter.name,
            ablese_datum: null,
            zaehlerstand: "",
            verbrauch: "",
          };
        }
      });
      setFormData(newFormData);
      setInitialFormData(JSON.parse(JSON.stringify(newFormData))); // Deep copy for comparison
      setWasserzaehlerModalDirty(false); // Reset dirty state when opening
    } else if (!isWasserzaehlerModalOpen) {
      setFormData([]);
      setInitialFormData([]);
    }
  }, [isWasserzaehlerModalOpen, wasserzaehlerNebenkosten, wasserzaehlerMieterList, wasserzaehlerExistingReadings, setWasserzaehlerModalDirty]);

  // Check if form data has changed
  useEffect(() => {
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setWasserzaehlerModalDirty(hasChanged);
  }, [formData, initialFormData, setWasserzaehlerModalDirty]);

  const handleInputChange = (index: number, field: keyof WasserzaehlerFormEntry, value: any) => {
    setFormData(formData.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const handleAbleseDatumChange = (index: number, date: Date | undefined) => {
    setFormData(formData.map((entry, i) =>
      i === index ? { ...entry, ablese_datum: date ? format(date, "yyyy-MM-dd") : null } : entry
    ));
  };

  const handleSubmit = async () => {
    if (!wasserzaehlerNebenkosten || !wasserzaehlerOnSave) return;
    setIsLoading(true);
    const dataToSave: WasserzaehlerFormData = {
      nebenkosten_id: wasserzaehlerNebenkosten.id,
      entries: formData.map(entry => ({
        ...entry,
        zaehlerstand: parseFloat(entry.zaehlerstand as string) || 0,
        verbrauch: parseFloat(entry.verbrauch as string) || 0,
      })),
    };
    try {
      await wasserzaehlerOnSave(dataToSave);
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Wasserzählerstände wurden erfolgreich aktualisiert.",
        variant: "success",
      });
      closeWasserzaehlerModal({ force: true }); // Force close after successful save
    } catch (error) {
      console.error("Error saving Wasserzaehler data:", error);
      toast({
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Die Wasserzählerstände konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const attemptClose = () => {
    closeWasserzaehlerModal();
  };

  if (!wasserzaehlerNebenkosten) {
    return null;
  }

  return (
    <Dialog open={isWasserzaehlerModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent 
        className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]"
        isDirty={isWasserzaehlerModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>
            Wasserzählerstände für {wasserzaehlerNebenkosten.Haeuser?.name || "Unbekanntes Haus"} - {wasserzaehlerNebenkosten.jahr}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände und Verbräuche für jeden Mieter ein.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {formData.map((entry, index) => (
            <div key={entry.mieter_id} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 border-b pb-4 mb-4">
              <Label htmlFor={`mieter_name-${index}`} className="md:col-span-1 md:text-right">
                {entry.mieter_name}
              </Label>
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`ablese_datum-${index}`} className="text-sm font-medium">Ablesedatum</Label>
                  <DatePicker
                    value={entry.ablese_datum}
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
          {formData.length === 0 && wasserzaehlerMieterList && wasserzaehlerMieterList.length === 0 && (
            <p>Keine Mieter für diesen Zeitraum und dieses Haus gefunden.</p>
          )}
          {formData.length === 0 && (!wasserzaehlerMieterList || wasserzaehlerMieterList.length > 0) && (
            <p>Geben Sie die Zählerstände für die Mieter ein oder passen Sie die Filter an.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => closeWasserzaehlerModal({ force: true })} // Force close without confirmation
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
