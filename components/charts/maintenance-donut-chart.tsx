"use client";
import React, { useEffect, useReducer } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";

// Dynamically import Recharts components to reduce bundle size
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });

type FinanzDaten = {
  id: string;
  name: string | null;
  betrag: string | number | null;
  ist_einnahmen: boolean;
  datum: string | null;
  wohnung_id: string | null;
  notiz?: string | null;
  kategorie?: string | null;
  created_at?: string;
  updated_at?: string;
};

const COLORS = ["#34d399", "#f59e42", "#818cf8", "#f87171"];

// Custom tooltip formatter created once at module level
const currencyFormatter = new Intl.NumberFormat('de-DE', { 
  style: 'currency', 
  currency: 'EUR' 
});

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

// Custom tooltip to format currency
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: MaintenanceData;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-2 border rounded shadow-lg">
        <p className="text-sm font-medium">{data.name}</p>
        <p className="text-sm text-blue-600">
          {currencyFormatter.format(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

type ChartState = {
  data: MaintenanceData[];
  loading: boolean;
};

type ChartAction =
  | { type: 'FETCH_SUCCESS'; payload: MaintenanceData[] }
  | { type: 'FETCH_ERROR' };

function chartReducer(state: ChartState, action: ChartAction): ChartState {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { data: action.payload, loading: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function MaintenanceDonutChart() {
  const [state, dispatch] = useReducer(chartReducer, {
    data: initialData,
    loading: true,
  });

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      const supabase = createClient();
      
      try {
        // Fetch ALL finance data without limits - expenses only
        let allFinanzenData: FinanzDaten[] = [];
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
            dispatch({ type: 'FETCH_ERROR' });
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
        
        dispatch({
          type: 'FETCH_SUCCESS',
          payload: filteredData.length > 0 ? filteredData : [{ name: "Keine Daten", value: 1 }]
        });
      } catch (error) {
        console.error("Error processing maintenance data:", error);
        dispatch({ type: 'FETCH_ERROR' });
      }
    };

    fetchMaintenanceData();
  }, []);

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Ausgaben nach Kategorie</CardTitle>
        <CardDescription>Verteilung der Betriebskosten</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        {state.loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={state.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                fill="#8884d8"
                paddingAngle={2}
              >
                {state.data.map((entry, idx) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[idx % COLORS.length]} />
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