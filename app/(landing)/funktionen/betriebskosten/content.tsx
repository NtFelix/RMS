'use client';

import { Calculator, Droplets, Zap, Flame, FileText, CheckCircle2, Receipt, FileDown, Coins, PieChart, BarChart3, Filter, Droplet, ArrowUpRight, TrendingUp, TrendingDown, ChevronDown, ChevronUp, FileUp, AlertTriangle, Key, RefreshCw, Layers, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';
import BottomCTA from '@/components/ui/bottom-cta';
import { cn } from '@/lib/utils';



export default function UtilityCostPage() {

  const meterSteps = [
    {
      title: "Kosten & Belege erfassen",
      icon: Receipt,
      description: "Erfassen Sie alle angefallenen Ausgaben für Ihre Liegenschaften und weisen Sie diese direkt den passenden Kostenarten zu.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Kosten erfassen</div>
              <div className="text-[9px] text-muted-foreground">Rechnungsbelege</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Grundsteuer B", amount: "1.250,50 €" },
              { name: "Müllabfuhr", amount: "340,20 €" },
              { name: "Hauswart", amount: "250,00 €" }
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/5 border border-border/40 text-xs">
                <span className="font-semibold text-foreground/80">{row.name}</span>
                <span className="font-mono font-bold text-foreground">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Zählerstände importieren",
      icon: FileUp,
      description: "Geben Sie die Zählerstände Ihrer Mieter für Heizung, Wasser oder Strom ein oder importieren Sie diese gesammelt für das gesamte Objekt.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileUp size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Zähler importieren</div>
              <div className="text-[9px] text-muted-foreground">Datei Upload</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/5">
              <div className="text-[9px] font-bold text-muted-foreground uppercase">Wasserzähler Küche</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-semibold text-foreground">Kaltwasser</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-foreground/5 rounded border border-border/40">345,20 m³</span>
              </div>
            </div>
            <button type="button" className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 hover:bg-primary/90 transition-colors">
              Speichern
            </button>
          </div>
        </div>
      )
    },
    {
      title: "Plausibilitätscheck",
      icon: AlertTriangle,
      description: "Lassen Sie das System die Berechnungen automatisch prüfen. Eventuelle Eingabefehler oder extreme Abweichungen werden sofort signalisiert.",
      mockup: (
        <div className="w-[280px] bg-background border border-destructive/20 shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-destructive/45 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-destructive uppercase tracking-wider">Plausi-Warnung</div>
              <div className="text-[9px] text-muted-foreground">Eingabefehler?</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10 text-xs">
              <span className="font-bold text-foreground">Hoher Verbrauch (+45%)</span>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Der eingegebene Zählerstand weicht erheblich vom Vorjahreswert ab (238,10 m³).
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-1.5 rounded-lg bg-foreground/5 border border-border text-foreground font-bold text-[10px] hover:bg-foreground/10">Abbrechen</button>
              <button type="button" className="flex-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-[10px] hover:bg-destructive/90 shadow-xs">Ignorieren</button>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "PDFs gesammelt exportieren",
      icon: FileDown,
      description: "Generieren Sie die fertigen Dokumente mit einem Klick. Exportieren Sie alle PDFs gesammelt in einer Zip-Datei oder wählen Sie einzelne Mieter aus.",
      mockup: (
        <div className="w-[280px] bg-background border border-border shadow-2xl rounded-2xl p-5 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileDown size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground/90">Batch PDF Export</div>
              <div className="text-[9px] text-muted-foreground">Dokumente herunterladen</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1.5 text-[10px] text-foreground/80">
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/20 border border-border/20">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-emerald-500 stroke-[3]" /> Alle Mieter</span>
                <span className="text-muted-foreground font-mono">6 PDFs</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/10">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-primary stroke-[3]" /> Whg. 01 - Müller</span>
                <span className="text-muted-foreground">Bereit</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/10">
                <span className="flex items-center gap-1.5 font-medium"><Check size={10} className="text-primary stroke-[3]" /> Whg. 02 - Schmidt</span>
                <span className="text-muted-foreground">Bereit</span>
              </div>
            </div>
            <button type="button" className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/10 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
              <FileDown size={13} /> Export starten
            </button>
          </div>
        </div>
      )
    }
  ];



  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-background text-foreground">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-linear-to-b from-primary/10 via-primary/5 to-transparent opacity-50" />
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 pt-44 pb-20 text-center max-w-7xl">

        <m.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto"
        >
          Abrechnungen erstellen, <br />
          <span className="text-primary">nicht mehr ausrechnen.</span>
        </m.h1>

        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Automatisieren Sie den Prozess von der Belegerfassung bis zum fertigen PDF.
          Präzise, professionell und intuitiv.
        </m.p>

        <m.div
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
            target="_blank"
            rel="noopener noreferrer"
            className="h-14 px-8 rounded-xl font-bold border-2"
          />
        </m.div>
      </div>

      {/* Main Showcase */}
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 pb-32">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-7xl mx-auto"
        >
          <MacWindow className="shadow-2xl border-border/50 bg-background/50 backdrop-blur-xl">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/betriebskosten-page.avif"
              alt="Betriebskostenübersicht"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/betriebskosten-page-darkmode.avif"
              alt="Betriebskostenübersicht Dark"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>
        </m.div>
      </div>

      {/* Timeline Section */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20 max-w-7xl relative z-10">
          <div className="py-20 first:pt-0 relative">
            <div className="text-center w-full max-w-3xl mx-auto mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">In 4 Schritten <span className="text-primary italic">zur Abrechnung.</span></h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Der einfache Leitfaden zur Erstellung Ihrer Betriebskostenabrechnung – Schritt für Schritt.
              </p>
            </div>

            <div className="relative">
              {meterSteps.map((step, index) => {
                const isEven = index % 2 === 0;
                return (
                  <m.div 
                    key={index}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.15, duration: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative py-10 lg:py-16"
                  >
                    {/* Segment of the timeline line */}
                    {index === 0 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-1/2 bottom-0 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}
                    {index > 0 && index < meterSteps.length - 1 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}
                    {index === meterSteps.length - 1 && (
                      <m.div
                        initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
                        whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        className="absolute left-1/2 top-0 bottom-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary/20 hidden lg:block"
                      />
                    )}

                    {/* Timeline Node in the center (visible only on lg screens) */}
                    <m.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-4 border-primary flex items-center justify-center hidden lg:flex z-10 shadow-xs"
                    >
                      <span className="text-[10px] font-bold text-primary font-mono">{index + 1}</span>
                    </m.div>

                    {/* Left side column: Text for even indices, mockup for odd indices */}
                    <m.div
                      initial={{ opacity: 0, x: isEven ? -20 : 20, y: 10 }}
                      whileInView={{ opacity: 1, x: 0, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
                      className={cn(
                        "lg:col-span-5 flex flex-col justify-center",
                        isEven ? "order-1 lg:order-1 text-left" : "order-1 lg:order-3 text-left lg:text-left"
                      )}
                      >
                      <h3 className="text-2xl font-extrabold text-foreground tracking-tight mb-4 flex items-center gap-3">
                        <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <step.icon size={16} className="stroke-[2.5]" />
                        </span>
                        {step.title}
                      </h3>
                      
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                        {step.description}
                      </p>

                     </m.div>
 
                      {/* Spacer for center timeline alignment */}
                      <div className={cn("lg:col-span-2 hidden lg:block", isEven ? "lg:order-2" : "lg:order-2")} />
 
                     {/* Right side column: Mockup for even indices, text for odd indices */}
                     <m.div
                       initial={{ opacity: 0, x: isEven ? 20 : -20, y: 10 }}
                       whileInView={{ opacity: 1, x: 0, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                       className={cn(
                         "lg:col-span-5 flex justify-center items-center",
                         isEven ? "order-3 lg:order-3" : "order-2 lg:order-1"
                       )}
                     >
                       <div className="relative bg-black/5 dark:bg-black/25 rounded-3xl border border-border/40 overflow-hidden shadow-inner p-8 hover:border-primary/20 transition-all duration-300 w-fit">
                         <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-transparent opacity-40 pointer-events-none" />
                         <div className="relative z-10 transform scale-95 sm:scale-100 transition-transform duration-500">
                           {step.mockup}
                         </div>
                       </div>
                     </m.div>
                  </m.div>
                );
              })}
            </div>
          </div>

                  </div>
      </section>

      {/* Feature Section - Bento Grid Style */}
      <section className="py-24 relative overflow-hidden bg-muted/10">
        <div className="container mx-auto px-4 sm:px-8 lg:px-16 xl:px-20">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Alle Funktionen <span className="text-primary italic">im Gesamtüberblick.</span></h2>
            <p className="text-lg text-muted-foreground">Ein nahtloser Workflow, der Zeit spart und Fehler eliminiert.</p>
          </m.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 max-w-7xl mx-auto">
            {/* Feature 1: Structured Cost Capture (Large) — mock top, content bottom */}
            <m.div
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
            </m.div>

            {/* Feature 2: Meter Management — mock top, content bottom */}
            <m.div
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
            </m.div>

            {/* Feature 3: Smarte Umlage — mock top, content bottom */}
            <m.div
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
                        <m.div
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
            </m.div>

            {/* Feature 5: Automatischer Leerstand (lg:col-span-2) */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
              >
                <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />
                <div className="relative h-full flex flex-col">
                  {/* Mock Area */}
                  <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 flex items-center justify-center p-4">
                    <div className="w-full bg-background/50 border border-border/40 rounded-xl p-4 space-y-2 select-none text-xs">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                        <span>Leerstand</span>
                        <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">45 Tage</span>
                      </div>
                      <div className="w-full h-2 bg-foreground/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[12%]" />
                      </div>
                      <div className="flex justify-between text-[11px] text-foreground/80 font-mono">
                        <span>Anteil:</span>
                        <span className="font-bold">12.33% / 154,20 €</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <RefreshCw size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/60">ZEITRÄUME</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">Automatischer Leerstand</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Leerstände tagesgenau erfassen und Kosten automatisch für den korrekten Zeitraum zuweisen.
                    </p>
                  </div>
                </div>
              </m.div>

            {/* Feature 4: Professionelle Dokumente — mock top, content bottom */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-xl transition-all duration-500"
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
                  <Button asChild variant="outline" className="mt-4 w-full flex items-center justify-center gap-2 font-semibold">
                    <a href={EXAMPLE_BILL_PDF_URL} target="_blank" rel="noopener noreferrer">
                      Muster herunterladen <FileDown size={14} />
                    </a>
                  </Button>
                </div>
              </div>
            </m.div>


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
    </LazyMotion>
  );
}
