'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    getAuthorizationDetailsAction,
    submitDecisionAction,
    getUserMcpOrganisationsAction,
    saveUserMcpAuthorizationAction,
    type AuthorizationDetails,
    type UserMcpOrganisationItem,
    type UserMcpScopes
} from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    ShieldAlert,
    Check,
    Loader2,
    AlertTriangle,
    X,
    Terminal,
    Building2,
    ShieldCheck,
    Clock,
    Sparkles,
    Eye,
    SlidersHorizontal,
    Home,
    Users,
    Wallet,
    Gauge,
    CheckSquare,
    FileText,
    ChevronDown
} from 'lucide-react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
    type: 'consent' | 'error' | 'loading' | 'success' | 'manage';
    error?: string;
    authorizationId?: string;
    clientName?: string;
    clientIcon?: string;
    redirectUri?: string;
    scopes?: string[];
    isDemo?: boolean;
    initialData?: AuthorizationDetails;
    initialError?: string;
    autoRedirectUrl?: string;
    initialOrganisations?: UserMcpOrganisationItem[];
}

import { LOGO_URL, BRAND_NAME, OAUTH_CLIENT_IDS, MIETEVO_MCP_URL } from '@/lib/constants';

import { isValidRedirect, isValidSupabaseRedirect } from '@/lib/oauth-utils';

