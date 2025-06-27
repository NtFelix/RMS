"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from '@/components/ui/button' // Corrected import path

interface CTAProps {
  onGetStarted: () => void;
}

export default function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="py-32 px-4 relative overflow-hidden bg-background text-foreground">
      {/* Animated Background - Adjusted for theme */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background" />

        {/* Animated Gradient Orbs - Adjusted for theme */}
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-70 dark:opacity-50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-l from-secondary/20 to-primary/20 rounded-full blur-3xl opacity-70 dark:opacity-50"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />

        {/* Pattern Overlay - Adjusted for theme */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, hsl(var(--muted-foreground)/0.2) 60deg, transparent 120deg)`,
              backgroundSize: "100px 100px",
            }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-sm mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Ready to Transform?</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight"
        >
          Let's Build Something
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
            Extraordinary
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed"
        >
          Join hundreds of forward-thinking companies who trust us to bring their vision to life with cutting-edge
          design and development.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            // className="bg-white text-zinc-900 hover:bg-slate-100 px-12 py-6 text-xl font-semibold group"
            // Using primary variant
            className="px-12 py-6 text-xl font-semibold group"
            onClick={onGetStarted}
          >
            Get Started with Property Management
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            // className="border-slate-600 text-black hover:bg-slate-800 hover:text-white px-12 py-6 text-xl font-semibold"
            // Uses standard outline which respects theme
            className="px-12 py-6 text-xl font-semibold text-foreground hover:text-accent-foreground"
          >
            Schedule Consultation
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
