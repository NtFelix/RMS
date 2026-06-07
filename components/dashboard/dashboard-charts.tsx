"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { GLOBAL_CHART_COLORS } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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

// Hoisted safe parse helper
const safeParseFloat = (val: any): number => {
  if (typeof val === "number") return val;
  const str = String(val || "0").trim();
  if (str.includes(",")) {
    return parseFloat(str.replace(/\./g, "").replace(/,/g, "."));
  }
  return parseFloat(str) || 0;
};

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
        <div className="relative size-40 flex items-center justify-center">
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
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.01]"
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
// 1.5. Base Donut Chart
// ==========================================
export interface BaseDonutChartDataItem {
  name: string;
  value: number;
  [key: string]: any;
}

export interface BaseDonutChartProps {
  data: BaseDonutChartDataItem[];
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  colors?: readonly string[];
  innerRadius?: string | number;
  outerRadius?: string | number;
  showLegend?: boolean;
  showTooltip?: boolean;
  onHoverSegment?: (index: number | null) => void;
}

interface BaseTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  valueFormatter?: (value: number) => string;
}

const BaseTooltip = ({ active, payload, valueFormatter }: BaseTooltipProps) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    const displayValue = valueFormatter ? valueFormatter(d.value) : String(d.value);
    return (
      <div className="bg-white dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] rounded-xl px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-zinc-800 dark:text-zinc-100 mb-0.5">{d.name}</p>
        <p className="text-muted-foreground">{displayValue}</p>
      </div>
    );
  }
  return null;
};

