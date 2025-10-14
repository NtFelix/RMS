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

      const [
        { data: wohnungen, error: wohnungenError },
        { data: mieter, error: mieterError }
      ] = await Promise.all([
        supabase.from("Wohnungen").select("*"),
        supabase.from("Mieter").select("id, einzug, auszug")
      ]);

      if (wohnungenError || mieterError || !wohnungen || !mieter) return;

      // Pre-process move-in/out dates once
      const mieterWithDates = mieter.map(m => ({
        id: m.id,
        einzug: m.einzug ? new Date(m.einzug) : null,
        auszug: m.auszug ? new Date(m.auszug) : null
      }));

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      type OccupancyData = { month: string; vermietet: number; frei: number; };
      const occupancy: Record<string, OccupancyData> = {};

      // Get the last 12 months including current month
      for (let i = 0; i < 12; i++) {
        // Calculate the target month (0-11, where 0 is January)
        const targetMonth = (currentMonth - 11 + i + 12) % 12;
        // Calculate the target year (adjust year if we wrap around)
        const yearAdjustment = Math.floor((currentMonth - 11 + i) / 12);
        const targetYear = currentYear + yearAdjustment;
        
        // Create date for the first day of the target month
        const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
        const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0);
        
        // Format month for display
        const monthName = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(firstDayOfMonth);
        const monthKey = `${targetYear}-${targetMonth + 1}`;
        
        // Count occupied apartments for this month
        let vermietetCount = 0;
        
        for (const m of mieterWithDates) {
          if (!m.einzug) continue; // Skip if no move-in date
          
          const movedIn = m.einzug <= lastDayOfMonth;
          const notMovedOut = !m.auszug || m.auszug >= firstDayOfMonth;
          
          if (movedIn && notMovedOut) {
            vermietetCount++;
          }
        }
        
        occupancy[monthKey] = {
          month: monthName,
          vermietet: vermietetCount,
          frei: Math.max(0, wohnungen.length - vermietetCount),
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
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border-2 border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
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