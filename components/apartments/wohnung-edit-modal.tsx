"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { toast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Ruler, Coins, Building2, MoreHorizontal, Eye, Trash2, Info, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomDropdown, CustomDropdownItem, CustomDropdownSeparator } from "@/components/ui/custom-dropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { loescheWohnung } from "@/app/(dashboard)/wohnungen/actions";
import { PropertyHeader } from "@/components/ui/property-header";
import { ResizeHandle } from "@/components/ui/resize-handle";

interface Haus {
  id: string;
  name: string;
}

interface WohnungServerActionPayload {
  name: string;
  groesse: number;
  miete: number;
  haus_id?: string | null;
}

interface WohnungEditModalProps {
  serverAction: (
    id: string | null,
    payload: WohnungServerActionPayload
  ) => Promise<{ success: boolean; error?: any; data?: any }>;
  currentApartmentLimitFromProps?: number | typeof Infinity;
  isActiveSubscriptionFromProps?: boolean;
  currentApartmentCountFromProps?: number | undefined;
}

function TopBar({
  wohnungInitialData,
  onMeterClick,
  onDeleteRequest,
}: {
  wohnungInitialData: any;
  onMeterClick: () => void;
  onDeleteRequest: () => void;
}) {
  if (!wohnungInitialData) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-end px-4 z-10 pointer-events-none">
      <CustomDropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg opacity-50 hover:opacity-100 hover:bg-hover-bg pointer-events-auto cursor-pointer h-8 w-8 active:scale-[0.995]"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Aktionen</span>
          </Button>
        }
        align="end"
      >
        <CustomDropdownItem onClick={onMeterClick}>
          <Gauge className="h-4 w-4 mr-2" />
          <span>Zähler verwalten</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />
        <CustomDropdownItem onClick={onDeleteRequest} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          <span>Löschen</span>
        </CustomDropdownItem>
      </CustomDropdown>
    </div>
  );
}

