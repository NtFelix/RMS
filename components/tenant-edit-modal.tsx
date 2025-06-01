"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/utils/supabase/client" // Added
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  nebenkosten?: number[]
  nebenkosten_datum?: string[]
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
    nebenkosten?: string
    nebenkosten_datum?: string
  }
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
  loading?: boolean // This might be replaced by local isSubmitting state
}

export function TenantEditModal({ open, onOpenChange, wohnungen: initialWohnungen = [], initialData, serverAction }: TenantEditModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false); // Added submitting state
  const [formData, setFormData] = useState({
    // Ensure all form fields are initialized, possibly from initialData
    wohnung_id: initialData?.wohnung_id || "",
    name: initialData?.name || "",
    einzug: initialData?.einzug || "",
    auszug: initialData?.auszug || "",
    email: initialData?.email || "",
    telefonnummer: initialData?.telefonnummer || "",
    notiz: initialData?.notiz || "",
    nebenkosten: initialData?.nebenkosten || "",
    nebenkosten_datum: initialData?.nebenkosten_datum || ""
  });

  useEffect(() => {
    setFormData({
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      einzug: initialData?.einzug || "",
      auszug: initialData?.auszug || "",
      email: initialData?.email || "",
      telefonnummer: initialData?.telefonnummer || "",
      notiz: initialData?.notiz || "",
      nebenkosten: initialData?.nebenkosten || "",
      nebenkosten_datum: initialData?.nebenkosten_datum || ""
    });
  }, [initialData, open]);

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

  // Specific handler for DatePicker changes
  const handleDateChange = (name: 'einzug' | 'auszug', date: Date | undefined) => {
    // Format date to YYYY-MM-DD string for the form data, or empty string if undefined
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData({ ...formData, [name]: formattedDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Mieter bearbeiten" : "Mieter hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie alle Pflichtfelder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async e => {
          e.preventDefault();
          setIsSubmitting(true);
          try {
            const currentFormData = new FormData(e.currentTarget);
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
            <div>
              <Label htmlFor="nebenkosten">Nebenkosten (€)</Label>
              <Input 
                id="nebenkosten" 
                name="nebenkosten" 
                value={formData.nebenkosten} 
                onChange={handleChange} 
                placeholder="z.B. 25,30"
              />
            </div>
            <div>
              <Label htmlFor="nebenkosten_datum">Nebenkosten Datum</Label>
              <Input 
                id="nebenkosten_datum" 
                name="nebenkosten_datum" 
                value={formData.nebenkosten_datum} 
                onChange={handleChange} 
                placeholder="YYYY-MM-DD, ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingWohnungen}>
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
