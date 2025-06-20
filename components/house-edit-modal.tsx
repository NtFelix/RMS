"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { useRouter } from "next/navigation"; // Added for router.refresh()
import { toast } from "@/hooks/use-toast"; // Added for toast notifications

// Basic House interface - replace with actual type if available elsewhere
interface House {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  groesse?: number | null;
  // Add other fields as necessary
}

interface HouseEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: House;
  serverAction: (id: string | null, formData: FormData) => Promise<{ 
    success: boolean; 
    error?: { message: string };
    data?: any;
  }>;
  onSuccess?: (data: any) => void;
}

export function HouseEditModal(props: HouseEditModalProps) {
  const {
    open,
    onOpenChange,
    initialData,
    serverAction,
    onSuccess
  } = props;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    strasse: initialData?.strasse || "",
    ort: initialData?.ort || "",
    groesse: initialData?.groesse ?? null, // Reflects House interface
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        strasse: initialData.strasse || "",
        ort: initialData.ort,
        groesse: initialData.groesse ?? null,
      });
      if (initialData.groesse != null) {
        setAutomaticSize(false);
        setManualGroesse(String(initialData.groesse));
      } else {
        setAutomaticSize(true);
        setManualGroesse('');
      }
    } else {
      // Reset for adding new
      setFormData({ name: "", strasse: "", ort: "", groesse: null });
      setAutomaticSize(true);
      setManualGroesse('');
    }
  }, [initialData, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = new FormData();
    form.append("name", formData.name);
    form.append("strasse", formData.strasse);
    form.append("ort", formData.ort);

    if (automaticSize) {
      form.append("groesse", ""); // Send empty string for NULL
    } else {
      form.append("groesse", manualGroesse);
    }

    try {
      const result = await serverAction(initialData?.id || null, form);
      
      if (result.success) {
        toast({
          title: initialData ? "Haus aktualisiert" : "Haus erstellt",
          description: `Das Haus "${formData.name}" wurde erfolgreich ${initialData ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success",
        });
        
        // Call the onSuccess callback with the result data
        if (onSuccess) {
          const successData = result.data || { 
            ...formData, 
            id: initialData?.id || '' 
          };
          onSuccess(successData);
        }
        
        // Close the modal
        onOpenChange(false);
      } else {
        throw new Error(result.error?.message || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Haus bearbeiten" : "Haus hinzufügen"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Aktualisiere die Hausinformationen." : "Gib die Hausinformationen ein."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="strasse">Straße</Label>
            <Input
              type="text"
              id="strasse"
              name="strasse"
              value={formData.strasse}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ort">Ort</Label>
            <Input
              type="text"
              id="ort"
              name="ort"
              value={formData.ort}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="automaticSize"
              checked={automaticSize}
              onCheckedChange={(checked) => setAutomaticSize(Boolean(checked))}
              disabled={isSubmitting}
            />
            <Label htmlFor="automaticSize">Automatische Größe</Label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="manualGroesse">Größe (m²)</Label>
            <Input
              type="number"
              id="manualGroesse"
              name="manualGroesse"
              value={manualGroesse}
              onChange={(e) => setManualGroesse(e.target.value)}
              disabled={automaticSize || isSubmitting}
              placeholder={automaticSize ? "Automatisch berechnet" : "Manuell eingeben"}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
