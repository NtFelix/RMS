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

const isFormDataDirtyHouse = (
  currentData: any,
  initialDataState: any,
  currentManualGroesse: string,
  initialManualGroesseState: string,
  currentAutomaticSize: boolean,
  initialAutomaticSizeState: boolean
): boolean => {
  if (currentAutomaticSize !== initialAutomaticSizeState) return true;
  if (currentManualGroesse !== initialManualGroesseState) return true;

  // Check main form fields
  return Object.keys(currentData).some(key => {
    const currentValue = currentData[key] === null ? "" : String(currentData[key]);
    const initialValue = initialDataState?.[key] === null ? "" : String(initialDataState?.[key]);
    return currentValue !== (initialValue || "");
  });
};

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

  // State for dirty checking
  const [initialFormState, setInitialFormState] = useState<any>({});
  const [initialManualGroesseState, setInitialManualGroesseState] = useState<string>('');
  const [initialAutomaticSizeState, setInitialAutomaticSizeState] = useState<boolean>(true);

  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');
  const [formData, setFormData] = useState(() => {
    const data = {
      name: initialData?.name || "",
      strasse: initialData?.strasse || "",
      ort: initialData?.ort || "",
      // groesse is handled by manualGroesse and automaticSize
    };
    // setInitialFormState(JSON.parse(JSON.stringify(data))); // Set during useEffect based on initialData
    return data;
  });

  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  useEffect(() => {
    const newFormData = {
      name: initialData?.name || "",
      strasse: initialData?.strasse || "",
      ort: initialData?.ort || "",
    };
    setFormData(newFormData);
    setInitialFormState(JSON.parse(JSON.stringify(newFormData)));

    if (initialData?.groesse != null) {
      const initialGroesseStr = String(initialData.groesse);
      setManualGroesse(initialGroesseStr);
      setInitialManualGroesseState(initialGroesseStr);
      setAutomaticSize(false);
      setInitialAutomaticSizeState(false);
    } else {
      setManualGroesse('');
      setInitialManualGroesseState('');
      setAutomaticSize(true);
      setInitialAutomaticSizeState(true);
    }

    if (!open) {
      setShowConfirmDiscardModal(false);
    }
  }, [initialData, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const checkDirtyStateHouse = useCallback(() => {
    return isFormDataDirtyHouse(
      formData,
      initialFormState,
      manualGroesse,
      initialManualGroesseState,
      automaticSize,
      initialAutomaticSizeState
    );
  }, [formData, initialFormState, manualGroesse, initialManualGroesseState, automaticSize, initialAutomaticSizeState]);

  const handleAttemptCloseHouse = useCallback((event?: Event) => {
    if (checkDirtyStateHouse()) {
      if (event) event.preventDefault();
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(false);
    }
  }, [checkDirtyStateHouse, onOpenChange]);

  const handleMainModalOpenChangeHouse = (isOpen: boolean) => {
    if (!isOpen && checkDirtyStateHouse()) {
      setShowConfirmDiscardModal(true);
    } else {
      onOpenChange(isOpen);
    }
  };

  const handleConfirmDiscardHouse = () => {
    onOpenChange(false); // Triggers useEffect to reset state
    setShowConfirmDiscardModal(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formPayload = new FormData(); // Renamed to avoid conflict with component's formData state
    formPayload.append("name", formData.name);
    formPayload.append("strasse", formData.strasse);
    formPayload.append("ort", formData.ort);

    if (automaticSize) {
      formPayload.append("groesse", ""); // Send empty string for NULL
    } else {
      formPayload.append("groesse", manualGroesse);
    }

    try {
      const result = await serverAction(initialData?.id || null, formPayload);
      
      if (result.success) {
        toast({
          title: initialData ? "Haus aktualisiert" : "Haus erstellt",
          description: `Das Haus "${formData.name}" wurde erfolgreich ${initialData ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success",
        });
        
        if (onSuccess) {
          const successData = result.data || { 
            ...formData, 
            id: initialData?.id || '',
            groesse: automaticSize ? null : parseFloat(manualGroesse) || null
          };
          onSuccess(successData);
        }
        
        onOpenChange(false); // Close the modal
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
    <>
    <Dialog open={open} onOpenChange={handleMainModalOpenChangeHouse}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutsideOptional={(e) => {
          if (open && checkDirtyStateHouse()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (open) {
            onOpenChange(false);
          }
        }}
        onEscapeKeyDown={(e) => {
          if (checkDirtyStateHouse()) {
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
            <Button type="button" variant="outline" onClick={() => handleAttemptCloseHouse()} disabled={isSubmitting}>
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
        onConfirm={handleConfirmDiscardHouse}
        title="Änderungen verwerfen?"
        description="Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?"
        confirmButtonText="Verwerfen"
        cancelButtonText="Weiter bearbeiten"
        confirmButtonVariant="destructive"
      />
    </>
  );
}
