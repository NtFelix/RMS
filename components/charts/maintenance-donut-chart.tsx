"use client";
import React, { useEffect, useReducer } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";

// Dynamically import Recharts components to reduce bundle size
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });

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

const initialDataPlaceholder: MaintenanceData[] = [
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

interface MaintenanceDonutChartProps {
  initialData?: MaintenanceData[];
}

export function MaintenanceDonutChart({ initialData }: MaintenanceDonutChartProps) {
  const [state, dispatch] = useReducer(chartReducer, {
    data: initialData || initialDataPlaceholder,
    loading: !initialData,
  });

  useEffect(() => {
    if (initialData) {
      dispatch({ type: 'FETCH_SUCCESS', payload: initialData });
    }
  }, [initialData]);

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Ausgaben nach Kategorie</CardTitle>
        <CardDescription>Verteilung der Betriebskosten</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        {state.loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full size-8 border-t-2 border-b-2 border-primary" />
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
