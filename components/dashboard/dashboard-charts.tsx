"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Droplet,
  Thermometer,
  Flame,
  Gauge,
  Zap,
  Fuel,
  Activity,
  Building2,
  Wallet,
  Users,
  FileSpreadsheet
} from "lucide-react";

// ==========================================
// 1. Meters Donut Chart
// ==========================================
export interface MetersDonutChartProps {
  metersByType?: Record<string, number>;
  metersTotal?: number;
  metersActive?: number;
  apartments?: any[];
}

export function MetersDonutChart({
  metersByType: propMetersByType = {},
  metersTotal: propMetersTotal = 0,
  metersActive: propMetersActive = 0,
  apartments = []
}: MetersDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const computedStats = useMemo(() => {
    if (apartments && apartments.length > 0) {
      let active = 0;
      let total = 0;
      const byType: Record<string, number> = {
        kaltwasser: 0,
        warmwasser: 0,
        waermemenge: 0,
        heizkostenverteiler: 0,
        strom: 0,
        gas: 0
      };

      apartments.forEach(apt => {
        const meters = apt.Zaehler || [];
        meters.forEach((meter: any) => {
          total++;
          if (meter.ist_aktiv) {
            active++;
            const type = String(meter.typ || '').toLowerCase();
            byType[type] = (byType[type] || 0) + 1;
          }
        });
      });

      return { metersByType: byType, metersTotal: total, metersActive: active };
    }

    return {
      metersByType: propMetersByType,
      metersTotal: propMetersTotal,
      metersActive: propMetersActive
    };
  }, [apartments, propMetersByType, propMetersTotal, propMetersActive]);

  const metersByType = computedStats.metersByType;
  const metersTotal = computedStats.metersTotal;
  const metersActive = computedStats.metersActive;

  const activeMeters = useMemo(() => {
    return [
      { key: "kaltwasser", label: "Kaltwasser", icon: Droplet, colorClass: "text-blue-500 bg-blue-500/10", strokeColor: "#3b82f6" },
      { key: "warmwasser", label: "Warmwasser", icon: Thermometer, colorClass: "text-red-500 bg-red-500/10", strokeColor: "#ef4444" },
      { key: "waermemenge", label: "Wärmemenge", icon: Flame, colorClass: "text-orange-500 bg-orange-500/10", strokeColor: "#f97316" },
      { key: "heizkostenverteiler", label: "HKV", icon: Gauge, colorClass: "text-purple-500 bg-purple-500/10", strokeColor: "#a855f7" },
      { key: "strom", label: "Strom", icon: Zap, colorClass: "text-yellow-500 bg-yellow-500/10", strokeColor: "#eab308" },
      { key: "gas", label: "Gas", icon: Fuel, colorClass: "text-cyan-500 bg-cyan-500/10", strokeColor: "#06b6d4" }
    ].filter(m => (metersByType[m.key] || 0) > 0);
  }, [metersByType]);

  const totalActiveCount = useMemo(() => {
    return activeMeters.reduce((sum, m) => sum + (metersByType[m.key] || 0), 0);
  }, [activeMeters, metersByType]);

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return activeMeters.map(m => {
      const count = metersByType[m.key] || 0;
      const percentage = totalActiveCount > 0 ? count / totalActiveCount : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...m,
        count,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [activeMeters, metersByType, totalActiveCount, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: `${match.count}x`,
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: "Gesamt",
      count: `${metersActive} Akt.`,
      icon: Activity,
      colorClass: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80"
    };
  }, [hoveredKey, segments, metersActive]);

  const ActiveIcon = activeInfo.icon;

  if (metersTotal === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Zähler erfasst.</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1 font-medium">Zähler können direkt über das Wohnungs-Kontextmenü verwaltet werden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Aktive Messgeräte</span>
        <span className="font-bold text-accent">{metersActive} von {metersTotal}</span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {s.count}x
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. Houses Donut Chart
// ==========================================
export interface HousesDonutChartProps {
  houses: any[];
  apartments?: any[];
}

export function HousesDonutChart({ houses, apartments = [] }: HousesDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: "#3b82f6", colorClass: "text-blue-500 dark:text-blue-400 bg-blue-500/10" },
    { strokeColor: "#2563eb", colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { strokeColor: "#4f46e5", colorClass: "text-indigo-500 dark:text-indigo-400 bg-indigo-500/10" },
    { strokeColor: "#0ea5e9", colorClass: "text-sky-500 dark:text-sky-400 bg-sky-500/10" },
    { strokeColor: "#475569", colorClass: "text-slate-600 dark:text-slate-400 bg-slate-500/10" },
    { strokeColor: "#0d9488", colorClass: "text-teal-500 dark:text-teal-400 bg-teal-500/10" },
    { strokeColor: "#6366f1", colorClass: "text-indigo-400 dark:text-indigo-300 bg-indigo-500/10" }
  ], []);

  const segmentsData = useMemo(() => {
    const rawSegments = houses.map((house) => {
      const rentVal = house.rent || house.miete || 0;
      const parsedRent = typeof rentVal === "number"
        ? rentVal
        : parseFloat(String(rentVal).replace(/\./g, "").replace(/,/g, "."));
      
      const totalRentOfHouse = apartments && apartments.length > 0
        ? apartments
            .filter(a => a.haus_id === house.id)
            .reduce((sum, apt) => sum + Number(apt.miete || 0), 0)
        : (isNaN(parsedRent) ? 0 : parsedRent);
      return {
        key: house.id,
        label: house.name,
        count: totalRentOfHouse,
        icon: Building2
      };
    }).filter(s => s.count > 0);

    rawSegments.sort((a, b) => b.count - a.count);

    let finalSegments = [];
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => {
        const color = colors[idx % colors.length];
        return { ...s, ...color };
      });
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => {
        const color = colors[idx % colors.length];
        return { ...s, ...color };
      });
      const others = rawSegments.slice(4);
      const othersCount = others.reduce((sum, s) => sum + s.count, 0);
      finalSegments = [
        ...top4,
        {
          key: "other",
          label: "Andere",
          count: othersCount,
          icon: Building2,
          strokeColor: "#6b7280",
          colorClass: "text-zinc-500 bg-zinc-500/10"
        }
      ];
    }
    return finalSegments;
  }, [houses, apartments, colors]);

  const totalApartmentsInHouses = useMemo(() => {
    return segmentsData.reduce((sum, s) => sum + s.count, 0);
  }, [segmentsData]);

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsData.map(s => {
      const percentage = totalApartmentsInHouses > 0 ? s.count / totalApartmentsInHouses : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsData, totalApartmentsInHouses, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: "Soll-Miete",
      count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalApartmentsInHouses),
      icon: Wallet,
      colorClass: "text-accent bg-accent/10"
    };
  }, [hoveredKey, segments, totalApartmentsInHouses]);

  const ActiveIcon = activeInfo.icon;

  if (houses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Häuser erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Mietverteilung</span>
        <span className="font-bold text-accent">
          {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalApartmentsInHouses)} / Mon.
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. Finance Donut Chart
// ==========================================
export interface FinanceDonutChartProps {
  finanzen: any[];
}

