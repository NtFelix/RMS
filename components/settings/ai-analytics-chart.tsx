"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  input: { label: "Input", color: "var(--color-chart-1, #2563eb)" },
  output: { label: "Output", color: "var(--color-chart-2, #16a34a)" },
} satisfies ChartConfig

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("de-DE")
}

interface AIAnalyticsChartProps {
  timeSeriesData: { date: string; input: number; output: number }[]
  is8h: boolean
}

export function AIAnalyticsChart({ timeSeriesData, is8h }: AIAnalyticsChartProps) {
  if (timeSeriesData.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Daten</p>
  }

  const startLabel = timeSeriesData[0]?.date
  const middleIndex = Math.floor(timeSeriesData.length / 2)
  const middleLabel = timeSeriesData[middleIndex]?.date
  const endLabel = timeSeriesData[timeSeriesData.length - 1]?.date

  const formatXAxisTick = (value: string) => {
    if (value === startLabel || value === middleLabel || value === endLabel) {
      return value
    }
    return ""
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={timeSeriesData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={formatXAxisTick}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatNumber}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="input"
            stackId="tokens"
            fill="var(--color-input)"
            radius={[0, 0, 0, 0]}
            maxBarSize={is8h ? 24 : 40}
          />
          <Bar
            dataKey="output"
            stackId="tokens"
            fill="var(--color-output)"
            radius={[4, 4, 0, 0]}
            maxBarSize={is8h ? 24 : 40}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
