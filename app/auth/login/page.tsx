"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import posthog from 'posthog-js'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Check for redirect parameter, otherwise default to dashboard
  const redirectParam = searchParams.get('redirect')
  const redirect = redirectParam || "/home"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      const errorMap: Record<string, string> = {
        invalid_code: "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.",
        auth_failed: "Die Authentifizierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
        unexpected_error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        access_denied: "Zugriff verweigert.",
      }
      setError(errorMap[errorParam] || "Ein Fehler ist aufgetreten.")
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
      // Track failed login attempt
      posthog.capture('login_attempt', {
        status: 'failed',
        email,
        error: error.message,
      })

      let errorMessage = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Ungültige E-Mail-Adresse oder Passwort. Bitte überprüfen Sie Ihre Eingaben."
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfen Sie Ihren Posteingang."
      } else if (error.message.includes("Too many requests")) {
        errorMessage = "Zu viele Anmeldeversuche. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen."
      } else {
        errorMessage = error.message // Fallback to original message if unknown
      }

      setError(errorMessage)
      setIsLoading(false)
      return
    }

    // Track successful login
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
          <CardDescription>Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein, um sich anzumelden</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link href="/auth/reset-password" className="text-sm text-primary hover:underline">
                  Passwort vergessen?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Wird angemeldet..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm">
            Noch kein Konto?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Registrieren
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
