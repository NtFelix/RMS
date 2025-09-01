"use client";

import { useEffect, useState } from "react";
import { isoToGermanDate } from "@/utils/date-calculations";
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
import { getBatchPreviousWasserzaehlerRecordsAction } from "@/app/betriebskosten-actions";
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
  
  // Type assertion for wasserzaehlerOnSave since we know it will be provided by the modal store
  const handleSave = wasserzaehlerOnSave as (data: WasserzaehlerFormData) => Promise<{ success: boolean; message?: string }>;

  const [formData, setFormData] = useState<ModalWasserzaehlerEntry[]>([]);
  const [initialFormData, setInitialFormData] = useState<ModalWasserzaehlerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generalDate, setGeneralDate] = useState<Date | undefined>(new Date());
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

          // Get the current date range from the nebenkosten data
          const currentStartdatum = wasserzaehlerNebenkosten?.startdatum;
          const currentYear = currentStartdatum ? new Date(currentStartdatum).getFullYear() : new Date().getFullYear();
          
          // Batch fetch all previous readings at once to avoid performance issues
          const mieterIds = wasserzaehlerMieterList.map(mieter => mieter.id);
          const batchPreviousReadingsResponse = await getBatchPreviousWasserzaehlerRecordsAction(mieterIds, currentYear.toString());
          const previousReadingsMap = batchPreviousReadingsResponse.success 
            ? (batchPreviousReadingsResponse.data || {}) 
            : {};

          // Process each mieter's data with individual error handling
          const results = await Promise.allSettled(
            wasserzaehlerMieterList.map(async (mieter) => {
              try {
                const existingReadingForMieter = wasserzaehlerExistingReadings?.find(
                  reading => reading.mieter_id === mieter.id
                );

                // Get previous reading from the batch result
                const previous_reading = previousReadingsMap[mieter.id] || null;

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

  // Handle DatePicker changes per row and format to yyyy-MM-dd (server expects this)
  const handleDateChangeRow = (index: number, date: Date | undefined) => {
    const newFormData = [...formData];
    const entry = newFormData[index];
    entry.ablese_datum = date ? format(date, "yyyy-MM-dd") : "";
    setFormData(newFormData);
  };

  // Apply the general date to all entries
  const applyGeneralDateToAll = () => {
    if (!generalDate) return;
    
    const newFormData = [...formData];
    const formattedDate = format(generalDate, "yyyy-MM-dd");
    
    newFormData.forEach(entry => {
      entry.ablese_datum = formattedDate;
    });
    setFormData(newFormData);
    
    toast({
      title: "Datum übernommen",
      description: `Das Datum wurde für alle ${newFormData.length} Mieter übernommen.`,
    });
  };

  const handleSubmit = async () => {
    if (!wasserzaehlerNebenkosten || !wasserzaehlerOnSave) {
      toast({
        title: "Fehler",
        description: "Ungültige Konfiguration. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    // Validate form data before attempting to save
    const entriesToSave = formData
      .filter(e => {
        // Date is optional now; only require a valid zaehlerstand number
        const zaehlerstand = parseFloat(e.zaehlerstand);
        if (isNaN(zaehlerstand)) {
          console.warn('Skipping entry with invalid zaehlerstand:', e);
          return false;
        }
        return true;
      })
      .map(entry => ({
        mieter_id: entry.mieter_id,
        mieter_name: entry.mieter_name,
        // Date can be empty; server will default to today if missing
        ablese_datum: entry.ablese_datum,
        zaehlerstand: parseFloat(entry.zaehlerstand) || 0,
        // Verbrauch may be auto-calculated; default to 0 if not provided/invalid
        verbrauch: parseFloat(entry.verbrauch) || 0,
      }));

    if (entriesToSave.length === 0) {
      setIsLoading(false);
      toast({
        title: "Keine gültigen Daten",
        description: "Bitte überprüfen Sie Ihre Eingaben. Es wurden keine gültigen Datensätze zum Speichern gefunden.",
        variant: "destructive",
      });
      return;
    }

    const dataToSave: WasserzaehlerFormData = {
      nebenkosten_id: wasserzaehlerNebenkosten.id,
      entries: entriesToSave,
    };

    try {
      console.log('Saving Wasserzaehler data:', dataToSave);
      
      // Call the save function and handle the response
      const result = await handleSave(dataToSave);

      if (result.success) {
        // If we get here, the save was successful
        toast({
          title: "Erfolgreich gespeichert",
          description: `Die Wasserzählerstände für ${entriesToSave.length} Mieter wurden erfolgreich aktualisiert.`,
          variant: "success"
        });
        
        // Close the modal after a short delay to show the success message
        setTimeout(() => {
          closeWasserzaehlerModal({ force: true });
        }, 1000);
      } else {
        throw new Error(result.message || 'Die Wasserzählerstände konnten nicht gespeichert werden.');
      }
    } catch (error) {
      console.error("Error saving Wasserzaehler data:", error);
      let errorMessage = "Die Wasserzählerstände konnten nicht gespeichert werden.";
      
      // Handle different types of errors
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        title: "Fehler beim Speichern",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds to allow reading longer messages
      });
      
      // Log more details to the console for debugging
      console.group('Error details:');
      console.error('Error object:', error);
      console.error('Data being saved:', dataToSave);
      console.groupEnd();
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
            Wasserzählerstände für {wasserzaehlerNebenkosten.Haeuser?.name || "Unbekanntes Haus"} - {isoToGermanDate(wasserzaehlerNebenkosten.startdatum)} bis {isoToGermanDate(wasserzaehlerNebenkosten.enddatum)}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände für jeden Mieter ein. Der Verbrauch wird automatisch berechnet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 py-4">
          {/* General Date Picker */}
          {formData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 mb-6 p-4 bg-muted/50 border rounded-lg">
              <div className="w-full">
                <Label htmlFor="general-date-picker" className="block mb-1">
                  Gemeinsames Ablesedatum für alle Mieter:
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <DatePicker
                      id="general-date-picker"
                      value={generalDate}
                      onChange={(date) => setGeneralDate(date || new Date())}
                      placeholder="Datum für alle Mieter auswählen"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={applyGeneralDateToAll} 
                    variant="outline" 
                    className="whitespace-nowrap"
                  >
                    Auf alle Mieter anwenden
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                    Vorherige Ablesung: {entry.previous_reading.ablese_datum ? isoToGermanDate(entry.previous_reading.ablese_datum) : 'Datum unbekannt'} - Stand: {entry.previous_reading.zaehlerstand}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine vorherige Ablesung gefunden.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`ablesedatum-${entry.mieter_id}`}>Ablesedatum</Label>
                    <DatePicker
                      id={`ablesedatum-${entry.mieter_id}`}
                      value={entry.ablese_datum}
                      onChange={(date) => handleDateChangeRow(index, date)}
                      placeholder="Datum auswählen (optional)"
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
