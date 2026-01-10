'use client';

import { Calculator, Droplets, Zap, Flame, FileText, CheckCircle2, ArrowRight, DollarSign, Receipt, FileDown, ShieldCheck, Coins, PieChart, BarChart3, Filter, Droplet, Gauge, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';
import BottomCTA from '@/components/ui/bottom-cta';

export default function UtilityCostPage() {
  const mockCostItems = [
    { id: 1, art: 'Grundsteuer', betrag: '1.250,00 €', schluessel: 'Anteilig' },
    { id: 2, art: 'Straßenreinigung', betrag: '450,00 €', schluessel: 'Anteilig' },
    { id: 3, art: 'Müllabfuhr', betrag: '890,00 €', schluessel: 'Einheiten' },
    { id: 4, art: 'Gebäudeversicherung', betrag: '1.450,00 €', schluessel: 'Anteilig' },
  ];

  const mockMeterReadings = [
    { id: 1, name: 'Wasserzähler Küche', reading: '345.20 m³', trend: '+2%', status: 'Erfasst', lastUpdate: '12.10.2023' },
    { id: 2, name: 'Wasserzähler Bad', reading: '123.50 m³', trend: '-5%', status: 'Erfasst', lastUpdate: '12.10.2023' },
    { id: 3, name: 'Strom Allgemein', reading: '4521.0 kWh', trend: '+1%', status: 'Ausstehend', lastUpdate: '01.01.2023' },
    { id: 4, name: 'Heizung Haupt', reading: '892.10 kWh', trend: '0%', status: 'Erfasst', lastUpdate: '15.10.2023' },
  ];

  const mockSettlements = [
    { id: 1, tenant: 'Max Mustermann', unit: 'EG Links', period: '01.01.23 - 31.12.23', result: 'Nachzahlung', amount: '120,50 €' },
    { id: 2, tenant: 'Erika Musterfrau', unit: '1. OG Rechts', period: '01.01.23 - 31.12.23', result: 'Guthaben', amount: '45,20 €' },
    { id: 3, tenant: 'Klaus Schmidt', unit: '2. OG Mitte', period: '01.01.23 - 31.12.23', result: 'Guthaben', amount: '150,00 €' },
    { id: 4, tenant: 'Julia Weber', unit: 'DG Links', period: '01.01.23 - 31.12.23', result: 'Nachzahlung', amount: '12,90 €' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent opacity-50" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8"
        >
          BETRIEBSKOSTENABRECHNUNG
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto"
        >
          Abrechnungen erstellen, <br />
          <span className="text-primary">nicht mehr ausrechnen.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Automatisieren Sie den Prozess von der Belegerfassung bis zum fertigen PDF.
          Präzise, professionell und intuitiv.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <CTAButton
            variant="primary"
            text="Jetzt kostenlos starten"
            href="/?getStarted=true"
            className="h-14 px-8 rounded-xl font-bold shadow-lg"
          />
          <CTAButton
            variant="secondary"
            text="Muster Abrechnung"
            href={EXAMPLE_BILL_PDF_URL}
            className="h-14 px-8 rounded-xl font-bold border-2"
          />
        </motion.div>
      </div>

      {/* Main Showcase */}
      <div className="container mx-auto px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-5xl mx-auto"
        >
          <MacWindow className="shadow-2xl border-border/50 bg-background/50 backdrop-blur-xl">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table.avif"
              alt="Plattform Ansicht"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/finance-table-darkmode.avif"
              alt="Plattform Ansicht Dark"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>
        </motion.div>
      </div>

      {/* Feature Section - Bento Grid Style */}
      <section className="py-24 relative overflow-hidden bg-muted/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Vom Beleg zur <span className="text-primary italic">fertigen Abrechnung.</span></h2>
            <p className="text-lg text-muted-foreground">Ein nahtloser Workflow, der Zeit spart und Fehler eliminiert.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 max-w-7xl mx-auto">
            {/* Feature 1: Structured Cost Capture (Large) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4 group relative rounded-3xl overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                <div className="p-8 pb-4 flex flex-col gap-2 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <Receipt className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Strukturierte Kostenerfassung</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-md text-sm md:text-base">Erfassen Sie alle Ausgaben zentral. Weisen Sie Kostenarten und Umlageschlüssel direkt bei der Eingabe zu.</p>
                </div>
                <div className="flex-1 relative min-h-[240px] mt-4 mx-6 mb-6 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/50 to-transparent pointer-events-none z-10" />
                  <div className="w-full h-full transform transition-transform duration-500 group-hover:scale-[1.02] origin-top p-4">
                    <Table>
                      <TableHeader className="border-none">
                        <TableRow className="hover:bg-transparent border-none text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                          <TableHead className="pl-4">Kostenart</TableHead>
                          <TableHead>Intervall</TableHead>
                          <TableHead className="text-right pr-4">Betrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { name: "Grundsteuer B", type: "Jährlich", amount: "1.250,50 €" },
                          { name: "Müllabfuhr", type: "Quartal", amount: "340,20 €" },
                          { name: "Gebäudeversicherung", type: "Jährlich", amount: "890,00 €" },
                          { name: "Hauswart", type: "Monatlich", amount: "250,00 €" },
                        ].map((row, i) => (
                          <TableRow key={i} className="border-b border-border/40 hover:bg-background/50 transition-colors">
                            <TableCell className="py-3 pl-4 text-xs font-medium">{row.name}</TableCell>
                            <TableCell className="py-3 text-[10px]">
                              <span className="px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground">{row.type}</span>
                            </TableCell>
                            <TableCell className="py-3 pr-4 text-xs font-mono text-right font-medium">{row.amount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Meter Management (Standard) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 group relative rounded-3xl overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                <div className="p-8 pb-4 flex flex-col gap-2 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <Calculator className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Zählerverwaltung</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">Lückenlose Protokollierung aller Verbräuche mit Plausibilitäts-Check.</p>
                </div>

                <div className="flex-1 relative mx-6 mb-6 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 p-4 flex flex-col gap-3">
                  {/* Mocked MeterCard: Water */}
                  <div className="bg-background border border-border/60 rounded-xl shadow-sm overflow-hidden transform transition-transform duration-500 hover:scale-[1.02]">
                    <div className="p-3 flex items-center justify-between border-b border-border/40 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                          <Droplet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">Wasserzähler Küche</div>
                          <div className="text-[10px] text-muted-foreground">Kaltwasser</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground"><Gauge size={12} /></div>
                      </div>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><Gauge size={8} /> Stand</div>
                        <div className="text-xs font-mono font-medium">345.20 m³</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar size={8} /> Eichung</div>
                        <div className="text-xs font-medium">12.10.2028</div>
                      </div>
                    </div>
                  </div>

                  {/* Mocked MeterCard: Electricity */}
                  <div className="bg-background border border-border/60 rounded-xl shadow-sm overflow-hidden transform transition-transform duration-500 hover:scale-[1.02] opacity-80">
                    <div className="p-3 flex items-center justify-between border-b border-border/40 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">Strom Allgemein</div>
                          <div className="text-[10px] text-muted-foreground">Stromzähler</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground"><Gauge size={12} /></div>
                      </div>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><Gauge size={8} /> Stand</div>
                        <div className="text-xs font-mono font-medium">4521.0 kWh</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar size={8} /> Eichung</div>
                        <div className="text-xs font-medium">01.01.2030</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: Settlements (Standard) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 group relative rounded-3xl overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                <div className="p-8 pb-4 flex flex-col gap-2 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <PieChart className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Smarte Umlage</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">Variable Schlüssel nach Fläche, Personen oder Verbrauch.</p>
                </div>

                <div className="flex-1 relative mx-6 mb-6 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 flex items-end justify-center p-6">
                  <div className="w-full h-24 flex items-end justify-between gap-1 transform transition-transform duration-500 group-hover:scale-[1.02]">
                    {[45, 75, 50, 95, 65].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="w-full bg-foreground/10 rounded-sm hover:bg-indigo-500/50 transition-colors"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 4: Documents (Large) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4 group relative rounded-3xl overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col md:flex-row">
                <div className="p-8 flex flex-col gap-2 relative z-10 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Professionelle Dokumente</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm md:text-base mb-4">Generieren Sie formgerechte Abrechnungen mit nur einem Klick. Klar strukturiert und verständlich.</p>
                  <Button variant="link" className="text-primary p-0 h-auto font-bold flex items-center gap-2 group-hover:translate-x-1 transition-transform w-fit">
                    Muster herunterladen <FileDown size={14} />
                  </Button>
                </div>

                <div className="flex-1 relative min-h-[220px] m-6 md:ml-0 md:mt-6 rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
                  {/* Stacked Papers */}
                  <div className="absolute inset-0 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-[1.02]">
                    <div className="w-48 h-60 bg-background rounded-lg border border-border/60 shadow-sm absolute rotate-6 opacity-40 translate-x-4" />
                    <div className="w-48 h-60 bg-background rounded-lg border border-border/60 shadow-lg absolute -rotate-2 flex flex-col p-4 z-10">
                      {/* Fake Document Content */}
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 self-start">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="w-24 h-2 bg-foreground/20 rounded mb-4" />
                      <div className="w-full h-1 bg-foreground/5 rounded mb-2" />
                      <div className="w-full h-1 bg-foreground/5 rounded mb-2" />
                      <div className="w-2/3 h-1 bg-foreground/5 rounded mb-6" />

                      <div className="mt-auto w-full flex justify-between items-end">
                        <div className="w-16 h-4 bg-muted/50 rounded" />
                        <div className="w-8 h-8 rounded-full bg-foreground/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Deep Dive Details Section */}
      <section className="py-0 relative">
        <div className="container mx-auto px-4">

          {/* Detail 1: Meter Monitor */}
          <div className="py-24 border-t border-border/20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1"
              >
                <div className="rounded-3xl border border-border bg-background shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden group/container transition-all hover:border-primary/20">
                  <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-border" />
                        <div className="w-2.5 h-2.5 rounded-full bg-border" />
                        <div className="w-2.5 h-2.5 rounded-full bg-border" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-2">Meter_Monitor_v2</span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/10 border-b border-border">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground py-4 px-6">Gerät</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground py-4">Status</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground py-4 text-right px-6">Bezugswert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockMeterReadings.map((meter) => (
                        <TableRow key={meter.id} className="border-border/50 hover:bg-muted/5 transition-colors group/row">
                          <TableCell className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-muted-foreground group-hover/row:bg-background transition-colors">
                                <Zap size={15} />
                              </div>
                              <div>
                                <div className="font-bold text-sm tracking-tight">{meter.name}</div>
                                <div className="text-[10px] text-muted-foreground">Synchronisiert am {meter.lastUpdate}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted border border-border/50 text-muted-foreground group-hover/row:bg-background transition-colors">
                              {meter.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right font-mono text-xs font-bold text-foreground/80">
                            {meter.reading}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
              <div className="order-1 lg:order-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Jeder Tropfen zählt.</h3>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Behalten Sie den Überblick über alle Zählerstände.
                  Erfassen Sie Zählerwechsel, Eichfristen und unterjährige Ablesungen einfach digital.
                  Das System unterstützt Sie bei der korrekten Zuordnung.
                </p>
                <ul className="space-y-4">
                  {[
                    "Einfache digitale Erfassung",
                    "Unterstützung für Wärme, Wasser und Strom",
                    "Plausibilitätsprüfung",
                    "Übersicht aller Eichfristen"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-[10px]">
                        <CheckCircle2 size={12} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Detail 2: Settlement Overview */}
          <div className="py-24 border-t border-border/20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Klarheit statt Konflikt.</h3>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Erstellen Sie Abrechnungen, die Ihre Mieter auf den ersten Blick verstehen.
                  Transparente Aufschlüsselung aller Kostenarten und Verteilerschlüssel schafft Vertrauen und reduziert Rückfragen.
                </p>
                <ul className="space-y-4">
                  {[
                    "Frei wählbare Umlageschlüssel",
                    "Berücksichtigung von Vorwegabzug",
                    "Automatische Berücksichtigung von Leerstand",
                    "Export als PDF"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-[10px]">
                        <CheckCircle2 size={12} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="rounded-3xl border border-border bg-background overflow-hidden shadow-sm relative transition-all duration-500">
                  <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Abrechnungsstatus</span>
                    </div>
                  </div>

                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-bold text-foreground py-4 px-6">Mieter</TableHead>
                        <TableHead className="text-xs font-bold text-foreground py-4 text-right px-6">Ergebnis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockSettlements.map((item) => (
                        <TableRow key={item.id} className="border-border hover:bg-muted/5 transition-colors">
                          <TableCell className="py-4 px-6">
                            <div className="font-bold text-sm">{item.tenant}</div>
                            <div className="text-[10px] text-muted-foreground">{item.period}</div>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <div className="font-mono text-sm font-bold">{item.amount}</div>
                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">{item.result}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <BottomCTA
        onGetStarted={() => window.location.href = '/?getStarted=true'}
        title="Bereit für transparente"
        subtitle="Betriebskostenabrechnungen?"
        description="Digitale Verwaltung muss nicht kompliziert sein. Starten Sie jetzt und erstellen Sie Ihre erste Abrechnung in wenigen Minuten."
        badgeText="Jetzt loslegen"
        primaryButtonText="Kostenlos starten"
        secondaryButtonText="Demo anfordern"
        theme="houses"
      />
    </div>
  );
}
