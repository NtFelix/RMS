"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/utils/supabase/client";

const COLORS = ["#34d399", "#f59e42", "#818cf8", "#f87171"];

type MaintenanceData = {
  name: string;
  value: number;
};

const initialData: MaintenanceData[] = [
  { name: "Instandhaltung", value: 0 },
  { name: "Reparatur", value: 0 },
  { name: "Steuern", value: 0 },
  { name: "Sonstige", value: 0 },
];

export function MaintenanceDonutChart() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData[]>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      const supabase = createClient();
      
      try {
        // Fetch ALL finance data without limits - expenses only
        let allFinanzenData: any[] = [];
        let page = 0;
        const pageSize = 5000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("Finanzen")
            .select("*")
            .eq("ist_einnahmen", false) // Only expenses
            .order("datum", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            console.error("Error fetching maintenance data:", error);
            setLoading(false);
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

        // Categorize expenses based on keywords in the name
        const categories = {
          instandhaltung: 0,
          reparatur: 0,
          steuern: 0,
          sonstige: 0,
        };

        allFinanzenData.forEach((item) => {
          const name = item.name?.toLowerCase() || "";
          const betrag = Number(item.betrag) || 0;

          if (name.includes("instandhaltung") || name.includes("wartung") || name.includes("pflege")) {
            categories.instandhaltung += betrag;
          } else if (name.includes("reparatur") || name.includes("reparieren") || name.includes("defekt")) {
            categories.reparatur += betrag;
          } else if (name.includes("steuer") || name.includes("abgabe") || name.includes("gebühr")) {
            categories.steuern += betrag;
          } else {
            categories.sonstige += betrag;
          }
        });

        // Format data for the chart
        const formattedData: MaintenanceData[] = [
          { name: "Instandhaltung", value: categories.instandhaltung },
          { name: "Reparatur", value: categories.reparatur },
          { name: "Steuern", value: categories.steuern },
          { name: "Sonstige", value: categories.sonstige },
        ];

        // Only show categories with values > 0
        const filteredData = formattedData.filter(item => item.value > 0);
        
        setMaintenanceData(filteredData.length > 0 ? filteredData : [
          { name: "Keine Daten", value: 1 }
        ]);
      } catch (error) {
        console.error("Error processing maintenance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceData();
  }, []);

  // Custom tooltip to format currency
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-blue-600">
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
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">Ausgaben nach Kategorie</CardTitle>
        <CardDescription className="text-xs">
          {loading ? "Lade Daten..." : "Verteilung der Ausgaben"}
        </CardDescription>
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
                data={maintenanceData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                fill="#8884d8"
                paddingAngle={2}
              >
                {maintenanceData.map((entry, idx) => (
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