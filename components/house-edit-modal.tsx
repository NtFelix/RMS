"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    strasse: "",
    ort: "",
    // groesse is handled by manualGroesse and automaticSize
  });
  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');

  // For dirty checking
  const [initialFormStateForDirtyCheck, setInitialFormStateForDirtyCheck] = useState<any>({});
  const [initialAutomaticSizeForDirtyCheck, setInitialAutomaticSizeForDirtyCheck] = useState(true);
  const [initialManualGroesseForDirtyCheck, setInitialManualGroesseForDirtyCheck] = useState('');

  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  // Initialize form state and dirty check states
  useEffect(() => {
    const currentFormData = {
      name: initialData?.name || "",
      strasse: initialData?.strasse || "",
      ort: initialData?.ort || "",
    };
    setFormData(currentFormData);
    setInitialFormStateForDirtyCheck(JSON.parse(JSON.stringify(currentFormData)));

    const currentAutomaticSize = initialData?.groesse == null; // true if groesse is null/undefined
    setAutomaticSize(currentAutomaticSize);
    setInitialAutomaticSizeForDirtyCheck(currentAutomaticSize);

    const currentManualGroesse = initialData?.groesse != null ? String(initialData.groesse) : '';
    setManualGroesse(currentManualGroesse);
    setInitialManualGroesseForDirtyCheck(currentManualGroesse);

    if (!open) { // Reset confirmation modal when main modal closes
      setShowConfirmDiscardModal(false);
    }
  }, [initialData, open]);

  const isFormDataDirty = useCallback(() => {
    if (formData.name !== initialFormStateForDirtyCheck.name) return true;
    if (formData.strasse !== initialFormStateForDirtyCheck.strasse) return true;
    if (formData.ort !== initialFormStateForDirtyCheck.ort) return true;
    if (automaticSize !== initialAutomaticSizeForDirtyCheck) return true;
    if (!automaticSize && manualGroesse !== initialManualGroesseForDirtyCheck) return true; // Only check manualGroesse if not automatic
    return false;
  }, [formData, automaticSize, manualGroesse, initialFormStateForDirtyCheck, initialAutomaticSizeForDirtyCheck, initialManualGroesseForDirtyCheck]);

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

  const handleAttemptClose = useCallback((event?: Event) => {
    if (isFormDataDirty()) {
      if (event) event.preventDefault();
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(false);
    }
  }, [isFormDataDirty, onOpenChange]);

  const handleMainModalOpenChange = (isOpen: boolean) => {
    if (!isOpen && isFormDataDirty()) {
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(isOpen);
    }
  };

  const handleConfirmDiscard = () => {
    onOpenChange(false); // This will trigger useEffect to reset form
    setShowConfirmDiscardModal(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainModalOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutsideOptional={(e) => {
          if (open && isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (open) {
            onOpenChange(false);
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isFormDataDirty()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else {
            onOpenChange(false);
          }
        }}
      >
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
            <Button type="button" variant="outline" onClick={() => handleAttemptClose()} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wird gespeichert..." : (initialData ? "Aktualisieren" : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
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
  );
}
