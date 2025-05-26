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
import { useRouter } from "next/navigation"; // Added for router.refresh()
import { toast } from "@/hooks/use-toast"; // Added for toast notifications

// Basic House interface - replace with actual type if available elsewhere
interface House {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Added submitting state
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    strasse: initialData?.strasse || "",
    ort: initialData?.ort || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        strasse: initialData.strasse || "",
        ort: initialData.ort,
      });
    } else {
      // Reset for adding new
      setFormData({ name: "", strasse: "", ort: "" });
    }
  }, [initialData, open]); // Re-initialize form when initialData or open status changes

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
