"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { User as UserIcon, Mail, Lock, CreditCard } from "lucide-react"

type SettingsModalProps = { open: boolean; onOpenChange: (open: boolean) => void }
type Tab = { value: string; label: string; icon: React.ElementType; content: React.ReactNode }

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [confirmEmail, setConfirmEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    supabase.auth.getUser().then(res => {
      const user = res.data.user
      if (user) {
        setFirstName(user.user_metadata?.first_name || "")
        setLastName(user.user_metadata?.last_name || "")
        setEmail(user.email || "")
        setConfirmEmail(user.email || "")
      }
    })
  }, [supabase])

  const handleProfileSave = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
    setLoading(false)
    error ? toast.error("Fehler beim Profil speichern") : toast.success("Profil gespeichert")
  }
  const handleEmailSave = async () => {
    if (email !== confirmEmail) return toast.error("E-Mail stimmt nicht überein")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    error ? toast.error("Fehler beim E-Mail speichern") : toast.success("E-Mail gespeichert")
  }
  const handlePasswordSave = async () => {
    if (password !== confirmPassword) return toast.error("Passwörter stimmen nicht überein")
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    error ? toast.error("Fehler beim Passwort speichern") : toast.success("Passwort gespeichert")
  }

  const tabs: Tab[] = [
    {
      value: "profile",
      label: "Profil",
      icon: UserIcon,
      content: (
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium">Vorname</label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nachname</label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handleProfileSave} disabled={loading}>
            {loading ? "Speichern..." : "Profil speichern"}
          </Button>
        </div>
      ),
    },
    {
      value: "security",
      label: "Sicherheit",
      icon: Lock,
      content: (
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium">E-Mail</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bestätige E-Mail</label>
            <Input
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handleEmailSave} disabled={loading}>
            {loading ? "Speichern..." : "E-Mail speichern"}
          </Button>
          <div>
            <label className="text-sm font-medium">Passwort</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bestätige Passwort</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <Button onClick={handlePasswordSave} disabled={loading}>
            {loading ? "Speichern..." : "Passwort speichern"}
          </Button>
        </div>
      ),
    },
    {
      value: "subscription",
      label: "Abo",
      icon: CreditCard,
      content: (
        <div className="flex flex-col space-y-4">
          <p className="text-sm">Verwalte dein Abo hier.</p>
          <Button onClick={() => alert("Aboverwaltung kommt bald")}>
            Abo verwalten
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay />
      <DialogContent className="w-[520px] h-[60vh] max-w-full max-h-full overflow-hidden mt-2 ml-2">
          <DialogTitle className="sr-only">Einstellungen</DialogTitle>
        <div className="flex h-full overflow-hidden">
          <nav className="w-36 min-w-[9rem] flex flex-col gap-1 py-1 px-0 mr-4 sticky top-0">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md transition-colors outline-none',
                  activeTab === tab.value
                    ? 'bg-accent text-accent-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:bg-muted focus:bg-accent/60 focus:text-accent-foreground',
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex-1 flex flex-col">
            <section className="flex-1 overflow-y-auto p-3">
              {tabs.find(tab => tab.value === activeTab)?.content}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