export function WohnungEditModal(props: WohnungEditModalProps) {
  const {
    serverAction,
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
    openZaehlerModal,
  } = useModalStore();

  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    groesse: "",
    miete: "",
    haus_id: "",
  });

  const [internalHaeuser, setInternalHaeuser] = useState<Haus[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPending = isSubmitting || isDeleting;

  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("apartment-modal-width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 600;
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);

  const houseOptions: ComboboxOption[] = internalHaeuser.map(h => ({ value: h.id, label: h.name }));
  const isAddNewMode = !wohnungInitialData;

  const count = currentApartmentCountFromProps;
  const limit = currentApartmentLimitFromProps;
  const isActiveSub = isActiveSubscriptionFromProps;

  let contextualSaveMessage = "";
  let isSaveDisabledByLimitsOrSubscriptionState = false;

  if (isWohnungModalOpen) {
    if (isActiveSub === false) {
      contextualSaveMessage = "Ein aktives Abonnement ist erforderlich.";
      isSaveDisabledByLimitsOrSubscriptionState = true;
    } else if (isAddNewMode && limit !== undefined && count !== undefined && limit !== Infinity && count >= limit) {
      contextualSaveMessage = `Sie haben die maximale Anzahl an Wohnungen (${limit}) für Ihr Abonnement erreicht.`;
      isSaveDisabledByLimitsOrSubscriptionState = true;
    }
  }

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResetWidth = () => {
        setWidth(600);
      };
      window.addEventListener("reset-apartment-modal-width", handleResetWidth);
      return () => {
        window.removeEventListener("reset-apartment-modal-width", handleResetWidth);
      };
    }
  }, []);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      const minWidth = 360;
      const maxWidth = window.innerWidth * 0.9;
      setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const finalWidth = widthRef.current;
      if (typeof finalWidth === "number" && !isNaN(finalWidth) && finalWidth >= 360) {
        localStorage.setItem("apartment-modal-width", String(finalWidth));
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isWohnungModalOpen) {
      if (wohnungInitialData) {
        setFormData({
          name: wohnungInitialData.name || "",
          groesse: wohnungInitialData.groesse?.toString() || "",
          miete: wohnungInitialData.miete?.toString() || "",
          haus_id: wohnungInitialData.haus_id || "",
        });
      } else {
        setFormData({
          name: "",
          groesse: "",
          miete: "",
          haus_id: "",
        });
      }
      setWohnungModalDirty(false);
    }
  }, [wohnungInitialData, isWohnungModalOpen, setWohnungModalDirty]);

  useEffect(() => {
    if (isWohnungModalOpen) {
      setInternalHaeuser(wohnungModalHaeuser || []);
    }
  }, [isWohnungModalOpen, wohnungModalHaeuser]);

  // Context settings (determined directly in render phase)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (!isWohnungModalDirty) setWohnungModalDirty(true);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (!isWohnungModalDirty) setWohnungModalDirty(true);
  };

  const attemptClose = () => {
    closeWohnungModal();
  };

  const handleCancelClick = () => {
    closeWohnungModal({ force: true });
  };

  const handleDelete = async () => {
    if (!wohnungInitialData || isPending) return;
    try {
      setIsDeleting(true);
      const result = await loescheWohnung(wohnungInitialData.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Die Wohnung "${wohnungInitialData.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        });
        setWohnungModalDirty(false);
        closeWohnungModal();
        if (wohnungModalOnSuccess) {
          wohnungModalOnSuccess({ deleted: true, id: wohnungInitialData.id });
        }
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Die Wohnung konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Löschen der Wohnung:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    if (!formData.name || !formData.groesse || !formData.miete) {
      toast({ title: "Fehlende Angaben", description: "Bitte füllen Sie alle Pflichtfelder aus.", variant: "destructive" });
      return;
    }

    const groesseNum = parseFloat(formData.groesse);
    const mieteNum = parseFloat(formData.miete);

    if (isNaN(groesseNum) || groesseNum <= 0) {
      toast({ title: "Ungültige Größe", description: "Die Größe muss eine positive Zahl sein.", variant: "destructive" });
      return;
    }
    if (isNaN(mieteNum) || mieteNum < 0) {
      toast({ title: "Ungültige Miete", description: "Die Miete darf nicht negativ sein.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

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
            id: wohnungInitialData?.id || result.data?.id || '',
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
    <Sheet open={isWohnungModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <SheetContent
        id="wohnung-form-container"
        className="w-full sm:w-[var(--sheet-width)] sm:max-w-none flex flex-col h-full p-0 gap-0"
        style={{
          "--sheet-width": `${width}px`,
          transition: isResizing ? "none" : undefined
        } as React.CSSProperties}
        isDirty={isWohnungModalDirty}
        onAttemptClose={attemptClose}
      >
        <ResizeHandle
          isResizing={isResizing}
          setWidth={setWidth}
          onMouseDown={startResizing}
        />

        <TopBar
          wohnungInitialData={wohnungInitialData}
          onMeterClick={() => {
            if (wohnungInitialData) {
              useOnboardingStore.getState().completeStep('create-meter-select');
              openZaehlerModal(wohnungInitialData.id, wohnungInitialData.name);
            }
          }}
          onDeleteRequest={() => setDeleteDialogOpen(true)}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <div className="max-w-[90%] mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 space-y-4 sm:space-y-8">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-primary/80">
                  <Home className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <div className="space-y-1">
                  <SheetTitle className="sr-only">
                    {wohnungInitialData ? "Wohnung bearbeiten" : "Wohnung hinzufügen"}
                  </SheetTitle>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={wohnungInitialData ? "Unbenannte Wohnung" : "Wohnung hinzufügen"}
                    disabled={isPending}
                    aria-label={wohnungInitialData ? "Name der Wohnung" : "Name der neuen Wohnung"}
                    className="text-2xl sm:text-4xl font-bold tracking-tight w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-foreground placeholder:opacity-30 placeholder:text-muted-foreground/50 cursor-text"
                  />
                  <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
                    {wohnungInitialData
                      ? "Bearbeiten Sie die Informationen für dieses Objekt."
                      : "Legen Sie eine neue Wohnung in Ihrer Verwaltung an."}
                  </SheetDescription>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-6">
                <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                    Kennzahlen & Details
                  </div>

                  <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
                    <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
                      <PropertyHeader
                        icon={Ruler}
                        label="Größe"
                        htmlFor="groesse"
                        infoText="Geben Sie die Wohnfläche in Quadratmetern an. Dieser Wert wird zur anteiligen Berechnung der Betriebskosten verwendet."
                      />
                      <NumberInput
                        id="groesse"
                        name="groesse"
                        value={formData.groesse}
                        onChange={handleInputChange}
                        placeholder="z.B. 65"
                        required
                        min="0"
                        step="0.01"
                        disabled={isPending}
                        className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
                      />
                    </div>

                    <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
                      <PropertyHeader
                        icon={Coins}
                        label="Miete (€)"
                        htmlFor="miete"
                        infoText="Geben Sie die monatliche Kaltmiete der Wohnung in Euro an."
                      />
                      <NumberInput
                        id="miete"
                        name="miete"
                        value={formData.miete}
                        onChange={handleInputChange}
                        placeholder="z.B. 650.50"
                        required
                        min="0"
                        step="0.01"
                        disabled={isPending}
                        className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
                      />
                    </div>

                    <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
                      <PropertyHeader
                        icon={Building2}
                        label="Haus"
                        htmlFor="haus_id"
                        infoText="Wählen Sie das Haus aus, zu dem diese Wohnung gehört."
                      />
                      <div className="relative">
                        <CustomCombobox
                          width="w-full"
                          options={houseOptions}
                          value={formData.haus_id}
                          onChange={(value) => handleSelectChange("haus_id", value || "")}
                          placeholder="Haus auswählen"
                          searchPlaceholder="Haus suchen..."
                          emptyText="Kein Haus gefunden."
                          disabled={isPending}
                          triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block space-y-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                    Beschreibung
                  </div>
                  <div className="bg-muted/20 rounded-xl p-4 text-sm text-muted-foreground/80 leading-relaxed border border-border/50">
                    <div className="flex gap-2 items-start">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 opacity-40" />
                      <p>
                        Diese Wohneinheit kann Mietern zugeordnet werden, um automatische Abrechnungen, Zahlungsströme und Mietverträge zu verwalten.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {contextualSaveMessage && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
                  <p>{contextualSaveMessage}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="px-4 pb-8 pt-2 sm:p-8 sm:pb-14 sm:pt-4">
            <div className="max-w-[90%] mx-auto w-full flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelClick}
                disabled={isPending}
                className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:scale-[1.005] active:scale-[0.995] hover:shadow-none"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={isPending || isSaveDisabledByLimitsOrSubscriptionState}
                className="flex-1 rounded-xl h-11 shadow-sm font-semibold hover:scale-[1.005] active:scale-[0.995] hover:shadow-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Wird gespeichert...
                  </span>
                ) : (wohnungInitialData ? "Änderungen speichern" : "Wohnung erstellen")}
              </Button>
            </div>
          </SheetFooter>
        </form>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wohnung löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie die Wohnung &ldquo;{wohnungInitialData?.name || formData.name}&rdquo; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? "Löschen..." : "Löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
