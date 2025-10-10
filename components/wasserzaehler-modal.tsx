"use client";

import { useEffect, useState, useMemo } from "react";
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
import { WasserzaehlerModalData } from "@/types/optimized-betriebskosten";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { 
  Droplet, 
  Building2, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  User,
  Gauge,
  Activity
} from "lucide-react";

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

  // Group entries by apartment
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: ModalWasserzaehlerEntry[] } = {};
    
    formData.forEach(entry => {
      const key = entry.wohnung_name;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [formData]);

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
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="general-date-picker" className="text-sm font-medium">
                  Gemeinsames Ablesedatum für alle Mieter
                </Label>
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
                  Auf alle Mieter anwenden
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-40 gap-3">
              <Droplet className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Lade Wasserzählerdaten...</p>
            </div>
          ) : formData.length > 0 ? (
            groupedEntries.map(([wohnungName, entries]) => (
              <div key={wohnungName} className="space-y-3">
                {/* Apartment Group Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border rounded-lg">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{wohnungName}</h3>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {entries.length} {entries.length === 1 ? 'Mieter' : 'Mieter'}
                  </span>
                </div>

                {/* Tenants in this apartment */}
                {entries.map((entry) => {
                  const index = formData.findIndex(e => e.mieter_id === entry.mieter_id);
                  const consumptionChange = entry.previous_reading?.verbrauch 
                    ? ((parseFloat(entry.verbrauch) || 0) - entry.previous_reading.verbrauch) / entry.previous_reading.verbrauch * 100
                    : null;
                  
                  return (
                    <div key={entry.mieter_id} className="ml-4 p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="font-semibold">{entry.mieter_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.wohnung_groesse} m²
                            </p>
                          </div>
                        </div>
                        {consumptionChange !== null && !isNaN(consumptionChange) && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                            consumptionChange > 20 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                              : consumptionChange < -10
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {consumptionChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {consumptionChange > 0 ? '+' : ''}{consumptionChange.toFixed(1)}%
                          </div>
                        )}
                      </div>

                      {entry.previous_reading ? (
                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                          <Activity className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Vorjahr:</span>{' '}
                            {entry.previous_reading.ablese_datum ? isoToGermanDate(entry.previous_reading.ablese_datum) : 'Datum unbekannt'} • 
                            Stand: {entry.previous_reading.zaehlerstand} m³ • 
                            Verbrauch: {entry.previous_reading.verbrauch} m³
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>Keine Vorjahres-Abrechnung vorhanden</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`ablesedatum-${entry.mieter_id}`}>
                            Ablesedatum
                          </Label>
                          <DatePicker
                            id={`ablesedatum-${entry.mieter_id}`}
                            value={entry.ablese_datum}
                            onChange={(date) => handleDateChangeRow(index, date)}
                            placeholder="Datum auswählen"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`zaehlerstand-${entry.mieter_id}`}>
                            Neuer Zählerstand (m³)
                          </Label>
                          <Input
                            id={`zaehlerstand-${entry.mieter_id}`}
                            type="number"
                            step="0.01"
                            value={entry.zaehlerstand}
                            onChange={(e) => handleInputChange(index, 'zaehlerstand', e.target.value)}
                            placeholder="z.B. 123.45"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`verbrauch-${entry.mieter_id}`}>
                            Verbrauch (m³)
                          </Label>
                          <Input
                            id={`verbrauch-${entry.mieter_id}`}
                            type="number"
                            step="0.01"
                            value={entry.verbrauch}
                            onChange={(e) => handleInputChange(index, 'verbrauch', e.target.value)}
                            placeholder="wird berechnet"
                            disabled={isLoading}
                            className={entry.warning ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </div>
                      </div>
                      
                      {entry.warning && (
                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p className="font-medium">{entry.warning}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="flex flex-col justify-center items-center h-40 gap-3">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Keine Mieter für diesen Zeitraum und dieses Haus gefunden.</p>
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
