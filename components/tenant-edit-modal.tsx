"use client"

import { useState, useEffect, useCallback } from "react" // Added useCallback
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"; // Added
import { createClient } from "@/utils/supabase/client" // Added
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog" // Added DialogClose
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker" // Added DatePicker import

interface Mieter {
  id: string
  wohnung_id?: string
  name: string
  einzug?: string
  auszug?: string
  email?: string
  telefonnummer?: string
  notiz?: string
  // nebenkosten and nebenkosten_datum are now handled by nebenkostenEntries
}

interface NebenkostenEntry {
  id: string;
  amount: string;
  date: string;
}

interface Wohnung { // Added interface for type safety
  id: string;
  name: string;
}

interface TenantEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wohnungen?: Wohnung[] // Made optional
  initialData?: {
    id?: string
    // wohnung_id is part of formData if needed, but initialData structure might vary
    // Ensure all fields used by the form are part of initialData or handled
    wohnung_id?: string
    name: string
    einzug?: string
    auszug?: string
    email?: string
    telefonnummer?: string
    notiz?: string
    nebenkosten?: string // Will be string of comma-separated values
    nebenkosten_datum?: string // Will be string of comma-separated values
  }
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
  loading?: boolean // This might be replaced by local isSubmitting state
}

const emptyNebenkostenEntry = { id: "", amount: "", date: "" }; // Helper for empty entries

// Helper function to check if form data is dirty
const isFormDataDirty = (currentData: any, initialData: any, initialNebenkosten: NebenkostenEntry[], currentNebenkosten: NebenkostenEntry[]): boolean => {
  // Check main form fields
  const mainFieldsChanged = Object.keys(currentData).some(key => {
    const currentValue = currentData[key] === null ? "" : currentData[key]; // Treat null as empty string for comparison
    const initialValue = initialData?.[key] === null ? "" : initialData?.[key];
    return currentValue !== (initialValue || ""); // Compare with initial or empty string if initialData is undefined
  });
  if (mainFieldsChanged) return true;

  // Check Nebenkosten entries
  // Normalize and compare Nebenkosten entries
  const normalizeEntry = (entry: NebenkostenEntry) => ({
    amount: entry.amount.trim(),
    date: entry.date.trim(),
  });

  const initialNormalized = initialNebenkosten.map(normalizeEntry).filter(e => e.amount || e.date);
  const currentNormalized = currentNebenkosten.map(normalizeEntry).filter(e => e.amount || e.date);


  if (initialNormalized.length !== currentNormalized.length) return true;

  for (let i = 0; i < currentNormalized.length; i++) {
    if (currentNormalized[i].amount !== initialNormalized[i]?.amount || currentNormalized[i].date !== initialNormalized[i]?.date) {
      return true;
    }
  }

  return false;
};


