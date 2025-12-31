"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, Loader2, Check, Sparkles } from "lucide-react"
import { LOGO_URL, ROUTES, POSTHOG_FEATURE_FLAGS, BASE_URL } from "@/lib/constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import posthog from 'posthog-js'
import { useFeatureFlagEnabled } from 'posthog-js/react'
import { getAuthErrorMessage } from "@/lib/auth-error-handler"
import { trackRegisterStarted, trackRegisterSuccess, trackRegisterFailed } from '@/lib/posthog-auth-events'
import { motion } from "framer-motion"
import { Auth3DDecorations } from "@/components/auth/auth-3d-decorations"
import { handleGoogleSignIn } from "@/lib/auth-helpers"
import { GoogleIcon } from "@/components/icons/google-icon"

const benefits = [
  "14 Tage kostenlos testen",
  "Keine Kreditkarte erforderlich",
  "Jederzeit kündbar",
]


export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isGoogleLoginEnabled = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.GOOGLE_SOCIAL_LOGIN)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    // Track registration started (GDPR-compliant - checks consent internally)
    trackRegisterStarted('email')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${BASE_URL}/auth/callback`,
      },
    })

    if (error) {
      // Track registration failure (GDPR-compliant - checks consent internally)
      trackRegisterFailed('email', error.code === 'user_already_exists' ? 'user_already_exists' : 'unknown')

      setError(getAuthErrorMessage(error))
      setIsLoading(false)
      return
    }

    if (data?.user) {
      // GDPR: Only identify and track if user has consented
      if (posthog.has_opted_in_capturing?.()) {
        posthog.identify(data.user.id, {
          email: data.user.email,
          signup_date: new Date().toISOString(),
          user_type: 'authenticated',
          is_anonymous: false,
        })
      }
      // Track registration success (GDPR-compliant - checks consent internally)
      trackRegisterSuccess('email')
    }

    router.push('/auth/verify-email')
    setIsLoading(false)
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

      {/* Gradient orbs in background */}
      <motion.div
        className="hidden md:block absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-secondary/20 blur-[100px]"
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hidden md:block absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-primary/20 blur-[100px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -40, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Radial spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.8)_0%,transparent_50%)]" />

      {/* Main container with split layout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[650px]"
      >
        {/* Left side - Hero/Branding */}
        <div className="hidden lg:flex relative lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-primary p-8 md:p-12 flex-col justify-between overflow-hidden perspective-[1000px]">
          {/* Gradient mesh overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--accent)/0.3)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.4)_0%,transparent_50%)]" />

          {/* Tilted Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [transform:perspective(500px)_rotateX(20deg)_scale(1.2)] origin-top opacity-50" />

          {/* 3D Decorative elements (shared component) */}
          <Auth3DDecorations />

          {/* Logo */}
          <Link href="/" className="relative z-10 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-1 rounded-xl bg-white/10 backdrop-blur-sm">
              {/* Using native img tag: Image is already optimized (AVIF format) and served from Supabase CDN. 
                  next/image adds unnecessary overhead for small, pre-optimized images. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Mietevo Logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-white font-semibold text-lg">Mietevo</span>
          </Link>

          {/* Hero content */}
          <div className="relative z-10 py-8 lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-white/90 text-sm font-medium">Kostenlos starten</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
            >
              Starten Sie
              <br />
              jetzt mit
              <br />
              <span className="text-white/90">Mietevo.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6 text-white/80 text-base md:text-lg max-w-md leading-relaxed"
            >
              Einfach Immobilien verwalten.
            </motion.p>
          </div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative z-10 space-y-3"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-white/80 text-sm">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right side - Form */}
        <div className="lg:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-card">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-primary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO_URL} alt="Mietevo Logo" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-foreground font-semibold text-lg">Mietevo</span>
            </Link>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-sm mx-auto w-full"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              REGISTRIEREN
            </h2>
            <p className="mt-2 text-muted-foreground">
              Erstellen Sie Ihr Konto, um loszulegen.
            </p>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              {message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert variant="success" className="rounded-xl">
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      {message}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-Mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Passwort
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-background border-border focus:border-primary pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                  Passwort bestätigen
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl bg-background border-border focus:border-primary pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird registriert...
                  </>
                ) : (
                  "Kostenlos starten"
                )}
              </Button>

              {mounted && isGoogleLoginEnabled && (
                <div className="pt-4 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ODER MIT GOOGLE</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl text-base font-medium border-border hover:bg-muted/50 transition-colors"
                    onClick={async () => {
                      setIsLoading(true)
                      setError(null)

                      const { error } = await handleGoogleSignIn('signup')

                      if (error) {
                        setError(error)
                        setIsLoading(false)
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="h-5 w-5 mr-2" />
                    )}
                    Mit Google anmelden
                  </Button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground pt-2">
                Mit der Registrierung stimmen Sie unseren{" "}
                <Link href={ROUTES.TERMS} className="text-foreground hover:underline">
                  Nutzungsbedingungen
                </Link>{" "}
                und der{" "}
                <Link href={ROUTES.PRIVACY} className="text-foreground hover:underline">
                  Datenschutzerklärung
                </Link>{" "}
                zu.
              </p>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Bereits ein Konto?{" "}
                <Link
                  href="/auth/login"
                  className="text-foreground font-semibold hover:text-foreground/80 transition-colors"
                >
                  Anmelden
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
