"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });

interface TenantFluctuationDatum {
  month: string;
  einzüge: number;
  auszüge: number;
}

interface TenantFluctuationChartProps {
  data: TenantFluctuationDatum[];
}

// Dynamic tick count for Y axis
const useDynamicTickCount = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const [tickCount, setTickCount] = useState(5);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setTickCount(Math.max(3, Math.floor(h / 50)));
    });
    const currentRef = containerRef.current;
    if (currentRef) {
      ro.observe(currentRef);
    }
    return () => ro.disconnect();
  }, [containerRef]);

  return tickCount;
};

export function TenantFluctuationChart({ data }: TenantFluctuationChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tickCount = useDynamicTickCount(containerRef);

  // Calculate max value for better Y-axis scaling
  const maxValue = useMemo(() => {
    if (data.length === 0) return 5;
    const maxEinzüge = Math.max(...data.map(d => d.einzüge), 0);
    const maxAuszüge = Math.max(...data.map(d => d.auszüge), 0);
    const maxTotal = Math.max(maxEinzüge, maxAuszüge);
    
    // Round up to nearest "nice" number
    if (maxTotal === 0) return 5;
    if (maxTotal <= 1) return 2;
    if (maxTotal <= 2) return 3;
    if (maxTotal <= 3) return 4;
    if (maxTotal <= 5) return 6;
    if (maxTotal <= 8) return 10;
    if (maxTotal <= 10) return 12;
    
    // For larger values, round up to nearest multiple of 2, 5, or 10
    if (maxTotal <= 20) {
      const rounded = Math.ceil(maxTotal / 2) * 2;
      return rounded > maxTotal ? rounded : rounded + 2;
    }
    
    const rounded = Math.ceil(maxTotal / 5) * 5;
    return rounded > maxTotal ? rounded : rounded + 5;
  }, [data]);

  return (
    <Card className="w-full h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
      <CardHeader className="px-0 pt-0 shrink-0 pb-2">
        <CardTitle className="text-base font-semibold">Mieter-Fluktuation</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Ein- und Auszüge der letzten 12 Monate
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 mt-4 flex-1 flex flex-col min-h-0 relative" ref={containerRef}>
        <div className="w-full h-full" role="figure" aria-label="Mieter-Fluktuation Balkendiagramm der letzten 12 Monate">
          <ChartContainer
          className="w-full h-full aspect-auto"
          config={{
            einzüge: { label: "Einzüge", color: "hsl(var(--chart-1))" },
            auszüge: { label: "Auszüge", color: "hsl(var(--chart-2))" },
          }}
        >
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis 
              tick={{ fontSize: 11 }} 
              width={40} 
              tickCount={tickCount}
              domain={[0, maxValue]}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="einzüge" fill="var(--color-einzüge)" radius={4} />
            <Bar dataKey="auszüge" fill="var(--color-auszüge)" radius={4} />
          </BarChart>
        </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
