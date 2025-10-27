"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { Mail, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"

interface MailAccount {
  id: string
  mailadresse: string
  ist_aktiv: boolean
  erstellungsdatum: string
}

const MailSection = () => {
  const supabase = createClient()
  const { toast } = useToast()
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [newMailPrefix, setNewMailPrefix] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("@mietfluss.de")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadMailAccounts()
  }, [])

  const loadMailAccounts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("Mail_Accounts")
        .select("*")
        .order("erstellungsdatum", { ascending: false })

      if (error) throw error
      setMailAccounts(data || [])
    } catch (error) {
      console.error("Error loading mail accounts:", error)
      toast({
        title: "Fehler",
        description: "E-Mail-Konten konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMailAccount = async () => {
    if (!newMailPrefix.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen E-Mail-Präfix ein.",
        variant: "destructive",
      })
      return
    }

    // Validate email prefix (only alphanumeric, dots, hyphens, underscores)
    const emailRegex = /^[a-zA-Z0-9._-]+$/
    if (!emailRegex.test(newMailPrefix)) {
      toast({
        title: "Fehler",
        description: "Der E-Mail-Präfix darf nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche enthalten.",
        variant: "destructive",
      })
      return
    }

    const fullEmail = `${newMailPrefix}${selectedDomain}`

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from("Mail_Accounts")
        .insert([
          {
            mailadresse: fullEmail,
            ist_aktiv: true,
            erstellungsdatum: new Date().toISOString().split('T')[0],
          },
        ])
        .select()

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Fehler",
            description: "Diese E-Mail-Adresse existiert bereits.",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: "Erfolg",
        description: `E-Mail-Konto ${fullEmail} wurde erfolgreich erstellt.`,
        variant: "success",
      })

      setNewMailPrefix("")
      loadMailAccounts()
    } catch (error) {
      console.error("Error creating mail account:", error)
      toast({
        title: "Fehler",
        description: "E-Mail-Konto konnte nicht erstellt werden.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteMailAccount = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from("Mail_Accounts")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Erfolg",
        description: `E-Mail-Konto ${email} wurde gelöscht.`,
        variant: "success",
      })

      loadMailAccounts()
    } catch (error) {
      console.error("Error deleting mail account:", error)
      toast({
        title: "Fehler",
        description: "E-Mail-Konto konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("Mail_Accounts")
        .update({ ist_aktiv: !currentStatus })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Erfolg",
        description: `E-Mail-Konto wurde ${!currentStatus ? "aktiviert" : "deaktiviert"}.`,
        variant: "success",
      })

      loadMailAccounts()
    } catch (error) {
      console.error("Error toggling mail account status:", error)
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Mietfluss E-Mail-Konten"
        description="Erstellen und verwalten Sie Ihre @mietfluss.de oder @mietfluss.com E-Mail-Adressen."
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <Input
                  value={newMailPrefix}
                  onChange={(e) => setNewMailPrefix(e.target.value.toLowerCase())}
                  placeholder="name"
                  className="flex-1"
                  disabled={isCreating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateMailAccount()
                    }
                  }}
                />
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  disabled={isCreating}
                >
                  <option value="@mietfluss.de">@mietfluss.de</option>
                  <option value="@mietfluss.com">@mietfluss.com</option>
                </select>
              </div>
              <Button
                onClick={handleCreateMailAccount}
                disabled={isCreating || !newMailPrefix.trim()}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? "Erstellen..." : "E-Mail erstellen"}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3 mt-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : mailAccounts.length > 0 ? (
              <div className="space-y-3 mt-6">
                {mailAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{account.mailadresse}</p>
                          {account.ist_aktiv ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inaktiv
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Erstellt am {new Date(account.erstellungsdatum).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(account.id, account.ist_aktiv)}
                      >
                        {account.ist_aktiv ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMailAccount(account.id, account.mailadresse)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Noch keine E-Mail-Konten erstellt.</p>
                <p className="text-xs mt-1">Erstellen Sie Ihr erstes Mietfluss E-Mail-Konto oben.</p>
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="E-Mail-Verbindungen"
        description="Verbinden Sie externe E-Mail-Konten mit Mietfluss."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gmail Card */}
          <SettingsCard className="relative opacity-60 cursor-not-allowed">
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Gmail</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Verbinden Sie Ihr Gmail-Konto
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full">
                Verbinden
              </Button>
            </div>
          </SettingsCard>

          {/* Outlook Card */}
          <SettingsCard className="relative opacity-60 cursor-not-allowed">
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Outlook</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Verbinden Sie Ihr Outlook-Konto
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full">
                Verbinden
              </Button>
            </div>
          </SettingsCard>

          {/* IMAP Card */}
          <SettingsCard className="relative opacity-60 cursor-not-allowed">
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/20">
                <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">IMAP</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Verbinden Sie per IMAP
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full">
                Verbinden
              </Button>
            </div>
          </SettingsCard>
        </div>
      </SettingsSection>
    </div>
  )
}

export default MailSection