export function FinanceDonutChart({ finanzen }: FinanceDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: "#f59e0b", colorClass: "text-amber-500 bg-amber-500/10" }, // Instandhaltung
    { strokeColor: "#3b82f6", colorClass: "text-blue-500 bg-blue-500/10" },   // Heizung / Strom
    { strokeColor: "#8b5cf6", colorClass: "text-purple-500 bg-purple-500/10" }, // Versicherung
    { strokeColor: "#ec4899", colorClass: "text-pink-500 bg-pink-500/10" },   // Verwaltung
    { strokeColor: "#eab308", colorClass: "text-yellow-500 bg-yellow-500/10" }, // Sonstiges
    { strokeColor: "#06b6d4", colorClass: "text-cyan-500 bg-cyan-500/10" }
  ], []);

  const segmentsData = useMemo(() => {
    const expenseTags: Record<string, number> = {};
    let totalExpense = 0;

    finanzen.forEach(item => {
      if (!item.ist_einnahmen) {
        const amount = Number(item.betrag || 0);
        totalExpense += amount;
        const tags = item.tags || [];
        if (tags.length > 0) {
          tags.forEach((t: string) => {
            const cleanTag = t.trim();
            expenseTags[cleanTag] = (expenseTags[cleanTag] || 0) + amount;
          });
        } else {
          expenseTags["Sonstiges"] = (expenseTags["Sonstiges"] || 0) + amount;
        }
      }
    });

    if (totalExpense === 0) {
      const incomeTags: Record<string, number> = {};
      let totalIncome = 0;
      finanzen.forEach(item => {
        if (item.ist_einnahmen) {
          const amount = Number(item.betrag || 0);
          totalIncome += amount;
          const tags = item.tags || [];
          if (tags.length > 0) {
            tags.forEach((t: string) => {
              const cleanTag = t.trim();
              incomeTags[cleanTag] = (incomeTags[cleanTag] || 0) + amount;
            });
          } else {
            incomeTags["Miete"] = (incomeTags["Miete"] || 0) + amount;
          }
        }
      });

      const rawSegments = Object.entries(incomeTags).map(([tag, amount]) => ({
        key: tag,
        label: tag,
        count: amount,
        icon: Wallet
      }));
      rawSegments.sort((a, b) => b.count - a.count);

      return {
        isExpense: false,
        total: totalIncome,
        segments: rawSegments.map((s, idx) => ({
          ...s,
          ...colors[idx % colors.length]
        }))
      };
    }

    const rawSegments = Object.entries(expenseTags).map(([tag, amount]) => ({
      key: tag,
      label: tag,
      count: amount,
      icon: Wallet
    }));
    rawSegments.sort((a, b) => b.count - a.count);

    let finalSegments = [];
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }));
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }));
      const others = rawSegments.slice(4);
      const othersCount = others.reduce((sum, s) => sum + s.count, 0);
      finalSegments = [
        ...top4,
        {
          key: "other",
          label: "Andere",
          count: othersCount,
          icon: Wallet,
          strokeColor: "#6b7280",
          colorClass: "text-zinc-500 bg-zinc-500/10"
        }
      ];
    }

    return {
      isExpense: true,
      total: totalExpense,
      segments: finalSegments
    };
  }, [finanzen, colors]);

  const totalValue = segmentsData.total;
  const segmentsList = segmentsData.segments;

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: segmentsData.isExpense ? "Ausgaben Gesamt" : "Einnahmen Gesamt",
      count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue),
      icon: Wallet,
      colorClass: segmentsData.isExpense ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"
    };
  }, [hoveredKey, segments, totalValue, segmentsData.isExpense]);

  const ActiveIcon = activeInfo.icon;

  if (finanzen.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Transaktionen erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          {segmentsData.isExpense ? "Ausgaben-Verteilung" : "Einnahmen-Verteilung"}
        </span>
        <span className={cn("font-bold", segmentsData.isExpense ? "text-red-500" : "text-emerald-500")}>
          {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue)}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. Tenants Donut Chart
