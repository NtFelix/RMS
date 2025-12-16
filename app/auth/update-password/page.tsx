"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LOGO_URL } from "@/lib/constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAuthErrorMessage } from "@/lib/auth-error-handler"

export default function UpdatePasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(getAuthErrorMessage(error))
      setIsLoading(false)
      return
    }

    router.push("/auth/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="flex justify-center mb-2 hover:opacity-80 transition-opacity">
            {/* Using native img tag: Image is already optimized (AVIF format) and served from Supabase CDN. 
                next/image adds unnecessary overhead for small, pre-optimized images. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="Mietfluss Logo" className="h-12 w-12 object-contain" />
          </Link>
          <CardTitle className="text-2xl font-bold">Passwort aktualisieren</CardTitle>
          <CardDescription>Geben Sie Ihr neues Passwort ein</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Wird aktualisiert..." : "Passwort aktualisieren"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
