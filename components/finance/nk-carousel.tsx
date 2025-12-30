"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Key, RefreshCw, Gauge, FileText, Folder, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const features = [
  {
    id: 'pay',
    icon: RefreshCw,
    title: 'Vorauszahlungen',
    longText: 'Soll/Ist‑Abgleich pro Mietverhältnis – offene Posten erkennen, Nachzahlungen minimieren.',
    color: "violet",
    ring: 1,
    angle: 270,
    offset: 30,
  },
  {
    id: 'keys',
    icon: Key,
    title: 'Verteilerschlüssel',
    longText: 'Wählen Sie je Kostenart passende Schlüssel (z. B. Wohnfläche, Einheiten & nach Rechnung)',
    color: "blue",
    ring: 2,
    angle: 200,
    offset: 40,
  },
  {
    id: 'time',
    icon: Gauge,
    title: 'Abrechnungszeiträume',
    longText: 'Definieren Sie individuelle Abrechnungszeiträume je Kostenart.',
    color: "emerald",
    ring: 2,
    angle: 340,
    offset: -20,
  },
  {
    id: 'docs',
    icon: FileText,
    title: 'Dokumente',
    longText: 'Laden Sie Belege hoch und verknüpfen Sie diese mit den jeweiligen Kosten.',
    color: "amber",
    ring: 1,
    angle: 150,
    offset: 0,
  },
  {
    id: 'archive',
    icon: Folder,
    title: 'Ablage',
    longText: 'Alle Unterlagen und Berechnungen an einem zentralen Ort.',
    color: "rose",
    ring: 2,
    angle: 45,
    offset: 40,
  },
]

const colorMap: Record<string, string> = {
  blue: 'rgb(59, 130, 246)',
  violet: 'rgb(139, 92, 246)',
  emerald: 'rgb(16, 185, 129)',
  amber: 'rgb(245, 158, 11)',
  rose: 'rgb(244, 63, 94)',
}

// 2D Ring Sizes (Radii)
const ringRadii = {
  1: { mobile: 155, desktop: 290 },
  2: { mobile: 215, desktop: 370 },
  3: { mobile: 280, desktop: 460 },
}

