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
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { toast } from "@/hooks/use-toast"; // Changed import
import { createClient } from "@/utils/supabase/client";
import { useModalStore } from "@/hooks/use-modal-store";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

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
  // open: boolean; // Now from store
  // onOpenChange: (open: boolean) => void; // Now from store
  // initialData?: Wohnung; // Now from store
  // initialHaeuser?: Haus[]; // Now from store
  serverAction: (
    id: string | null,
    payload: WohnungServerActionPayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
  // onSuccess?: (data: any) => void; // Now from store
  currentApartmentLimitFromProps?: number | typeof Infinity;
  isActiveSubscriptionFromProps?: boolean;
  currentApartmentCountFromProps?: number | undefined;
}

export function WohnungEditModal(props: WohnungEditModalProps) {
  const {
    // open, // from store
    // onOpenChange, // from store
    // initialData, // from store
    // initialHaeuser = [], // from store
    serverAction,
    // onSuccess, // from store
    currentApartmentLimitFromProps,
    isActiveSubscriptionFromProps,
    currentApartmentCountFromProps,
  } = props;

  const {
    isWohnungModalOpen,
    closeWohnungModal,
    wohnungInitialData,
    wohnungModalHaeuser,
    wohnungModalOnSuccess,
    isWohnungModalDirty,
    setWohnungModalDirty,
  } = useModalStore(); // Assuming you will import useModalStore

  const router = useRouter();
  const [formData, setFormData] = useState({
    name: wohnungInitialData?.name || "",
    groesse: wohnungInitialData?.groesse?.toString() || "",
    miete: wohnungInitialData?.miete?.toString() || "",
    haus_id: wohnungInitialData?.haus_id || "",
  });

  const [internalHaeuser, setInternalHaeuser] = useState<Haus[]>([]); // Initialize empty, effect will populate
  const [isLoadingHaeuser, setIsLoadingHaeuser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state variables for context fetching
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSaveDisabledByLimitsOrSubscriptionState, setIsSaveDisabledByLimitsOrSubscriptionState] = useState(false);
  const [contextualSaveMessage, setContextualSaveMessage] = useState("");

  const houseOptions: ComboboxOption[] = internalHaeuser.map(h => ({ value: h.id, label: h.name }));

  const isAddNewMode = !wohnungInitialData; // Use store data

  useEffect(() => {
    if (isWohnungModalOpen) {
      setFormData({
        name: wohnungInitialData?.name || "",
        groesse: wohnungInitialData?.groesse?.toString() || "",
        miete: wohnungInitialData?.miete?.toString() || "",
        haus_id: wohnungInitialData?.haus_id || "",
      });
      setWohnungModalDirty(false); // Reset dirty state
      // internalHaeuser is now wohnungModalHaeuser from the store, no need to fetch here
      // if (wohnungModalHaeuser && wohnungModalHaeuser.length > 0) {
      //   setInternalHaeuser(wohnungModalHaeuser);
      // } else {
      //   // Potentially fetch if store didn't provide them, though ideally store should.
      // }
    }
  }, [wohnungInitialData, isWohnungModalOpen, setWohnungModalDirty]); // Removed wohnungModalHaeuser if it's guaranteed by openWohnungModal

  // useEffect for fetching Haeuser (if not provided by store) is removed for now,
  // assuming wohnungModalHaeuser is populated by openWohnungModal.

  // Sync internalHaeuser with store's wohnungModalHaeuser
  useEffect(() => {
    if (isWohnungModalOpen) { // Only run if modal is open
      setInternalHaeuser(wohnungModalHaeuser || []);
      // If there's a need to fetch Haeuser because wohnungModalHaeuser is empty,
      // that logic would go here, perhaps setting setIsLoadingHaeuser.
      // For now, we assume openWohnungModal provides the necessary haeuser list.
    }
  }, [isWohnungModalOpen, wohnungModalHaeuser]);

  useEffect(() => {
    if (isWohnungModalOpen) {
      let determinedMessage = "";
      let determinedDisabled = false;
      setContextualSaveMessage("");
      setIsSaveDisabledByLimitsOrSubscriptionState(false);
      setIsLoadingContext(true); // Start loading context

      // Directly use props for limits and subscription status
      // These are passed from layout, which gets them from useModalStore's specific wohnung... fields
      const count = currentApartmentCountFromProps;
      const limit = currentApartmentLimitFromProps;
      const isActiveSub = isActiveSubscriptionFromProps;

      if (isActiveSub === false) {
        determinedMessage = "Ein aktives Abonnement ist erforderlich.";
        determinedDisabled = true;
      } else if (isAddNewMode && limit !== undefined && count !== undefined && limit !== Infinity && count >= limit) {
        determinedMessage = `Sie haben die maximale Anzahl an Wohnungen (${limit}) für Ihr Abonnement erreicht.`;
        determinedDisabled = true;
      } else if (!isAddNewMode && limit !== undefined && count !== undefined && limit !== Infinity && count > limit && wohnungInitialData?.id) {
        // This case is tricky: if editing and already over limit.
        // The original logic for EDIT mode: count > limit.
        // This assumes `count` reflects total BEFORE this edit might save (which is fine for blocking).
        // Let's refine: if editing, the concern is less about *this* apartment
        // unless policies strictly block any interaction. Usually, "add new" is the primary block.
        // The original logic: `else if (initialData && count > limit)`
        // For simplicity, if adding is blocked, that's the main use case for these props.
        // If editing while over limit should also be blocked, this needs careful consideration
        // of whether `count` includes the current apartment being edited.
        // For now, focusing on "add new" block as per original intent.
      }

      setContextualSaveMessage(determinedMessage);
      setIsSaveDisabledByLimitsOrSubscriptionState(determinedDisabled);
      setIsLoadingContext(false); // Finished context check
    } else {
      setContextualSaveMessage("");
      setIsSaveDisabledByLimitsOrSubscriptionState(false);
      setIsLoadingContext(false);
    }
  }, [
    isWohnungModalOpen,
    isAddNewMode, // Derived from wohnungInitialData
    isActiveSubscriptionFromProps,
    currentApartmentLimitFromProps,
    currentApartmentCountFromProps,
    wohnungInitialData?.id // Added to re-evaluate if mode changes
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setWohnungModalDirty(true);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    setWohnungModalDirty(true);
  };

  const attemptClose = () => {
    closeWohnungModal(); // For outside clicks / X button
  };

  const handleCancelClick = () => {
    closeWohnungModal({ force: true }); // For "Abbrechen" button
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.groesse || !formData.miete) {
      toast({ title: "Fehlende Angaben", description: "Bitte füllen Sie alle Pflichtfelder aus.", variant: "destructive" });
      setIsSubmitting(false); return;
    }

    const groesseNum = parseFloat(formData.groesse);
    const mieteNum = parseFloat(formData.miete);

    if (isNaN(groesseNum) || groesseNum <= 0) {
      toast({ title: "Ungültige Größe", description: "Die Größe muss eine positive Zahl sein.", variant: "destructive" });
      setIsSubmitting(false); return;
    }
    if (isNaN(mieteNum) || mieteNum < 0) {
      toast({ title: "Ungültige Miete", description: "Die Miete darf nicht negativ sein.", variant: "destructive" });
      setIsSubmitting(false); return;
    }

    const payload: WohnungServerActionPayload = {
      name: formData.name,
      groesse: groesseNum,
      miete: mieteNum,
      haus_id: formData.haus_id || null,
    };

    try {
      const result = await serverAction(wohnungInitialData?.id || null, payload);

      if (result.success) {
        toast({
          title: wohnungInitialData?.id ? "Wohnung aktualisiert" : "Wohnung erstellt",
          description: `Die Wohnung "${formData.name}" wurde erfolgreich ${wohnungInitialData?.id ? 'aktualisiert' : 'erstellt'}.`,
          variant: "success",
        });

        setWohnungModalDirty(false);
        if (wohnungModalOnSuccess) {
          const successData = result.data || {
            ...payload,
            id: wohnungInitialData?.id || result.data?.id || '', // Ensure ID is present
            haus_name: (wohnungModalHaeuser || []).find(h => h.id === formData.haus_id)?.name || ''
          };
          wohnungModalOnSuccess(successData);
        }
        useOnboardingStore.getState().completeStep('create-apartment-form');
        closeWohnungModal();
      } else {
        throw new Error(result.error?.message || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      // Don't re-set dirty on error - form still has unsaved changes
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
    <Dialog open={isWohnungModalOpen} onOpenChange={(openValue) => !openValue && attemptClose()}>
      <DialogContent
        id="wohnung-form-container"
        className="sm:max-w-[500px]"
        isDirty={isWohnungModalDirty}
        onAttemptClose={attemptClose}
      >
        <DialogHeader>
          <DialogTitle>{wohnungInitialData?.id ? "Wohnung bearbeiten" : "Neue Wohnung erstellen"}</DialogTitle>
          <DialogDescription>
            {wohnungInitialData?.id ? "Aktualisieren Sie die Details dieser Wohnung." : "Füllen Sie die Details der neuen Wohnung aus."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 pb-2">
          <div className="space-y-2">
            <LabelWithTooltip htmlFor="name" infoText="Eindeutiger Name für die Wohnung (z.B. 'EG Links' oder '1. OG rechts')">
              Name der Wohnung
            </LabelWithTooltip>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="z.B. Wohnung 1 OG Links"
              required
              disabled={isSubmitting || isLoadingContext}
            />
          </div>
          <div className="space-y-2">
            <LabelWithTooltip htmlFor="groesse" infoText="Wohnfläche in Quadratmetern (z.B. 65.5 für 65,5 m²)">
              Größe (m²)
            </LabelWithTooltip>
            <NumberInput
              id="groesse"
              name="groesse"
              value={formData.groesse}
              onChange={handleChange}
              placeholder="z.B. 65"
              required
              min="0"
              step="0.01"
              disabled={isSubmitting || isLoadingContext}
            />
          </div>
          <div className="space-y-2">
            <LabelWithTooltip htmlFor="miete" infoText="Monatliche Miete in Euro (z.B. 650.50 für 650,50 €)">
              Miete (€)
            </LabelWithTooltip>
            <NumberInput
              id="miete"
              name="miete"
              value={formData.miete}
              onChange={handleChange}
              placeholder="z.B. 650.50"
              required
              min="0"
              step="0.01"
              disabled={isSubmitting || isLoadingContext}
            />
          </div>
          <div className="space-y-2">
            <LabelWithTooltip htmlFor="haus_id" infoText="Zugeordnetes Haus (z.B. 'Haus A' oder 'Haus B')">
              Zugehöriges Haus
            </LabelWithTooltip>
            <CustomCombobox
              width="w-full"
              options={houseOptions}
              value={formData.haus_id}
              onChange={(value) => handleSelectChange("haus_id", value || "")}
              placeholder={isLoadingHaeuser ? "Häuser laden..." : "Haus auswählen"}
              searchPlaceholder="Haus suchen..."
              emptyText="Kein Haus gefunden."
              disabled={isLoadingHaeuser || isSubmitting || isLoadingContext}
            />
          </div>
          {contextualSaveMessage && (
            <p className="text-sm text-red-500 mb-2 text-center">{contextualSaveMessage}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingHaeuser || isLoadingContext || isSaveDisabledByLimitsOrSubscriptionState}
            >
              {isSubmitting ? (wohnungInitialData?.id ? "Wird aktualisiert..." : "Wird erstellt...") : (wohnungInitialData?.id ? "Änderungen speichern" : "Wohnung erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
