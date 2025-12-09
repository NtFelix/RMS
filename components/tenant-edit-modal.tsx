"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Trash2, GripVertical } from "lucide-react";
import { createClient } from "@/utils/supabase/client" // Added
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker" // Added DatePicker import
import { Textarea } from "@/components/ui/textarea" // New import

import { Tenant, NebenkostenEntry } from "@/types/Tenant"; // Import Tenant and NebenkostenEntry
import { useModalStore } from "@/hooks/use-modal-store"; // Import the modal store
import { cn } from "@/lib/utils"; // Import cn utility
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

interface Mieter extends Tenant { }

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State and ref for textarea resize functionality
  const [isResizing, setIsResizing] = useState(false);
  const dragInfoRef = useRef({ startY: 0, startHeight: 0 });

  const MIN_HEIGHT_PX = 80; // Corresponds to min-h-[80px]
  const MAX_HEIGHT_PX = 150; // Define a max height in pixels (approx. 6 lines of text)

  const initResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Store initial drag values in ref
    dragInfoRef.current = {
      startY: e.clientY,
      startHeight: textarea.offsetHeight,
    };
    setIsResizing(true);
  };

  // Effect to manage resize event listeners - ensures cleanup on unmount
  useEffect(() => {
    if (!isResizing) return;

    const textarea = textareaRef.current;
    if (!textarea) {
      setIsResizing(false);
      return;
    }

    const { startY, startHeight } = dragInfoRef.current;

    const doDrag = (e: MouseEvent) => {
      let newHeight = startHeight + e.clientY - startY;

      // Constrain newHeight to be within MIN_HEIGHT_PX and MAX_HEIGHT_PX
      newHeight = Math.max(MIN_HEIGHT_PX, newHeight);
      newHeight = Math.min(MAX_HEIGHT_PX, newHeight);

      textarea.style.height = `${newHeight}px`;
    };

    const stopDrag = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);

    // Cleanup function - removes listeners on unmount or when isResizing changes
    return () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, [isResizing]);
  const [nebenkostenEntries, setNebenkostenEntries] = useState<NebenkostenEntry[]>([]);

  // Helper function to generate unique IDs
  const generateId = () => crypto.randomUUID();
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
        // Add an empty utility cost entry by default for new tenants
        setNebenkostenEntries([{ id: generateId(), amount: "", date: "" }]);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const newId = generateId();
    setNebenkostenEntries(entries => getSortedNebenkostenEntries([...entries, { id: newId, amount: "", date: "" }]));
    setNebenkostenValidationErrors(prev => {
      const newErrors = { ...prev }; delete newErrors[newId]; return newErrors;
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
        setNebenkostenEntries(prevEntries => {
          // If there are no entries, create one with the move-in date
          if (prevEntries.length === 0) {
            return [{ id: generateId(), amount: "", date: formattedDate }];
          }

          // Update the first entry's date if it's empty or matches the previous move-in date
          const firstEntry = prevEntries[0];
          if (firstEntry && (!firstEntry.date || firstEntry.date === prevFormData.einzug)) {
            return getSortedNebenkostenEntries([
              { ...firstEntry, date: formattedDate },
              ...prevEntries.slice(1)
            ]);
          }

          return prevEntries;
        });
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
        id="tenant-form-container"
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
              useOnboardingStore.getState().completeStep('assign-tenant-form');
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
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
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
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="telefonnummer">Telefon</Label>
                <InfoTooltip infoText="Telefonnummer (hilft bei der Organisation und schnellen Kontaktaufnahme)." />
              </div>
              <Input id="telefonnummer" name="telefonnummer" value={formData.telefonnummer} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notiz">Notiz</Label>
                <InfoTooltip infoText="Hier können Sie zusätzliche Informationen oder Anmerkungen zum Mieter erfassen." />
              </div>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  id="notiz"
                  name="notiz"
                  value={formData.notiz}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="min-h-[80px] resize-none pr-8"
                />
                <div
                  className="absolute bottom-2 right-2 cursor-ns-resize p-1 rounded-md hover:bg-muted transition-colors"
                  onMouseDown={initResize}
                >
                  <GripVertical className="h-4 w-4 text-foreground/70" />
                </div>
              </div>
            </div>
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nebenkosten Vorauszahlungen
                </h3>
                <InfoTooltip infoText="Monatliche Vorauszahlungen für Nebenkosten. Bitte geben Sie den Betrag und das Zahlungsdatum ein. Einträge ohne Betrag werden ignoriert." />
              </div>
              <div className="bg-white dark:bg-card rounded-3xl border border-border/50 shadow-sm">
                <div className={cn('flex flex-col', nebenkostenEntries.length > 1 ? 'max-h-48 overflow-y-auto' : 'min-h-[96px]')}>
                  <div className="p-4 space-y-4">
                    {nebenkostenEntries.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        Keine Nebenkosten-Vorauszahlungen vorhanden
                      </div>
                    ) : nebenkostenEntries.map((entry) => (
                      <div key={entry.id} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
                        <div className="space-y-1">
                          <NumberInput
                            step="0.01"
                            placeholder="Betrag (€)"
                            value={entry.amount}
                            onChange={(e) => handleNebenkostenChange(entry.id, 'amount', e.target.value)}
                            className={`${nebenkostenValidationErrors[entry.id]?.amount ? 'border-red-500' : ''}`}
                            disabled={isSubmitting}
                          />
                          {nebenkostenValidationErrors[entry.id]?.amount && (
                            <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.amount}</p>
                          )}
                        </div>
                        <div className="space-y-1">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeNebenkostenEntry(entry.id)}
                          disabled={isSubmitting}
                          className="justify-self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border/40 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNebenkostenEntry}
                    disabled={isSubmitting}
                    className="w-full mt-1"
                  >
                    Eintrag hinzufügen
                  </Button>
                </div>
              </div>
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
