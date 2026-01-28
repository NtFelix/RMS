'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const LOGO_URL = 'https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/assets/logo.png';
const BRAND_NAME = 'Mietevo';

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
                const { data, error: detailsError } = await (supabase.auth as any).oauth.getAuthorizationDetails(authorizationId);

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

    const handleApprove = async () => {
        if (!authorizationId) return;

        setIsProcessing(true);
        setProcessError(null);

        try {
            const { data, error: approveError } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);

            if (approveError) {
                setProcessError(approveError.message);
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
            setProcessError(err.message || 'An error occurred while approving authorization');
            setIsProcessing(false);
        }
    };

    const handleDeny = async () => {
        if (!authorizationId) return;

        setIsProcessing(true);
        setProcessError(null);

        try {
            const { data, error: denyError } = await (supabase.auth as any).oauth.denyAuthorization(authorizationId);

            if (denyError) {
                setProcessError(denyError.message);
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
            setProcessError(err.message || 'An error occurred while denying authorization');
            setIsProcessing(false);
        }
    };

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
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                    Diese Anwendung erhält Zugriff auf:
                                </h3>
                                <ul className="space-y-2">
                                    {scopes.map((scope, index) => (
                                        <li key={index} className="flex items-center gap-3 text-sm">
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span className="text-foreground capitalize">{scope}</span>
                                        </li>
                                    ))}
                                </ul>
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
                                Nach Autorisierung werden Sie zu <span className="font-mono text-foreground/70">{new URL(redirectUri).origin}</span> weitergeleitet
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
