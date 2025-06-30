"use client"

import { motion } from "framer-motion"
import { Palette, Layers, Zap, Shield, Globe, Smartphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card" // Corrected import path
import { Button } from "@/components/ui/button" // Corrected import path

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
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground)/0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    ),
    grid: (
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--muted-foreground)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground)/0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    ),
    waves: (
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50 V100 H0 Z" fill="hsl(var(--muted-foreground)/0.3)" />
        </svg>
      </div>
    ),
    hexagon: (
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div
          className="w-full h-full"
          style={{
            // Updated to use CSS variable for color. Encoding might be tricky with HSL values directly in URL.
            // Consider using a data URL with base64 encoded SVG or a simpler approach if issues arise.
            // For now, assuming direct HSL usage in SVG might work or a fallback color can be set.
            // Using a placeholder color string that can be replaced if needed.
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='hsl(var(--muted-foreground))' fillOpacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
    ),
    circles: (
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, hsl(var(--muted-foreground)/0.3) 2px, transparent 2px), radial-gradient(circle at 25% 75%, hsl(var(--muted-foreground)/0.2) 1px, transparent 1px)",
            backgroundSize: "30px 30px, 15px 15px",
          }}
        />
      </div>
    ),
    diagonal: (
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--muted-foreground)/0.3) 10px, hsl(var(--muted-foreground)/0.3) 11px)",
          }}
        />
      </div>
    ),
  }

  return patterns[pattern as keyof typeof patterns] || patterns.dots
}

export default function Features() {
  return (
    <section className="py-32 px-4 relative bg-background text-foreground">
      {/* Section Background Pattern - Adjusted for theme */}
      <div className="absolute inset-0 opacity-5 dark:opacity-3">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(30deg, transparent 40%, hsl(var(--primary)/0.05) 50%, transparent 60%),
                           linear-gradient(-30deg, transparent 40%, hsl(var(--secondary)/0.05) 50%, transparent 60%)`,
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
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
              <Card className="bg-card/80 border-border backdrop-blur-sm hover:bg-gray-100 transition-all duration-300 h-full relative overflow-hidden">
                <PatternBackground pattern={feature.pattern} />
                <CardContent className="p-8 relative z-10">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground mb-4 group-hover:text-accent-foreground transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  <Button
                    variant="outline"
                    className="mt-6 group-hover:border-primary group-hover:text-primary transition-colors"
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
