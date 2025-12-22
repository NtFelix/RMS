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
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store"; // Import the modal store
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

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
  // open: boolean; // Controlled by useModalStore.isHouseModalOpen
  // onOpenChange: (open: boolean) => void; // Now useModalStore.closeHouseModal
  // initialData?: House; // Now useModalStore.houseInitialData
  serverAction: (id: string | null, formData: FormData) => Promise<{
    success: boolean;
    error?: { message: string };
    data?: any;
  }>;
  // onSuccess?: (data: any) => void; // Now useModalStore.houseModalOnSuccess
}

// Note: The props `open`, `onOpenChange`, `initialData`, `onSuccess` are now
// managed via `useModalStore`. This component might be simplified if it directly
// consumes from the store, or the parent component using this modal will pass these
// props from the store. For this step, we'll assume the props are still passed
// but we'll also use the store for dirty checking and close confirmation.

export function HouseEditModal(props: HouseEditModalProps) {
  const {
    // open, // Now from store
    // onOpenChange, // Now from store's closeHouseModal
    // initialData, // Now from store
    serverAction,
    // onSuccess // Now from store
  } = props;

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');

  const {
    isHouseModalOpen,
    closeHouseModal,
    houseInitialData,
    houseModalOnSuccess,
    isHouseModalDirty,
    setHouseModalDirty,
    openConfirmationModal,
    confirmationModalConfig // Added to avoid direct call to CONFIRMATION_MODAL_DEFAULTS from component
  } = useModalStore();

  const [formData, setFormData] = useState({
    name: houseInitialData?.name || "",
    strasse: houseInitialData?.strasse || "",
    ort: houseInitialData?.ort || "",
    groesse: houseInitialData?.groesse ?? null,
  });

  useEffect(() => {
    if (houseInitialData) {
      setFormData({
        name: houseInitialData.name,
        strasse: houseInitialData.strasse || "",
        ort: houseInitialData.ort,
        groesse: houseInitialData.groesse ?? null,
      });
      if (houseInitialData.groesse != null) {
        setAutomaticSize(false);
        setManualGroesse(String(houseInitialData.groesse));
      } else {
        setAutomaticSize(true);
        setManualGroesse('');
      }
    } else {
      setFormData({ name: "", strasse: "", ort: "", groesse: null });
      setAutomaticSize(true);
      setManualGroesse('');
    }
    // When modal opens or initialData changes, reset dirty state
    setHouseModalDirty(false);
  }, [houseInitialData, isHouseModalOpen, setHouseModalDirty]); // Added isHouseModalOpen to reset on open

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHouseModalDirty(true); // Set dirty on any input change
  };

  const handleCheckboxChange = (checked: boolean) => {
    setAutomaticSize(checked);
    setHouseModalDirty(true); // Set dirty on checkbox change
  };

  const handleManualGroesseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualGroesse(e.target.value);
    setHouseModalDirty(true); // Set dirty on manual size change
  };

  const attemptClose = () => {
    // This function is called by DialogContent's onAttemptClose
    // or by the cancel button if dirty.
    // The store's closeHouseModal() already has the logic to check isHouseModalDirty
    // and open confirmation if needed.
    closeHouseModal();
  };

  const handleCancelClick = () => {
    closeHouseModal({ force: true }); // Force close for "Abbrechen" button
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("name", formData.name);
    form.append("strasse", formData.strasse);
    form.append("ort", formData.ort);

    if (automaticSize) {
      form.append("groesse", "");
    } else {
      form.append("groesse", manualGroesse);
    }

    try {
      const result = await serverAction(houseInitialData?.id || null, form);

      if (result.success) {
        toast({
          title: houseInitialData ? "Haus aktualisiert" : "Haus erstellt",
          description: `Das Haus "${formData.name}" wurde erfolgreich ${houseInitialData ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success",
        });

        if (houseModalOnSuccess) {
          const successData = result.data || {
            ...formData,
            id: houseInitialData?.id || ''
          };
          houseModalOnSuccess(successData);
        }

        setHouseModalDirty(false); // Reset dirty state on successful save
        useOnboardingStore.getState().completeStep('create-house-form');
        closeHouseModal(); // This will now close directly as dirty is false
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

  // If the modal is not open (controlled by store), don't render anything
  if (!isHouseModalOpen) {
    return null;
  }

  return (
    <Dialog open={isHouseModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        id="house-form-container"
        className="sm:max-w-[425px]"
        isDirty={isHouseModalDirty}
        onAttemptClose={attemptClose} // Use the new prop
      >
        <DialogHeader>
          <DialogTitle>{houseInitialData ? "Haus bearbeiten" : "Haus hinzufügen"}</DialogTitle>
          <DialogDescription>
            {houseInitialData ? "Aktualisiere die Hausinformationen." : "Gib die Hausinformationen ein."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2">
          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="name"
              infoText="Geben Sie einen eindeutigen Namen für das Haus ein. Dieser wird in der Übersicht und in Dropdown-Menüs angezeigt."
            >
              Name
            </LabelWithTooltip>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="z.B. Hauptstraße"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="strasse"
              infoText="Geben Sie die vollständige Adresse des Hauses ein. Dieses Feld wird für die Abrechnung und die generierte PDF benötigt. Wir empfehlen dringend, die Adresse anzugeben, da sie in den offiziellen Dokumenten erscheint."
            >
              Straße
            </LabelWithTooltip>
            <Input
              id="strasse"
              name="strasse"
              value={formData.strasse}
              onChange={handleInputChange}
              placeholder="z.B. Hauptstraße 1"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <LabelWithTooltip
              htmlFor="ort"
              infoText="Geben Sie den Ort des Hauses ein. Dieses Feld ist optional, wird aber für die Abrechnung und die generierte PDF benötigt. Die Ortsangabe erscheint in den offiziellen Dokumenten und wird für die korrekte Zuordnung verwendet."
            >
              Ort
            </LabelWithTooltip>
            <Input
              id="ort"
              name="ort"
              value={formData.ort}
              onChange={handleInputChange}
              placeholder="z.B. Berlin"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="automaticSize"
              checked={automaticSize}
              onCheckedChange={(checked) => handleCheckboxChange(Boolean(checked))}
              disabled={isSubmitting}
            />
            <LabelWithTooltip
              htmlFor="automaticSize"
              infoText="Wenn aktiviert, wird die Gesamtgröße des Hauses automatisch aus der Summe der Wohnungsflächen berechnet. Deaktivieren Sie diese Option, um die Größe manuell festzulegen."
            >
              Größe automatisch berechnen
            </LabelWithTooltip>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualGroesse">Größe in m²</Label>
            <NumberInput
              id="manualGroesse"
              name="manualGroesse"
              value={manualGroesse}
              onChange={handleManualGroesseChange}
              disabled={automaticSize || isSubmitting}
              placeholder={automaticSize ? "Automatisch berechnet" : "Manuell eingeben"}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : (houseInitialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
