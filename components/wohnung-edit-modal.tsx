"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react"; // Added useCallback
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
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { toast } from "@/hooks/use-toast"; // Changed import
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
  onSuccess?: (data: any) => void;
  currentApartmentLimitFromProps?: number | typeof Infinity; // For "add new" mode check
  isActiveSubscriptionFromProps?: boolean; // For "add new" mode check
  currentApartmentCountFromProps?: number | undefined; // Added new prop
}

export function WohnungEditModal(props: WohnungEditModalProps) {
  const {
    open,
    onOpenChange,
    initialData,
    initialHaeuser = [],
    serverAction,
    onSuccess,
    currentApartmentLimitFromProps,
    isActiveSubscriptionFromProps,
    currentApartmentCountFromProps, // Added
  } = props;
  const router = useRouter();
  // Form state
  const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" });

  // For dirty checking
  const [initialFormStateForDirtyCheck, setInitialFormStateForDirtyCheck] = useState<any>({});
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  const [internalHaeuser, setInternalHaeuser] = useState<Haus[]>(initialHaeuser);
  const [isLoadingHaeuser, setIsLoadingHaeuser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state variables for context fetching
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSaveDisabledByLimitsOrSubscriptionState, setIsSaveDisabledByLimitsOrSubscriptionState] = useState(false);
  const [contextualSaveMessage, setContextualSaveMessage] = useState("");

  const houseOptions: ComboboxOption[] = internalHaeuser.map(h => ({ value: h.id, label: h.name }));

  // Initialize form state and dirty check states
  useEffect(() => {
    const currentFormData = {
      name: initialData?.name || "",
      groesse: initialData?.groesse?.toString() || "",
      miete: initialData?.miete?.toString() || "",
      haus_id: initialData?.haus_id || "",
    };
    setFormData(currentFormData);
    setInitialFormStateForDirtyCheck(JSON.parse(JSON.stringify(currentFormData)));

    if (!open) { // Reset confirmation modal when main modal closes
      setShowConfirmDiscardModal(false);
    }
  }, [initialData, open]);

  const isFormDataDirty = useCallback(() => {
    if (formData.name !== initialFormStateForDirtyCheck.name) return true;
    if (formData.groesse !== initialFormStateForDirtyCheck.groesse) return true;
    if (formData.miete !== initialFormStateForDirtyCheck.miete) return true;
    if (formData.haus_id !== initialFormStateForDirtyCheck.haus_id) return true;
    return false;
  }, [formData, initialFormStateForDirtyCheck]);


  useEffect(() => {
    if (open && (!initialHaeuser || initialHaeuser.length === 0)) {
      const fetchHaeuser = async () => {
        setIsLoadingHaeuser(true);
        const supabase = createClient(); // Already imported
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

  useEffect(() => {
    if (open) {
      let determinedMessage = "";
      let determinedDisabled = false;
      // Reset messages at the beginning of each check when modal opens or dependencies change
      setContextualSaveMessage("");
      setIsSaveDisabledByLimitsOrSubscriptionState(false);

      const fetchContextAndSetState = async () => {
        setIsLoadingContext(true);

        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          determinedMessage = "Benutzer nicht authentifiziert. Speichern nicht möglich.";
          determinedDisabled = true;
        } else if (currentApartmentCountFromProps === undefined) { // Check if prop is undefined
          determinedMessage = "Fehler: Wohnungsanzahl nicht verfügbar.";
          determinedDisabled = true;
        } else {
          const count = currentApartmentCountFromProps; // Use prop directly

          // Check subscription and limit based on props
          if (isActiveSubscriptionFromProps === false) { // Explicitly check for false
            determinedMessage = "Ein aktives Abonnement ist erforderlich.";
            determinedDisabled = true;
          } else if (isActiveSubscriptionFromProps === undefined) { // Should not happen if props are passed correctly
              determinedMessage = "Konfigurationsfehler: Abonnementstatus nicht verfügbar.";
              determinedDisabled = true;
          } else if (currentApartmentLimitFromProps === undefined) {
            determinedMessage = "Konfigurationsfehler: Abonnementdetails (Limit) nicht verfügbar.";
            determinedDisabled = true;
          } else if (currentApartmentLimitFromProps !== Infinity && count !== null) {
            const limit = currentApartmentLimitFromProps;
            // Differentiate between add and edit mode for limit checks
            if (!initialData && count >= limit) { // ADD mode: count >= limit
              determinedMessage = `Sie haben die maximale Anzahl an Wohnungen (${limit}) für Ihr Abonnement erreicht.`;
              determinedDisabled = true;
            } else if (initialData && count > limit) { // EDIT mode: count > limit (user is already over limit)
              // This scenario implies the user somehow got more apartments than allowed,
              // possibly due to a plan change or an admin action. Editing is blocked.
              determinedMessage = `Bearbeitung nicht möglich. Sie haben bereits mehr Wohnungen (${count}) als Ihr Abonnement erlaubt (${limit}).`;
                determinedDisabled = true;
              }
              // If in EDIT mode and count <= limit, no message/disable based on this specific check.
            }
          }
        // EXTRA BRACE REMOVED FROM HERE
        setContextualSaveMessage(determinedMessage);
        setIsSaveDisabledByLimitsOrSubscriptionState(determinedDisabled);
        setIsLoadingContext(false);
      };

      fetchContextAndSetState();
    } else {
      // Reset when modal is closed
      setContextualSaveMessage("");
      setIsSaveDisabledByLimitsOrSubscriptionState(false);
      setIsLoadingContext(false);
    }
  }, [open, initialData, isActiveSubscriptionFromProps, currentApartmentLimitFromProps, currentApartmentCountFromProps]); // Added currentApartmentCountFromProps to dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.groesse || !formData.miete) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Convert string inputs to numbers
    const groesseNum = parseFloat(formData.groesse);
    const mieteNum = parseFloat(formData.miete);

    if (isNaN(groesseNum) || groesseNum <= 0) {
      toast({
        title: "Ungültige Größe",
        description: "Die Größe muss eine positive Zahl sein.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (isNaN(mieteNum) || mieteNum < 0) {
      toast({
        title: "Ungültige Miete",
        description: "Die Miete darf nicht negativ sein.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const payload: WohnungServerActionPayload = {
      name: formData.name,
      groesse: groesseNum,
      miete: mieteNum,
      haus_id: formData.haus_id || null,
    };

    try {
      const result = await serverAction(initialData?.id || null, payload);

      if (result.success) {
        toast({
          title: initialData ? "Wohnung aktualisiert" : "Wohnung erstellt",
          description: `Die Wohnung "${formData.name}" wurde erfolgreich ${initialData ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success",
        });

        // Call the onSuccess callback with the result data
        if (onSuccess) {
          const successData = result.data || {
            ...payload,
            id: initialData?.id || '',
            haus_name: initialHaeuser.find(h => h.id === formData.haus_id)?.name || ''
          };
          onSuccess(successData);
        }

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
        className="sm:max-w-[500px]"
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
          <DialogTitle>{initialData ? "Wohnung bearbeiten" : "Neue Wohnung erstellen"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Aktualisieren Sie die Details dieser Wohnung." : "Füllen Sie die Details der neuen Wohnung aus."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2">
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
            <CustomCombobox
              width="w-full"
              options={houseOptions}
              value={formData.haus_id}
              onChange={(value) => handleSelectChange("haus_id", value || "")}
              placeholder={isLoadingHaeuser ? "Häuser laden..." : "Haus auswählen"}
              searchPlaceholder="Haus suchen..."
              emptyText="Kein Haus gefunden."
              disabled={isLoadingHaeuser || isSubmitting}
              // The ID "haus_id" is for the Label's htmlFor.
            />
          </div>
          {contextualSaveMessage && (
            <p className="text-sm text-red-500 mb-2 text-center">{contextualSaveMessage}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleAttemptClose()} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingHaeuser || isLoadingContext || isSaveDisabledByLimitsOrSubscriptionState}
            >
              {isSubmitting ? (initialData ? "Wird aktualisiert..." : "Wird erstellt...") : (initialData ? "Änderungen speichern" : "Wohnung erstellen")}
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
