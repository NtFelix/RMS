"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  Pie,
  PieLabelRenderProps,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  Cell,
} from "recharts"
import { LazyBarChart, LazyPieChart, LazyLineChart, LazyResponsiveContainer } from "@/components/charts/lazy-recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartSkeleton } from "@/components/skeletons/chart-skeletons"
import { BarChart3, AlertTriangle } from "lucide-react"

// Default empty chart data
const emptyChartData: ChartData = {
  monthlyIncome: [],
  incomeExpenseRatio: [],
  incomeByApartment: [],
  expenseCategories: []
}

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
  initialYear?: number
}

// Farben für Pie Chart
const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"]

// Shared Tooltip styles
const chartTooltipStyles = {
  contentStyle: {
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '14px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  itemStyle: {
    color: '#1a202c',
    padding: '4px 0',
    textTransform: 'capitalize' as const
  },
  labelStyle: {
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '4px'
  }
}

// Custom label renderer for pie charts - positions labels outside with percentage
const renderCustomLabel = (props: PieLabelRenderProps) => {
  // Type assertion for the props we need
  const cx = (props as any).cx as number || 0;
  const cy = (props as any).cy as number || 0;
  const midAngle = (props as any).midAngle as number || 0;
  const innerRadius = (props as any).innerRadius as number || 0;
  const outerRadius = (props as any).outerRadius as number || 0;
  const percent = (props as any).percent as number || 0;
  const name = (props as any).name as string || '';
  const index = (props as any).index as number || 0;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Position outside the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Get the color for this segment
  const segmentColor = COLORS[index % COLORS.length];

  return (
    <text
      x={x}
      y={y}
      fill={segmentColor}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-base font-semibold"
      style={{ fontSize: '16px' }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Helper function to check if chart data is empty
const isChartDataEmpty = (data: ChartData): boolean => {
  return (
    data.incomeByApartment.length === 0 &&
    data.expenseCategories.length === 0 &&
    (data.monthlyIncome.length === 0 || data.monthlyIncome.every(item => item.einnahmen === 0)) &&
    (data.incomeExpenseRatio.length === 0 || data.incomeExpenseRatio.every(item => item.einnahmen === 0 && item.ausgaben === 0))
  )
}

// Empty state component
const EmptyChartState = ({ title, description }: { title: string; description: string }) => (
  <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
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

export function FinanceVisualization({ finances, summaryData, availableYears, initialYear }: FinanceVisualizationProps) {
  const [selectedYear, setSelectedYear] = useState(() => {
    // Use the server-provided initialYear if available, otherwise fall back to current year
    if (initialYear) {
      return initialYear.toString();
    }
    return new Date().getFullYear().toString();
  })
  const [selectedChart, setSelectedChart] = useState("apartment-income")
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

        // Use the dynamic data from the API
        setChartData({
          monthlyIncome: data.charts.monthlyIncome || [],
          incomeExpenseRatio: data.charts.incomeExpenseRatio || [],
          incomeByApartment: data.charts.incomeByApartment || [],
          expenseCategories: data.charts.expenseCategories || []
        })
      } catch (error) {
        let errorMessage = 'An unknown error occurred while loading chart data'

        if (error instanceof Error) {
          console.error('Error loading chart data:', error)
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        }

        setError(errorMessage)

        // Fallback to empty data on error
        setChartData(emptyChartData)
      } finally {
        setIsLoading(false)
      }
    }

    loadChartData()
  }, [selectedYear])

  // Use loaded chart data or fallback to empty data
  const displayData = useMemo(() => {
    return chartData || emptyChartData
  }, [chartData])

  // Check if we have real user data or just empty/static data
  const hasUserData = useMemo(() => {
    if (!chartData) return false
    return !isChartDataEmpty(chartData)
  }, [chartData])

  return (
    <Card className="p-4 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <ToggleGroup type="single" value={selectedChart} onValueChange={setSelectedChart} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ToggleGroupItem value="apartment-income">Wohnung</ToggleGroupItem>
          <ToggleGroupItem value="monthly-income">Monatlich</ToggleGroupItem>
          <ToggleGroupItem value="income-expense">Vergleich</ToggleGroupItem>
          <ToggleGroupItem value="expense-categories">Kategorien</ToggleGroupItem>
        </ToggleGroup>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
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
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="animate-in fade-in-0 duration-500">
          {selectedChart === 'apartment-income' && (
            hasUserData ? (
              <Card className="rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle>Einnahmen nach Wohnung</CardTitle>
                  <CardDescription>Verteilung der Mieteinnahmen nach Wohnungen in {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-auto min-h-[400px]">
                    <LazyResponsiveContainer width="100%" aspect={16 / 9}>
                      <LazyPieChart>
                        <Pie
                          data={displayData.incomeByApartment}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={renderCustomLabel}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {displayData.incomeByApartment.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                          {...chartTooltipStyles}
                        />
                      </LazyPieChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyChartState
                title="Einnahmen nach Wohnung"
                description={`Verteilung der Mieteinnahmen nach Wohnungen in ${selectedYear}`}
              />
            )
          )}
          {selectedChart === 'monthly-income' && (
            hasUserData ? (
              <Card className="rounded-[1.5rem]">
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
                      <LazyResponsiveContainer width="100%" aspect={16 / 9}>
                        <LazyLineChart data={displayData.monthlyIncome}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="einnahmen" stroke="var(--color-einnahmen)" strokeWidth={2} />
                        </LazyLineChart>
                      </LazyResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyChartState
                title="Monatliche Einnahmen"
                description={`Monatliche Einnahmen für das Jahr ${selectedYear}`}
              />
            )
          )}
          {selectedChart === 'income-expense' && (
            hasUserData ? (
              <Card className="rounded-[1.5rem]">
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
                      <LazyResponsiveContainer width="100%" aspect={16 / 9}>
                        <LazyBarChart data={displayData.incomeExpenseRatio}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" radius={4} />
                          <Bar dataKey="ausgaben" fill="var(--color-ausgaben)" radius={4} />
                        </LazyBarChart>
                      </LazyResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyChartState
                title="Einnahmen-Ausgaben-Verhältnis"
                description={`Vergleich von Einnahmen und Ausgaben im Jahr ${selectedYear}`}
              />
            )
          )}
          {selectedChart === 'expense-categories' && (
            hasUserData ? (
              <Card className="rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle>Ausgabenkategorien</CardTitle>
                  <CardDescription>Verteilung der Ausgaben nach Kategorien in {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-auto min-h-[400px]">
                    <LazyResponsiveContainer width="100%" aspect={16 / 9}>
                      <LazyPieChart>
                        <Pie
                          data={displayData.expenseCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={renderCustomLabel}
                          outerRadius={150}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {displayData.expenseCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                          {...chartTooltipStyles}
                        />
                      </LazyPieChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyChartState
                title="Ausgabenkategorien"
                description={`Verteilung der Ausgaben nach Kategorien in ${selectedYear}`}
              />
            )
          )}
        </div>
      )}
    </Card>
  )
}
