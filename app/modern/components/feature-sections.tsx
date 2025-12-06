"use client"

import { motion } from "framer-motion"
import { CheckCircle, X, ZoomIn } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import Image from "next/image"

interface Feature {
  title: string;
  description: string;
  points: string[];
  image: string;
  imageDark?: string;
  image_alt: string;
}

const features: Feature[] = [
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
    image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/haus-page.avif",
    imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/haus-page-darkmode.avif",
    image_alt: "Screenshot der Haus- und Mieterverwaltung im RMS Dashboard",
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
    image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/nebenkosten-overview.avif",
    imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/nebenkosten-overview-darkmode.avif",
    image_alt: "Screenshot der Betriebskostenabrechnung und Nebenkostenübersicht",
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
    image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/finance-page.avif",
    imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/finance-page-darkmode.avif",
    image_alt: "Screenshot der Finanzübersicht mit Einnahmen und Ausgaben",
  },
]

export default function FeatureSections() {
  const [selectedImage, setSelectedImage] = useState<{
    src: string
    alt: string
    title: string
  } | null>(null)

  const openImagePreview = (image: string, alt: string, title: string) => {
    setSelectedImage({ src: image, alt, title })
  }

  const closeImagePreview = useCallback(() => {
    setSelectedImage(null)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeImagePreview()
      }
    }

    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedImage, closeImagePreview])

  return (
    <>
      <section className="py-40 px-4 bg-background text-foreground">
        <div className="max-w-7xl mx-auto space-y-40">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${index % 2 !== 0 ? "lg:flex-row-reverse" : ""
                }`}
            >
              {/* Image Section */}
              <div className="w-full md:w-1/2">
                {/* Light Mode Image (or default if no dark image) */}
                <div
                  className={`relative rounded-2xl overflow-hidden shadow-2xl group bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer ${feature.imageDark ? "dark:hidden" : ""}`}
                  onClick={() => openImagePreview(feature.image, feature.image_alt, feature.title)}
                >
                  <div className="relative w-full">
                    <Image
                      src={feature.image}
                      alt={feature.image_alt}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                      priority={index === 0}
                      unoptimized // Supabase images are stored as pre-optimized .avif
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Zoom Icon Overlay */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Dark Mode Image (only if provided) */}
                {feature.imageDark && (
                  <div
                    className="relative rounded-2xl overflow-hidden shadow-2xl group bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer hidden dark:block"
                    onClick={() => openImagePreview(feature.imageDark!, feature.image_alt, feature.title)}
                  >
                    <div className="relative w-full">
                      <Image
                        src={feature.imageDark!}
                        alt={feature.image_alt}
                        width={800}
                        height={600}
                        className="w-full h-auto object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                        priority={index === 0}
                        unoptimized // Supabase images are stored as pre-optimized .avif
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Zoom Icon Overlay */}
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
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

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeImagePreview}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="relative max-w-6xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeImagePreview}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-colors duration-200 z-10"
              aria-label="Schließen"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Image Title */}
            <div className="absolute -top-12 left-0 text-white text-lg font-semibold">
              {selectedImage.title}
            </div>

            {/* Image Container */}
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                width={1200}
                height={900}
                className="w-full h-auto object-contain max-h-[80vh]"
                priority
                unoptimized // Supabase images are stored as pre-optimized .avif
              />
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
