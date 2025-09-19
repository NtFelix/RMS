"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { createClient } from "@/utils/supabase/client";

const initialRevenueData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  einnahmen: 0,
  ausgaben: 0,
}));

export function RevenueExpensesChart() {
  const [revenueData, setRevenueData] = useState(initialRevenueData);

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
      
      // Fetch ALL finance data without any limits
      let allFinanzenData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("Finanzen")
          .select("*")
          .order("datum", { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching finance data:", error);
          return;
        }

        if (data && data.length > 0) {
          allFinanzenData = [...allFinanzenData, ...data];
          page++;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const finanzenData = allFinanzenData;

      // Finanzdaten nach Monaten gruppieren
      type MonthlyData = { month: string; einnahmen: number; ausgaben: number; };
      const monthlyFinances = finanzenData.reduce<Record<string, MonthlyData>>((acc, item) => {
        if (!item.datum) return acc;
        const date = new Date(item.datum);
        const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { month, einnahmen: 0, ausgaben: 0 };
        }
        if (item.ist_einnahmen) {
          acc[monthKey].einnahmen += Number(item.betrag);
        } else {
          acc[monthKey].ausgaben += Number(item.betrag);
        }
        return acc;
      }, {});

      const lastMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      });

      const formattedRevenueData = lastMonths.map(monthKey =>
        monthlyFinances[monthKey] || {
          month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(
            new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1, 1)
          ),
          einnahmen: 0,
          ausgaben: 0,
        }
      );

      setRevenueData(formattedRevenueData);
    };
    fetchData();
  }, []);

  return (
    <Card className="h-full flex flex-col rounded-xl">
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
              data={revenueData}
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