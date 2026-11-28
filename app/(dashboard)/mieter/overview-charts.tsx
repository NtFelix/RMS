"use client";

import { LazyMotion, domMax, m } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type NebenkostenTimeframe = "1" | "2" | "5";

export interface NebenkostenTrendPoint {
  name: string;
  amount: number;
  distribution?: Array<{ tenantId: string; tenantName: string; amount: number }>;
}

interface NebenkostenTrendCardProps {
  trend: NebenkostenTrendPoint[];
  selectedTimeframe: NebenkostenTimeframe;
  onTimeframeChange: (timeframe: NebenkostenTimeframe) => void;
}

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

// Custom tooltip showing total monthly prepayments
const CustomNebenkostenTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: NebenkostenTrendPoint }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xl backdrop-blur-xs text-xs flex flex-col gap-3 min-w-[220px] animate-in fade-in duration-150 z-50">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">Nebenkosten-Trend</span>
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{data.name}</span>
        </div>
        
        <div className="flex items-center justify-between font-bold text-zinc-950 dark:text-zinc-50">
          <span>Gesamt:</span>
          <span className="text-accent font-bold text-sm">
            {currencyFormatter.format(data.amount)}
          </span>
        </div>

        {data.distribution && data.distribution.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block mb-1">Aufteilung nach Mieter</span>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
              {data.distribution.map((dist) => (
                <div key={dist.tenantId} className="flex justify-between items-center text-zinc-700 dark:text-zinc-300 gap-4">
                  <span className="truncate max-w-[120px] font-medium">{dist.tenantName}</span>
                  <span className="font-semibold shrink-0">{currencyFormatter.format(dist.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Eigene Datei, damit recharts und framer-motion nur beim Öffnen der Übersicht geladen werden (next/dynamic im client-wrapper).
// Layout-Animation der Zeitraum-Auswahl (layoutId) braucht die Layout-Features von domMax.
export default function NebenkostenTrendCard({ trend, selectedTimeframe, onTimeframeChange }: NebenkostenTrendCardProps) {
  return (
    <LazyMotion features={domMax}>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Nebenkosten-Vorauszahlungs-Trends (€)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verteilungsvergleich der monatlichen Vorauszahlungspauschalen nach Mieter
            </p>
          </div>

          {/* Timeframe selector pill */}
          <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200/20 dark:border-zinc-800/20 p-1 rounded-full relative w-full sm:w-auto self-start sm:self-center select-none overflow-hidden">
            {(["1", "2", "5"] as const).map((timeframe) => {
              const label = timeframe === "1" ? "1 Jahr" : timeframe === "2" ? "2 Jahre" : "5 Jahre";
              const isActive = selectedTimeframe === timeframe;
              return (
                <button
                  key={timeframe}
                  type="button"
                  onClick={() => onTimeframeChange(timeframe)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 relative cursor-pointer min-w-[70px] text-center z-10",
                    isActive
                      ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <m.div
                      layoutId="nebenkosten-timeframe-pill"
                      className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-xs border border-zinc-200/10 dark:border-zinc-600/30 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 mt-6">
          {trend.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-100/50 dark:bg-zinc-800/20 rounded-2xl border border-zinc-200/20">
              <TrendingUp className="size-8 text-muted-foreground/30 mb-2" />
              <span className="text-sm font-medium text-muted-foreground">
                Keine erfassten Nebenkostenwerte vorhanden
              </span>
              <span className="text-xs text-muted-foreground/60 max-w-[240px] mt-1">
                Fügen Sie Nebenkosteneinträge bei Ihren Mietern hinzu, um Trends und Preisanomalien zu visualisieren.
              </span>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value} €`} 
                  />
                  <RechartsTooltip content={<CustomNebenkostenTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </LazyMotion>
  );
}
