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
  serverAction: (id: string | null, formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

export function HouseEditModal({
  open,
  onOpenChange,
  initialData,
  serverAction,
}: HouseEditModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Haus bearbeiten" : "Haus hinzufügen"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Aktualisiere die Hausinformationen." : "Gib die Hausinformationen ein."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            const currentFormData = new FormData(event.currentTarget);
            // Use formData.name for the toast message as it's reliably updated by handleInputChange
            const houseNameForToast = formData.name;
            
            try {
              const result = await serverAction(initialData?.id || null, currentFormData);
              if (result.success) {
                toast({
                  title: initialData ? "Haus aktualisiert" : "Haus erstellt",
                  description: `Die Daten des Hauses "${houseNameForToast}" wurden erfolgreich ${initialData ? "aktualisiert" : "erstellt"}.`,
                  variant: "success",
                });
                setTimeout(() => {
                  onOpenChange(false); // Close the dialog
                  router.refresh(); // Refresh data on the page
                }, 500);
              } else {
                toast({
                  title: "Fehler",
                  description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
                  variant: "destructive",
                });
                onOpenChange(false); // Close dialog on error
              }
            } catch (e) {
              // Catch any unexpected errors from serverAction or subsequent logic
              toast({
                title: "Unerwarteter Fehler",
                description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
                variant: "destructive",
              });
              onOpenChange(false); // Close dialog on unexpected error
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="grid gap-4 pt-4 pb-2"
        >
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
