"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartSkeleton } from "@/components/chart-skeletons"

// Einnahmen nach Wohnung (simulierte Daten)
const staticIncomeByApartment = [
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
const staticMonthlyIncome = [
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
const staticIncomeExpenseRatio = [
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
const staticExpenseCategories = [
  { name: "Instandhaltung", value: 9500 },
  { name: "Versicherungen", value: 4200 },
  { name: "Steuern", value: 6300 },
  { name: "Verwaltung", value: 2100 },
  { name: "Sonstiges", value: 1400 },
]

// Interface for finance transactions
interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
}

interface SummaryData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalCashflow: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyCashflow: number;
  yearlyProjection: number;
  monthsPassed: number;
  monthlyData: Record<number, { income: number; expenses: number }>;
}

interface ChartData {
  monthlyIncome: Array<{ month: string; einnahmen: number }>;
  incomeExpenseRatio: Array<{ month: string; einnahmen: number; ausgaben: number }>;
  incomeByApartment: Array<{ name: string; value: number }>;
  expenseCategories: Array<{ name: string; value: number }>;
}

interface FinanceVisualizationProps {
  finances: Finanz[]
  summaryData?: SummaryData | null
}

// Farben für Pie Chart
const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"]

export function FinanceVisualization({ finances, summaryData }: FinanceVisualizationProps) {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString())
  const [selectedChart, setSelectedChart] = useState("apartment-income")
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available years on component mount
  useEffect(() => {
    const setFallbackYears = () => {
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3]);
    };

    const loadAvailableYears = async () => {
      try {
        const response = await fetch('/api/finanzen/years')
        if (response.ok) {
          const years = await response.json()
          setAvailableYears(years)
        } else {
          setFallbackYears();
        }
      } catch (err) {
        console.error('Error loading available years:', err)
        setFallbackYears();
      }
    }

    loadAvailableYears()
  }, [])

  // Load chart data for selected year
  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/finanzen/charts?year=${selectedYear}`)
        if (!response.ok) {
          throw new Error('Failed to load chart data')
        }
        
        const data = await response.json()
        setChartData(data.charts)
      } catch (err: any) {
        console.error('Error loading chart data:', err)
        setError(err.message)
        // Fallback to static data on error
        setChartData({
          monthlyIncome: staticMonthlyIncome,
          incomeExpenseRatio: staticIncomeExpenseRatio,
          incomeByApartment: staticIncomeByApartment,
          expenseCategories: staticExpenseCategories
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadChartData()
  }, [selectedYear])

  // Use loaded chart data or fallback to static data
  const displayData = useMemo(() => {
    if (chartData) {
      return chartData
    }
    
    // Fallback to static data if no chart data is available
    return {
      incomeByApartment: staticIncomeByApartment,
      monthlyIncome: staticMonthlyIncome,
      incomeExpenseRatio: staticIncomeExpenseRatio,
      expenseCategories: staticExpenseCategories
    }
  }, [chartData])

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <ToggleGroup type="single" value={selectedChart} onValueChange={setSelectedChart} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ToggleGroupItem value="apartment-income">Wohnung</ToggleGroupItem>
          <ToggleGroupItem value="monthly-income">Monatlich</ToggleGroupItem>
          <ToggleGroupItem value="income-expense">Vergleich</ToggleGroupItem>
          <ToggleGroupItem value="expense-categories">Kategorien</ToggleGroupItem>
        </ToggleGroup>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <label htmlFor="jahr-select" className="text-sm font-medium">Jahr:</label>
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading}>
            <SelectTrigger id="jahr-select" className={`w-24 transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 
                ? availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)
                : (() => {
                    const currentYear = new Date().getFullYear();
                    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
                      .map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>);
                  })()
              }
            </SelectContent>
          </Select>

        </div>
      </div>
      
      {isLoading && (
        <div>
          {selectedChart === 'apartment-income' && (
            <ChartSkeleton 
              title="Einnahmen nach Wohnung" 
              description={`Verteilung der Mieteinnahmen nach Wohnungen in ${selectedYear}`}
              type="pie" 
            />
          )}
          {selectedChart === 'monthly-income' && (
            <ChartSkeleton 
              title="Monatliche Einnahmen" 
              description={`Monatliche Einnahmen für das Jahr ${selectedYear}`}
              type="line" 
            />
          )}
          {selectedChart === 'income-expense' && (
            <ChartSkeleton 
              title="Einnahmen-Ausgaben-Verhältnis" 
              description={`Vergleich von Einnahmen und Ausgaben im Jahr ${selectedYear}`}
              type="bar" 
            />
          )}
          {selectedChart === 'expense-categories' && (
            <ChartSkeleton 
              title="Ausgabenkategorien" 
              description={`Verteilung der Ausgaben nach Kategorien in ${selectedYear}`}
              type="pie" 
            />
          )}
        </div>
      )}
      
      {error && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="text-red-500 font-medium">Fehler beim Laden der Chart-Daten</div>
            <div className="text-sm text-muted-foreground">{error}</div>
            <div className="text-xs text-muted-foreground">Fallback-Daten werden verwendet</div>
          </div>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="animate-in fade-in-0 duration-500">
        {selectedChart === 'apartment-income' && (
          <Card>
            <CardHeader>
              <CardTitle>Einnahmen nach Wohnung</CardTitle>
              <CardDescription>Verteilung der Mieteinnahmen nach Wohnungen in {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-auto min-h-[400px]">
                <ResponsiveContainer width="100%" aspect={16/9}>
                  <PieChart>
                    <Pie
                      data={displayData.incomeByApartment}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {displayData.incomeByApartment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} €`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        {selectedChart === 'monthly-income' && (
          <Card>
            <CardHeader>
              <CardTitle>Monatliche Einnahmen</CardTitle>
              <CardDescription>Monatliche Einnahmen für das Jahr {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-auto min-h-[400px]">
                <ChartContainer
                  config={{
                    einnahmen: {
                      label: "Einnahmen",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" aspect={16/9}>
                    <LineChart data={displayData.monthlyIncome}>
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
        )}
        {selectedChart === 'income-expense' && (
          <Card>
            <CardHeader>
              <CardTitle>Einnahmen-Ausgaben-Verhältnis</CardTitle>
              <CardDescription>Vergleich von Einnahmen und Ausgaben im Jahr {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-auto min-h-[400px]">
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
                  <ResponsiveContainer width="100%" aspect={16/9}>
                    <BarChart data={displayData.incomeExpenseRatio}>
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
        )}
        {selectedChart === 'expense-categories' && (
          <Card>
            <CardHeader>
              <CardTitle>Ausgabenkategorien</CardTitle>
              <CardDescription>Verteilung der Ausgaben nach Kategorien in {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-auto min-h-[400px]">
                <ResponsiveContainer width="100%" aspect={16/9}>
                  <PieChart>
                    <Pie
                      data={displayData.expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {displayData.expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} €`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </Card>
  )
}
