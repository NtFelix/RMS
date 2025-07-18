"use client"

import { useState, useMemo } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface FinanceVisualizationProps {
  finances: Finanz[];
  setSelectedChart: (chart: string) => void;
  selectedChart: string;
}

// Farben für Pie Chart
const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"]

export function FinanceVisualization({ finances, setSelectedChart, selectedChart }: FinanceVisualizationProps) {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString())
  
  // Generate data for charts from real finances data
  const incomeByApartment = useMemo(() => {
    console.log('Generating apartment income data');
    console.log('Total finances:', finances.length);
    
    // Group by apartment and sum income values
    const apartmentMap = new Map<string, number>();
    
    // Count apartments with undefined names
    let undefinedCount = 0;
    
    finances.forEach(f => {
      if (f.ist_einnahmen) {
        // Debug logging
        console.log('Processing income:', f.id, f.name, f.betrag, 'Wohnung:', f.Wohnungen?.name || 'undefined');
        
        if (!f.Wohnungen?.name) {
          undefinedCount++;
          return;
        }
        
        const aptName = f.Wohnungen.name;
        const amount = Number(f.betrag);
        const currentValue = apartmentMap.get(aptName) || 0;
        apartmentMap.set(aptName, currentValue + amount);
      }
    });
    
    if (undefinedCount > 0) {
      console.log(`Found ${undefinedCount} income entries without apartment names`);
    }
    
    // Convert map to array format needed for chart
    const result = Array.from(apartmentMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0) // Only include non-zero values
      .sort((a, b) => b.value - a.value); // Sort by value descending
      
    console.log('Generated apartment data:', result);
    return result;
  }, [finances]);
  
  // Process monthly income/expense data
  const processMonthlyData = useMemo(() => {
    // Create monthly map for income
    const monthsIncome = new Map<string, number>();
    const monthsExpense = new Map<string, number>();
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    
    // Initialize with zeros
    monthNames.forEach(month => {
      monthsIncome.set(month, 0);
      monthsExpense.set(month, 0);
    });
    
    console.log('Processing data for year:', selectedYear);
    console.log('Total finances:', finances.length);
    
    // Process data with dates
    finances.forEach(f => {
      // Log to debug date formats
      if (f.datum) {
        console.log('Processing datum:', f.datum, 'for amount:', f.betrag);
        
        // Handle different possible date formats
        let monthIdx: number = -1;
        
        // Try YYYY-MM-DD format
        if (f.datum.includes('-')) {
          const parts = f.datum.split('-');
          // Check if the year matches the selected year
          if (parts[0] !== selectedYear) {
            return; // Skip this entry if year doesn't match
          }
          monthIdx = parseInt(parts[1]) - 1;
        } 
        // Try DD.MM.YYYY format
        else if (f.datum.includes('.')) {
          const parts = f.datum.split('.');
          // Check if the year matches the selected year
          if (parts[2] !== selectedYear) {
            return; // Skip this entry if year doesn't match
          }
          monthIdx = parseInt(parts[1]) - 1;
        }
        
        if (monthIdx >= 0 && monthIdx < 12) {
          const monthKey = monthNames[monthIdx];
          const amount = Number(f.betrag);
          
          console.log('Assigning to month:', monthKey, 'amount:', amount, 'is income:', f.ist_einnahmen);
          
          if (f.ist_einnahmen) {
            monthsIncome.set(monthKey, (monthsIncome.get(monthKey) || 0) + amount);
          } else {
            monthsExpense.set(monthKey, (monthsExpense.get(monthKey) || 0) + amount);
          }
        }
      }
    });
    
    // Convert to chart format
    const monthlyIncome = monthNames.map(month => ({
      month,
      einnahmen: monthsIncome.get(month) || 0
    }));
    
    const incomeExpenseRatio = monthNames.map(month => ({
      month,
      einnahmen: monthsIncome.get(month) || 0,
      ausgaben: monthsExpense.get(month) || 0
    }));
    
    return { monthlyIncome, incomeExpenseRatio };
  }, [finances, selectedYear]);
  
  // Process expense categories
  const expenseCategories = useMemo(() => {
    // Use expense name as category
    const categories = new Map<string, number>();
    
    finances
      .filter(f => !f.ist_einnahmen) // Only expenses
      .forEach(f => {
        // Extract base category from expense name (first word)
        const category = f.name ? f.name.split(' ')[0] : 'Sonstiges';
        const currentValue = categories.get(category) || 0;
        categories.set(category, currentValue + Number(f.betrag));
      });
    
    return Array.from(categories.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [finances]);
  
  // Use real data if available, otherwise fallback to static data
  const chartData = useMemo(() => {
    console.log('Chart data being computed');
    console.log('incomeByApartment length:', incomeByApartment.length);
    console.log('expenseCategories length:', expenseCategories.length);
    
    return {
      incomeByApartment: incomeByApartment.length > 0 ? incomeByApartment : staticIncomeByApartment,
      monthlyIncome: processMonthlyData.monthlyIncome,
      incomeExpenseRatio: processMonthlyData.incomeExpenseRatio,
      expenseCategories: expenseCategories.length > 0 ? expenseCategories : staticExpenseCategories
    };
  }, [incomeByApartment, processMonthlyData, expenseCategories]);

  return (
    <Card className="p-4">
      <Tabs value={selectedChart} onValueChange={setSelectedChart}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="apartment-income">Wohnung</TabsTrigger>
            <TabsTrigger value="monthly-income">Monatlich</TabsTrigger>
            <TabsTrigger value="income-expense">Vergleich</TabsTrigger>
            <TabsTrigger value="expense-categories">Kategorien</TabsTrigger>
          </TabsList>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <label htmlFor="jahr-select" className="text-sm font-medium">Jahr:</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="jahr-select" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['2022','2023','2024','2025'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TabsContent value="apartment-income" data-tab-section="apartment-income">
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
                      data={chartData.incomeByApartment}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.incomeByApartment.map((entry, index) => (
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
        <TabsContent value="monthly-income" data-tab-section="monthly-income">
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
                    <LineChart data={chartData.monthlyIncome}>
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
        <TabsContent value="income-expense" data-tab-section="income-expense">
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
                    <BarChart data={chartData.incomeExpenseRatio}>
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
        <TabsContent value="expense-categories" data-tab-section="expense-categories">
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
                      data={chartData.expenseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.expenseCategories.map((entry, index) => (
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
    </Card>
  )
}
