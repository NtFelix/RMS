"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, X, FileSpreadsheet, Building2, Euro, Ruler, Percent, Activity, BarChart3 } from "lucide-react";
import { CreateAbrechnungDropdown } from "@/components/abrechnung/create-abrechnung-dropdown";
import { OperatingCostsFilters } from "@/components/finance/operating-costs-filters";
import { OperatingCostsTable } from "@/components/tables/operating-costs-table";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/common/stat-card";
import { NebenkostenDonutChart, BaseDonutChart } from "@/components/dashboard/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";

import { Haus } from "../../../lib/data-fetching"; // Ensure correct path
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten";
import { deleteNebenkosten as deleteNebenkostenServerAction } from "@/app/betriebskosten-actions"; // Fixed path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store"; // Added import
import { useRouter } from "next/navigation"; // Added import
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from '@/constants/guide'; // Added import
import { getCookie, setCookie } from "@/utils/cookies";

// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: OptimizedNebenkosten[];
  initialHaeuser: Haus[];
  ownerName: string;
}

export default function BetriebskostenClientView({
  initialNebenkosten,
  initialHaeuser,
  ownerName,
}: BetriebskostenClientViewProps) {
  const [currentTab, setCurrentTab] = useState<"costs" | "overview">("costs");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("all");
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<OptimizedNebenkosten[]>(initialNebenkosten);
  // isModalOpen and editingNebenkosten are now managed by useModalStore
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { openBetriebskostenModal } = useModalStore(); // Get the action to open modal
  const { toast } = useToast();
  // Define router for potential refresh, though modal might handle it
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [houseSearch, setHouseSearch] = useState("");
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Compute stats for operating costs dashboard
  const nebenkostenStats = useMemo(() => {
    if (!initialNebenkosten || initialNebenkosten.length === 0) {
      return {
        totalCosts: 0,
        billsCount: 0,
        avgCostPerBill: 0,
        avgCostPerSqm: 0,
        categoryTotals: {} as Record<string, number>,
        housesCoverage: 0,
        houseBreakdown: [] as any[]
      }
    }

    let totalCosts = 0
    const categoryTotals: Record<string, number> = {}
    const houseIdsWithNebenkosten = new Set<string>()
    const houseCostsMap: Record<string, number> = {}

    initialNebenkosten.forEach(item => {
      if (item.haeuser_id) {
        houseIdsWithNebenkosten.add(item.haeuser_id)
      }

      const arten = item.nebenkostenart || []
      const betraege = item.betrag || []
      let billSum = 0

      arten.forEach((art: string, idx: number) => {
        const amount = Number(betraege[idx] || 0)
        if (amount > 0) {
          billSum += amount
          const cleanArt = art.trim()
          categoryTotals[cleanArt] = (categoryTotals[cleanArt] || 0) + amount
        }
      })

      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0)
          if (amount > 0) {
            totalCosts += amount
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
            categoryTotals[capitalizedKey] = (categoryTotals[capitalizedKey] || 0) + amount
            if (item.haeuser_id) {
              houseCostsMap[item.haeuser_id] = (houseCostsMap[item.haeuser_id] || 0) + amount
            }
          }
        })
      }

      totalCosts += billSum
      if (item.haeuser_id) {
        houseCostsMap[item.haeuser_id] = (houseCostsMap[item.haeuser_id] || 0) + billSum
      }
    })

    const billsCount = initialNebenkosten.length
    const avgCostPerBill = billsCount > 0 ? Math.round(totalCosts / billsCount) : 0

    const totalArea = initialHaeuser.reduce((sum, h) => {
      let displaySize = 0;
      if (h.groesse && !isNaN(Number(h.groesse))) {
        displaySize = Number(h.groesse)
      }
      return sum + displaySize
    }, 0)

    const avgCostPerSqm = totalArea > 0 ? Number((totalCosts / totalArea).toFixed(2)) : 0
    
    const housesCoverage = initialHaeuser.length > 0
      ? Math.round((houseIdsWithNebenkosten.size / initialHaeuser.length) * 100)
      : 0

    // Construct the breakdown per house
    const houseBreakdown = initialHaeuser.map(h => {
      const costs = houseCostsMap[h.id] || 0;
      const size = Number(h.groesse) || 0;
      const costPerSqm = size > 0 ? Number((costs / size).toFixed(2)) : 0;
      const coverageStatus = houseIdsWithNebenkosten.has(h.id) ? "Erfasst" : "Offen";
      const shareRatio = totalCosts > 0 ? Math.round((costs / totalCosts) * 100) : 0;

      return {
        id: h.id,
        name: h.name,
        size,
        costs,
        costPerSqm,
        coverageStatus,
        shareRatio
      }
    }).sort((a, b) => b.costs - a.costs);

    return {
      totalCosts,
      billsCount,
      avgCostPerBill,
      avgCostPerSqm,
      categoryTotals,
      housesCoverage,
      houseBreakdown
    }
  }, [initialNebenkosten, initialHaeuser])

  const donutData = useMemo(() => {
    return Object.entries(nebenkostenStats.categoryTotals).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [nebenkostenStats.categoryTotals]);

  const donutColors = [
    "hsl(var(--primary))",
    "hsl(217.2 91.2% 59.8%)",
    "hsl(142.1 76.2% 36.3%)",
    "hsl(47.9 95.8% 51.2%)",
    "hsl(0 84.2% 60.2%)",
    "hsl(292.2 84.1% 60.6%)",
    "hsl(173.4 80.4% 40%)",
  ];


  useEffect(() => {
    let result = initialNebenkosten;
    if (selectedHouseId && selectedHouseId !== "all") {
      result = result.filter(item => item.haeuser_id === selectedHouseId);
    }
    if (searchQuery) {
      result = result.filter(item =>
        item.startdatum?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.enddatum?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.haus_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nebenkostenart && item.nebenkostenart.join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear();
      const currentYearStart = `${currentYear}-01-01`;
      const currentYearEnd = `${currentYear}-12-31`;
      result = result.filter(item =>
        item.startdatum && item.enddatum &&
        item.startdatum <= currentYearEnd && item.enddatum >= currentYearStart
      );
    } else if (filter === "previous") {
      const currentYear = new Date().getFullYear();
      const currentYearStart = `${currentYear}-01-01`;
      result = result.filter(item =>
        item.enddatum && item.enddatum < currentYearStart
      );
    }
    setFilteredNebenkosten(result);
  }, [searchQuery, filter, initialNebenkosten, selectedHouseId]);

  const handleOpenCreateModal = useCallback((templateType: 'blank' | 'previous' | 'default' = 'blank') => {
    // Pass initialHaeuser and a success callback (e.g., to refresh data)
    openBetriebskostenModal(
      templateType !== 'blank' ? { useTemplate: templateType } : null,
      initialHaeuser,
      () => {
        // This callback is called on successful save from the modal
        router.refresh();
      }
    );
  }, [openBetriebskostenModal, initialHaeuser, router]);

  const handleOpenBlankModal = useCallback(() => handleOpenCreateModal('blank'), [handleOpenCreateModal]);
  const handleOpenPreviousTemplateModal = useCallback(() => handleOpenCreateModal('previous'), [handleOpenCreateModal]);
  const handleOpenDefaultTemplateModal = useCallback(() => handleOpenCreateModal('default'), [handleOpenCreateModal]);

  const handleOpenEditModal = useCallback((item: OptimizedNebenkosten) => {
    // Convert OptimizedNebenkosten to Nebenkosten format for the modal
    const nebenkostenItem = {
      ...item,
      Haeuser: { name: item.haus_name },
      gesamtFlaeche: item.gesamt_flaeche,
      anzahlWohnungen: item.anzahl_wohnungen,
      anzahlMieter: item.anzahl_mieter
    };
    openBetriebskostenModal(nebenkostenItem, initialHaeuser, () => {
      router.refresh(); // Example refresh
    });
  }, [openBetriebskostenModal, initialHaeuser, router]);

  // handleCloseModal is no longer needed as the modal store handles closing.

  const openDeleteAlert = useCallback((itemId: string) => {
    setSelectedItemIdForDelete(itemId);
    setIsDeleteAlertOpen(true);
  }, []);

  const handleDeleteDialogOnOpenChange = useCallback((open: boolean) => {
    setIsDeleteAlertOpen(open);
    if (!open) {
      setSelectedItemIdForDelete(null);
    }
  }, []);

  const executeDelete = useCallback(async () => {
    if (!selectedItemIdForDelete) return;
    const result = await deleteNebenkostenServerAction(selectedItemIdForDelete);
    if (result.success) {
      toast({
        title: "Erfolg",
        description: "Nebenkosten-Eintrag erfolgreich gelöscht.",
        variant: "success"
      });
      setFilteredNebenkosten(prev => prev.filter(item => item.id !== selectedItemIdForDelete));
    } else {
      toast({
        title: "Fehler",
        description: result.message || "Eintrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  }, [selectedItemIdForDelete, toast]);

  const scrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Initialize guide visibility from cookie
  useEffect(() => {
    const hidden = getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE);
    if (hidden === 'true') {
      setShowGuide(false);
    } else {
      setShowGuide(true);
    }
  }, []);

  // React to settings changes via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ hidden: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.hidden === 'boolean') {
        setShowGuide(!customEvent.detail.hidden);
      } else {
        console.warn('Received betriebskosten-guide-visibility-changed event without expected detail.hidden boolean');
      }
    };
    window.addEventListener(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, handler as EventListener);
    return () => window.removeEventListener(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, handler as EventListener);
  }, []);

  const handleDismissGuide = useCallback(() => {
    setCookie(BETRIEBSKOSTEN_GUIDE_COOKIE, 'true', 365);
    setShowGuide(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, { detail: { hidden: true } }));
    }
  }, []);

  // Instruction steps data
  const instructionSteps = [
    {
      id: 1,
      title: 'Abrechnung anlegen',
      description: 'Erstelle eine neue Betriebskostenabrechnung für ein Jahr und ein Haus.',
    },
    {
      id: 2,
      title: 'Drei-Punkte-Menü öffnen',
      description: 'Klicke auf die drei Punkte (⋮) in der Aktionen-Spalte einer Abrechnungszeile.',
    },
    {
      id: 3,
      title: 'Zähler eintragen',
      description: 'Wähle "Zähler" aus dem Menü und erfasse die Zählerstände.',
    },
    {
      id: 4,
      title: 'Übersicht prüfen',
      description: 'Wähle "Übersicht" um Details und Plausibilitäten zu kontrollieren.',
    },
    {
      id: 5,
      title: 'Abrechnung erstellen',
      description: 'Wähle "Abrechnung erstellen" um die finale Abrechnung pro Mieter zu generieren.',
    }
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* Visual Toggle Pill */}
      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0">
        <motion.button
          layout
          onClick={() => setCurrentTab("costs")}
          className={cn(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
            currentTab === "costs" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {currentTab === "costs" && (
            <motion.div
              layoutId="active-betriebskosten-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <FileSpreadsheet className="h-4 w-4 shrink-0 transition-transform duration-300" />
          <span>Betriebskosten</span>
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
              layoutId="active-betriebskosten-tab-pill"
              className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BarChart3 className="h-4 w-4 shrink-0 transition-transform duration-300" />
          <span>Übersicht</span>
        </motion.button>
      </div>

      {currentTab === "costs" ? (
        <>
          {/* Instruction Guide */}
          {showGuide && (
            <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Anleitung: Betriebskostenabrechnung</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Folge diesen Schritten, um eine vollständige Betriebskostenabrechnung zu erstellen
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissGuide}
                    className="text-muted-foreground -mt-1"
                  >
                    <X className="h-4 w-4 mr-1" /> Ausblenden
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instructionSteps.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary dark:text-primary-foreground">{index + 1}</span>
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <CreateAbrechnungDropdown
                    onBlankClick={handleOpenBlankModal}
                    onPreviousClick={handleOpenPreviousTemplateModal}
                    onTemplateClick={handleOpenDefaultTemplateModal}
                    className="flex-1"
                    buttonText="Neue Abrechnung erstellen"
                  />
                  <Button
                    variant="outline"
                    onClick={scrollToTable}
                    className="flex-1"
                  >
                    Zur Tabelle springen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Area including Card, Table, Modals */}
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
            <CardHeader>
              <div className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Betriebskostenübersicht</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Betriebskostenabrechnungen</p>
                </div>
                <div className="mt-1">
                  <CreateAbrechnungDropdown
                    onBlankClick={handleOpenBlankModal}
                    onPreviousClick={handleOpenPreviousTemplateModal}
                    onTemplateClick={handleOpenDefaultTemplateModal}
                    buttonText="Betriebskostenabrechnung erstellen"
                    className="sm:w-auto"
                  />
                </div>
              </div>
            </CardHeader>
            <div className="px-6">
              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
            </div>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 mt-6">
                <OperatingCostsFilters
                  onFilterChange={setFilter}
                  onSearchChange={setSearchQuery}
                  onHouseChange={setSelectedHouseId}
                  haeuser={initialHaeuser}
                  selectedHouseId={selectedHouseId}
                  searchQuery={searchQuery}
                />
              </div>
              <div ref={tableRef}>
                <OperatingCostsTable
                  nebenkosten={filteredNebenkosten}
                  onEdit={handleOpenEditModal}
                  onDeleteItem={openDeleteAlert}
                  ownerName={ownerName}
                  allHaeuser={initialHaeuser}
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Gesamtkosten"
              value={nebenkostenStats.totalCosts}
              unit="€"
              decimals
              icon={<Euro className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Abrechnungen"
              value={nebenkostenStats.billsCount}
              unit="Jahre"
              icon={<FileSpreadsheet className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Betriebskosten-Index"
              value={nebenkostenStats.avgCostPerSqm}
              unit="€/m²"
              decimals
              icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø pro Abrechnung"
              value={nebenkostenStats.avgCostPerBill}
              unit="€"
              decimals
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          {/* Two-Column Analytics Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: House breakdown leaderboard */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Objekt-Betriebskostenanalyse</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gesamte Betriebskosten und Quadratmeter-Belastung je Liegenschaft
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0">
                {/* Compact Search */}
                <div className="mb-4 shrink-0">
                  <SearchInput
                    placeholder="Haus suchen..."
                    value={houseSearch}
                    onChange={(e) => setHouseSearch(e.target.value)}
                    onClear={() => setHouseSearch("")}
                    sizeVariant="sm"
                    wrapperClassName="w-full"
                  />
                </div>

                {/* List Container */}
                <div className="space-y-2.5 overflow-y-auto pr-2 custom-scrollbar h-[250px]">
                  {nebenkostenStats.houseBreakdown
                    .filter(h => h.name.toLowerCase().includes(houseSearch.toLowerCase()))
                    .map((house) => {
                      const hasCosts = house.costs > 0;
                      return (
                        <div 
                          key={house.id}
                          className="group flex items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 hover:shadow-xs transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                              <Building2 className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block transition-colors duration-200">
                                {house.name}
                              </span>
                              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                {house.size} m² • Betriebskosten-Index: {house.costPerSqm} €/m²
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {/* mini progress bar */}
                            {hasCosts && (
                              <div className="hidden sm:block h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className="h-full rounded-full bg-accent"
                                  style={{ width: `${house.shareRatio}%` }}
                                />
                              </div>
                            )}
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs transition-colors duration-200 shrink-0",
                              hasCosts
                                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" 
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            )}>
                              {hasCosts 
                                ? house.costs.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                                : 'Keine Kosten'
                              }
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                house.coverageStatus === "Erfasst"
                                  ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0.5 px-2"
                                  : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0.5 px-2"
                              )}
                            >
                              {house.coverageStatus}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Right Box: Enhanced Donut Chart Distribution */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Betriebskosten-Verteilung</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prozentuale Aufteilung der einzelnen Nebenkostenarten
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 justify-between gap-6">
                <div className="flex-1 flex flex-col justify-between gap-5">
                  {/* Centered Donut Chart */}
                  <div className="flex justify-center items-center py-2 shrink-0">
                    <div className="relative w-full h-[220px] flex items-center justify-center">
                      <BaseDonutChart
                        data={donutData}
                        colors={donutColors}
                        innerRadius={70}
                        outerRadius={90}
                        showLegend={false}
                        showTooltip={false}
                        onHoverSegment={setHoveredPieIndex}
                      />
                      
                      {/* Interactive Center Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center mt-0.5 px-3">
                        {hoveredPieIndex === null ? (
                          <>
                            <span className="font-black tracking-tight leading-none text-zinc-900 dark:text-zinc-100 text-lg transition-all duration-200">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(nebenkostenStats.totalCosts)}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
                              Gesamtkosten
                            </span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                              {donutData.length} Kategorien
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-black tracking-tight leading-none text-primary transition-all duration-200 font-bold">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(donutData[hoveredPieIndex]?.value || 0)}
                            </span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1.5 truncate max-w-[120px]">
                              {donutData[hoveredPieIndex]?.name}
                            </span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                              {nebenkostenStats.totalCosts > 0 ? Math.round(((donutData[hoveredPieIndex]?.value || 0) / nebenkostenStats.totalCosts) * 100) : 0}% Anteil
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spacious 3-Column Statistics Bar */}
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-2xl p-4 text-center shrink-0">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Abdeckung</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {nebenkostenStats.housesCoverage}%
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-1 border-x border-zinc-200/50 dark:border-zinc-800/30">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Ø Index</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {nebenkostenStats.avgCostPerSqm} €/m²
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Erfasst</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {Math.round((nebenkostenStats.housesCoverage / 100) * initialHaeuser.length)} / {initialHaeuser.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationAlertDialog
        isOpen={isDeleteAlertOpen}
        onOpenChange={handleDeleteDialogOnOpenChange}
        onConfirm={executeDelete}
        title="Löschen Bestätigen"
        description="Sind Sie sicher, dass Sie diesen Nebenkosten-Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmButtonText="Löschen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </div>
  );
}
