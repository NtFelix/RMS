"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, MapPin, Ruler, Info, Home, MoreHorizontal, Lightbulb, Eye, Trash2, type LucideIcon } from "lucide-react";
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
import { deleteHouseAction } from "@/app/(dashboard)/haeuser/actions";

interface House {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  groesse?: number | null;
}

interface HouseFormData {
  name: string;
  strasse: string;
  ort: string;
  groesse: number | null;
}

interface HouseEditModalProps {
  serverAction: (id: string | null, formData: FormData) => Promise<{
    success: boolean;
    error?: { message: string };
    data?: any;
  }>;
}

function PropertyHeader({ icon: Icon, label, infoText, htmlFor }: { icon: LucideIcon, label: string, infoText: string, htmlFor: string }) {
  return (
    <>
      <Label htmlFor={htmlFor} className="block sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="hidden sm:block">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 text-muted-foreground/70 cursor-help transition-colors hover:text-foreground/90 w-fit group/header focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-[4px]"
            >
              <Icon className="h-4 w-4 group-hover/header:text-primary transition-colors" />
              <Label htmlFor={htmlFor} className="text-sm font-medium uppercase tracking-wider cursor-help group-hover/header:text-foreground transition-colors">
                {label}
              </Label>
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-80 shadow-2xl border-border/40 bg-background/95 backdrop-blur-md rounded-[28px] p-5 overflow-hidden">
            <div className="flex gap-4 items-start">
              <div className="flex-none h-12 w-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-500/20">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">Tipp</h4>
                <p className="text-sm leading-relaxed text-muted-foreground/90">{infoText}</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </>
  );
}

function ResizeHandle({
  isResizing,
  setWidth,
  onMouseDown,
}: {
  isResizing: boolean;
  setWidth: React.Dispatch<React.SetStateAction<number>>;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Panelgröße anpassen"
      onMouseDown={onMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setWidth(prev => Math.max(360, prev - 20));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setWidth(prev => Math.min(window.innerWidth * 0.9, prev + 20));
        }
      }}
      className={cn(
        "absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 select-none group/resize-handle hidden sm:block appearance-none bg-transparent border-none p-0",
        isResizing ? "cursor-ew-resize" : ""
      )}
    >
      <div className={cn(
        "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all duration-150 ease-in-out",
        isResizing ? "bg-primary" : "bg-transparent group-hover/resize-handle:bg-primary/40"
      )} />
    </button>
  );
}

function TopBar({
  houseInitialData,
  onOverviewClick,
  onDeleteRequest,
}: {
  houseInitialData: House | null;
  onOverviewClick: () => void;
  onDeleteRequest: () => void;
}) {
  if (!houseInitialData) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-end px-4 z-10 pointer-events-none">
      <CustomDropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg opacity-50 hover:opacity-100 hover:bg-hover-bg pointer-events-auto cursor-pointer h-8 w-8"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Aktionen</span>
          </Button>
        }
        align="end"
      >
        <CustomDropdownItem onClick={onOverviewClick}>
          <Eye className="h-4 w-4 mr-2" />
          <span>Übersicht</span>
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

