"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Beispieldaten für die Charts
const revenueData = [
  { month: "Jan", einnahmen: 48500, ausgaben: 18200 },
  { month: "Feb", einnahmen: 49200, ausgaben: 17800 },
  { month: "Mär", einnahmen: 50100, ausgaben: 18400 },
  { month: "Apr", einnahmen: 51200, ausgaben: 18600 },
  { month: "Mai", einnahmen: 52400, ausgaben: 18650 },
  { month: "Jun", einnahmen: 52400, ausgaben: 19100 },
  { month: "Jul", einnahmen: 53100, ausgaben: 19300 },
  { month: "Aug", einnahmen: 53800, ausgaben: 19500 },
  { month: "Sep", einnahmen: 54200, ausgaben: 19800 },
  { month: "Okt", einnahmen: 54800, ausgaben: 20100 },
  { month: "Nov", einnahmen: 55200, ausgaben: 20400 },
  { month: "Dez", einnahmen: 55800, ausgaben: 20800 },
]

const occupancyData = [
  { month: "Jan", vermietet: 42, frei: 6 },
  { month: "Feb", vermietet: 43, frei: 5 },
  { month: "Mär", vermietet: 44, frei: 4 },
  { month: "Apr", vermietet: 45, frei: 3 },
  { month: "Mai", vermietet: 45, frei: 3 },
  { month: "Jun", vermietet: 46, frei: 2 },
  { month: "Jul", vermietet: 47, frei: 1 },
  { month: "Aug", vermietet: 48, frei: 0 },
  { month: "Sep", vermietet: 48, frei: 0 },
  { month: "Okt", vermietet: 47, frei: 1 },
  { month: "Nov", vermietet: 46, frei: 2 },
  { month: "Dez", vermietet: 45, frei: 3 },
]

const maintenanceData = [
  { month: "Jan", reparaturen: 3, renovierungen: 1 },
  { month: "Feb", reparaturen: 2, renovierungen: 0 },
  { month: "Mär", reparaturen: 4, renovierungen: 1 },
  { month: "Apr", reparaturen: 2, renovierungen: 2 },
  { month: "Mai", reparaturen: 3, renovierungen: 0 },
  { month: "Jun", reparaturen: 5, renovierungen: 1 },
  { month: "Jul", reparaturen: 2, renovierungen: 0 },
  { month: "Aug", reparaturen: 1, renovierungen: 3 },
  { month: "Sep", reparaturen: 3, renovierungen: 0 },
  { month: "Okt", reparaturen: 4, renovierungen: 1 },
  { month: "Nov", reparaturen: 2, renovierungen: 0 },
  { month: "Dez", reparaturen: 3, renovierungen: 2 },
]

export function DashboardCharts() {
  return (
    <Tabs defaultValue="einnahmen" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="einnahmen">Einnahmen & Ausgaben</TabsTrigger>
        <TabsTrigger value="belegung">Belegung</TabsTrigger>
        <TabsTrigger value="instandhaltung">Instandhaltung</TabsTrigger>
      </TabsList>
      <TabsContent value="einnahmen">
        <Card>
          <CardHeader>
            <CardTitle>Einnahmen & Ausgaben</CardTitle>
            <CardDescription>Monatliche Übersicht über Mieteinnahmen und Betriebskosten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
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
                  <BarChart data={revenueData}>
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
      <TabsContent value="belegung">
        <Card>
          <CardHeader>
            <CardTitle>Belegung</CardTitle>
            <CardDescription>Monatliche Übersicht über vermietete und freie Wohnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ChartContainer
                config={{
                  vermietet: {
                    label: "Vermietet",
                    color: "hsl(var(--chart-1))",
                  },
                  frei: {
                    label: "Frei",
                    color: "hsl(var(--chart-3))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="vermietet" stroke="var(--color-vermietet)" strokeWidth={2} />
                    <Line type="monotone" dataKey="frei" stroke="var(--color-frei)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="instandhaltung">
        <Card>
          <CardHeader>
            <CardTitle>Instandhaltung</CardTitle>
            <CardDescription>Monatliche Übersicht über Reparaturen und Renovierungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ChartContainer
                config={{
                  reparaturen: {
                    label: "Reparaturen",
                    color: "hsl(var(--chart-4))",
                  },
                  renovierungen: {
                    label: "Renovierungen",
                    color: "hsl(var(--chart-5))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="reparaturen" fill="var(--color-reparaturen)" radius={4} />
                    <Bar dataKey="renovierungen" fill="var(--color-renovierungen)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
