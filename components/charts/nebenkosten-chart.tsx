"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/utils/supabase/client";

const COLORS = ["#34d399", "#f59e42", "#818cf8", "#f87171", "#a78bfa", "#fb923c", "#4ade80", "#fbbf24"];

type NebenkostenData = {
  name: string;
  value: number;
};

export function NebenkostenChart() {
  const [nebenkostenData, setNebenkostenData] = useState<NebenkostenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNebenkostenData = async () => {
      const supabase = createClient();
      
      try {
        // Calculate date range for last year
        const now = new Date();
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        
        const startDate = oneYearAgo.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];

        // Fetch Nebenkosten data from the last year
        const { data: nebenkostenRecords, error } = await supabase
          .from("Nebenkosten")
          .select("nebenkostenart, betrag, startdatum, enddatum")
          .gte("enddatum", startDate)
          .lte("startdatum", endDate)
          .order("startdatum", { ascending: false });

        if (error) {
          console.error("Error fetching Nebenkosten data:", error);
          setLoading(false);
          return;
        }

        // Aggregate costs by category
        const categoryTotals: Record<string, number> = {};

        nebenkostenRecords?.forEach((record) => {
          const arten = record.nebenkostenart || [];
          const betraege = record.betrag || [];

          arten.forEach((art: string, index: number) => {
            if (art && betraege[index]) {
              const betrag = Number(betraege[index]) || 0;
              categoryTotals[art] = (categoryTotals[art] || 0) + betrag;
            }
          });
        });

        // Format data for the chart
        const formattedData: NebenkostenData[] = Object.entries(categoryTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value); // Sort by value descending

        setNebenkostenData(formattedData.length > 0 ? formattedData : [
          { name: "Keine Daten", value: 1 }
        ]);
      } catch (error) {
        console.error("Error processing Nebenkosten data:", error);
        setNebenkostenData([{ name: "Keine Daten", value: 1 }]);
      } finally {
        setLoading(false);
      }
    };

    fetchNebenkostenData();
  }, []);

  // Custom tooltip to format currency
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: NebenkostenData;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border rounded shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {new Intl.NumberFormat('de-DE', { 
              style: 'currency', 
              currency: 'EUR' 
            }).format(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Nebenkosten nach Kategorie</CardTitle>
        <CardDescription>Verteilung der Betriebskosten im letzten Jahr</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={nebenkostenData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                fill="#8884d8"
                paddingAngle={2}
              >
                {nebenkostenData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