export function TenantEditModal({ open, onOpenChange, wohnungen: initialWohnungen = [], initialData, serverAction }: TenantEditModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nebenkostenEntries, setNebenkostenEntries] = useState<NebenkostenEntry[]>([]);
  const [nebenkostenValidationErrors, setNebenkostenValidationErrors] = useState<Record<string, { amount?: string; date?: string }>>({});

  const [initialFormStateForDirtyCheck, setInitialFormStateForDirtyCheck] = useState<any>({});
  const [initialNebenkostenForDirtyCheck, setInitialNebenkostenForDirtyCheck] = useState<NebenkostenEntry[]>([]);

  const [formData, setFormData] = useState(() => {
    const data = {
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      einzug: initialData?.einzug || "",
      auszug: initialData?.auszug || "",
      email: initialData?.email || "",
      telefonnummer: initialData?.telefonnummer || "",
      notiz: initialData?.notiz || "",
    };
    setInitialFormStateForDirtyCheck(JSON.parse(JSON.stringify(data))); // Deep copy for initial state
    return data;
  });

  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  // Helper function to sort Nebenkosten entries
  const getSortedNebenkostenEntries = (entries: NebenkostenEntry[]): NebenkostenEntry[] => {
    const sorted = [...entries];
    sorted.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA === "" && dateB === "") return 0;
      if (dateA === "") return 1;
      if (dateB === "") return -1;
      return dateA.localeCompare(dateB);
    });
    return sorted;
  };

  useEffect(() => {
    const newFormData = {
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      einzug: initialData?.einzug || "",
      auszug: initialData?.auszug || "",
      email: initialData?.email || "",
      telefonnummer: initialData?.telefonnummer || "",
      notiz: initialData?.notiz || "",
    };
    setFormData(newFormData);
    setInitialFormStateForDirtyCheck(JSON.parse(JSON.stringify(newFormData))); // Deep copy

    let initialNkEntries: NebenkostenEntry[] = [];
    if (initialData) {
      const amounts = initialData.nebenkosten ? initialData.nebenkosten.split(',').map(s => s.trim()) : [];
      const dates = initialData.nebenkosten_datum ? initialData.nebenkosten_datum.split(',').map(s => s.trim()) : [];
      initialNkEntries = amounts.map((amount, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        amount: amount,
        date: dates[index] || ""
      }));
    }

    const sortedInitialNkEntries = getSortedNebenkostenEntries(initialNkEntries);
    setNebenkostenEntries(sortedInitialNkEntries);
    setInitialNebenkostenForDirtyCheck(JSON.parse(JSON.stringify(sortedInitialNkEntries.map(e => ({amount: e.amount, date: e.date}))))); // Store normalized for dirty check


    if (!open) { // Reset everything when modal closes
        setNebenkostenValidationErrors({});
        setShowConfirmDiscardModal(false); // Ensure confirmation is also closed
    }

  }, [initialData, open]); // Removed `open` from dependencies to avoid resetting form on every open if not intended. Re-added for resetting on close.

  const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false);

  const apartmentOptions: ComboboxOption[] = internalWohnungen.map(w => ({ value: w.id, label: w.name }));

  useEffect(() => {
    if (open && (!initialWohnungen || initialWohnungen.length === 0)) {
      const fetchWohnungen = async () => {
        setIsLoadingWohnungen(true);
        const supabase = createClient();
        const { data, error } = await supabase.from("Wohnungen").select("id, name");
        if (error) {
          console.error("Error fetching wohnungen:", error);
          // Optionally: show toast or error message
        } else {
          setInternalWohnungen(data || []);
        }
        setIsLoadingWohnungen(false);
      };
      fetchWohnungen();
    } else if (initialWohnungen && initialWohnungen.length > 0) {
      // If initialWohnungen are provided, use them
      setInternalWohnungen(initialWohnungen);
    }
  }, [open, initialWohnungen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateNebenkostenEntry = (entry: NebenkostenEntry): { amount?: string; date?: string } => {
    const errors: { amount?: string; date?: string } = {};
    const amountValue = entry.amount.trim() === "" ? NaN : parseFloat(entry.amount);

    if (entry.amount.trim() !== "") { // Only validate amount if it's not empty
        if (isNaN(amountValue)) {
            errors.amount = "Ungültiger Betrag.";
        } else if (amountValue <= 0) {
            errors.amount = "Betrag muss positiv sein.";
        }
    }

    if (entry.amount.trim() !== "" && entry.date.trim() === "") {
      errors.date = "Datum ist erforderlich, wenn ein Betrag vorhanden ist.";
    }
    // Optional: Validate date format if needed, though DatePicker should handle it.
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

      // Perform validation after state update is reflected
      if (updatedEntryGlobal) {
        const errors = validateNebenkostenEntry(updatedEntryGlobal);
        setNebenkostenValidationErrors(prev => {
          const newErrors = { ...prev };
          if (Object.keys(errors).length > 0) {
            newErrors[id] = errors;
          } else {
            delete newErrors[id]; // Clear errors for this entry if valid
          }
          return newErrors;
        });
      }
      // Sort entries after any change, especially if a date was modified.
      return getSortedNebenkostenEntries(newEntries);
    });
  };

  const addNebenkostenEntry = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setNebenkostenEntries(entries =>
      getSortedNebenkostenEntries([...entries, { id: newId, amount: "", date: "" }])
    );
    // Optionally, clear validation for this new entry if it was somehow set before
    setNebenkostenValidationErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[newId];
        return newErrors;
    });
  };

  const removeNebenkostenEntry = (id: string) => {
    setNebenkostenEntries(entries => entries.filter(entry => entry.id !== id));
    setNebenkostenValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  // Specific handler for DatePicker changes
  const handleDateChange = (name: 'einzug' | 'auszug', date: Date | undefined) => {
    // Format date to YYYY-MM-DD string for the form data, or empty string if undefined
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData({ ...formData, [name]: formattedDate });
  };

  const checkDirtyState = useCallback(() => {
    return isFormDataDirty(formData, initialFormStateForDirtyCheck, initialNebenkostenForDirtyCheck, nebenkostenEntries);
  }, [formData, initialFormStateForDirtyCheck, initialNebenkostenForDirtyCheck, nebenkostenEntries]);

  const handleAttemptClose = useCallback((event?: Event) => {
    if (checkDirtyState()) {
      if (event) event.preventDefault(); // Prevent Radix from closing dialog
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(false); // Close if not dirty
    }
  }, [checkDirtyState, onOpenChange]);

  // This is for the main Dialog's onOpenChange, specifically for X button and Escape key
  const handleMainModalOpenChange = (isOpen: boolean) => {
    if (!isOpen && checkDirtyState()) {
      // If trying to close (isOpen is false) and form is dirty
      setShowConfirmDiscardModal(true);
      // Do not call onOpenChange(false) here, let confirmation handle it
    } else {
      onOpenChange(isOpen); // Default behavior
    }
  };

  const handleConfirmDiscard = () => {
    onOpenChange(false); // This will trigger the useEffect to reset form state
    setShowConfirmDiscardModal(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainModalOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onInteractOutsideOptional={(e) => {
          // Radix calls onInteractOutside for any interaction.
          // We only care about it if the dialog is currently open.
          // And if the interaction would normally close it (i.e., it's an outside click).
          // The default behavior of Radix is to close on outside click.
          // So, if this handler is called, it means an outside click happened.
          // We then check if the form is dirty.
          if (open && checkDirtyState()) {
            e.preventDefault(); // Prevent default closing behavior
            setShowConfirmDiscardModal(true);
          } else if (open) {
            // If not dirty, but open, let it close via Radix's default
            // by not calling e.preventDefault() and letting onOpenChange handle it (or not, if no onOpenChange provided to DialogContent directly)
            // However, our main Dialog's onOpenChange will be called by Radix.
            // So, we can simply call onOpenChange(false) here if not dirty.
            onOpenChange(false);
          }
          // If !open, do nothing, the dialog is already closing or closed.
        }}
        onEscapeKeyDown={(e) => { // Radix specific prop for escape key
          if (checkDirtyState()) {
            e.preventDefault(); // Prevent default closing behavior
            setShowConfirmDiscardModal(true);
          } else {
            onOpenChange(false); // Close if not dirty
          }
        }}
        >
        <DialogHeader>
          <DialogTitle>{initialData ? "Mieter bearbeiten" : "Mieter hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async e => {
          e.preventDefault();
          setIsSubmitting(true); // Set submitting state early

          // Pre-submission validation
          let currentNkErrors: Record<string, { amount?: string; date?: string }> = {};
          let hasValidationErrors = false;
          for (const entry of nebenkostenEntries) {
            // Skip validation for rows where amount is empty, unless a date is present
            if (entry.amount.trim() === "" && entry.date.trim() === "") {
                // If an error was previously set for this fully empty row, clear it.
                if (nebenkostenValidationErrors[entry.id]) {
                    setNebenkostenValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[entry.id];
                        return newErrors;
                    });
                }
                continue;
            }

            const entryErrors = validateNebenkostenEntry(entry);
            if (Object.keys(entryErrors).length > 0) {
              currentNkErrors[entry.id] = entryErrors;
              hasValidationErrors = true;
            }
          }
          setNebenkostenValidationErrors(currentNkErrors);

          if (hasValidationErrors) {
            toast({
              title: "Validierungsfehler",
              description: "Bitte überprüfen Sie die Nebenkosten Einträge.",
              variant: "destructive",
            });
            setIsSubmitting(false); // Reset submitting state
            return;
          }

          // If validation passes, proceed with submission logic
          try {
            const currentFormData = new FormData(e.currentTarget);

            // Process nebenkostenEntries (filter out entries that are entirely empty or just have a date but no amount)
            // This filter is slightly different from validation; validation catches errors, this prepares data for submission
            const finalNebenkostenEntries = nebenkostenEntries.filter(entry => {
                const hasAmount = entry.amount.trim() !== "";
                // We submit if there's an amount (date presence is validated by `validateNebenkostenEntry`)
                // Or if it's an entirely empty entry (which will be filtered by the join if amounts/dates are empty)
                return hasAmount;
            });

            const nkAmounts = finalNebenkostenEntries.map(entry => entry.amount.trim());
            const nkDates = finalNebenkostenEntries.map(entry => entry.date.trim());

            currentFormData.set('nebenkosten', nkAmounts.join(','));
            currentFormData.set('nebenkosten_datum', nkDates.join(','));

            // Explicitly set wohnung_id from formData state
            if (formData.wohnung_id) {
              currentFormData.set('wohnung_id', formData.wohnung_id);
            } else {
              // Ensure it's not set if empty, or handle as per backend expectation for empty/null wohnung_id
              // If the backend expects an empty string or null, this could be currentFormData.delete('wohnung_id')
              // or currentFormData.set('wohnung_id', '') if the field must exist.
              // For now, let's assume if it's not in formData.wohnung_id, it shouldn't be sent or should be empty.
              // Given the server action likely uses Zod, not sending it or sending an empty string is usually fine.
              // Let's send an empty string if it's empty in formData to be explicit.
              currentFormData.set('wohnung_id', '');
            }

            const tenantNameForToast = formData.name; // Use state for toast consistency
            const result = await serverAction(currentFormData);

            if (result.success) {
              toast({
                title: initialData ? "Mieter aktualisiert" : "Mieter erstellt",
                description: `Die Daten des Mieters "${tenantNameForToast}" wurden erfolgreich ${initialData ? "aktualisiert" : "erstellt"}.`,
                variant: "success",
              });
              setTimeout(() => {
                onOpenChange(false);
                router.refresh();
              }, 500);
            } else {
              toast({
                title: "Fehler",
                description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
                variant: "destructive",
              });
              onOpenChange(false); // Close modal on handled error
            }
          } catch (error: any) { // Catch unexpected errors
            toast({
              title: "Unerwarteter Fehler",
              description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
              variant: "destructive",
            });
            onOpenChange(false); // Close modal on unexpected error
          } finally {
            setIsSubmitting(false);
          }
        }} className="grid gap-4 pt-4 pb-2">
          {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wohnung_id">Wohnung</Label>
              <CustomCombobox
                width="w-full"
                options={apartmentOptions}
                value={formData.wohnung_id}
                onChange={(value) => setFormData({ ...formData, wohnung_id: value || "" })}
                placeholder={isLoadingWohnungen ? "Lädt Wohnungen..." : "Wohnung auswählen"}
                searchPlaceholder="Wohnung suchen..."
                emptyText="Keine Wohnung gefunden."
                disabled={isLoadingWohnungen || isSubmitting}
                // The ID "wohnung_id" is for the Label's htmlFor.
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required/>
            </div>
            <div>
              <Label htmlFor="einzug">Einzug</Label>
              {/* Replaced Input with DatePicker */}
              <DatePicker
                value={formData.einzug}
                onChange={(date) => handleDateChange('einzug', date)}
                placeholder="TT.MM.JJJJ"
              />
              {/* Hidden input to still pass the value with the form name */}
              <input type="hidden" name="einzug" value={formData.einzug} />
            </div>
            <div>
              <Label htmlFor="auszug">Auszug</Label>
              {/* Replaced Input with DatePicker */}
              <DatePicker
                value={formData.auszug}
                onChange={(date) => handleDateChange('auszug', date)}
                placeholder="TT.MM.JJJJ"
              />
              {/* Hidden input to still pass the value with the form name */}
              <input type="hidden" name="auszug" value={formData.auszug} />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange}/>
            </div>
            <div>
              <Label htmlFor="telefonnummer">Telefon</Label>
              <Input id="telefonnummer" name="telefonnummer" value={formData.telefonnummer} onChange={handleChange}/>
            </div>
            <div className="col-span-2">
              <Label htmlFor="notiz">Notiz</Label>
              <Input id="notiz" name="notiz" value={formData.notiz} onChange={handleChange}/>
            </div>
            {/* Nebenkosten dynamic entries */}
            <div className="col-span-2 space-y-2">
              <Label>Nebenkosten Einträge</Label>
              {nebenkostenEntries.map((entry, index) => (
                <div key={entry.id} className="p-2 border rounded-md space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-grow space-y-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Betrag (€)"
                        value={entry.amount}
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
                        value={entry.date} // Assuming DatePicker can take yyyy-MM-dd string
                        onChange={(date) => handleNebenkostenChange(entry.id, 'date', date ? format(date, "yyyy-MM-dd") : "")}
                        placeholder="Datum (TT.MM.JJJJ)"
                        className={`${nebenkostenValidationErrors[entry.id]?.date ? '!border-red-500' : ''}`} // DatePicker might need !border-red-500 if it has its own border styling
                        disabled={isSubmitting}
                      />
                      {nebenkostenValidationErrors[entry.id]?.date && (
                        <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.date}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeNebenkostenEntry(entry.id)} disabled={isSubmitting} className="self-start">
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
            {/* Updated Abbrechen button */}
            <Button type="button" variant="outline" onClick={() => handleAttemptClose()} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingWohnungen || Object.values(nebenkostenValidationErrors).some(err => err.amount || err.date)}
            >
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
        {/* Override the DialogPrimitive.Close part of DialogContent to use our logic */}
        {/* This is a bit of a hack, ideally Radix would allow more control over the close button's behavior directly */}
        {/* For now, we can replace the default close button or add our logic to its onClick if we could access it */}
        {/* Since DialogClose is just a button, we can try to style our own that calls handleAttemptClose */}
        {/* Or, ensure the handleMainModalOpenChange covers the X button clicks if DialogPrimitive.Close triggers the Dialog's onOpenChange */}
        {/* Radix UI's DialogClose component will trigger the Dialog's onOpenChange(false).
            So, handleMainModalOpenChange should correctly intercept the X button click.
            No need to override DialogClose here if that's the case.
         */}
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
  )
}
