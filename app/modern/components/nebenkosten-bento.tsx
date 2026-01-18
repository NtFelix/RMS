"use client"

import { m } from "framer-motion"
import {
  Key, RefreshCw, FileText, Folder, Sparkles,
  ArrowUpRight, CheckCircle2, FileJson,
  CalendarDays, Calculator, Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NKFeature {
  title: string;
  subtitle?: string;
  description: string;
  colSpan: string;
  icon: React.ElementType;
  mock: React.ReactNode;
}

const nkFeatures: NKFeature[] = [
  {
    title: "Verteilerschlüssel",
    subtitle: "Präzise Aufteilung",
    description: "Wählen Sie je Kostenart passende Schlüssel: Wohnfläche, Wohneinheiten oder Individualabrechnung nach Zählerstand.",
    colSpan: "col-span-1 lg:col-span-4",
    icon: Key,
    mock: (
      <div className="w-full h-full p-8 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Wohnfläche", value: "65%", icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Personen", value: "20%", icon: Calculator, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Einheiten", value: "10%", icon: CheckCircle2, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Sonstiges", value: "5%", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" }
          ].map((item, i) => (
            <m.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-2xl bg-background/50 border border-border/50 backdrop-blur-sm group-hover:translate-y-[-2px] transition-transform"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", item.bg, item.color)}>
                <item.icon size={16} />
              </div>
              <div className="text-xs text-muted-foreground font-medium">{item.label}</div>
              <div className="text-lg font-bold">{item.value}</div>
            </m.div>
          ))}
        </div>
      </div>
    )
  },
  {
    title: "Vorauszahlungen",
    subtitle: "Soll vs. Ist",
    description: "Automatischer Abgleich der monatlichen Abschlagszahlungen. Offene Posten auf einen Blick erkennen.",
    colSpan: "col-span-1 lg:col-span-2",
    icon: RefreshCw,
    mock: (
      <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64" cy="64" r="58"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-secondary"
            />
            <m.circle
              cx="64" cy="64" r="58"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="364"
              initial={{ strokeDashoffset: 364 }}
              whileInView={{ strokeDashoffset: 364 * 0.15 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">85%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bezahlt</span>
          </div>
        </div>
        <div className="w-full space-y-2">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <m.div
              initial={{ width: 0 }}
              whileInView={{ width: "85%" }}
              className="h-full bg-primary"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>ERHALTEN: 12.450 €</span>
            <span>OFFEN: 1.200 €</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Zeiträume",
    subtitle: "Maximale Flexibilität",
    description: "Individuelle Abrechnungszeiträume je Kostenart. Ideal für unterjährige Mieterwechsel und Zählerablesungen.",
    colSpan: "col-span-1 lg:col-span-2",
    icon: CalendarDays,
    mock: (
      <div className="w-full h-full p-6 flex flex-col gap-3 justify-center">
        {[
          { label: "Allgemeinstrom", dates: "01.01. - 31.12.", active: true },
          { label: "Wasser & Abwasser", dates: "01.03. - 28.02.", active: false },
          { label: "Heizkosten", dates: "01.10. - 30.09.", active: true }
        ].map((period, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
            <div className={cn("w-2 h-2 rounded-full", period.active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{period.label}</div>
              <div className="text-[10px] text-muted-foreground">{period.dates}</div>
            </div>
            <ArrowUpRight size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Belegmanagement",
    subtitle: "Digital & Rechtssicher",
    description: "Laden Sie Belege wie Schornsteinfeger-Rechnungen oder Wartungsprotokolle direkt hoch und verknüpfen Sie diese.",
    colSpan: "col-span-1 lg:col-span-4",
    icon: FileText,
    mock: (
      <div className="w-full h-full p-8 flex items-center justify-center">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-background border border-border shadow-sm group-hover:translate-x-2 transition-transform duration-500">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Rechnung_Heizung.pdf</div>
                <div className="text-xs text-muted-foreground italic">Identifiziert: 450,00 €</div>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-background border border-border shadow-sm group-hover:translate-x-2 transition-transform duration-500 delay-100 italic opacity-60">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <FileJson size={20} />
              </div>
              <div className="flex-1 min-w-0 text-sm">Versicherung_2024.pdf...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }
]

export default function NebenkostenBento() {
  return (
    <section id="nebenkosten" className="py-24 sm:py-32 px-4 bg-background overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center w-full max-w-3xl mx-auto mb-16 sm:mb-24">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm mb-6"
          >
            <Calculator className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">Abrechnung</span>
          </m.div>

          <m.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
          >
            Herausforderungen gelöst
          </m.h2>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            Konzentrieren Sie sich auf das Wesentliche. Wir erledigen die Mathematik
            und sorgen für rechtssichere Nebenkostenabrechnungen.
          </m.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {nkFeatures.map((feature, index) => (
            <m.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "group relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500",
                feature.colSpan
              )}
            >
              {/* Card Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />

              <div className="relative h-full flex flex-col">
                {/* Image/Mock Area */}
                <div className="relative h-[240px] mt-6 mx-6 overflow-hidden bg-black/5 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                  <div className="w-full h-full transform transition-transform duration-700 group-hover:scale-105">
                    {feature.mock}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-8 md:p-10 flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <feature.icon size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">
                      {feature.subtitle}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
