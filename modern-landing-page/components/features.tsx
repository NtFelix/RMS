"use client"

import { motion } from "framer-motion"
import { Palette, Layers, Zap, Shield, Globe, Smartphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Palette,
    title: "Advanced Design System",
    description: "Comprehensive design tokens and components for consistent, scalable interfaces.",
    pattern: "dots",
  },
  {
    icon: Layers,
    title: "Modular Architecture",
    description: "Flexible, component-based structure that adapts to any project requirement.",
    pattern: "grid",
  },
  {
    icon: Zap,
    title: "Lightning Performance",
    description: "Optimized for speed with advanced caching and minimal resource usage.",
    pattern: "waves",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security protocols protecting your data and user privacy.",
    pattern: "hexagon",
  },
  {
    icon: Globe,
    title: "Global Accessibility",
    description: "WCAG compliant design ensuring inclusive experiences for all users.",
    pattern: "circles",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Approach",
    description: "Responsive design that delivers exceptional experiences across all devices.",
    pattern: "diagonal",
  },
]

const PatternBackground = ({ pattern }: { pattern: string }) => {
  const patterns = {
    dots: (
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    ),
    grid: (
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    ),
    waves: (
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50 V100 H0 Z" fill="rgba(148, 163, 184, 0.3)" />
        </svg>
      </div>
    ),
    hexagon: (
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23${encodeURIComponent("94a3b8")}' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
    ),
    circles: (
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.3) 2px, transparent 2px), radial-gradient(circle at 25% 75%, rgba(113, 113, 122, 0.3) 1px, transparent 1px)",
            backgroundSize: "30px 30px, 15px 15px",
          }}
        />
      </div>
    ),
    diagonal: (
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(148, 163, 184, 0.3) 10px, rgba(148, 163, 184, 0.3) 11px)",
          }}
        />
      </div>
    ),
  }

  return patterns[pattern as keyof typeof patterns] || patterns.dots
}

export default function Features() {
  return (
    <section className="py-32 px-4 relative">
      {/* Section Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(30deg, transparent 40%, rgba(148, 163, 184, 0.1) 50%, transparent 60%),
                           linear-gradient(-30deg, transparent 40%, rgba(113, 113, 122, 0.1) 50%, transparent 60%)`,
            backgroundSize: "100px 100px",
          }}
        />
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
            Powerful Features
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Discover the advanced capabilities that make our platform the choice of industry leaders
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm hover:bg-slate-200/50 transition-all duration-300 h-full relative overflow-hidden">
                <PatternBackground pattern={feature.pattern} />
                <CardContent className="p-8 relative z-10">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-slate-200" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-slate-200 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-black hover:bg-slate-800 hover:text-white group-hover:border-slate-500 transition-colors"
                  >
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
