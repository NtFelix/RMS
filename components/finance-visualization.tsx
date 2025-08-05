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
import { ChartSkeleton } from "@/components/chart-skeletons"
import { BarChart3, AlertTriangle, Maximize2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

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
  availableYears: number[]
}

// Farben für Pie Chart
const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"]

// Helper function to check if chart data is empty
const isChartDataEmpty = (data: ChartData): boolean => {
  return (
    data.incomeByApartment.length === 0 &&
    data.expenseCategories.length === 0 &&
    data.monthlyIncome.every(item => item.einnahmen === 0) &&
    data.incomeExpenseRatio.every(item => item.einnahmen === 0 && item.ausgaben === 0)
  )
}

// Empty state component
const EmptyChartState = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="relative w-full h-auto min-h-[400px]">
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Keine Daten verfügbar</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Für das ausgewählte Jahr sind noch keine Finanzdaten vorhanden. 
              Fügen Sie Transaktionen hinzu, um Diagramme zu sehen.
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export function FinanceVisualization({ finances, summaryData, availableYears }: FinanceVisualizationProps) {
  // State management for year, selected charts, focused chart, loading, error
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString())
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["apartment-income", "monthly-income"])
  const [focusedChart, setFocusedChart] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load chart data for selected year
  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/finanzen/charts?year=${selectedYear}`)
        if (!response.ok) {
          throw new Error(`Failed to load chart data: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        if (!data?.charts) {
          throw new Error('Invalid chart data format received from server')
        }
        
        setChartData(data.charts)
      } catch (error) {
        let errorMessage = 'An unknown error occurred while loading chart data'
        
        if (error instanceof Error) {
          console.error('Error loading chart data:', error)
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        }
        
        setError(errorMessage)
        
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
    return {
      incomeByApartment: staticIncomeByApartment,
      monthlyIncome: staticMonthlyIncome,
      incomeExpenseRatio: staticIncomeExpenseRatio,
      expenseCategories: staticExpenseCategories
    }
  }, [chartData])

  // Check if we have real user data or just empty/static data
  const hasUserData = useMemo(() => {
    if (!chartData) return false
    return !isChartDataEmpty(chartData)
  }, [chartData])

  // Handlers for selecting left and right charts, ensuring uniqueness and swap-on-duplicate
  const handleLeftChartChange = (value: string) => {
    if (value === selectedCharts[1]) {
      // Swap values
      setSelectedCharts(([left, right]) => [right, left])
    } else {
      setSelectedCharts(([_, right]) => [value, right])
    }
  }
  const handleRightChartChange = (value: string) => {
    if (value === selectedCharts[0]) {
      // Swap values
      setSelectedCharts(([left, right]) => [right, left])
    } else {
      setSelectedCharts(([left, _]) => [left, value])
    }
  }

  // Chart metadata for rendering
  const CHART_META: Record<string, { title: string, description: (year: string) => string, type: "pie" | "line" | "bar" }> = {
    "apartment-income": {
      title: "Einnahmen nach Wohnung",
      description: (year: string) => `Verteilung der Mieteinnahmen nach Wohnungen in ${year}`,
      type: "pie",
    },
    "monthly-income": {
      title: "Monatliche Einnahmen",
      description: (year: string) => `Monatliche Einnahmen für das Jahr ${year}`,
      type: "line",
    },
    "income-expense": {
      title: "Einnahmen-Ausgaben-Verhältnis",
      description: (year: string) => `Vergleich von Einnahmen und Ausgaben im Jahr ${year}`,
      type: "bar",
    },
    "expense-categories": {
      title: "Ausgabenkategorien",
      description: (year: string) => `Verteilung der Ausgaben nach Kategorien in ${year}`,
      type: "pie",
    },
  }

  const chartOptions = [
    { value: "apartment-income", label: CHART_META["apartment-income"].title },
    { value: "monthly-income", label: CHART_META["monthly-income"].title },
    { value: "income-expense", label: CHART_META["income-expense"].title },
    { value: "expense-categories", label: CHART_META["expense-categories"].title },
  ]

  // Abstracted chart rendering
  function renderChart(chartKey: string, compact: boolean = false) {
    const meta = CHART_META[chartKey]
    const minH = compact
      ? "min-h-[300px]"
      : "min-h-[600px]"
    // Chart content
    if (isLoading) {
      return (
        <ChartSkeleton
          title={meta.title}
          description={meta.description(selectedYear)}
          type={meta.type}
          className={minH}
        />
      )
    }
    if (error) {
      return (
        <div className={`flex items-center justify-center ${compact ? "h-48" : "h-64"}`}>
          <div className="text-center space-y-2">
            <div className="text-red-500 font-medium">Fehler beim Laden der Chart-Daten</div>
            <div className="text-sm text-muted-foreground">{error}</div>
            <div className="text-xs text-muted-foreground">Fallback-Daten werden verwendet</div>
          </div>
        </div>
      )
    }
    if (!hasUserData) {
      return (
        <EmptyChartState
          title={meta.title}
          description={meta.description(selectedYear)}
        />
      )
    }

    // Success rendering
    switch (chartKey) {
      case "apartment-income":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description(selectedYear)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`relative w-full h-auto ${minH}`}>
                <ResponsiveContainer width="100%" aspect={16/9}>
                  <PieChart>
                    <Pie
                      data={displayData.incomeByApartment}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={compact ? 110 : 200}
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
        )
      case "monthly-income":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description(selectedYear)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`relative w-full h-auto ${minH}`}>
                <ChartContainer
                  config={{
                    einnahmen: {
                      label: "Einnahmen",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" aspect={compact ? 16/9 : 16/9}>
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
        )
      case "income-expense":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description(selectedYear)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`relative w-full h-auto ${minH}`}>
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
                  <ResponsiveContainer width="100%" aspect={compact ? 16/9 : 16/9}>
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
        )
      case "expense-categories":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description(selectedYear)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`relative w-full h-auto ${minH}`}>
                <ResponsiveContainer width="100%" aspect={16/9}>
                  <PieChart>
                    <Pie
                      data={displayData.expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={compact ? 110 : 200}
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
        )
      default:
        return null
    }
  }

  // Main render
  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-auto">
          <div>
            <label htmlFor="left-chart-select" className="block text-sm font-medium mb-1">
              Linkes Diagramm
            </label>
            <Select
              value={selectedCharts[0]}
              onValueChange={handleLeftChartChange}
              disabled={isLoading}
            >
              <SelectTrigger id="left-chart-select" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="right-chart-select" className="block text-sm font-medium mb-1">
              Rechtes Diagramm
            </label>
            <Select
              value={selectedCharts[1]}
              onValueChange={handleRightChartChange}
              disabled={isLoading}
            >
              <SelectTrigger id="right-chart-select" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <label htmlFor="jahr-select" className="text-sm font-medium">Jahr:</label>
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading}>
            <SelectTrigger id="jahr-select" className={`w-24 transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year: number) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Focused Chart Modal */}
      <Dialog open={!!focusedChart} onOpenChange={open => { if (!open) setFocusedChart(null) }}>
        <DialogContent className="w-full max-w-6xl p-0 bg-transparent border-none shadow-none">
          {focusedChart && (() => {
            const metaTitle = CHART_META[focusedChart].title
            return (
              <div className="w-full">
                <DialogTitle className="sr-only">{metaTitle}</DialogTitle>
                {/* Render maximized card (not compact) */}
                <div className="relative">
                  {renderChart(focusedChart, false)}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {selectedCharts.length === 0 && (
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Keine Charts ausgewählt</CardTitle>
                <CardDescription>Bitte wählen Sie bis zu zwei Diagramme aus.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center min-h-[150px] text-muted-foreground">
                  Keine Auswahl
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {selectedCharts.map((chartKey) => (
          <div key={chartKey} className="relative">
            {/* Maximize button */}
            <button
              aria-label="Maximieren"
              className="absolute top-2 right-2 z-10 bg-white rounded-full shadow p-1 border hover:bg-muted"
              onClick={() => setFocusedChart(chartKey)}
              tabIndex={0}
            >
              <Maximize2 className="w-5 h-5 text-muted-foreground" />
            </button>
            {/* Compact chart card */}
            {renderChart(chartKey, true)}
          </div>
        ))}
      </div>
    </Card>
  )
}
