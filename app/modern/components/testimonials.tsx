"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from '@/components/ui/card' // Corrected import path

const testimonials = [
  {
    name: "Max Mustermann",
    role: "Immobilieneigentümer",
    content:
      "Seit ich diese Plattform nutze, ist die Verwaltung meiner Immobilien ein Kinderspiel. Die Funktionen zur Finanzverfolgung und Mieterverwaltung sind unglaublich leistungsstark.",
    rating: 5,
    avatar: "/placeholder-user.jpg",
  },
  {
    name: "Erika Mustermann",
    role: "Mieterin",
    content:
      "Die Kommunikationszentrale macht es so einfach, mit meinem Hausverwalter in Kontakt zu treten. Wartungsanfragen werden schnell und effizient bearbeitet.",
    rating: 5,
    avatar: "/placeholder-user.jpg",
  },
  {
    name: "Peter Müller",
    role: "Hausverwalter",
    content:
      "Diese All-in-One-Lösung hat unsere Abläufe optimiert und uns unzählige Stunden gespart. Die Berichts- und Analysefunktionen sind ein entscheidender Vorteil.",
    rating: 5,
    avatar: "/placeholder-user.jpg",
  },
]

export default function Testimonials() {
  return (
    <section className="py-32 px-4 relative bg-background text-foreground">
      {/* Background Pattern - Adjusted for theme */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute inset-0 opacity-10 dark:opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, hsl(var(--primary)/0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, hsl(var(--secondary)/0.1) 0%, transparent 50%),
                             radial-gradient(circle at 40% 40%, hsl(var(--muted)/0.05) 0%, transparent 50%)`,
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
            Was unsere Kunden sagen
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Hören Sie von Immobilieneigentümern, Mietern und Verwaltern, die unserer Plattform vertrauen.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <Card className="bg-card/80 border-border backdrop-blur-sm hover:bg-gray-100 transition-all duration-300 h-full relative overflow-hidden">
                {/* Card Pattern - Adjusted for theme */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5 dark:opacity-3">
                  <Quote className="w-full h-full text-muted-foreground" />
                </div>

                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      // Using a theme-appropriate color for stars, e.g., primary or a specific accent
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>

                  <blockquote className="text-foreground/90 text-lg leading-relaxed mb-8 italic">
                    "{testimonial.content}"
                  </blockquote>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold text-lg">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-card-foreground">{testimonial.name}</div>
                      <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
