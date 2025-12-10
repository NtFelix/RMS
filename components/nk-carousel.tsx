"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, RefreshCw, Gauge, FileText, Folder } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const features = [
  {
    icon: Key,
    title: 'Verteilerschlüssel im Griff',
    description: 'Wählen Sie je Kostenart passende Schlüssel (z. B. Wohnfläche, Einheiten & nach Rechnung)'
  },
  {
    icon: RefreshCw,
    title: 'Vorauszahlungen berücksichtigen',
    description: 'Soll/Ist‑Abgleich pro Mietverhältnis – offene Posten erkennen, Nachzahlungen minimieren.'
  },
  {
    icon: Gauge,
    title: 'Abrechnungszeiträume flexibel festlegen',
    description: 'Definieren Sie individuelle Abrechnungszeiträume je Kostenart.'
  },
  {
    icon: FileText,
    title: 'Dokumentenverwaltung',
    description: 'Laden Sie Belege hoch und verknüpfen Sie diese mit den jeweiligen Kosten.'
  },
  {
    icon: Folder,
    title: 'Übersichtliche Ablage',
    description: 'Alle Unterlagen und Berechnungen an einem zentralen Ort.'
  },
]

export function NKCarousel() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="py-4">
          {features.map((feature, index) => (
            <CarouselItem key={feature.title} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-2 h-full">
                <Card className="h-full p-6 hover:shadow-md transition-shadow rounded-3xl">
                  <CardHeader className="p-0 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-8 flex justify-center gap-4">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  )
}
