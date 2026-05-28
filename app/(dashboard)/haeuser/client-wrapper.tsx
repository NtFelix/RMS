"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { PlusCircle, Building, Home, Key, X, Download, Trash2, Loader2, FileSpreadsheet, Building2, BarChart3, Wallet, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/common/stat-card";
import { HouseTable, House } from "@/components/tables/house-table";
import { useModalStore } from "@/hooks/use-modal-store";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { HousesDonutChart } from "@/components/dashboard/dashboard-charts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Props for the main client view component
interface HaeuserClientViewProps {
  enrichedHaeuser: House[]; // Assuming enrichedHaeuser is an array of House
}





// This is the new main client component, combining logic from old HaeuserPageClientComponent and HaeuserClientWrapper
export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<"houses" | "overview">("houses");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const tableReloadRef = useRef<() => void>(null);
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    if (tableReloadRef.current) {
      tableReloadRef.current();
    }
  }, []);

  const handleAdd = useCallback(() => {
    try {
      openHouseModal(undefined, refreshTable);
    } catch (error) {
      console.error('Error opening house modal:', error);
    }
  }, [openHouseModal, refreshTable]);

  const handleEdit = useCallback(
    (house: House) => {
      try {
        openHouseModal(house, refreshTable);
      } catch (error) {
        console.error('Error opening house modal:', error);
      }
    },
    [openHouseModal, refreshTable]
  );

  // ===== Summary metrics =====
  const summary = useMemo(() => {
    const totalHouses = enrichedHaeuser.length;
    const totalApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.totalApartments ?? 0), 0);
    const freeApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.freeApartments ?? 0), 0);
    
    // Average size
    const totalSize = enrichedHaeuser.reduce((sum, h) => {
      const sizeVal = parseFloat(String(h.size || 0));
      return sum + (isNaN(sizeVal) ? 0 : sizeVal);
    }, 0);
    const avgSize = totalHouses > 0 ? Math.round(totalSize / totalHouses) : 0;

    // Average Rent
    const totalRent = enrichedHaeuser.reduce((sum, h) => {
      const rentVal = parseFloat(String(h.rent || 0));
      return sum + (isNaN(rentVal) ? 0 : rentVal);
    }, 0);
    const avgRent = totalHouses > 0 ? Math.round(totalRent / totalHouses) : 0;

    return { totalHouses, totalApartments, freeApartments, totalSize, avgSize, totalRent, avgRent };
  }, [enrichedHaeuser]);

  // ===== Financial Yield & Vacancy Computations =====
  const financialMetrics = useMemo(() => {
    let totalSollMiete = 0;
    let totalIstMiete = 0;
    let totalLeerstandskosten = 0;

    enrichedHaeuser.forEach(h => {
      // Parse rent string (e.g. "1.200,00" or similar) into number
      const rentNum = parseFloat(String(h.rent || "0").replace(/\./g, "").replace(/,/g, "."));
      const totalApts = h.totalApartments || 0;
      const freeApts = h.freeApartments || 0;
      
      totalSollMiete += rentNum;
      if (totalApts > 0) {
        const occupiedApts = totalApts - freeApts;
        totalIstMiete += rentNum * (occupiedApts / totalApts);
        totalLeerstandskosten += rentNum * (freeApts / totalApts);
      }
    });

    return {
      sollMiete: totalSollMiete,
      istMiete: totalIstMiete,
      leerstandskosten: totalLeerstandskosten,
      vacancyRate: totalSollMiete > 0 ? (totalLeerstandskosten / totalSollMiete) * 100 : 0
    };
  }, [enrichedHaeuser]);

  // ===== Geospatial Location Grouping Computations =====
  const locationClusters = useMemo(() => {
    const clusters: Record<string, { count: number; size: number; totalApts: number; freeApts: number }> = {};
    
    enrichedHaeuser.forEach(h => {
      const city = h.ort?.trim() || "Unbekannt";
      const sizeVal = parseFloat(String(h.size || 0));
      
      if (!clusters[city]) {
        clusters[city] = { count: 0, size: 0, totalApts: 0, freeApts: 0 };
      }
      clusters[city].count += 1;
      clusters[city].size += isNaN(sizeVal) ? 0 : sizeVal;
      clusters[city].totalApts += h.totalApartments || 0;
      clusters[city].freeApts += h.freeApartments || 0;
    });

    return Object.entries(clusters).map(([city, data]) => ({
      city,
      ...data,
      occupancyRate: data.totalApts > 0 ? Math.round(((data.totalApts - data.freeApts) / data.totalApts) * 100) : 100
    }));
  }, [enrichedHaeuser]);

  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedHousesData = enrichedHaeuser.filter(h => selectedHouses.has(h.id))

    const headers = ['Haus', 'Ort', 'Größe (m²)', 'Miete (€)', '€/m²', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedHousesData.map(h => {
      const row = [
        h.name,
        h.ort || '',
        h.size || '',
        h.rent || '',
        h.pricePerSqm || '',
        `${(h.totalApartments ?? 0) - (h.freeApartments ?? 0)}/${h.totalApartments ?? 0} belegt`
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `haeuser_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedHouses.size} Häuser exportiert.`,
      variant: "success",
    })
  }, [selectedHouses, enrichedHaeuser, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedHouses.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Haus zum Löschen aus.",
        variant: "destructive",
      });
      return;
    }

    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedHouses);

    try {
      const response = await fetch('/api/haeuser/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Häuser.');
      }

      const { successCount } = await response.json();

      toast({
        title: "Erfolg",
        description: `${successCount} Häuser erfolgreich gelöscht.`,
        variant: "success",
      });

      refreshTable();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Häuser aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setSelectedHouses(new Set());
    }
  }, [selectedHouses, router, refreshTable]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* 2-way sliding toggle */}
      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0">
        <motion.button
          layout
          onClick={() => setCurrentTab("houses")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "houses" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "houses" && (
            <motion.div
              layoutId="active-haeuser-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Building2 className="h-4 w-4 shrink-0 transition-transform duration-300" />
          <span>Häuser</span>
        </motion.button>

        <motion.button
          layout
          onClick={() => setCurrentTab("overview")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "overview" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "overview" && (
            <motion.div
              layoutId="active-haeuser-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BarChart3 className="h-4 w-4 shrink-0 transition-transform duration-300" />
          <span>Übersicht</span>
        </motion.button>
      </div>

      {currentTab === "houses" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 animate-in fade-in duration-300">
            <StatCard
              title="Häuser gesamt"
              value={summary.totalHouses}
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Wohnungen gesamt"
              value={summary.totalApartments}
              icon={<Home className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Freie Wohnungen"
              value={summary.freeApartments}
              icon={<Key className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] animate-in fade-in duration-300">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Hausverwaltung</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Verwalten Sie hier alle Ihre Häuser</p>
                </div>
                <div className="mt-0 sm:mt-1">
                  <ResponsiveButtonWithTooltip
                    id="create-object-btn"
                    onClick={() => {
                      useOnboardingStore.getState().completeStep('create-house-start');
                      handleAdd();
                    }}
                    icon={<PlusCircle className="h-4 w-4" />}
                    shortText="Hinzufügen"
                  >
                    Haus hinzufügen
                  </ResponsiveButtonWithTooltip>
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
                      { value: "all", shortLabel: "Alle", fullLabel: "Alle Häuser" },
                      { value: "full", shortLabel: "Belegt", fullLabel: "Voll belegt" },
                      { value: "vacant", shortLabel: "Frei", fullLabel: "Mit freien Wohnungen" },
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
                {selectedHouses.size > 0 && (
                  <div className="p-3 sm:p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => setSelectedHouses(new Set())}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="font-medium text-sm">
                          {selectedHouses.size} <span className="hidden sm:inline">{selectedHouses.size === 1 ? 'Haus' : 'Häuser'}</span> ausgewählt
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedHouses(new Set())}
                        className="h-8 px-2 hover:bg-primary/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkExport}
                        className="h-8 gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Exportieren</span>
                        <span className="sm:hidden">Export</span>
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
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Löschen ({selectedHouses.size})</span>
                            <span className="sm:hidden">{selectedHouses.size}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <HouseTable
                filter={filter}
                searchQuery={searchQuery}
                reloadRef={tableReloadRef}
                onEdit={handleEdit}
                initialHouses={enrichedHaeuser}
                selectedHouses={selectedHouses}
                onSelectionChange={setSelectedHouses}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Häuser gesamt"
              value={summary.totalHouses}
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Wohnungen gesamt"
              value={summary.totalApartments}
              icon={<Home className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Hausgröße"
              value={summary.avgSize}
              unit="m²"
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Hausmiete"
              value={summary.avgRent}
              unit="€"
              decimals
              icon={<Key className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          {/* Chart and distribution card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold">Objektverteilung & Flächen</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-muted-foreground block mb-1">Fläche Gesamt</span>
                    <span className="text-xl font-bold">{summary.totalSize.toLocaleString('de-DE')} m²</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-muted-foreground block mb-1">Soll-Miete Gesamt</span>
                    <span className="text-xl font-bold">{(summary.avgRent * summary.totalHouses).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Flächen & Einheiten</h4>
                  {enrichedHaeuser.map(h => {
                    const occupied = (h.totalApartments ?? 0) - (h.freeApartments ?? 0);
                    const total = h.totalApartments ?? 0;
                    const isFullyOccupied = h.freeApartments === 0;

                    return (
                      <div 
                        key={h.id} 
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200"
                      >
                        {/* Left section: Icon and basic info */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                            <Building2 className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block group-hover:text-accent transition-colors duration-200">
                              {h.name}
                            </span>
                            {h.ort && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                {h.ort}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right section: Structured details grid */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
                          {/* Size */}
                          <div className="flex items-center gap-1 text-muted-foreground min-w-[70px]">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{h.size}</span>
                            <span className="text-[10px]">m²</span>
                          </div>

                          {/* Occupancy details */}
                          <div className="flex items-center gap-1.5 min-w-[90px]">
                            <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                              {occupied}/{total}
                            </span>
                            <span className="text-[10px] text-muted-foreground">belegt</span>
                          </div>

                          {/* Occupancy Status Badge */}
                          <div className="shrink-0 min-w-[90px] flex justify-end">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                isFullyOccupied
                                  ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0.5 px-2"
                                  : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0.5 px-2"
                              )}
                            >
                              {isFullyOccupied ? "Voll belegt" : `${h.freeApartments} frei`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-semibold">Wohnungsauslastung pro Haus</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 flex items-center justify-center">
                <HousesDonutChart houses={enrichedHaeuser} />
              </CardContent>
            </Card>
          </div>

          {/* Extended Portfolio Analytics Headline */}
          <div className="mt-6 sm:mt-10 mb-4 animate-in fade-in duration-300">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Erweiterte Portfolio-Analysen</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Detaillierte Auswertungen zu Renditepotenzial, Leerstandskosten und der geografischen Verteilung Ihrer Objekte</p>
          </div>

          {/* New Suggested Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* 1. Extended Financial Yield & Vacancy Card */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-accent shrink-0" />
                  Rendite- & Leerstands-Analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 flex flex-col justify-between gap-6">
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-2">
                  <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 flex flex-col justify-between">
                    <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1">Ist-Miete (Aktuell)</span>
                    <span className="text-sm sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {financialMetrics.istMiete.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] text-muted-foreground block mt-1 leading-none">Laufende Einnahmen</span>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-zinc-500/5 dark:bg-zinc-500/10 border border-zinc-200/10 dark:border-zinc-800/20 flex flex-col justify-between">
                    <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1">Soll-Miete (Soll)</span>
                    <span className="text-sm sm:text-lg font-bold text-zinc-700 dark:text-zinc-300 truncate">
                      {financialMetrics.sollMiete.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] text-muted-foreground block mt-1 leading-none">Maximales Potenzial</span>
                  </div>
                  <div className="p-3 sm:p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 flex flex-col justify-between">
                    <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1">Leerstandskosten</span>
                    <span className="text-sm sm:text-lg font-bold text-rose-600 dark:text-rose-400 truncate">
                      {financialMetrics.leerstandskosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] text-rose-500/70 block mt-1 leading-none">Aktueller Verlust</span>
                  </div>
                </div>

                {/* Progress bar representing occupancy yield */}
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Mietertragspotenzial</span>
                    <span className="text-accent">
                      {Math.round(100 - financialMetrics.vacancyRate)}% ausgeschöpft
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(100 - financialMetrics.vacancyRate)}%` }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                    Die aktuelle Leerstandsquote Ihres gesamten Portfolios beträgt <span className="font-semibold text-rose-600 dark:text-rose-400">{financialMetrics.vacancyRate.toFixed(1)}%</span>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Geospatial Location Clusters Card */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent shrink-0" />
                  Geografische Standorte
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 overflow-y-auto pr-1 max-h-[220px] custom-scrollbar">
                {locationClusters.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground italic">
                    Keine Standorte erfasst.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locationClusters.map((c) => (
                      <div key={c.city} className="space-y-1.5 p-3 rounded-2xl bg-zinc-100/40 dark:bg-zinc-900/10 border border-zinc-200/50 dark:border-zinc-800/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-accent" />
                            <span className="font-semibold text-xs sm:text-sm">{c.city}</span>
                          </div>
                          <Badge variant="outline" className={cn(
                            c.occupancyRate === 100 
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200/20 text-[9px] sm:text-xs"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200/20 text-[9px] sm:text-xs"
                          )}>
                            {c.count} {c.count === 1 ? 'Objekt' : 'Objekte'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                          <span>Fläche: {c.size.toLocaleString('de-DE')} m²</span>
                          <span>Einheiten: {c.totalApts - c.freeApts} / {c.totalApts} belegt</span>
                        </div>

                        {/* City occupancy progress bar */}
                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-accent rounded-full transition-all duration-300"
                            style={{ width: `${c.occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Häuser löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedHouses.size} Häuser löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedHouses.size} Häuser löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
