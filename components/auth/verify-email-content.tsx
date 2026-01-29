"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Mail, MailCheck, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Auth3DDecorations } from "@/components/auth/auth-3d-decorations"
import { createClient } from "@/utils/supabase/client"
import { ROUTES } from "@/lib/constants"

type VerificationStatus = 'pending' | 'success'

export default function VerifyEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const email = searchParams.get('email')

    const [status, setStatus] = useState<VerificationStatus>('pending')
    const [countdown, setCountdown] = useState(3)

    const supabase = createClient()

    // Handle successful verification
    const handleVerificationSuccess = useCallback(() => {
        if (status === 'success') return
        setStatus('success')
    }, [status])

    // Listen for auth state changes - if user gets logged in, redirect to dashboard
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // User is now logged in - redirect to dashboard immediately
                router.push(ROUTES.HOME)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase.auth, router])

    // Poll the API to check verification status from Supabase
    useEffect(() => {
        // We need either email or ID to check verification status
        if ((!email && !id) || status === 'success') return

        const checkVerification = async () => {
            try {
                // Construct query params
                const params = new URLSearchParams()
                if (email) params.append('email', email)
                if (id) params.append('id', id)

                const response = await fetch(`/api/auth/check-verification?${params.toString()}`)
                const data = await response.json()

                if (data.confirmed) {
                    handleVerificationSuccess()
                }
            } catch (error) {
                console.error('Error checking verification status:', error)
            }
        }

        checkVerification()
        const interval = setInterval(checkVerification, 3000)

        return () => clearInterval(interval)
    }, [email, status, handleVerificationSuccess])

    // Countdown for success state
    useEffect(() => {
        if (status !== 'success') return

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [status])

    // Redirect when countdown reaches 0 - go to dashboard
    useEffect(() => {
        if (status === 'success' && countdown === 0) {
            router.push(ROUTES.HOME)
        }
    }, [status, countdown, router])

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
                        <AnimatePresence mode="wait">
                            {status === 'pending' ? (
                                <motion.div
                                    key="pending"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center"
                                >
                                    {/* Icon with pulsing indicator */}
                                    <div className="relative p-4 rounded-2xl bg-white/10 backdrop-blur-md mb-6 shadow-xl">
                                        <Mail className="h-12 w-12 text-white" />
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-white/30 rounded-full"
                                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        />
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
                                        className="text-white/80 text-base md:text-lg max-w-xs leading-relaxed mb-4"
                                    >
                                        Wir haben Ihnen einen Bestätigungslink gesendet.
                                        {email && (
                                            <span className="block mt-2 font-medium text-white">
                                                {email}
                                            </span>
                                        )}
                                    </motion.p>

                                    {/* Waiting indicator */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                        className="flex items-center gap-2 text-white/70 text-sm mb-8"
                                    >
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Warte auf Bestätigung...</span>
                                    </motion.div>

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
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center"
                                >
                                    {/* Success icon with celebration animation */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="relative p-4 rounded-2xl bg-green-500/20 backdrop-blur-md mb-6 shadow-xl"
                                    >
                                        <MailCheck className="h-12 w-12 text-green-300" />
                                        {/* Celebration particles */}
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-2 h-2 bg-white/60 rounded-full"
                                                initial={{
                                                    x: 0,
                                                    y: 0,
                                                    opacity: 1,
                                                    scale: 1
                                                }}
                                                animate={{
                                                    x: Math.cos(i * 60 * Math.PI / 180) * 40,
                                                    y: Math.sin(i * 60 * Math.PI / 180) * 40,
                                                    opacity: 0,
                                                    scale: 0
                                                }}
                                                transition={{
                                                    duration: 0.6,
                                                    delay: 0.2 + i * 0.05,
                                                    ease: "easeOut"
                                                }}
                                                style={{
                                                    left: '50%',
                                                    top: '50%',
                                                    marginLeft: '-4px',
                                                    marginTop: '-4px'
                                                }}
                                            />
                                        ))}
                                    </motion.div>

                                    <motion.h1
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2, duration: 0.5 }}
                                        className="text-2xl md:text-3xl font-bold text-white mb-4"
                                    >
                                        E-Mail bestätigt!
                                    </motion.h1>

                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className="text-white/80 text-base md:text-lg max-w-xs leading-relaxed mb-6"
                                    >
                                        Sie werden zum Dashboard weitergeleitet...
                                    </motion.p>

                                    {/* Countdown indicator */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4, duration: 0.5 }}
                                        className="flex flex-col items-center gap-3 mb-6"
                                    >
                                        <div className="text-white/70 text-sm">
                                            Weiterleitung in {countdown} Sekunden...
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-white/80 rounded-full"
                                                initial={{ width: '0%' }}
                                                animate={{ width: '100%' }}
                                                transition={{ duration: 3, ease: "linear" }}
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <Link
                                            href={ROUTES.HOME}
                                            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            Weiter zum Dashboard
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
