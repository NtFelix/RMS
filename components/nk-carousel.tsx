"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, RefreshCw, Gauge, FileText, Folder, Bell } from "lucide-react"
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
  {
    icon: Bell,
    title: 'Benachrichtigungen',
    description: 'Erhalten Sie Erinnerungen für anstehende Abrechnungen.'
  }
]

export function NKCarousel() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {features.map((feature, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
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
