"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <style jsx>{`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(148, 163, 184, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(113, 113, 122, 0.1) 0%, transparent 50%),
                           linear-gradient(45deg, transparent 40%, rgba(148, 163, 184, 0.05) 50%, transparent 60%)`,
          }}
        />
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-4 h-4 bg-slate-400 rounded-full"
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
        className="absolute top-40 right-32 w-6 h-6 border-2 border-zinc-400 rotate-45"
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
        className="absolute bottom-32 left-32 w-8 h-8 bg-gradient-to-r from-slate-500 to-zinc-500 rounded-full"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Introducing the Future</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-zinc-400 bg-clip-text text-transparent leading-tight"
        >
          Design Beyond
          <br />
          <span className="bg-gradient-to-r from-slate-400 via-zinc-300 to-slate-500 bg-clip-text text-transparent">
            Imagination
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Crafting exceptional digital experiences with cutting-edge technology and innovative design patterns that
          captivate and inspire.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {/* Simplified "Get Started" Button */}
          <Button
            size="lg"
            variant="default" // Using the default variant from button.tsx
            className="px-8 py-4 text-lg font-semibold group" // Removed specific bg, hover, border, overflow classes
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
          {/* Simplified "Watch Demo" Button */}
          <Button
            size="lg"
            variant="outline"
            // className="border-slate-600 text-black hover:bg-slate-800 hover:text-white px-8 py-4 text-lg font-semibold group"
            // The line above is simplified by using the variant from button.tsx
            // hover:bg-accent hover:text-accent-foreground will be applied from buttonVariants
            // border-input will be applied from buttonVariants
            // text-foreground will be applied from buttonVariants (or primary if not specified for outline)
            // For dark theme, text-foreground is light, bg-background is dark. border-input is likely a mid-gray.
            // hover:bg-accent (dark theme accent is 0 0% 14.9% - a lighter gray)
            // hover:text-accent-foreground (dark theme accent-foreground is 0 0% 98% - white)
            // This should align with the main app's subtle hover for outline buttons.
            className="px-8 py-4 text-lg font-semibold group"
          >
            <Zap className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" /> {/* Retaining icon animation for now, can remove if too much */}
            Watch Demo
          </Button>
        </motion.div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  )
}
