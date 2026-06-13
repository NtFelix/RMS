"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { GoogleIcon } from "@/components/icons/google-icon"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { Loader2, Link as LinkIcon, Unlink, Check, Zap, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Identity {
    id: string
    user_id: string
    identity_data?: {
        [key: string]: any
    }
    provider: string
    created_at?: string
    last_sign_in_at?: string
    updated_at?: string
}

interface UserAppMetadata {
    provider?: string
    providers?: string[]
    [key: string]: any
}

interface ConnectedAccountsSectionProps {
    onUpdate?: () => void
}

const ConnectedAccountsSection = ({ onUpdate }: ConnectedAccountsSectionProps) => {
    const supabase = createClient()
    const { toast } = useToast()
    const [identities, setIdentities] = useState<Identity[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string>("")
    const [appMetadata, setAppMetadata] = useState<UserAppMetadata>({})
    const [userMetadata, setUserMetadata] = useState<any>({})
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
    const [emailForm, setEmailForm] = useState({ email: "", password: "", confirmPassword: "" })

    const fetchIdentities = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error

            if (user?.identities) {
                setIdentities(user.identities)
            }
            if (user?.app_metadata) {
                setAppMetadata(user.app_metadata)
            }
            if (user?.user_metadata) {
                setUserMetadata(user.user_metadata)
            }
            if (user?.email) {
                setUserEmail(user.email)
                setEmailForm(prev => ({ ...prev, email: user.email || "", password: "", confirmPassword: "" }))
            }
        } catch (error) {
            console.error("Error fetching identities:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIdentities()
    }, [])

    const handleUnlink = async (identity?: Identity, providerId?: string) => {
        const idToLoading = identity?.id || providerId || 'unknown'
        setActionLoading(idToLoading)
        try {
            if (identity) {
                const { error } = await supabase.auth.unlinkIdentity(identity as any)
                if (error) throw error
            }

            // If it's the email provider, we also want to clear our custom metadata flag
            if (providerId === 'email' || (identity && identity.provider === 'email')) {
                const { error: metaError } = await supabase.auth.updateUser({
                    data: { email_connected: false }
                })
                if (metaError) console.error("Error clearing email metadata:", metaError)

                // Also update local state to be responsive
                setUserMetadata((prev: any) => ({ ...prev, email_connected: false }))
            }

            toast({
                title: "Erfolg",
                description: "Verknüpfung erfolgreich aufgehoben.",
                variant: "success",
            })

            // Refresh identities
            fetchIdentities()
            onUpdate?.()
        } catch (error: any) {
            console.error("Unlink error:", error)
            toast({
                title: "Fehler",
                description: `Fehler beim Aufheben der Verknüpfung: ${error.message || 'Unbekannter Fehler'}`,
                variant: "destructive",
            })
        } finally {
            setActionLoading(null)
        }
    }

    const handleLink = async (provider: string) => {
        setActionLoading(provider)
        try {
            const { data, error } = await supabase.auth.linkIdentity({
                provider: provider as any,
                options: {
                    redirectTo: `${window.location.origin}/settings/account`,
                }
            })
            if (error) throw error

            // For OAuth providers, linkIdentity typically redirects. 
            // If it returns data without redirect (which is rare for OAuth), we might need to handle it.
            if (data?.url) {
                window.location.href = data.url
                return // Don't stop loading, let the redirect happen
            }

            toast({
                title: "Verbindung wird hergestellt",
                description: "Sie werden weitergeleitet, um die Verbindung zu bestätigen.",
            })

        } catch (error: any) {
            console.error("Link error:", error)
            toast({
                title: "Fehler",
                description: `Fehler beim Verbinden: ${error.message || 'Unbekannter Fehler'}`,
                variant: "destructive",
            })
            setActionLoading(null)
        }
    }

    const handleEmailLink = async () => {
        if (!emailForm.password) {
            toast({
                title: "Fehler",
                description: "Bitte geben Sie ein Passwort ein.",
                variant: "destructive",
            })
            return
        }

        if (emailForm.password !== emailForm.confirmPassword) {
            toast({
                title: "Fehler",
                description: "Die Passwörter stimmen nicht überein.",
                variant: "destructive",
            })
            return
        }

        setActionLoading('email')
        try {
            const updates: any = {
                password: emailForm.password,
                data: { email_connected: true }
            }
            // Only update email if it changed, to avoid unnecessary confirmation emails
            if (emailForm.email && emailForm.email !== userEmail) {
                updates.email = emailForm.email
            }

            const { error } = await supabase.auth.updateUser(updates)

            if (error) throw error

            toast({
                title: "Erfolg",
                description: updates.email
                    ? "Bitte überprüfen Sie Ihre E-Mails zur Bestätigung."
                    : "Passwort erfolgreich gesetzt. Sie können sich nun mit E-Mail und Passwort anmelden.",
                variant: "success",
            })



            setIsEmailDialogOpen(false)

            // Optimistically update appMetadata to show "Connected" immediately
            if (!updates.email) {
                setAppMetadata(prev => ({
                    ...prev,
                    providers: [...(prev.providers || []), 'email']
                }))
            }

            // Force session refresh to allow app_metadata to update from server
            await supabase.auth.refreshSession()
            fetchIdentities()
            onUpdate?.()
        } catch (error: any) {
            console.error("Email link error:", error)
            toast({
                title: "Fehler",
                description: `Fehler beim Verknüpfen: ${error.message || 'Unbekannter Fehler'}`,
                variant: "destructive",
            })
        } finally {
            setActionLoading(null)
        }
    }

    const providers = [
        {
            id: 'google',
            name: 'Google',
            icon: GoogleIcon,
        },
        {
            id: 'azure', // Supabase often uses 'azure' for Microsoft
            name: 'Microsoft',
            icon: MicrosoftIcon,
        },
        {
            id: 'email',
            name: 'E-Mail',
            icon: Mail,
        }
    ]


    if (loading) {
        return (
            <SettingsSection
                title="Verknüpfte Konten"
                description="Verwalten Sie Ihre verknüpften Social-Media-Konten und OAuth-Anwendungen."
            >
                <SettingsCard>
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </SettingsCard>
            </SettingsSection>
        )
    }

    return (
        <SettingsSection
            title="Verknüpfte Konten"
            description="Verwalten Sie Ihre verknüpften Social-Media-Konten und OAuth-Anwendungen."
        >
            <SettingsCard>
                <div className="space-y-6">
                    {providers.map((provider) => {
                        // Check for 'azure' which maps to Microsoft in Supabase usually, 
                        // but let's check both just in case or adjust based on actual data
                        // Usually 'google' is 'google', 'microsoft' is 'azure' or 'microsoft'
                        // Let's stick to the ID defined in the provider object for lookup first
                        // But we might need to be flexible if Supabase returns 'microsoft' instead of 'azure'
                        // Let's stick to the ID defined in the provider object for lookup first
                        const identity = identities.find(id => id.provider === provider.id || (provider.id === 'azure' && id.provider === 'microsoft'))

                        // Check explicit connection status via app_metadata for robustness, especially for 'email'
                        const isProviderInMetadata = appMetadata.providers?.includes(provider.id === 'azure' ? 'microsoft' : provider.id)

                        // Revised logic: check identity, app_metadata, AND our custom user_metadata flag
                        const isConnected = !!identity || (provider.id === 'email' && (isProviderInMetadata || userMetadata?.email_connected))

                        // Prevent unlinking if only one identity exists
                        // Robust check: check how many providers are listed in metadata OR our custom flag
                        const emailIsConnected = (provider.id === 'email' && isConnected) || appMetadata.providers?.includes('email') || userMetadata?.email_connected
                        const baseProviders = appMetadata.providers || []
                        const uniqueProviders = new Set([...baseProviders, ...(identities.map(id => id.provider))])
                        if (userMetadata?.email_connected) uniqueProviders.add('email')

                        const canUnlink = uniqueProviders.size > 1
                        const isLoading = actionLoading === (identity?.id || provider.id)

                        return (
                            <div key={provider.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                        <provider.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{provider.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {isConnected
                                                ? `Verbunden als ${identity?.identity_data?.email || identity?.identity_data?.name || (provider.id === 'email' ? userEmail : 'Unbekannt')}`
                                                : "Nicht verbunden"
                                            }
                                        </p>
                                    </div>
                                </div>

                                {isConnected ? (
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-200/50 text-xs font-medium">
                                            <Check className="h-3.5 w-3.5" />
                                            Verbunden
                                        </div>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 px-3 gap-2 transition-all duration-200"
                                                    disabled={isLoading || !canUnlink}
                                                    title={!canUnlink ? "Sie müssen mindestens eine Anmeldemethode behalten." : "Verbindung trennen"}
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Unlink className="h-4 w-4" />
                                                    )}
                                                    <span className="hidden sm:inline">Trennen</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Verknüpfung aufheben?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Möchten Sie die Verbindung zu Ihrem <strong>{provider.name}</strong>-Konto wirklich trennen?
                                                        Sie können sich danach nicht mehr über diesen Anbieter einloggen, es sei denn, Sie verknüpfen ihn erneut.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleUnlink(identity, provider.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Verbindung trennen
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ) : (
                                    provider.id === 'email' ? (
                                        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 gap-2"
                                                >
                                                    <Zap className="h-3.5 w-3.5" />
                                                    Verbinden
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>E-Mail Login einrichten</DialogTitle>
                                                    <DialogDescription>
                                                        Setzen Sie ein Passwort, um sich zusätzlich mit Ihrer E-Mail-Adresse anmelden zu können.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="email">E-Mail</Label>
                                                        <Input
                                                            id="email"
                                                            type="email"
                                                            value={emailForm.email}
                                                            onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                                                            placeholder="name@example.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="password">Passwort</Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            value={emailForm.password}
                                                            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                                                        <Input
                                                            id="confirmPassword"
                                                            type="password"
                                                            value={emailForm.confirmPassword}
                                                            onChange={(e) => setEmailForm({ ...emailForm, confirmPassword: e.target.value })}
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Abbrechen</Button>
                                                    <Button onClick={handleEmailLink} disabled={!!actionLoading}>
                                                        {actionLoading === 'email' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Speichern
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-2"
                                            onClick={() => handleLink(provider.id)}
                                            disabled={!!actionLoading}
                                        >
                                            <Zap className="h-3.5 w-3.5" />
                                            Verbinden
                                        </Button>
                                    )
                                )}
                            </div>
                        )
                    })}

                    {/* Show other identities that might not be in our explicit list */}
                    {identities.filter(id => !providers.find(p => p.id === id.provider || (p.id === 'azure' && id.provider === 'microsoft'))).map(identity => {
                        const canUnlink = identities.length > 1

                        return (
                            <div key={identity.id} className="flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted/30 rounded-lg">
                                        <LinkIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm capitalize">{identity.provider}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Verbunden als {identity.identity_data?.email || identity.identity_data?.name || 'Unbekannt'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-200/50 text-xs font-medium">
                                        <Check className="h-3.5 w-3.5" />
                                        Verbunden
                                    </div>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 px-3 gap-2 transition-all duration-200"
                                                disabled={actionLoading === identity.id || !canUnlink}
                                                title={!canUnlink ? "Sie müssen mindestens eine Anmeldemethode behalten." : "Verbindung trennen"}
                                            >
                                                {actionLoading === identity.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Unlink className="h-4 w-4" />
                                                )}
                                                <span className="hidden sm:inline">Trennen</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Verknüpfung aufheben?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Möchten Sie die Verbindung zu diesem <strong>{identity.provider}</strong>-Konto wirklich trennen?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleUnlink(identity, identity.provider)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Verbindung trennen
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </SettingsCard>
        </SettingsSection>
    )
}

export default ConnectedAccountsSection
