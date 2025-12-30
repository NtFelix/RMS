"use client"

import { motion } from "framer-motion"
import {
  Sparkles, ListTodo, FileText, Download, ShieldCheck,
  FolderOpen, FileSpreadsheet, History, CheckCircle2, Server
} from "lucide-react"
import Image from "next/image"

interface Feature {
  title: string;
  subtitle?: string;
  description: string;
  colSpan: string;
  icon: React.ElementType;
  mock: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Aufgaben & Fristen",
    subtitle: "Nichts vergessen",
    description: "Automatische Erinnerungen an Wartungen, Vertragsverlängerungen und wichtige Termine.",
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

        {/* Floating Bell */}
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <History className="w-4 h-4" />
        </div>
      </div>
    )
  },
  {
    title: "Digitales Archiv",
    subtitle: "Alles Griffbereit",
    description: "Speichern Sie Mietverträge, Rechnungen und Übergabeprotokolle sicher und zentral ab.",
    colSpan: "col-span-1 lg:col-span-4",
    icon: FolderOpen,
    mock: (
      <div className="w-full h-full p-8 flex items-center gap-6 select-none overflow-hidden">
        {/* Folder Structure Visualization */}
        <div className="w-1/3 h-full flex flex-col gap-2 border-r border-border/10 pr-4 opacity-50">
          <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium p-2 rounded-lg bg-white/5"><FolderOpen size={14} /> Dokumente</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 pl-6"><FolderOpen size={14} /> Verträge</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 pl-6"><FolderOpen size={14} /> Rechnungen</div>
        </div>

        {/* File List */}
        <div className="flex-1 flex flex-col gap-3">
          {[
            { name: "Mietvertrag_Müller.pdf", type: "PDF", size: "2.4 MB", color: "text-red-500", bg: "bg-red-500/10" },
            { name: "Zählerstände_2023.xlsx", type: "XLS", size: "1.1 MB", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { name: "Übergabeprotokoll.pdf", type: "PDF", size: "3.2 MB", color: "text-red-500", bg: "bg-red-500/10" },
          ].map((file, i) => (
            <div key={file.name} className="flex items-center gap-4 p-3 rounded-xl bg-background/40 border border-border/40 hover:bg-background/60 transition-colors group/file cursor-default">
              <div className={`w-10 h-10 rounded-lg ${file.bg} flex items-center justify-center ${file.color} shrink-0`}>
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">{file.size} • {file.type}</div>
              </div>
              <div className="opacity-0 group-hover/file:opacity-100 transition-opacity">
                <Download size={16} className="text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    title: "Berichte & Exporte",
    subtitle: "CSV & PDF",
    description: "Erstellen Sie professionelle Auswertungen für Banken, Steuerberater oder Ihre eigenen Unterlagen.",
    colSpan: "col-span-1 lg:col-span-3",
    icon: FileSpreadsheet,
    mock: (
      <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-6 select-none">
        <div className="flex gap-4">
          <div className="group/export relative cursor-pointer">
            <div className="w-20 h-24 bg-background border border-border rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <FileText size={16} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">PDF</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md opacity-0 group-hover/export:opacity-100 transition-all scale-50 group-hover/export:scale-100">
              <CheckCircle2 size={12} />
            </div>
          </div>

          <div className="group/export relative cursor-pointer">
            <div className="w-20 h-24 bg-background border border-border rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform duration-300 delay-75">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <FileSpreadsheet size={16} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">CSV</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md opacity-0 group-hover/export:opacity-100 transition-all scale-50 group-hover/export:scale-100">
              <CheckCircle2 size={12} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-sm font-medium">Export bereit</div>
          <div className="text-xs text-muted-foreground">Alle Daten erfolgreich aufbereitet</div>
        </div>
      </div>
    )
  },
  {
    title: "Sicherheit & Backups",
    subtitle: "Serverstandort DE",
    description: "Hosting in Frankfurt. Tägliche Backups, SSL-Verschlüsselung und strikte Zugriffskontrollen.",
    colSpan: "col-span-1 lg:col-span-3",
    icon: ShieldCheck,
    mock: (
      <div className="w-full h-full p-6 flex flex-col items-center justify-center select-none">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 bg-background/50 backdrop-blur-md border border-primary/20 rounded-2xl flex items-center justify-center shadow-xl">
            <Server className="w-10 h-10 text-primary" />
          </div>
          {/* Floating Badges */}
          <div className="absolute -top-3 -right-8 px-3 py-1 bg-background border border-border shadow-sm rounded-full text-[10px] font-bold text-foreground flex items-center gap-1 group-hover:translate-x-1 transition-transform whitespace-nowrap">
            <CheckCircle2 size={10} className="text-emerald-500" /> Frankfurt (EU)
          </div>
          <div className="absolute -bottom-3 -left-8 px-3 py-1 bg-background border border-border shadow-sm rounded-full text-[10px] font-bold text-foreground flex items-center gap-1 group-hover:-translate-x-1 transition-transform whitespace-nowrap">
            <CheckCircle2 size={10} className="text-emerald-500" /> AES-256 / SSL
          </div>
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
              <span className="text-sm font-medium text-primary">Mehr Features</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              Tools für Profis
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground leading-relaxed"
            >
              Über die reinen Verwaltungsfunktionen hinaus bietet Mietevo Ihnen Werkzeuge,
              <br className="hidden sm:inline" />
              die Ihren Arbeitsalltag spürbar erleichtern.
            </motion.p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
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
