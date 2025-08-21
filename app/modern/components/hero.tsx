"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { CallToAction } from "./call-to-action"

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background text-foreground">
      <style jsx>{`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>
      {/* Animated Background Pattern - Adjusted for theme */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-background" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary-foreground)/0.05) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, hsl(var(--secondary-foreground)/0.05) 0%, transparent 50%),
                           linear-gradient(45deg, transparent 40%, hsl(var(--muted-foreground)/0.03) 50%, transparent 60%)`,
          }}
        />
      </div>

      {/* Floating Elements - Adjusted for theme */}
      <motion.div
        className="absolute top-20 left-20 w-4 h-4 bg-primary/50 rounded-full"
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-40 right-32 w-6 h-6 border-2 border-secondary/50 rotate-45"
        animate={{
          rotate: [45, 225, 45],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-32 left-32 w-8 h-8 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full"
        animate={{
          x: [0, 30, 0],
          y: [0, -15, 0],
        }}
        transition={{
          duration: 5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline and CTA */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Vereinfachen Sie Ihre Nebenkostenabrechnung</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight tracking-tight"
            >
              <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                Nebenkostenabrechnung in 5 Minuten
              </span>
              <br />
              <span className="text-foreground/80">
                — statt Stunden mit Excel
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-xl leading-relaxed"
            >
              Erstellen Sie mühelos korrekte und transparente Nebenkostenabrechnungen. Sparen Sie Zeit und vermeiden Sie Fehler mit unserer benutzerfreundlichen Lösung für Vermieter und Immobilienverwalter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <CallToAction variant="hero" onGetStarted={onGetStarted} />
            </motion.div>
          </div>

          {/* Right: Product mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl rounded-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Window top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="ml-3 text-sm text-muted-foreground truncate">Demo: Abrechnung erstellen</div>
                </div>

                {/* Mock content */}
                <div className="p-4 sm:p-6">
                  <div className="rounded-full bg-muted/70 flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
                    <div className="w-4 h-4 rounded-full bg-primary/60" />
                    <span className="truncate">Dashboard-Beispiel der Nebenkostenabrechnung</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">So sieht eine Abrechnungsvorschau aus. In der Demo siehst du jeden Schritt bis zum PDF.</p>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="h-24 rounded-md bg-accent/40" />
                    <div className="h-24 rounded-md bg-accent/40" />
                    <div className="h-24 rounded-md bg-accent/40" />
                  </div>

                  <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
                    <div className="h-40 rounded-md bg-muted/60" />
                    <div className="mt-3 h-2 w-2/3 rounded bg-muted/60" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-muted/50" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient - Adjusted for theme */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}

