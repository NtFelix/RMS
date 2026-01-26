'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Check, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { LOGO_URL, BRAND_NAME, BASE_URL, SUPABASE_API_PATHS } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Whitelist of allowed redirect URI patterns for security
function getAllowedPatterns() {
    const patterns = [
        // Allow ChatGPT Apps OAuth callbacks (production + app review)
        /^https:\/\/chatgpt\.com\/connector_platform_oauth_redirect(\?.*)?$/,
        /^https:\/\/platform\.openai\.com\/apps-manage\/oauth(\?.*)?$/,
        // Allow MCP Worker callback proxy
        /^https:\/\/mcp\.mietevo\.de\/callback(\?.*)?$/,
        // Allow localhost for development
        /^http:\/\/localhost(:\d+)?/,
        /^http:\/\/127\.0\.0\.1(:\d+)?/,
    ];

    // DYNAMICALLY allow the current origin (Fixes pages.dev/preview loops)
    if (typeof window !== 'undefined') {
        try {
            const currentOrigin = window.location.origin;
            patterns.push(new RegExp(`^${currentOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        } catch { }
    }

    return patterns;
}

/**
 * Validates if a redirect URI is in the allowed whitelist.
 */
function isValidRedirectUri(uri: string | null): boolean {
    if (!uri) return false;

    try {
        new URL(uri);
        const allowed = getAllowedPatterns();
        return allowed.some(pattern => pattern.test(uri));
    } catch {
        return false;
    }
}

const OAUTH_PARAMS_SESSION_KEY = 'mcp_oauth_params';

function ConsentContent() {
    const searchParams = useSearchParams();

    const [oauthState, setOauthState] = useState<{
        client_id: string | null;
        state: string | null;
        redirect_uri: string | null;
        scope: string | null;
        code_challenge: string | null;
        code_challenge_method: string | null;
    }>({
        client_id: null,
        state: null,
        redirect_uri: null,
        scope: null,
        code_challenge: null,
        code_challenge_method: null,
    });

    const [isLoading, setIsLoading] = useState(false);

    // Initial parameter sync & recovery
    useEffect(() => {
        const fromUrl = {
            client_id: searchParams.get('client_id'),
            state: searchParams.get('state'),
            redirect_uri: searchParams.get('redirect_uri'),
            scope: searchParams.get('scope'),
            code_challenge: searchParams.get('code_challenge'),
            code_challenge_method: searchParams.get('code_challenge_method'),
        };

        // If URL has core params, use them and UPDATE storage
        if (fromUrl.client_id && fromUrl.state) {
            sessionStorage.setItem(OAUTH_PARAMS_SESSION_KEY, JSON.stringify(fromUrl));
            setOauthState(fromUrl);
        } else {
            // Check if we are in an authorization_id fallback redirect
            const authId = searchParams.get('authorization_id');
            const saved = sessionStorage.getItem(OAUTH_PARAMS_SESSION_KEY);

            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setOauthState(parsed);
                    console.log('Recovered OAuth params for authId:', authId);
                } catch (e) {
                    console.error('Failed to parse saved OAuth params:', e);
                }
            }
        }
    }, [searchParams]);

    // NEW: Fetch full context (including original scopes) from Worker if state is present
    useEffect(() => {
        const fetchContext = async () => {
            // Avoid double-fetching or fetching if no state
            if (!oauthState.state) return;

            // Only fetch if we suspect we have filtered scopes (standard ones) and want the full list
            // Or just always fetch to be safe.
            try {
                const res = await fetch(`https://mcp.mietevo.de/auth/context?state=${oauthState.state}`);
                if (res.ok) {
                    const ctx = await res.json();
                    if (ctx.scope) {
                        console.log('Enriching scopes from Worker context:', ctx.scope);
                        setOauthState(prev => {
                            // Only update if different to avoid loop
                            if (prev.scope !== ctx.scope) {
                                return { ...prev, scope: ctx.scope };
                            }
                            return prev;
                        });
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch background context for scopes:', err);
            }
        };

        fetchContext();
    }, [oauthState.state]);

    // DEBUG: Add user state to debug UI
    const [debugInfo, setDebugInfo] = useState<{ user?: string; error?: string; raw?: any; diag?: string }>({});

    // PROACTIVE RECOVERY: If we have an authorization_id but no state/scope (e.g. fresh page load after login),
    // we must fetch the details from Supabase immediately to populate the UI.
    // SESSION CHECK & RECOVERY
    useEffect(() => {
        const checkSessionAndRecover = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            setDebugInfo(prev => ({ ...prev, user: user?.id || 'none' }));

            // 1. Force Login if not authenticated
            if (!user) {
                console.log('User not logged in, redirecting to login...');
                const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/auth/login?next=${returnUrl}`;
                return;
            }

            // 2. Proactive Recovery: If we have authorization_id but no state, fetch details
            // 2. Proactive Recovery: If we have authorization_id but no state, fetch details
            const authId = searchParams.get('authorization_id');
            if (authId) { // Check always if authId exists, not just if state is missing
                try {
                    // @ts-ignore
                    const result = await (supabase.auth as any).oauth?.getAuthorizationDetails(authId);
                    // Log raw result structure
                    setDebugInfo(prev => ({ ...prev, raw: result }));

                    const { data, error } = result || {};

                    if (data) {
                        console.log('Proactively recovered details from Supabase:', data);
                        setOauthState(prev => ({
                            ...prev,
                            state: data.state || prev.state,
                            client_id: data.client_id || prev.client_id,
                            redirect_uri: data.redirect_uri || prev.redirect_uri,
                            scope: data.scope || prev.scope
                        }));

                        // SHORT-CIRCUIT: If code is already present, forward immediately
                        if (data.redirect_url && data.redirect_url.includes('code=')) {
                            console.log("SHORT-CIRCUIT (Mount): Code already present. Forwarding.");
                            window.location.assign(data.redirect_url);
                        }
                    } else if (error) {
                        console.error('Recover auth details error:', error);
                        setDebugInfo(prev => ({ ...prev, error: error.message }));
                    } else {
                        // Weird case: no data and no error
                        setDebugInfo(prev => ({ ...prev, error: 'Empty response from Supabase' }));
                    }
                } catch (e: any) {
                    console.error('Failed to recover auth details on mount:', e);
                    setDebugInfo(prev => ({ ...prev, error: e.message, raw: e }));
                }
            }
        };

        checkSessionAndRecover();
    }, [searchParams, oauthState.state]);

    const { client_id: clientId, state, redirect_uri: redirectUri, scope, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod } = oauthState;

    // Validate all required OAuth parameters
    const validationError = useMemo(() => {
        const authId = searchParams.get('authorization_id');
        // If we are loading details, don't show error yet
        if (authId && !clientId) return null;

        if (!clientId) return 'Fehlender Parameter: client_id';
        if (!redirectUri) return 'Fehlender Parameter: redirect_uri';
        // Relax state check if we are in the middle of recovery
        if (!state && !authId) return 'Fehlender Parameter: state';
        // if (!scope) return 'Fehlender Parameter: scope'; // relax scope check, it might be loading
        if (!codeChallenge && !authId) return 'Fehlender Parameter: code_challenge'; // authId flow implies we recover this later

        return null; // All good or waiting for recovery
    }, [clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod, searchParams]);

    // Use environment variable for Supabase URL
    const supabaseAuthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${SUPABASE_API_PATHS.OAUTH_AUTHORIZE}`;

    const handleAllow = async () => {
        setIsLoading(true);
        const authId = searchParams.get('authorization_id');
        const supabase = createClient();

        // The API call (approveAuthorization) was failing with 404 (session mismatch).
        // Now that we have fixed the Scope Mismatch in the Worker and Consent Page,
        // the standard redirect back to Supabase should work without looping.

        // Ensure we only send supported scopes to Supabase to match the Worker's initiation
        // authorization_id is present, we are finalizing the flow.
        const workerCallbackUri = 'https://mcp.mietevo.de/callback';

        const params = new URLSearchParams();

        if (authId) {
            try {
                // Ensure user is logged in
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/auth/login?next=${returnUrl}`;
                    return;
                }

                console.log("Fetching authorization details for:", authId);
                // @ts-ignore
                const result = await (supabase.auth as any).oauth?.getAuthorizationDetails(authId);

                if (result.error) {
                    console.error("Fetch Details Error:", result.error);
                    alert(`Error: ${result.error.message}`);
                    return;
                }

                // Extracted Details from Supabase Session
                const details = result.data;
                console.log("Authorization Details Recovered:", details);

                if (!details) {
                    console.error("Missing authorization details.", details);
                    alert("Fatal: Could not recover authorization details. Please restart flow.");
                    return;
                }

                // SHORT-CIRCUIT: If Supabase has already generated the code (auto-approve scenario or existing session),
                // it returns the final redirect URL in the details. We should just go there.
                // This fixes the loop where Supabase sends us back to Consent, but Consent sends us back to Supabase.
                if (details.redirect_url && details.redirect_url.includes('code=')) {
                    console.log("SHORT-CIRCUIT: Code already present in redirect_url. Forwarding immediately.", details.redirect_url);
                    window.location.assign(details.redirect_url);
                    return;
                }

                // THE MASTER FIX: Use the Recovered details to approve
                // We rely on authorization_id to link back to the valid PKCE session in Supabase
                // Robustly extract client_id from possible locations in the response
                let recoveredClientId = details.client_id || details.client?.id || details.client_info?.id || clientId;

                // Sanitization: Ensure redirect_uri has no query params, which Supabase rejects
                let recoveredRedirectUri = details.redirect_uri || details.redirect_url || 'https://mcp.mietevo.de/callback';
                try {
                    const url = new URL(recoveredRedirectUri);
                    recoveredRedirectUri = url.origin + url.pathname;
                } catch (e) {
                    console.warn('Could not sanitize redirect_uri:', recoveredRedirectUri);
                }

                // FALLBACK: If client_id is missing but we recognize the redirect_uri (MCP Worker), use the known ID
                if (!recoveredClientId && recoveredRedirectUri?.includes('mcp.mietevo.de')) {
                    console.log('Using fallback Client ID for Mietevo MCP');
                    recoveredClientId = 'b7fee65f-13af-4c19-b749-85fad88253fd';
                }

                if (!recoveredClientId) {
                    console.error("Critical: Could not find client_id in details", JSON.stringify(details));
                    alert(`Fatal: Missing Client ID in authorization details. \n\nDebug Info: ${JSON.stringify(details, null, 2)}`);
                    return;
                }

                const params = new URLSearchParams();
                params.set('response_type', 'code');
                params.set('client_id', recoveredClientId);
                params.set('redirect_uri', recoveredRedirectUri);
                // Use the state recovered from Supabase (which should match the one passed by Worker)
                // If details.state is missing, fall back to the state from URL params
                let flowState = details.state || state;

                // FALLBACK: Extract state from redirect_url if available (Supabase sometimes puts it there but not in top-level prop)
                if (!flowState && details.redirect_url) {
                    try {
                        const urlObj = new URL(details.redirect_url);
                        flowState = urlObj.searchParams.get('state');
                        console.log('Recovered state from redirect_url:', flowState);
                    } catch (e) {
                        console.warn('Failed to parse state from redirect_url', e);
                    }
                }

                if (!flowState) {
                    console.error("Critical: OAuth state is missing in details, redirect_url, and URL parameters.", details);
                    alert(`Fatal: OAuth state lost. \n\nSupabase Return Details:\n${JSON.stringify(details, null, 2)}`);
                    return;
                }

                params.set('state', flowState);
                params.set('scope', details.scope || 'openid profile email');

                // Only include PKCE if returned by Supabase, otherwise try to recover from Worker
                if (details.code_challenge) {
                    params.set('code_challenge', details.code_challenge);
                    params.set('code_challenge_method', details.code_challenge_method || 'S256');
                } else if (recoveredRedirectUri?.includes('mcp.mietevo.de')) {
                    // Try to fetch context from Worker
                    try {
                        console.log(`Fetching PKCE context from Worker for state: ${flowState}`);
                        const contextRes = await fetch(`https://mcp.mietevo.de/auth/context?state=${flowState}`);

                        if (contextRes.ok) {
                            const context = await contextRes.json();
                            if (context.code_challenge) {
                                console.log('Recovered PKCE challenge from Worker:', context.code_challenge);
                                params.set('code_challenge', context.code_challenge);
                                params.set('code_challenge_method', context.code_challenge_method || 'S256');
                            } else {
                                console.error('Worker context returned no code_challenge', context);
                                alert(`Fatal: retrieved context from Worker but code_challenge is missing.\n\nContext: ${JSON.stringify(context)}`);
                                return;
                            }
                        } else {
                            console.warn('Failed to fetch context from Worker', contextRes.status);
                            const errText = await contextRes.text();
                            alert(`Fatal: Failed to recover PKCE context from Worker.\nStatus: ${contextRes.status}\nError: ${errText}`);
                            return;
                        }
                    } catch (err: any) {
                        console.error('Error fetching Worker context:', err);
                        alert(`Fatal: Network error fetching PKCE contest.\n${err.message}`);
                        return;
                    }
                } else {
                    // Non-MCP flow without Code Challenge? Should theoretically not happen for PKCE clients.
                    console.warn('Proceeding without PKCE (not an MCP flow?)');
                }

                params.set('authorization_id', authId); // CRITICAL: Link to existing ID

                const finalRedirectUrl = `${supabaseAuthUrl}?${params.toString()}`;
                console.log("Approving via Redirect with Recovered PKCE:", finalRedirectUrl);

                // Show a manual link in case automatic redirect fails (e.g. pop-up blocker or strict browser settings)
                const manualLinkInfo = document.createElement('div');
                manualLinkInfo.innerHTML = `<p style="margin-top:20px; text-align:center; color: white;">Falls die Weiterleitung nicht funktioniert: <a href="${finalRedirectUrl}" style="text-decoration:underline; font-weight:bold;">Hier klicken</a></p>`;
                document.querySelector('.relative.z-10')?.appendChild(manualLinkInfo);

                // Force navigation
                window.location.assign(finalRedirectUrl);
                return;

            } catch (e: any) {
                console.error("Critical Error in Approval Flow:", e);
                alert(`System Error during redirect: ${e.message}`);
                setIsLoading(false);
                return;
            }
        } else {
            // Initial Flow / Fallback
            const params = new URLSearchParams();
            params.set('response_type', 'code');
            params.set('client_id', clientId!);
            params.set('redirect_uri', workerCallbackUri);
            params.set('state', state!);
            params.set('scope', 'openid profile email');
            params.set('code_challenge', codeChallenge!);
            params.set('code_challenge_method', codeChallengeMethod!);

            console.log("Redirecting to Supabase:", `${supabaseAuthUrl}?${params.toString()}`);
            window.location.assign(`${supabaseAuthUrl}?${params.toString()}`);
        }
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
                        {/* DEBUG SECTION - REMOVE BEFORE PRODUCTION */}
                        <div className="p-2 bg-black/80 text-green-400 text-xs font-mono rounded mb-4 overflow-auto max-h-32">
                            <p>AuthId: {searchParams.get('authorization_id') || 'none'}</p>
                            <p>State: {oauthState.state || 'missing'}</p>
                            <p>ClientID: {oauthState.client_id || 'missing'}</p>
                            <p>Scope Count: {formattedScopes.length}</p>
                            <p>Worker Context: {oauthState.scope ? 'Loaded' : 'Not Loaded'}</p>
                            <p className="text-blue-300">User: {debugInfo.user || 'checking...'}</p>
                            {debugInfo.diag && <p className="text-yellow-300">Diag: {debugInfo.diag}</p>}
                            {debugInfo.error && <p className="text-red-400 font-bold">Error: {debugInfo.error}</p>}
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-[10px] text-gray-400">Raw Response:</p>
                                <pre className="text-[8px] whitespace-pre-wrap break-all text-gray-400">
                                    {JSON.stringify(debugInfo.raw || 'no-response', null, 2)}
                                </pre>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] mt-2 bg-transparent border-white/20 text-white hover:bg-white/10"
                                onClick={() => window.location.reload()}
                            >
                                Force Reload
                            </Button>
                        </div>

                        <div className="rounded-2xl bg-muted/40 border border-border p-5">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Angeforderte Berechtigungen</h3>
                            <ul className="space-y-4">
                                {formattedScopes.length === 0 && (
                                    <li className="text-sm text-muted-foreground italic">Keine Berechtigungen gefunden (Lade...)</li>
                                )}
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
                            type="button"
                            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={(e) => { e.preventDefault(); handleAllow(); }}
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

