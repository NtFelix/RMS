"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button" // Corrected import path
import Link from "next/link"

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

      <div className="relative z-10 text-center max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Mühelose Immobilienverwaltung</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight"
        >
          Optimieren Sie Ihre
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
            Immobilien
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Verwalten Sie Ihre Immobilien mit unserem umfassenden Immobilienverwaltungssystem. Verfolgen Sie Finanzen, verwalten Sie Mieter und organisieren Sie Aufgaben – alles an einem Ort.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            onClick={onGetStarted}
            // className="relative bg-gradient-to-r from-zinc-800 to-slate-800 text-white hover:from-zinc-700 hover:to-slate-700 px-8 py-4 text-lg font-semibold group overflow-hidden border-0"
            // Using primary button variant and adjusting animation to use theme colors
            className="relative bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 text-lg font-semibold group overflow-hidden"
          >
            {/* Animated border gradient - Using primary and secondary theme colors */}
            <div className="absolute inset-0 rounded-md p-[2px] bg-gradient-to-r from-primary via-secondary to-primary animate-pulse">
              <div className="absolute inset-[2px] bg-primary rounded-md group-hover:bg-primary/90 transition-all duration-300" />
            </div>

            {/* Moving gradient overlay - Using foreground with opacity */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

            {/* Animated border that flows like water */}
            <div className="absolute inset-0 rounded-md overflow-hidden">
              {/* Primary rotating gradient border - Using theme colors */}
              <div
                className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)), hsl(var(--secondary)))",
                  animation: "spin 2s linear infinite",
                }}
              />

              {/* Secondary counter-rotating gradient - Using theme colors */}
              <div
                className="absolute inset-[1px] rounded-md opacity-0 group-hover:opacity-80 transition-opacity duration-700 delay-200"
                style={{
                  background:
                    "conic-gradient(from 180deg, hsl(var(--secondary)), hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))",
                  animation: "spin 3s linear infinite reverse",
                }}
              />

              {/* Pulsing inner glow - Using primary and background */}
              <div className="absolute inset-[2px] rounded-md bg-primary group-hover:bg-primary/90 transition-all duration-300" />

              {/* Flowing particles effect - Using primary/secondary foreground */}

            </div>

            <span className="relative z-10 flex items-center">
              Jetzt loslegen
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          <Link href="/modern/documentation">
            <Button
              size="lg"
              variant="outline"
              // className="border-slate-600 text-black hover:bg-slate-800 hover:text-white px-8 py-4 text-lg font-semibold group"
              // Uses standard outline variant which respects theme. Added explicit text color for better contrast in some themes if needed.
              className="px-8 py-4 text-lg font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
            >
              <Zap className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              Mehr erfahren
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Bottom Gradient - Adjusted for theme */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
