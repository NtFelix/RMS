"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, X, FileSpreadsheet, Building2, Euro, Ruler, Percent, Activity, BarChart3, TrendingUp, TrendingDown, Info, HelpCircle, Target, Coins } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CreateAbrechnungDropdown } from "@/components/abrechnung/create-abrechnung-dropdown";
import { OperatingCostsFilters } from "@/components/finance/operating-costs-filters";
import { OperatingCostsTable } from "@/components/tables/operating-costs-table";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedPillToggle } from "@/components/ui/animated-pill-toggle";
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
import { createClient } from "@/utils/supabase/client";
import { getLatestNebenkostenAmount } from "@/utils/tenant-payment-calculations";
import { formatCurrency } from "@/utils/format";

const CURRENCY_FORMATTER = new Intl.NumberFormat('de-DE', { 
  style: 'currency', 
  currency: 'EUR', 
  maximumFractionDigits: 0 
});

const CURRENCY_FORMATTER_WITH_DECIMALS = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Custom tooltip component for the yearly development chart
const CustomDevelopmentTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload]
      .filter((item: any) => typeof item.value === 'number' && item.value > 0)
      .sort((a: any, b: any) => b.value - a.value);

    const top3 = sortedPayload.slice(0, 3);
    const totalYearCost = payload[0]?.payload?.total || 0;

    return (
      <div className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl text-zinc-900 dark:text-zinc-50 min-w-[220px] transition-all duration-150">
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">
          Jahr: {label}
        </p>
        <div className="flex flex-col gap-2">
          {top3.map((item: any, idx: number) => {
            const color = item.color || item.stroke || 'currentColor';
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs font-bold">
                  {CURRENCY_FORMATTER.format(item.value)}
                </span>
              </div>
            );
          })}
        </div>
        {sortedPayload.length > 3 && (
          <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-[10px] font-semibold text-zinc-400">
            <span>Andere Häuser</span>
            <span>
              {CURRENCY_FORMATTER.format(
                sortedPayload.slice(3).reduce((sum: number, item: any) => sum + (item.value || 0), 0)
              )}
            </span>
          </div>
        )}
        <div className="mt-2.5 pt-2.5 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
          <span>Gesamt</span>
          <span className=" text-primary">
            {CURRENCY_FORMATTER.format(totalYearCost)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip component for the horizontal stacked bar chart
const CustomHorizontalTooltip = ({ active, payload, houseSqmCosts, houseApartmentSizes, initialHaeuser }: any) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload]
      .filter((item: any) => typeof item.value === 'number' && item.value > 0)
      .sort((a: any, b: any) => b.value - a.value);

    const top3 = sortedPayload.slice(0, 3);
    const otherCost = sortedPayload.slice(3).reduce((sum, item) => sum + (item.value || 0), 0);
    const totalCost = sortedPayload.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
      <div className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl text-zinc-900 dark:text-zinc-50 min-w-[240px] transition-all duration-150 animate-in fade-in zoom-in-95 duration-150">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">
          Betriebskosten-Prognose (bereinigt)
        </p>
        <div className="flex flex-col gap-3">
          {top3.map((item: any, idx: number) => {
            const houseName = item.name;
            const adjustedCost = item.value;
            const sqmCost = houseSqmCosts[houseName] || 0;
            const houseObj = initialHaeuser.find((h: any) => h.name === houseName);
            const aptArea = houseObj ? houseApartmentSizes[houseObj.id] || 0 : 0;
            
            return (
              <div key={idx} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill || item.color }} />
                  <span className="text-xs font-bold truncate">{houseName}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>m²-Kosten:</span>
                  <span className="text-right  font-bold text-zinc-800 dark:text-zinc-200">{sqmCost.toFixed(2)} €/m²</span>
                  <span>Wohnungen-Fläche:</span>
                  <span className="text-right  font-bold text-zinc-800 dark:text-zinc-200">{aptArea.toFixed(1)} m²</span>
                  <span className="text-primary font-bold">Prognose (ber.):</span>
                  <span className="text-right  font-bold text-primary">
                    {CURRENCY_FORMATTER.format(adjustedCost)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {sortedPayload.length > 3 && (
          <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-semibold text-zinc-400">
            <span>Andere Häuser</span>
            <span className=" font-bold text-zinc-800 dark:text-zinc-200">
              {CURRENCY_FORMATTER.format(otherCost)}
            </span>
          </div>
        )}
        <div className="mt-2.5 pt-2.5 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
          <span>Gesamt-Prognose</span>
          <span className=" text-primary">
            {CURRENCY_FORMATTER.format(totalCost)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: OptimizedNebenkosten[];
  initialHaeuser: Haus[];
  initialTenants?: any[];
  initialFinances?: any[];
  ownerName: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewMeters?: boolean;
}

export default function BetriebskostenClientView({
  initialNebenkosten,
  initialHaeuser,
  initialTenants = [],
  initialFinances = [],
  ownerName,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canViewMeters = true,
}: BetriebskostenClientViewProps) {
  const [currentTab, setCurrentTab] = useState<"costs" | "overview">("costs");
  const [prognosisMode, setPrognosisMode] = useState<"real" | "goal">("goal");
  const [prognosisTimeframe, setPrognosisTimeframe] = useState<"this" | "last" | "5y">("last");
  const [auditTimeframe, setAuditTimeframe] = useState<"this" | "last" | "5y">("last");
  const [energyTimeframe, setEnergyTimeframe] = useState<5 | 10 | 25>(5);
  const [filter, setFilter] = useState("all");

  // ... (inside the component)

  // Specific stats for Plausibilitäts-Audit benchmarking
  const auditStats = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastYear = currentYear - 1;

    // Filter items based on selected timeframe
    const filteredItems = initialNebenkosten.filter(item => {
      if (!item.startdatum) return true;
      const year = new Date(item.startdatum).getFullYear();
      if (auditTimeframe === "this") return year === currentYear;
      if (auditTimeframe === "last") return year === lastYear;
      if (auditTimeframe === "5y") return year >= currentYear - 4;
      return true;
    });

    let totalCosts = 0;
    filteredItems.forEach(item => {
      const betraege = item.betrag || [];
      betraege.forEach(amount => { if (Number(amount) > 0) totalCosts += Number(amount); });
      if (item.zaehlerkosten) {
        Object.values(item.zaehlerkosten).forEach(val => { if (Number(val) > 0) totalCosts += Number(val); });
      }
    });

    const totalArea = initialHaeuser.reduce((sum, h) => {
      let displaySize = 0;
      if (h.groesse && !isNaN(Number(h.groesse))) displaySize = Number(h.groesse);
      return sum + displaySize;
    }, 0);

    let yearsCount = 1;
    if (auditTimeframe === "5y") yearsCount = 5;

    // Portfolio average per sqm per month
    const avgMonthlySqmCost = totalArea > 0 ? (totalCosts / totalArea / (12 * yearsCount)) : 0;

    return {
      avgMonthlySqmCost,
      totalCosts,
      count: filteredItems.length
    };
  }, [initialNebenkosten, auditTimeframe, initialHaeuser]);

  // ... (inside the component)

  // Energy vs Operational Trends Data (Long term)
  const energyTrendData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const startYear = currentYear - (energyTimeframe - 1);
    
    const yearlyMap: Record<number, { year: number; energy: number; operational: number }> = {};
    
    // Initialize years
    for (let y = startYear; y <= currentYear; y++) {
      yearlyMap[y] = { year: y, energy: 0, operational: 0 };
    }

    initialNebenkosten.forEach(item => {
      if (!item.startdatum) return;
      const year = new Date(item.startdatum).getFullYear();
      if (year < startYear || year > currentYear) return;

      const arten = item.nebenkostenart || [];
      const betraege = item.betrag || [];
      
      arten.forEach((art, idx) => {
        const amount = Number(betraege[idx] || 0);
        const isEnergy = art.toLowerCase().includes('heiz') || 
                       art.toLowerCase().includes('gas') || 
                       art.toLowerCase().includes('wasser') || 
                       art.toLowerCase().includes('wärme') || 
                       art.toLowerCase().includes('energie');
        if (isEnergy) {
          yearlyMap[year].energy += amount;
        } else {
          yearlyMap[year].operational += amount;
        }
      });
    });

    return Object.values(yearlyMap).map(d => {
      const total = d.energy + d.operational;
      return {
        ...d,
        energyShare: total > 0 ? (d.energy / total) * 100 : 0,
        operationalShare: total > 0 ? (d.operational / total) * 100 : 0,
        displayTotal: formatCurrency(total)
      };
    });
  }, [initialNebenkosten, energyTimeframe]);

  const energyAvgStats = useMemo(() => {
    if (energyTrendData.length === 0) return { energy: 0, operational: 0 };
    
    let totalEnergy = 0;
    let totalOperational = 0;
    let totalAll = 0;

    energyTrendData.forEach(d => {
      totalEnergy += d.energy;
      totalOperational += d.operational;
      totalAll += (d.energy + d.operational);
    });

    return {
      energy: totalAll > 0 ? Math.round((totalEnergy / totalAll) * 100) : 0,
      operational: totalAll > 0 ? Math.round((totalOperational / totalAll) * 100) : 0
    };
  }, [energyTrendData]);
