"use client";

import type { NebenkostenChartDatum } from "@/lib/data-fetching";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = [
  'var(--chart-color-1)',
  'var(--chart-color-2)',
  'var(--chart-color-3)',
  'var(--chart-color-4)',
  'var(--chart-color-5)',
  'var(--chart-color-6)',
  'var(--chart-color-7)',
  'var(--chart-color-8)'
];

const EMPTY_COLOR = 'var(--chart-color-empty)';

interface NebenkostenChartProps {
  nebenkostenData: NebenkostenChartDatum[];
  year: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: NebenkostenChartDatum;
  }>;
}

const EMPTY_STATE: NebenkostenChartDatum[] = [
  { name: "Keine Daten", value: 1 }
];

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="font-mono font-medium tabular-nums text-foreground">
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

export function NebenkostenChart({ nebenkostenData, year }: NebenkostenChartProps) {
  const hasData = nebenkostenData.length > 0;
  const data = hasData ? nebenkostenData : EMPTY_STATE;
  const colors = hasData ? COLORS : [EMPTY_COLOR];

  return (
    <Card className="h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Nebenkosten nach Kategorie</CardTitle>
        </div>
        <CardDescription>Verteilung der Betriebskosten (Jahr {year})</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              fill="#8884d8"
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell 
                  key={`cell-${idx}`} 
                  fill={colors[idx % colors.length]} 
                />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {hasData && <Tooltip content={<CustomTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
