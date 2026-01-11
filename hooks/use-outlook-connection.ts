import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

export interface OutlookConnection {
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

export interface SyncStatus {
    isImporting: boolean
    totalImported: number
    pagesProcessed: number
    status: 'idle' | 'processing' | 'completed' | 'failed'
    lastUpdated: string | null
    duplicatesSkipped?: number
}

interface UseOutlookConnectionReturn {
    // State
    outlookConnection: OutlookConnection | null
    isLoadingOutlook: boolean
    isConnectingOutlook: boolean
    isDisconnectingOutlook: boolean
    isSyncingOutlook: boolean
    syncStatus: SyncStatus
    showSyncConfirm: boolean
    existingEmailCount: number

    // Actions
    handleConnectOutlook: () => void
    handleDisconnectOutlook: () => Promise<void>
    handleSyncOutlook: () => Promise<void>
    performSync: () => Promise<void>
    cancelSyncConfirm: () => void
    loadOutlookStatus: () => Promise<void>
}

export function useOutlookConnection(): UseOutlookConnectionReturn {
    const supabase = createClient()
    const { toast } = useToast()

    const [outlookConnection, setOutlookConnection] = useState<OutlookConnection | null>(null)
    const [isLoadingOutlook, setIsLoadingOutlook] = useState(true)
    const [isConnectingOutlook, setIsConnectingOutlook] = useState(false)
    const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false)
    const [isSyncingOutlook, setIsSyncingOutlook] = useState(false)
    const [showSyncConfirm, setShowSyncConfirm] = useState(false)
    const [existingEmailCount, setExistingEmailCount] = useState(0)
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isImporting: false,
        totalImported: 0,
        pagesProcessed: 0,
        status: 'idle',
        lastUpdated: null,
    })

    const loadOutlookStatus = useCallback(async () => {
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
    }, [supabase])

    // Check OAuth callback results on mount
    useEffect(() => {
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
    }, [loadOutlookStatus, toast])

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
                        totalImported: totalInDb || 0,
                        pagesProcessed: importJobs.total_pages_processed || 0,
                        status: importJobs.status as SyncStatus['status'],
                        lastUpdated: importJobs.aktualisiert_am,
                    })
                } else {
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

        checkSyncStatus()

        const interval = setInterval(() => {
            if (syncStatus.isImporting || isSyncingOutlook) {
                checkSyncStatus()
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [outlookConnection?.account_id, syncStatus.isImporting, isSyncingOutlook, supabase])

    const handleConnectOutlook = useCallback(() => {
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
    }, [toast])

    const handleDisconnectOutlook = useCallback(async () => {
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
    }, [toast])

    const performSync = useCallback(async () => {
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

            setSyncStatus(prev => ({
                ...prev,
                isImporting: true,
                status: 'processing',
            }))

            loadOutlookStatus()
        } catch (error) {
            console.error("Error syncing Outlook:", error)

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

            if (requiresReauth) {
                loadOutlookStatus()
            }
        } finally {
            setIsSyncingOutlook(false)
        }
    }, [toast, loadOutlookStatus])

    const handleSyncOutlook = useCallback(async () => {
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

        performSync()
    }, [outlookConnection?.account_id, supabase, performSync])

    const cancelSyncConfirm = useCallback(() => {
        setShowSyncConfirm(false)
    }, [])

    return {
        outlookConnection,
        isLoadingOutlook,
        isConnectingOutlook,
        isDisconnectingOutlook,
        isSyncingOutlook,
        syncStatus,
        showSyncConfirm,
        existingEmailCount,
        handleConnectOutlook,
        handleDisconnectOutlook,
        handleSyncOutlook,
        performSync,
        cancelSyncConfirm,
        loadOutlookStatus,
    }
}
