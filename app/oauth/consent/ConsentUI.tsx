'use client';

import { useState, useEffect, useRef } from 'react';
import { getAuthorizationDetailsAction, submitDecisionAction, type AuthorizationDetails } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    type: 'consent' | 'error' | 'loading' | 'success';
    error?: string;
    authorizationId?: string;
    clientName?: string;
    clientIcon?: string;
    redirectUri?: string;
    scopes?: string[];
    isDemo?: boolean;
    initialData?: AuthorizationDetails;
    initialError?: string;
}

import { LOGO_URL, BRAND_NAME, OAUTH_CLIENT_IDS, MIETEVO_MCP_URL } from '@/lib/constants';

import { isValidRedirect, isValidSupabaseRedirect } from '@/lib/oauth-utils';

/**
 * Validates a redirect URL before navigating to it.
 * Only HTTPS URLs whose origin is in the allowlist or the project's Supabase instance are accepted.
 */
function safeRedirect(url: string | undefined | null): void {
    if (isValidRedirect(url) || isValidSupabaseRedirect(url)) {
        window.location.href = url!;
    } else if (url) {
        console.error('[OAuth] Blocked redirect to untrusted origin:', url);
    }
}

/**
 * Reusable layout wrapper for all full-screen states (loading, error, success, consent).
 * Handles the ambient background effects and centered container.
 */
