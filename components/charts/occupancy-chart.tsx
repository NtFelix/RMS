"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { createClient } from "@/utils/supabase/client";

const initialOccupancyData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  vermietet: 0,
  frei: 0,
}));

export function OccupancyChart() {
  const [occupancyData, setOccupancyData] = useState(initialOccupancyData);

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
    const fetchData = async () => {
      const supabase = createClient();

      const { data: wohnungen, error: wohnungenError } = await supabase
        .from("Wohnungen")
        .select("*");
      const { data: mieter, error: mieterError } = await supabase
        .from("Mieter")
        .select("*");

      if (wohnungenError || mieterError) return;

      const now = new Date();
      type OccupancyData = { month: string; vermietet: number; frei: number; };
      const occupancy: Record<string, OccupancyData> = {};

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const vermietetCount = mieter.filter(m => {
          const einzug = m.einzug ? new Date(m.einzug) : null;
          const auszug = m.auszug ? new Date(m.auszug) : null;
          return einzug && einzug <= date && (!auszug || auszug >= date);
        }).length;
        occupancy[monthKey] = {
          month,
          vermietet: vermietetCount,
          frei: wohnungen.length - vermietetCount,
        };
      }

      const lastMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      });

      const formattedOccupancyData = lastMonths.map(monthKey =>
        occupancy[monthKey] || {
          month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(
            new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1, 1)
          ),
          vermietet: 0,
          frei: 0,
        }
      );

      setOccupancyData(formattedOccupancyData);
    };

    fetchData();
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">Belegung</CardTitle>
        <CardDescription className="text-xs">Monatliche Übersicht über vermietete und freie Wohnungen</CardDescription>
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