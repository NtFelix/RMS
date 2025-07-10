"use client"

import { motion } from "framer-motion"
import { Home, Building2, Banknote, Wrench } from "lucide-react"
import { Button } from '@/components/ui/button' // Corrected import path

const services = [
  {
    icon: Home,
    title: "Wohnungsverwaltung",
    description: "Umfassende Verwaltungsdienstleistungen für Wohnimmobilien, einschließlich Mieterprüfung, Mietvertragsverwaltung und Mieteintreibung.",
    features: ["Mieterprüfung", "Mietvertragsverwaltung", "Mieteintreibung", "Eigentümerportal"],
  },
  {
    icon: Building2,
    title: "Gewerbeverwaltung",
    description: "Spezialisierte Verwaltung für Gewerbeimmobilien mit Fokus auf Maximierung der Auslastung und Mieterzufriedenheit.",
    features: ["Mietvertragsverhandlung", "Mieterbeziehungen", "Gebäudemanagement", "Anbietermanagement"],
  },
  {
    icon: Banknote,
    title: "Finanzdienstleistungen",
    description: "Vollständige finanzielle Aufsicht über Ihre Immobilien, von der Budgetierung und Berichterstattung bis zur Kostenverwaltung.",
    features: ["Budgetierung & Prognose", "Kostenverfolgung", "Finanzberichterstattung", "Mietverarbeitung"],
  },
  {
    icon: Wrench,
    title: "Wartungskoordination",
    description: "Optimierte Koordination aller Wartungs- und Reparaturbedürfnisse, um Ihre Immobilien in Top-Zustand zu halten.",
    features: ["Arbeitsauftragsmanagement", "Anbieterdisposition", "Vorbeugende Wartung", "24/7 Notfallreaktion"],
  },
]

export default function Services() {
  return (
    <section className="py-32 px-4 relative bg-background text-foreground">
      {/* Geometric Background - Adjusted for theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-50 dark:opacity-30" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-secondary/10 to-primary/10 rounded-full blur-3xl opacity-50 dark:opacity-30" />

        {/* Pattern Overlay - Adjusted for theme */}
        <div className="absolute inset-0 opacity-5 dark:opacity-3">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, hsl(var(--muted-foreground)/0.1) 90deg, transparent 180deg, hsl(var(--muted-foreground)/0.05) 270deg, transparent 360deg)`,
              backgroundSize: "200px 200px",
            }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
            Immobilienverwaltungsdienste
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Wir bieten eine umfassende Palette von Dienstleistungen, um den Bedürfnissen von Immobilieneigentümern und Investoren gerecht zu werden.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-gradient-to-br from-card/70 to-accent/20 backdrop-blur-sm border border-border rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
                {/* Service Pattern - Adjusted for theme */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 dark:opacity-5">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage:
                        index % 2 === 0
                          ? "radial-gradient(circle, hsl(var(--muted-foreground)/0.5) 2px, transparent 2px)"
                          : "linear-gradient(45deg, hsl(var(--muted-foreground)/0.5) 25%, transparent 25%)",
                      backgroundSize: index % 2 === 0 ? "20px 20px" : "20px 20px",
                    }}
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <service.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-3xl font-bold text-card-foreground">{service.title}</h3>
                  </div>

                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{service.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-foreground/80">
                        <div className="w-2 h-2 bg-primary/70 rounded-full" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="group-hover:border-primary group-hover:text-primary transition-colors"
                  >
                    Mehr erfahren
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
