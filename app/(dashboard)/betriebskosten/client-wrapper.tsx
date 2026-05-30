"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, X, FileSpreadsheet, Building2, Euro, Ruler, Percent, Activity, BarChart3 } from "lucide-react";
import { CreateAbrechnungDropdown } from "@/components/abrechnung/create-abrechnung-dropdown";
import { OperatingCostsFilters } from "@/components/finance/operating-costs-filters";
import { OperatingCostsTable } from "@/components/tables/operating-costs-table";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/common/stat-card";
import { NebenkostenDonutChart, BaseDonutChart } from "@/components/dashboard/dashboard-charts";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

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
  const [hoveredHouseIndex, setHoveredHouseIndex] = useState<number | null>(null);

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
        uncoveredHouses: initialHaeuser,
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

    const uncoveredHouses = initialHaeuser.filter(h => !houseIdsWithNebenkosten.has(h.id))

    return {
      totalCosts,
      billsCount,
      avgCostPerBill,
      avgCostPerSqm,
      categoryTotals,
      housesCoverage,
      uncoveredHouses,
    }
  }, [initialNebenkosten, initialHaeuser])

  // Aggregated data for house cost distribution and year-over-year development
  const costAnalytics = useMemo(() => {
    if (!initialNebenkosten || initialNebenkosten.length === 0) {
      return {
        houseShares: [],
        yearlyDevelopment: [],
        totalAllTimeCosts: 0,
        houseNames: []
      };
    }

    const houseCostsMap: Record<string, number> = {};
    const yearlyHouseMap: Record<number, Record<string, number>> = {};
    const allHouses = new Set<string>();
    let totalAllTimeCosts = 0;

    initialNebenkosten.forEach(item => {
      const houseName = item.haus_name || "Unbekanntes Haus";
      allHouses.add(houseName);

      // Extract Year
      let year = new Date().getFullYear();
      if (item.startdatum) {
        const parsedYear = new Date(item.startdatum).getFullYear();
        if (!isNaN(parsedYear)) {
          year = parsedYear;
        }
      }

      // Calculate total item cost
      const arten = item.nebenkostenart || [];
      const betraege = item.betrag || [];
      let billSum = 0;

      arten.forEach((art: string, idx: number) => {
        const amount = Number(betraege[idx] || 0);
        if (amount > 0) {
          billSum += amount;
        }
      });

      let totalItemCost = billSum;
      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0);
          if (amount > 0) {
            totalItemCost += amount;
          }
        });
      }

      // Aggregate all-time costs per house
      houseCostsMap[houseName] = (houseCostsMap[houseName] || 0) + totalItemCost;
      totalAllTimeCosts += totalItemCost;

      // Aggregate yearly costs per house
      if (!yearlyHouseMap[year]) {
        yearlyHouseMap[year] = {};
      }
      yearlyHouseMap[year][houseName] = (yearlyHouseMap[year][houseName] || 0) + totalItemCost;
    });

    // Format houseShares for BaseDonutChart
    const houseShares = Object.entries(houseCostsMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Format yearlyDevelopment for Stacked Bar Chart
    const years = Object.keys(yearlyHouseMap).map(Number).sort((a, b) => a - b);
    const yearlyDevelopment = years.map(year => {
      const dataPoint: Record<string, any> = { year: String(year) };
      let yearTotal = 0;
      Array.from(allHouses).forEach(houseName => {
        const cost = yearlyHouseMap[year][houseName] || 0;
        dataPoint[houseName] = cost;
        yearTotal += cost;
      });
      dataPoint.total = yearTotal;
      return dataPoint;
    });

    return {
      houseShares,
      yearlyDevelopment,
      totalAllTimeCosts,
      houseNames: Array.from(allHouses)
    };
  }, [initialNebenkosten]);

  const categoriesData = useMemo(() => {
    const raw = Object.entries(nebenkostenStats.categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .filter(d => d.value > 0);
    raw.sort((a, b) => b.value - a.value);
    
    if (raw.length <= 6) return raw;
    const top5 = raw.slice(0, 5);
    const others = raw.slice(5).reduce((sum, d) => sum + d.value, 0);
    return [...top5, { name: "Andere", value: others }];
  }, [nebenkostenStats.categoryTotals]);

  // Aggregated data for legal deadlines and settlement balance prognosis
  const legalPrognosis = useMemo(() => {
    if (!initialNebenkosten || initialNebenkosten.length === 0) {
      return {
        deadlines: [],
        totalNachforderung: 0,
        totalGuthaben: 0,
        netBalance: 0
      };
    }

    const today = new Date();
    let totalNachforderung = 0;
    let totalGuthaben = 0;

    const deadlines = initialNebenkosten.map(item => {
      const houseName = item.haus_name || "Unbekanntes Haus";
      
      // Calculate total item cost
      const arten = item.nebenkostenart || [];
      const betraege = item.betrag || [];
      let billSum = 0;
      arten.forEach((art, idx) => {
        const amount = Number(betraege[idx] || 0);
        if (amount > 0) billSum += amount;
      });

      let totalItemCost = billSum;
      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0);
          if (amount > 0) totalItemCost += amount;
        });
      }

      // Estimate prepayments based on sqm area (standard 1.85 €/sqm/month)
      const estimatedPrepayments = (item.gesamt_flaeche || 120) * 1.85 * 12;
      const difference = totalItemCost - estimatedPrepayments;
      
      if (difference > 0) {
        totalNachforderung += difference;
      } else {
        totalGuthaben += Math.abs(difference);
      }

      // Calculate legal deadline (12 months after enddatum)
      let end = new Date();
      if (item.enddatum) {
        const parsedEnd = new Date(item.enddatum);
        if (!isNaN(parsedEnd.getTime())) {
          end = parsedEnd;
        }
      }

      const deadlineDate = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      let status: 'green' | 'amber' | 'red' | 'done' = 'green';
      if (daysRemaining < 0) {
        status = 'done';
      } else if (daysRemaining <= 30) {
        status = 'red';
      } else if (daysRemaining <= 90) {
        status = 'amber';
      }

      return {
        id: item.id,
        houseName,
        year: end.getFullYear(),
        daysRemaining,
        status,
        deadlineDate: deadlineDate.toLocaleDateString('de-DE')
      };
    }).sort((a, b) => {
      // Sort expired or critical deadlines first
      if (a.daysRemaining < 0 && b.daysRemaining >= 0) return 1;
      if (a.daysRemaining >= 0 && b.daysRemaining < 0) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    const netBalance = totalNachforderung - totalGuthaben;

    return {
      deadlines: deadlines.slice(0, 4), // limit to top 4 deadlines for visual layout
      totalNachforderung,
      totalGuthaben,
      netBalance
    };
  }, [initialNebenkosten]);


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

  const handleOpenCreateModalForHouse = useCallback((houseId: string) => {
    openBetriebskostenModal(
      { haeuser_id: houseId },
      initialHaeuser,
      () => {
        router.refresh();
      }
    );
  }, [openBetriebskostenModal, initialHaeuser, router]);

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
            {/* Left Box: Progress Coverage */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Objekt-Abdeckung</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Status der Betriebskostenerfassung über Ihren gesamten Häuserbestand</CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 justify-between gap-4">
                <div className="flex flex-col gap-4 shrink-0">
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

                {nebenkostenStats.uncoveredHouses.length > 0 && (
                  <div className="mt-2 flex-1 flex flex-col min-h-0">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2 shrink-0">
                      Ausstehende Häuser (Klicken zum Erstellen):
                    </span>
                    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[160px] flex-1">
                      {nebenkostenStats.uncoveredHouses.map((h, idx) => (
                        <div 
                          key={h.id || idx} 
                          onClick={() => handleOpenCreateModalForHouse(h.id)}
                          className="group flex items-center justify-between gap-4 p-2.5 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer animate-in fade-in duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                              <Building2 className="h-4 w-4 animate-in fade-in" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block transition-colors duration-200 truncate max-w-[120px] sm:max-w-[180px]">
                                {h.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground block mt-0.5">
                                Keine Abrechnung erfasst
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-accent/5 text-accent border border-accent/10 group-hover:bg-accent group-hover:text-white transition-all duration-200 shrink-0">
                            Abrechnung erstellen
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Box: Donut Chart Distribution */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Betriebskosten-Verteilung</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Prozentuale Aufteilung der einzelnen Nebenkostenarten im System</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-center min-h-0">
                <div className="w-full flex items-center justify-center py-2 flex-grow">
                  <div className="relative w-full h-[220px] flex items-center justify-center">
                    <BaseDonutChart
                      data={categoriesData}
                      valueFormatter={(val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)}
                      innerRadius={65}
                      outerRadius={85}
                      showLegend={true}
                      showTooltip={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: House cost share donut chart and year-over-year stacked bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Asymmetric House Share Donut Chart */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[350px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Kostenanteil nach Häusern</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Verteilung der gesamten Betriebskosten über Ihre verschiedenen Immobilien</CardDescription>
              </CardHeader>
              
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-center min-h-0">
                <div className="relative w-full h-[200px] flex items-center justify-center">
                  <BaseDonutChart
                    data={costAnalytics.houseShares}
                    colors={[
                      "hsl(var(--primary, 221.2 83.2% 53.3%))",
                      "hsl(var(--success, 142.1 76.2% 36.3%))",
                      "hsl(var(--destructive, 0 84.2% 60.2%))",
                      "hsl(200, 80%, 50%)",
                      "hsl(280, 80%, 50%)",
                      "hsl(40, 80%, 50%)"
                    ]}
                    innerRadius={65}
                    outerRadius={85}
                    showLegend={false}
                    showTooltip={false}
                    onHoverSegment={setHoveredHouseIndex}
                  />
                  
                  {/* Center Interactive Value */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center mt-0.5 px-3">
                    {hoveredHouseIndex === null ? (
                      <>
                        <span className="text-lg font-black tracking-tight leading-none text-zinc-900 dark:text-zinc-50 transition-all duration-200">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(costAnalytics.totalAllTimeCosts)}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
                          Gesamtkosten
                        </span>
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                          Alle Häuser
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-black tracking-tight leading-none text-primary transition-all duration-200">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(costAnalytics.houseShares[hoveredHouseIndex]?.value || 0)}
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1.5 truncate max-w-[120px]">
                          {costAnalytics.houseShares[hoveredHouseIndex]?.name || "Haus"}
                        </span>
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                          {Math.round(((costAnalytics.houseShares[hoveredHouseIndex]?.value || 0) / (costAnalytics.totalAllTimeCosts || 1)) * 100)}% Anteil
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Box: Year-over-Year Area Chart */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[350px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Betriebskosten-Entwicklung</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Verlauf der jährlichen Betriebskosten aufgeteilt nach Häusern</CardDescription>
              </CardHeader>
              
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 relative">
                <div className="w-full h-[220px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={costAnalytics.yearlyDevelopment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {costAnalytics.houseNames.map((houseName, index) => {
                          const colors = [
                            "hsl(var(--primary, 221.2 83.2% 53.3%))",
                            "hsl(var(--success, 142.1 76.2% 36.3%))",
                            "hsl(var(--destructive, 0 84.2% 60.2%))",
                            "hsl(200, 80%, 50%)",
                            "hsl(280, 80%, 50%)",
                            "hsl(40, 80%, 50%)"
                          ];
                          const color = colors[index % colors.length];
                          const cleanId = `color-${houseName.replace(/[^a-zA-Z0-9]/g, '')}`;
                          return (
                            <linearGradient key={houseName} id={cleanId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(228, 228, 231, 0.1)" />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value.toLocaleString('de-DE')} €`}
                        tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => [`${value.toLocaleString('de-DE')} €`]}
                        labelFormatter={(label) => `Jahr: ${label}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e4e4e7',
                          borderRadius: '1rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#18181b'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      {costAnalytics.houseNames.map((houseName, index) => {
                        const colors = [
                          "hsl(var(--primary, 221.2 83.2% 53.3%))",
                          "hsl(var(--success, 142.1 76.2% 36.3%))",
                          "hsl(var(--destructive, 0 84.2% 60.2%))",
                          "hsl(200, 80%, 50%)",
                          "hsl(280, 80%, 50%)",
                          "hsl(40, 80%, 50%)"
                        ];
                        const color = colors[index % colors.length];
                        const cleanId = `color-${houseName.replace(/[^a-zA-Z0-9]/g, '')}`;
                        return (
                          <Area 
                            key={houseName} 
                            type="monotone"
                            dataKey={houseName} 
                            stackId="a" 
                            stroke={color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#${cleanId})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Suggested Plausibilitäts-Audit and Energy Cost Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Plausibilitäts-Audit (Benchmark) */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Plausibilitäts-Audit</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Vergleich Ihres Portfolios mit dem deutschen Betriebskostenspiegel (~2,50 €/m²/Monat)</CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-5 my-auto py-4">
                  {/* Monthly cost index */}
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                        {((nebenkostenStats.avgCostPerSqm / (nebenkostenStats.billsCount || 1)) / 12).toFixed(2)} €
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold block mt-0.5">Ihr Portfoliowert / Monat</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-3 py-1 rounded-full border shadow-xs",
                      ((nebenkostenStats.avgCostPerSqm / (nebenkostenStats.billsCount || 1)) / 12) < 2.50
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}>
                      {((nebenkostenStats.avgCostPerSqm / (nebenkostenStats.billsCount || 1)) / 12) < 2.50 ? "Wirtschaftlich" : "Erhöht"}
                    </span>
                  </div>

                  {/* Benchmark slider */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-zinc-200/50 dark:bg-zinc-800/80 rounded-full overflow-hidden relative shadow-inner">
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full transition-all duration-700" 
                        style={{ 
                          width: `${Math.min(100, (((nebenkostenStats.avgCostPerSqm / (nebenkostenStats.billsCount || 1)) / 12) / 3.50) * 100)}%` 
                        }} 
                      />
                      <div className="absolute top-0 bottom-0 left-[71%] w-0.5 bg-rose-500/80 z-10 shadow-xs" title="Benchmark (2,50 €)" />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Sparsam</span>
                      <span className="text-rose-500 font-extrabold">Benchmark (2,50 €)</span>
                      <span>Teuer</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-auto">
                  {((nebenkostenStats.avgCostPerSqm / (nebenkostenStats.billsCount || 1)) / 12) < 2.50 
                    ? "✓ Die Kosten liegen im grünen Bereich. Die Abrechnung ist rechtlich unbedenklich und entspricht dem Wirtschaftlichkeitsgebot."
                    : "⚠ Die Kosten liegen über dem Schnitt. Überprüfen Sie Verträge mit Dienstleistern (z. B. Reinigung, Gartenpflege) zur Kostenoptimierung."
                  }
                </p>
              </CardContent>
            </Card>

            {/* Right Box: Heiz- & Warmwasseranteil */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Energie- vs. Betriebskosten</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Verhältnis von volatilen Heiz-/Warmwasserkosten zu stabilen kalten Betriebskosten</CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-center min-h-0">
                {/* Aggregated values and split progress bar */}
                {(() => {
                  let warmCosts = 0;
                  let coldCosts = 0;
                  
                  initialNebenkosten.forEach(item => {
                    const arten = item.nebenkostenart || [];
                    const betraege = item.betrag || [];
                    
                    arten.forEach((art, idx) => {
                      const amount = Number(betraege[idx] || 0);
                      const isWarm = art.toLowerCase().includes('heiz') || 
                                     art.toLowerCase().includes('gas') || 
                                     art.toLowerCase().includes('wasser') || 
                                     art.toLowerCase().includes('wärme') || 
                                     art.toLowerCase().includes('energie');
                      if (isWarm) {
                        warmCosts += amount;
                      } else {
                        coldCosts += amount;
                      }
                    });
                  });

                  const total = warmCosts + coldCosts;
                  const warmRatio = total > 0 ? Math.round((warmCosts / total) * 100) : 30;
                  const coldRatio = total > 0 ? Math.round((coldCosts / total) * 100) : 70;

                  return (
                    <div className="space-y-6 my-auto py-2 w-full">
                      {/* Split bar */}
                      <div className="space-y-2">
                        <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="h-full bg-orange-500 rounded-l-full transition-all duration-700" style={{ width: `${warmRatio}%` }} />
                          <div className="h-full bg-blue-500 rounded-r-full transition-all duration-700" style={{ width: `${coldRatio}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-orange-500">Heizung & Energie ({warmRatio}%)</span>
                          <span className="text-blue-500">Kalte Nebenkosten ({coldRatio}%)</span>
                        </div>
                      </div>

                      {/* Numeric breakdown */}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-0.5">Volatile Energiekosten</span>
                          <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(warmCosts)}
                          </span>
                        </div>
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-0.5">Stabile Betriebskosten</span>
                          <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(coldCosts)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Row 5: Suggested Abrechnungs-Fristen & Guthaben/Nachforderung Prognose */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Abrechnungs-Fristen Countdown (Verjährungs-Radar) */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Verjährungs-Radar</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Gesetzliche 12-Monats-Fristen zur Abgabe der Betriebskostenabrechnung (§ 556 BGB)</CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-3.5 my-auto py-2 w-full">
                  {legalPrognosis.deadlines.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Keine offenen Abrechnungsfristen vorhanden.</p>
                  ) : (
                    legalPrognosis.deadlines.map((dl, idx) => {
                      const isExpired = dl.daysRemaining < 0;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-2.5 h-2.5 rounded-full shrink-0",
                              dl.status === 'green' ? "bg-emerald-500" :
                              dl.status === 'amber' ? "bg-amber-500 animate-pulse" :
                              dl.status === 'red' ? "bg-rose-500 animate-ping" : "bg-zinc-400"
                            )} />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">{dl.houseName} ({dl.year})</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 block">Abgabe bis: {dl.deadlineDate}</span>
                            </div>
                          </div>

                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                            isExpired ? "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700" :
                            dl.status === 'red' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                            dl.status === 'amber' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          )}>
                            {isExpired ? "Abgelaufen" : `${dl.daysRemaining} Tage`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-auto">
                  * Nach Ablauf der 12-Monats-Frist können Nachforderungen rechtlich nicht mehr geltend gemacht werden.
                </p>
              </CardContent>
            </Card>

            {/* Right Box: Saldo-Prognose (Guthaben vs. Nachforderung Prognose) */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[300px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Saldo-Prognose</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Erwartete Guthaben-Auszahlungen und Nachforderungen basierend auf Vorauszahlungen</CardDescription>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-4 my-auto py-2 w-full">
                  {/* Asymmetric split forecast bar */}
                  {(() => {
                    const total = legalPrognosis.totalNachforderung + legalPrognosis.totalGuthaben;
                    const nachRatio = total > 0 ? Math.round((legalPrognosis.totalNachforderung / total) * 100) : 50;
                    const gutRatio = total > 0 ? Math.round((legalPrognosis.totalGuthaben / total) * 100) : 50;

                    return (
                      <div className="space-y-2">
                        <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${nachRatio}%` }} />
                          <div className="h-full bg-rose-500 rounded-r-full transition-all duration-700" style={{ width: `${gutRatio}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-emerald-600 dark:text-emerald-500">Erwartete Nachforderung ({nachRatio}%)</span>
                          <span className="text-rose-600 dark:text-rose-400">Erwartetes Guthaben ({gutRatio}%)</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* KPI block row */}
                  <div className="grid grid-cols-3 gap-3.5 text-center">
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest block mb-0.5">Soll-Nachzahlung</span>
                      <span className="text-xs sm:text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                        +{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(legalPrognosis.totalNachforderung)}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-0.5">Soll-Guthaben</span>
                      <span className="text-xs sm:text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                        -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(legalPrognosis.totalGuthaben)}
                      </span>
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-0.5">Netto-Saldo</span>
                      <span className={cn(
                        "text-xs sm:text-sm font-extrabold",
                        legalPrognosis.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {legalPrognosis.netBalance >= 0 ? '+' : ''}{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(legalPrognosis.netBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-auto">
                  {legalPrognosis.netBalance >= 0 
                    ? "✓ Ihr Portfolio läuft im Netto-Überschuss. Sie erwarten mehr Nachzahlungen als Rückerstattungen."
                    : "⚠ Rückerstattungen übersteigen Nachforderungen. Halten Sie Liquiditätsreserven zur Auszahlung an Mieter bereit."
                  }
                </p>
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
