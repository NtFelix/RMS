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
  } = props;
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

  // New state variables for context fetching
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSaveDisabledByLimitsOrSubscriptionState, setIsSaveDisabledByLimitsOrSubscriptionState] = useState(false);
  const [contextualSaveMessage, setContextualSaveMessage] = useState("");

  const houseOptions: ComboboxOption[] = internalHaeuser.map(h => ({ value: h.id, label: h.name }));

  const isAddNewMode = !initialData;
  // The logic for limitMessage and isSaveDisabledByLimitsOrSubscription using props is removed.
  // It will now be handled by useEffect and new state variables.

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
    // Only run if modal is open and it's for creating a new apartment
    if (open && !initialData) {
      const fetchContext = async () => {
        setIsLoadingContext(true);
        setIsSaveDisabledByLimitsOrSubscriptionState(false);
        setContextualSaveMessage("");

        const supabase = createClient(); // From @/utils/supabase/client
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Modal: User not authenticated for context fetching.", userError);
          setContextualSaveMessage("Benutzer nicht authentifiziert. Speichern nicht möglich.");
          setIsSaveDisabledByLimitsOrSubscriptionState(true);
          setIsLoadingContext(false);
          return;
        }

        // Fetch apartment count
        const { count, error: countError } = await supabase
          .from('Wohnungen')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error("Modal: Error counting apartments.", countError);
          setContextualSaveMessage("Fehler beim Laden der Wohnungsdaten.");
          setIsSaveDisabledByLimitsOrSubscriptionState(true); // Or handle differently
          setIsLoadingContext(false);
          return;
        }

        // Removed direct fetching of profile for subscription status. Will use props.

        // Use props for subscription status and limit
        if (isActiveSubscriptionFromProps === undefined || currentApartmentLimitFromProps === undefined) {
          console.error("Modal: Subscription status or apartment limit not provided for 'add new' mode.");
          setContextualSaveMessage("Konfigurationsfehler: Abonnementdetails nicht verfügbar.");
          setIsSaveDisabledByLimitsOrSubscriptionState(true);
          setIsLoadingContext(false);
          return;
        }

        if (!isActiveSubscriptionFromProps) {
          setContextualSaveMessage("Ein aktives Abonnement ist erforderlich, um Wohnungen hinzuzufügen.");
          setIsSaveDisabledByLimitsOrSubscriptionState(true);
        } else if (currentApartmentLimitFromProps !== Infinity && count !== null && count >= currentApartmentLimitFromProps) {
          setContextualSaveMessage(`Sie haben die maximale Anzahl an Wohnungen (${currentApartmentLimitFromProps}) für Ihr Abonnement erreicht.`);
          setIsSaveDisabledByLimitsOrSubscriptionState(true);
        } else {
          // All good, enable save
          setIsSaveDisabledByLimitsOrSubscriptionState(false);
          setContextualSaveMessage("");
        }
        setIsLoadingContext(false);
      };

      fetchContext();
    } else if (!open) {
      // Reset when modal is closed
      setIsLoadingContext(false);
      setIsSaveDisabledByLimitsOrSubscriptionState(false);
      setContextualSaveMessage("");
    }
  }, [open, initialData, isActiveSubscriptionFromProps, currentApartmentLimitFromProps]); // Add new props to dependency array

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          {isAddNewMode && contextualSaveMessage && (
            <p className="text-sm text-red-500 mb-2 text-center">{contextualSaveMessage}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingHaeuser || (isAddNewMode && (isLoadingContext || isSaveDisabledByLimitsOrSubscriptionState))}
            >
              {isSubmitting ? (initialData ? "Wird aktualisiert..." : "Wird erstellt...") : (initialData ? "Änderungen speichern" : "Wohnung erstellen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