function FullScreenLayout({ 
    children, 
    className = "",
    showGlow = false 
}: { 
    children: React.ReactNode; 
    className?: string;
    showGlow?: boolean;
}) {
    return (
        <div className={`min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans ${className}`}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
            
            {showGlow && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 dark:bg-primary/20 blur-[100px] dark:blur-[120px] rounded-full pointer-events-none"
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                {children}
            </motion.div>
        </div>
    );
}

export default function ConsentUI({
    type,
    error,
    authorizationId,
    clientName: initialClientName,
    clientIcon: initialClientIcon,
    redirectUri: initialRedirectUri,
    scopes: initialScopes = [],
    isDemo = false,
    initialData,
    initialError
}: ConsentUIProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(!isDemo && !initialData && !initialError);
    const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(
        isDemo ? {
            id: authorizationId,
            client: { name: initialClientName, logo_uri: initialClientIcon },
            redirect_uri: initialRedirectUri,
            scopes: initialScopes
        } : (initialData || null)
    );
    const [loadError, setLoadError] = useState<string | null>(initialError || null);

    // Auto-close success window after a delay
    useEffect(() => {
        if (type === 'success' && typeof window !== 'undefined') {
            const timer = setTimeout(() => {
                // Only try to close if it's likely a popup
                if (window.opener || window.history.length === 1) {
                    window.close();
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [type]);

    // Fetch authorization details on mount
    useEffect(() => {
        const fetchDetails = async () => {
            if (isDemo || !authorizationId || type === 'error' || initialData || initialError) {
                if (initialData || initialError) {
                    setIsLoading(false);
                }
                return;
            }

            try {
                // Must use server action — browser cannot call Supabase Auth directly
                // because Supabase returns Access-Control-Allow-Origin: * which
                // browsers block when credentials: include is set.
                const { success, data, error: detailsError } = await getAuthorizationDetailsAction(authorizationId);

                if (!success || detailsError) {
                    setLoadError(detailsError || 'Failed to load details');
                    setIsLoading(false);
                    return;
                }

                // If auto_approved, Supabase has already granted access and the redirect_to
                // URL is immediately usable. We still show the consent screen so the user
                // knows what was approved, but the approve button uses the existing redirect
                // instead of POSTing to the decision endpoint (which returns 405 on auto-approved).

                setAuthDetails(data);
            } catch (err: any) {
                setLoadError(err.message || 'Failed to load authorization details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [authorizationId, type, isDemo, initialData, initialError]);

    // Side-channel: Fetch requested scopes directly from the Mietevo Worker 
    // because Supabase filters out any scopes it doesn't officially support.
    const [customScopes, setCustomScopes] = useState<string[]>([]);
    useEffect(() => {
        const state = authDetails?.state;
        if (!state) return;

        const fetchCustomScopes = async () => {
            try {
                const response = await fetch(`${MIETEVO_MCP_URL}/oauth/scopes?state=${encodeURIComponent(state)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.scopes) {
                        // scopes might be a space-separated string or an array
                        const scopeList = typeof data.scopes === 'string'
                            ? data.scopes.split(' ')
                            : data.scopes;
                        setCustomScopes(scopeList.filter(Boolean));
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch custom scopes side-channel:', err);
            }
        };

        fetchCustomScopes();
    }, [authDetails]);

    // Smart client logo detection based on name or ID
    const getSmartClientConfig = (id?: string, name?: string, providedUri?: string) => {
        const lowerName = (name || '').toLowerCase();

        // 1. Check known IDs first
        if (id === OAUTH_CLIENT_IDS.MIETEVO) return { name: 'Mietevo', icon: LOGO_URL };
        if (id === OAUTH_CLIENT_IDS.MIETEVO_PUBLIC_MCP) return { name: 'Mietevo Public MCP', icon: LOGO_URL };

        // 2. Use provided URI if it exists
        if (providedUri) return { name: name || 'Unbekannte Anwendung', icon: providedUri };

        // 3. Smart guess based on popular tools you might integrate
        if (lowerName.includes('notion')) return { name: name || 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png' };
        if (lowerName.includes('claude') || lowerName.includes('anthropic')) return { name: name || 'Claude', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Claude_AI_logo.svg' };
        if (lowerName.includes('chatgpt') || lowerName.includes('openai')) return { name: name || 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' };

        // 4. Default fallback
        return { name: name || initialClientName || 'Unbekannte Anwendung', icon: initialClientIcon || null };
    };

    const clientId = authDetails?.client?.id;
    const { name: clientName, icon: clientIcon } = getSmartClientConfig(
        clientId,
        authDetails?.client?.name || initialClientName,
        authDetails?.client?.logo_uri
    );

    const redirectUri = authDetails?.redirect_uri || initialRedirectUri;

    // Merge Supabase scopes with our custom stashed scopes
    const rawSupabaseScopes = typeof authDetails?.scopes === 'string' ? authDetails.scopes.split(' ') : (authDetails?.scopes || []);
    const mergedScopes = Array.from(new Set([...rawSupabaseScopes, ...customScopes, ...(initialScopes || [])])).filter(s => s !== 'offline_access');
    const scopes = mergedScopes.length > 0 ? mergedScopes : ['openid', 'email'];

    // Dynamic scroll indicators for scopes list
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showTopFade, setShowTopFade] = useState(false);
    const [showBottomFade, setShowBottomFade] = useState(false);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowTopFade(scrollTop > 0);
        // Add a 1px threshold to prevent precision issues causing flashing
        setShowBottomFade(Math.ceil(scrollTop + clientHeight) < scrollHeight - 1);
    };

    // Check scroll state when scopes change or window resizes
    useEffect(() => {
        // give the DOM time to render the scopes before checking scroll height
        const timeout = setTimeout(handleScroll, 50);
        window.addEventListener('resize', handleScroll);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handleScroll);
        }
    }, [scopes]);

    const handleDecision = async (decision: 'approve' | 'deny') => {
        if (!authorizationId) return;

        setIsProcessing(true);
        setProcessError(null);

        try {
            // For auto-approved authorizations, Supabase has already granted access.
            // POSTing a decision to the endpoint returns 405 Method Not Allowed.
            // Instead, use the redirect_to from the initial GET details response directly.
            if (authDetails?.auto_approved) {
                if (decision === 'deny') {
                    // For auto-approved, the access is already granted. Denying now would face the same
                    // 405 constraint, so we gracefully abort and inform the user.
                    setProcessError('This application is already approved. You can revoke access from your account settings.');
                    setIsProcessing(false);
                    return;
                }

                // redirect_to is set by Supabase on auto-approved flows; redirect_url is the registered fallback
                const autoRedirectUrl = authDetails.redirect_to || authDetails.redirect_url;
                if (!autoRedirectUrl) {
                    setProcessError('Automatically approved authorization has no redirect URL. Please try again.');
                    setIsProcessing(false);
                    return;
                }

                setIsProcessing(false); // defensive reset before navigation
                safeRedirect(autoRedirectUrl);
                return;
            }

            // All Supabase calls go through server actions to avoid CORS issues.
            // (Supabase returns Access-Control-Allow-Origin: * which browsers block with credentials: include)
            const { success, redirect_to, error } = await submitDecisionAction(
                authorizationId,
                decision === 'approve' ? 'allow' : 'deny'
            );

            if (!success || error) {
                setProcessError(error || 'Decision failed');
                setIsProcessing(false);
                return;
            }

            if (redirect_to) {
                safeRedirect(redirect_to);
            } else {
                setProcessError('No redirect URL returned. Please try again.');
                setIsProcessing(false);
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
            <FullScreenLayout>
                <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Laden...</p>
                    </CardContent>
                </Card>
            </FullScreenLayout>
        );
    }

    // Error state
    if (type === 'error' || error || loadError) {
        return (
            <FullScreenLayout>
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
            </FullScreenLayout>
        );
    }

    // Success state — authorization already processed
    if (type === 'success') {
        return (
            <FullScreenLayout>
                <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-8">
                        <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mb-6 border border-green-500/20 p-4">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            Verbindung hergestellt
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <p className="text-muted-foreground text-center">
                            Diese Autorisierung wurde bereits erfolgreich verarbeitet.
                            Sie können dieses Fenster schließen.
                        </p>
                    </CardContent>
                </Card>
            </FullScreenLayout>
        );
    }

    // Consent form
    return (
        <FullScreenLayout showGlow>
            <div className="relative group">
                {/* Gradient glowing border effect (adapted for light/dark) */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-primary/0 dark:from-primary/40 dark:to-primary/5 rounded-[2.5rem] blur-md opacity-30 dark:opacity-50 group-hover:opacity-60 dark:group-hover:opacity-80 transition duration-1000 group-hover:duration-300" />

                <Card className="relative border-border/50 dark:border-border/30 bg-background/80 dark:bg-background/60 backdrop-blur-2xl shadow-xl dark:shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-10 px-8">
                        {/* App logos */}
                        <div className="flex items-center justify-center gap-6 mb-8">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="relative"
                            >
                                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 blur-xl rounded-full" />
                                {clientIcon ? (
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-white border border-border/40 dark:border-border/50 shadow-md dark:shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative z-10">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent mix-blend-multiply dark:mix-blend-normal dark:from-white/10 dark:to-transparent" />
                                        <img
                                            src={clientIcon}
                                            alt={clientName}
                                            className="w-10 h-10 object-contain drop-shadow-sm relative z-10"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-card border border-border/40 dark:border-border/70 shadow-md dark:shadow-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden z-10">
                                        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />
                                        <ShieldAlert className="w-7 h-7 text-primary relative z-10" />
                                    </div>
                                )}
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="flex flex-col items-center justify-center"
                            >
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted dark:bg-secondary/50 border border-border/30 dark:border-border/50 shadow-sm dark:shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '200ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '400ms' }} />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="relative"
                            >
                                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 blur-xl rounded-full" />
                                <div className="w-16 h-16 rounded-[1.25rem] bg-card border border-border/40 dark:border-border/70 shadow-md dark:shadow-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden z-10">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/5 dark:from-black/20 to-transparent" />
                                    <img
                                        src={LOGO_URL}
                                        alt={BRAND_NAME}
                                        className="w-10 h-10 object-contain relative z-10 dark:brightness-110"
                                    />
                                </div>
                            </motion.div>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground pb-1">
                            Verknüpfung erlauben
                        </CardTitle>
                        <CardDescription className="text-base mt-2 max-w-sm mx-auto text-muted-foreground">
                            <span className="font-semibold text-foreground">{clientName}</span> fordert Zugriff auf Ihr {BRAND_NAME}-Konto an.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-4">
                        {scopes.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                                    Diese Anwendung darf:
                                </h3>
                                <div className="relative rounded-2xl border border-border/40 bg-muted/30 dark:bg-background/50 overflow-hidden flex flex-col shadow-inner backdrop-blur-sm">
                                    {/* Top scroll fade */}
                                    {showTopFade && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-muted/90 dark:from-background/90 to-transparent z-10 pointer-events-none"
                                        />
                                    )}

                                    <div
                                        ref={scrollRef}
                                        onScroll={handleScroll}
                                        className="max-h-60 overflow-y-auto p-3 space-y-2 custom-scrollbar relative z-0"
                                    >
                                        {scopes.map((scope, index) => {
                                            const details = getScopeDetails(scope);
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * index }}
                                                    key={scope}
                                                    className="group/scope flex items-start gap-4 p-3.5 rounded-xl bg-card border border-border/40 hover:border-primary/30 dark:border-border/30 dark:hover:border-border/80 hover:bg-card hover:shadow-sm dark:hover:shadow-md transition-all duration-300"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/scope:bg-primary/20 group-hover/scope:scale-110 transition-all duration-300">
                                                        <Check className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-foreground mb-0.5">
                                                            {details.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {details.description}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Bottom scroll fade with bouncing arrow */}
                                    {showBottomFade && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/90 dark:from-background/90 to-transparent z-10 pointer-events-none flex items-end justify-center pb-1.5"
                                        >
                                            <motion.div
                                                animate={{ y: [0, 3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                                className="w-5 h-5 rounded-full bg-background/50 border border-border/50 flex items-center justify-center backdrop-blur-md shadow-sm"
                                            >
                                                <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-muted-foreground rotate-45 mb-0.5" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error display */}
                        {processError && (
                            <Alert variant="destructive" className="rounded-xl mb-4 bg-destructive/10 text-destructive border-destructive/20">
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
                            className="w-full h-12 rounded-xl text-base font-semibold border-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(var(--primary),0.2)] dark:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.3)] dark:hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] transition-all duration-300"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Wird verarbeitet...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    Zugriff erlauben
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleDeny}
                            disabled={isProcessing}
                            className="w-full h-12 rounded-xl text-base font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Abbrechen
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </FullScreenLayout>
    );
}
