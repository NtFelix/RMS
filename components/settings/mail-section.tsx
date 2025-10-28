"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { Mail, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

interface MailAccount {
  id: string
  mailadresse: string
  ist_aktiv: boolean
  erstellungsdatum: string
}

interface OutlookConnection {
  email: string
  is_active: boolean
  sync_enabled: boolean
  connected_at: string
  last_sync_at: string | null
}

const MailSection = () => {
  const supabase = createClient()
  const { toast } = useToast()
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [newMailPrefix, setNewMailPrefix] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("@mietfluss.de")
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<MailAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [outlookConnection, setOutlookConnection] = useState<OutlookConnection | null>(null)
  const [isLoadingOutlook, setIsLoadingOutlook] = useState(true)
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false)
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false)
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false)

  useEffect(() => {
    loadMailAccounts()
    loadOutlookStatus()
    
    // Check for OAuth callback results
    const params = new URLSearchParams(window.location.search)
    if (params.get("outlook_success")) {
      toast({
        title: "Erfolg",
        description: "Outlook-Konto erfolgreich verbunden.",
        variant: "success",
      })
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
      loadOutlookStatus()
    } else if (params.get("outlook_error")) {
      toast({
        title: "Fehler",
        description: "Outlook-Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
      window.history.replaceState({}, "", window.location.pathname)
    }
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

  const loadOutlookStatus = async () => {
    setIsLoadingOutlook(true)
    try {
      const response = await fetch("/api/auth/outlook/status")
      if (response.ok) {
        const data = await response.json()
        setOutlookConnection(data.connected ? data.connection : null)
      }
    } catch (error) {
      console.error("Error loading Outlook status:", error)
    } finally {
      setIsLoadingOutlook(false)
    }
  }

  const handleConnectOutlook = async () => {
    setIsConnectingOutlook(true)
    try {
      window.location.href = "/api/auth/outlook"
    } catch (error) {
      console.error("Error connecting Outlook:", error)
      toast({
        title: "Fehler",
        description: "Outlook-Verbindung konnte nicht gestartet werden.",
        variant: "destructive",
      })
      setIsConnectingOutlook(false)
    }
  }

  const handleDisconnectOutlook = async () => {
    setIsDisconnectingOutlook(true)
    try {
      const response = await fetch("/api/auth/outlook/disconnect", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to disconnect")

      toast({
        title: "Erfolg",
        description: "Outlook-Konto wurde getrennt.",
        variant: "success",
      })

      setOutlookConnection(null)
    } catch (error) {
      console.error("Error disconnecting Outlook:", error)
      toast({
        title: "Fehler",
        description: "Outlook-Konto konnte nicht getrennt werden.",
        variant: "destructive",
      })
    } finally {
      setIsDisconnectingOutlook(false)
    }
  }

  const handleSyncOutlook = async () => {
    setIsSyncingOutlook(true)
    try {
      const response = await fetch("/api/mail/outlook/sync", {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Sync failed")
      }

      const result = await response.json()

      toast({
        title: "Erfolg",
        description: `${result.messageCount} E-Mails synchronisiert.`,
        variant: "success",
      })

      loadOutlookStatus()
    } catch (error) {
      console.error("Error syncing Outlook:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "E-Mails konnten nicht synchronisiert werden.",
        variant: "destructive",
      })
    } finally {
      setIsSyncingOutlook(false)
    }
  }

  const handleCreateMailAccount = async () => {
    // Check if user already has 2 email accounts
    if (mailAccounts.length >= 2) {
      toast({
        title: "Limit erreicht",
        description: "Sie können maximal 2 E-Mail-Konten erstellen.",
        variant: "destructive",
      })
      return
    }

    if (!newMailPrefix.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen E-Mail-Präfix ein.",
        variant: "destructive",
      })
      return
    }

    // Validate email prefix must contain a dot and follow firstname.lastname format
    const emailRegex = /^[a-z]+\.[a-z]+$/
    if (!emailRegex.test(newMailPrefix)) {
      toast({
        title: "Fehler",
        description: "Der E-Mail-Präfix muss im Format 'vorname.nachname' sein (nur Kleinbuchstaben und ein Punkt).",
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

  const handleDeleteMailAccount = async () => {
    if (!accountToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("Mail_Accounts")
        .delete()
        .eq("id", accountToDelete.id)

      if (error) throw error

      toast({
        title: "Erfolg",
        description: `E-Mail-Konto ${accountToDelete.mailadresse} wurde gelöscht.`,
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
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setAccountToDelete(null)
    }
  }

  const initiateDelete = (account: MailAccount) => {
    setAccountToDelete(account)
    setShowDeleteConfirm(true)
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
        description={`Erstellen und verwalten Sie Ihre @mietfluss.de oder @mietfluss.com E-Mail-Adressen. (${mailAccounts.length}/2 erstellt)`}
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <Input
                  value={newMailPrefix}
                  onChange={(e) => setNewMailPrefix(e.target.value.toLowerCase())}
                  placeholder="vorname.nachname"
                  className="flex-1"
                  disabled={isCreating || mailAccounts.length >= 2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateMailAccount()
                    }
                  }}
                />
                <Select
                  value={selectedDomain}
                  onValueChange={setSelectedDomain}
                  disabled={isCreating}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Domain wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="@mietfluss.de">@mietfluss.de</SelectItem>
                    <SelectItem value="@mietfluss.com">@mietfluss.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateMailAccount}
                disabled={isCreating || !newMailPrefix.trim() || mailAccounts.length >= 2}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? "Erstellen..." : mailAccounts.length >= 2 ? "Limit erreicht (2/2)" : "E-Mail erstellen"}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3 mt-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : mailAccounts.length > 0 ? (
              <div className="space-y-3 mt-6">
                {mailAccounts.map((account, index) => {
                  const isLastRow = index === mailAccounts.length - 1
                  return (
                    <div
                      key={account.id}
                      className={`group relative flex items-center justify-between p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] hover:shadow-sm ${
                        isLastRow ? 'mb-0' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{account.mailadresse}</p>
                            {account.ist_aktiv ? (
                              <Badge variant="default" className="text-xs shrink-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aktiv
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inaktiv
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Erstellt am {new Date(account.erstellungsdatum).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(account.id, account.ist_aktiv)}
                          className="h-9 hover:bg-white dark:hover:bg-gray-700"
                        >
                          {account.ist_aktiv ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => initiateDelete(account)}
                          className="h-9 w-9 p-0 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Mail className="h-8 w-8 text-primary/50" />
                </div>
                <p className="text-sm font-medium">Noch keine E-Mail-Konten erstellt.</p>
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
          <SettingsCard className="relative opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity">
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 ring-4 ring-red-50 dark:ring-red-900/10">
                <Mail className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Gmail</h4>
                <p className="text-xs text-muted-foreground">
                  Verbinden Sie Ihr Gmail-Konto
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full mt-2">
                Verbinden
              </Button>
            </div>
          </SettingsCard>

          {/* Outlook Card */}
          <SettingsCard className="relative hover:shadow-md transition-all">
            {outlookConnection && (
              <div className="absolute top-4 right-4 z-10">
                <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verbunden
                </Badge>
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/20 ring-4 ring-blue-50 dark:ring-blue-900/10">
                <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Outlook</h4>
                {isLoadingOutlook ? (
                  <Skeleton className="h-4 w-32 mx-auto" />
                ) : outlookConnection ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">
                      {outlookConnection.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {outlookConnection.sync_enabled ? "Sync aktiviert" : "Sync deaktiviert"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Verbinden Sie Ihr Outlook-Konto
                  </p>
                )}
              </div>
              {isLoadingOutlook ? (
                <Skeleton className="h-9 w-full" />
              ) : outlookConnection ? (
                <div className="flex gap-2 w-full mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncOutlook}
                    disabled={isSyncingOutlook || isDisconnectingOutlook}
                    className="flex-1"
                  >
                    {isSyncingOutlook ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sync...
                      </>
                    ) : (
                      "Synchronisieren"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectOutlook}
                    disabled={isDisconnectingOutlook || isSyncingOutlook}
                    className="hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 hover:border-red-300"
                  >
                    {isDisconnectingOutlook ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Trennen"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectOutlook}
                  disabled={isConnectingOutlook}
                  className="w-full mt-2"
                >
                  {isConnectingOutlook ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verbinden...
                    </>
                  ) : (
                    "Verbinden"
                  )}
                </Button>
              )}
            </div>
          </SettingsCard>

          {/* IMAP Card */}
          <SettingsCard className="relative opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity">
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-900/20 ring-4 ring-gray-50 dark:ring-gray-900/10">
                <Mail className="h-7 w-7 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">IMAP</h4>
                <p className="text-xs text-muted-foreground">
                  Verbinden Sie per IMAP
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full mt-2">
                Verbinden
              </Button>
            </div>
          </SettingsCard>
        </div>
      </SettingsSection>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-Mail-Konto löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das E-Mail-Konto <strong>{accountToDelete?.mailadresse}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMailAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default MailSection
