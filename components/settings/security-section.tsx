"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Mail, Lock, AlertCircle, CheckCircle, Circle } from "lucide-react";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import ConnectedAccountsSection from "./connected-accounts-section";
import AuthorizedAppsSection from "./authorized-apps-section";

const SecuritySection = () => {
  const supabase = createClient()
  const { toast } = useToast()
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [emailError, setEmailError] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<boolean>(false)

  useEffect(() => {
    supabase.auth.getUser().then(res => {
      const user = res.data.user
      if (user) {
        setEmail(user.email || "")
        setConfirmEmail(user.email || "")
      }
    });
  }, [supabase]);

  const handleEmailSave = async () => {
    if (email !== confirmEmail) {
      setEmailError(true)
      toast({
        title: "Fehler",
        description: "Die E-Mail-Adressen stimmen nicht überein.",
        variant: "destructive",
      })
      return
    }
    setEmailError(false)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim E-Mail speichern",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "E-Mail erfolgreich gespeichert",
        variant: "success",
      })
    }
  }
  const handlePasswordSave = async () => {
    if (password !== confirmPassword) {
      setPasswordError(true)
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      })
      return
    }
    setPasswordError(false)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Passwort speichern",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "Passwort erfolgreich gespeichert",
        variant: "success",
      })
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="E-Mail-Adresse"
        description="Ändern Sie Ihre E-Mail-Adresse für Ihr Konto."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    E-Mail
                  </label>
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-4 w-4 flex items-center justify-center">
                    {emailError ? (
                      <AlertCircle className="h-4 w-4 text-destructive absolute transition-opacity duration-200" />
                    ) : email && confirmEmail && email === confirmEmail ? (
                      <CheckCircle className="h-4 w-4 text-green-500 absolute transition-all duration-200" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50 absolute transition-all duration-200" />
                    )}
                  </div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    E-Mail bestätigen
                  </label>
                </div>
                <Input
                  type="email"
                  value={confirmEmail}
                  onChange={e => {
                    setConfirmEmail(e.target.value)
                    setEmailError(false)
                  }}
                  className="w-full"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleEmailSave} disabled={loading} size="sm">
                {loading ? "Speichern..." : "E-Mail speichern"}
              </Button>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Passwort"
        description="Ändern Sie Ihr Passwort für zusätzliche Sicherheit."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Neues Passwort
                  </label>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-4 w-4 flex items-center justify-center">
                    {passwordError ? (
                      <AlertCircle className="h-4 w-4 text-destructive absolute transition-opacity duration-200" />
                    ) : password && confirmPassword && password === confirmPassword ? (
                      <CheckCircle className="h-4 w-4 text-green-500 absolute transition-all duration-200" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50 absolute transition-all duration-200" />
                    )}
                  </div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Passwort bestätigen
                  </label>
                </div>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    setPasswordError(false)
                  }}
                  className="w-full"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handlePasswordSave} disabled={loading} size="sm">
                {loading ? "Speichern..." : "Passwort speichern"}
              </Button>
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      <ConnectedAccountsSection />
      <AuthorizedAppsSection />
    </div>
  )
};

export default SecuritySection;
