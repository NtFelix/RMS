"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
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
            <span className="text-sm text-slate-300">Welcome to RMS</span>
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
          Manage your properties with our comprehensive real estate management system. Track finances, manage tenants, and organize tasks all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            className="relative bg-gradient-to-r from-zinc-800 to-slate-800 text-white hover:from-zinc-700 hover:to-slate-700 px-8 py-4 text-lg font-semibold group overflow-hidden border-0"
          >
            {/* Animated water-like border gradient */}
            <div className="absolute inset-0 rounded-md p-[2px] bg-gradient-to-r from-slate-400 via-zinc-300 to-slate-500 animate-pulse">
              <div className="absolute inset-[2px] bg-gradient-to-r from-zinc-800 to-slate-800 rounded-md group-hover:from-zinc-700 group-hover:to-slate-700 transition-all duration-300" />
            </div>

            {/* Moving gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

            {/* Animated border that flows like water */}
            <div className="absolute inset-0 rounded-md overflow-hidden">
              {/* Primary rotating gradient border */}
              <div
                className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(148, 163, 184, 0.9), rgba(113, 113, 122, 0.9), rgba(148, 163, 184, 0.9), rgba(113, 113, 122, 0.9))",
                  animation: "spin 2s linear infinite",
                }}
              />

              {/* Secondary counter-rotating gradient */}
              <div
                className="absolute inset-[1px] rounded-md opacity-0 group-hover:opacity-80 transition-opacity duration-700 delay-200"
                style={{
                  background:
                    "conic-gradient(from 180deg, rgba(113, 113, 122, 0.7), rgba(148, 163, 184, 0.7), rgba(113, 113, 122, 0.7), rgba(148, 163, 184, 0.7))",
                  animation: "spin 3s linear infinite reverse",
                }}
              />

              {/* Pulsing inner glow */}
              <div className="absolute inset-[2px] rounded-md bg-gradient-to-r from-zinc-800 to-slate-800 group-hover:from-zinc-700 group-hover:to-slate-700 transition-all duration-300">
                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-slate-400/20 via-transparent to-zinc-300/20 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-500" />
              </div>

              {/* Flowing particles effect */}
              <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-60 transition-opacity duration-800">
                <div
                  className="absolute top-1 left-1 w-1 h-1 bg-slate-300 rounded-full animate-ping"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="absolute top-3 right-2 w-1 h-1 bg-zinc-300 rounded-full animate-ping"
                  style={{ animationDelay: "0.5s" }}
                />
                <div
                  className="absolute bottom-2 left-3 w-1 h-1 bg-slate-400 rounded-full animate-ping"
                  style={{ animationDelay: "1s" }}
                />
                <div
                  className="absolute bottom-1 right-1 w-1 h-1 bg-zinc-400 rounded-full animate-ping"
                  style={{ animationDelay: "1.5s" }}
                />
              </div>
            </div>

            <span className="relative z-10 flex items-center" onClick={onGetStarted}>
              Get Started
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-slate-600 text-black hover:bg-slate-800 hover:text-white px-8 py-4 text-lg font-semibold group"
          >
            <Zap className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
            Watch Demo
          </Button>
        </motion.div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  )
}
