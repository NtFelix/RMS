"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: finanzenData, error } = await supabase
        .from("Finanzen")
        .select("*")
        .order("datum", { ascending: true });

      if (error) return;

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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Einnahmen & Ausgaben</CardTitle>
        <CardDescription>Monatliche Übersicht über Mieteinnahmen und Betriebskosten</CardDescription>
      </CardHeader>
      <CardContent className="chart-container h-[280px]">
        <ChartContainer
          config={{
            einnahmen: { label: "Einnahmen", color: "hsl(var(--chart-1))" },
            ausgaben: { label: "Ausgaben", color: "hsl(var(--chart-2))" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" radius={4} />
              <Bar dataKey="ausgaben" fill="var(--color-ausgaben)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}