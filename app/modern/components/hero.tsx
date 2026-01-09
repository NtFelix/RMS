"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from "framer-motion"
import {
  Sparkles, Shield, Zap, Check, ChevronRight, Play, Star,
  Calendar, FileCheck, ArrowRight,
  Receipt, Scale, Calculator, User, Building2, Droplets, Flame, Trash2,
  FileSignature, Download, ArrowRightCircle
} from "lucide-react"
import { CallToAction } from "./call-to-action"
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
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const rotateX = useTransform(springY, [0, dimensions.height], [2, -2])
  const rotateY = useTransform(springX, [0, dimensions.width], [-2, 2])

  // Scroll Animations
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 120])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const scale = useTransform(scrollY, [0, 400], [1, 0.98])

  // --- REALISTIC PROCESS SIMULATION ---
  const [stage, setStage] = useState<"input" | "keys" | "calc" | "pdf">("input")
  const [clickedButton, setClickedButton] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const runSimulation = async () => {
      while (isMounted) {
        // RESET & START
        setStage("input")
        setClickedButton(null)
        await delay(4000)
        if (!isMounted) break

        // Click "Weiter" on Input
        setClickedButton("input-next")
        await delay(300)
        if (!isMounted) break
        setClickedButton(null)
        await delay(200)
        if (!isMounted) break

        setStage("keys")
        await delay(4000)
        if (!isMounted) break

        // Click "Weiter" on Keys
        setClickedButton("keys-next")
        await delay(300)
        if (!isMounted) break
        setClickedButton(null)
        await delay(200)
        if (!isMounted) break

        setStage("calc")
        await delay(4000)
        if (!isMounted) break

        // Click "Create" on Calc
        setClickedButton("calc-create")
        await delay(300)
        if (!isMounted) break
        setClickedButton(null)
        await delay(200)
        if (!isMounted) break

        setStage("pdf")
        await delay(6000)
        if (!isMounted) break
      }
    }
    runSimulation()
    return () => {
      isMounted = false
    }
  }, [])

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

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
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex flex-col items-center text-center">

        {/* Updated Trust Pill (Reverted Text) */}
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
              Import für Zählerstände
            </span>
            <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </div>
        </motion.div>

        {/* Updated Main Title (Reverted Text) */}
        <motion.div style={{ opacity, scale }} className="mb-14 max-w-5xl">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-foreground mb-8">
            Abrechnung. <br />
            <span className="relative inline-block z-10">
              <span className="absolute inset-x-0 bottom-2 sm:bottom-4 h-6 sm:h-10 bg-blue-500/20 -skew-x-6 -z-10 rounded-sm" />
              <span className="text-blue-600 dark:text-blue-400">Automatisiert.</span>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
            Verabschieden Sie sich von Excel. Erstellen Sie Ihre Nebenkostenabrechnungen in <span className="text-foreground border-b-2 border-primary/30">Rekordzeit.</span>
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-6 mb-28"
        >
          <CallToAction variant="hero" onGetStarted={onGetStarted} />
        </motion.div>

        {/* --- THE REALISTIC APP MOCKUP --- */}
        <motion.div
          style={{
            y,
            rotateX,
            rotateY,
          }}
          className="relative w-full max-w-[1200px] group perspective-2000 mb-20"
        >
          {/* Main Container */}
          <div className="relative rounded-[2rem] bg-background/50 backdrop-blur-3xl border border-white/10 dark:border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] p-4 sm:p-6 overflow-hidden text-left">

            {/* App Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Objekt</div>
                  <div className="text-sm font-bold text-foreground">Schlossallee 21, Berlin</div>
                </div>
              </div>
              <div className="flex gap-2">
                {["Kosten", "Schlüssel", "Abschluss"].map((s, i) => {
                  const isActive = (
                    (stage === "input" && i === 0) ||
                    (stage === "keys" && i === 1) ||
                    (stage === "calc" && i === 2) ||
                    (stage === "pdf" && i === 2)
                  )
                  return (
                    <div key={s} className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors",
                      isActive ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground"
                    )}>
                      {s}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* --- WORKSPACE CONTENT --- */}
            <div className="relative rounded-2xl overflow-hidden bg-background border border-border/50 aspect-[16/9] sm:aspect-[2/1] shadow-inner flex">

              {/* STAGE 1: INPUT COST (Belege) */}
              <AnimatePresence mode="wait">
                {stage === "input" && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full flex flex-col p-8 relative"
                  >
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <h3 className="text-2xl font-black mb-1">Ausgaben erfassen</h3>
                        <p className="text-muted-foreground text-sm">Importieren Sie Ihre Rechnungen oder scannen Sie Belege.</p>
                      </div>
                      <button className="px-4 py-2 bg-primary/10 text-primary text-xs font-bold uppercase rounded-lg hover:bg-primary/20 transition-colors">
                        + Ausgabe
                      </button>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Flame, label: "Stadtwerke - Gas", date: "12.01.2024", amount: "4.250,00 €" },
                        { icon: Droplets, label: "Wasserbetriebe", date: "15.01.2024", amount: "1.820,00 €" },
                        { icon: Trash2, label: "BSR Müllabfuhr", date: "01.02.2024", amount: "840,00 €" },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.2 + 0.5, duration: 0.5 }}
                          className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-muted/10 cursor-pointer h-[72px]"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                              <item.icon size={18} />
                            </div>
                            <div className="flex flex-col justify-center">
                              <div className="text-sm font-bold leading-tight">{item.label}</div>
                              <div className="text-[10px] text-muted-foreground leading-tight">{item.date}</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold tabular-nums">{item.amount}</div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Continue Button */}
                    <div className="absolute bottom-8 inset-x-0 flex justify-center">
                      <motion.button
                        animate={clickedButton === "input-next" ? { scale: 0.9, opacity: 0.9 } : { scale: 1, opacity: 1 }}
                        transition={{ duration: 0.1 }}
                        className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase rounded-xl hover:bg-foreground/90 transition-colors flex items-center gap-2"
                      >
                        Weiter <ArrowRightCircle size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 2: KEYS DISTRIBUTION */}
                {stage === "keys" && (
                  <motion.div
                    key="keys"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full flex flex-col p-8 relative"
                  >
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <h3 className="text-2xl font-black mb-1">Verteilerschlüssel</h3>
                        <p className="text-muted-foreground text-sm">Legen Sie fest, wie die Kosten umgelegt werden.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1 p-5 rounded-2xl border border-primary bg-primary/5 relative overflow-hidden transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <Droplets className="text-primary" size={20} />
                          <span className="font-bold">Wasser/Abwasser</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 rounded-lg bg-background/50 border border-border/50 opacity-50">
                            <span className="text-xs font-bold text-muted-foreground">Nach Wohnfläche</span>
                            <div className="w-4 h-4 rounded-full border border-muted-foreground" />
                          </div>
                          <div className="flex justify-between p-2 rounded-lg bg-background border border-primary shadow-sm scale-[1.02]">
                            <span className="text-xs font-bold text-foreground">Nach Personen</span>
                            <div className="w-4 h-4 rounded-full border-4 border-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 p-5 rounded-2xl border border-border bg-muted/5 opacity-60">
                        <div className="flex items-center gap-3 mb-4">
                          <Trash2 className="text-muted-foreground" size={20} />
                          <span className="font-bold text-muted-foreground">Müllabfuhr</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 rounded-lg bg-background border border-muted-foreground/30">
                            <span className="text-xs font-bold text-muted-foreground">Nach Wohnfläche</span>
                            <div className="w-4 h-4 rounded-full border-4 border-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <div className="absolute bottom-8 inset-x-0 flex justify-center">
                      <motion.button
                        animate={clickedButton === "keys-next" ? { scale: 0.9, opacity: 0.9 } : { scale: 1, opacity: 1 }}
                        transition={{ duration: 0.1 }}
                        className="px-6 py-3 bg-foreground text-background text-xs font-bold uppercase rounded-xl hover:bg-foreground/90 transition-colors flex items-center gap-2"
                      >
                        Weiter <ArrowRightCircle size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 3: CALCULATION */}
                {stage === "calc" && (
                  <motion.div
                    key="calc"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full flex flex-col p-8 items-center justify-center"
                  >
                    <div className="w-full max-w-md space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gesamtkosten Objekt</span>
                        <span className="font-bold">6.910,00 €</span>
                      </div>
                      <div className="h-px w-full bg-border" />

                      <div className="bg-muted/10 p-6 rounded-2xl border border-border/50 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="text-sm font-bold">Mieter: M. Mustermann</div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Anteilige Kosten</span>
                          <span className="font-bold text-foreground">1.450,00 €</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Abzüglich Vorauszahlungen</span>
                          <span className="font-bold text-emerald-600">- 1.200,00 €</span>
                        </div>
                        <div className="h-px w-full bg-border border-dashed" />
                        <div className="flex justify-between text-lg font-black">
                          <span>Nachzahlung</span>
                          <span className="text-primary">250,00 €</span>
                        </div>
                      </div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="pt-4 flex justify-center"
                      >
                        <motion.button
                          animate={clickedButton === "calc-create" ? { scale: 0.95, opacity: 0.9 } : { scale: 1, opacity: 1 }}
                          transition={{ duration: 0.1 }}
                          className="px-8 py-3 bg-foreground text-background font-bold rounded-xl shadow-xl hover:scale-105 hover:bg-foreground/90 transition-all flex items-center gap-2"
                        >
                          <FileCheck size={18} /> Abrechnung erstellen
                        </motion.button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 4: PDF RESULT - High Fidelity */}
                {stage === "pdf" && (
                  <motion.div
                    key="pdf"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full flex flex-col items-center justify-center relative p-8"
                  >
                    <motion.div
                      initial="rest"
                      whileHover="hover"
                      animate={{ y: 0, opacity: 1 }}
                      variants={{
                        rest: { y: 0 },
                        hover: { y: -8 }
                      }}
                      transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
                      className="relative z-10 w-[240px] aspect-[1/1.41] group cursor-pointer"
                    >
                      {/* Stacked Papers (Background) - Fan out on hover */}
                      <motion.div
                        variants={{
                          rest: { opacity: 0, scale: 0.95, rotate: 0, x: 0 },
                          hover: { opacity: 1, scale: 1, rotate: -6, x: -16 }
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 bg-white rounded-lg shadow-sm border border-black/5 z-0 origin-bottom-left"
                      />
                      <motion.div
                        variants={{
                          rest: { opacity: 0, scale: 0.95, rotate: 0, x: 0 },
                          hover: { opacity: 1, scale: 1, rotate: 6, x: 16 }
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 bg-white rounded-lg shadow-sm border border-black/5 z-10 origin-bottom-right"
                      />

                      {/* Main Document (Foreground) */}
                      <div className="absolute inset-0 bg-white rounded-lg shadow-2xl border border-black/5 z-20 p-6 flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-8 h-8 rounded bg-primary transition-colors group-hover:bg-primary/90" />
                          <div className="text-[6px] text-gray-400 font-mono">2024-001</div>
                        </div>
                        <div className="w-1/3 h-1.5 bg-gray-800 rounded-sm mb-4" />

                        {/* Body Lines */}
                        <div className="space-y-1.5">
                          <div className="w-full h-1 bg-gray-100 rounded-sm" />
                          <div className="w-full h-1 bg-gray-100 rounded-sm" />
                          <div className="w-2/3 h-1 bg-gray-100 rounded-sm" />
                        </div>

                        {/* Table Mock */}
                        <div className="mt-4 border border-gray-100 rounded-sm p-1 space-y-1">
                          <div className="flex gap-1">
                            <div className="w-1/4 h-1 bg-gray-200 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-200 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-200 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-200 rounded-sm" />
                          </div>
                          <div className="w-full h-[1px] bg-gray-100" />
                          <div className="flex gap-1">
                            <div className="w-1/4 h-1 bg-gray-50 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-50 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-50 rounded-sm" />
                            <div className="w-1/4 h-1 bg-gray-50 rounded-sm" />
                          </div>
                        </div>

                        {/* Bottom Result */}
                        <div className="mt-auto border-t border-gray-200 pt-3 flex justify-between items-center">
                          <div className="text-[6px] font-bold text-gray-400 uppercase">Nachzahlung</div>
                          <div className="text-xs font-bold text-gray-900">250,00 €</div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="mt-8 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span className="text-xs font-bold uppercase tracking-wide">PDF Generiert</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </motion.div>
      </div>
    </section>
  )
}