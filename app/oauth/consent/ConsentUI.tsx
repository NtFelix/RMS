'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Scope descriptions mapping
const SCOPE_DETAILS: Record<string, { title: string; description: string }> = {
    'profile:read': {
        title: 'Benutzerprofil',
        description: 'Lesezugriff auf Ihren Namen und Avatar.'
    },
    'email': {
        title: 'E-Mail-Adresse',
        description: 'Lesezugriff auf Ihre verifizierte E-Mail-Adresse.'
    },
    'offline_access': {
        title: 'Offline-Zugriff',
        description: 'Zugriff auf Ihre Daten, auch wenn Sie die Anwendung gerade nicht verwenden (Refresh Token).'
    },
    'properties:write': {
        title: 'Immobilien verwalten',
        description: 'Erlaubt das Erstellen, Bearbeiten und Löschen von Immobilien.'
    },
    'properties:read': {
        title: 'Immobilien ansehen',
        description: 'Lesezugriff auf Ihre gespeicherten Immobilien.'
    },
    'tenants:read': {
        title: 'Mieter ansehen',
        description: 'Lesezugriff auf Ihre gespeicherten Mieterdaten.'
    },
    'tenants:write': {
        title: 'Mieter verwalten',
        description: 'Erlaubt das Erstellen, Bearbeiten und Löschen von Mieterdaten.'
    }
};

const getScopeDetails = (scope: string) => {
    return SCOPE_DETAILS[scope] || {
        title: scope.replace(/[_:-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Zugriff auf den Bereich "${scope}".`
    };
};

interface ConsentUIProps {
    type: 'consent' | 'error' | 'loading';
    error?: string;
    authorizationId?: string;
    clientName?: string;
    clientIcon?: string;
    redirectUri?: string;
    scopes?: string[];
}

interface AuthorizationDetails {
    client?: {
        name?: string;
        logo_uri?: string;
    };
    redirect_uri?: string;
    scopes?: string[];
}

import { LOGO_URL, BRAND_NAME } from '@/lib/constants';

export default function ConsentUI({
    type,
    error,
    authorizationId,
    clientName: initialClientName,
    clientIcon: initialClientIcon,
    redirectUri: initialRedirectUri,
    scopes: initialScopes = []
}: ConsentUIProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Create browser client for consent actions
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch authorization details on mount
    useEffect(() => {
        const fetchDetails = async () => {
            if (!authorizationId || type === 'error') {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error: detailsError } = await (supabase.auth as unknown as import('@/types/supabase').SupabaseAuthWithOAuth).oauth.getAuthorizationDetails(authorizationId);

                console.log('getAuthorizationDetails response:', data, detailsError);

                if (detailsError) {
                    setLoadError(detailsError.message);
                    setIsLoading(false);
                    return;
                }

                // Check if the authorization was auto-approved and has a redirect URL
                // This happens when the user has previously approved this client
                if (data?.redirect_to || data?.redirect_url) {
                    console.log('Auto-approved, redirecting to:', data.redirect_to || data.redirect_url);
                    window.location.href = data.redirect_to || data.redirect_url;
                    return; // Keep loading state while redirecting
                }

                setAuthDetails(data);
            } catch (err: any) {
                setLoadError(err.message || 'Failed to load authorization details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [authorizationId, type]);

    const clientName = authDetails?.client?.name || initialClientName || 'Unknown Application';
    const clientIcon = authDetails?.client?.logo_uri || initialClientIcon;
    const redirectUri = authDetails?.redirect_uri || initialRedirectUri;
    const scopes = authDetails?.scopes || initialScopes;

    const handleDecision = async (decision: 'approve' | 'deny') => {
        if (!authorizationId) return;

        setIsProcessing(true);
        setProcessError(null);

        try {
            const authClient = supabase.auth as unknown as import('@/types/supabase').SupabaseAuthWithOAuth;
            const { data, error } = decision === 'approve'
                ? await authClient.oauth.approveAuthorization(authorizationId)
                : await authClient.oauth.denyAuthorization(authorizationId);

            if (error) {
                setProcessError(error.message);
                setIsProcessing(false);
                return;
            }

            // The SDK should auto-redirect, but check for redirect_url just in case
            if (data?.redirect_url) {
                window.location.href = data.redirect_url;
            } else if (data?.redirect_to) {
                window.location.href = data.redirect_to;
            }
        } catch (err: any) {
            setProcessError(err.message || `An error occurred while ${decision === 'approve' ? 'approving' : 'denying'} authorization`);
            setIsProcessing(false);
        }
    };

    const handleApprove = () => handleDecision('approve');
    const handleDeny = () => handleDecision('deny');

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-muted-foreground">Laden...</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (type === 'error' || error || loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-8">
                            <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center mb-6 border border-destructive/20 p-4">
                                <AlertTriangle className="w-10 h-10 text-destructive" />
                            </div>
                            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                                Autorisierung fehlgeschlagen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{error || loadError}</AlertDescription>
                            </Alert>
                            <p className="text-sm text-muted-foreground mt-4 text-center">
                                Bitte schließen Sie dieses Fenster und versuchen Sie es erneut.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Consent form
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-8">
                        {/* App logos */}
                        <div className="flex items-center justify-center gap-4 mb-6">
                            {clientIcon ? (
                                <img
                                    src={clientIcon}
                                    alt={clientName}
                                    className="w-16 h-16 rounded-2xl border border-border"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                    <ShieldAlert className="w-8 h-8 text-primary" />
                                </div>
                            )}
                            <div className="text-2xl text-muted-foreground">→</div>
                            <img
                                src={LOGO_URL}
                                alt={BRAND_NAME}
                                className="w-16 h-16 rounded-2xl border border-border"
                            />
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            Zugriff autorisieren
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            <span className="font-semibold text-foreground">{clientName}</span> möchte auf Ihr {BRAND_NAME}-Konto zugreifen
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-4">
                        {/* Scopes */}
                        {scopes.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                                    Diese Anwendung darf:
                                </h3>
                                <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
                                    <Accordion type="single" collapsible className="w-full">
                                        {scopes.map((scope, index) => {
                                            const details = getScopeDetails(scope);
                                            return (
                                                <AccordionItem key={index} value={scope} className="border-border/50 first:border-t-0 last:border-b-0 px-4">
                                                    <AccordionTrigger className="hover:no-underline hover:bg-secondary/30 py-4 -mx-4 px-4 transition-colors">
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {details.title}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="text-muted-foreground px-1 pl-12">
                                                        {details.description}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </Accordion>
                                </div>
                            </div>
                        )}

                        {/* Error display */}
                        {processError && (
                            <Alert variant="destructive" className="rounded-xl mb-4">
                                <AlertDescription>{processError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Redirect URI info */}
                        {redirectUri && (
                            <p className="text-xs text-muted-foreground text-center mb-4">
                                Nach Autorisierung werden Sie zu <span className="font-mono text-foreground/70">
                                    {(() => {
                                        try {
                                            return new URL(redirectUri).origin;
                                        } catch {
                                            return redirectUri;
                                        }
                                    })()}
                                </span> weitergeleitet
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 px-8 pb-8">
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="w-full h-12 rounded-xl text-base font-medium"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Wird verarbeitet...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Zugriff erlauben
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDeny}
                            disabled={isProcessing}
                            className="w-full h-12 rounded-xl text-base font-medium"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Ablehnen
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
