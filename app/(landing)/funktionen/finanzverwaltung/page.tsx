'use client';


import { TrendingUp, PieChart, BarChart3, Receipt, Calendar, Download, CheckCircle2, ArrowLeft, ArrowRight, DollarSign, TrendingUp as TrendingUpIcon, FileText, CreditCard, PiggyBank, Home } from 'lucide-react';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import BottomCTA from '@/components/ui/bottom-cta';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function FinanceManagementPage() {
  const features = [
    {
      icon: Receipt,
      title: 'Einnahmen & Ausgaben',
      description: 'Erfassen Sie alle Einnahmen und Ausgaben übersichtlich und kategorisiert.',
    },
    {
      icon: PieChart,
      title: 'Finanzübersicht',
      description: 'Visualisieren Sie Ihre Finanzen mit interaktiven Diagrammen und Grafiken.',
    },
    {
      icon: BarChart3,
      title: 'Detaillierte Berichte',
      description: 'Erstellen Sie umfassende Finanzberichte für Ihre Buchhaltung.',
    },
    {
      icon: Calendar,
      title: 'Zeitraumanalyse',
      description: 'Analysieren Sie Ihre Finanzen nach Monaten, Quartalen oder Jahren.',
    },
    {
      icon: TrendingUp,
      title: 'Prognosen',
      description: 'Erhalten Sie Prognosen basierend auf historischen Daten.',
    },
    {
      icon: Download,
      title: 'Export-Funktionen',
      description: 'Exportieren Sie Ihre Daten als PDF oder CSV für Ihre Buchhaltung.',
    },
  ];

  const benefits = [
    'Automatische Berechnung von Mieteinnahmen',
    'Kategorisierung von Einnahmen und Ausgaben',
    'Echtzeit-Übersicht über Ihre finanzielle Situation',
    'Steuerrelevante Auswertungen',
    'Vergleich verschiedener Zeiträume',
    'Integration mit Ihrer Buchhaltungssoftware',
  ];

  // Mock data for Finance table
  const mockFinanceData = [
    { id: 1, month: 'Januar 2024', income: '€4.250', expenses: '€1.280', profit: '€2.970', category: 'Mieteinnahmen' },
    { id: 2, month: 'Februar 2024', income: '€4.250', expenses: '€1.450', profit: '€2.800', category: 'Mieteinnahmen' },
    { id: 3, month: 'März 2024', income: '€4.500', expenses: '€1.320', profit: '€3.180', category: 'Mieteinnahmen + Reparatur' },
    { id: 4, month: 'April 2024', income: '€4.250', expenses: '€980', profit: '€3.270', category: 'Mieteinnahmen' },
  ];

  // Mock data for Expense Categories
  const mockExpenseCategories = [
    { id: 1, category: 'Instandhaltung', amount: '€850', percentage: '35%', trend: 'up' },
    { id: 2, category: 'Verwaltung', amount: '€320', percentage: '13%', trend: 'stable' },
    { id: 3, category: 'Versicherungen', amount: '€280', percentage: '11%', trend: 'down' },
    { id: 4, category: 'Steuern', amount: '€680', percentage: '28%', trend: 'up' },
  ];

  // Mock data for Revenue Sources
  const mockRevenueSources = [
    { id: 1, source: 'Haus A - Wohnungen', amount: '€2.550', percentage: '60%', status: 'stabil' },
    { id: 2, source: 'Haus B - Wohnungen', amount: '€1.700', percentage: '40%', status: 'wachsend' },
  ];

  const handleGetStarted = () => {
    window.location.href = '/?getStarted=true';
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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
                    <Badge variant="secondary" className="text-xs">Pie Chart</Badge>
                  </div>
                  <CardTitle className="text-lg">Einnahmen nach Wohnung</CardTitle>
                  <CardDescription className="text-sm">
                    Verteilung der Mieteinnahmen nach Wohnungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
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
                    <Badge variant="secondary" className="text-xs">Line Chart</Badge>
                  </div>
                  <CardTitle className="text-lg">Monatliche Einnahmen</CardTitle>
                  <CardDescription className="text-sm">
                    Zeitlicher Verlauf Ihrer Mieteinnahmen
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Jan</span>
                      <span className="font-medium">€3.330</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Feb</span>
                      <span className="font-medium">€3.330</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mär</span>
                      <span className="font-medium">€3.580</span>
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
                    <Badge variant="secondary" className="text-xs">Bar Chart</Badge>
                  </div>
                  <CardTitle className="text-lg">Einnahmen vs Ausgaben</CardTitle>
                  <CardDescription className="text-sm">
                    Vergleich von Einnahmen und Ausgaben
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
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
                    <Badge variant="secondary" className="text-xs">Pie Chart</Badge>
                  </div>
                  <CardTitle className="text-lg">Ausgabenkategorien</CardTitle>
                  <CardDescription className="text-sm">
                    Verteilung der Ausgaben nach Kategorien
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
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
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Monat</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Einnahmen</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Ausgaben</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Gewinn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockFinanceData.map((finance) => (
                        <TableRow 
                          key={finance.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{finance.month}</TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 font-semibold">{finance.income}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400">{finance.expenses}</TableCell>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">{finance.profit}</TableCell>
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
                  Monatliche Finanzübersicht
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Behalten Sie den Überblick über Ihre monatlichen Einnahmen und Ausgaben. Unsere detaillierte Übersicht zeigt Ihnen genau, wo Ihr Geld fließt und wo Sie Potenziale zur Optimierung haben.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Automatische Berechnung</h4>
                    <p className="text-muted-foreground">Mieteinnahmen werden automatisch erfasst und berechnet.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Kategorisierte Ausgaben</h4>
                    <p className="text-muted-foreground">Alle Ausgaben werden automatisch nach Kategorien sortiert.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Gewinnanalyse</h4>
                    <p className="text-muted-foreground">Sehen Sie sofort Ihre monatlichen Gewinne und Verluste.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Ausgabenkategorien Section - 2 Column Layout (Table Left, Text Right) */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
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
              </div>
              <div className="w-full p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998]">
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Kategorie</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Betrag</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Anteil</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockExpenseCategories.map((category) => (
                        <TableRow 
                          key={category.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{category.category}</TableCell>
                          <TableCell className="font-semibold">{category.amount}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{category.percentage}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.trend === 'up' ? 'destructive' : category.trend === 'down' ? 'default' : 'secondary'}>
                              {category.trend === 'up' ? '↑' : category.trend === 'down' ? '↓' : '→'}
                            </Badge>
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
              transition={{ duration: 0.8, delay: 1.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  Ausgabenkategorien
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Kategorisieren Sie Ihre Ausgaben automatisch und erkennen Sie sofort, wo die größten Kostenblöcke entstehen. Optimize Sie Ihre Ausgabenstruktur basierend auf detaillierten Analysen.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Automatische Kategorisierung</h4>
                    <p className="text-muted-foreground">Ausgaben werden intelligent zugeordnet und kategorisiert.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Trendanalysen</h4>
                    <p className="text-muted-foreground">Erkennen Sie Entwicklungstrends bei Ihren Ausgaben.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Kostenoptimierung</h4>
                    <p className="text-muted-foreground">Identifizieren Sie Einsparpotenziale automatisch.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Einnahmequellen Section - 2 Column Layout (Table Left, Text Right) */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
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
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Quelle</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Betrag</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Anteil</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockRevenueSources.map((source) => (
                        <TableRow 
                          key={source.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{source.source}</TableCell>
                          <TableCell className="text-green-600 dark:text-green-400 font-semibold">{source.amount}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{source.percentage}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={source.status === 'wachsend' ? 'default' : 'secondary'}>
                              {source.status}
                            </Badge>
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
              transition={{ duration: 0.8, delay: 1.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                  Einnahmequellen
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Überwachen Sie alle Ihre Einnahmequellen zentral und erkennen Sie sofort, welche Objekte am profitabelsten sind. Planen Sie Ihr Wachstum basierend auf soliden Daten.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Zentrale Erfassung</h4>
                    <p className="text-muted-foreground">Alle Einnahmen werden automatisch erfasst und zugeordnet.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Rentabilitätsanalyse</h4>
                    <p className="text-muted-foreground">Sehen Sie sofort, welche Objekte am profitabelsten sind.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Wachstumsplanung</h4>
                    <p className="text-muted-foreground">Planen Sie Ihr Portfolio-Wachstum datenbasiert.</p>
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
