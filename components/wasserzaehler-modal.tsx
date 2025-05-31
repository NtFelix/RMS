"use client";

import { useEffect, useState } from "react";
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
  const [isFetchingInitialData, setIsFetchingInitialData] = useState<boolean>(false);
  const [internalMieterList, setInternalMieterList] = useState<Mieter[]>([]);
  const [internalExistingReadings, setInternalExistingReadings] = useState<Wasserzaehler[] | null>(null);

  // Effect to set isFetchingInitialData based on props, preparing for fetch
  useEffect(() => {
    if (isOpen && nebenkosten) {
      // When modal opens with Nebenkosten, signal to start fetching.
      // Actual fetch will happen in another effect that depends on isFetchingInitialData.
      setIsFetchingInitialData(true);
    } else if (!isOpen) {
      // Reset fetching state and data when modal closes
      setIsFetchingInitialData(false);
      setInternalMieterList([]);
      setInternalExistingReadings(null);
      // also reset formData when closing, if not handled by the formData population effect
      // setFormData([]);
    }
  }, [isOpen, nebenkosten]); // Runs when isOpen or nebenkosten changes

  // Effect for Data Fetching
  useEffect(() => {
    if (isOpen && nebenkosten?.id && isFetchingInitialData) {
      const fetchData = async () => {
        try {
          // Ensure nebenkosten.id is not undefined before calling
          // Changed to use server action
          const { mieterList: fetchedMieterList, existingReadings: fetchedExistingReadings } = await getWasserzaehlerModalDataAction(nebenkosten.id!);
          setInternalMieterList(fetchedMieterList);
          setInternalExistingReadings(fetchedExistingReadings);
        } catch (error) {
          console.error("Error fetching Wasserzaehler modal data:", error);
          // Optionally, set an error state here to display to the user
          setInternalMieterList([]); // Reset on error
          setInternalExistingReadings(null); // Reset on error
        } finally {
          setIsFetchingInitialData(false);
        }
      };
      fetchData();
    }
    // No explicit reset here if !isOpen, as the previous effect handles it.
    // This effect is purely for fetching when conditions are met.
  }, [isOpen, nebenkosten?.id, isFetchingInitialData]); // Removed setIsFetchingInitialData from deps as it's a setter

  // Effect for populating formData based on fetched data
  useEffect(() => {
    // Only populate formData if modal is open, not fetching, and data is available
    if (isOpen && !isFetchingInitialData && nebenkosten && internalMieterList) {
      const initialFormData = internalMieterList.map(mieter => {
        const existingReadingForMieter = internalExistingReadings?.find(
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
      setFormData(initialFormData);
    } else if (!isOpen) {
      setFormData([]); // Reset formData when modal is closed
      // setIsFetchingInitialData(false); // This is handled by the first effect now
    }
  }, [isOpen, nebenkosten, internalMieterList, internalExistingReadings, isFetchingInitialData]);

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
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            Wasserzählerstände für {nebenkosten.Haeuser?.name || "Unbekanntes Haus"} - {nebenkosten.jahr}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände und Verbräuche für jeden Mieter ein.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {isFetchingInitialData ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 border-b pb-4 mb-4">
                <div className="md:col-span-1 md:text-right">
                  <Skeleton className="h-5 w-3/4" /> {/* Skeleton for Tenant Name Label */}
                </div>
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Skeleton className="h-4 w-1/2 mb-2" /> {/* Skeleton for "Ablesedatum" Label */}
                    <Skeleton className="h-10 w-full" /> {/* Skeleton for DatePicker */}
                  </div>
                  <div>
                    <Skeleton className="h-4 w-1/2 mb-2" /> {/* Skeleton for "Zählerstand" Label */}
                    <Skeleton className="h-10 w-full" /> {/* Skeleton for Input */}
                  </div>
                  <div>
                    <Skeleton className="h-4 w-1/2 mb-2" /> {/* Skeleton for "Verbrauch" Label */}
                    <Skeleton className="h-10 w-full" /> {/* Skeleton for Input */}
                  </div>
                </div>
              </div>
            ))
          ) : (
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
              {!isFetchingInitialData && formData.length === 0 && internalMieterList && internalMieterList.length === 0 && (
                <p>Keine Mieter für diesen Zeitraum und dieses Haus gefunden.</p>
              )}
               {!isFetchingInitialData && formData.length === 0 && (!internalMieterList || internalMieterList.length > 0) && (
                 <p>Geben Sie die Zählerstände für die Mieter ein oder passen Sie die Filter an.</p> // Fallback if formData is empty but mieters exist or list is null
               )}
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Abbrechen
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
