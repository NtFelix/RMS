"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion"
import { Sparkles, Shield, Zap, Check, ChevronRight, Play, Star, Calendar, FileCheck, ArrowRight } from "lucide-react"
import { CallToAction } from "./call-to-action"
import { VideoPlayer } from "@/components/ui/video-player"
import { HERO_VIDEO_URL } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Interactive Spotlight
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { left, top } = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
      mouseX.set(clientX - left)
      mouseY.set(clientY - top)
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  const spotlight = useMotionTemplate`radial-gradient(1000px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.08), transparent 80%)`

  // 3D Parallax Calculation
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const rotateX = useTransform(springY, [0, 1000], [2, -2])
  const rotateY = useTransform(springX, [0, 1920], [-2, 2])

  // Scroll Animations
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 120])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const scale = useTransform(scrollY, [0, 400], [1, 0.98])

  return (
    <section
      ref={containerRef}
      className="relative min-h-[110vh] flex flex-col items-center justify-start overflow-hidden bg-background pt-32 pb-40 px-6 transition-colors duration-500"
    >
      {/* --- DYNAMIC SPOTLIGHT BACKGROUND --- */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: spotlight }}
      />

      {/* Architectural Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex flex-col items-center text-center">

        {/* Trust Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-3 px-1 py-1 pr-4 rounded-full bg-muted/50 border border-border/50 backdrop-blur-xl group hover:border-primary/30 transition-all cursor-default">
            <span className="flex items-center justify-center h-7 px-3 rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase tracking-widest shadow-lg shadow-primary/25">
              Neu
            </span>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Smart-Import für Zählerstände
            </span>
            <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </div>
        </motion.div>

        {/* Masterpiece Typography */}
        <motion.div style={{ opacity, scale }} className="mb-14 max-w-5xl">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-foreground mb-8">
            Abrechnung. <br />
            <span className="relative inline-block z-10">
              <span className="absolute inset-x-0 bottom-2 sm:bottom-4 h-6 sm:h-10 bg-blue-500/20 -skew-x-6 -z-10 rounded-sm" />
              <span className="text-blue-600 dark:text-blue-400">Automatisiert.</span>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
            Verabschieden Sie sich von Excel. Erstellen Sie rechtssichere Nebenkostenabrechnungen in <span className="text-foreground border-b-2 border-primary/30">Rekordzeit.</span>
          </p>
        </motion.div>

        {/* Simplified CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-6 mb-28"
        >
          <CallToAction variant="hero" onGetStarted={onGetStarted} />
        </motion.div>

        {/* --- THE ARCHITECTURAL FRAME --- */}
        <motion.div
          style={{
            y,
            rotateX,
            rotateY,
          }}
          className="relative w-full max-w-[1200px] group perspective-2000"
        >
          {/* The Floating Frame */}
          <div className="relative rounded-[2rem] bg-background/50 backdrop-blur-3xl border border-white/10 dark:border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] p-4 sm:p-6 overflow-hidden transition-all duration-700 hover:shadow-[0_60px_120px_-20px_rgba(59,130,246,0.15)]">

            {/* Minimal Browser Chrome */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex gap-2 opacity-50">
                <div className="w-3 h-3 rounded-full bg-foreground/20" />
                <div className="w-3 h-3 rounded-full bg-foreground/20" />
                <div className="w-3 h-3 rounded-full bg-foreground/20" />
              </div>
              <div className="h-6 px-4 rounded-md bg-foreground/5 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Mietevo Dashboard
              </div>
              <div className="w-16" /> {/* Balance spacer */}
            </div>

            {/* Main Video Canvas */}
            <div className="relative rounded-2xl overflow-hidden bg-black/5 aspect-[16/9] border border-border/5">
              <VideoPlayer
                src={HERO_VIDEO_URL}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                autoplay={true}
                muted={true}
                loop={true}
                playsInline={true}
                showPosterFallback={true}
              />

              {/* Interactive 'Pulse' Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Hover Context Actions */}
              <div className="absolute bottom-8 right-8 flex gap-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <button className="h-10 px-5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-colors uppercase tracking-wider">
                  Details ansehen
                </button>
              </div>
            </div>
          </div>

          {/* --- ANCHORED STAT SATELLITES --- */}

          {/* Satellite 1: Calendar */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] -left-8 sm:-left-24 z-20 w-56 p-5 rounded-2xl bg-background border border-border shadow-xl hidden xl:flex flex-col gap-3 group/card hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Calendar size={20} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Jährlich</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">30.12.</div>
              <div className="text-xs font-medium text-muted-foreground">Stichtag erreichen</div>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-blue-500" />
            </div>
          </motion.div>

          {/* Satellite 2: Verified */}
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] -right-8 sm:-right-24 z-20 w-56 p-5 rounded-2xl bg-background border border-border shadow-xl hidden xl:flex flex-col gap-3 group/card hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <FileCheck size={20} />
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <Check size={12} strokeWidth={4} />
                <span className="text-[10px] font-bold uppercase">Valid</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">100%</div>
              <div className="text-xs font-medium text-muted-foreground">Rechtssicher</div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-current to-transparent" />
        <span className="text-[10px] uppercase tracking-widest font-bold">Scroll</span>
      </motion.div>

    </section>
  )
}