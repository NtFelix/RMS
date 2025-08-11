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
import { Nebenkosten, Mieter, WasserzaehlerFormEntry, WasserzaehlerFormData, Wasserzaehler } from "@/lib/data-fetching";
import { getPreviousWasserzaehlerRecordAction } from "@/app/betriebskosten-actions";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";

// Local interface to handle additional client-side properties
interface ModalWasserzaehlerEntry extends Omit<WasserzaehlerFormEntry, 'ablese_datum' | 'zaehlerstand' | 'verbrauch'> {
  ablese_datum: string;
  zaehlerstand: string;
  verbrauch: string;
  previous_reading: Wasserzaehler | null;
  warning?: string;
}

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

  const [formData, setFormData] = useState<ModalWasserzaehlerEntry[]>([]);
  const [initialFormData, setInitialFormData] = useState<ModalWasserzaehlerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Threshold for high consumption warning (50% more than previous year)
  const HIGH_CONSUMPTION_INCREASE_THRESHOLD = 1.5; // 50% increase

  useEffect(() => {
    if (isWasserzaehlerModalOpen && wasserzaehlerNebenkosten && wasserzaehlerMieterList) {
      setIsLoading(true);
      const processMieterList = async () => {
        try {
          // Define types for our custom Promise.allSettled results
          type MieterDataResult = {
            mieter_id: string;
            mieter_name: string;
            ablese_datum: string;
            zaehlerstand: string;
            verbrauch: string;
            previous_reading: Wasserzaehler | null;
            warning: string;
          };

          type MieterError = {
            mieter_id: string;
            mieter_name: string;
            error: Error;
          };

          // Process each mieter's data with individual error handling
          const results = await Promise.allSettled(
            wasserzaehlerMieterList.map(async (mieter) => {
              try {
                const existingReadingForMieter = wasserzaehlerExistingReadings?.find(
                  reading => reading.mieter_id === mieter.id
                );

                const previousReadingResponse = await getPreviousWasserzaehlerRecordAction(mieter.id);
                const previous_reading = previousReadingResponse.success 
                  ? (previousReadingResponse.data || null) 
                  : null;

                return {
                  mieter_id: mieter.id,
                  mieter_name: mieter.name,
                  ablese_datum: existingReadingForMieter?.ablese_datum || '',
                  zaehlerstand: existingReadingForMieter?.zaehlerstand?.toString() || '',
                  verbrauch: existingReadingForMieter?.verbrauch?.toString() || '',
                  previous_reading,
                  warning: '',
                } as MieterDataResult;
              } catch (error) {
                console.error(`Error fetching data for mieter ${mieter.id}:`, error);
                throw {
                  mieter_id: mieter.id,
                  mieter_name: mieter.name,
                  error: error instanceof Error ? error : new Error(String(error))
                } as MieterError;
              }
            })
          );

          // Process results and show warnings for any failures
          const newFormData: ModalWasserzaehlerEntry[] = [];
          const errorMessages: string[] = [];

          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              newFormData.push(result.value);
            } else {
              const errorInfo = result.reason as MieterError;
              const errorMessage = `Fehler beim Laden der Daten für Mieter ${errorInfo.mieter_name}`;
              errorMessages.push(errorMessage);
              
              // Add the mieter with an error message
              newFormData.push({
                mieter_id: errorInfo.mieter_id,
                mieter_name: errorInfo.mieter_name,
                ablese_datum: '',
                zaehlerstand: '',
                verbrauch: '',
                previous_reading: null,
                warning: 'Fehler beim Laden der Vorjahresdaten',
              });
            }
          });

          // Show error toast if there were any failures
          if (errorMessages.length > 0) {
            toast({
              title: "Hinweis",
              description: `Es gab Probleme beim Laden einiger Vorjahresdaten. ${errorMessages.length} von ${results.length} Mietern betroffen.`,
              variant: "default",
            });
          }

          setFormData(newFormData);
          setInitialFormData(JSON.parse(JSON.stringify(newFormData)));
          setWasserzaehlerModalDirty(false);
        } catch (error) {
          console.error("Error preparing Wasserzaehler modal data:", error);
          toast({
            title: "Fehler",
            description: "Die Daten für das Wasserzähler-Modal konnten nicht geladen werden.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      processMieterList();
    } else if (!isWasserzaehlerModalOpen) {
      setFormData([]);
      setInitialFormData([]);
    }
  }, [isWasserzaehlerModalOpen, wasserzaehlerNebenkosten, wasserzaehlerMieterList, wasserzaehlerExistingReadings, setWasserzaehlerModalDirty, toast]);

  useEffect(() => {
    if (isLoading) return;
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setWasserzaehlerModalDirty(hasChanged);
  }, [formData, initialFormData, setWasserzaehlerModalDirty, isLoading]);

  const handleInputChange = (index: number, field: keyof Omit<ModalWasserzaehlerEntry, 'mieter_id' | 'mieter_name' | 'previous_reading'>, value: string) => {
    const newFormData = [...formData];
    const entry = newFormData[index];
    (entry as any)[field] = value;

    if (field === 'zaehlerstand') {
      const currentReading = parseFloat(value);
      const previousReadingValue = entry.previous_reading?.zaehlerstand;

      if (!isNaN(currentReading) && previousReadingValue !== null && previousReadingValue !== undefined) {
        const consumption = currentReading - previousReadingValue;
        entry.verbrauch = consumption.toString();
        if (consumption < 0) {
          entry.warning = "Verbrauch ist negativ.";
        } else if (entry.previous_reading?.verbrauch !== undefined && entry.previous_reading.verbrauch > 0) {
          const previousConsumption = entry.previous_reading.verbrauch;
          if (consumption > previousConsumption * HIGH_CONSUMPTION_INCREASE_THRESHOLD) {
            entry.warning = `Achtung: Verbrauch (${consumption}) ist mehr als ${Math.round((HIGH_CONSUMPTION_INCREASE_THRESHOLD - 1) * 100)}% höher als im Vorjahr (${previousConsumption}).`;
          } else {
            entry.warning = '';
          }
        } else if (consumption > 1000) {
          // Fallback check if no previous consumption data is available
          entry.warning = "Verbrauch ist ungewöhnlich hoch.";
        } else {
          entry.warning = '';
        }
      } else {
        entry.verbrauch = '';
        entry.warning = '';
      }
    }
    setFormData(newFormData);
  };

  const handleSubmit = async () => {
    if (!wasserzaehlerNebenkosten || !wasserzaehlerOnSave) return;
    setIsLoading(true);

    const entriesToSave = formData
      .filter(e => e.ablese_datum && e.zaehlerstand)
      .map(entry => ({
        mieter_id: entry.mieter_id,
        mieter_name: entry.mieter_name,
        ablese_datum: entry.ablese_datum,
        zaehlerstand: parseFloat(entry.zaehlerstand) || 0,
        verbrauch: parseFloat(entry.verbrauch) || 0,
      }));

    const dataToSave: WasserzaehlerFormData = {
      nebenkosten_id: wasserzaehlerNebenkosten.id,
      entries: entriesToSave,
    };

    try {
      await wasserzaehlerOnSave(dataToSave);
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Wasserzählerstände wurden erfolgreich aktualisiert.",
      });
      closeWasserzaehlerModal({ force: true });
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
        className="sm:max-w-[600px] md:max-w-[800px]"
        isDirty={isWasserzaehlerModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>
            Wasserzählerstände für {wasserzaehlerNebenkosten.Haeuser?.name || "Unbekanntes Haus"} - {wasserzaehlerNebenkosten.jahr}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände für jeden Mieter ein. Der Verbrauch wird automatisch berechnet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Lade Daten...</p>
            </div>
          ) : formData.length > 0 ? (
            formData.map((entry, index) => (
              <div key={entry.mieter_id} className="p-4 bg-muted/50 border rounded-lg space-y-3">
                <p className="font-semibold text-lg">{entry.mieter_name}</p>

                {entry.previous_reading ? (
                  <p className="text-sm text-muted-foreground">
                    Vorherige Ablesung: {entry.previous_reading.ablese_datum ? new Date(entry.previous_reading.ablese_datum).toLocaleDateString() : 'Datum unbekannt'} - Stand: {entry.previous_reading.zaehlerstand}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine vorherige Ablesung gefunden.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`ablesedatum-${entry.mieter_id}`}>Ablesedatum</Label>
                    <Input
                      id={`ablesedatum-${entry.mieter_id}`}
                      type="date"
                      value={entry.ablese_datum}
                      onChange={(e) => handleInputChange(index, 'ablese_datum', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`zaehlerstand-${entry.mieter_id}`}>Neuer Zählerstand</Label>
                    <Input
                      id={`zaehlerstand-${entry.mieter_id}`}
                      type="number"
                      value={entry.zaehlerstand}
                      onChange={(e) => handleInputChange(index, 'zaehlerstand', e.target.value)}
                      placeholder="z.B. 123.45"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`verbrauch-${entry.mieter_id}`}>Verbrauch</Label>
                    <Input
                      id={`verbrauch-${entry.mieter_id}`}
                      type="number"
                      value={entry.verbrauch}
                      onChange={(e) => handleInputChange(index, 'verbrauch', e.target.value)}
                      placeholder="wird berechnet"
                      disabled={isLoading}
                      className={entry.warning ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                  </div>
                </div>
                {entry.warning && <p className="text-sm text-red-500 mt-1">{entry.warning}</p>}
              </div>
            ))
          ) : (
            <div className="flex justify-center items-center h-40">
              <p>Keine Mieter für diesen Zeitraum und dieses Haus gefunden.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => closeWasserzaehlerModal({ force: true })}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || !isWasserzaehlerModalDirty}>
            {isLoading ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
