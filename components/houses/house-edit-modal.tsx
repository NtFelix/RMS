"use client";

import { useEffect, useState } from "react";
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

// Helper component for Property Header with Hover Info
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

// Basic House interface
interface House {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  groesse?: number | null;
}

interface HouseEditModalProps {
  serverAction: (id: string | null, formData: FormData) => Promise<{
    success: boolean;
    error?: { message: string };
    data?: any;
  }>;
}

export function HouseEditModal(props: HouseEditModalProps) {
  const { serverAction } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [automaticSize, setAutomaticSize] = useState(true);
  const [manualGroesse, setManualGroesse] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPending = isSubmitting || isDeleting;
  const { openHausOverviewModal } = useModalStore();

  const {
    isHouseModalOpen,
    closeHouseModal,
    houseInitialData,
    houseModalOnSuccess,
    isHouseModalDirty,
    setHouseModalDirty,
  } = useModalStore();

  const [formData, setFormData] = useState({
    name: "",
    strasse: "",
    ort: "",
    groesse: null as number | null,
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
        className="sm:max-w-[50vw] flex flex-col h-full p-0 gap-0"
        isDirty={isHouseModalDirty}
        onAttemptClose={attemptClose}
      >
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            {/* The actual SheetClose button is in components/ui/sheet.tsx at left-4 top-4 */}
          </div>
          {houseInitialData && (
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
              <CustomDropdownItem onClick={() => openHausOverviewModal(houseInitialData.id)}>
                <Eye className="h-4 w-4 mr-2" />
                <span>Übersicht</span>
              </CustomDropdownItem>
              <CustomDropdownSeparator />
              <CustomDropdownItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Löschen</span>
              </CustomDropdownItem>
            </CustomDropdown>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <div className="max-w-[90%] mx-auto pt-14 sm:pt-20 pb-10 px-4 sm:px-8 space-y-6 sm:space-y-12">
              
              {/* Header Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="text-primary/80">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <div className="space-y-1">
                  <SheetTitle className="text-2xl sm:text-4xl font-bold tracking-tight">
                    {houseInitialData ? formData.name || "Unbenanntes Haus" : "Haus hinzufügen"}
                  </SheetTitle>
                  <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
                    {houseInitialData 
                      ? "Bearbeiten Sie die Informationen für dieses Objekt." 
                      : "Legen Sie ein neues Haus in Ihrer Verwaltung an."}
                  </SheetDescription>
                </div>
              </div>

              {/* Properties Section */}
              <div className="space-y-4 sm:space-y-8">
                {/* Name Property */}
                <div className="space-y-1.5 sm:space-y-2">
                  <PropertyHeader 
                    icon={Home}
                    label="Name"
                    htmlFor="name"
                    infoText="Geben Sie einen eindeutigen Namen für das Haus ein. Dieser wird in der Übersicht und in Dropdown-Menüs angezeigt."
                  />
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Einen Namen geben..."
                    disabled={isSubmitting}
                    className="text-base sm:text-xl font-medium placeholder:opacity-30 h-auto py-2 rounded-xl border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                  />
                </div>

                {/* Address Section */}
                <div className="sm:space-y-6 sm:pt-4 sm:border-t sm:border-border/40">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                    Standort
                  </div>
                  
                  <div className="sm:grid sm:gap-6 space-y-3 sm:space-y-0">
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
                        onChange={handleInputChange}
                        placeholder="Straße und Hausnummer"
                        disabled={isSubmitting}
                        className="rounded-xl h-10 text-sm border-primary/20 bg-primary/5 focus:bg-background transition-colors"
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
                        onChange={handleInputChange}
                        placeholder="PLZ und Stadt"
                        disabled={isSubmitting}
                        className="rounded-xl h-10 text-sm border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Section */}
                <div className="sm:space-y-6 sm:pt-4 sm:border-t sm:border-border/40">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                    Kennzahlen
                  </div>

                  <div className="sm:grid sm:gap-6 space-y-3 sm:space-y-0">
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
                            setAutomaticSize(!!checked);
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
                            onChange={handleManualGroesseChange}
                            disabled={isSubmitting}
                            placeholder="Manuelle Größe..."
                            className="rounded-xl h-10 text-sm border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info / Description Style */}
                <div className="hidden sm:block space-y-4 pt-4 border-t border-border/40">
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
          </ScrollArea>

          <SheetFooter className="px-4 pb-6 pt-2 sm:p-8 sm:pt-4">
            <div className="max-w-[90%] mx-auto w-full flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleCancelClick} 
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
        </form>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Haus löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie das Haus "{houseInitialData?.name || formData.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
