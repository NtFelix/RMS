"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#34d399", "#f59e42", "#818cf8", "#f87171"];

const placeholderData = [
  { name: "Instandhaltung", value: 0 },
  { name: "Reparatur", value: 0 },
  { name: "Steuern", value: 0 },
  { name: "Rücklage", value: 0 },
];

export function MaintenanceDonutChart() {
  // TODO: Replace with dynamic data from Finanzen if needed
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-sm">Instandhaltung</CardTitle>
        <CardDescription className="text-xs">Verteilung nach Kategorie</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={placeholderData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              fill="#8884d8"
              paddingAngle={2}
            >
              {placeholderData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}