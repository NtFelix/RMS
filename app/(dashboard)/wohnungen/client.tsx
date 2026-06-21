"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ResponsiveButtonWithHoverCard } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { PlusCircle, Home, Key, Euro, Ruler, X, Download, Trash2, Building2, Loader2, FileSpreadsheet, BarChart3 } from "lucide-react";
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
import { ApartmentsSizeDonutChart, ApartmentsOccupancyDonutChart, ApartmentsRentPerSqmBarChart } from "@/components/dashboard/dashboard-charts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Props for the main client view component, matching what page.tsx will pass
interface WohnungenClientViewProps {
  initialWohnungenData: Wohnung[];
  housesData: { id: string; name: string }[];
  serverApartmentCount: number;
  serverApartmentLimit: number;
  serverUserIsEligibleToAdd: boolean;
  serverLimitReason: 'trial' | 'subscription' | 'none';
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewMeters?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

// This is the new main client component, previously WohnungenPageClientComponent in page.tsx
export default function WohnungenClientView({
  initialWohnungenData,
  housesData,
  serverApartmentCount,
  serverApartmentLimit,
  serverUserIsEligibleToAdd,
  serverLimitReason,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canViewMeters = true,
}: WohnungenClientViewProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<"apartments" | "overview">("apartments");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reloadRef = useRef<(() => void) | null>(null);
  const apartments = initialWohnungenData;
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
    
    const stats = apartments.reduce((acc, a) => {
      if (a.status === "frei") acc.freeCount++;
      
      const rent = a.miete ?? 0;
      if (rent > 0) {
        acc.totalRent += rent;
        acc.rentCount++;
      }
      
      const size = a.groesse ?? 0;
      if (size > 0) {
        acc.totalSize += size;
        acc.sizeCount++;
        if (rent > 0) {
          acc.totalPricePerSqm += rent / size;
          acc.pricePerSqmCount++;
        }
      }
      
      return acc;
    }, {
      freeCount: 0,
      totalRent: 0,
      rentCount: 0,
      totalSize: 0,
      sizeCount: 0,
      totalPricePerSqm: 0,
      pricePerSqmCount: 0
    });

    return {
      total,
      freeCount: stats.freeCount,
      rentedCount: total - stats.freeCount,
      avgRent: stats.rentCount ? stats.totalRent / stats.rentCount : 0,
      avgPricePerSqm: stats.pricePerSqmCount ? stats.totalPricePerSqm / stats.pricePerSqmCount : 0,
      totalSize: stats.totalSize,
      avgSize: stats.sizeCount ? stats.totalSize / stats.sizeCount : 0
    };
  }, [apartments]);

  const limitReached = serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity;
  const isAddButtonDisabled = !canCreate || !serverUserIsEligibleToAdd || limitReached;

  let buttonTooltipMessage = "";
  if (!canCreate) {
    buttonTooltipMessage = "Keine Berechtigung zum Erstellen";
  } else if (!serverUserIsEligibleToAdd) {
    buttonTooltipMessage = "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen.";
  } else if (limitReached) {
    if (serverLimitReason === 'trial') {
      buttonTooltipMessage = `Maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihre Testphase erreicht.`;
    } else if (serverLimitReason === 'subscription') {
      buttonTooltipMessage = `Sie haben die maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihr aktuelles Abonnement erreicht.`;
    } else {
      buttonTooltipMessage = "Das Wohnungslimit ist erreicht.";
    }
  }

  const updateApartmentInList = useCallback((updatedApartment: Wohnung) => {
    router.refresh();
  }, [router]);

  const refreshTable = useCallback(async (): Promise<void> => {
    router.refresh();
    window.dispatchEvent(new CustomEvent('refresh-sidebar-insights'));
  }, [router]);

  // Dispatch initial statistics refresh to the sidebar on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('refresh-sidebar-insights'));
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
      const existingApt = apartments.find(a => a.id === apartment.id);
      if (existingApt) {
        openWohnungModal(existingApt, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
        return;
      }

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
  }, [apartments, openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  const handleEditWohnungRef = useRef(handleEditWohnung);
  handleEditWohnungRef.current = handleEditWohnung;
  const apartmentsRef = useRef(apartments);
  apartmentsRef.current = apartments;

  useEffect(() => {
    const handleEditApartmentListener = async (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      try {
        const existingApt = apartmentsRef.current.find(a => a.id === apartmentId);
        if (existingApt) {
          handleEditWohnungRef.current(existingApt);
          return;
        }

        const supabase = createBrowserClient();
        const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartmentId).single();
        if (error || !aptToEdit) { console.error('Wohnung nicht gefunden oder Fehler:', error?.message); return; }
        const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
        handleEditWohnungRef.current(transformedApt);
      } catch (error) { console.error('Fehler beim Laden der Wohnung für Event-Edit:', error); }
    };
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    return () => window.removeEventListener('edit-apartment', handleEditApartmentListener);
  }, []);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* 2-way sliding toggle */}
      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0">
        <motion.button
          layout
          type="button"
          onClick={() => setCurrentTab("apartments")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "apartments" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "apartments" && (
            <motion.div
              layoutId="active-wohnungen-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Home className="size-4 shrink-0 transition-transform duration-300" />
          <span>Wohnungen</span>
        </motion.button>

        <motion.button
          layout
          type="button"
          onClick={() => setCurrentTab("overview")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "overview" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "overview" && (
            <motion.div
              layoutId="active-wohnungen-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BarChart3 className="size-4 shrink-0 transition-transform duration-300" />
          <span>Übersicht</span>
        </motion.button>
      </div>

      {currentTab === "apartments" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 animate-in fade-in duration-300">
            <StatCard
              title="Wohnungen gesamt"
              value={summary.total}
              icon={<Home className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Frei / Vermietet"
              value={`${summary.freeCount} / ${summary.rentedCount}`}
              icon={<Key className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Miete"
              value={summary.avgRent}
              unit="€"
              decimals
              icon={<Euro className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Preis pro m²"
              value={summary.avgPricePerSqm}
              unit="€/m²"
              decimals
              icon={<Ruler className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] animate-in fade-in duration-300">
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
                    icon={<PlusCircle className="size-4" />}
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
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAssignDialogOpen(true)}
                        className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Building2 className="size-4" />
                        <span className="hidden sm:inline">Haus zuweisen</span>
                        <span className="sm:hidden">Zuweisen</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkExport}
                        className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Download className="size-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                        <span className="sm:hidden">Export</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        disabled={isBulkDeleting || !canDelete}
                        className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        {isBulkDeleting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span className="hidden sm:inline">Löschen...</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="size-4" />
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
                canEdit={canEdit}
                canDelete={canDelete}
                canViewMeters={canViewMeters}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Wohnungen gesamt"
              value={summary.total}
              icon={<Home className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Leerstandsquote"
              value={summary.total > 0 ? Number((summary.freeCount / summary.total * 100).toFixed(1)) : 0}
              unit="%"
              decimals
              icon={<Key className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Miete pro m²"
              value={summary.avgPricePerSqm}
              unit="€/m²"
              decimals
              icon={<Ruler className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Fläche Gesamt"
              value={summary.totalSize}
              unit="m²"
              icon={<Home className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          {/* Row 1: Details & Occupancy Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold">Wohnungsdetails & Mieteinnahmen</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-muted-foreground block mb-1">Mieteinnahmen (IST)</span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {currencyFormatter.format(apartments.filter(a => a.status !== "frei").reduce((sum, a) => sum + (a.miete ?? 0), 0))}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-muted-foreground block mb-1">Leerstand (Potential)</span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {currencyFormatter.format(apartments.filter(a => a.status === "frei").reduce((sum, a) => sum + (a.miete ?? 0), 0))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wohnungen</h4>
                  {apartments.map(a => (
                    <div key={a.id} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="font-medium">{a.name} ({a.Haeuser?.name || 'Kein Haus'})</span>
                      <span className="text-muted-foreground text-xs">{a.groesse} m² • {currencyFormatter.format(a.miete ?? 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-semibold">Belegungs- & Verfügbarkeitsstatus</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 min-h-[260px]">
                <ApartmentsOccupancyDonutChart apartments={apartments} />
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Size Distribution Chart & €/m² Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-semibold">Größenverteilung der Wohnungen</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 min-h-[260px]">
                <ApartmentsSizeDonutChart apartments={apartments} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-semibold">Durchschnittliche Quadratmetermiete nach Größenklasse</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 min-h-[260px]">
                <ApartmentsRentPerSqmBarChart apartments={apartments} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
