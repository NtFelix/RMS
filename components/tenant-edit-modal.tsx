"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"; // Added
import { createClient } from "@/utils/supabase/client" // Added
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker" // Added DatePicker import

import { Tenant, NebenkostenEntry } from "@/types/Tenant"; // Import Tenant and NebenkostenEntry
import { useModalStore } from "@/hooks/use-modal-store"; // Import the modal store

interface Mieter extends Tenant {}

interface Wohnung {
  id: string;
  name: string;
}

interface TenantEditModalProps {
  // open, onOpenChange, wohnungen, initialData are now from useModalStore
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
  // loading prop might be replaced by local isSubmitting state
}

export function TenantEditModal({ serverAction }: TenantEditModalProps) {
  const {
    isTenantModalOpen,
    closeTenantModal,
    tenantInitialData,
    tenantModalWohnungen, // Use this from store
    // tenantModalOnSuccess, // Not explicitly defined in store, router.refresh() and onClose handled it.
                            // If an onSuccess callback is needed, it should be added to the store.
    isTenantModalDirty,
    setTenantModalDirty,
    openConfirmationModal,
  } = useModalStore();

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nebenkostenEntries, setNebenkostenEntries] = useState<NebenkostenEntry[]>([]);
  const [nebenkostenValidationErrors, setNebenkostenValidationErrors] = useState<Record<string, { amount?: string; date?: string }>>({});

  const [formData, setFormData] = useState({
    wohnung_id: tenantInitialData?.wohnung_id || "",
    name: tenantInitialData?.name || "",
    einzug: tenantInitialData?.einzug || "",
    auszug: tenantInitialData?.auszug || "",
    email: tenantInitialData?.email || "",
    telefonnummer: tenantInitialData?.telefonnummer || "",
    notiz: tenantInitialData?.notiz || "",
  });

  const getSortedNebenkostenEntries = (entries: NebenkostenEntry[]): NebenkostenEntry[] => {
    const sorted = [...entries];
    sorted.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA === "" && dateB === "") return 0;
      if (dateA === "") return 1; // Entries without date go to the end
      if (dateB === "") return -1; // Entries without date go to the end
      return dateA.localeCompare(dateB);
    });
    return sorted;
  };

  useEffect(() => {
    if (isTenantModalOpen) {
      setFormData({
        wohnung_id: tenantInitialData?.wohnung_id || "",
        name: tenantInitialData?.name || "",
        einzug: tenantInitialData?.einzug || "",
        auszug: tenantInitialData?.auszug || "",
        email: tenantInitialData?.email || "",
        telefonnummer: tenantInitialData?.telefonnummer || "",
        notiz: tenantInitialData?.notiz || "",
      });

      if (tenantInitialData?.nebenkosten) {
        setNebenkostenEntries(getSortedNebenkostenEntries(tenantInitialData.nebenkosten));
      } else {
        setNebenkostenEntries([]);
      }
      setNebenkostenValidationErrors({});
      setTenantModalDirty(false); // Reset dirty state
    }
  }, [tenantInitialData, isTenantModalOpen, setTenantModalDirty]);

  // Wohnungen are now from tenantModalWohnungen
  // const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false); // Keep if fetching logic is complex and not in store

  const apartmentOptions: ComboboxOption[] = (tenantModalWohnungen || []).map(w => ({ value: w.id, label: w.name }));

  // Fetching Wohnungen: Assuming tenantModalWohnungen is populated by openTenantModal.
  // If not, this useEffect might need to be adapted or moved.
  // useEffect(() => {
  //   if (isTenantModalOpen && (!tenantModalWohnungen || tenantModalWohnungen.length === 0)) {
  //     // ... fetch logic ...
  //   }
  // }, [isTenantModalOpen, tenantModalWohnungen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setTenantModalDirty(true);
  };

  const handleComboboxChange = (value: string | null) => {
    setFormData({ ...formData, wohnung_id: value || "" });
    setTenantModalDirty(true);
  };

  const validateNebenkostenEntry = (entry: NebenkostenEntry): { amount?: string; date?: string } => {
    const errors: { amount?: string; date?: string } = {};
    const amountValue = entry.amount.trim() === "" ? NaN : parseFloat(entry.amount);
    if (entry.amount.trim() !== "") {
        if (isNaN(amountValue)) errors.amount = "Ungültiger Betrag.";
        else if (amountValue <= 0) errors.amount = "Betrag muss positiv sein.";
    }
    if (entry.amount.trim() !== "" && entry.date.trim() === "") {
      errors.date = "Datum ist erforderlich, wenn ein Betrag vorhanden ist.";
    }
    return errors;
  };

  const handleNebenkostenChange = (id: string, field: 'amount' | 'date', value: string) => {
    let updatedEntryGlobal: NebenkostenEntry | undefined;
    setNebenkostenEntries(entries => {
      const newEntries = entries.map(entry => {
        if (entry.id === id) {
          updatedEntryGlobal = { ...entry, [field]: value };
          return updatedEntryGlobal;
        }
        return entry;
      });
      if (updatedEntryGlobal) {
        const errors = validateNebenkostenEntry(updatedEntryGlobal);
        setNebenkostenValidationErrors(prev => {
          const newErrors = { ...prev };
          if (Object.keys(errors).length > 0) newErrors[id] = errors;
          else delete newErrors[id];
          return newErrors;
        });
      }
      return getSortedNebenkostenEntries(newEntries);
    });
    setTenantModalDirty(true);
  };

  const addNebenkostenEntry = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setNebenkostenEntries(entries => getSortedNebenkostenEntries([...entries, { id: newId, amount: "", date: "" }]));
    setNebenkostenValidationErrors(prev => {
        const newErrors = {...prev}; delete newErrors[newId]; return newErrors;
    });
    setTenantModalDirty(true);
  };

  const removeNebenkostenEntry = (id: string) => {
    setNebenkostenEntries(entries => entries.filter(entry => entry.id !== id));
    setNebenkostenValidationErrors(prev => {
      const newErrors = { ...prev }; delete newErrors[id]; return newErrors;
    });
    setTenantModalDirty(true);
  };

  const handleDateChange = (name: 'einzug' | 'auszug', date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData(prevFormData => {
      const newFormData = { ...prevFormData, [name]: formattedDate };
      
      // If this is the move-in date (einzug) and it's being set (not cleared)
      if (name === 'einzug' && formattedDate) {
        // If there are no nebenkosten entries, add one with the move-in date
        if (nebenkostenEntries.length === 0) {
          const newId = Math.random().toString(36).substr(2, 9);
          setNebenkostenEntries([{ id: newId, amount: "", date: formattedDate }]);
        } 
        // If there are entries but the first one doesn't have a date, update it
        else if (nebenkostenEntries[0] && !nebenkostenEntries[0].date) {
          const updatedEntries = [...nebenkostenEntries];
          updatedEntries[0] = { ...updatedEntries[0], date: formattedDate };
          setNebenkostenEntries(updatedEntries);
        }
      }
      
      return newFormData;
    });
    setTenantModalDirty(true);
  };

  const attemptClose = () => {
    closeTenantModal(); // Store handles confirmation for outside clicks/X button
  };

  const handleCancelClick = () => {
    closeTenantModal({ force: true }); // Force close for "Abbrechen" button
  };

  if (!isTenantModalOpen) return null;

  return (
    <Dialog open={isTenantModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="sm:max-w-[600px]"
        isDirty={isTenantModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>{tenantInitialData?.id ? "Mieter bearbeiten" : "Mieter hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async e => {
          e.preventDefault();
          setIsSubmitting(true);

          let currentNkErrors: Record<string, { amount?: string; date?: string }> = {};
          let hasValidationErrors = false;
          for (const entry of nebenkostenEntries) {
            if (entry.amount.trim() === "" && entry.date.trim() === "") {
                if (nebenkostenValidationErrors[entry.id]) {
                    setNebenkostenValidationErrors(prev => {
                        const newErrors = { ...prev }; delete newErrors[entry.id]; return newErrors;
                    });
                }
                continue;
            }
            const entryErrors = validateNebenkostenEntry(entry);
            if (Object.keys(entryErrors).length > 0) {
              currentNkErrors[entry.id] = entryErrors; hasValidationErrors = true;
            }
          }
          setNebenkostenValidationErrors(currentNkErrors);

          if (hasValidationErrors) {
            toast({ title: "Validierungsfehler", description: "Bitte überprüfen Sie die Nebenkosten Einträge.", variant: "destructive" });
            setIsSubmitting(false); return;
          }

          try {
            const currentFormData = new FormData(e.currentTarget as HTMLFormElement); // Cast to HTMLFormElement
            const finalNebenkostenEntries = nebenkostenEntries.filter(entry => entry.amount.trim() !== "");
            currentFormData.set('nebenkosten', JSON.stringify(finalNebenkostenEntries));
            if (formData.wohnung_id) currentFormData.set('wohnung_id', formData.wohnung_id);
            else currentFormData.set('wohnung_id', '');

            // Add id if editing
            if (tenantInitialData?.id) {
              currentFormData.set('id', tenantInitialData.id);
            }

            const tenantNameForToast = formData.name;
            const result = await serverAction(currentFormData);

            if (result.success) {
              toast({
                title: tenantInitialData?.id ? "Mieter aktualisiert" : "Mieter erstellt",
                description: `Die Daten des Mieters "${tenantNameForToast}" wurden erfolgreich ${tenantInitialData?.id ? "aktualisiert" : "erstellt"}.`,
                variant: "success",
              });
              setTenantModalDirty(false); // Reset dirty before closing
              // No explicit onSuccess in store for tenant, rely on router.refresh and close.
              closeTenantModal();
              router.refresh(); // Refresh data on page
            } else {
              toast({ title: "Fehler", description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.", variant: "destructive" });
              // Don't reset dirty flag, error occurred
            }
          } catch (error: any) {
            toast({ title: "Unerwarteter Fehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", variant: "destructive" });
             // Don't reset dirty flag, error occurred
          } finally {
            setIsSubmitting(false);
          }
        }} className="grid gap-4 pt-4 pb-2">
          {/* Removed hidden id input, it's added to FormData directly if editing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="wohnung_id">Wohnung</Label>
                <InfoTooltip infoText="Wählen Sie die Wohnung aus, die der Mieter bewohnt. Die Liste zeigt nur Wohnungen des ausgewählten Hauses an." />
              </div>
              <CustomCombobox
                width="w-full"
                options={apartmentOptions}
                value={formData.wohnung_id}
                onChange={handleComboboxChange}
                placeholder={isLoadingWohnungen ? "Lädt Wohnungen..." : "Wohnung auswählen"}
                searchPlaceholder="Wohnung suchen..."
                emptyText="Keine Wohnung gefunden."
                disabled={isLoadingWohnungen || isSubmitting}
                id="wohnung_id"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="name">Name</Label>
                <InfoTooltip infoText="Vollständiger Name des Mieters (z.B. 'Max Mustermann')." />
              </div>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="einzug">Einzug</Label>
                <InfoTooltip infoText="Einzugsdatum im Format TT.MM.JJJJ. Wird für Mietbeginn und Abrechnungen verwendet." />
              </div>
              <DatePicker 
                id="einzug"
                value={formData.einzug} 
                onChange={(date) => handleDateChange('einzug', date)} 
                placeholder="TT.MM.JJJJ" 
                disabled={isSubmitting}
              />
              <input type="hidden" name="einzug" value={formData.einzug} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="auszug">Auszug</Label>
                <InfoTooltip infoText="Auszugsdatum (optional). Leer lassen, wenn der Mietvertrag noch aktiv ist." />
              </div>
              <DatePicker 
                id="auszug"
                value={formData.auszug} 
                onChange={(date) => handleDateChange('auszug', date)} 
                placeholder="TT.MM.JJJJ" 
                disabled={isSubmitting}
              />
              <input type="hidden" name="auszug" value={formData.auszug} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <InfoTooltip infoText="Kontakt-E-Mail (empfohlen für bessere Organisation und schnelle Erreichbarkeit)." />
              </div>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="telefonnummer">Telefon</Label>
                <InfoTooltip infoText="Telefonnummer (hilft bei der Organisation und schnellen Kontaktaufnahme)." />
              </div>
              <Input id="telefonnummer" name="telefonnummer" value={formData.telefonnummer} onChange={handleChange} disabled={isSubmitting}/>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notiz">Notiz</Label>
                <InfoTooltip infoText="Hier können Sie zusätzliche Informationen oder Anmerkungen zum Mieter erfassen." />
              </div>
              <Input id="notiz" name="notiz" value={formData.notiz} onChange={handleChange} disabled={isSubmitting}/>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nebenkosten Vorauszahlungen
                </h3>
                <InfoTooltip infoText="Monatliche Vorauszahlungen für Nebenkosten. Bitte geben Sie den Betrag und das Zahlungsdatum ein. Einträge ohne Betrag werden ignoriert." />
              </div>
              {nebenkostenEntries.map((entry) => ( // Removed index from map as entry.id is unique
                <div key={entry.id} className="p-4 border rounded-xl space-y-2 transition-all duration-200 hover:shadow-md hover:border-ring/50">
                  <div className="flex items-center gap-2">
                    <div className="flex-grow space-y-1">
                      <Input
                        type="number" step="0.01" placeholder="Betrag (€)" value={entry.amount}
                        onChange={(e) => handleNebenkostenChange(entry.id, 'amount', e.target.value)}
                        className={`flex-grow ${nebenkostenValidationErrors[entry.id]?.amount ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {nebenkostenValidationErrors[entry.id]?.amount && (
                        <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.amount}</p>
                      )}
                    </div>
                    <div className="flex-grow space-y-1">
                      <DatePicker
                        value={entry.date}
                        onChange={(date) => handleNebenkostenChange(entry.id, 'date', date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="Datum (TT.MM.JJJJ)"
                        className={`${nebenkostenValidationErrors[entry.id]?.date ? '!border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {nebenkostenValidationErrors[entry.id]?.date && (
                        <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.date}</p>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeNebenkostenEntry(entry.id)} disabled={isSubmitting} className="self-start">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addNebenkostenEntry} disabled={isSubmitting}>
                Eintrag hinzufügen
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingWohnungen || Object.values(nebenkostenValidationErrors).some(err => err.amount || err.date)}
            >
              {isSubmitting ? "Wird gespeichert..." : (tenantInitialData?.id ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
