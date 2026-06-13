'use client';

import { Calculator, Droplets, Zap, Flame, FileText, CheckCircle2, Receipt, FileDown, Coins, PieChart, BarChart3, Filter, Droplet, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import { motion } from 'framer-motion';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';
import BottomCTA from '@/components/ui/bottom-cta';
import { cn } from '@/lib/utils';

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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-linear-to-b from-primary/10 via-primary/5 to-transparent opacity-50" />
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
            {/* Feature 1: Structured Cost Capture (Large) — mock top, content bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full p-5 flex flex-col gap-2.5 select-none">
                      {[
                        { name: "Grundsteuer B", amount: "1.250,50 €", icon: Receipt },
                        { name: "Müllabfuhr", amount: "340,20 €", icon: Droplet },
                        { name: "Gebäudeversicherung", amount: "890,00 €", icon: FileText },
                        { name: "Hauswart", amount: "250,00 €", icon: CheckCircle2 },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl bg-background/60 border border-border/50 shadow-xs backdrop-blur-xs",
                            "group-hover:translate-x-2 transition-transform duration-500",
                            i === 0 && "delay-0",
                            i === 1 && "delay-[75ms]",
                            i === 2 && "delay-[150ms]",
                            i === 3 && "delay-[225ms]"
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                            <row.icon size={13} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground/80 truncate">{row.name}</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground/70 shrink-0">{row.amount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Receipt size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Kostenerfassung</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Strukturierte Kostenerfassung</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Erfassen Sie alle Ausgaben zentral. Weisen Sie Kostenarten und Umlageschlüssel direkt bei der Eingabe zu.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Meter Management — mock top, content bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full p-5 flex flex-col gap-3 justify-center select-none">
                      {[
                        { label: "Wasser Küche", unit: "345,20 m³", active: true, trend: "+2,4%", up: true, Icon: Droplet, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { label: "Strom Allgemein", unit: "4.521 kWh", active: true, trend: "-5,1%", up: false, Icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                        { label: "Heizung Haupt", unit: "892 kWh", active: false, trend: "0%", up: false, Icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
                      ].map((meter, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 group-hover:translate-y-[-2px] transition-transform" style={{ transitionDelay: `${i * 75}ms` }}>
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meter.bg, meter.color)}>
                            <meter.Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground/80 truncate">{meter.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{meter.unit}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {meter.trend !== "0%" && (
                              meter.up ? (
                                <TrendingUp size={12} className="text-rose-500" />
                              ) : (
                                <TrendingDown size={12} className="text-emerald-500" />
                              )
                            )}
                            <span className={cn("text-[9px] font-bold", meter.up ? "text-rose-500" : "text-emerald-500")}>{meter.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Calculator size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Zähler & Verbräuche</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Zählerverwaltung</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Lückenlose Protokollierung aller Verbräuche mit Plausibilitäts-Check.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: Smarte Umlage — mock top, content bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="w-full h-full flex items-end justify-between gap-1 p-5 pb-4 select-none">
                      {[45, 75, 50, 95, 65, 80].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                          className="flex-1 rounded-t-md bg-foreground/10 hover:bg-primary/40 transition-colors duration-300"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <PieChart size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Verteilerschlüssel</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Smarte Umlage</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Variable Schlüssel nach Fläche, Personen oder Verbrauch.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 4: Professionelle Dokumente — mock top, content bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
              <div className="relative h-full flex flex-col">
                {/* Mock Area — top */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-[1.02]">
                    <div className="absolute inset-0 flex items-center justify-center select-none">
                      <div className="w-44 h-56 bg-background rounded-xl border border-border/60 shadow-sm absolute rotate-6 opacity-30 translate-x-8" />
                      <div className="w-44 h-56 bg-background rounded-xl border border-border/60 shadow-xl absolute -rotate-2 flex flex-col p-5 z-10">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 self-start">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="w-20 h-2 bg-foreground/20 rounded-full mb-4" />
                        <div className="w-full h-1 bg-foreground/5 rounded-full mb-2" />
                        <div className="w-full h-1 bg-foreground/5 rounded-full mb-2" />
                        <div className="w-2/3 h-1 bg-foreground/5 rounded-full mb-6" />
                        <div className="mt-auto w-full flex justify-between items-end">
                          <div className="w-14 h-3 bg-muted/50 rounded-full" />
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileDown size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Area — bottom */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">PDF Export</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Professionelle Dokumente</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Generieren Sie formgerechte Abrechnungen mit nur einem Klick. Klar strukturiert und verständlich.</p>
                  <Button variant="link" className="text-primary p-0 h-auto font-bold flex items-center gap-2 group-hover:translate-x-1 transition-transform w-fit mt-2">
                    Muster herunterladen <FileDown size={14} />
                  </Button>
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
                <div className="relative rounded-3xl border border-border bg-background shadow-lg hover:shadow-xl dark:shadow-none overflow-hidden group/container transition-all duration-500 hover:border-primary/20">
                  <div className="p-5 border-b border-border bg-muted/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-border" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-2">Meter_Monitor_v2</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">Zähler OK</span>
                  </div>
                  <div className="divide-y divide-border/40 relative z-10">
                    {mockMeterReadings.map((meter) => {
                      const isWater = meter.name.toLowerCase().includes('wasser');
                      const isStrom = meter.name.toLowerCase().includes('strom');
                      const Icon = isWater ? Droplets : isStrom ? Zap : Flame;
                      const iconColor = isWater ? 'text-blue-500' : isStrom ? 'text-yellow-500' : 'text-orange-500';
                      const iconBg = isWater ? 'bg-blue-500/10' : isStrom ? 'bg-yellow-500/10' : 'bg-orange-500/10';
                      const trendColor = meter.trend.startsWith('+') ? 'text-rose-500' : meter.trend.startsWith('-') ? 'text-emerald-500' : 'text-muted-foreground';

                      return (
                        <div
                          key={meter.id}
                          className="p-4.5 flex items-center justify-between bg-background/50 hover:bg-muted/10 transition-all duration-300 group/row cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border border-border/40 transition-transform group-hover/row:scale-105", iconBg, iconColor)}>
                              <Icon size={16} />
                            </div>
                            <div className="group-hover/row:translate-x-0.5 transition-transform duration-200">
                              <div className="font-bold text-sm tracking-tight group-hover/row:text-primary transition-colors duration-200">{meter.name}</div>
                              <div className="text-[10px] text-muted-foreground">Aktualisiert • {meter.lastUpdate}</div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-0.5">
                            <span className="font-mono text-sm font-bold text-foreground/80 group-hover/row:text-primary transition-colors duration-200">
                              {meter.reading}
                            </span>
                            <div className={cn("text-[9px] font-bold flex items-center gap-1", trendColor)}>
                              {meter.trend !== "0%" && (
                                meter.trend.startsWith('+') ? (
                                  <TrendingUp size={10} />
                                ) : (
                                  <TrendingDown size={10} />
                                )
                              )}
                              <span>{meter.trend}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                <div className="relative rounded-3xl border border-border bg-background shadow-lg hover:shadow-xl dark:shadow-none overflow-hidden group/container transition-all duration-500 hover:border-primary/20">
                  <div className="p-5 border-b border-border bg-muted/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Abrechnungsstatus</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">+12.450 €</span>
                  </div>

                  <div className="divide-y divide-border/40 relative z-10">
                    {mockSettlements.map((item) => {
                      const isNachzahlung = item.result === 'Nachzahlung';
                      const statusColor = isNachzahlung 
                        ? 'text-amber-500 bg-amber-500/5' 
                        : 'text-emerald-500 bg-emerald-500/5';
                      
                      return (
                        <div 
                          key={item.id} 
                          className="p-4.5 flex items-center justify-between bg-background/50 hover:bg-muted/10 transition-all duration-300 group/row cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted border border-border/40 flex items-center justify-center text-muted-foreground font-semibold text-xs group-hover/row:bg-primary group-hover/row:text-primary-foreground transition-all duration-300">
                              {item.tenant.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="group-hover/row:translate-x-0.5 transition-transform duration-200">
                              <div className="font-bold text-sm group-hover/row:text-primary transition-colors duration-200">{item.tenant}</div>
                              <div className="text-[10px] text-muted-foreground">{item.unit} • {item.period}</div>
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-0.5">
                            <div className="font-mono text-sm font-bold group-hover/row:text-primary transition-colors duration-200">{item.amount}</div>
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-sm border transition-all duration-300",
                              isNachzahlung ? "border-amber-500/25" : "border-emerald-500/25",
                              statusColor
                            )}>
                              {item.result}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