function FormFields({
  formData,
  onFieldChange,
  automaticSize,
  onAutomaticSizeChange,
  manualGroesse,
  onManualGroesseChange,
  isSubmitting,
  houseInitialData,
  isHouseModalDirty,
  setHouseModalDirty,
}: {
  formData: HouseFormData;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  automaticSize: boolean;
  onAutomaticSizeChange: (checked: boolean) => void;
  manualGroesse: string;
  onManualGroesseChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
  houseInitialData: House | null;
  isHouseModalDirty: boolean;
  setHouseModalDirty: (dirty: boolean) => void;
}) {
  return (
    <div className="max-w-[90%] mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 space-y-4 sm:space-y-8">
      <div className="space-y-2 sm:space-y-3">
        <div className="text-primary/80">
          <Building2 className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        <div className="space-y-1">
          <SheetTitle className="sr-only">
            {houseInitialData ? "Haus bearbeiten" : "Haus hinzufügen"}
          </SheetTitle>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={onFieldChange}
            placeholder={houseInitialData ? "Unbenanntes Haus" : "Haus hinzufügen"}
            disabled={isSubmitting}
            aria-label={houseInitialData ? "Name des Hauses" : "Name des neuen Hauses"}
            className="text-2xl sm:text-4xl font-bold tracking-tight w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-foreground placeholder:opacity-30 placeholder:text-muted-foreground/50 cursor-text"
          />
          <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
            {houseInitialData
              ? "Bearbeiten Sie die Informationen für dieses Objekt."
              : "Legen Sie ein neues Haus in Ihrer Verwaltung an."}
          </SheetDescription>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-6">
        <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Standort
          </div>

          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={MapPin}
                label="Straße"
                htmlFor="strasse"
                infoText="Geben Sie die vollständige Adresse des Hauses ein. Dieses Feld wird für die Abrechnung und die generierte PDF benötigt."
              />
              <Input
                id="strasse"
                name="strasse"
                value={formData.strasse}
                onChange={onFieldChange}
                placeholder="Straße und Hausnummer"
                disabled={isSubmitting}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
              />
            </div>

            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={MapPin}
                label="Ort"
                htmlFor="ort"
                infoText="Geben Sie den Ort des Hauses ein. Die Ortsangabe erscheint in den offiziellen Dokumenten."
              />
              <Input
                id="ort"
                name="ort"
                value={formData.ort}
                onChange={onFieldChange}
                placeholder="PLZ und Stadt"
                disabled={isSubmitting}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Kennzahlen
          </div>

          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={Ruler}
                label="Berechnung"
                htmlFor="automaticSize"
                infoText="Wenn aktiviert, wird die Gesamtgröße des Hauses automatisch aus der Summe der Wohnungsflächen berechnet."
              />
              <Label
                htmlFor="automaticSize"
                className={cn(
                  "flex items-center justify-between h-10 px-3 rounded-xl cursor-pointer transition-colors border outline-hidden focus-within:ring-1 focus-within:ring-ring",
                  automaticSize ? "bg-primary/5 text-primary border-primary/10" : "bg-muted/30 text-muted-foreground border-border/50"
                )}
              >
                <span className="text-sm font-medium cursor-pointer">Automatisch</span>
                <Checkbox
                  id="automaticSize"
                  checked={automaticSize}
                  onCheckedChange={(checked) => {
                    onAutomaticSizeChange(!!checked);
                    if (!isHouseModalDirty) setHouseModalDirty(true);
                  }}
                  disabled={isSubmitting}
                  className="h-4 w-4"
                />
              </Label>
            </div>

            {!automaticSize && (
              <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="manualGroesse" className="text-sm text-muted-foreground/70">Fläche (m²)</Label>
                <div className="relative">
                  <NumberInput
                    id="manualGroesse"
                    name="manualGroesse"
                    value={manualGroesse}
                    onChange={onManualGroesseChange}
                    disabled={isSubmitting}
                    placeholder="Manuelle Größe..."
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
                  />
                </div>
              </div>
            )}
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
                Diese Informationen werden für die automatische Erstellung von Nebenkostenabrechnungen und offiziellen Dokumenten verwendet. Bitte stellen Sie sicher, dass alle Standortdaten korrekt sind.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormActions({
  isSubmitting,
  onCancel,
  houseInitialData,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  houseInitialData: House | null;
}) {
  return (
    <SheetFooter className="px-4 pb-6 pt-2 sm:p-8 sm:pt-4">
      <div className="max-w-[90%] mx-auto w-full flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:scale-[1.005] active:scale-[0.995] hover:shadow-none"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
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
          ) : (houseInitialData ? "Änderungen speichern" : "Haus anlegen")}
        </Button>
      </div>
    </SheetFooter>
  );
}

