"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { GoogleIcon } from "@/components/icons/google-icon"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { Loader2, Link as LinkIcon, Unlink, Check, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

const ConnectedAccountsSection = () => {
    const supabase = createClient()
    const { toast } = useToast()
    const [identities, setIdentities] = useState<Identity[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchIdentities = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error

            if (user?.identities) {
                setIdentities(user.identities)
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

    const handleUnlink = async (identity: Identity) => {
        setActionLoading(identity.id)
        try {
            const { error } = await supabase.auth.unlinkIdentity(identity as any)
            if (error) throw error

            toast({
                title: "Erfolg",
                description: "Verknüpfung erfolgreich aufgehoben.",
                variant: "success",
            })

            // Refresh identities
            fetchIdentities()
        } catch (error: any) {
            toast({
                title: "Fehler",
                description: `Fehler beim Aufheben der Verknüpfung: ${error.message}`,
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
                        const identity = identities.find(id => id.provider === provider.id || (provider.id === 'azure' && id.provider === 'microsoft'))
                        const isConnected = !!identity

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
                                                ? `Verbunden als ${identity?.identity_data?.email || identity?.identity_data?.name || 'Unbekannt'}`
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
                                                    disabled={actionLoading === identity?.id}
                                                >
                                                    {actionLoading === identity?.id ? (
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
                                                        onClick={() => identity && handleUnlink(identity)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Verbindung trennen
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" disabled className="h-9 gap-2 opacity-50 cursor-not-allowed">
                                        <Zap className="h-3.5 w-3.5" />
                                        Verbinden
                                    </Button>
                                )}
                            </div>
                        )
                    })}

                    {/* Show other identities that might not be in our explicit list */}
                    {identities.filter(id => !providers.find(p => p.id === id.provider || (p.id === 'azure' && id.provider === 'microsoft'))).map(identity => (
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
                                            disabled={actionLoading === identity.id}
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
                                                onClick={() => handleUnlink(identity)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Verbindung trennen
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            </SettingsCard>
        </SettingsSection>
    )
}

export default ConnectedAccountsSection
