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
  serverAction: (id: string | null, formData: FormData) => Promise<void>;
  // Consider adding a loading state prop if server actions take time
  // loading?: boolean; 
}

export function HouseEditModal({
  open,
  onOpenChange,
  initialData,
  serverAction,
}: HouseEditModalProps) {
  const router = useRouter();
  // Local form state to manage uncontrolled inputs or provide defaults
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
            const currentFormData = new FormData(event.currentTarget);
            // If using local state for inputs, ensure FormData is correctly populated
            // For controlled inputs, you might need to append manually if not using names directly
            await serverAction(initialData?.id || null, currentFormData);
            onOpenChange(false); // Close the dialog
            router.refresh(); // Refresh data on the page
          }}
          className="grid gap-4 pt-4 pb-2"
        >
          {/* Hidden input for ID if editing */}
          {/* The server action expects ID as a separate param, not in FormData */}
          {/* So, no hidden input for 'id' here unless serverAction is changed */}

          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
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
            />
          </div>
          <DialogFooter>
            <Button type="submit">{initialData ? "Aktualisieren" : "Speichern"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
