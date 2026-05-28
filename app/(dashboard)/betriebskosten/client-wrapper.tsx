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
import { NebenkostenDonutChart } from "@/components/dashboard/dashboard-charts";

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
      }
    }

    let totalCosts = 0
    const categoryTotals: Record<string, number> = {}
    const houseIdsWithNebenkosten = new Set<string>()

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
          }
        })
      }

      totalCosts += billSum
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

    return {
      totalCosts,
      billsCount,
      avgCostPerBill,
      avgCostPerSqm,
      categoryTotals,
      housesCoverage,
    }
  }, [initialNebenkosten, initialHaeuser])


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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Box: Progress Coverage */}
            <div className="lg:col-span-5 p-6 rounded-[2rem] border border-gray-200 dark:border-[#3C4251] bg-gray-50 dark:bg-[#22272e] shadow-xs flex flex-col gap-6 h-full">
              <div>
                <h3 className="font-bold text-lg text-zinc-950 dark:text-zinc-50">Objekt-Abdeckung</h3>
                <p className="text-xs text-muted-foreground mt-1">Status der Betriebskostenerfassung über Ihren gesamten Häuserbestand</p>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div className="flex justify-between items-center text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Abrechnungsquote</span>
                  <span className="text-accent text-lg">{nebenkostenStats.housesCoverage}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-200/50 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-accent dark:bg-accent rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${nebenkostenStats.housesCoverage}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">
                  Es sind Betriebskosten für {Math.round((nebenkostenStats.housesCoverage / 100) * initialHaeuser.length)} von {initialHaeuser.length} Häusern in Ihrem Portfolio erfasst.
                </div>
              </div>
            </div>

            {/* Right Box: Donut Chart Distribution */}
            <div className="lg:col-span-7 p-6 rounded-[2rem] border border-gray-200 dark:border-[#3C4251] bg-gray-50 dark:bg-[#22272e] shadow-xs">
              <div className="mb-4">
                <h3 className="font-bold text-lg text-zinc-950 dark:text-zinc-50">Betriebskosten-Verteilung</h3>
                <p className="text-xs text-muted-foreground mt-1">Prozentuale Aufteilung der einzelnen Nebenkostenarten im System</p>
              </div>
              <div className="w-full flex items-center justify-center p-2">
                <div className="w-full max-w-[340px]">
                  <NebenkostenDonutChart nebenkosten={initialNebenkosten} />
                </div>
              </div>
            </div>
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
