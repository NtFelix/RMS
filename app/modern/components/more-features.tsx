"use client"

import { m } from "framer-motion"
import { ClipboardList, TrendingUp, Euro } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const moreFeatures = [
  {
    icon: ClipboardList,
    title: "Aufgabenmanagement",
    description:
      "Organisieren und verfolgen Sie alle anfallenden Aufgaben. Weisen Sie Aufgaben zu und überwachen Sie den Fortschritt in Echtzeit.",
  },
  {
    icon: TrendingUp,
    title: "Vorauszahlungs-Tracking",
    description:
      "Behalten Sie die geleisteten Nebenkosten-Vorauszahlungen Ihrer Mieter immer im Blick und gleichen Sie diese automatisch mit den tatsächlichen Kosten ab.",
  },
  {
    icon: Euro,
    title: "Mietzahlungsübersicht",
    description:
      "Verfolgen Sie den Status von Mietzahlungen in Echtzeit. Sehen Sie auf einen Blick, welche Mieten bereits bezahlt wurden und welche noch ausstehen.",
  },
]

export default function MoreFeatures() {
  return (
    <section className="py-24 px-4 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
            Weitere Funktionen
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Entdecken Sie weitere leistungsstarke Werkzeuge, die Ihnen die Verwaltung erleichtern.
          </p>
        </m.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {moreFeatures.map((feature, index) => (
            <m.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="bg-card/80 border-border backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-primary/10 transition-all duration-300 h-full relative overflow-hidden rounded-3xl">
                <CardContent className="p-8 relative z-10">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground mb-4 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