export function BaseDonutChart({
  data = [],
  emptyMessage = "Keine Daten erfasst.",
  valueFormatter,
  colors = GLOBAL_CHART_COLORS,
  innerRadius = "38%",
  outerRadius = "68%",
  showLegend = true,
  showTooltip = true,
  onHoverSegment,
}: BaseDonutChartProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-spin rounded-full size-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-8 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{emptyMessage}</p>
      </div>
    );
  }

  const hasMultiple = data.length > 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={hasMultiple ? 2 : 0}
          onMouseEnter={(_, index) => {
            setHoveredIdx(index);
            if (onHoverSegment) onHoverSegment(index);
          }}
          onMouseLeave={() => {
            setHoveredIdx(null);
            if (onHoverSegment) onHoverSegment(null);
          }}
        >
          {data.map((_, idx) => {
            const isHovered = hoveredIdx === idx;
            const cellColor = colors[idx % colors.length];
            return (
              <Cell 
                key={`cell-${idx}`} 
                fill={cellColor} 
                style={{
                  filter: isHovered ? `drop-shadow(0px 0px 8px ${cellColor}80)` : 'none',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer'
                }}
              />
            );
          })}
        </Pie>
        {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {showTooltip && <Tooltip content={<BaseTooltip valueFormatter={valueFormatter} />} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// ==========================================
// 2. Houses Donut Chart
// ==========================================
export interface HousesDonutChartProps {
  houses: any[];
  apartments?: any[];
}

const houseCurrencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const currencyFormatter0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const currencyFormatterDefault = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function HousesDonutChart({ houses, apartments = [] }: HousesDonutChartProps) {
  const chartData = useMemo(() => {
    const raw = houses.map(house => {
      const rentVal = house.rent || house.miete || 0;
      const parsedRent = typeof rentVal === "number"
        ? rentVal
        : parseFloat(String(rentVal).replace(/\./g, "").replace(/,/g, "."));

      const value = apartments.length > 0
        ? apartments
            .filter(a => a.haus_id === house.id)
            .reduce((sum, apt) => sum + Number(apt.miete || 0), 0)
        : (isNaN(parsedRent) ? 0 : parsedRent);

      return { name: house.name as string, value };
    }).filter(d => d.value > 0);

    raw.sort((a, b) => b.value - a.value);

    if (raw.length <= 6) return raw;

    const top5 = raw.slice(0, 5);
    const othersValue = raw.slice(5).reduce((sum, d) => sum + d.value, 0);
    return [...top5, { name: "Andere", value: othersValue }];
  }, [houses, apartments]);

  return (
    <BaseDonutChart
      data={chartData}
      emptyMessage="Keine Häuser erfasst."
      valueFormatter={(val) => `${houseCurrencyFormatter.format(val)} / Mon.`}
    />
  );
}

// 3. Finance Donut Chart
// ==========================================
export interface FinanceDonutChartProps {
  finanzen: any[];
  isLoading?: boolean;
}

export function FinanceDonutChart({ finanzen, isLoading = false }: FinanceDonutChartProps) {
  const chartData = useMemo(() => {
    if (isLoading) return [];
    
    const expenseTags: Record<string, number> = {};
    let totalExpense = 0;

    finanzen.forEach(item => {
      if (!item.ist_einnahmen) {
        const amount = safeParseFloat(item.betrag);
        
        if (isNaN(amount)) return;
        
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

    // If we have expenses, show them. Otherwise fallback to income tags
    if (totalExpense > 0) {
      const raw = Object.entries(expenseTags)
        .map(([tag, amount]) => ({
          name: tag,
          value: amount,
        }))
        .filter(d => d.value > 0);
        
      raw.sort((a, b) => b.value - a.value);
      
      if (raw.length <= 6) return raw;
      const top5 = raw.slice(0, 5);
      const others = raw.slice(5).reduce((sum, d) => sum + d.value, 0);
      return [...top5, { name: "Andere", value: others }];
    }

    // Fallback to Income
    const incomeTags: Record<string, number> = {};
    let totalIncome = 0;
    finanzen.forEach(item => {
      if (item.ist_einnahmen) {
        const amount = safeParseFloat(item.betrag);
          
        if (isNaN(amount)) return;
        
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

    if (totalIncome === 0) return [];

    const rawIncome = Object.entries(incomeTags)
      .map(([tag, amount]) => ({
        name: tag,
        value: amount,
      }))
      .filter(d => d.value > 0);
      
    rawIncome.sort((a, b) => b.value - a.value);
    
    if (rawIncome.length <= 6) return rawIncome;
    const top5 = rawIncome.slice(0, 5);
    const others = rawIncome.slice(5).reduce((sum, d) => sum + d.value, 0);
    return [...top5, { name: "Andere", value: others }];
  }, [finanzen, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[220px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[220px] flex flex-col justify-center">
      <BaseDonutChart
        data={chartData}
        emptyMessage="Keine Transaktionen erfasst."
        valueFormatter={(val) => currencyFormatter0.format(val)}
      />
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

      return {
        isDeposit: false,
        data: Object.entries(statusCounts).map(([name, value]) => ({
          name,
          value
        }))
      };
    }

    return {
      isDeposit: true,
      data: Object.entries(depositStatusCount).map(([name, value]) => ({
        name,
        value
      }))
    };
  }, [tenants]);

  const valueFormatter = useCallback((val: number) => {
    if (segmentsData.isDeposit) {
      return currencyFormatter0.format(val);
    }
    return `${val} Mieter`;
  }, [segmentsData.isDeposit]);

  return (
    <div className="w-full h-full min-h-[220px] flex flex-col justify-center">
      <BaseDonutChart
        data={segmentsData.data}
        emptyMessage="Keine Mieter erfasst."
        valueFormatter={valueFormatter}
      />
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
          count: currencyFormatter0.format(match.count),
          icon: match.icon,
          colorClass: match.colorClass
        };
      }
    }
    return {
      label: "Kosten Gesamt",
      count: currencyFormatter0.format(totalValue),
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Kostenaufteilung</span>
        <span className="font-bold text-accent">
          {currencyFormatter0.format(totalValue)}
        </span>
      </div>

      <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/80 w-full my-1" />

      <div className="flex flex-col items-center gap-3">
        <div className="relative size-40 flex items-center justify-center">
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
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.01]"
                  onMouseEnter={() => setHoveredKey(s.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 animate-in fade-in duration-200">
            <div className={cn("p-1.5 rounded-lg mb-1", activeInfo.colorClass)}>
              <ActiveIcon className="size-4" />
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
                    <Icon className="size-3" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0">
                  {currencyFormatter0.format(s.count)}
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
// 6. Apartments Size Donut Chart
// ==========================================
export interface ApartmentsSizeDonutChartProps {
  apartments: any[];
}

export function ApartmentsSizeDonutChart({ apartments = [] }: ApartmentsSizeDonutChartProps) {
  const chartData = useMemo(() => {
    let small = 0;  // < 45 m²
    let medium = 0; // 45 - 75 m²
    let large = 0;  // 75 - 100 m²
    let xl = 0;     // > 100 m²

    apartments.forEach(apt => {
      const size = Number(apt.groesse || 0);
      if (size <= 0) return;
      if (size < 45) small++;
      else if (size <= 75) medium++;
      else if (size <= 100) large++;
      else xl++;
    });

    return [
      { name: "Klein (< 45 m²)", value: small },
      { name: "Mittel (45 - 75 m²)", value: medium },
      { name: "Groß (75 - 100 m²)", value: large },
      { name: "Sehr Groß (> 100 m²)", value: xl }
    ].filter(item => item.value > 0);
  }, [apartments]);

  return (
    <BaseDonutChart
      data={chartData}
      emptyMessage="Keine Wohnungen erfasst."
      valueFormatter={(val) => `${val} ${val === 1 ? "Wohnung" : "Wohnungen"}`}
    />
  );
}

// ==========================================
// 7. Apartments Occupancy Donut Chart
// ==========================================
export interface ApartmentsOccupancyDonutChartProps {
  apartments: any[];
}

export function ApartmentsOccupancyDonutChart({ apartments = [] }: ApartmentsOccupancyDonutChartProps) {
  const chartData = useMemo(() => {
    let vermietet = 0;
    let frei = 0;

    apartments.forEach(apt => {
      if (apt.status === "vermietet") vermietet++;
      else if (apt.status === "frei") frei++;
    });

    return [
      { name: "Vermietet", value: vermietet },
      { name: "Frei / Leerstand", value: frei }
    ].filter(item => item.value > 0);
  }, [apartments]);

  const colors = [
    "#34d399", // Emerald
    "#f87171", // Rose
  ];

  return (
    <BaseDonutChart
      data={chartData}
      emptyMessage="Keine Wohnungen erfasst."
      valueFormatter={(val) => `${val} ${val === 1 ? "Wohnung" : "Wohnungen"}`}
      colors={colors}
    />
  );
}

// ==========================================
// 8. Apartments Rent per Sqm Bar Chart
// ==========================================
export interface ApartmentsRentPerSqmBarChartProps {
  apartments: any[];
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

const CustomBarTooltip = ({ active, payload }: CustomBarTooltipProps) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-white dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] rounded-xl px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-zinc-800 dark:text-zinc-100 mb-0.5">{d.name}</p>
        <p className="text-emerald-500 font-bold">{d.value.toFixed(2)} €/m²</p>
      </div>
    );
  }
  return null;
};

export function ApartmentsRentPerSqmBarChart({ apartments = [] }: ApartmentsRentPerSqmBarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    const brackets = [
      { name: "Klein (< 45 m²)", totalRent: 0, totalArea: 0 },
      { name: "Mittel (45 - 75 m²)", totalRent: 0, totalArea: 0 },
      { name: "Groß (75 - 100 m²)", totalRent: 0, totalArea: 0 },
      { name: "Sehr Groß (> 100 m²)", totalRent: 0, totalArea: 0 }
    ];

    apartments.forEach(apt => {
      const size = Number(apt.groesse || 0);
      const rent = Number(apt.miete || 0);
      if (size <= 0 || rent <= 0) return;

      if (size < 45) {
        brackets[0].totalRent += rent;
        brackets[0].totalArea += size;
      } else if (size <= 75) {
        brackets[1].totalRent += rent;
        brackets[1].totalArea += size;
      } else if (size <= 100) {
        brackets[2].totalRent += rent;
        brackets[2].totalArea += size;
      } else {
        brackets[3].totalRent += rent;
        brackets[3].totalArea += size;
      }
    });

    return brackets
      .map(b => ({
        name: b.name,
        value: b.totalArea > 0 ? b.totalRent / b.totalArea : 0
      }))
      .filter(b => b.value > 0);
  }, [apartments]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-spin rounded-full size-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (apartments.length === 0 || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-8 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Daten erfasst.</p>
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            className="fill-zinc-400 dark:fill-zinc-500"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={10}
            className="fill-zinc-400 dark:fill-zinc-500"
            tickFormatter={(value) => `${value} €`}
            width={35}
          />
          <Tooltip content={<CustomBarTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={GLOBAL_CHART_COLORS[idx % GLOBAL_CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==========================================
// 9. Apartments Rent Loss Bar Chart
// ==========================================
export interface ApartmentsRentLossBarChartProps {
  apartments: any[];
}

interface StackedTooltipProps {
  active?: boolean;
  payload?: any[];
}

const StackedTooltip = ({ active, payload }: StackedTooltipProps) => {
  if (active && payload && payload.length) {
    const activeRent = payload.find(p => p.dataKey === "activeRent")?.value || 0;
    const lossRent = payload.find(p => p.dataKey === "lossRent")?.value || 0;
    const isRented = payload[0].payload.status === "vermietet";

    return (
      <div className="bg-white dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] rounded-xl px-3 py-2 shadow-md text-xs space-y-1">
        <p className="font-semibold text-zinc-800 dark:text-zinc-100">{payload[0].payload.name}</p>
        <p className={isRented ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
          {isRented ? `Ist-Miete: ${currencyFormatterDefault.format(activeRent)}` : `Leerstands-Verlust: ${currencyFormatterDefault.format(lossRent)}`}
        </p>
      </div>
    );
  }
  return null;
};

export function ApartmentsRentLossBarChart({ apartments = [] }: ApartmentsRentLossBarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    // Sort apartments by rent value (highest to lowest)
    const sorted = [...apartments].sort((a, b) => Number(b.miete || 0) - Number(a.miete || 0));
    
    // Take top 10 apartments
    const top10 = sorted.slice(0, 10);

    return top10.map(apt => {
      const rent = Number(apt.miete || 0);
      const isRented = apt.status === "vermietet";
      const displayLabel = apt.Haeuser?.name ? `${apt.name} (${apt.Haeuser.name})` : apt.name;
      
      return {
        name: displayLabel,
        activeRent: isRented ? rent : 0,
        lossRent: isRented ? 0 : rent,
        status: apt.status
      };
    }).filter(d => d.activeRent > 0 || d.lossRent > 0);
  }, [apartments]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="animate-spin rounded-full size-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (apartments.length === 0 || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-8 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">Keine Daten erfasst.</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 40, bottom: 10 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            className="fill-zinc-400 dark:fill-zinc-500"
            tickFormatter={(value) => `${value} €`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            className="fill-zinc-400 dark:fill-zinc-500"
            width={120}
          />
          <Tooltip content={<StackedTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="activeRent" name="Ist-Miete" stackId="a" fill="#34d399" radius={[0, 4, 4, 0]} />
          <Bar dataKey="lossRent" name="Leerstand" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}