// ... rest of state stays same ...
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectedHouseId, setSelectedHouseId] = useState<string>("all");
  // isModalOpen and editingNebenkosten are now managed by useModalStore
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const selectedItemIdForDeleteRef = useRef<string | null>(null);
  const { openBetriebskostenModal } = useModalStore(); // Get the action to open modal
  const { toast } = useToast();
  // Define router for potential refresh, though modal might handle it
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [showGuide, setShowGuide] = useState(() => getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE) !== 'true');
  const [hoveredHouseIndex, setHoveredHouseIndex] = useState<number | null>(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);
  const [developmentTimeframe, setDevelopmentTimeframe] = useState<5 | 10 | 25>(5);
  const [showPrognosisInfo, setShowPrognosisInfo] = useState(false);
  const [showDetailedPrognosis, setShowDetailedPrognosis] = useState(false);
  const [hoveredSegmentHouse, setHoveredSegmentHouse] = useState<string | null>(null);
  const [wohnungen, setWohnungen] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllWohnungen = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Wohnungen")
        .select("id, haus_id, groesse");
      if (!error && data) {
        setWohnungen(data);
      }
    };
    fetchAllWohnungen();
  }, []);

  const houseApartmentSizes = useMemo(() => {
    const map: Record<string, number> = {};
    wohnungen.forEach((w) => {
      if (w.haus_id) {
        map[w.haus_id] = (map[w.haus_id] || 0) + (w.groesse || 0);
      }
    });
    return map;
  }, [wohnungen]);

  const adjustedHouseCosts = useMemo(() => {
    const houseCosts: Record<string, number> = {};
    const houseSqmCosts: Record<string, number> = {};
    const houseAdjustedCosts: Record<string, number> = {};
    
    initialNebenkosten.forEach(item => {
      const houseName = item.haus_name || "Unbekanntes Haus";
      const houseId = item.haeuser_id;
      
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

      houseCosts[houseName] = (houseCosts[houseName] || 0) + totalItemCost;
      
      const totalAreaManuelle = item.gesamt_flaeche || 1;
      const sqmCost = totalItemCost / totalAreaManuelle;
      houseSqmCosts[houseName] = sqmCost;
      
      const apartmentsAreaSum = houseApartmentSizes[houseId] || 0;
      const adjustedCost = sqmCost * apartmentsAreaSum;
      houseAdjustedCosts[houseName] = (houseAdjustedCosts[houseName] || 0) + adjustedCost;
    });

    return {
      houseCosts,
      houseSqmCosts,
      houseAdjustedCosts
    };
  }, [initialNebenkosten, houseApartmentSizes]);

  const horizontalChartData = useMemo(() => {
    const dataPoint: Record<string, any> = { name: "Nebenkosten" };
    let hasData = false;
    Object.entries(adjustedHouseCosts.houseAdjustedCosts).forEach(([houseName, val]) => {
      dataPoint[houseName] = Number(val.toFixed(2));
      hasData = true;
    });
    return hasData ? [dataPoint] : [];
  }, [adjustedHouseCosts]);

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
    const currentYear = new Date().getFullYear();
    const sortedYearsWithData = Object.keys(yearlyHouseMap).map(Number).sort((a, b) => a - b);
    const absoluteFirstYear = sortedYearsWithData[0];
    
    const years: number[] = [];
    let i = 0;
    while (years.length < developmentTimeframe) {
      const year = currentYear - i;
      if (year !== absoluteFirstYear) {
        years.push(year);
      }
      i++;
      if (i > 100) break; // Safety guard
    }
    years.sort((a, b) => a - b);
    const yearlyDevelopment = years.map(year => {
      const dataPoint: Record<string, any> = { year: String(year) };
      let yearTotal = 0;
      Array.from(allHouses).forEach(houseName => {
        const cost = yearlyHouseMap[year]?.[houseName] || 0;
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
  }, [initialNebenkosten, developmentTimeframe]);

  const categoriesData = useMemo(() => {
    const raw = Object.entries(nebenkostenStats.categoryTotals).reduce((acc, [name, value]) => {
      if (value > 0) {
        acc.push({ name, value });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

    raw.sort((a, b) => b.value - a.value);
    
    if (raw.length <= 6) return raw;
    const top5 = raw.slice(0, 5);
    const others = raw.slice(5).reduce((sum, d) => sum + d.value, 0);
    return [...top5, { name: "Andere", value: others }];
  }, [nebenkostenStats.categoryTotals]);

  // Aggregated data for legal deadlines and settlement balance prognosis
  const legalPrognosis = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastYear = currentYear - 1;

    if (!initialNebenkosten) {
      return {
        deadlines: [],
        totalNachforderung: 0,
        totalGuthaben: 0,
        netBalance: 0,
        totalGoalPrepayments: 0,
        totalRealPrepayments: 0,
        totalActualCosts: 0,
        coveragePct: 0,
        balancePct: 0
      };
    }

    // 1. Calculate DEADLINES with Compliance Check
    // Get existing settlement house IDs for last year
    const existingSettlementHouseIds = initialNebenkosten.reduce((acc, item) => {
      if (item.enddatum && new Date(item.enddatum).getFullYear() === lastYear) {
        acc.add(item.haeuser_id);
      }
      return acc;
    }, new Set<string>());

    // Map existing deadlines
    const existingDeadlines = initialNebenkosten.map(item => {
      const houseName = item.haus_name || "Unbekanntes Haus";
      let end = new Date();
      if (item.enddatum) {
        const parsedEnd = new Date(item.enddatum);
        if (!isNaN(parsedEnd.getTime())) end = parsedEnd;
      }
      const deadlineDate = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      let status: 'green' | 'amber' | 'red' | 'done' = 'green';
      if (daysRemaining < 0) status = 'done';
      else if (daysRemaining <= 30) status = 'red';
      else if (daysRemaining <= 90) status = 'amber';

      return {
        id: item.id,
        houseId: item.haeuser_id,
        houseName,
        year: end.getFullYear(),
        daysRemaining,
        status,
        deadlineDate: deadlineDate.toLocaleDateString('de-DE'),
        isMissing: false
      };
    });

    // Add "Missing" compliance flags for houses that haven't started settlements for last year
    const missingDeadlines = initialHaeuser
      .filter(h => !existingSettlementHouseIds.has(h.id))
      .map(h => {
        // Legal deadline for last year (e.g. 2025) is end of current year (e.g. 2026)
        const deadlineDate = new Date(currentYear, 11, 31);
        const timeDiff = deadlineDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        return {
          id: `missing-${h.id}`,
          houseId: h.id,
          houseName: h.name,
          year: lastYear,
          daysRemaining,
          status: 'red' as const, // Missing is always critical
          deadlineDate: deadlineDate.toLocaleDateString('de-DE'),
          isMissing: true
        };
      });

    const allDeadlines = [...existingDeadlines, ...missingDeadlines].sort((a, b) => {
      // Sort expired or missing (critical) first
      if (a.daysRemaining < 0 && b.daysRemaining >= 0) return 1;
      if (a.daysRemaining >= 0 && b.daysRemaining < 0) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    // 2. Filter records for FINANCIAL calculation
    const filteredItems = initialNebenkosten.filter(item => {
      if (!item.startdatum) return true;
      const year = new Date(item.startdatum).getFullYear();
      if (prognosisTimeframe === "this") return year === currentYear;
      if (prognosisTimeframe === "last") return year === lastYear;
      if (prognosisTimeframe === "5y") return year >= currentYear - 4;
      return true;
    });

    let totalNachforderung = 0;
    let totalGuthaben = 0;
    let totalActualCosts = 0;

    // 3. Calculate portfolio-wide targets (GOAL) accurately
    const selectedYears: number[] = [];
    if (prognosisTimeframe === "this") selectedYears.push(currentYear);
    else if (prognosisTimeframe === "last") selectedYears.push(lastYear);
    else {
      for(let i=0; i<5; i++) selectedYears.push(currentYear - i);
    }

    let totalGoalPrepayments = 0;
    selectedYears.forEach(year => {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      
      initialTenants.forEach(t => {
        // Handle move-in / move-out logic
        const moveIn = t.einzug ? new Date(t.einzug) : null;
        const moveOut = t.auszug ? new Date(t.auszug) : null;

        // Skip if tenant was not active during this year
        if (moveIn && moveIn > yearEnd) return;
        if (moveOut && moveOut < yearStart) return;

        // Calculate overlap of months (rough estimation by month)
        // If no einzug is set, assume they were there from the beginning of time
        const startMonth = (moveIn && moveIn.getFullYear() === year) ? moveIn.getMonth() : 0;
        const endMonth = (moveOut && moveOut.getFullYear() === year) ? moveOut.getMonth() : 11;
        const activeMonthsInYear = Math.max(0, endMonth - startMonth + 1);

        const monthlyAmount = getLatestNebenkostenAmount(t.nebenkosten);
        totalGoalPrepayments += monthlyAmount * activeMonthsInYear;
      });
    });

    // 4. Calculate total real payments (IST) from all units
    const totalRealPrepayments = initialFinances.reduce((sum, f) => {
      if (!f.datum) return sum;
      const fYear = new Date(f.datum).getFullYear();
      if (selectedYears.includes(fYear)) return sum + (Number(f.betrag) || 0);
      return sum;
    }, 0);

    // 5. Calculate Costs
    filteredItems.forEach(item => {
      let totalItemCost = 0;
      const betraege = item.betrag || [];
      betraege.forEach(amount => { if (Number(amount) > 0) totalItemCost += Number(amount); });
      if (item.zaehlerkosten) {
        Object.values(item.zaehlerkosten).forEach(val => { if (Number(val) > 0) totalItemCost += Number(val); });
      }
      totalActualCosts += totalItemCost;

      // Surcharge/Refund split
      const relevantTenants = initialTenants.filter(t => {
        const wohnung = wohnungen.find(w => w.id === t.wohnung_id);
        return wohnung && wohnung.haus_id === item.haeuser_id;
      });
      const recordTarget = relevantTenants.reduce((sum, t) => sum + getLatestNebenkostenAmount(t.nebenkosten), 0) * 12;
      const diff = totalItemCost - recordTarget;
      if (diff > 0) totalNachforderung += diff;
      else totalGuthaben += Math.abs(diff);
    });

    const activePrepayments = prognosisMode === "goal" ? totalGoalPrepayments : totalRealPrepayments;
    const netBalance = totalActualCosts - activePrepayments;
    
    // Coverage: How much of the costs are covered by prepayments
    const coveragePct = totalActualCosts > 0 
      ? Math.min(100, Math.round((activePrepayments / totalActualCosts) * 100)) 
      : (activePrepayments > 0 ? 100 : 0);
    
    // Liquidity Balance: The percentage distance from 0
    // If positive: Need surcharge (Costs > Payments). If negative: Have surplus (Payments > Costs).
    const balancePct = totalActualCosts > 0 
      ? Math.round(((activePrepayments - totalActualCosts) / totalActualCosts) * 100) 
      : 0;

    return {
      deadlines: allDeadlines.slice(0, 4),
      totalNachforderung,
      totalGuthaben,
      netBalance,
      totalGoalPrepayments,
      totalRealPrepayments,
      totalActualCosts,
      coveragePct,
      balancePct
    };
  }, [initialNebenkosten, prognosisMode, prognosisTimeframe, initialTenants, initialFinances, wohnungen, initialHaeuser]);


  const filteredNebenkosten = useMemo(() => {
    let result = initialNebenkosten;
    // Apply optimistic UI filtering
    if (deletedIds.size > 0) {
      result = result.filter(item => !deletedIds.has(item.id));
    }
    
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
    return result;
  }, [searchQuery, filter, initialNebenkosten, selectedHouseId, deletedIds]);

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
    selectedItemIdForDeleteRef.current = itemId;
    setIsDeleteAlertOpen(true);
  }, []);

  const handleDeleteDialogOnOpenChange = useCallback((open: boolean) => {
    setIsDeleteAlertOpen(open);
    if (!open) {
      selectedItemIdForDeleteRef.current = null;
    }
  }, []);

  const executeDelete = useCallback(async () => {
    const itemId = selectedItemIdForDeleteRef.current;
    if (!itemId) return;
    const result = await deleteNebenkostenServerAction(itemId);
    if (result.success) {
      toast({
        title: "Erfolg",
        description: "Nebenkosten-Eintrag erfolgreich gelöscht.",
        variant: "success"
      });
      router.refresh();
    } else {
      toast({
        title: "Fehler",
        description: result.message || "Eintrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  }, [toast, router]);

  const scrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <AnimatedPillToggle
        tabs={[
          { value: "costs", label: "Betriebskosten", icon: FileSpreadsheet },
          { value: "overview", label: "Übersicht", icon: BarChart3 },
        ]}
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        layoutId="active-betriebskosten-tab-pill"
      />

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
                    <X className="size-4 mr-1" /> Ausblenden
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {instructionSteps.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="shrink-0 size-8 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center">
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
                    canCreate={canCreate}
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
                    canCreate={canCreate}
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
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canViewMeters={canViewMeters}
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
              icon={<Euro className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Abrechnungen"
              value={nebenkostenStats.billsCount}
              unit="Jahre"
              icon={<FileSpreadsheet className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø Betriebskosten-Index"
              value={nebenkostenStats.avgCostPerSqm}
              unit="€/m²"
              decimals
              icon={<Ruler className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
            <StatCard
              title="Ø pro Abrechnung"
              value={nebenkostenStats.avgCostPerBill}
              unit="€"
              decimals
              icon={<Activity className="size-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
            />
          </div>

          {/* Two-Column Analytics Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Progress Coverage */}
            <Card className="lg:col-span-8 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[450px] h-full">
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
                    <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar max-h-[210px] flex-1">
                      {nebenkostenStats.uncoveredHouses.map((h, idx) => (
                        <div 
                          key={h.id || idx} 
                          onClick={() => handleOpenCreateModalForHouse(h.id)}
                          className="group flex items-center justify-between gap-4 p-2.5 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 hover:shadow-xs transition-all duration-200 cursor-pointer animate-in fade-in duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                              <Building2 className="size-4 animate-in fade-in" />
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
            <Card className="lg:col-span-4 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[450px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Betriebskosten-Verteilung</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Prozentuale Aufteilung der einzelnen Nebenkostenarten im System</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-center min-h-0">
                <div className="w-full flex items-center justify-center py-2 flex-grow">
                  <div className="relative w-full h-[220px] flex items-center justify-center">
                    <BaseDonutChart
                      data={categoriesData}
                      valueFormatter={(val) => CURRENCY_FORMATTER.format(val)}
                      innerRadius={65}
                      outerRadius={85}
                      showLegend={false}
                      showTooltip={false}
                      onHoverSegment={setHoveredCategoryIndex}
                    />

                    {/* Center Interactive Value */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center mt-0.5 px-3">
                      {hoveredCategoryIndex === null ? (
                        <>
                          <span className="text-lg font-black tracking-tight leading-none text-zinc-900 dark:text-zinc-50 transition-all duration-200">
                            {CURRENCY_FORMATTER.format(nebenkostenStats.totalCosts)}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
                            Gesamtkosten
                          </span>
                          <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                            Alle Positionen
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-black tracking-tight leading-none text-primary transition-all duration-200">
                            {CURRENCY_FORMATTER.format(categoriesData[hoveredCategoryIndex]?.value || 0)}
                          </span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1.5 truncate max-w-[120px]">
                            {categoriesData[hoveredCategoryIndex]?.name || "Kostenart"}
                          </span>
                          <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-1">
                            {Math.round(((categoriesData[hoveredCategoryIndex]?.value || 0) / (nebenkostenStats.totalCosts || 1)) * 100)}% Anteil
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: House cost share donut chart and year-over-year stacked bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box: Asymmetric House Share Donut Chart */}
            <Card className="lg:col-span-4 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[450px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2">
                <CardTitle className="text-base font-semibold">Kostenanteil nach Häusern</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Verteilung der gesamten Betriebskosten über Ihre verschiedenen Immobilien</CardDescription>
              </CardHeader>
              
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-center min-h-0">
                <div className="relative w-full h-[280px] flex items-center justify-center">
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
                          {CURRENCY_FORMATTER.format(costAnalytics.totalAllTimeCosts)}
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
                          {CURRENCY_FORMATTER.format(costAnalytics.houseShares[hoveredHouseIndex]?.value || 0)}
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
            <Card className="lg:col-span-8 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[450px] h-full">
              <CardHeader className="px-0 pt-0 shrink-0 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Betriebskosten-Entwicklung</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">Verlauf der jährlichen Betriebskosten aufgeteilt nach Häusern</CardDescription>
                </div>

                {/* Timeframe selector pill */}
                <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200/20 dark:border-zinc-800/20 p-1 rounded-full relative w-full sm:w-auto self-start sm:self-center select-none overflow-hidden shrink-0">
                  {([5, 10, 25] as const).map((timeframe) => {
                    const label = timeframe === 5 ? "5 Jahre" : timeframe === 10 ? "10 Jahre" : "25 Jahre";
                    const isActive = developmentTimeframe === timeframe;
                    return (
                      <button
                        type="button"
                        key={timeframe}
                        onClick={() => setDevelopmentTimeframe(timeframe)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-300 relative cursor-pointer min-w-[70px] text-center z-10",
                          isActive
                            ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="betriebskosten-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs border border-zinc-200/10 dark:border-zinc-600/30 rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              
              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 relative">
                <div className="w-full h-[280px] relative">
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
                          const safeId = `color-${houseName.replace(/\s+/g, '-')}`;
                          return (
                            <linearGradient key={houseName} id={safeId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0.0}/>
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
                      <RechartsTooltip content={<CustomDevelopmentTooltip />} />
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
                        const safeId = `color-${houseName.replace(/\s+/g, '-')}`;
                        return (
                          <Area 
                            key={houseName} 
                            type="monotone"
                            dataKey={houseName} 
                            stackId="1" 
                            stroke={color}
                            fill={`url(#${safeId})`}
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
            {/* Left Box: Plausibilitäts-Audit (Market Benchmark) */}
            <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px]">
              <CardHeader className="px-0 pt-0 shrink-0 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-semibold">Plausibilitäts-Audit</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">Benchmarking gegen den Markt</CardDescription>
                  </div>

                  {/* Timeframe Switcher for Audit */}
                  <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/20 shadow-inner relative">
                    {["this", "last", "5y"].map((mode) => {
                      const yearLabel = mode === "this" ? new Date().getFullYear() : 
                                      mode === "last" ? new Date().getFullYear() - 1 : "5J.";
                      return (
                        <button
                          type="button"
                          key={mode}
                          onClick={() => setAuditTimeframe(mode as any)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer min-w-[45px] z-10",
                            auditTimeframe === mode ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {auditTimeframe === mode && (
                            <motion.div
                              layoutId="audit-timeframe-pill"
                              className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          {yearLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-between min-h-0 gap-6">
                {/* Main Gauge Row */}
                {(() => {
                  const currentValue = auditStats.avgMonthlySqmCost;
                  const isOptimal = currentValue < 2.50;
                  
                  return (
                    <>
                      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl text-center relative overflow-hidden group">
                        <div className="relative flex items-center justify-center size-28 rounded-full border-4 border-dashed border-zinc-200 dark:border-zinc-800">
                          <div className={cn(
                            "absolute inset-2 rounded-full flex flex-col items-center justify-center",
                            isOptimal ? "bg-emerald-500/5" : "bg-amber-500/5"
                          )}>
                            <span className={cn(
                              "text-xl font-black tracking-tight",
                              isOptimal ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {currentValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">pro m² / Mon.</span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Portfolio-Effizienz</span>
                        </div>
                      </div>

                <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl", isOptimal ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                              <Activity className="size-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ø Portfoliowert ({auditTimeframe === '5y' ? '5J.' : 'Jahr'})</span>
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {currentValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m²
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-tighter",
                            isOptimal ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" : "text-amber-500 bg-amber-500/5 border-amber-500/10"
                          )}>
                            {isOptimal ? "Optimal" : "Erhöht"}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-zinc-400/10 text-zinc-400">
                              <Info className="size-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Markt-Benchmark</span>
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">2,50 €/m²</span>
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400 bg-zinc-400/5 px-2 py-0.5 rounded-md border border-zinc-400/10 uppercase tracking-tighter">Index</div>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mt-auto px-1 italic">
                        {isOptimal 
                          ? "✓ Ihre Kosten liegen unter dem Bundesdurchschnitt."
                          : "⚠ Ihre Kosten übersteigen den Marktdurchschnitt. Prüfen Sie Optimierungspotenziale bei Versicherungen oder Dienstleistern."
                        }
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Right Box: Long-term Energy Trend Analysis */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px]">
              <CardHeader className="px-0 pt-0 shrink-0 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Energie- vs. Betriebskosten</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">Langfristiger Trend der Kostenverteilung (100% Stacked)</CardDescription>
                  </div>

                  {/* Timeframe Switcher */}
                  <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/20 shadow-inner relative self-start sm:self-center shrink-0">
                    {[5, 10, 25].map((years) => (
                      <button
                        type="button"
                        key={years}
                        onClick={() => setEnergyTimeframe(years as any)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer min-w-[45px] z-10",
                          energyTimeframe === years ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {energyTimeframe === years && (
                          <motion.div
                            layoutId="energy-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {years}J.
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={energyTrendData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/60" />
                      <XAxis 
                        dataKey="year" 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={10} 
                        fontWeight="bold"
                        tick={{ fill: 'currentColor' }}
                        className="text-zinc-400 dark:text-zinc-500"
                        interval={energyTimeframe === 25 ? 4 : 0}
                      />
                      <YAxis hide domain={[0, 100]} />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const itemData = payload[0].payload;
                            return (
                              <div className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xl text-zinc-900 dark:text-zinc-50 min-w-[200px]">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Abrechnungsjahr {label}</p>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <div className="size-2 rounded-full bg-orange-500" />
                                      <span className="text-[10px] font-semibold text-muted-foreground">Warme Kosten</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{Math.round(itemData.energyShare)}%</span>
                                      <span className="text-[9px] text-zinc-400 italic">{formatCurrency(itemData.energy)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <div className="size-2 rounded-full bg-blue-500" />
                                      <span className="text-[10px] font-semibold text-muted-foreground">Kalte Kosten</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{Math.round(itemData.operationalShare)}%</span>
                                      <span className="text-[9px] text-zinc-400 italic">{formatCurrency(itemData.operational)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Volumen</span>
                                  <span className="text-[10px] font-black text-primary">{itemData.displayTotal}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="energyShare" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="operationalShare" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">
                    <span>Struktur-Vergleich</span>
                    <span className="text-zinc-500 italic">Ø {energyTimeframe} Jahre</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-orange-500/[0.03] border border-orange-500/10 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                        <TrendingUp className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-orange-600/80 uppercase">Energie</span>
                        <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                          {energyAvgStats.energy}% Durchschnitt
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-500/[0.03] border border-blue-500/10 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <Ruler className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-blue-600/80 uppercase">Betrieb</span>
                        <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                          {energyAvgStats.operational}% Durchschnitt
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed px-1">
                    * Die Analyse zeigt das Verhältnis von volatilen verbrauchsabhängigen Kosten zu festen umlagefähigen Betriebskosten.
                  </p>
                </div>
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

              <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col justify-start min-h-0">
                <div className="flex flex-col gap-3.5 py-2 w-full">
                  {legalPrognosis.deadlines.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Keine offenen Abrechnungsfristen vorhanden.</p>
                  ) : (
                    legalPrognosis.deadlines.map((dl, idx) => {
                      const isExpired = dl.daysRemaining < 0;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => dl.houseId && handleOpenCreateModalForHouse(dl.houseId)}
                          className={cn(
                            "group flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 transition-all duration-200",
                            dl.houseId ? "cursor-pointer hover:border-accent/40 hover:shadow-xs" : ""
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {dl.status === 'red' ? (
                              <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                                <Building2 className="size-4" />
                              </div>
                            ) : dl.status === 'amber' ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ml-1.5 mr-1" />
                            ) : (
                              <div className="p-1 rounded-lg bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                                <Building2 className="size-4 animate-in fade-in" />
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block group-hover:text-accent transition-colors duration-200">{dl.houseName} ({dl.year})</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                {dl.isMissing ? "Abrechnung noch nicht gestartet" : `Abgabe bis: ${dl.deadlineDate}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
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

            {/* Right Box: Simplified Saldo-Prognose (Application Standard) */}
            <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between min-h-[400px]">
              <CardHeader className="px-0 pt-0 shrink-0 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-semibold">Saldo-Prognose & Liquidität</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Vorausschau der Abrechnungsergebnisse
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Timeframe Selection Toggle with Sliding Animation */}
                    <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/20 shadow-inner relative">
                      <button
                        type="button"
                        onClick={() => setPrognosisTimeframe("this")}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer min-w-[50px] z-10",
                          prognosisTimeframe === "this" ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prognosisTimeframe === "this" && (
                          <motion.div
                            layoutId="prognosis-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {new Date().getFullYear()}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrognosisTimeframe("last")}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer min-w-[50px] z-10",
                          prognosisTimeframe === "last" ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prognosisTimeframe === "last" && (
                          <motion.div
                            layoutId="prognosis-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        {new Date().getFullYear() - 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrognosisTimeframe("5y")}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer min-w-[50px] z-10",
                          prognosisTimeframe === "5y" ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prognosisTimeframe === "5y" && (
                          <motion.div
                            layoutId="prognosis-timeframe-pill"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        5J.
                      </button>
                    </div>

                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

                    {/* SOLL/IST Toggle with Sliding Animation */}
                    <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200/20 shadow-inner relative">
                      <button
                        type="button"
                        onClick={() => setPrognosisMode("goal")}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer z-10",
                          prognosisMode === "goal" ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prognosisMode === "goal" && (
                          <motion.div
                            layoutId="prognosis-mode-pill-v3"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        SOLL
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrognosisMode("real")}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 relative cursor-pointer z-10",
                          prognosisMode === "real" ? "text-zinc-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {prognosisMode === "real" && (
                          <motion.div
                            layoutId="prognosis-mode-pill-v3"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs rounded-full -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        IST
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0 pb-0 flex-1 flex flex-col justify-between min-h-0 gap-6">
                {/* ... existing dials and insights ... */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Coverage Dial */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl text-center">
                    <div className="relative flex items-center justify-center size-20 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      <div className="absolute inset-1.5 rounded-full bg-accent/5 flex flex-col items-center justify-center">
                        <span className="text-base font-black text-accent">
                          {legalPrognosis.coveragePct}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">Deckung</span>
                    <p className="text-[9px] text-zinc-400 mt-1 leading-tight px-2">Anteil der Kosten, der durch Zahlungen gedeckt ist</p>
                  </div>

                  {/* Liquidity Status Dial */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl text-center">
                    <div className="relative flex items-center justify-center size-20 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                      <div className={cn(
                        "absolute inset-1.5 rounded-full flex flex-col items-center justify-center",
                        legalPrognosis.balancePct >= 0 ? "bg-emerald-500/5" : "bg-amber-500/5"
                      )}>
                        <span className={cn("text-xs font-black", legalPrognosis.balancePct >= 0 ? "text-emerald-600" : "text-amber-600")}>
                          {legalPrognosis.balancePct >= 0 ? '+' : ''}{legalPrognosis.balancePct}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">Liquiditäts-Status</span>
                    <p className="text-[9px] text-zinc-400 mt-1 leading-tight px-2">Verhältnis von Einnahmen zu den belegten Kosten</p>
                  </div>
                </div>

                {/* Data Insights Grid */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-zinc-400/10 text-zinc-400">
                        <Activity className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Abrechnungs-Kosten</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(legalPrognosis.totalActualCosts)}
                        </span>
                        <span className="text-[9px] text-zinc-400 italic mt-0.5">Reale Summe aller Kosten-Belege</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400 bg-zinc-400/5 px-2 py-0.5 rounded-md border border-zinc-400/10 uppercase tracking-tighter">Effektiv</div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", prognosisMode === 'goal' ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500")}>
                        {prognosisMode === 'goal' ? <Target className="size-4" /> : <Coins className="size-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {prognosisMode === 'goal' ? 'Vorauszahlung (Soll)' : 'Vorauszahlung (Ist)'}
                        </span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(prognosisMode === 'goal' ? legalPrognosis.totalGoalPrepayments : legalPrognosis.totalRealPrepayments)}
                        </span>
                        <span className="text-[9px] text-zinc-400 italic mt-0.5">
                          {prognosisMode === 'goal' ? 'Beträge laut Mietverträgen' : 'Tatsächlich verbuchte Zahlungen'}
                        </span>
                      </div>
                    </div>
                    <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-tighter", 
                      prognosisMode === 'goal' ? "text-primary bg-primary/5 border-primary/10" : "text-emerald-500 bg-emerald-500/5 border-emerald-500/10"
                    )}>
                      {prognosisMode === 'goal' ? 'Vertrag' : 'Kasse'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", legalPrognosis.netBalance <= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                        <Activity className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {legalPrognosis.netBalance <= 0 ? 'Erwartete Rückerstattung' : 'Erwartete Nachzahlung'}
                        </span>
                        <span className={cn("text-sm font-bold", legalPrognosis.netBalance <= 0 ? "text-emerald-600" : "text-amber-600")}>
                          {legalPrognosis.netBalance <= 0 ? '-' : '+'}{formatCurrency(Math.abs(legalPrognosis.netBalance))}
                        </span>
                        <span className="text-[9px] text-zinc-400 italic mt-0.5">Voraussichtlicher Liquiditäts-Ausgleich</span>
                      </div>
                    </div>
                    <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-tighter", 
                      legalPrognosis.netBalance <= 0 ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" : "text-amber-500 bg-amber-500/5 border-amber-500/10"
                    )}>Saldo</div>
                  </div>
                </div>

                {/* Footer Meter */}
                <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Kosten-Splitting nach Häusern</span>
                    <button
                      type="button"
                      onClick={() => setShowDetailedPrognosis(!showDetailedPrognosis)}
                      className="text-[10px] font-bold text-primary hover:underline transition-all cursor-pointer"
                    >
                      {showDetailedPrognosis ? "Liste schließen" : "Details"}
                    </button>
                  </div>
                  <div className="h-2 w-full flex rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800/50 shadow-inner">
                    {Object.entries(adjustedHouseCosts.houseAdjustedCosts).map(([houseName, value], index) => {
                      const colors = ["#34d399", "#f59e42", "#818cf8", "#f87171", "#60a5fa", "#a78bfa"];
                      const widthPct = (value / (Object.values(adjustedHouseCosts.houseAdjustedCosts).reduce((sum, val) => sum + val, 0) || 1)) * 100;
                      return (
                        <div
                          key={houseName}
                          style={{ width: `${widthPct}%`, backgroundColor: colors[index % colors.length] }}
                          className="h-full hover:scale-y-150 transition-transform cursor-help"
                          title={`${houseName}: ${CURRENCY_FORMATTER.format(value)}`}
                        />
                      );
                    })}
                  </div>

                  {/* Detailed house list breakdown grid */}
                  {showDetailedPrognosis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-2 mt-4 overflow-hidden"
                    >
                      {Object.entries(adjustedHouseCosts.houseAdjustedCosts).map(([houseName, value]) => (
                        <div key={houseName} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block truncate">{houseName}</span>
                          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                            {formatCurrency(value)}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
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