// Logo header — logos, arrow, and labels shared between manage and consent screens
function OriginProductLogos({ clientIcon, clientName }: { clientIcon: string | null; clientName: string }) {
    const [imageError, setImageError] = useState(false);
    const showIcon = clientIcon && !imageError;

    return (
        <>
            <div className="flex items-center justify-center gap-24 relative mb-10 pt-6">
                {/* Left Card - Origin App */}
                <motion.div
                    initial={{ x: -20, opacity: 0, rotate: -15 }}
                    animate={{ x: 0, opacity: 1, rotate: -8 }}
                    whileHover={{ rotate: -3, scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                    className={cn(
                        "w-16 h-16 rounded-4xl shadow-md dark:shadow-xl flex items-center justify-center shrink-0 relative z-10",
                        showIcon
                            ? "bg-white border border-border/40 dark:border-border/50 overflow-hidden" 
                            : "bg-card border border-border/40 dark:border-border/70 overflow-hidden"
                    )}
                >
                    {showIcon && <div className="absolute inset-0 bg-linear-to-tr from-black/5 to-transparent mix-blend-multiply dark:mix-blend-normal dark:from-white/10 dark:to-transparent" />}
                    {!showIcon && <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />}
                    
                    {showIcon ? (
                        <img src={clientIcon} alt={clientName} onError={() => setImageError(true)} className="w-10 h-10 object-contain drop-shadow-xs relative z-10" />
                    ) : (
                        <Terminal className="w-7 h-7 text-primary relative z-10" />
                    )}
                </motion.div>

                {/* SVG Connecting Path */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 flex items-center justify-center pointer-events-none z-0">
                    <svg className="w-36 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
                        {/* Static dashed path */}
                        <path
                            d="M 5,22 Q 50,5 95,22"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="4 4"
                            className="text-muted-foreground/30 dark:text-zinc-700/80"
                        />
                    </svg>
                </div>

                {/* Right Card - Mietevo Main Application */}
                <motion.div
                    initial={{ x: 20, opacity: 0, rotate: 15 }}
                    animate={{ x: 0, opacity: 1, rotate: 8 }}
                    whileHover={{ rotate: 3, scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
                    className="w-16 h-16 rounded-4xl bg-card border border-border/40 dark:border-border/70 shadow-md dark:shadow-xl flex items-center justify-center shrink-0 relative overflow-hidden z-10"
                >
                    <div className="absolute inset-0 bg-linear-to-tr from-black/5 dark:from-black/20 to-transparent" />
                    <img src={LOGO_URL} alt={BRAND_NAME} className="w-10 h-10 object-contain relative z-10 dark:brightness-110" />
                </motion.div>
            </div>
        </>
    );
}

// Map known OAuth client hosts to display names and icons
// Based on Client ID Metadata Document (CIMD) hosts and redirect URI hosts
function getClientConfigFromHost(host: string): { name: string; icon: string } | null {
    const normalizedHost = host.replace(/^www\./, '');

    const knownClients: Record<string, { name: string; icon: string }> = {
        'notion.so': { name: 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png' },
        'api.notion.com': { name: 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png' },
        'claude.ai': { name: 'Claude', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Claude_AI_logo.svg' },
        'anthropic.com': { name: 'Claude', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Claude_AI_logo.svg' },
        'chatgpt.com': { name: 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
        'openai.com': { name: 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
        'api.openai.com': { name: 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
        'perplexity.ai': { name: 'Perplexity', icon: 'https://www.perplexity.ai/favicon.ico' },
        'api.perplexity.ai': { name: 'Perplexity', icon: 'https://www.perplexity.ai/favicon.ico' },
        'cursor.com': { name: 'Cursor', icon: 'https://cursor.com/favicon.ico' },
        'cursor.sh': { name: 'Cursor', icon: 'https://cursor.com/favicon.ico' },
        'google.com': { name: 'Gemini', icon: 'https://www.google.com/favicon.ico' },
        'vertexaisearch.cloud.google.com': { name: 'Gemini', icon: 'https://www.google.com/favicon.ico' },
        'generativelanguage.googleapis.com': { name: 'Gemini', icon: 'https://www.google.com/favicon.ico' },
        'windsurf.com': { name: 'Windsurf', icon: 'https://windsurf.com/favicon.ico' },
        'codeium.com': { name: 'Windsurf', icon: 'https://windsurf.com/favicon.ico' },
        'replit.com': { name: 'Replit', icon: 'https://replit.com/favicon.ico' },
        'sourcegraph.com': { name: 'Cody', icon: 'https://sourcegraph.com/favicon.ico' },
        'cody.dev': { name: 'Cody', icon: 'https://sourcegraph.com/favicon.ico' },
    };

    if (knownClients[normalizedHost]) return knownClients[normalizedHost];

    for (const [knownHost, config] of Object.entries(knownClients)) {
        if (normalizedHost === knownHost || normalizedHost.endsWith('.' + knownHost)) {
            return config;
        }
    }

    return null;
}

function getSmartClientConfig(
    id: string | undefined,
    name: string | undefined,
    providedUri: string | undefined,
    redirectTarget: string | undefined,
    defaultName: string | undefined,
    defaultIcon: string | null | undefined
): { name: string; icon: string | null } {
    const lowerName = (name || '').toLowerCase();

    if (id === OAUTH_CLIENT_IDS.MIETEVO) return { name: 'Mietevo', icon: LOGO_URL };
    if (id === OAUTH_CLIENT_IDS.MIETEVO_PUBLIC_MCP) return { name: 'Mietevo Public MCP', icon: LOGO_URL };

    if (providedUri) return { name: name || 'Unbekannte Anwendung', icon: providedUri };

    if (id && id.startsWith('https://')) {
        try {
            const clientIdUrl = new URL(id);
            const host = clientIdUrl.hostname.toLowerCase();
            const cimdConfig = getClientConfigFromHost(host);
            if (cimdConfig) return { name: name || cimdConfig.name, icon: cimdConfig.icon };
        } catch {
            // Invalid URL, fall through
        }
    }

    if (redirectTarget) {
        try {
            const redirectUrl = new URL(redirectTarget);
            const host = redirectUrl.hostname.toLowerCase();
            const redirectConfig = getClientConfigFromHost(host);
            if (redirectConfig) return { name: name || redirectConfig.name, icon: redirectConfig.icon };
        } catch {
            // Invalid URL, fall through
        }
    }

    if (lowerName.includes('notion')) return { name: name || 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png' };
    if (lowerName.includes('claude') || lowerName.includes('anthropic')) return { name: name || 'Claude', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Claude_AI_logo.svg' };
    if (lowerName.includes('chatgpt') || lowerName.includes('openai') || lowerName.includes('codex')) return { name: name || 'ChatGPT', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' };
    if (lowerName.includes('perplexity')) return { name: name || 'Perplexity', icon: 'https://www.perplexity.ai/favicon.ico' };
    if (lowerName.includes('cursor')) return { name: name || 'Cursor', icon: 'https://cursor.com/favicon.ico' };
    if (lowerName.includes('gemini') || lowerName.includes('google')) return { name: name || 'Gemini', icon: 'https://www.google.com/favicon.ico' };
    if (lowerName.includes('windsurf') || lowerName.includes('codeium')) return { name: name || 'Windsurf', icon: 'https://windsurf.com/favicon.ico' };

    return { name: name || defaultName || 'Unbekannte Anwendung', icon: defaultIcon || null };
}

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
    showGlow = false,
    motionProps = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    }
}: {
    children: React.ReactNode;
    className?: string;
    showGlow?: boolean;
    motionProps?: HTMLMotionProps<"div">;
}) {
    return (
        <div className={cn("min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden font-sans", className)}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

            {showGlow && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 dark:bg-primary/20 blur-[100px] dark:blur-[120px] rounded-full pointer-events-none"
                />
            )}

            <motion.div
                {...motionProps}
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
    initialError,
    autoRedirectUrl,
    initialOrganisations
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
    const [countdown, setCountdown] = useState(5);

    const [organisations, setOrganisations] = useState<UserMcpOrganisationItem[]>(initialOrganisations || []);
    const [isLoadingOrgs, setIsLoadingOrgs] = useState(!isDemo && (!initialOrganisations || initialOrganisations.length === 0));
    const [allowAllOrgs, setAllowAllOrgs] = useState<boolean>(() => {
        if (initialOrganisations && initialOrganisations.length > 0) {
            const hasAuthRecord = initialOrganisations.some(o => o.allow_all || o.is_authorized);
            if (hasAuthRecord) {
                return initialOrganisations.some(o => o.allow_all);
            }
        }
        return true;
    });
    const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>(() => {
        if (initialOrganisations && initialOrganisations.length > 0) {
            const hasAuthRecord = initialOrganisations.some(o => o.allow_all || o.is_authorized);
            const result: string[] = [];
            if (hasAuthRecord) {
                for (const o of initialOrganisations) {
                    if (o.is_authorized && o.mcp_zugriff_aktiviert) {
                        result.push(o.organisation_id);
                    }
                }
            } else {
                for (const o of initialOrganisations) {
                    if (o.mcp_zugriff_aktiviert) {
                        result.push(o.organisation_id);
                    }
                }
            }
            return result;
        }
        return [];
    });

    const selectedOrgSet = useMemo(() => new Set(selectedOrgIds), [selectedOrgIds]);
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(true);

    // Scope & Read/Write selection mode
    type ScopeMode = 'full' | 'readonly' | 'custom';
    const [scopeMode, setScopeMode] = useState<ScopeMode>(() => {
        const existing = initialOrganisations?.[0]?.scopes;
        if (existing) {
            if (existing.all === true && existing.write !== false) return 'full';
            if (existing.all === true && existing.write === false) return 'readonly';
            if (existing.all === false) return 'custom';
        }
        return 'full';
    });

    const [moduleScopes, setModuleScopes] = useState<Record<string, { read: boolean; write: boolean }>>(() => {
        const initialMap: Record<string, { read: boolean; write: boolean }> = {};
        const existingMap = initialOrganisations?.[0]?.scopes?.module;
        const defaultMods = [
            { id: 'haeuser', defaultRead: true, defaultWrite: true },
            { id: 'wohnungen', defaultRead: true, defaultWrite: true },
            { id: 'mieter', defaultRead: true, defaultWrite: false },
            { id: 'finanzen', defaultRead: true, defaultWrite: false },
            { id: 'zaehler', defaultRead: true, defaultWrite: true },
            { id: 'aufgaben', defaultRead: true, defaultWrite: true },
            { id: 'dokumente', defaultRead: true, defaultWrite: false },
        ];
        for (const mod of defaultMods) {
            initialMap[mod.id] = {
                read: existingMap?.[mod.id]?.read ?? mod.defaultRead,
                write: existingMap?.[mod.id]?.write ?? mod.defaultWrite,
            };
        }
        return initialMap;
    });

    const handleToggleModuleScope = (moduleId: string, action: 'read' | 'write') => {
        setModuleScopes(prev => {
            const current = prev[moduleId] || { read: true, write: false };
            const updated = { ...current, [action]: !current[action] };
            if (action === 'write' && updated.write && !updated.read) {
                updated.read = true;
            }
            if (action === 'read' && !updated.read && updated.write) {
                updated.write = false;
            }
            return { ...prev, [moduleId]: updated };
        });
    };

    // Auto-close success window after a delay with visible countdown
    useEffect(() => {
        if (type !== 'success' || typeof window === 'undefined') return;

        const interval = setInterval(() => {
            setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);

        const timer = setTimeout(() => {
            // Only try to close if it's likely a popup
            if (window.opener || window.history.length === 1) {
                window.close();
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
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

    const clientId = authDetails?.client?.id;
    const redirectUri = authDetails?.redirect_uri || initialRedirectUri;
    const { name: clientName, icon: clientIcon } = getSmartClientConfig(
        clientId,
        authDetails?.client?.name || initialClientName,
        authDetails?.client?.logo_uri,
        redirectUri || autoRedirectUrl,
        initialClientName,
        initialClientIcon
    );

    const [orgFetchError, setOrgFetchError] = useState<string | null>(null);

    const fetchOrgs = useCallback(async () => {
        if (isDemo || type === 'error' || type === 'success') {
            setIsLoadingOrgs(false);
            return;
        }

        setIsLoadingOrgs(true);
        setOrgFetchError(null);

        try {
            const res = await getUserMcpOrganisationsAction(clientId);
            if (res.success && res.data) {
                setOrganisations(res.data);
                const hasAuth = res.data.some(o => o.allow_all || o.is_authorized);
                if (hasAuth) {
                    const isAll = res.data.some(o => o.allow_all);
                    setAllowAllOrgs(isAll);
                    const selected: string[] = [];
                    for (const o of res.data) {
                        if (o.is_authorized && o.mcp_zugriff_aktiviert) {
                            selected.push(o.organisation_id);
                        }
                    }
                    setSelectedOrgIds(selected);
                } else {
                    setAllowAllOrgs(true);
                    const selected: string[] = [];
                    for (const o of res.data) {
                        if (o.mcp_zugriff_aktiviert) {
                            selected.push(o.organisation_id);
                        }
                    }
                    setSelectedOrgIds(selected);
                }
            } else {
                setOrgFetchError(res.error || 'Organisationen konnten nicht geladen werden.');
            }
        } catch (err) {
            console.error('Failed to fetch user organisations:', err);
            setOrgFetchError(err instanceof Error ? err.message : 'Unerwarteter Fehler beim Laden der Organisationen.');
        } finally {
            setIsLoadingOrgs(false);
        }
    }, [clientId, isDemo, type]);

    // Fetch organisations for the client if not already provided
    useEffect(() => {
        if (initialOrganisations && initialOrganisations.length > 0) {
            setIsLoadingOrgs(false);
            return;
        }
        fetchOrgs();
    }, [fetchOrgs, initialOrganisations]);

    const handleToggleOrg = (orgId: string, isEnabled: boolean) => {
        if (!isEnabled) return;
        setSelectedOrgIds(prev =>
            prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
        );
    };

    const enabledOrgs = organisations.filter(o => o.mcp_zugriff_aktiviert);
    const hasEnabledOrgs = enabledOrgs.length > 0;
    const hasValidOrgSelection = allowAllOrgs
        ? hasEnabledOrgs
        : selectedOrgIds.some(id => enabledOrgs.some(o => o.organisation_id === id));

    const toggleAllowAll = () => {
        const newAllowAll = !allowAllOrgs;
        setAllowAllOrgs(newAllowAll);
        if (newAllowAll) {
            setSelectedOrgIds(enabledOrgs.map(o => o.organisation_id));
        }
    };

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
            // Instead, use the redirect_url from the initial GET details response directly.
            const autoRedirectUrl = (authDetails as any)?.redirect_url || (authDetails as any)?.redirect_to;
            const isAutoApproved = autoRedirectUrl && !authDetails?.client;

            if (isAutoApproved) {
                if (decision === 'deny') {
                    // For auto-approved, the access is already granted. Denying now would face the same
                    // 405 constraint, so we gracefully abort and inform the user.
                    setProcessError('This application is already approved. You can revoke access from your account settings.');
                    setIsProcessing(false);
                    return;
                }

                if (!autoRedirectUrl) {
                    setProcessError('Automatically approved authorization has no redirect URL. Please try again.');
                    setIsProcessing(false);
                    return;
                }

                setIsProcessing(false); // defensive reset before navigation
                safeRedirect(autoRedirectUrl);
                return;
            }

            // Save MCP organisation authorization before submitting consent decision
            if (decision === 'approve' && !isDemo) {
                if (isLoadingOrgs) {
                    setProcessError('Organisationsdaten werden noch geladen. Bitte warten.');
                    setIsProcessing(false);
                    return;
                }

                if (organisations.length === 0 || !hasValidOrgSelection) {
                    setProcessError('Keine freigebbaren Organisationen verfügbar. Autorisierung kann nicht erteilt werden.');
                    setIsProcessing(false);
                    return;
                }

                if (clientId && organisations.length > 0) {
                    const enabledOrgList = organisations.filter(o => o.mcp_zugriff_aktiviert);
                    const orgsToSave = allowAllOrgs
                        ? enabledOrgList.map(o => o.organisation_id)
                        : selectedOrgIds.filter(id => enabledOrgList.some(o => o.organisation_id === id));

                    let scopesToSave: UserMcpScopes;
                    if (scopeMode === 'full') {
                        scopesToSave = { all: true, write: true };
                    } else if (scopeMode === 'readonly') {
                        scopesToSave = { all: true, write: false };
                    } else {
                        scopesToSave = {
                            all: false,
                            write: Object.values(moduleScopes).some(m => m.write),
                            module: moduleScopes,
                        };
                    }

                    const saveResult = await saveUserMcpAuthorizationAction(
                        clientId,
                        orgsToSave,
                        allowAllOrgs,
                        scopesToSave
                    );

                    if (!saveResult.success) {
                        setProcessError(saveResult.error || 'Fehler beim Speichern der Organisationsberechtigungen.');
                        setIsProcessing(false);
                        return;
                    }
                }
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
                <Card className="border-border/50 dark:border-border/30 bg-background/80 dark:bg-background/60 backdrop-blur-2xl shadow-xl dark:shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-8">
                        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20 p-4 shadow-inner">
                            <Check className="w-10 h-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                            Verbindung hergestellt
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 flex flex-col items-center">
                        <p className="text-muted-foreground text-center mb-5 text-sm leading-relaxed max-w-sm">
                            Diese Autorisierung wurde bereits erfolgreich verarbeitet.
                            Sie können dieses Fenster schließen.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 dark:bg-muted/30 border border-border/40 px-3.5 py-1.5 rounded-full shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Fenster schließt in {countdown}s</span>
                        </div>
                    </CardContent>
                </Card>
            </FullScreenLayout>
        );
    }

    // Manage screen — app was previously authorized, show details + continue/manage actions
    if (type === 'manage') {
        return (
            <FullScreenLayout
                showGlow
                motionProps={{
                    initial: { opacity: 0, y: 30, scale: 0.95 },
                    animate: { opacity: 1, y: 0, scale: 1 },
                    transition: { duration: 0.6, type: "spring", bounce: 0.4 }
                }}
            >
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-linear-to-br from-primary/30 to-primary/0 dark:from-primary/40 dark:to-primary/5 rounded-[2.5rem] blur-md opacity-30 dark:opacity-50 group-hover:opacity-60 dark:group-hover:opacity-80 transition duration-1000 group-hover:duration-300" />

                    <Card className="relative border-border/50 dark:border-border/30 bg-background/80 dark:bg-background/60 backdrop-blur-2xl shadow-xl dark:shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-10 px-8">
                            <OriginProductLogos clientIcon={clientIcon} clientName={clientName} />
                            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-linear-to-br from-foreground to-muted-foreground pb-1">
                                Bereits verbunden
                            </CardTitle>
                            <CardDescription className="text-base mt-2 max-w-sm mx-auto text-muted-foreground">
                                <span className="font-semibold text-foreground">{clientName}</span> ist bereits mit <span className="font-semibold text-primary">Mietevo MCP</span> verbunden.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-4">
                            {scopes.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
                                        Aktuelle Berechtigungen:
                                    </h3>
                                    <div className="rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 overflow-hidden shadow-inner backdrop-blur-xs p-3 space-y-2">
                                        {scopes.map((scope, index) => {
                                            const details = getScopeDetails(scope);
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * index }}
                                                    key={scope}
                                                    className="group/scope flex items-start gap-3.5 p-3 rounded-xl bg-card border border-border/40 hover:border-border/80 hover:bg-card/90 shadow-2xs transition-all duration-200"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover/scope:bg-primary/20 transition-colors">
                                                        <Check className="w-3.5 h-3.5" />
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
                                </div>
                            )}

                            {processError && (
                                <Alert variant="destructive" className="rounded-xl mb-4 bg-destructive/10 text-destructive border-destructive/20">
                                    <AlertDescription>{processError}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3 px-8 pb-8">
                            <Button
                                onClick={() => {
                                    if (autoRedirectUrl) {
                                        if (isValidRedirect(autoRedirectUrl) || isValidSupabaseRedirect(autoRedirectUrl)) {
                                            safeRedirect(autoRedirectUrl);
                                        } else {
                                            setProcessError('Ungültige Weiterleitungs-URL. Zugriff verweigert aus Sicherheitsgründen.');
                                        }
                                    } else {
                                        window.close();
                                        setTimeout(() => {
                                            window.location.href = '/';
                                        }, 100);
                                    }
                                }}
                                disabled={isProcessing}
                                className="w-full h-12 rounded-xl text-base font-semibold border-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(var(--primary),0.2)] dark:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.3)] dark:hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] transition-all duration-300"
                            >
                                <Check className="w-5 h-5 mr-2" />
                                Verbinden
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.open('/einstellungen', '_blank')}
                                className="w-full h-12 rounded-xl text-base font-medium"
                            >
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Verwalten
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    window.close();
                                    setTimeout(() => {
                                        window.location.href = '/';
                                    }, 100);
                                }}
                                className="w-full h-12 rounded-xl text-base font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Schließen
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </FullScreenLayout>
        );
    }

    // Consent form
    return (
        <FullScreenLayout
            showGlow
            motionProps={{
                initial: { opacity: 0, y: 30, scale: 0.95 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.6, type: "spring", bounce: 0.4 }
            }}
        >
            <div className="relative group">
                {/* Gradient glowing border effect (adapted for light/dark) */}
                <div className="absolute -inset-0.5 bg-linear-to-br from-primary/30 to-primary/0 dark:from-primary/40 dark:to-primary/5 rounded-[2.5rem] blur-md opacity-30 dark:opacity-50 group-hover:opacity-60 dark:group-hover:opacity-80 transition duration-1000 group-hover:duration-300" />

                <Card className="relative border-border/50 dark:border-border/30 bg-background/80 dark:bg-background/60 backdrop-blur-2xl shadow-xl dark:shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="text-center pt-10 px-8">
                            <OriginProductLogos clientIcon={clientIcon} clientName={clientName} />
                            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-linear-to-br from-foreground to-muted-foreground pb-1">
                                Verbindung autorisieren
                            </CardTitle>
                            <CardDescription className="text-base mt-2 max-w-sm mx-auto text-muted-foreground">
                                <span className="font-semibold text-foreground">{clientName}</span> möchte sich mit <span className="font-semibold text-primary">Mietevo MCP</span> verbinden.
                            </CardDescription>
                        </CardHeader>
                    <CardContent className="px-8 pb-4">
                        {/* Organisation Access Selector */}
                        {!isLoadingOrgs && organisations.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        <span>Freizugebende Organisationen:</span>
                                    </h3>
                                </div>

                                <div className="rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 overflow-hidden shadow-inner backdrop-blur-xs p-3 space-y-3">
                                    {/* Mode Selector Pill (Alle freigeben vs. Auswahl anpassen) */}
                                    {organisations.length > 1 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAllowAllOrgs(true);
                                                    setSelectedOrgIds(enabledOrgs.map(o => o.organisation_id));
                                                }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group",
                                                    allowAllOrgs
                                                        ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                                                        : "bg-card/60 border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-card"
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Building2 className={cn("w-3.5 h-3.5", allowAllOrgs ? "text-primary" : "text-muted-foreground")} />
                                                    <span className="text-xs font-semibold">Alle freigeben</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">Alle Organisationen</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAllowAllOrgs(false);
                                                    setIsOrgDropdownOpen(true);
                                                }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group",
                                                    !allowAllOrgs
                                                        ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                                                        : "bg-card/60 border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-card"
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <SlidersHorizontal className={cn("w-3.5 h-3.5", !allowAllOrgs ? "text-primary" : "text-muted-foreground")} />
                                                    <span className="text-xs font-semibold">Auswahl anpassen</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">Benutzerdefiniert</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* When "Alle freigeben" is active */}
                                    {allowAllOrgs && organisations.length > 1 && (
                                        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-card border border-primary/30 dark:border-primary/40 shadow-2xs">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Alle erlaubten Organisationen freigeben
                                                </span>
                                                <span className="text-[11px] text-muted-foreground leading-relaxed">
                                                    Zugriff auf alle {enabledOrgs.length} aktuellen und zukünftigen Organisationen mit aktiviertem MCP-Zugriff.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* When single org exists */}
                                    {organisations.length === 1 && (
                                        <div className="space-y-2 pt-0.5">
                                            {organisations.map((org) => {
                                                const isEnabled = org.mcp_zugriff_aktiviert;
                                                const isChecked = isEnabled && (allowAllOrgs || selectedOrgSet.has(org.organisation_id));

                                                return (
                                                    <div
                                                        key={org.organisation_id}
                                                        className={cn(
                                                            "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200",
                                                            isEnabled
                                                                ? "bg-card border-primary/40 dark:border-primary/50 shadow-xs ring-1 ring-primary/20"
                                                                : "bg-muted/30 border-dashed border-border/40 opacity-65"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold truncate">
                                                                        {org.name}
                                                                    </span>
                                                                    {org.ist_versteckt && (
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/60">
                                                                            Persönlich
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground capitalize">
                                                                    Rolle: {org.rolle === 'owner' ? 'Eigentümer' : org.rolle === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {!isEnabled && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px] px-2 py-0.5 shrink-0 bg-destructive/10 text-destructive border border-destructive/20"
                                                            >
                                                                Durch Administrator deaktiviert
                                                            </Badge>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Custom Mode: Dropdown with Checklist + Selected Cards List */}
                                    {(!allowAllOrgs && organisations.length > 1) && (
                                        <div className="space-y-2.5 pt-0.5">
                                            {/* Dropdown Checklist Trigger */}
                                            <button
                                                type="button"
                                                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                                                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-border/80 text-xs font-medium text-foreground transition-all duration-200 cursor-pointer shadow-2xs group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col text-left min-w-0">
                                                        <span className="font-semibold text-xs">
                                                            Organisationen auswählen ({selectedOrgIds.length} von {enabledOrgs.length})
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {isOrgDropdownOpen ? "Klicken zum Einklappen" : "Klicken zum Bearbeiten der Auswahl"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronDown className={cn("w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform duration-200", isOrgDropdownOpen && "rotate-180")} />
                                            </button>

                                            {/* Expandable Checklist */}
                                            {isOrgDropdownOpen && (
                                                <div className="space-y-1.5 p-2 rounded-xl bg-background/50 border border-border/30 backdrop-blur-xs">
                                                    {organisations.map((org) => {
                                                        const isEnabled = org.mcp_zugriff_aktiviert;
                                                        const isChecked = isEnabled && selectedOrgSet.has(org.organisation_id);

                                                        return (
                                                            <div
                                                                key={org.organisation_id}
                                                                role={isEnabled ? "button" : undefined}
                                                                tabIndex={isEnabled ? 0 : undefined}
                                                                onClick={() => {
                                                                    if (isEnabled) {
                                                                        handleToggleOrg(org.organisation_id, isEnabled);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (isEnabled && (e.key === 'Enter' || e.key === ' ')) {
                                                                        e.preventDefault();
                                                                        handleToggleOrg(org.organisation_id, isEnabled);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "flex items-center justify-between p-2.5 rounded-lg border transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                                                                    isEnabled
                                                                        ? isChecked
                                                                            ? "bg-card border-primary/40 dark:border-primary/50 shadow-2xs cursor-pointer"
                                                                            : "bg-card/50 border-border/30 hover:border-border/70 hover:bg-card cursor-pointer"
                                                                        : "bg-muted/30 border-dashed border-border/30 opacity-60 cursor-not-allowed"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <Checkbox
                                                                        id={`org-${org.organisation_id}`}
                                                                        checked={isChecked}
                                                                        disabled={!isEnabled}
                                                                        onCheckedChange={() => {
                                                                            if (isEnabled) {
                                                                                handleToggleOrg(org.organisation_id, isEnabled);
                                                                            }
                                                                        }}
                                                                        className="rounded-md"
                                                                    />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={cn(
                                                                                "text-xs font-semibold truncate",
                                                                                !isEnabled && "line-through text-muted-foreground font-normal"
                                                                            )}>
                                                                                {org.name}
                                                                            </span>
                                                                            {org.ist_versteckt && (
                                                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60">
                                                                                    Persönlich
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[10px] text-muted-foreground capitalize">
                                                                            Rolle: {org.rolle === 'owner' ? 'Eigentümer' : org.rolle === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {!isEnabled && (
                                                                    <Badge
                                                                        variant="destructive"
                                                                        className="text-[9px] px-2 py-0.5 shrink-0 bg-destructive/10 text-destructive border border-destructive/20"
                                                                    >
                                                                        Durch Administrator deaktiviert
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Selected Organisation Chips underneath */}
                                            {selectedOrgIds.length > 0 ? (
                                                <div className="pt-2 space-y-1.5">
                                                    <div className="text-[11px] font-medium text-muted-foreground px-1 flex items-center justify-between">
                                                        <span>Freizugebende Organisationen ({selectedOrgIds.length}):</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {organisations
                                                            .filter(org => org.mcp_zugriff_aktiviert && selectedOrgSet.has(org.organisation_id))
                                                            .map(org => (
                                                                <div
                                                                    key={`selected-chip-${org.organisation_id}`}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary border border-primary/25 text-xs font-medium shadow-2xs group"
                                                                >
                                                                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="truncate max-w-[180px]">Freigabe: {org.name}</span>
                                                                    {org.ist_versteckt && (
                                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">
                                                                            Persönlich
                                                                        </Badge>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleOrg(org.organisation_id, true);
                                                                        }}
                                                                        title={`${org.name} entfernen`}
                                                                        className="w-4 h-4 rounded-sm hover:bg-primary/20 flex items-center justify-center transition-colors cursor-pointer text-primary/70 hover:text-primary"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground flex items-center gap-2 mt-2">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                                    <span>Keine Organisation ausgewählt. Bitte oben in der Liste anhaken.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!hasEnabledOrgs && (
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                            <span>
                                                In allen Organisationen, in denen Sie Mitglied sind, wurde der MCP Server Zugriff durch einen Administrator deaktiviert.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Org fetch error with retry button */}
                        {!isLoadingOrgs && orgFetchError && (
                            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between gap-3 mb-6">
                                <div className="flex items-start gap-2 min-w-0">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed truncate">{orgFetchError}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchOrgs()}
                                    className="text-xs h-7 px-2.5 shrink-0 hover:bg-destructive/10"
                                >
                                    Erneut versuchen
                                </Button>
                            </div>
                        )}

                        {/* Banner when no organisations exist at all */}
                        {!isLoadingOrgs && !orgFetchError && organisations.length === 0 && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2 mb-6">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <span>
                                    Es wurden keine Organisationen für Ihr Benutzerkonto gefunden. Der MCP Server Zugriff kann nicht autorisiert werden.
                                </span>
                            </div>
                        )}

                        {/* Granular MCP Scopes & Read/Write Selector */}
                        {!isLoadingOrgs && organisations.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-primary" />
                                        <span>KI-Zugriff & Berechtigungen:</span>
                                    </h3>
                                    {scopeMode === 'custom' && (
                                        <button
                                            type="button"
                                            onClick={() => setScopeMode('full')}
                                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-transparent border-0"
                                        >
                                            Vollzugriff wählen
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 overflow-hidden shadow-inner backdrop-blur-xs p-3 space-y-3">
                                    {/* Mode Selector Radio Pills */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setScopeMode('full')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group",
                                                scopeMode === 'full'
                                                    ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                                                    : "bg-card/60 border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-card"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Sparkles className={cn("w-3.5 h-3.5", scopeMode === 'full' ? "text-primary" : "text-muted-foreground")} />
                                                <span className="text-xs font-semibold">Vollzugriff</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Lesen & Schreiben</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setScopeMode('readonly')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group",
                                                scopeMode === 'readonly'
                                                    ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                                                    : "bg-card/60 border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-card"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <Eye className={cn("w-3.5 h-3.5", scopeMode === 'readonly' ? "text-primary" : "text-muted-foreground")} />
                                                <span className="text-xs font-semibold">Nur Lesen</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Read-Only</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setScopeMode('custom')}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group",
                                                scopeMode === 'custom'
                                                    ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs ring-1 ring-primary/20"
                                                    : "bg-card/60 border-border/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-card"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <SlidersHorizontal className={cn("w-3.5 h-3.5", scopeMode === 'custom' ? "text-primary" : "text-muted-foreground")} />
                                                <span className="text-xs font-semibold">Granular</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Modulrechte</span>
                                        </button>
                                    </div>

                                    {/* Granular Module List when scopeMode === 'custom' */}
                                    {scopeMode === 'custom' && (
                                        <div className="space-y-2 pt-1">
                                            {[
                                                { id: 'haeuser', label: 'Häuser & Liegenschaften', desc: 'Gebäude, Adressen & Stammdaten', icon: Building2 },
                                                { id: 'wohnungen', label: 'Wohnungen & Einheiten', desc: 'Mieteinheiten, Flächen & Zimmer', icon: Home },
                                                { id: 'mieter', label: 'Mieter & Verträge', desc: 'Mieterdaten & Mietverträge', icon: Users },
                                                { id: 'finanzen', label: 'Finanzen & Transaktionen', desc: 'Mieteinnahmen & Betriebskosten', icon: Wallet },
                                                { id: 'zaehler', label: 'Zähler & Ablesungen', desc: 'Zählerstände & Verbrauchswerte', icon: Gauge },
                                                { id: 'aufgaben', label: 'Aufgaben & Tickets', desc: 'Instandhaltung & Handwerker', icon: CheckSquare },
                                                { id: 'dokumente', label: 'Dokumente & Vorlagen', desc: 'Dateien & Mietvertragsdokumente', icon: FileText },
                                            ].map((mod) => {
                                                const currentScope = moduleScopes[mod.id] || { read: false, write: false };
                                                const ModIcon = mod.icon;
                                                return (
                                                    <div
                                                        key={mod.id}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-border/80 transition-all duration-200 shadow-2xs"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                                            <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center text-foreground shrink-0">
                                                                <ModIcon className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-semibold text-foreground truncate">
                                                                    {mod.label}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground truncate">
                                                                    {mod.desc}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {/* Read Checkbox Chip */}
                                                            <label
                                                                className={cn(
                                                                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none",
                                                                    currentScope.read
                                                                        ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
                                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={`scope-read-${mod.id}`}
                                                                    checked={currentScope.read}
                                                                    onCheckedChange={() => handleToggleModuleScope(mod.id, 'read')}
                                                                    className="rounded-sm w-3.5 h-3.5"
                                                                />
                                                                <span>Lesen</span>
                                                            </label>

                                                            {/* Write Checkbox Chip */}
                                                            <label
                                                                className={cn(
                                                                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none",
                                                                    currentScope.write
                                                                        ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-2xs"
                                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={`scope-write-${mod.id}`}
                                                                    checked={currentScope.write}
                                                                    onCheckedChange={() => handleToggleModuleScope(mod.id, 'write')}
                                                                    className="rounded-sm w-3.5 h-3.5"
                                                                />
                                                                <span>Schreiben</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {scopes.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">
                                    Diese Anwendung darf:
                                </h3>
                                <div className="relative rounded-2xl border border-border/50 bg-muted/20 dark:bg-muted/10 overflow-hidden flex flex-col shadow-inner backdrop-blur-xs">
                                    {/* Top scroll fade */}
                                    {showTopFade && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute top-0 left-0 right-0 h-6 bg-linear-to-b from-muted/90 dark:from-background/90 to-transparent z-10 pointer-events-none"
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
                                                    className="group/scope flex items-start gap-3.5 p-3 rounded-xl bg-card border border-border/40 hover:border-border/80 hover:bg-card/90 shadow-2xs transition-all duration-200"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover/scope:bg-primary/20 transition-colors">
                                                        <Check className="w-3.5 h-3.5" />
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
                                            className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-muted/90 dark:from-background/90 to-transparent z-10 pointer-events-none flex items-end justify-center pb-1.5"
                                        >
                                            <motion.div
                                                animate={{ y: [0, 3, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                                className="w-5 h-5 rounded-full bg-background/50 border border-border/50 flex items-center justify-center backdrop-blur-md shadow-xs"
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

                        {/* Validation notice when no enabled org is selected or no orgs exist */}
                        {(!hasValidOrgSelection || organisations.length === 0) && !isLoading && !isLoadingOrgs && (
                            <p className="text-xs text-destructive text-center mb-4 font-medium">
                                {organisations.length === 0
                                    ? "Keine Organisationen verfügbar. Autorisierung nicht möglich."
                                    : !hasEnabledOrgs
                                    ? "Keine freigebbare Organisation verfügbar (MCP-Zugriff durch Administrator deaktiviert)."
                                    : "Bitte wählen Sie mindestens eine freizugebende Organisation aus."}
                            </p>
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
                            disabled={isProcessing || isLoading || isLoadingOrgs || (!isDemo && (organisations.length === 0 || !hasValidOrgSelection))}
                            className="w-full h-12 rounded-xl text-base font-semibold border-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(var(--primary),0.2)] dark:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.3)] dark:hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] transition-colors duration-300 disabled:opacity-50 disabled:pointer-events-none"
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
