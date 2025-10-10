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
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Nebenkosten, Mieter, WasserzaehlerFormEntry, WasserzaehlerFormData, Wasserzaehler } from "@/lib/data-fetching";
import { WasserzaehlerModalData } from "@/types/optimized-betriebskosten";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { AlertTriangle, Building2, CalendarDays, Droplet, Gauge, Users } from "lucide-react";

// Local interface to handle additional client-side properties
interface ModalWasserzaehlerEntry extends Omit<WasserzaehlerFormEntry, 'ablese_datum' | 'zaehlerstand' | 'verbrauch'> {
  ablese_datum: string;
  zaehlerstand: string;
  verbrauch: string;
  wohnung_name: string;
  wohnung_groesse: number;
  previous_reading: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
  warning?: string;
}

type ApartmentGroup = {
  wohnungGroesse: number;
  entries: { entry: ModalWasserzaehlerEntry; originalIndex: number }[];
};

export function WasserzaehlerModal() {
  const {
    isWasserzaehlerModalOpen,
    wasserzaehlerNebenkosten,
    wasserzaehlerMieterList,
    wasserzaehlerExistingReadings,
    wasserzaehlerOptimizedData,
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

  const groupedEntries = formData.reduce<Map<string, ApartmentGroup>>((acc, entry, index) => {
    const key = entry.wohnung_name || "Unbekannte Wohnung";

    if (!acc.has(key)) {
      acc.set(key, {
        wohnungGroesse: entry.wohnung_groesse,
        entries: [],
      });
    }

    acc.get(key)!.entries.push({ entry, originalIndex: index });

    return acc;
  }, new Map());

  const groupedEntriesArray = Array.from(groupedEntries.entries());

  useEffect(() => {
    if (isWasserzaehlerModalOpen && wasserzaehlerNebenkosten) {
      setIsLoading(true);
      
      try {
        let newFormData: ModalWasserzaehlerEntry[] = [];

        // Use optimized data if available (new approach)
        if (wasserzaehlerOptimizedData && wasserzaehlerOptimizedData.length > 0) {
          newFormData = wasserzaehlerOptimizedData.map((modalData: WasserzaehlerModalData) => ({
            mieter_id: modalData.mieter_id,
            mieter_name: modalData.mieter_name,
            wohnung_name: modalData.wohnung_name,
            wohnung_groesse: modalData.wohnung_groesse,
            ablese_datum: modalData.current_reading?.ablese_datum || '',
            zaehlerstand: modalData.current_reading?.zaehlerstand?.toString() || '',
            verbrauch: modalData.current_reading?.verbrauch?.toString() || '',
            previous_reading: modalData.previous_reading,
            warning: '',
          }));
        } 
        // Fallback to legacy data processing (for backward compatibility)
        else if (wasserzaehlerMieterList && wasserzaehlerMieterList.length > 0) {
          newFormData = wasserzaehlerMieterList.map((mieter) => {
            const existingReadingForMieter = wasserzaehlerExistingReadings?.find(
              reading => reading.mieter_id === mieter.id
            );

            return {
              mieter_id: mieter.id,
              mieter_name: mieter.name,
              wohnung_name: mieter.Wohnungen?.name || 'Unbekannte Wohnung',
              wohnung_groesse: mieter.Wohnungen?.groesse || 0,
              ablese_datum: existingReadingForMieter?.ablese_datum || '',
              zaehlerstand: existingReadingForMieter?.zaehlerstand?.toString() || '',
              verbrauch: existingReadingForMieter?.verbrauch?.toString() || '',
              previous_reading: null, // Legacy mode doesn't have previous readings pre-loaded
              warning: '',
            };
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
    } else if (!isWasserzaehlerModalOpen) {
      setFormData([]);
      setInitialFormData([]);
    }
  }, [isWasserzaehlerModalOpen, wasserzaehlerNebenkosten, wasserzaehlerOptimizedData, wasserzaehlerMieterList, wasserzaehlerExistingReadings, setWasserzaehlerModalDirty, toast]);

  useEffect(() => {
    if (isLoading) return;
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setWasserzaehlerModalDirty(hasChanged);
  }, [formData, initialFormData, setWasserzaehlerModalDirty, isLoading]);

  const handleInputChange = (index: number, field: keyof Omit<ModalWasserzaehlerEntry, 'mieter_id' | 'mieter_name' | 'wohnung_name' | 'wohnung_groesse' | 'previous_reading'>, value: string) => {
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
        className="sm:max-w-[800px] md:max-w-[1000px] lg:max-w-[1200px]"
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
            <div className="mb-6 p-6 bg-muted/40 border rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold">Gemeinsames Ablesedatum</p>
                    <p className="text-sm text-muted-foreground">
                      Übernehmen Sie ein Datum für alle Einträge, um Mehrfacheingaben zu vermeiden.
                    </p>
                  </div>
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
                      Datum für alle übernehmen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Lade Daten...</p>
            </div>
          ) : groupedEntriesArray.length > 0 ? (
            groupedEntriesArray.map(([wohnungName, group]) => (
              <div key={wohnungName} className="border rounded-2xl bg-background shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{wohnungName}</p>
                      <p className="text-sm text-muted-foreground">
                        Wohnfläche: {group.wohnungGroesse} m²
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4" />
                    {group.entries.length} {group.entries.length === 1 ? "Mieter" : "Mieter"}
                  </Badge>
                </div>

                <div className="space-y-4 px-6 py-4">
                  {group.entries.map(({ entry, originalIndex }) => (
                    <div key={`${wohnungName}-${entry.mieter_id}`} className="rounded-xl border bg-muted/30 p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-base font-semibold">
                            <Droplet className="h-4 w-4 text-primary" />
                            {entry.mieter_name}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.previous_reading ? (
                              <>
                                Vorjahresstand: {entry.previous_reading.ablese_datum ? isoToGermanDate(entry.previous_reading.ablese_datum) : 'Datum unbekannt'} · {entry.previous_reading.zaehlerstand} m³
                              </>
                            ) : (
                              "Keine Vorjahres-Abrechnung vorhanden."
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor={`ablesedatum-${entry.mieter_id}`} className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            Ablesedatum
                          </Label>
                          <DatePicker
                            id={`ablesedatum-${entry.mieter_id}`}
                            value={entry.ablese_datum}
                            onChange={(date) => handleDateChangeRow(originalIndex, date)}
                            placeholder="Datum auswählen (optional)"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`zaehlerstand-${entry.mieter_id}`} className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            Neuer Zählerstand
                          </Label>
                          <Input
                            id={`zaehlerstand-${entry.mieter_id}`}
                            type="number"
                            value={entry.zaehlerstand}
                            onChange={(e) => handleInputChange(originalIndex, 'zaehlerstand', e.target.value)}
                            placeholder="z.B. 123.45"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`verbrauch-${entry.mieter_id}`} className="flex items-center gap-2">
                            <Droplet className="h-4 w-4 text-muted-foreground" />
                            Verbrauch
                          </Label>
                          <Input
                            id={`verbrauch-${entry.mieter_id}`}
                            type="number"
                            value={entry.verbrauch}
                            onChange={(e) => handleInputChange(originalIndex, 'verbrauch', e.target.value)}
                            placeholder="wird berechnet"
                            disabled={isLoading}
                            className={entry.warning ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </div>
                      </div>

                      {entry.warning && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          {entry.warning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
