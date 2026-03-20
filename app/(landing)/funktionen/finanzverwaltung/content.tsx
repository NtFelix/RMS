'use client';

import dynamic from 'next/dynamic';
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

const FinanceChartsShowcase = dynamic(() => import('./finance-charts-showcase'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
            Intelligente Finanzvisualisierung
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Erhalten Sie wertvolle Einblicke durch interaktive Diagramme und detaillierte Analysen Ihrer finanziellen Daten.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-[320px] rounded-2xl border-border/50 shadow-lg">
              <CardHeader>
                <div className="h-10 w-10 rounded-full bg-primary/10" />
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="h-4 w-48 rounded bg-muted/70" />
              </CardHeader>
              <CardContent>
                <div className="h-48 rounded-xl bg-muted/60" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  ),
});

export default function FinanceManagementPage() {
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

      <FinanceChartsShowcase />

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