export function NKCarousel() {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const activeFeature = features.find(f => f.id === activeId)

  return (
    <div className="w-full">
      {/* MOBILE VIEW: Standard Carousel */}
      <div className="md:hidden w-full bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 py-16">
        <div className="w-full max-w-6xl mx-auto px-4">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="py-4 -ml-2">
              {features.map((feature) => (
                <CarouselItem key={feature.id} className="basis-[85%] pl-2">
                  <div className="p-1 h-full">
                    <Card className="h-full bg-card border border-border/50 shadow-lg p-6 rounded-3xl">
                      <CardHeader className="p-0 mb-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                          style={{ backgroundColor: `${colorMap[feature.color]}15`, color: colorMap[feature.color] }}
                        >
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {feature.longText}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex justify-center gap-4">
              <CarouselPrevious className="static translate-y-0 bg-background border-border" />
              <CarouselNext className="static translate-y-0 bg-background border-border" />
            </div>
          </Carousel>
        </div>
      </div>

      {/* DESKTOP VIEW: Orbital System */}
      <div className="hidden md:flex relative w-full py-24 md:py-40 flex-col items-center justify-center min-h-[900px] overflow-visible">

        {/* 2D SYSTEM CONTAINER */}
        <div
          className="relative w-full max-w-[1000px] aspect-square flex items-center justify-center"
          style={{
            ['--ring-1' as string]: `${ringRadii[1].desktop}px`,
            ['--ring-2' as string]: `${ringRadii[2].desktop}px`,
            ['--ring-3' as string]: `${ringRadii[3].desktop}px`,
          } as React.CSSProperties}
        >

          {/* ORBITAL RINGS (Background) */}
          {[1, 2, 3].map((ringNum) => {
            const isOuter = ringNum === 3
            return (
              <div
                key={ringNum}
                className={cn(
                  "absolute rounded-full border transform-gpu transition-all duration-1000",
                  isOuter
                    ? "border-primary/20 bg-primary/[0.01]"
                    : "border-primary/10"
                )}
                style={{
                  width: `calc(var(--ring-${ringNum}) * 2)`,
                  height: `calc(var(--ring-${ringNum}) * 2)`,
                }}
              />
            )
          })}

          {/* SATELLITE NODES */}
          {features.map((feature) => {
            const isActive = activeId === feature.id

            return (
              <div
                key={feature.id}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `rotate(${feature.angle}deg) translate(calc(var(--ring-${feature.ring}) + ${feature.offset ?? 0}px)) rotate(-${feature.angle}deg)`,
                  zIndex: isActive ? 50 : 20,
                }}
                onMouseEnter={() => setActiveId(feature.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                <div className="relative cursor-pointer">

                  {/* Visual Connection Line (Fade in) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      scale: isActive ? 1 : 0.5
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 -z-10"
                  >
                    <div className={cn(
                      "absolute inset-0 rounded-2xl opacity-20 blur-xl transition-colors duration-500",
                      isActive ? "animate-pulse" : ""
                    )}
                      style={{ backgroundColor: isActive ? colorMap[feature.color] : 'transparent' }}
                    />
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      scale: isActive ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl transition-all duration-300 z-30",
                      isActive
                        ? "w-16 h-16 md:w-20 md:h-20 bg-background shadow-2xl ring-4 ring-offset-4 ring-offset-background"
                        : "w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 text-slate-500 shadow-sm"
                    )}
                    style={{
                      borderColor: isActive ? colorMap[feature.color] : undefined,
                      boxShadow: isActive ? `0 20px 50px -12px ${colorMap[feature.color]}60` : undefined,
                      ['--tw-ring-color' as string]: isActive ? colorMap[feature.color] : undefined,
                    }}
                  >
                    <feature.icon
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "w-8 h-8 md:w-9 md:h-9" : "w-5 h-5 md:w-7 md:h-7"
                      )}
                      style={{ color: isActive ? colorMap[feature.color] : undefined }}
                      strokeWidth={1.5}
                    />
                  </motion.button>

                  {/* Floating Label */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : -10
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 mt-4 w-32 text-center px-4 py-1.5 rounded-xl text-[10px] leading-tight font-bold uppercase tracking-wider bg-background/90 border shadow-lg backdrop-blur-md pointer-events-none z-40"
                    )}
                    style={{
                      borderColor: isActive ? `${colorMap[feature.color]}40` : 'transparent',
                      color: isActive ? colorMap[feature.color] : undefined
                    }}
                  >
                    {feature.title}
                  </motion.div>
                </div>
              </div>
            )
          })}

          {/* CENTRAL HUB - Premium Detail Card */}
          <div className="absolute z-30">
            <AnimatePresence mode="wait">
              {!activeId ? (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-card/30 backdrop-blur-xl border border-primary/10 flex items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full border border-primary/20 border-dashed animate-[spin_60s_linear_infinite]" />
                  <Sparkles className="w-8 h-8 text-primary/50" />
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  layoutId="hub-core"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className="relative w-[320px] md:w-[420px] aspect-square rounded-full bg-card/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                  style={{
                    boxShadow: `0 30px 90px -20px ${colorMap[activeFeature!.color]}50`
                  }}
                >
                  {/* Background Glow */}
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${colorMap[activeFeature!.color]}, transparent 70%)` }}
                  />

                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative z-10"
                    style={{ backgroundColor: `${colorMap[activeFeature!.color]}15`, color: colorMap[activeFeature!.color] }}
                  >
                    {React.createElement(activeFeature!.icon, { className: "w-8 h-8" })}
                  </motion.div>

                  <motion.h3
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-2xl font-bold mb-3 relative z-10"
                  >
                    {activeFeature?.title}
                  </motion.h3>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-sm text-muted-foreground leading-relaxed max-w-[280px] relative z-10"
                  >
                    {activeFeature?.longText}
                  </motion.p>

                  <button
                    onClick={() => setActiveId(null)}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-all hover:scale-110 z-20"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {!activeId && (
          <div className="mt-12 text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
            Hovern zum Entdecken
          </div>
        )}
      </div>
    </div>
  )
}
