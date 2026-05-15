"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const initialRevenueData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  einnahmen: 0,
  ausgaben: 0,
}));

interface RevenueExpensesChartProps {
  initialData?: Array<{ month: string; einnahmen: number; ausgaben: number }>;
}

export function RevenueExpensesChart({ initialData }: RevenueExpensesChartProps) {
  const [revenueData, setRevenueData] = useState(initialData || initialRevenueData);

  // Dynamic tick count for Y axis
  const [tickCount, setTickCount] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      setTickCount(Math.max(3, Math.floor(h / 50)));
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Display data is either from props or from internal state
  const displayData = initialData || revenueData;

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Einnahmen & Ausgaben</CardTitle>
        <CardDescription>Monatliche Übersicht der Finanzen</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-3 min-h-0" ref={containerRef}>
        <ChartContainer
          className="w-full h-full"
          config={{
            einnahmen: { label: "Einnahmen", color: "hsl(var(--chart-1))" },
            ausgaben: { label: "Ausgaben", color: "hsl(var(--chart-2))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} tickCount={tickCount} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" radius={4} />
              <Bar dataKey="ausgaben" fill="var(--color-ausgaben)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
