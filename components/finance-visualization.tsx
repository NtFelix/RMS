"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

interface FinanceVisualizationProps {
  finances: { month: string; Einnahmen: number; Ausgaben: number }[]
  loading?: boolean
}

export function FinanceVisualization({ finances, loading }: FinanceVisualizationProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Finanzvisualisierung</CardTitle>
          <CardDescription>Monatliche Einnahmen und Ausgaben</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const hasData = finances.some(item => item.Einnahmen > 0 || item.Ausgaben > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finanzvisualisierung</CardTitle>
        <CardDescription>Monatliche Einnahmen und Ausgaben</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={finances}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Legend />
              <Bar dataKey="Einnahmen" fill="#16a34a" name="Einnahmen" />
              <Bar dataKey="Ausgaben" fill="#dc2626" name="Ausgaben" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground">Keine Daten für die Visualisierung verfügbar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
