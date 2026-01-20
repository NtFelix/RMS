"use client"

import Link from "next/link"
import { Mail } from "lucide-react"
import { motion } from "framer-motion"
import { Auth3DDecorations } from "@/components/auth/auth-3d-decorations"

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden">
            {/* Animated grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

            {/* Gradient orbs in background */}
            <motion.div
                className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-secondary/20 blur-[100px]"
                animate={{
                    x: [0, -50, 0],
                    y: [0, 40, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-primary/20 blur-[100px]"
                animate={{
                    x: [0, 30, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Radial spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.8)_0%,transparent_50%)]" />

            {/* Main container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-lg bg-card rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col"
            >
                <div className="relative flex-1 bg-gradient-to-br from-primary via-secondary to-primary p-8 md:p-12 flex flex-col items-center justify-center text-center overflow-hidden perspective-[1000px]">
                    {/* Gradient mesh overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--accent)/0.3)_0%,transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.4)_0%,transparent_50%)]" />

                    {/* Tilted Grid pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [transform:perspective(500px)_rotateX(20deg)_scale(1.2)] origin-top opacity-50" />

                    {/* 3D Decorative elements */}
                    <Auth3DDecorations />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md mb-6 shadow-xl">
                            <Mail className="h-12 w-12 text-white" />
                        </div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-2xl md:text-3xl font-bold text-white mb-4"
                        >
                            E-Mail bestätigen
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-white/80 text-base md:text-lg max-w-xs leading-relaxed mb-8"
                        >
                            Wir haben Ihnen einen Bestätigungslink gesendet. Bitte prüfen Sie Ihren Posteingang.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Zurück zur Anmeldung
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
