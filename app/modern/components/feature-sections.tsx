"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { CheckCircle } from "lucide-react"

const features = [
  {
    title: "Zentrale Haus- & Mieterverwaltung",
    description:
      "Verwalten Sie alle Ihre Immobilien und die zugehörigen Mieter an einem zentralen Ort. Behalten Sie den Überblick über Stammdaten, Mietverträge und wichtige Dokumente, um Ihre Verwaltungsprozesse zu vereinfachen.",
    points: [
      "Alle Immobiliendaten an einem Ort",
      "Mietverträge und Kontaktdaten griffbereit",
      "Einfache Zuweisung von Mietern zu Objekten",
      "Historie aller Aktivitäten pro Mieter",
    ],
    image: "/placeholder.jpg",
    image_alt: "Screenshot of Property and Tenant Management",
  },
  {
    title: "Detaillierte Betriebskostenabrechnung",
    description:
      "Erstellen Sie präzise und nachvollziehbare Betriebskostenabrechnungen mit nur wenigen Klicks. Unser System führt Sie durch den gesamten Prozess, von der Erfassung der Kosten bis zum fertigen Dokument.",
    points: [
      "Automatische Berechnung nach Verteilerschlüsseln",
      "Berücksichtigung von Vorauszahlungen",
      "PDF-Export für Mieter und Eigentümer",
      "Rechtssichere und transparente Darstellung",
    ],
    image: "/placeholder.jpg",
    image_alt: "Screenshot of Operating Cost Statement Generation",
  },
  {
    title: "Umfassende Finanzübersicht",
    description:
      "Erhalten Sie einen klaren Einblick in die finanzielle Gesundheit Ihrer Immobilien. Verfolgen Sie Einnahmen, Ausgaben und analysieren Sie die Performance Ihrer Objekte in Echtzeit.",
    points: [
      "Einnahmen- und Ausgaben-Tracking",
      "Übersicht über Mieteingänge und offene Posten",
      "Detaillierte Finanzberichte und Exporte",
      "Transparente Nachverfolgung aller Transaktionen",
    ],
    image: "/placeholder.jpg",
    image_alt: "Screenshot of Financial Overview",
  },
]

export default function FeatureSections() {
  return (
    <section className="py-40 px-4 bg-background text-foreground">
      <div className="max-w-7xl mx-auto space-y-40">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className={`flex flex-col lg:flex-row items-center gap-12 ${
              index % 2 !== 0 ? "lg:flex-row-reverse" : ""
            }`}
          >
            {/* Image Section */}
            <div className="w-full md:w-1/2">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl group">
                <Image
                  src={feature.image}
                  alt={feature.image_alt}
                  layout="fill"
                  objectFit="cover"
                                      className="mt-6 group-hover:border-primary group-hover:text-primary transition-colors hover:bg-gray-800 hover:text-white duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>

            {/* Text Section */}
            <div className="w-full md:w-1/2">
              <h3 className="text-4xl font-bold mb-4 text-foreground">
                {feature.title}
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                {feature.description}
              </p>
              <ul className="space-y-3">
                {feature.points.map((point, pIndex) => (
                  <li key={pIndex} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-foreground/90">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