function DeleteHouseDialog({
  open,
  onOpenChange,
  houseName,
  isDeleting,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houseName: string;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Haus löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie das Haus &ldquo;{houseName}&rdquo; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
            {isDeleting ? "Löschen..." : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function HouseEditModal(props: HouseEditModalProps) {
  const { serverAction } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPending = isSubmitting || isDeleting;

  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("house-modal-width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed)) {
          setWidth(parsed);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResetWidth = () => {
        setWidth(600);
      };
      window.addEventListener("reset-house-modal-width", handleResetWidth);
      return () => {
        window.removeEventListener("reset-house-modal-width", handleResetWidth);
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
        localStorage.setItem("house-modal-width", String(finalWidth));
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

  const {
    isHouseModalOpen,
    closeHouseModal,
    houseInitialData,
    houseModalOnSuccess,
    isHouseModalDirty,
    setHouseModalDirty,
    openHausOverviewModal,
  } = useModalStore();

  const [formData, setFormData] = useState<HouseFormData>({
    name: "",
    strasse: "",
    ort: "",
    groesse: null,
  });

  useEffect(() => {
    if (isHouseModalOpen) {
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
      setHouseModalDirty(false);
    }
  }, [houseInitialData, isHouseModalOpen, setHouseModalDirty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (!isHouseModalDirty) setHouseModalDirty(true);
  };

  const handleManualGroesseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualGroesse(e.target.value);
    if (!isHouseModalDirty) setHouseModalDirty(true);
  };

  const handleAutomaticSizeChange = (checked: boolean) => {
    setAutomaticSize(checked);
  };

  const attemptClose = () => {
    closeHouseModal();
  };

  const handleCancelClick = () => {
    closeHouseModal({ force: true });
  };

  const handleDelete = async () => {
    if (!houseInitialData || isPending) return;
    try {
      setIsDeleting(true);
      const result = await deleteHouseAction(houseInitialData.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Das Haus "${houseInitialData.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        });
        setHouseModalDirty(false);
        closeHouseModal();
        if (houseModalOnSuccess) {
          houseModalOnSuccess({ deleted: true, id: houseInitialData.id });
        }
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Das Haus konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Löschen des Hauses:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    if (!automaticSize && (manualGroesse === '' || isNaN(Number(manualGroesse)))) {
      toast({
        title: "Eingabefehler",
        description: "Bitte geben Sie eine gültige Größe in m² ein.",
        variant: "destructive",
      });
      return;
    }

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

        setHouseModalDirty(false);
        useOnboardingStore.getState().completeStep('create-house-form');
        closeHouseModal();
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
    <Sheet open={isHouseModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <SheetContent
        id="house-form-container"
        className="w-full sm:w-[var(--sheet-width)] sm:max-w-none flex flex-col h-full p-0 gap-0"
        style={{
          "--sheet-width": `${width}px`,
          transition: isResizing ? "none" : undefined
        } as React.CSSProperties}
        isDirty={isHouseModalDirty}
        onAttemptClose={attemptClose}
      >
        <ResizeHandle
          isResizing={isResizing}
          setWidth={setWidth}
          onMouseDown={startResizing}
        />

        <TopBar
          houseInitialData={houseInitialData}
          onOverviewClick={() => houseInitialData && openHausOverviewModal(houseInitialData.id)}
          onDeleteRequest={() => setDeleteDialogOpen(true)}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <FormFields
              formData={formData}
              onFieldChange={handleInputChange}
              automaticSize={automaticSize}
              onAutomaticSizeChange={handleAutomaticSizeChange}
              manualGroesse={manualGroesse}
              onManualGroesseChange={handleManualGroesseChange}
              isSubmitting={isSubmitting}
              houseInitialData={houseInitialData}
              isHouseModalDirty={isHouseModalDirty}
              setHouseModalDirty={setHouseModalDirty}
            />
          </ScrollArea>

          <FormActions
            isSubmitting={isSubmitting}
            onCancel={handleCancelClick}
            houseInitialData={houseInitialData}
          />
        </form>

        <DeleteHouseDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          houseName={houseInitialData?.name || formData.name}
          isDeleting={isDeleting}
          onDelete={handleDelete}
        />
      </SheetContent>
    </Sheet>
  );
}
