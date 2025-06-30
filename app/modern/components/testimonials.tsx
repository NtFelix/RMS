"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from '@/components/ui/card' // Corrected import path

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechFlow",
    content:
      "The attention to detail and innovative approach exceeded our expectations. Our conversion rate increased by 340% within the first month.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
  {
    name: "Marcus Rodriguez",
    role: "CTO, InnovateLab",
    content:
      "Exceptional technical expertise combined with creative vision. The team delivered a solution that perfectly aligned with our complex requirements.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
  {
    name: "Emily Watson",
    role: "Founder, DesignCo",
    content:
      "Working with this team was transformative. They didn't just build our platform—they elevated our entire brand experience.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
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
            Client Success Stories
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover how we've helped businesses transform their digital presence
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
