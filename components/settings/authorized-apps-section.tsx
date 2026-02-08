import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldCheck, Trash2, Calendar, Shield, Info, User, Mail, Key, Home, Users, Check } from "lucide-react"
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Scope descriptions mapping with icons
const SCOPE_DETAILS: Record<string, { title: string; description: string; icon: any }> = {
    'openid': {
        title: 'Identität bestätigen',
        description: 'Bestätigt, dass Sie Besitzer dieses Kontos sind (OpenID Connect).',
        icon: Shield
    },
    'profile': {
        title: 'Öffentliches Profil',
        description: 'Name, Benutzername und Profilbild.',
        icon: User
    },
    'email': {
        title: 'E-Mail-Adresse',
        description: 'Ihre verifizierte E-Mail-Adresse.',
        icon: Mail
    },
    'offline_access': {
        title: 'Dauerhafter Zugriff',
        description: 'Zugriff auch wenn Sie die App nicht nutzen (Refresh Token).',
        icon: Key
    },
    'properties:write': {
        title: 'Immobilien verwalten',
        description: 'Immobilien erstellen, bearbeiten und löschen.',
        icon: Home
    },
    'properties:read': {
        title: 'Immobilien ansehen',
        description: 'Lesezugriff auf Ihre Immobilien.',
        icon: Home
    },
    'tenants:read': {
        title: 'Mieter ansehen',
        description: 'Lesezugriff auf Mieterdaten.',
        icon: Users
    },
    'tenants:write': {
        title: 'Mieter verwalten',
        description: 'Mieterdaten erstellen, bearbeiten und löschen.',
        icon: Users
    }
};

const getScopeDetails = (scope: string) => {
    return SCOPE_DETAILS[scope] || {
        title: scope,
        description: `Berechtigung: ${scope}`,
        icon: ShieldCheck
    };
};

interface AuthorizedApp {
    authorization_id: string
    client_name: string
    client_logo: string | null
    scopes: string
    created_at: string
}

const AuthorizedAppsSection = () => {
    const supabase = createClient()
    const { toast } = useToast()
    const [apps, setApps] = useState<AuthorizedApp[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchApps = async () => {
        try {
            const { data, error } = await supabase.rpc('get_authorized_apps')
            if (error) throw error
            setApps(data || [])
        } catch (error) {
            console.error("Error fetching authorized apps:", error)
            // Silently fail if RPC doesn't exist yet (user needs to run SQL)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApps()
    }, [])

    const handleRevoke = async (authId: string) => {
        setActionLoading(authId)
        try {
            const { error } = await supabase.rpc('revoke_app_access', { auth_id: authId })
            if (error) throw error

            toast({
                title: "Zugriff widerrufen",
                description: "Die Anwendung hat keinen Zugriff mehr auf Ihr Konto.",
                variant: "success",
            })

            fetchApps()
        } catch (error: any) {
            toast({
                title: "Fehler",
                description: `Fehler beim Widerrufen: ${error.message}`,
                variant: "destructive",
            })
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) return null

    if (apps.length === 0) return null

    return (
        <SettingsSection
            title="Autorisierte Anwendungen"
            description="Anwendungen, denen Sie Zugriff auf Ihr Konto gewährt haben."
        >
            <SettingsCard>
                <div className="space-y-6">
                    {apps.map((app) => (
                        <div key={app.authorization_id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start gap-4 flex-1">
                                {app.client_logo ? (
                                    <img src={app.client_logo} alt={app.client_name} className="w-12 h-12 rounded-xl border object-cover shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl border bg-muted flex items-center justify-center shadow-sm">
                                        <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <h4 className="font-semibold text-base">{app.client_name}</h4>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Autorisiert am {new Date(app.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zugriff auf:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {app.scopes.split(' ').map(scope => {
                                                const details = getScopeDetails(scope);
                                                const Icon = details.icon;
                                                return (
                                                    <TooltipProvider key={scope}>
                                                        <Tooltip delayDuration={0}>
                                                            <TooltipTrigger asChild>
                                                                <div className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border bg-card/50 hover:bg-accent/50 transition-colors cursor-help group">
                                                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-600 group-hover:bg-green-500/20 transition-colors">
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-foreground">{details.title}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[200px]">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-semibold text-xs flex items-center gap-1.5">
                                                                        <Icon className="w-3 h-3" />
                                                                        {details.title}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">{details.description}</span>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-center"
                                        disabled={actionLoading === app.authorization_id}
                                    >
                                        {actionLoading === app.authorization_id ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                        )}
                                        Zugriff entfernen
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Zugriff entfernen?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Sind Sie sicher, dass Sie <strong>{app.client_name}</strong> den Zugriff auf Ihr Konto entziehen möchten? Die Anwendung kann dann nicht mehr auf Ihre Daten zugreifen.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleRevoke(app.authorization_id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Zugriff entfernen
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
            </SettingsCard>
        </SettingsSection>
    )
}

export default AuthorizedAppsSection
