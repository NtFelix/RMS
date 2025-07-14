"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  initialTab?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  initialTab = 'login',
}: AuthModalProps) {
  const router = useRouter()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginIsLoading, setLoginIsLoading] = useState(false)

  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerIsLoading, setRegisterIsLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginIsLoading(true)
    setLoginError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError(error.message)
      setLoginIsLoading(false)
      return
    }

    onAuthenticated();
    onClose();
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterIsLoading(true)
    setRegisterError(null)

    if (registerPassword !== registerConfirmPassword) {
        setRegisterError("Passwords do not match.");
        setRegisterIsLoading(false);
        return;
    }

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
    })

    if (error) {
      setRegisterError(error.message)
      setRegisterIsLoading(false)
      return
    }

    onAuthenticated();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-md">
        <Card className="mx-auto w-full max-w-md border-none">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-2">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
                <CardDescription>Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein, um sich anzumelden</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginError && (
                    <Alert variant="destructive">
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Passwort</Label>
                      <Link href="/auth/reset-password" onClick={onClose} className="text-sm text-primary hover:underline">
                        Passwort vergessen?
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loginIsLoading}>
                    {loginIsLoading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            <TabsContent value="register">
            <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-2">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Registrieren</CardTitle>
                <CardDescription>Erstellen Sie ein neues Konto, um loszulegen</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <Alert variant="destructive">
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-Mail</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Passwort</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={registerIsLoading}>
                    {registerIsLoading ? "Wird registriert..." : "Registrieren"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
