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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Instandhaltung</CardTitle>
        <CardDescription>Verteilung nach Kategorie</CardDescription>
      </CardHeader>
      <CardContent className="h-full p-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={placeholderData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              fill="#8884d8"
              paddingAngle={2}
            >
              {placeholderData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}