// ==========================================
export interface TenantsDonutChartProps {
  tenants: any[];
}

export function TenantsDonutChart({ tenants }: TenantsDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: "#10b981", colorClass: "text-emerald-500 bg-emerald-500/10" }, // Erhalten
    { strokeColor: "#f59e0b", colorClass: "text-amber-500 bg-amber-500/10" },     // Ausstehend
    { strokeColor: "#3b82f6", colorClass: "text-blue-500 bg-blue-500/10" },       // Zurückgezahlt
    { strokeColor: "#6b7280", colorClass: "text-zinc-500 bg-zinc-500/10" }
  ], []);

  const segmentsData = useMemo(() => {
    let hasKautionData = false;
    const depositStatusCount: Record<string, number> = {};

    tenants.forEach(t => {
      if (t.kaution) {
        const amount = typeof t.kaution.amount === "string"
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);

        if (!isNaN(amount) && amount > 0) {
          hasKautionData = true;
          const status = t.kaution.status || "Ausstehend";
          depositStatusCount[status] = (depositStatusCount[status] || 0) + amount;
        }
      }
    });

    if (!hasKautionData) {
      const statusCounts: Record<string, number> = {};
      tenants.forEach(t => {
        const status = t.status || "mieter";
        const label = status === "mieter" ? "Aktive Mieter" : status === "bewerber" ? "Bewerber" : "Ehemalige";
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });

      const rawSegments = Object.entries(statusCounts).map(([status, count]) => ({
        key: status,
        label: status,
        count,
        icon: Users
      }));

      return {
        isDeposit: false,
        total: tenants.length,
        segments: rawSegments.map((s, idx) => ({
          ...s,
          ...colors[idx % colors.length]
        }))
      };
    }

    const rawSegments = Object.entries(depositStatusCount).map(([status, amount]) => ({
      key: status,
      label: status,
      count: amount,
      icon: Users
    }));

    return {
      isDeposit: true,
      total: Object.values(depositStatusCount).reduce((sum, v) => sum + v, 0),
      segments: rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }))
    };
  }, [tenants, colors]);

  const totalValue = segmentsData.total;
  const segmentsList = segmentsData.segments;

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: segmentsData.isDeposit
            ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(match.count)
            : `${match.count} Mieter`,
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: segmentsData.isDeposit ? "Kautionen Gesamt" : "Mieter Gesamt",
      count: segmentsData.isDeposit
        ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue)
        : `${totalValue} Mieter`,
      icon: Users,
      colorClass: "text-accent bg-accent/10"
    };
  }, [hoveredKey, segments, totalValue, segmentsData.isDeposit]);

  const ActiveIcon = activeInfo.icon;

  if (tenants.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Mieter erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          {segmentsData.isDeposit ? "Kautions-Abdeckung" : "Mieter-Verteilung"}
        </span>
        <span className="font-bold text-accent">
          {segmentsData.isDeposit
            ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue)
            : `${totalValue} Mieter`}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {segmentsData.isDeposit
                    ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(s.count)
                    : `${s.count}x`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. Nebenkosten Donut Chart
// ==========================================
export interface NebenkostenDonutChartProps {
  nebenkosten: any[];
}

export function NebenkostenDonutChart({ nebenkosten }: NebenkostenDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const colors = useMemo(() => [
    { strokeColor: "#3b82f6", colorClass: "text-blue-500 dark:text-blue-400 bg-blue-500/10" },
    { strokeColor: "#2563eb", colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { strokeColor: "#4f46e5", colorClass: "text-indigo-500 dark:text-indigo-400 bg-indigo-500/10" },
    { strokeColor: "#0ea5e9", colorClass: "text-sky-500 dark:text-sky-400 bg-sky-500/10" },
    { strokeColor: "#475569", colorClass: "text-slate-600 dark:text-slate-400 bg-slate-500/10" },
    { strokeColor: "#0d9488", colorClass: "text-teal-500 dark:text-teal-400 bg-teal-500/10" }
  ], []);

  const segmentsData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalCosts = 0;

    nebenkosten.forEach(item => {
      const arten = item.nebenkostenart || [];
      const betraege = item.betrag || [];

      arten.forEach((art: string, idx: number) => {
        const amount = Number(betraege[idx] || 0);
        if (amount > 0) {
          totalCosts += amount;
          const cleanArt = art.trim();
          categoryTotals[cleanArt] = (categoryTotals[cleanArt] || 0) + amount;
        }
      });

      if (item.zaehlerkosten) {
        Object.entries(item.zaehlerkosten).forEach(([key, val]) => {
          const amount = Number(val || 0);
          if (amount > 0) {
            totalCosts += amount;
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
            categoryTotals[capitalizedKey] = (categoryTotals[capitalizedKey] || 0) + amount;
          }
        });
      }
    });

    const rawSegments = Object.entries(categoryTotals).map(([name, amount]) => ({
      key: name,
      label: name,
      count: amount,
      icon: FileSpreadsheet
    }));
    rawSegments.sort((a, b) => b.count - a.count);

    let finalSegments = [];
    if (rawSegments.length <= 5) {
      finalSegments = rawSegments.map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }));
    } else {
      const top4 = rawSegments.slice(0, 4).map((s, idx) => ({
        ...s,
        ...colors[idx % colors.length]
      }));
      const others = rawSegments.slice(4);
      const othersSum = others.reduce((sum, s) => sum + s.count, 0);
      finalSegments = [
        ...top4,
        {
          key: "other",
          label: "Andere",
          count: othersSum,
          icon: FileSpreadsheet,
          strokeColor: "#6b7280",
          colorClass: "text-zinc-500 bg-zinc-500/10"
        }
      ];
    }

    return {
      total: totalCosts,
      segments: finalSegments
    };
  }, [nebenkosten, colors]);

  const totalValue = segmentsData.total;
  const segmentsList = segmentsData.segments;

  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const segments = useMemo(() => {
    let currentOffset = 0;
    return segmentsList.map(s => {
      const percentage = totalValue > 0 ? s.count / totalValue : 0;
      const strokeDasharray = `${percentage * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      const strokeDashoffset = -currentOffset * CIRCUMFERENCE;
      currentOffset += percentage;

      return {
        ...s,
        percentage,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [segmentsList, totalValue, CIRCUMFERENCE]);

  const activeInfo = useMemo(() => {
    if (hoveredKey) {
      const match = segments.find(s => s.key === hoveredKey);
      if (match) {
        return {
          label: match.label,
          count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: "Kosten Gesamt",
      count: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue),
      icon: FileSpreadsheet,
      colorClass: "text-accent bg-accent/10"
    };
  }, [hoveredKey, segments, totalValue]);

  const ActiveIcon = activeInfo.icon;

  if (nebenkosten.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Nebenkosten erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Kostenaufteilung</span>
        <span className="font-bold text-accent">
          {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalValue)}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              stroke="var(--zinc-100)"
              className="stroke-zinc-100 dark:stroke-zinc-800/60"
              strokeWidth="9"
            />
            {segments.map((s) => {
              const isHovered = hoveredKey === s.key;
              return (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  stroke={s.strokeColor}
                  strokeWidth={isHovered ? 12 : 9}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[80px]">
              {activeInfo.label}
            </p>
            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
              {activeInfo.count}
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col gap-1">
          {segments.map((s) => {
            const isHovered = hoveredKey === s.key;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                  isHovered
                    ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-accent/40 dark:border-accent/40 shadow-xs scale-[1.01]"
                    : "bg-zinc-50/30 dark:bg-zinc-900/10 border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                )}
                onMouseEnter={() => setHoveredKey(s.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("p-1 rounded-md shrink-0", s.colorClass)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(s.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
