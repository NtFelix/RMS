"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import { createClient } from "@/utils/supabase/client"; // For fetching Wohnungen

// Interfaces (can be moved to a types file)
interface Finanz {
  id: string;
  wohnung_id?: string | null;
  name: string;
  datum?: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string | null;
}

interface Wohnung {
  id: string;
  name: string;
}

interface FinanceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Finanz;
  initialWohnungen?: Wohnung[];
  serverAction: (id: string | null, payload: Omit<Finanz, "id" | "Wohnungen">) => Promise<{ success: boolean; error?: any; data?: any }>;
  // loading prop can be added if server action is slow
}

export function FinanceEditModal({
  open,
  onOpenChange,
  initialData,
  initialWohnungen = [], // Default to empty array
  serverAction,
}: FinanceEditModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    wohnung_id: initialData?.wohnung_id || "",
    name: initialData?.name || "",
    datum: initialData?.datum || "",
    betrag: initialData?.betrag?.toString() || "",
    ist_einnahmen: initialData?.ist_einnahmen || false,
    notiz: initialData?.notiz || "",
  });

  const [internalWohnungen, setInternalWohnungen] = useState<Wohnung[]>(initialWohnungen);
  const [isLoadingWohnungen, setIsLoadingWohnungen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      wohnung_id: initialData?.wohnung_id || "",
      name: initialData?.name || "",
      // Ensure date is correctly formatted for DatePicker if it exists
      datum: initialData?.datum ? format(parseISO(initialData.datum), "yyyy-MM-dd") : "",
      betrag: initialData?.betrag?.toString() || "",
      ist_einnahmen: initialData?.ist_einnahmen || false,
      notiz: initialData?.notiz || "",
    });
  }, [initialData, open]);

  useEffect(() => {
    if (open && (!initialWohnungen || initialWohnungen.length === 0)) {
      const fetchWohnungen = async () => {
        setIsLoadingWohnungen(true);
        const supabase = createClient();
        const { data, error } = await supabase.from("Wohnungen").select("id, name");
        if (error) {
          console.error("Error fetching wohnungen for finance modal:", error);
          toast({ title: "Fehler", description: "Wohnungen konnten nicht geladen werden.", variant: "destructive" });
        } else {
          setInternalWohnungen(data || []);
        }
        setIsLoadingWohnungen(false);
      };
      fetchWohnungen();
    } else if (initialWohnungen && initialWohnungen.length > 0) {
      setInternalWohnungen(initialWohnungen);
    }
  }, [open, initialWohnungen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData({ ...formData, datum: formattedDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.betrag) {
      toast({ title: "Fehler", description: "Name und Betrag sind erforderlich.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const payload = {
      name: formData.name,
      betrag: parseFloat(formData.betrag),
      ist_einnahmen: formData.ist_einnahmen,
      wohnung_id: formData.wohnung_id || null,
      datum: formData.datum || null,
      notiz: formData.notiz || null,
    };

    const result = await serverAction(initialData?.id || null, payload);

    if (result.success) {
      toast({ title: initialData ? "Aktualisiert" : "Gespeichert", description: initialData ? "Transaktion aktualisiert." : "Transaktion hinzugefügt." });
      onOpenChange(false);
      router.refresh(); // Refresh data on the page
    } else {
      toast({ title: "Fehler", description: result.error?.message || "Ein Fehler ist aufgetreten.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Transaktion bearbeiten" : "Transaktion hinzufügen"}</DialogTitle>
          <DialogDescription>Füllen Sie die erforderlichen Felder aus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Bezeichnung</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="betrag">Betrag (€)</Label>
              <Input id="betrag" name="betrag" type="number" step="0.01" value={formData.betrag} onChange={handleChange} required disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="datum">Datum</Label>
              <DatePicker
                value={formData.datum} // DatePicker expects string in yyyy-MM-dd or Date object
                onChange={handleDateChange}
                placeholder="TT.MM.JJJJ"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="wohnung_id">Wohnung</Label>
              <Select 
                name="wohnung_id" 
                value={formData.wohnung_id || ""} 
                onValueChange={(v) => setFormData({ ...formData, wohnung_id: v })}
                disabled={isLoadingWohnungen || isSubmitting}
              >
                <SelectTrigger id="wohnung_id">
                  <SelectValue placeholder={isLoadingWohnungen ? "Lädt..." : "--"} />
                </SelectTrigger>
                <SelectContent>
                  {internalWohnungen.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ist_einnahmen">Typ</Label>
              <Select
                name="ist_einnahmen"
                value={formData.ist_einnahmen ? "Einnahmen" : "Ausgaben"}
                onValueChange={(v) => setFormData({ ...formData, ist_einnahmen: v === "Einnahmen" })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ist_einnahmen">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Einnahmen">Einnahmen</SelectItem>
                  <SelectItem value="Ausgaben">Ausgaben</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="notiz">Notiz</Label>
              <Input id="notiz" name="notiz" value={formData.notiz || ""} onChange={handleChange} disabled={isSubmitting} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || isLoadingWohnungen}>
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
