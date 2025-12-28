"use client"

import { motion } from "framer-motion"
import {
  CheckCircle, Sparkles, Layout, Calendar, BarChart3, ListTodo,
  Building2, Users, Receipt, Coins, ArrowUpRight, Wallet, PieChart
} from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import Image from "next/image"

interface Feature {
  title: string;
  subtitle?: string;
  description: string;
  colSpan: string;
  icon?: any;
  mock: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Zentrale Verwaltung",
    subtitle: "Alles im Blick",
    description: "Verwalten Sie alle Immobilien und Mieter an einem zentralen Ort. Stammdaten, Verträge und Dokumente - alles griffbereit.",
    colSpan: "col-span-1 lg:col-span-3",
    icon: Layout,
    mock: (
      <div className="w-full h-full p-6 flex flex-col gap-3 select-none overflow-hidden mask-fade-bottom">
        <div className="flex items-center justify-between px-2 mb-2 opacity-50">
          <div className="h-2 w-20 bg-foreground/20 rounded-full" />
          <div className="h-2 w-8 bg-foreground/20 rounded-full" />
        </div>
        {/* Item 1 */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm group-hover:translate-x-1 transition-transform duration-500">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Building2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Bahnhofstraße 12</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={10} /> 8 Einheiten
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        {/* Item 2 */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm group-hover:translate-x-1 transition-transform duration-500 delay-75">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Objekt Nordend</div>
            <div className="text-xs text-muted-foreground">Voll vermietet</div>
          </div>
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        {/* Item 3 */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm group-hover:translate-x-1 transition-transform duration-500 delay-150 opacity-60">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Building2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Gewerbepark West</div>
            <div className="text-xs text-muted-foreground">Wartung ausstehend</div>
          </div>
          <div className="h-2 w-2 rounded-full bg-amber-500" />
        </div>
      </div>
    )
  },
  {
    title: "Betriebskosten",
    subtitle: "In wenigen Klicks",
    description: "Erstellen Sie präzise Abrechnungen. Automatische Berechnung nach Verteilerschlüsseln und PDF-Export.",
    colSpan: "col-span-1 lg:col-span-3",
    icon: Calendar,
    mock: (
      <div className="w-full h-full p-6 flex flex-col gap-4 select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt size={16} className="text-primary" />
            </div>
            <div className="text-sm font-semibold">Abrechnung 2024</div>
          </div>
          <div className="text-xs font-mono bg-secondary px-2 py-1 rounded">DRAFT</div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm group-hover:translate-x-1 transition-transform duration-300">
            <span className="text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Heizkosten
            </span>
            <span className="font-medium">4.250,00 €</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "75%" }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-red-400/80 rounded-full"
            />
          </div>

          <div className="flex justify-between items-center text-sm group-hover:translate-x-1 transition-transform duration-300 delay-75">
            <span className="text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Wasserversorgung
            </span>
            <span className="font-medium">1.820,50 €</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "45%" }}
              transition={{ duration: 1, delay: 0.7 }}
              className="h-full bg-blue-400/80 rounded-full"
            />
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Finanzübersicht",
    subtitle: "Echtzeit-Tracking",
    description: "Verfolgen Sie Einnahmen und Ausgaben. Analysieren Sie die Performance Ihrer Objekte.",
    colSpan: "col-span-1 lg:col-span-4",
    icon: BarChart3,
    mock: (
      <div className="w-full h-full p-8 flex flex-col justify-end">
        <div className="flex justify-between items-end gap-2 mb-6 text-sm">
          <div>
            <div className="text-muted-foreground text-xs mb-1">Gesamteinnahmen</div>
            <div className="text-2xl font-bold flex items-center gap-1">
              24.5k <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1 text-emerald-500">
              <Wallet size={16} />
            </div>
          </div>
        </div>
        {/* Chart Bars */}
        <div className="flex items-end justify-between h-40 gap-3">
          {[45, 60, 75, 50, 80, 95, 85].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group/bar h-full">
              <motion.div
                initial={{ height: "0%" }}
                whileInView={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`w-full rounded-t-lg bg-primary/20 group-hover/bar:bg-primary/40 transition-colors relative`}
              >
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap border shadow-sm z-10">
                  {height * 100} €
                </div>
              </motion.div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
          <span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span>
        </div>
      </div>
    )
  },
  {
    title: "Aufgaben",
    subtitle: "Smarte Organisation",
    description: "Behalten Sie den Überblick über anstehende Aufgaben, Termine und Wartungen.",
    colSpan: "col-span-1 lg:col-span-2",
    icon: ListTodo,
    mock: (
      <div className="w-full h-full p-6 flex flex-col gap-3 select-none">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm group-hover:translate-x-1 transition-transform duration-500">
          <div className="w-5 h-5 rounded-full border-2 border-primary/60 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-2 w-24 bg-foreground/20 rounded-full mb-1.5" />
            <div className="h-1.5 w-16 bg-foreground/10 rounded-full" />
          </div>
          <div className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-md shrink-0">
            Heute
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm opacity-80 group-hover:translate-x-1 transition-transform duration-500 delay-75">
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-2 w-20 bg-foreground/20 rounded-full mb-1.5" />
            <div className="h-1.5 w-12 bg-foreground/10 rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm opacity-60 group-hover:translate-x-1 transition-transform duration-500 delay-150">
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-2 w-28 bg-foreground/20 rounded-full" />
          </div>
        </div>

        <div className="absolute bottom-5 right-5 w-10 h-10 bg-primary rounded-full shadow-lg flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform duration-300">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>
    )
  },
]

export default function FeatureSections() {
  return (
    <>
      <section className="py-24 sm:py-32 px-4 bg-background text-foreground overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center w-full max-w-3xl mx-auto mb-16 sm:mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-sm mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Features</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              Alles an einem Ort
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground leading-relaxed"
            >
              Vergessen Sie komplexe Excel-Tabellen.
              <br className="hidden sm:inline" />
              Verwalten Sie Ihre Immobilien professionell, einfach und effizient.
            </motion.p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative rounded-3xl overflow-hidden bg-white/5 border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500 ${feature.colSpan}`}
              >
                {/* Card Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 group-hover:to-primary/10 transition-colors duration-500" />

                <div className="relative h-full flex flex-col">
                  {/* Card Header Content */}
                  <div className="p-6 md:p-8 flex flex-col gap-2 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Mock UI Container */}
                  <div className="flex-1 relative min-h-[220px] mt-2 overflow-hidden bg-black/5 dark:bg-black/20 mx-6 mb-6 rounded-2xl border border-black/5 dark:border-white/5">
                    {/* The Mock Component */}
                    <div className="w-full h-full transform transition-transform duration-500 group-hover:scale-[1.02]">
                      {feature.mock}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
