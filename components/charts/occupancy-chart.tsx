"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const initialOccupancyData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  vermietet: 0,
  frei: 0,
}));

interface OccupancyChartProps {
  initialData?: Array<{ month: string; vermietet: number; frei: number }>;
}

export function OccupancyChart({ initialData }: OccupancyChartProps) {
  const [occupancyData, setOccupancyData] = useState(initialData || initialOccupancyData);

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

  useEffect(() => {
    if (initialData) {
      setOccupancyData(initialData);
    }
  }, [initialData]);

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Belegung</CardTitle>
        <CardDescription>Wohnungsbelegung nach Monat</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0" ref={containerRef}>
        <ChartContainer
          className="w-full h-full"
          config={{
            vermietet: { label: "Vermietet", color: "hsl(var(--chart-1))" },
            frei: { label: "Frei", color: "hsl(var(--chart-3))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={occupancyData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={25} tickCount={tickCount} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="vermietet" stroke="var(--color-vermietet)" strokeWidth={2} />
              <Line type="monotone" dataKey="frei" stroke="var(--chart-3)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
