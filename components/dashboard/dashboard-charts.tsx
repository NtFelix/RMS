"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { createClient } from "@/utils/supabase/client"

// Platzhalter-Daten für initiale Anzeige (werden durch echte Daten ersetzt)
const initialRevenueData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  einnahmen: 0,
  ausgaben: 0,
}))

const initialOccupancyData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][i],
  vermietet: 0,
  frei: 0,
}))

export function DashboardCharts() {
  const [revenueData, setRevenueData] = useState(initialRevenueData)
  const [occupancyData, setOccupancyData] = useState(initialOccupancyData)
  
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // Finanzdaten abrufen
      const { data: finanzenData, error: finanzenError } = await supabase
        .from("Finanzen")
        .select('*')
        .order('datum', { ascending: true })
      
      if (finanzenError) {
        console.error("Fehler beim Abrufen der Finanzdaten:", finanzenError)
        return
      }
      
      // Wohnungen und Mieter abrufen für Belegungsstatistik
      const { data: wohnungen, error: wohnungenError } = await supabase
        .from("Wohnungen")
        .select('*')
      
      const { data: mieter, error: mieterError } = await supabase
        .from("Mieter")
        .select('*')
      
      if (wohnungenError || mieterError) {
        console.error("Fehler beim Abrufen der Wohnungen oder Mieter:", wohnungenError || mieterError)
        return
      }
      
      // Finanzdaten nach Monaten gruppieren
      type MonthlyData = {
        month: string;
        einnahmen: number;
        ausgaben: number;
      }
      
      const monthlyFinances = finanzenData.reduce<Record<string, MonthlyData>>((acc, item) => {
        if (!item.datum) return acc
        
        const date = new Date(item.datum)
        const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month,
            einnahmen: 0,
            ausgaben: 0,
          }
        }
        
        if (item.ist_einnahmen) {
          acc[monthKey].einnahmen += Number(item.betrag)
        } else {
          acc[monthKey].ausgaben += Number(item.betrag)
        }
        
        return acc
      }, {})
      
      // Belegungsstatistik nach Monaten berechnen
      const now = new Date()
      type OccupancyData = {
        month: string;
        vermietet: number;
        frei: number;
      }
      
      const occupancy: Record<string, OccupancyData> = {}
      
      // Letzten 12 Monate durchgehen
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now)
        date.setMonth(date.getMonth() - i)
        const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        
        const vermietetCount = mieter.filter(m => {
          const einzug = m.einzug ? new Date(m.einzug) : null
          const auszug = m.auszug ? new Date(m.auszug) : null
          
          return einzug && einzug <= date && (!auszug || auszug >= date)
        }).length
        
        occupancy[monthKey] = {
          month,
          vermietet: vermietetCount,
          frei: wohnungen.length - vermietetCount,
        }
      }
      
      // Daten für die letzten 12 Monate sortieren
      const lastMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (11 - i))
        return `${date.getFullYear()}-${date.getMonth() + 1}`
      })
      
      const formattedRevenueData = lastMonths.map(monthKey => {
        return monthlyFinances[monthKey] || {
          month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1, 1)),
          einnahmen: 0,
          ausgaben: 0,
        }
      })
      
      const formattedOccupancyData = lastMonths.map(monthKey => {
        return occupancy[monthKey] || {
          month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 1, 1)),
          vermietet: 0,
          frei: 0,
        }
      })
      
      setRevenueData(formattedRevenueData)
      setOccupancyData(formattedOccupancyData)
    }
    
    fetchData()
  }, [])
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Einnahmen & Ausgaben */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Einnahmen & Ausgaben</CardTitle>
          <CardDescription>Monatliche Übersicht über Mieteinnahmen und Betriebskosten</CardDescription>
        </CardHeader>
        <CardContent className="chart-container">
          <div className="h-full min-h-[400px] w-full">
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
      {/* Belegung */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Belegung</CardTitle>
          <CardDescription>Monatliche Übersicht über vermietete und freie Wohnungen</CardDescription>
        </CardHeader>
        <CardContent className="chart-container">
          <div className="h-full min-h-[400px] w-full">
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

    </div>
  )
}
