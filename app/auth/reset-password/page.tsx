"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Loader2, Check, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAuthErrorMessage } from "@/lib/auth-error-handler"
import { motion } from "framer-motion"
import { Auth3DDecorations } from "@/components/auth-3d-decorations"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (error) {
      setError(getAuthErrorMessage(error))
      setIsLoading(false)
      return
    }

    setMessage("Überprüfen Sie Ihre E-Mail für den Link zum Zurücksetzen des Passworts.")
    setIsLoading(false)
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
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">Mietfluss</span>
          </div>

          {/* Hero content */}
          <div className="relative z-10 py-8 lg:py-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6"
            >
              <Mail className="h-4 w-4 text-white" />
              <span className="text-white/90 text-sm font-medium">Passwort vergessen?</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
            >
              KEIN
              <br />
              PROBLEM
              <br />
              <span className="text-white/90">WIR HELFEN!</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6 text-white/80 text-base md:text-lg max-w-md leading-relaxed"
            >
              Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen
              einen Link zum Zurücksetzen Ihres Passworts.
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
              PASSWORT ZURÜCKSETZEN
            </h2>
            <p className="mt-2 text-muted-foreground">
              Geben Sie Ihre E-Mail-Adresse ein.
            </p>

            <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
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

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  "Link senden"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-4">
                Erinnern Sie sich an Ihr Passwort?{" "}
                <Link
                  href="/auth/login"
                  className="text-foreground font-semibold hover:text-foreground/80 transition-colors"
                >
                  Zurück zur Anmeldung
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
