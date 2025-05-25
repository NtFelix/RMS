"use client";

import React, { useState, useEffect, FormEvent } from "react";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";

// Define interfaces based on expected data structure
interface Wohnung {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
  // Add other fields if necessary, e.g., created_at
}

interface Haus {
  id: string;
  name: string;
}

// Define the payload type for the server action, matching WohnungServerAction's expectation
interface WohnungServerActionPayload {
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
}

interface WohnungEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Wohnung;
  initialHaeuser?: Haus[];
  serverAction: (
    id: string | null,
    payload: WohnungServerActionPayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
}

export function WohnungEditModal({
  open,
  onOpenChange,
  initialData,
  initialHaeuser = [], // Default to empty array
  serverAction,
}: WohnungEditModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    groesse: initialData?.groesse?.toString() || "",
    miete: initialData?.miete?.toString() || "",
    haus_id: initialData?.haus_id || "",
  });

  const [internalHaeuser, setInternalHaeuser] = useState<Haus[]>(initialHaeuser);
  const [isLoadingHaeuser, setIsLoadingHaeuser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset form data when initialData or open state changes
    setFormData({
      name: initialData?.name || "",
      groesse: initialData?.groesse?.toString() || "",
      miete: initialData?.miete?.toString() || "",
      haus_id: initialData?.haus_id || "",
    });
  }, [initialData, open]);

  useEffect(() => {
    if (open && (!initialHaeuser || initialHaeuser.length === 0)) {
      const fetchHaeuser = async () => {
        setIsLoadingHaeuser(true);
        const supabase = createClient();
        const { data, error } = await supabase.from("Haeuser").select("id, name");
        if (error) {
          console.error("Error fetching Haeuser:", error);
          toast({
            title: "Fehler",
            description: "Häuser konnten nicht geladen werden: " + error.message,
            variant: "destructive",
          });
        } else {
          setInternalHaeuser(data || []);
        }
        setIsLoadingHaeuser(false);
      };
      fetchHaeuser();
    } else if (initialHaeuser && initialHaeuser.length > 0) {
      setInternalHaeuser(initialHaeuser);
    }
  }, [open, initialHaeuser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const { name, groesse, miete, haus_id } = formData;

    if (!name || !groesse || !miete || !haus_id) {
      toast({
        title: "Fehlende Eingaben",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    const groesseNum = parseFloat(groesse);
    const mieteNum = parseFloat(miete);

    if (isNaN(groesseNum) || groesseNum <= 0) {
      toast({ title: "Ungültige Eingabe", description: "Größe muss eine positive Zahl sein.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (isNaN(mieteNum) || mieteNum < 0) { // Miete can be 0
      toast({ title: "Ungültige Eingabe", description: "Miete muss eine Zahl sein.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const payload: WohnungServerActionPayload = {
      name,
      groesse: groesseNum,
      miete: mieteNum,
      haus_id: haus_id || null,
    };

    const result = await serverAction(initialData?.id || null, payload);

    if (result.success) {
      toast({
        title: initialData ? "Wohnung aktualisiert" : "Wohnung erstellt",
        description: `Die Wohnung "${payload.name}" wurde erfolgreich ${initialData ? "aktualisiert" : "erstellt"}.`,
      });
      onOpenChange(false);
      router.refresh(); // Refresh data on the current page
    } else {
      toast({
        title: "Fehler",
        description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Wohnung bearbeiten" : "Neue Wohnung erstellen"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Aktualisieren Sie die Details dieser Wohnung." : "Füllen Sie die Details der neuen Wohnung aus."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="name">Name der Wohnung</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="z.B. Wohnung 1 OG Links"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="groesse">Größe (m²)</Label>
            <Input
              id="groesse"
              name="groesse"
              type="number"
              value={formData.groesse}
              onChange={handleChange}
              placeholder="z.B. 65"
              required
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="miete">Miete (€)</Label>
            <Input
              id="miete"
              name="miete"
              type="number"
              value={formData.miete}
              onChange={handleChange}
              placeholder="z.B. 650.50"
              required
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="haus_id">Zugehöriges Haus</Label>
            <Select
              name="haus_id"
              value={formData.haus_id || ""}
              onValueChange={(value) => handleSelectChange("haus_id", value)}
              disabled={isLoadingHaeuser || isSubmitting}
            >
              <SelectTrigger id="haus_id">
                <SelectValue placeholder={isLoadingHaeuser ? "Häuser laden..." : "Haus auswählen"} />
              </SelectTrigger>
              <SelectContent>
                {internalHaeuser.map((haus) => (
                  <SelectItem key={haus.id} value={haus.id}>
                    {haus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingHaeuser}>
              {isSubmitting ? (initialData ? "Wird aktualisiert..." : "Wird erstellt...") : (initialData ? "Änderungen speichern" : "Wohnung erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
