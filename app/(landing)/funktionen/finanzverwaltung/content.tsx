'use client';

import { TrendingUp, PieChart, BarChart3, Receipt, Calendar, Download, CheckCircle2, ArrowRight, DollarSign, TrendingUp as TrendingUpIcon, CreditCard, Home, Search, Filter, Zap } from 'lucide-react';
import { SummaryCard } from "@/components/common/summary-card";
import { ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import BottomCTA from '@/components/ui/bottom-cta';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieLabelRenderProps } from 'recharts';

export default function FinanceManagementPage() {
  // Mock data for charts
  const incomeByApartmentData = [
    { name: 'Wohnung A', value: 1250 },
    { name: 'Wohnung B', value: 980 },
    { name: 'Wohnung C', value: 1100 },
  ];

  const monthlyIncomeData = [
    { month: 'Jan', einnahmen: 3330 },
    { month: 'Feb', einnahmen: 3330 },
    { month: 'Mär', einnahmen: 3580 },
    { month: 'Apr', einnahmen: 3580 },
    { month: 'Mai', einnahmen: 3580 },
    { month: 'Jun', einnahmen: 3720 },
  ];

  const incomeExpenseData = [
    { name: 'Einnahmen', value: 3580, fill: '#10b981' },
    { name: 'Ausgaben', value: 1240, fill: '#ef4444' },
  ];

  const expenseCategoriesData = [
    { name: 'Instandhaltung', value: 520 },
    { name: 'Versicherungen', value: 380 },
    { name: 'Steuern', value: 340 },
  ];

  // Colors matching the real finance page
  const COLORS = ["#2c3e50", "#34495e", "#16a34a", "#ca8a04", "#dc2626", "#2563eb"];

  // Custom label renderer for pie charts - positions labels outside with percentage
  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const cx = props.cx || 0;
    const cy = props.cy || 0;
    const midAngle = props.midAngle || 0;
    const innerRadius = props.innerRadius || 0;
    const outerRadius = props.outerRadius || 0;
    const percent = props.percent || 0;
    const name = props.name || '';
    const index = props.index || 0;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25; // Position outside the pie
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
        className="text-sm font-semibold"
        style={{ fontSize: '12px' }}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };



  // Mock data for Finance table - matching real finance table structure
  const mockFinanceData = [
    { id: 1, name: 'Versicherung Gebäude', wohnung: 'Alle', datum: '05.01.2025', betrag: -120, ist_einnahmen: false, notiz: 'Monatliche Versicherungsprämie' },
    { id: 2, name: 'Mieteinnahmen Wohnung A', wohnung: 'Wohnung A', datum: '15.01.2025', betrag: 1250, ist_einnahmen: true, notiz: 'Monatliche Miete Januar' },
    { id: 3, name: 'Mieteinnahmen Wohnung B', wohnung: 'Wohnung B', datum: '15.01.2025', betrag: 980, ist_einnahmen: true, notiz: 'Monatliche Miete Januar' },
    { id: 4, name: 'Mieteinnahmen Wohnung C', wohnung: 'Wohnung C', datum: '15.01.2025', betrag: 1100, ist_einnahmen: true, notiz: 'Monatliche Miete Januar' },
    { id: 5, name: 'Nebenkostenabrechnung', wohnung: 'Wohnung B', datum: '12.02.2025', betrag: 180, ist_einnahmen: true, notiz: 'Heizkostenabrechnung' },
    { id: 6, name: 'Instandhaltung Heizung', wohnung: 'Wohnung C', datum: '08.03.2025', betrag: -450, ist_einnahmen: false, notiz: 'Wartung und Reparatur' },
  ].sort((a, b) => new Date(b.datum.split('.').reverse().join('-')).getTime() - new Date(a.datum.split('.').reverse().join('-')).getTime());



  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/?getStarted=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-48 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              Behalten Sie Ihre Finanzen im Blick
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed text-center">
            Verwalten Sie Ihre Einnahmen und Ausgaben effizient und treffen Sie fundierte Entscheidungen basierend auf detaillierten Analysen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton
              variant="primary"
              text="14 Tage kostenlos testen"
              href="/?getStarted=true"
              icon={ArrowRight}
              iconPosition="right"
            />
            <CTAButton
              variant="secondary"
              text="Preise ansehen"
              href="/#pricing"
              icon={DollarSign}
              iconPosition="left"
            />
          </div>
        </div>
      </div>

      {/* Finanzübersicht Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Image with macOS Window */}
          <MacWindow className="mb-16">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table.avif"
              alt="Finanztabelle-Ansicht"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table-darkmode.avif"
              alt="Finanztabelle-Ansicht (Dark Mode)"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>

        </div>
      </div>

      {/* Chart Cards Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              Intelligente Finanzvisualisierung
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Erhalten Sie wertvolle Einblicke durch interaktive Diagramme und detaillierte Analysen Ihrer finanziellen Daten.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Einnahmen nach Wohnung Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group"
            >
              <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Home className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Kreisdiagramm</Badge>
                  </div>
                  <CardTitle className="text-lg">Einnahmen nach Wohnung</CardTitle>
                  <CardDescription className="text-sm">
                    Verteilung der Mieteinnahmen nach Wohnungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Real Chart for Large Screens */}
                  <div className="hidden lg:block">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={incomeByApartmentData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderCustomLabel}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {incomeByApartmentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.5rem',
                              padding: '0.5rem 1rem',
                              fontSize: '14px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            itemStyle={{
                              color: '#1a202c',
                              padding: '4px 0',
                              textTransform: 'capitalize'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fallback Content for Small Screens */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wohnung A</span>
                      <span className="font-medium">€1.250</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wohnung B</span>
                      <span className="font-medium">€980</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Wohnung C</span>
                      <span className="font-medium">€1.100</span>
                    </div>
                    <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Monatliche Einnahmen Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group"
            >
              <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Liniendiagramm</Badge>
                  </div>
                  <CardTitle className="text-lg">Monatliche Einnahmen</CardTitle>
                  <CardDescription className="text-sm">
                    Zeitlicher Verlauf Ihrer Mieteinnahmen
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Real Chart for Large Screens */}
                  <div className="hidden lg:block">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyIncomeData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip
                            formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="einnahmen"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fallback Content for Small Screens */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Jan</span>
                      <span className="font-medium text-green-600">€3.330</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Feb</span>
                      <span className="font-medium text-green-600">€3.330</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mär</span>
                      <span className="font-medium text-green-600">€3.580</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1">
                      <div className="h-8 w-1 bg-green-500/20 rounded"></div>
                      <div className="h-8 w-1 bg-green-500/40 rounded"></div>
                      <div className="h-8 w-1 bg-green-500/60 rounded"></div>
                      <div className="h-8 w-1 bg-green-500/80 rounded"></div>
                      <div className="h-8 w-1 bg-green-500 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Einnahmen-Ausgaben-Verhältnis Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group"
            >
              <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Balkendiagramm</Badge>
                  </div>
                  <CardTitle className="text-lg">Einnahmen vs Ausgaben</CardTitle>
                  <CardDescription className="text-sm">
                    Vergleich von Einnahmen und Ausgaben
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Real Chart for Large Screens */}
                  <div className="hidden lg:block">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeExpenseData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip
                            formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fallback Content for Small Screens */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Einnahmen</span>
                      <span className="font-medium text-green-500">€3.580</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ausgaben</span>
                      <span className="font-medium text-red-500">€1.240</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Cashflow</span>
                      <span className="text-green-500">+€2.340</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-4 bg-green-500/20 rounded flex-1"></div>
                      <div className="h-4 bg-red-500/20 rounded w-1/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ausgabenkategorien Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="group"
            >
              <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <PieChart className="w-5 h-5 text-orange-500" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Kreisdiagramm</Badge>
                  </div>
                  <CardTitle className="text-lg">Ausgabenkategorien</CardTitle>
                  <CardDescription className="text-sm">
                    Verteilung der Ausgaben nach Kategorien
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Real Chart for Large Screens */}
                  <div className="hidden lg:block">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={expenseCategoriesData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderCustomLabel}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {expenseCategoriesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `${value.toLocaleString('de-DE')} €`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.5rem',
                              padding: '0.5rem 1rem',
                              fontSize: '14px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            itemStyle={{
                              color: '#1a202c',
                              padding: '4px 0',
                              textTransform: 'capitalize'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fallback Content for Small Screens */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Instandhaltung</span>
                      <span className="font-medium">€520</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Versicherungen</span>
                      <span className="font-medium">€380</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Steuern</span>
                      <span className="font-medium">€340</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-1">
                      <div className="h-2 bg-orange-500/60 rounded"></div>
                      <div className="h-2 bg-blue-500/60 rounded"></div>
                      <div className="h-2 bg-purple-500/60 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Datenübersichten Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold">Finanzdaten im Detail</h2>
          </motion.div>

          {/* Monatliche Übersicht Section - 2 Column Layout (Table Left, Text Right) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <div className="w-full p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998]">
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Bezeichnung</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Datum</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Betrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockFinanceData.map((finance) => (
                        <TableRow
                          key={finance.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{finance.name}</TableCell>
                          <TableCell className="text-muted-foreground">{finance.datum}</TableCell>
                          <TableCell className={`font-semibold ${finance.ist_einnahmen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {finance.ist_einnahmen ? '+' : ''}{finance.betrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Description */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <TrendingUpIcon className="w-8 h-8 text-primary" />
                  Vollständige Finanzübersicht
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Sehen Sie alle Ihre Einnahmen und Ausgaben an einem Ort. Die chronologische Übersicht zeigt jede einzelne Transaktion mit Betrag, Datum und Typ - perfekt für die tägliche Finanzkontrolle und schnelle Entscheidungen.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Alle Transaktionen</h4>
                    <p className="text-muted-foreground">Vollständige Liste aller Einnahmen (Miete, Nebenkosten) und Ausgaben (Instandhaltung, Versicherungen).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Rentabilitäts-Übersicht</h4>
                    <p className="text-muted-foreground">Behalten Sie stets den Überblick über Ihre Rentabilität und verlieren Sie nie den Durchblick bei Einnahmen und Ausgaben.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Search & Filter Section - 2 Column Layout (Content Left, Card Right) */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Search & Filter Description */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <Search className="w-8 h-8 text-primary" />
                  Intelligente Suche & Filter
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Finden Sie jede Transaktion im Handumdrehen. Mit leistungsstarker Suche und flexiblen Filtern können Sie Ihre Finanzdaten schnell und präzise durchsuchen.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Sofortige Suche</h4>
                    <p className="text-muted-foreground">Geben Sie einfach einen Begriff ein und erhalten Sie sofort alle passenden Transaktionen.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Filter className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Flexible Filter</h4>
                    <p className="text-muted-foreground">Filtern Sie nach Wohnung, Jahr oder Transaktionstyp für gezielte Einblicke.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Vorschau-Ergebnisse</h4>
                    <p className="text-muted-foreground">Sehen Sie sofort die wichtigsten Informationen zu jeder gefundenen Transaktion.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Mockup Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
                <div className="flex-1 text-center text-sm font-medium">Finanzverwaltung</div>
                <div className="w-16"></div>
              </div>

              {/* Search & Filter Bar Mockup */}
              <div className="p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">Transaktionen suchen</div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Nebenkostenvorauszahlung..."
                    className="pl-10"
                  />
                </div>

                {/* Results Table */}
                <div className="mt-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">3 Treffer gefunden</div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Bezeichnung</th>
                          <th className="text-left p-3 font-medium">Datum</th>
                          <th className="text-right p-3 font-medium">Betrag</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t hover:bg-muted/20">
                          <td className="p-3">Nebenkostenvorauszahlung Schmidt</td>
                          <td className="p-3 text-muted-foreground">01.03.2025</td>
                          <td className="p-3 text-right font-medium text-green-600">+120,00 €</td>
                        </tr>
                        <tr className="border-t hover:bg-muted/20">
                          <td className="p-3">Nebenkostenvorauszahlung Müller</td>
                          <td className="p-3 text-muted-foreground">01.02.2025</td>
                          <td className="p-3 text-right font-medium text-green-600">+80,00 €</td>
                        </tr>
                        <tr className="border-t hover:bg-muted/20">
                          <td className="p-3">Nebenkostenvorauszahlung Wagner</td>
                          <td className="p-3 text-muted-foreground">01.02.2025</td>
                          <td className="p-3 text-right font-medium text-green-600">+150,00 €</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Financial Summary Section - 2 Column Layout (Cards Left, Content Right) */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Summary Cards Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              viewport={{ once: true }}
            >
              <MacWindow className="w-full shadow-none dark:shadow-none">
                <div className="space-y-4 p-6">
                  {/* Monthly Income Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    viewport={{ once: true }}
                  >
                    <SummaryCard
                      title="Ø Monatliche Einnahmen"
                      value="6.030,91 €"
                      description="Durchschnittliche monatliche Einnahmen"
                      icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
                    />
                  </motion.div>

                  {/* Monthly Expenses Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.3 }}
                    viewport={{ once: true }}
                  >
                    <SummaryCard
                      title="Ø Monatliche Ausgaben"
                      value="177,64 €"
                      description="Durchschnittliche monatliche Ausgaben"
                      icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
                    />
                  </motion.div>

                  {/* Monthly Cashflow Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                    viewport={{ once: true }}
                  >
                    <SummaryCard
                      title="Ø Monatlicher Cashflow"
                      value="5.853,27 €"
                      description="Durchschnittlicher monatlicher Überschuss"
                      icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
                    />
                  </motion.div>

                  {/* Annual Projection Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.5 }}
                    viewport={{ once: true }}
                  >
                    <SummaryCard
                      title="Jahresprognose"
                      value="70.239,27 €"
                      description="Geschätzter Jahresgewinn"
                      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                    />
                  </motion.div>
                </div>
              </MacWindow>
            </motion.div>

            {/* Right Column - Financial Summary Description */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-primary" />
                  Finanzielle Übersicht
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Wichtige Kennzahlen auf einen Blick - behalten Sie Ihre finanzielle Situation immer im Blick und treffen Sie fundierte Entscheidungen für Ihre Vermögensentwicklung.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Einnahmen-Tracking</h4>
                    <p className="text-muted-foreground">Überwachen Sie Ihre durchschnittlichen monatlichen Einnahmen und erkennen Sie Trends.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Cashflow-Analyse</h4>
                    <p className="text-muted-foreground">Sehen Sie sofort Ihren monatlichen Überschuss und die Rentabilität Ihrer Immobilien.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Jahresprognose</h4>
                    <p className="text-muted-foreground">Planen Sie voraus mit geschätzten Jahresgewinnen für strategische Entscheidungen.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Export Section - 2 Column Layout (Text Left, Export Options Right) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Export Description */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <Download className="w-8 h-8 text-primary" />
                  CSV Export
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Exportieren Sie Ihre Finanzdaten als CSV für flexible Analysen, Berichte und externe Systeme. Behalten Sie die volle Kontrolle über Ihre Daten.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Systemintegration</h4>
                    <p className="text-muted-foreground">Übertragen Sie Daten an Buchhaltungssysteme oder andere Tools.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Steuererklärung</h4>
                    <p className="text-muted-foreground">Exportieren Sie steuerrelevante Daten für Ihre jährliche Erklärung oder Steuerberater.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Export Options in Mac Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
                <div className="flex-1 text-center text-sm font-medium">Datenexport</div>
                <div className="w-16"></div>
              </div>

              {/* Export Options */}
              <div className="p-6 space-y-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">CSV Datenexport</div>

                {/* CSV Export Option */}
                <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">CSV Export</div>
                      <div className="text-sm text-muted-foreground">Ihre Finanzdaten im universellen Format</div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                {/* Date Range Selector */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-3">Zeitraum auswählen</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">Aktuelles Jahr</button>
                    <button className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">Letzte 12 Monate</button>
                    <button className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">Quartal</button>
                    <button className="px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">Individuell</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      <BottomCTA
        onGetStarted={handleGetStarted}
        theme="houses"
        title="Starten Sie noch heute mit der"
        subtitle="Finanzverwaltung"
        description="Entdecken Sie, wie unsere Plattform Ihnen hilft, Ihre Finanzen optimal zu verwalten und fundierte Entscheidungen zu treffen."
        badgeText="Bereit für den Start?"
        primaryButtonText="14 Tage kostenlos testen"
        secondaryButtonText="Demo anfordern"
      />

    </div>
  );
}
