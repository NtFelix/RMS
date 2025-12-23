"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { LOGO_URL } from "@/lib/constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import posthog from 'posthog-js'
import { getAuthErrorMessage, getUrlErrorMessage } from "@/lib/auth-error-handler"
import { motion } from "framer-motion"
import { Auth3DDecorations } from "@/components/auth/auth-3d-decorations"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const redirect = redirectParam || "/home"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(getUrlErrorMessage(errorParam))
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      posthog.capture('login_attempt', {
        status: 'failed',
        email,
        error: error.message,
      })

      setError(getAuthErrorMessage(error))
      setIsLoading(false)
      return
    }

    if (data?.user) {
      posthog.identify(data.user.id, {
        email: data.user.email,
        name: data.user.user_metadata?.name || '',
        last_sign_in: data.user.last_sign_in_at,
      })

      posthog.capture('login_success', {
        email: data.user.email,
        provider: 'email',
      })
    }

    window.location.assign(redirect)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

      {/* Gradient orbs in background */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/20 blur-[100px]"
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Radial spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.8)_0%,transparent_50%)]" />

      {/* Main container with split layout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px]"
      >
        {/* Left side - Hero/Branding */}
        <div className="relative lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-primary p-8 md:p-12 flex flex-col justify-between overflow-hidden perspective-[1000px]">
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
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
            >
              IHR NÄCHSTER
              <br />
              SCHRITT ZUR
              <br />
              <span className="text-white/90">EFFIZIENZ</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 text-white/80 text-base md:text-lg max-w-md leading-relaxed"
            >
              Verwalten Sie Ihre Immobilien mühelos. Nebenkostenabrechnungen,
              Mieterverwaltung und Finanzen – alles an einem Ort.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-4 text-white/60 text-sm font-medium"
            >
              Ihre Reise beginnt hier.
            </motion.p>
          </div>

          {/* Empty space for balance */}
          <div className="relative z-10" />
        </div>

        {/* Right side - Form */}
        <div className="lg:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-card">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-sm mx-auto w-full"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              WILLKOMMEN ZURÜCK!
            </h2>
            <p className="mt-2 text-muted-foreground">
              Bitte geben Sie Ihre Anmeldedaten ein.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
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

              <div className="flex items-center justify-end">
                <Link
                  href="/auth/reset-password"
                  className="text-sm text-foreground hover:text-foreground/80 font-medium transition-colors"
                >
                  Passwort vergessen?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird angemeldet...
                  </>
                ) : (
                  "Anmelden"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-4">
                Noch kein Konto?{" "}
                <Link
                  href="/auth/register"
                  className="text-foreground font-semibold hover:text-foreground/80 transition-colors"
                >
                  Registrieren
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
