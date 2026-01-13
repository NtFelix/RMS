'use client';

import { Calculator, Droplets, Zap, Flame, FileText, Users, CheckCircle2, ArrowRight, DollarSign, Search, Filter, PieChart, BarChart3, Receipt, Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import BottomCTA from '@/components/ui/bottom-cta';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { m } from "framer-motion";
import { Input } from '@/components/ui/input';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';

export default function UtilityCostPage() {
  // Mock data for Cost Items (replacing Operating Costs)
  const mockCostItems = [
    { id: 1, art: 'Grundsteuer', betrag: '1.250,00 €', schluessel: 'pro Fläche' },
    { id: 2, art: 'Straßenreinigung', betrag: '450,00 €', schluessel: 'pro Fläche' },
    { id: 3, art: 'Müllabfuhr', betrag: '890,00 €', schluessel: 'pro Mieter' },
    { id: 4, art: 'Gebäudeversicherung', betrag: '1.450,00 €', schluessel: 'pro Fläche' },
    { id: 5, art: 'Allgemeinstrom', betrag: '320,00 €', schluessel: 'pro Wohnung' },
    { id: 6, art: 'Hauswart', betrag: '2.400,00 €', schluessel: 'pro Fläche' },
  ];

  // Mock data for Meter Readings table
  const mockMeterReadings = [
    { id: 1, name: 'Wasserzähler Küche', number: 'WZ-101', reading: '345.678 m³', date: '31.12.2024', location: 'Whg A' },
    { id: 2, name: 'Wasserzähler Bad', number: 'WZ-102', reading: '123.456 m³', date: '31.12.2024', location: 'Whg A' },
    { id: 3, name: 'Heizungszähler', number: 'HZ-201', reading: '45.678 kWh', date: '31.12.2024', location: 'Whg B' },
    { id: 4, name: 'Stromzähler Allg.', number: 'SZ-001', reading: '12.345 kWh', date: '31.12.2024', location: 'Keller' },
  ];

  // Mock data for Settlements table
  const mockSettlements = [
    { id: 1, tenant: 'Max Mustermann', unit: 'Wohnung A', period: '2024', result: 'Nachzahlung', amount: '120,50 €' },
    { id: 2, tenant: 'Erika Musterfrau', unit: 'Wohnung B', period: '2024', result: 'Guthaben', amount: '45,20 €' },
    { id: 3, tenant: 'John Doe', unit: 'Wohnung C', period: '2024', result: 'Guthaben', amount: '85,30 €' },
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
              Betriebskosten einfach abrechnen
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed text-center">
            Erstellen Sie professionelle Nebenkostenabrechnungen in Minuten. Erfassen Sie Zählerstände und verteilen Sie Kosten automatisch.
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

      {/* Main Visual Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Image with macOS Window */}
          <MacWindow className="mb-16">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table.avif"
              alt="Betriebskosten-Übersicht"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table-darkmode.avif"
              alt="Betriebskosten-Übersicht (Dark Mode)"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>
        </div>
      </div>

      {/* Detailed Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold">Funktionen im Detail</h2>
          </m.div>

          {/* Kostenübersicht Section - 2 Column Layout (Table Left, Text Right) */}
          <m.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <m.div
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
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Kostenart</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Betrag</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Umlageschlüssel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockCostItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{item.art}</TableCell>
                          <TableCell>{item.betrag}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">
                              {item.schluessel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </m.div>

            {/* Right Column - Description */}
            <m.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <Receipt className="w-8 h-8 text-primary" />
                  Zentrale Kostenerfassung
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Erfassen Sie alle umlagefähigen Betriebskosten an einem Ort. Ordnen Sie Rechnungen direkt den entsprechenden Kostenarten und Abrechnungszeiträumen zu.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Automatische Kategorisierung</h4>
                    <p className="text-muted-foreground">Intelligente Zuordnung von Kostenarten für eine korrekte Abrechnung.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Digitale Belegablage</h4>
                    <p className="text-muted-foreground">Speichern Sie Rechnungen direkt digital zu jeder Buchung.</p>
                  </div>
                </div>
              </div>
            </m.div>
          </m.div>

          {/* Zählerstände Section - 2 Column Layout (Text Left, Table Right) */}
          <m.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Description */}
            <m.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <Calculator className="w-8 h-8 text-primary" />
                  Zählerstände verwalten
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Behalten Sie den Überblick über alle Zählerstände. Erfassen Sie Verbräuche für Wasser, Heizung und Strom einfach und fehlerfrei.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Verbrauchshistorie</h4>
                    <p className="text-muted-foreground">Verfolgen Sie die Verbrauchsentwicklung über die Jahre.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Plausibilitätsprüfung</h4>
                    <p className="text-muted-foreground">Automatische Warnung bei ungewöhnlichen Abweichungen.</p>
                  </div>
                </div>
              </div>
            </m.div>

            {/* Right Column - Table in Mac Window */}
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
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
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Zähler</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Nummer</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Stand</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Ort</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockMeterReadings.map((meter) => (
                        <TableRow
                          key={meter.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{meter.name}</TableCell>
                          <TableCell className="text-muted-foreground">{meter.number}</TableCell>
                          <TableCell className="font-mono">{meter.reading}</TableCell>
                          <TableCell>{meter.location}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </m.div>
          </m.div>

          {/* Abrechnung Section - 2 Column Layout (Table Left, Text Right) */}
          <m.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <m.div
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
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Mieter</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Einheit</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Ergebnis</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Betrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockSettlements.map((settlement) => (
                        <TableRow
                          key={settlement.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{settlement.tenant}</TableCell>
                          <TableCell>{settlement.unit}</TableCell>
                          <TableCell>
                            <Badge variant={
                              settlement.result === 'Nachzahlung' ? 'destructive' :
                                settlement.result === 'Guthaben' ? 'default' : 'secondary'
                            }>
                              {settlement.result}
                            </Badge>
                          </TableCell>
                          <TableCell className={
                            settlement.result === 'Nachzahlung' ? 'text-red-500 font-medium' :
                              settlement.result === 'Guthaben' ? 'text-green-500 font-medium' : ''
                          }>
                            {settlement.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </m.div>

            {/* Right Column - Description */}
            <m.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <FileText className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Abrechnung erstellen</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie automatisch fertige Nebenkostenabrechnungen für Ihre Mieter.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div className="w-full">
                    <h4 className="font-semibold mb-1">PDF-Export</h4>
                    <p className="text-muted-foreground mb-3">Versandfertige Dokumente mit einem Klick erstellen.</p>

                    {/* Download Selector Mockup */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 h-9 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary"
                        onClick={() => window.open(EXAMPLE_BILL_PDF_URL, '_blank')}
                      >
                        <FileDown className="w-4 h-4" />
                        Beispiel als PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 h-9 text-muted-foreground cursor-not-allowed opacity-70"
                        disabled
                      >
                        <Download className="w-4 h-4" />
                        Alle als ZIP
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Flexible Umlageschlüssel</h4>
                    <p className="text-muted-foreground">Verteilung nach Fläche, Personen, Einheiten oder Verbrauch.</p>
                  </div>
                </div>
              </div>
            </m.div>
          </m.div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <BottomCTA
        onGetStarted={handleGetStarted}
        theme="houses"
        title="Starten Sie noch heute mit der"
        subtitle="Betriebskostenabrechnung"
        description="Sparen Sie Zeit und Nerven bei der jährlichen Abrechnung. Testen Sie jetzt kostenlos."
        badgeText="Einfach & Schnell"
        primaryButtonText="14 Tage kostenlos testen"
        secondaryButtonText="Demo anfordern"
      />
    </div>
  );
}
