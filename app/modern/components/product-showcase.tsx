"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Home, Receipt, BarChart3, Maximize2, X } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Feature {
    id: string
    title: string
    description: string
    icon: any
    image: string
    imageDark?: string
}

const features: Feature[] = [
    {
        id: "dashboard",
        title: "Immobilien",
        description: "Alle Objekte & Mieter zentral verwalten",
        icon: Home,
        image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/haus-page.avif",
        imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/haus-page-darkmode.avif",
    },
    {
        id: "finance",
        title: "Finanzen",
        description: "Einnahmen & Ausgaben tracken",
        icon: BarChart3,
        image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/finance-page.avif",
        imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/finance-page-darkmode.avif",
    },
    {
        id: "nebenkosten",
        title: "Abrechnung",
        description: "Betriebskosten in Minuten erstellen",
        icon: Receipt,
        image: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/nebenkosten-overview.avif",
        imageDark: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/landing-page/nebenkosten-overview-darkmode.avif",
    },
]

export default function ProductShowcase() {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const selectedFeature = features[selectedIndex]

    return (
        <section className="py-24 sm:py-32 px-4 bg-background overflow-visible relative">
            <div className="max-w-[90rem] mx-auto relative">
                {/* Section Header */}
                <div className="text-center w-full max-w-3xl mx-auto mb-16 sm:mb-20 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-sm mb-6"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Plattform</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
                    >
                        Entdecken Sie die Funktionen
                    </motion.h2>
                </div>

                {/* Component Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative max-w-7xl mx-auto md:p-2"
                >
                    {/* Background Grid Pattern */}
                    <div
                        className="absolute -inset-[500px] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                            backgroundSize: '80px 80px',
                            opacity: 0.05,
                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
                            WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)'
                        }}
                    />

                    <div className="relative">
                        {/* Main Content Card */}
                        <div className="relative bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden group border border-border/10 rounded-3xl">

                            {/* Feature Selector Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-border/10">
                                {features.map((feature, index) => {
                                    const isSelected = index === selectedIndex
                                    const Icon = feature.icon
                                    const isLast = index === features.length - 1

                                    return (
                                        <button
                                            key={feature.id}
                                            onClick={() => setSelectedIndex(index)}
                                            className={cn(
                                                "relative p-5 md:p-6 text-left transition-all duration-300 outline-none select-none",
                                                // Separators
                                                !isLast && "sm:border-r border-b sm:border-b-0 border-border/10",
                                                isSelected
                                                    ? "bg-primary/5"
                                                    : "hover:bg-primary/5"
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                                                            : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3
                                                        className={cn(
                                                            "font-medium text-sm md:text-base mb-1 transition-colors duration-200",
                                                            isSelected ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                                                        )}
                                                    >
                                                        {feature.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                        {feature.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Screenshot Display Area */}
                            <div className="relative w-full bg-muted/20 overflow-hidden group/image">
                                {/* Inner Texture */}
                                <div
                                    className="absolute inset-0 opacity-[0.05] pointer-events-none z-10 mix-blend-overlay"
                                    style={{
                                        backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                                        backgroundSize: '24px 24px'
                                    }}
                                />

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedFeature.id}
                                        initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="flex items-center justify-center p-4 md:p-8"
                                    >
                                        <div className="relative shadow-2xl rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 bg-background max-h-[70vh]">
                                            {/* Light Mode Image */}
                                            <img
                                                src={selectedFeature.image}
                                                alt={selectedFeature.title}
                                                className={cn(
                                                    "w-auto h-auto max-w-full max-h-[70vh] object-cover",
                                                    selectedFeature.imageDark ? "dark:hidden" : ""
                                                )}
                                            />
                                            {/* Dark Mode Image */}
                                            {selectedFeature.imageDark && (
                                                <img
                                                    src={selectedFeature.imageDark}
                                                    alt={selectedFeature.title}
                                                    className="w-auto h-auto max-w-full max-h-[70vh] object-cover hidden dark:block"
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Maximize Button - appears on hover */}
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-20 p-3 rounded-2xl bg-background/80 backdrop-blur-md border border-border/50 shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-background"
                                    aria-label="Bild vergrößern"
                                >
                                    <Maximize2 className="w-5 h-5 text-foreground" />
                                </button>
                            </div>

                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Fullscreen Lightbox Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8"
                        onClick={() => setIsFullscreen(false)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="absolute top-4 right-4 md:top-8 md:right-8 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
                            aria-label="Schließen"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Fullscreen Image */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full h-full max-w-[95vw] max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Light Mode Image */}
                            <Image
                                src={selectedFeature.image}
                                alt={selectedFeature.title}
                                fill
                                className={cn(
                                    "object-contain rounded-xl",
                                    selectedFeature.imageDark ? "dark:hidden" : ""
                                )}
                                priority
                                unoptimized
                            />
                            {/* Dark Mode Image */}
                            {selectedFeature.imageDark && (
                                <Image
                                    src={selectedFeature.imageDark}
                                    alt={selectedFeature.title}
                                    fill
                                    className="object-contain rounded-xl hidden dark:block"
                                    priority
                                    unoptimized
                                />
                            )}
                        </motion.div>

                        {/* Feature Title Overlay */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                            <span className="text-white font-medium">{selectedFeature.title}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}
