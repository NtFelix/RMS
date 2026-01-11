import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

export interface MailAccount {
    id: string
    mailadresse: string
    ist_aktiv: boolean
    erstellungsdatum: string
}

interface UseMietevoAccountsReturn {
    // State
    mailAccounts: MailAccount[]
    loading: boolean
    newMailPrefix: string
    selectedDomain: string
    isCreating: boolean
    showDeleteConfirm: boolean
    accountToDelete: MailAccount | null
    isDeleting: boolean

    // Setters
    setNewMailPrefix: (value: string) => void
    setSelectedDomain: (value: string) => void

    // Actions
    handleCreateMailAccount: () => Promise<void>
    handleDeleteMailAccount: () => Promise<void>
    handleToggleActive: (id: string, currentStatus: boolean) => Promise<void>
    initiateDelete: (account: MailAccount) => void
    cancelDelete: () => void
    loadMailAccounts: () => Promise<void>
}

export function useMietevoAccounts(): UseMietevoAccountsReturn {
    const supabase = createClient()
    const { toast } = useToast()

    const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [newMailPrefix, setNewMailPrefix] = useState("")
    const [selectedDomain, setSelectedDomain] = useState("@mietevo.de")
    const [isCreating, setIsCreating] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [accountToDelete, setAccountToDelete] = useState<MailAccount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const loadMailAccounts = useCallback(async () => {
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
    }, [supabase, toast])

    useEffect(() => {
        loadMailAccounts()
    }, [loadMailAccounts])

    const handleCreateMailAccount = useCallback(async () => {
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

        // Validate email prefix
        const emailRegex = /^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+$/
        if (!emailRegex.test(newMailPrefix)) {
            toast({
                title: "Fehler",
                description: "Der E-Mail-Präfix muss im Format 'vorname.nachname' sein (Kleinbuchstaben, Punkte und Bindestriche erlaubt).",
                variant: "destructive",
            })
            return
        }

        const fullEmail = `${newMailPrefix}${selectedDomain}`

        setIsCreating(true)
        try {
            const { error } = await supabase
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
    }, [mailAccounts.length, newMailPrefix, selectedDomain, supabase, toast, loadMailAccounts])

    const handleDeleteMailAccount = useCallback(async () => {
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
    }, [accountToDelete, supabase, toast, loadMailAccounts])

    const handleToggleActive = useCallback(async (id: string, currentStatus: boolean) => {
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
    }, [supabase, toast, loadMailAccounts])

    const initiateDelete = useCallback((account: MailAccount) => {
        setAccountToDelete(account)
        setShowDeleteConfirm(true)
    }, [])

    const cancelDelete = useCallback(() => {
        setShowDeleteConfirm(false)
        setAccountToDelete(null)
    }, [])

    return {
        mailAccounts,
        loading,
        newMailPrefix,
        selectedDomain,
        isCreating,
        showDeleteConfirm,
        accountToDelete,
        isDeleting,
        setNewMailPrefix,
        setSelectedDomain,
        handleCreateMailAccount,
        handleDeleteMailAccount,
        handleToggleActive,
        initiateDelete,
        cancelDelete,
        loadMailAccounts,
    }
}
