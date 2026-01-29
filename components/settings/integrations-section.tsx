"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, Globe, Shield, Calendar, AlertTriangle } from "lucide-react"
import { getAuthorizedApps, revokeApp, type OAuthGrant } from "@/app/integrations-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    ConfirmationAlertDialog
} from "@/components/ui/confirmation-alert-dialog"

export default function IntegrationsSection() {
    return (
        <div className="space-y-6">
            <ConnectedAccounts />
            <AuthorizedApps />
        </div>
    )
}

function ConnectedAccounts() {
    const [identities, setIdentities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [unlinkLoading, setUnlinkLoading] = useState<string | null>(null)
    const [identityToUnlink, setIdentityToUnlink] = useState<string | null>(null)
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        loadIdentities()
    }, [])

    const loadIdentities = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.identities) {
            setIdentities(user.identities)
        }
        setLoading(false)
    }

    const handleUnlink = async () => {
        if (!identityToUnlink) return

        setUnlinkLoading(identityToUnlink)
        try {
            const identity = identities.find(i => i.id === identityToUnlink)
            if (!identity) throw new Error("Identität nicht gefunden")

            const { error } = await supabase.auth.unlinkIdentity(identity)
            if (error) throw error

            toast({
                title: "Erfolg",
                description: "Verbindung erfolgreich getrennt",
                variant: "success",
            })
            loadIdentities()
        } catch (error: any) {
            toast({
                title: "Fehler",
                description: error.message || "Verbindung konnte nicht getrennt werden",
                variant: "destructive",
            })
        } finally {
            setUnlinkLoading(null)
            setIdentityToUnlink(null)
        }
    }

    const getProviderLabel = (provider: string) => {
        switch (provider) {
            case 'google': return 'Google'
            case 'azure': return 'Microsoft (Azure)'
            case 'github': return 'GitHub'
            case 'email': return 'E-Mail' // Usually not in identities list unless linked
            default: return provider.charAt(0).toUpperCase() + provider.slice(1)
        }
    }

    if (loading) {
        return (
            <SettingsSection
                title="Verbundene Konten"
                description="Verwalten Sie Ihre verknüpften Anmelde-Methoden."
            >
                <SettingsCard className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </SettingsCard>
            </SettingsSection>
        )
    }

    return (
        <SettingsSection
            title="Verbundene Konten"
            description="Verwalten Sie Ihre verknüpften Anmelde-Methoden (Social Logins)."
        >
            <SettingsCard>
                <div className="space-y-4">
                    {identities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Keine externen Konten verbunden.</p>
                    ) : (
                        identities.map((identity) => (
                            <div key={identity.id} className="flex items-center justify-between p-3 bg-white dark:bg-card border rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        {identity.provider === 'google' ? (
                                            <span className="font-bold text-lg">G</span>
                                        ) : identity.provider === 'azure' ? (
                                            <span className="font-bold text-lg">M</span>
                                        ) : (
                                            <Globe className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{getProviderLabel(identity.provider)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Verbunden am {new Date(identity.created_at).toLocaleDateString('de-DE')}
                                        </p>
                                    </div>
                                </div>
                                {identities.length > 1 ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => setIdentityToUnlink(identity.id)}
                                        disabled={!!unlinkLoading}
                                    >
                                        {unlinkLoading === identity.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Trennen</span>
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic px-3">
                                        Haupt-Login
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </SettingsCard>
            <ConfirmationAlertDialog
                isOpen={!!identityToUnlink}
                onOpenChange={(open) => !open && setIdentityToUnlink(null)}
                title="Verbindung trennen?"
                description="Möchten Sie dieses Konto wirklich trennen? Sie können es danach nicht mehr zur Anmeldung verwenden."
                onConfirm={handleUnlink}
                confirmButtonText="Trennen"
                cancelButtonText="Abbrechen"
                confirmButtonVariant="destructive"
            />
        </SettingsSection>
    )
}

function AuthorizedApps() {
    const [grants, setGrants] = useState<OAuthGrant[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revokingId, setRevokingId] = useState<string | null>(null)
    const [grantToRevoke, setGrantToRevoke] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        loadGrants()
    }, [])

    const loadGrants = async () => {
        setLoading(true)
        const result = await getAuthorizedApps()
        if (result.success && result.grants) {
            setGrants(result.grants)
        } else if (result.error) {
            setError(result.error)
            // If error is specific (like method not found), we might handle it gracefully
            // mostly just logging it
        }
        setLoading(false)
    }

    const handleRevoke = async () => {
        if (!grantToRevoke) return

        setRevokingId(grantToRevoke)
        try {
            const result = await revokeApp(grantToRevoke)
            if (result.success) {
                toast({
                    title: "Erfolg",
                    description: "Zugriff erfolgreich widerrufen",
                    variant: "success",
                })
                // Optimistic update
                setGrants(prev => prev.filter(g => g.id !== grantToRevoke))
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            toast({
                title: "Fehler",
                description: error.message || "Fehler beim Widerrufen des Zugriffs",
                variant: "destructive",
            })
        } finally {
            setRevokingId(null)
            setGrantToRevoke(null)
        }
    }

    if (loading) {
        return (
            <SettingsSection
                title="Autorisierte Apps"
                description="Drittanbieter-Anwendungen, die Zugriff auf Ihr Konto haben."
            >
                <SettingsCard className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </SettingsCard>
            </SettingsSection>
        )
    }

    return (
        <SettingsSection
            title="Autorisierte Apps"
            description="Drittanbieter-Anwendungen, die Zugriff auf Ihr Konto haben (Option A)."
        >
            <SettingsCard>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Fehler</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    {grants.length === 0 ? (
                        <div className="text-center py-6">
                            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Keine Anwendungen autorisiert.</p>
                        </div>
                    ) : (
                        grants.map((grant) => (
                            <div key={grant.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-card border rounded-xl gap-4">
                                <div className="flex items-start gap-4">
                                    {grant.client?.logo_uri ? (
                                        <img src={grant.client.logo_uri} alt="" className="h-12 w-12 rounded-xl object-cover border" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <Shield className="h-6 w-6 text-primary" />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-sm">{grant.client?.name || 'Unbekannte Anwendung'}</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {grant.scopes.map(scope => (
                                                <Badge key={scope} variant="secondary" className="text-[10px] px-1 h-5">
                                                    {scope}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Autorisiert am {new Date(grant.created_at).toLocaleDateString('de-DE')}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 border-destructive/20 w-full sm:w-auto mt-2 sm:mt-0"
                                    onClick={() => setGrantToRevoke(grant.id)}
                                    disabled={!!revokingId}
                                >
                                    {revokingId === grant.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Zugriff entfernen
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </SettingsCard>
            <ConfirmationAlertDialog
                isOpen={!!grantToRevoke}
                onOpenChange={(open) => !open && setGrantToRevoke(null)}
                title="Zugriff widerrufen?"
                description="Die Anwendung wird keinen Zugriff mehr auf Ihre Daten haben. Sie müssen sich möglicherweise erneut anmelden, um sie wieder zu verwenden."
                onConfirm={handleRevoke}
                confirmButtonText="Widerrufen"
                cancelButtonText="Abbrechen"
                confirmButtonVariant="destructive"
            />
        </SettingsSection>
    )
}
