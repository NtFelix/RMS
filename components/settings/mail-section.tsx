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
  account_id?: string
  needs_reauth?: boolean
  token_expired?: boolean
  token_expires_in_hours?: number | null
}

interface SyncStatus {
  isImporting: boolean
  totalImported: number
  pagesProcessed: number
  status: 'idle' | 'processing' | 'completed' | 'failed'
  lastUpdated: string | null
  duplicatesSkipped?: number
}

const MailSection = () => {
  const supabase = createClient()
  const { toast } = useToast()
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return null

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`

    // For older dates, show the actual date
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  const [newMailPrefix, setNewMailPrefix] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("@mietevo.de")
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<MailAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [existingEmailCount, setExistingEmailCount] = useState(0)
  const [outlookConnection, setOutlookConnection] = useState<OutlookConnection | null>(null)
  const [isLoadingOutlook, setIsLoadingOutlook] = useState(true)
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false)
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false)
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isImporting: false,
    totalImported: 0,
    pagesProcessed: 0,
    status: 'idle',
    lastUpdated: null,
  })

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

  // Poll sync status when Outlook is connected
  useEffect(() => {
    if (!outlookConnection?.account_id) return

    const checkSyncStatus = async () => {
      try {
        // Get latest import job
        const { data: importJobs, error } = await supabase
          .from('Mail_Import_Jobs')
          .select('status, total_messages_imported, total_pages_processed, aktualisiert_am')
          .eq('account_id', outlookConnection.account_id)
          .order('erstellt_am', { ascending: false })
          .limit(1)
          .single()

        // Get total emails in database for this account
        const { count: totalInDb } = await supabase
          .from('Mail_Metadaten')
          .select('*', { count: 'exact', head: true })
          .eq('mail_account_id', outlookConnection.account_id)
          .eq('quelle', 'outlook')

        if (!error && importJobs) {
          const isProcessing = importJobs.status === 'processing' || importJobs.status === 'queued'
          setSyncStatus({
            isImporting: isProcessing,
            totalImported: totalInDb || 0, // Use actual DB count
            pagesProcessed: importJobs.total_pages_processed || 0,
            status: importJobs.status as any,
            lastUpdated: importJobs.aktualisiert_am,
          })
        } else {
          // No active import, but show total emails
          setSyncStatus(prev => ({
            ...prev,
            isImporting: false,
            totalImported: totalInDb || 0,
            status: 'idle',
          }))
        }
      } catch (error) {
        console.error('Error checking sync status:', error)
      }
    }

    // Check immediately
    checkSyncStatus()

    // Poll every 3 seconds if importing
    const interval = setInterval(() => {
      if (syncStatus.isImporting || isSyncingOutlook) {
        checkSyncStatus()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [outlookConnection?.account_id, syncStatus.isImporting, isSyncingOutlook])

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
        if (data.connected) {
          // Get account_id from Mail_Accounts
          const { data: account } = await supabase
            .from('Mail_Accounts')
            .select('id')
            .not('provider_user_id', 'is', null)
            .single()

          setOutlookConnection({
            ...data.connection,
            account_id: account?.id
          })
        } else {
          setOutlookConnection(null)
        }
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
    // Check if emails already exist
    if (outlookConnection?.account_id) {
      const { count } = await supabase
        .from('Mail_Metadaten')
        .select('*', { count: 'exact', head: true })
        .eq('mail_account_id', outlookConnection.account_id)
        .eq('quelle', 'outlook')

      if (count && count > 0) {
        setExistingEmailCount(count)
        setShowSyncConfirm(true)
        return
      }
    }

    // Proceed with sync
    performSync()
  }

  const performSync = async () => {
    setShowSyncConfirm(false)
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
        description: result.message || "E-Mail-Import wurde gestartet. Die E-Mails werden im Hintergrund importiert.",
        variant: "success",
      })

      // Set initial importing state
      setSyncStatus(prev => ({
        ...prev,
        isImporting: true,
        status: 'processing',
      }))

      loadOutlookStatus()
    } catch (error) {
      console.error("Error syncing Outlook:", error)

      // Check if re-authentication is required
      const errorResponse = error instanceof Error ? error.message : ""
      const requiresReauth = errorResponse.includes("Token refresh failed") ||
        errorResponse.includes("re-authentication")

      toast({
        title: "Fehler",
        description: requiresReauth
          ? "Ihre Outlook-Verbindung ist abgelaufen. Bitte verbinden Sie Ihr Konto erneut."
          : (error instanceof Error ? error.message : "E-Mails konnten nicht synchronisiert werden."),
        variant: "destructive",
      })

      // If re-auth required, reload status to show disconnect button
      if (requiresReauth) {
        loadOutlookStatus()
      }
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
        title="Mietevo E-Mail-Konten"
        description={`Erstellen und verwalten Sie Ihre @mietevo.de E-Mail-Adressen. (${mailAccounts.length}/2 erstellt)`}
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
                  disabled={true}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Domain wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="@mietevo.de">@mietevo.de</SelectItem>
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
                      className={`group relative flex items-center justify-between p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] hover:shadow-sm ${isLastRow ? 'mb-0' : ''
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
                <p className="text-xs mt-1">Erstellen Sie Ihr erstes Mietevo E-Mail-Konto oben.</p>
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="E-Mail-Verbindungen"
        description="Verbinden Sie externe E-Mail-Konten mit Mietevo."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Gmail Card */}
          <SettingsCard className="relative opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 py-2 min-w-0">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 ring-4 ring-red-50 dark:ring-red-900/10">
                <Mail className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-semibold text-sm mb-1">Gmail</h4>
                <p className="text-xs text-muted-foreground">
                  Verbinden Sie Ihr Gmail-Konto
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full mt-2 min-w-0">
                Verbinden
              </Button>
            </div>
          </SettingsCard>

          {/* Outlook Card */}
          <SettingsCard className="relative hover:shadow-md transition-all overflow-hidden">
            {outlookConnection && (
              <div className="absolute top-4 right-4 z-10">
                <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verbunden
                </Badge>
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-4 py-2 min-w-0">
              <div className={`p-4 rounded-full bg-blue-100 dark:bg-blue-900/20 ring-4 ring-blue-50 dark:ring-blue-900/10 transition-all ${syncStatus.isImporting ? 'animate-pulse' : ''
                }`}>
                <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="w-full min-w-0">
                <h4 className="font-semibold text-sm mb-1">Outlook</h4>
                {isLoadingOutlook ? (
                  <Skeleton className="h-4 w-32 mx-auto" />
                ) : outlookConnection ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground truncate px-2">
                      {outlookConnection.email}
                    </p>

                    {/* Sync Status Display */}
                    {syncStatus.isImporting ? (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                            Importiere E-Mails...
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Importiert:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {syncStatus.totalImported} E-Mails
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Seiten:</span>
                            <span className="font-medium text-foreground">
                              {syncStatus.pagesProcessed}
                            </span>
                          </div>
                          {outlookConnection?.last_sync_at && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Letzter Sync:</span>
                              <span className="font-medium text-foreground">
                                {formatRelativeTime(outlookConnection.last_sync_at)}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
                            style={{ width: '100%' }} />
                        </div>
                      </div>
                    ) : syncStatus.totalImported > 0 ? (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">
                              {syncStatus.totalImported} E-Mails importiert
                            </span>
                          </div>
                          {outlookConnection?.last_sync_at && (
                            <div className="text-center text-xs text-green-600/70 dark:text-green-400/70">
                              Letzter Sync: {formatRelativeTime(outlookConnection.last_sync_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground text-center">
                          {outlookConnection.needs_reauth ? (
                            <span className="text-amber-600 dark:text-amber-500">
                              ⚠️ Erneute Authentifizierung erforderlich
                            </span>
                          ) : outlookConnection.token_expired ? (
                            <span className="text-red-600 dark:text-red-500">
                              Token abgelaufen - bitte neu verbinden
                            </span>
                          ) : outlookConnection.token_expires_in_hours !== null && outlookConnection.token_expires_in_hours !== undefined && outlookConnection.token_expires_in_hours < 24 ? (
                            <span className="text-amber-600 dark:text-amber-500">
                              Token läuft in {outlookConnection.token_expires_in_hours}h ab
                            </span>
                          ) : outlookConnection.sync_enabled ? (
                            "Bereit zum Synchronisieren"
                          ) : (
                            "Sync deaktiviert"
                          )}
                        </p>
                        {outlookConnection?.last_sync_at && !outlookConnection.needs_reauth && !outlookConnection.token_expired && (
                          <p className="text-xs text-muted-foreground/70 text-center">
                            Letzter Sync: {formatRelativeTime(outlookConnection.last_sync_at)}
                          </p>
                        )}
                      </div>
                    )}
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
                <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncOutlook}
                    disabled={isSyncingOutlook || isDisconnectingOutlook || syncStatus.isImporting}
                    className="flex-1 min-w-0"
                  >
                    {isSyncingOutlook || syncStatus.isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                        <span className="truncate">Sync...</span>
                      </>
                    ) : (
                      <span className="truncate">Synchronisieren</span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectOutlook}
                    disabled={isDisconnectingOutlook || isSyncingOutlook || syncStatus.isImporting}
                    className="hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 hover:border-red-300 sm:w-auto min-w-0"
                  >
                    {isDisconnectingOutlook ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="truncate">Trennen</span>
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
          <SettingsCard className="relative opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary" className="text-xs">
                Demnächst
              </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 py-2 min-w-0">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-900/20 ring-4 ring-gray-50 dark:ring-gray-900/10">
                <Mail className="h-7 w-7 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-semibold text-sm mb-1">IMAP</h4>
                <p className="text-xs text-muted-foreground">
                  Verbinden Sie per IMAP
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="w-full mt-2 min-w-0">
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

      <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-Mails erneut synchronisieren?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Sie haben bereits <strong>{existingEmailCount} E-Mails</strong> aus diesem Outlook-Konto importiert.
              </p>
              <p>
                Beim erneuten Synchronisieren werden nur neue E-Mails importiert.
                Bereits vorhandene E-Mails werden automatisch übersprungen und nicht dupliziert.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tipp: Verwenden Sie diese Funktion, um neue E-Mails abzurufen, die seit dem letzten Import eingegangen sind.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={performSync}>
              Neue E-Mails importieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default MailSection
