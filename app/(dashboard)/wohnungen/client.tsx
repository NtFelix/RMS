"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ResponsiveButtonWithHoverCard } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { PlusCircle, Home, Key, Euro, Ruler, X, Download, Trash2, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { ApartmentTable } from "@/components/tables/apartment-table";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { Wohnung } from "@/types/Wohnung";
import { useModalStore } from "@/hooks/use-modal-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Apartment as ApartmentTableType } from "@/components/tables/apartment-table";
import { StatCard } from "@/components/common/stat-card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

// Props for the main client view component, matching what page.tsx will pass
interface WohnungenClientViewProps {
  initialWohnungenData: Wohnung[];
  housesData: { id: string; name: string }[];
  serverApartmentCount: number;
  serverApartmentLimit: number;
  serverUserIsEligibleToAdd: boolean;
  serverLimitReason: 'trial' | 'subscription' | 'none';
}

// This is the new main client component, previously WohnungenPageClientComponent in page.tsx
export default function WohnungenClientView({
  initialWohnungenData,
  housesData,
  serverApartmentCount,
  serverApartmentLimit,
  serverUserIsEligibleToAdd,
  serverLimitReason,
}: WohnungenClientViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reloadRef = useRef<(() => void) | null>(null);
  const [apartments, setApartments] = useState<Wohnung[]>(initialWohnungenData);
  const [selectedApartments, setSelectedApartments] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<string>("none");
  const [isUpdating, setIsUpdating] = useState(false);
  const { openWohnungModal } = useModalStore();

  // ======================= SUMMARY METRICS =======================
  const summary = useMemo(() => {
    const total = apartments.length;
    const freeCount = apartments.filter((a) => a.status === "frei").length;
    const rentedCount = total - freeCount;

    // Average rent
    const rentValues = apartments.map((a) => a.miete ?? 0).filter((v) => v > 0);
    const avgRent = rentValues.length ? rentValues.reduce((s, v) => s + v, 0) / rentValues.length : 0;

    // Average price per sqm
    const pricePerSqmValues = apartments
      .filter((a) => a.miete && a.groesse && a.groesse > 0)
      .map((a) => (a.miete as number) / (a.groesse as number));
    const avgPricePerSqm = pricePerSqmValues.length
      ? pricePerSqmValues.reduce((s, v) => s + v, 0) / pricePerSqmValues.length
      : 0;

    return { total, freeCount, rentedCount, avgRent, avgPricePerSqm };
  }, [apartments]);

  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(!serverUserIsEligibleToAdd || (serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity));
  const [buttonTooltipMessage, setButtonTooltipMessage] = useState("");

  useEffect(() => {
    let message = "";
    const limitReached = serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity;

    if (!serverUserIsEligibleToAdd) {
      message = "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen.";
    } else if (limitReached) {
      if (serverLimitReason === 'trial') {
        message = `Maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihre Testphase erreicht.`;
      } else if (serverLimitReason === 'subscription') {
        message = `Sie haben die maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihr aktuelles Abonnement erreicht.`;
      } else {
        message = "Das Wohnungslimit ist erreicht.";
      }
    }

    setButtonTooltipMessage(message);
    setIsAddButtonDisabled(!serverUserIsEligibleToAdd || limitReached);
  }, [serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd, serverLimitReason]);

  const updateApartmentInList = useCallback((updatedApartment: Wohnung) => {
    setApartments(prev => {
      const exists = prev.some(apt => apt.id === updatedApartment.id);
      if (exists) return prev.map(apt => (apt.id === updatedApartment.id ? updatedApartment : apt));
      return [updatedApartment, ...prev];
    });
  }, []);

  const refreshTable = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/wohnungen');
      if (res.ok) {
        const data: Wohnung[] = await res.json();
        setApartments(data);
      } else {
        console.error('Failed to fetch wohnungen for refreshTable, status:', res.status);
      }
    } catch (error) {
      console.error('Error fetching wohnungen in refreshTable:', error);
    }
  }, []);

  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedApartmentsData = apartments.filter(a => selectedApartments.has(a.id))

    const headers = ['Name', 'Größe (m²)', 'Miete (€)', 'Miete pro m²', 'Haus', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedApartmentsData.map(a => {
      const row = [
        a.name,
        a.groesse?.toString() || '',
        a.miete?.toString() || '',
        a.groesse && a.miete ? (a.miete / a.groesse).toFixed(2) : '',
        a.Haeuser?.name || '',
        a.status || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wohnungen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedApartments.size} Wohnungen exportiert.`,
      variant: "success",
    })
  }, [selectedApartments, apartments, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedApartments.size === 0) return;

    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedApartments);

    try {
      const response = await fetch('/api/apartments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Wohnungen.');
      }

      const { successCount } = await response.json();

      setShowBulkDeleteConfirm(false);
      setSelectedApartments(new Set());

      toast({
        title: "Erfolg",
        description: `${successCount} Wohnungen erfolgreich gelöscht.`,
        variant: "success",
      });

      await refreshTable();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Wohnungen aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedApartments, router, refreshTable]);

  const handleAssignHouse = useCallback(async () => {
    if (selectedHouse === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie ein Haus aus, um fortzufahren.",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)

    try {
      const selectedIds = Array.from(selectedApartments)
      if (selectedIds.length === 0) return

      const response = await fetch('/api/apartments/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          updates: {
            haus_id: selectedHouse === "none" ? null : selectedHouse
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fehler beim Aktualisieren der Wohnungen.')
      }

      const { successCount } = await response.json()
      const failedCount = selectedIds.length - successCount

      if (successCount > 0) {
        toast({
          title: "Erfolgreich aktualisiert",
          description: `${successCount} von ${selectedIds.length} Wohnungen wurden erfolgreich aktualisiert.`,
          variant: "success"
        })
      }

      if (failedCount > 0) {
        toast({
          title: "Teilweise Fehler",
          description: `Bei ${failedCount} von ${selectedIds.length} Wohnungen ist ein Fehler aufgetreten.`,
          variant: "destructive"
        })
      }

      if (successCount > 0) {
        setIsAssignDialogOpen(false)
        setSelectedHouse("none")
        await refreshTable()
        setSelectedApartments(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Wohnungen:", error)
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }, [selectedHouse, selectedApartments, apartments, refreshTable, router]);

  const handleSuccess = useCallback((data: Wohnung) => {
    updateApartmentInList(data);
    refreshTable();
  }, [updateApartmentInList, refreshTable]);

  const handleAddWohnung = useCallback(() => {
    try {
      openWohnungModal(undefined, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Error opening wohnung modal:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  const handleEditWohnung = useCallback(async (apartment: ApartmentTableType) => {
    try {
      const supabase = createBrowserClient();
      const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartment.id).single();
      if (error || !aptToEdit) {
        console.error('Wohnung nicht gefunden oder Fehler:', error?.message);
        return;
      }
      const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
      openWohnungModal(transformedApt, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung für Bearbeitung:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  useEffect(() => {
    const handleEditApartmentListener = async (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      try {
        const supabase = createBrowserClient();
        const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartmentId).single();
        if (error || !aptToEdit) { console.error('Wohnung nicht gefunden oder Fehler:', error?.message); return; }
        const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
        handleEditWohnung(transformedApt);
      } catch (error) { console.error('Fehler beim Laden der Wohnung für Event-Edit:', error); }
    };
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    return () => window.removeEventListener('edit-apartment', handleEditApartmentListener);
  }, [handleEditWohnung]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        <StatCard
          title="Wohnungen gesamt"
          value={summary.total}
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Frei / Vermietet"
          value={`${summary.freeCount} / ${summary.rentedCount}`}
          icon={<Key className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Miete"
          value={summary.avgRent}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Preis pro m²"
          value={summary.avgPricePerSqm}
          unit="€/m²"
          decimals
          icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>

      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Wohnungsverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Verwalten Sie hier alle Ihre Wohnungen</p>
            </div>
            <div className="mt-0 sm:mt-1">
              <ResponsiveButtonWithHoverCard
                id="create-unit-btn"
                onClick={() => {
                  useOnboardingStore.getState().completeStep('create-apartment-start');
                  handleAddWohnung();
                }}
                disabled={isAddButtonDisabled}
                tooltip={buttonTooltipMessage}
                showTooltip={isAddButtonDisabled && !!buttonTooltipMessage}
                icon={<PlusCircle className="h-4 w-4" />}
                shortText="Hinzufügen"
              >
                Wohnung hinzufügen
              </ResponsiveButtonWithHoverCard>
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-4 sm:mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {[
                  { value: "all", shortLabel: "Alle", fullLabel: "Alle Wohnungen" },
                  { value: "free", shortLabel: "Frei", fullLabel: "Freie Wohnungen" },
                  { value: "rented", shortLabel: "Vermietet", fullLabel: "Vermietete Wohnungen" },
                ].map(({ value, shortLabel, fullLabel }) => (
                  <ResponsiveFilterButton
                    key={value}
                    shortLabel={shortLabel}
                    fullLabel={fullLabel}
                    isActive={filter === value}
                    onClick={() => setFilter(value)}
                  />
                ))}
              </div>
              <SearchInput
                placeholder="Suchen..."
                className="rounded-full"
                mode="table"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>
            {selectedApartments.size > 0 && (
              <div className="p-3 sm:p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => setSelectedApartments(new Set())}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="font-medium text-sm">
                      {selectedApartments.size} <span className="hidden sm:inline">{selectedApartments.size === 1 ? 'Wohnung' : 'Wohnungen'}</span> ausgewählt
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApartments(new Set())}
                    className="h-8 px-2 hover:bg-primary/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Haus zuweisen</span>
                    <span className="sm:hidden">Zuweisen</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkExport}
                    className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportieren</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isBulkDeleting}
                    className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Löschen...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Löschen ({selectedApartments.size})</span>
                        <span className="sm:hidden">{selectedApartments.size}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <ApartmentTable
            filter={filter}
            searchQuery={searchQuery}
            initialApartments={apartments}
            onEdit={handleEditWohnung}
            onTableRefresh={refreshTable}
            reloadRef={reloadRef}
            selectedApartments={selectedApartments}
            onSelectionChange={setSelectedApartments}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Wohnungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedApartments.size} Wohnungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedApartments.size} Wohnungen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Haus zuweisen</DialogTitle>
            <DialogDescription>
              Weisen Sie {selectedApartments.size} {selectedApartments.size === 1 ? 'ausgewählter Wohnung' : 'ausgewählten Wohnungen'} ein Haus zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="house" className="text-right">
                Haus
              </Label>
              <Select
                value={selectedHouse}
                onValueChange={setSelectedHouse}
                disabled={isUpdating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Haus auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Haus</SelectItem>
                  {housesData.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={isUpdating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleAssignHouse}
              disabled={!selectedHouse || isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Zuweisen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}