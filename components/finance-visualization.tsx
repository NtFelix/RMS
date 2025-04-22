"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Einnahmen nach Wohnung (simulierte Daten)
const incomeByApartment = [
  { name: "LSF 2. OG", value: 5820 },
  { name: "VH 3.0G rechts", value: 14100 },
  { name: "VH - frei und erfunden", value: 17400 },
  { name: "erfunden", value: 9300 },
  { name: "fantasie-groß", value: 4050 },
  { name: "fantasie", value: 2880 },
  { name: "VH DG 2.5.0", value: 6000 },
  { name: "RSF 5.0 löschen", value: 40000 },
]

// Monatliche Einnahmen
const monthlyIncome = [
  { month: "Jan", einnahmen: 7500 },
  { month: "Feb", einnahmen: 7500 },
  { month: "Mär", einnahmen: 7500 },
  { month: "Apr", einnahmen: 7500 },
  { month: "Mai", einnahmen: 7500 },
  { month: "Jun", einnahmen: 7500 },
  { month: "Jul", einnahmen: 7500 },
  { month: "Aug", einnahmen: 7500 },
  { month: "Sep", einnahmen: 7500 },
  { month: "Okt", einnahmen: 7500 },
  { month: "Nov", einnahmen: 7500 },
  { month: "Dez", einnahmen: 7500 },
]

// Einnahmen-Ausgaben-Verhältnis
const incomeExpenseRatio = [
  { month: "Jan", einnahmen: 7500, ausgaben: 1850 },
  { month: "Feb", einnahmen: 7500, ausgaben: 1900 },
  { month: "Mär", einnahmen: 7500, ausgaben: 1850 },
  { month: "Apr", einnahmen: 7500, ausgaben: 1800 },
  { month: "Mai", einnahmen: 7500, ausgaben: 1750 },
  { month: "Jun", einnahmen: 7500, ausgaben: 1900 },
  { month: "Jul", einnahmen: 7500, ausgaben: 1850 },
  { month: "Aug", einnahmen: 7500, ausgaben: 1800 },
  { month: "Sep", einnahmen: 7500, ausgaben: 1750 },
  { month: "Okt", einnahmen: 7500, ausgaben: 1900 },
  { month: "Nov", einnahmen: 7500, ausgaben: 1850 },
  { month: "Dez", einnahmen: 7500, ausgaben: 1800 },
]

// Ausgabenkategorien
const expenseCategories = [
  { name: "Instandhaltung", value: 9500 },
  { name: "Versicherungen", value: 4200 },
  { name: "Steuern", value: 6300 },
  { name: "Verwaltung", value: 2100 },
  { name: "Sonstiges", value: 1400 },
]

// Farben für Pie Chart
const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"]

export function FinanceVisualization() {
  const [selectedYear, setSelectedYear] = useState("2024")

  return (
    <Tabs defaultValue="apartment-income" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4 sm:mb-0">
          <TabsTrigger value="apartment-income">Einnahmen nach Wohnung</TabsTrigger>
          <TabsTrigger value="monthly-income">Monatliche Einnahmen</TabsTrigger>
          <TabsTrigger value="income-expense">Einnahmen-Ausgaben-Verhältnis</TabsTrigger>
          <TabsTrigger value="expense-categories">Ausgabenkategorien</TabsTrigger>
        </TabsList>
        <Select defaultValue={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Jahr auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2022">2022</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TabsContent value="apartment-income">
        <Card>
          <CardHeader>
            <CardTitle>Einnahmen nach Wohnung</CardTitle>
            <CardDescription>Verteilung der Mieteinnahmen nach Wohnungen in {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeByApartment}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incomeByApartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} €`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monthly-income">
        <Card>
          <CardHeader>
            <CardTitle>Monatliche Einnahmen</CardTitle>
            <CardDescription>Monatliche Einnahmen für das Jahr {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChartContainer
                config={{
                  einnahmen: {
                    label: "Einnahmen",
                    color: "hsl(var(--chart-1))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyIncome}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="einnahmen" stroke="var(--color-einnahmen)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="income-expense">
        <Card>
          <CardHeader>
            <CardTitle>Einnahmen-Ausgaben-Verhältnis</CardTitle>
            <CardDescription>Vergleich von Einnahmen und Ausgaben im Jahr {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChartContainer
                config={{
                  einnahmen: {
                    label: "Einnahmen",
                    color: "hsl(var(--chart-1))",
                  },
                  ausgaben: {
                    label: "Ausgaben",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeExpenseRatio}>
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
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="expense-categories">
        <Card>
          <CardHeader>
            <CardTitle>Ausgabenkategorien</CardTitle>
            <CardDescription>Verteilung der Ausgaben nach Kategorien in {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} €`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
