"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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
    <section className="py-32 px-4 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-slate-950 to-zinc-950" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(148, 163, 184, 0.3) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, rgba(113, 113, 122, 0.3) 0%, transparent 50%),
                             radial-gradient(circle at 40% 40%, rgba(148, 163, 184, 0.2) 0%, transparent 50%)`,
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
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-zinc-400 bg-clip-text text-transparent">
            Client Success Stories
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
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
              className="group"
            >
              <Card className="bg-zinc-900/60 border border-transparent backdrop-blur-sm hover:border-primary/70 transition-all duration-300 h-full relative overflow-hidden">
                {/* Card Pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                  <Quote className="w-full h-full text-slate-400" />
                </div>

                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  <blockquote className="text-slate-300 text-lg leading-relaxed mb-8 italic">
                    "{testimonial.content}"
                  </blockquote>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-slate-400 text-sm">{testimonial.role}</div>
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
