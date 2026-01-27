'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Check, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { LOGO_URL, BRAND_NAME, BASE_URL, SUPABASE_API_PATHS } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { approveAuthorizationAction } from './actions';

// Whitelist of allowed redirect URI patterns for security
// In production, this should be managed via database or environment config
const ALLOWED_REDIRECT_PATTERNS = [
    // Allow redirects to the same domain
    new RegExp(`^${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    // Allow localhost for development
    /^http:\/\/localhost(:\d+)?/,
    /^http:\/\/127\.0\.0\.1(:\d+)?/,
    // Allow ChatGPT Apps OAuth callbacks (production + app review)
    /^https:\/\/chatgpt\.com\/connector_platform_oauth_redirect(\?.*)?$/,
    /^https:\/\/platform\.openai\.com\/apps-manage\/oauth(\?.*)?$/,
    // Allow MCP Worker callback proxy
    /^https:\/\/mcp\.mietevo\.de\/callback(\?.*)?$/,
    /^https:\/\/mcp\.mietevo\.de\/oauth\/callback(\?.*)?$/,
];


/**
 * Validates if a redirect URI is in the allowed whitelist.
 * This prevents open redirect vulnerabilities.
 */
function isValidRedirectUri(uri: string | null): boolean {
    if (!uri) return false;

    try {
        // Ensure it's a valid URL
        new URL(uri);

        // Check against whitelist patterns
        return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(uri));
    } catch {
        return false;
    }
}

const OAUTH_PARAMS_SESSION_KEY = 'mcp_oauth_params';

function ConsentContent() {
    const searchParams = useSearchParams();

    // Check if we're returning from Supabase with an authorization_id
    const authorizationId = searchParams.get('authorization_id');
    const [approvalStatus, setApprovalStatus] = useState<'idle' | 'approving' | 'error'>(authorizationId ? 'approving' : 'idle');
    const [approvalError, setApprovalError] = useState<string | null>(null);

    // Handle authorization approval when authorization_id is present
    useState(() => {
        if (authorizationId && approvalStatus === 'approving') {
            const approveAuthorization = async () => {
                try {
                    const result = await approveAuthorizationAction(authorizationId);

                    if (!result.success) {
                        throw new Error(result.error);
                    }

                    if (result.redirect_to) {
                        window.location.href = result.redirect_to;
                    } else {
                        throw new Error('No redirect URL received from authorization approval');
                    }
                } catch (err: unknown) {
                    console.error('Authorization approval failed:', err);
                    setApprovalError(err instanceof Error ? err.message : 'Authorization approval failed');
                    setApprovalStatus('error');
                }
            };

            approveAuthorization();
        }
    });

    // If we're handling authorization approval, show loading or error state
    if (authorizationId) {
        if (approvalStatus === 'error') {
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
                                    <AlertDescription>{approvalError}</AlertDescription>
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

        // Show loading state while approving
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 w-full max-w-md text-center"
                >
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Autorisierung wird abgeschlossen...</p>
                </motion.div>
            </div>
        );
    }

    // Recovery Logic: Try to get parameters from URL, then fallback to sessionStorage
    // This handles cases where internal redirects (like login or session refresh) strip the URL.
    const [oauthState] = useState<{
        client_id: string | null;
        state: string | null;
        redirect_uri: string | null;
        scope: string | null;
        code_challenge: string | null;
        code_challenge_method: string | null;
    }>(() => {
        const fromUrl = {
            client_id: searchParams.get('client_id'),
            state: searchParams.get('state'),
            redirect_uri: searchParams.get('redirect_uri'),
            scope: searchParams.get('scope'),
            code_challenge: searchParams.get('code_challenge'),
            code_challenge_method: searchParams.get('code_challenge_method'),
        };

        // If we have all primary params, use them and save them
        if (fromUrl.client_id && fromUrl.state) {
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(OAUTH_PARAMS_SESSION_KEY, JSON.stringify(fromUrl));
            }
            return fromUrl;
        }

        // Otherwise, try to recover from session storage
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem(OAUTH_PARAMS_SESSION_KEY);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse OAuth params from sessionStorage:', e);
                    sessionStorage.removeItem(OAUTH_PARAMS_SESSION_KEY);
                }
            }
        }

        return fromUrl;
    });

    const { client_id: clientId, state, redirect_uri: redirectUri, scope, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod } = oauthState;

    const [isLoading, setIsLoading] = useState(false);

    // Validate all required OAuth parameters
    const validationError = useMemo(() => {
        if (!clientId) return 'Fehlender Parameter: client_id';
        if (!redirectUri) return 'Fehlender Parameter: redirect_uri';
        if (!state) return 'Fehlender Parameter: state';
        if (!scope) return 'Fehlender Parameter: scope';
        if (!codeChallenge) return 'Fehlender Parameter: code_challenge';
        if (!codeChallengeMethod) return 'Fehlender Parameter: code_challenge_method';
        if (!isValidRedirectUri(redirectUri)) return 'Ungültige oder nicht autorisierte Weiterleitungs-URL';
        return null;
    }, [clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod]);

    // Use environment variable for Supabase URL
    const supabaseAuthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${SUPABASE_API_PATHS.OAUTH_AUTHORIZE}`;

    const handleAllow = () => {
        // Validation already passed - this handler only runs when UI is shown
        setIsLoading(true);
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId!,
            redirect_uri: redirectUri!,
            state: state!,
            scope: scope!,
            code_challenge: codeChallenge!,
            code_challenge_method: codeChallengeMethod!,
        });
        window.location.href = `${supabaseAuthUrl}?${params.toString()}`;
    };

    const handleDeny = () => {
        // Validation already passed - redirectUri is guaranteed valid
        const url = new URL(redirectUri!);
        url.searchParams.set('error', 'access_denied');
        if (state) {
            url.searchParams.set('state', state);
        }
        window.location.href = url.toString();
    };

    const formattedScopes = useMemo(() => {
        if (!scope) return [];

        const mapping: Record<string, string> = {
            'read:properties': 'Zugriff auf Ihre Immobilien und Wohnungen',
            'write:finance': 'Neue Finanz-Transaktionen erfassen',
            'read:tenants': 'Mieter- und Mietvertrags-Informationen ansehen',
            'read:documents': 'Zugriff auf Dokumente und Rechnungen',
        };

        return scope.split(' ').map(s => ({
            key: s,
            label: mapping[s] || s.replace(':', ' '),
        }));
    }, [scope]);



    // Show error state if validation fails
    if (validationError) {
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
                                Ungültige Anfrage
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{validationError}</AlertDescription>
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans">
            {/* Animated grid background - same as login page */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

            {/* Gradient orbs in background */}
            <motion.div
                className="hidden md:block absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[100px]"
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="hidden md:block absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/20 blur-[100px]"
                animate={{
                    x: [0, -40, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Radial spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.8)_0%,transparent_50%)]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20 p-4"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={LOGO_URL} alt={BRAND_NAME} className="w-full h-full object-contain" />
                        </motion.div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            Berechtigung
                        </CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            Eine externe Anwendung möchte auf Ihren <span className="text-foreground font-semibold">{BRAND_NAME}</span> Account zugreifen.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 px-8">
                        <div className="rounded-2xl bg-muted/40 border border-border p-5">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Angeforderte Berechtigungen</h3>
                            <ul className="space-y-4">
                                {formattedScopes.map((scopeItem, i) => (
                                    <motion.li
                                        key={scopeItem.key}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        className="flex items-start gap-3 text-sm text-foreground/90 font-medium"
                                    >
                                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        {scopeItem.label}
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                            <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Gewähren Sie nur dann Zugriff, wenn Sie der Anwendung vertrauen. Diese Anwendung kann Aktionen in Ihrem Namen ausführen.
                            </p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 p-8 pt-4">
                        <Button
                            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleAllow}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Verbindung wird hergestellt...
                                </>
                            ) : (
                                'Zugriff erlauben'
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                            onClick={handleDeny}
                            disabled={isLoading}
                        >
                            Abbrechen
                        </Button>
                    </CardFooter>
                </Card>

                <p className="mt-8 text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60">
                    Sichere Verbindung via OAuth 2.1
                </p>
            </motion.div>
        </div>
    );
}

export default function ConsentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        }>
            <ConsentContent />
        </Suspense>
    );
}

