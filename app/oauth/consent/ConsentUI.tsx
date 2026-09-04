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
    Minus,
    Loader2,
    AlertTriangle,
    X,
    Terminal,
    Building2,
    ShieldCheck,
    Clock,
    SlidersHorizontal,
    ChevronDown,
    Globe,
    Search
} from 'lucide-react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Scope descriptions mapping
const SCOPE_DETAILS: Record<string, { title: string; description: string }> = {
    'openid': {
        title: 'OpenID-Authentifizierung',
        description: 'Verifizierung Ihrer Identität über OpenID Connect.'
    },
    'profile': {
        title: 'Benutzerprofil',
        description: 'Lesezugriff auf Profilinformationen wie Ihren Namen und Ihr Profilbild.'
    },
    'profile:read': {
        title: 'Benutzerprofil',
        description: 'Lesezugriff auf Ihren Namen und Avatar.'
    },
    'email': {
        title: 'E-Mail-Adresse',
        description: 'Lesezugriff auf Ihre verifizierte E-Mail-Adresse.'
    },
    'email:read': {
        title: 'E-Mail-Adresse',
        description: 'Lesezugriff auf Ihre verifizierte E-Mail-Adresse.'
    },
    'offline_access': {
        title: 'Offline-Zugriff',
        description: 'Zugriff auf Ihre Daten, auch wenn Sie die Anwendung gerade nicht verwenden (Refresh Token).'
    },
    'properties:read': {
        title: 'Immobilien ansehen',
        description: 'Lesezugriff auf Ihre gespeicherten Immobilien (Häuser & Wohnungen).'
    },
    'properties:write': {
        title: 'Immobilien verwalten',
        description: 'Erlaubt das Erstellen, Bearbeiten und Löschen von Immobilien (Häuser & Wohnungen).'
    },
    'tenants:read': {
        title: 'Mieter ansehen',
        description: 'Lesezugriff auf Ihre gespeicherten Mieter- und Vertragsdaten.'
    },
    'tenants:write': {
        title: 'Mieter verwalten',
        description: 'Erlaubt das Erstellen, Bearbeiten und Löschen von Mieter- und Vertragsdaten.'
    },
    'finanzen:read': {
        title: 'Finanzen ansehen',
        description: 'Lesezugriff auf Finanzbuchungen, Mieteinnahmen und Betriebskosten.'
    },
    'finanzen:write': {
        title: 'Finanzen verwalten',
        description: 'Erlaubt das Erstellen, Bearbeiten und Löschen von Finanztransaktionen.'
    },
    'zaehler:read': {
        title: 'Zähler ansehen',
        description: 'Lesezugriff auf Zähler, Messgeräte und Ablesungen.'
    },
    'zaehler:write': {
        title: 'Zähler verwalten',
        description: 'Erlaubt das Erfassen und Bearbeiten von Zählerständen und Messgeräten.'
    },
    'aufgaben:read': {
        title: 'Aufgaben ansehen',
        description: 'Lesezugriff auf Aufgaben, Vorgänge und Instandhaltungstickets.'
    },
    'aufgaben:write': {
        title: 'Aufgaben verwalten',
        description: 'Erlaubt das Erstellen und Bearbeiten von Aufgaben und Vorgängen.'
    },
    'dokumente:read': {
        title: 'Dokumente ansehen',
        description: 'Lesezugriff auf hinterlegte Dokumente und Vorlagen.'
    },
    'dokumente:write': {
        title: 'Dokumente verwalten',
        description: 'Erlaubt das Hochladen und Verwalten von Dokumenten und Vorlagen.'
    },
    'betriebskosten:read': {
        title: 'Betriebskosten ansehen',
        description: 'Lesezugriff auf Betriebskostenabrechnungen und Abrechnungspositionen.'
    },
    'organisation:read': {
        title: 'Organisation ansehen',
        description: 'Lesezugriff auf Organisationsdaten und Mitglieder.'
    },
    'all': {
        title: 'Vollständiger Zugriff',
        description: 'Voller Lese- und Schreibzugriff auf alle Module Ihrer Organisationen.'
    },
    'mcp': {
        title: 'MCP Server Zugriff',
        description: 'Zugriff auf Ihre Daten über das Model Context Protocol.'
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

import { LOGO_URL, BRAND_NAME, OAUTH_CLIENT_IDS } from '@/lib/constants';

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
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-primary/10 dark:bg-primary/20 blur-[100px] dark:blur-[120px] rounded-full pointer-events-none"
                />
            )}

            <motion.div
                {...motionProps}
                className="relative z-10 w-full max-w-lg md:max-w-[530px]"
            >
                {children}
            </motion.div>
        </div>
    );
}

// 3-State Permission Level Type
type PermissionLevel = 'none' | 'read' | 'write';

interface PermissionDefinition {
    id: string;
    label: string;
    readLabel: string;
    writeLabel: string;
    noneLabel: string;
    desc: string;
    defaultLevel: PermissionLevel;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    {
        id: 'properties',
        label: 'Immobilien & Liegenschaften',
        readLabel: 'Immobilien ansehen',
        writeLabel: 'Immobilien verwalten',
        noneLabel: 'Kein Zugriff auf Immobilien',
        desc: 'Gebäude, Einheiten, Flächen & Adressen',
        defaultLevel: 'none',
    },
    {
        id: 'tenants',
        label: 'Mieter & Verträge',
        readLabel: 'Mieter ansehen',
        writeLabel: 'Mieter verwalten',
        noneLabel: 'Kein Zugriff auf Mieter',
        desc: 'Mieterdaten, Mietverträge & Kontakte',
        defaultLevel: 'none',
    },
    {
        id: 'finanzen',
        label: 'Finanzen & Zahlungen',
        readLabel: 'Finanzen ansehen',
        writeLabel: 'Finanzen verwalten',
        noneLabel: 'Kein Zugriff auf Finanzen',
        desc: 'Mieteinnahmen, Zahlungen & Betriebskosten',
        defaultLevel: 'none',
    },
    {
        id: 'zaehler',
        label: 'Zähler & Ablesungen',
        readLabel: 'Zähler ansehen',
        writeLabel: 'Zähler verwalten',
        noneLabel: 'Kein Zugriff auf Zähler',
        desc: 'Zählerstände, Messgeräte & Verbrauchswerte',
        defaultLevel: 'none',
    },
    {
        id: 'aufgaben',
        label: 'Aufgaben & Tickets',
        readLabel: 'Aufgaben ansehen',
        writeLabel: 'Aufgaben verwalten',
        noneLabel: 'Kein Zugriff auf Aufgaben',
        desc: 'Instandhaltung, Handwerker & Vorgänge',
        defaultLevel: 'none',
    },
    {
        id: 'dokumente',
        label: 'Dokumente & Vorlagen',
        readLabel: 'Dokumente ansehen',
        writeLabel: 'Dokumente verwalten',
        noneLabel: 'Kein Zugriff auf Dokumente',
        desc: 'Dateien, Vorlagen & Mietvertragsdokumente',
        defaultLevel: 'none',
    },
];

const EMPTY_SCOPES: string[] = [];

export default function ConsentUI({
    type,
    error,
    authorizationId,
    clientName: initialClientName,
    clientIcon: initialClientIcon,
    redirectUri: initialRedirectUri,
    scopes: initialScopes = EMPTY_SCOPES,
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
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
    const [orgSearchQuery, setOrgSearchQuery] = useState('');
    const orgDropdownRef = useRef<HTMLDivElement>(null);
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
    const enabledOrgs = useMemo(() => organisations.filter(o => o.mcp_zugriff_aktiviert), [organisations]);
    const hasEnabledOrgs = enabledOrgs.length > 0;
    const hasValidOrgSelection = allowAllOrgs
        ? hasEnabledOrgs
        : selectedOrgIds.some(id => enabledOrgs.some(o => o.organisation_id === id));

    // Pure identity scopes (OpenID Connect login) need no organisation data — the consent
    // flow must not be blocked when the org RPC fails or the user has no MCP-enabled org.
    const ORG_INDEPENDENT_SCOPES = new Set([
        'openid', 'profile', 'email', 'offline_access',
        'profile:read', 'email:read'
    ]);
    const requiresOrgSelection = useMemo(() => {
        const requested = (initialScopes && initialScopes.length > 0)
            ? initialScopes
            : (Array.isArray(authDetails?.scopes)
                ? authDetails.scopes
                : typeof authDetails?.scopes === 'string'
                ? authDetails.scopes.split(' ')
                : []);
        const hasOrgScope = requested.some(s =>
            !ORG_INDEPENDENT_SCOPES.has(s.trim()) && s.trim().length > 0
        );
        return hasOrgScope || (requested.length === 0);
    }, [initialScopes, authDetails]);

    const filteredOrganisations = useMemo(() => {
        const query = orgSearchQuery.trim().toLowerCase();
        if (!query) return organisations;
        return organisations.filter(o => o.name.toLowerCase().includes(query));
    }, [organisations, orgSearchQuery]);

    // Derives the per-module permission levels from the user's stored grant scopes
    // and the scopes the client actually requested. Modules covered by neither fall
    // back to 'none' — access is only ever granted explicitly (stored grant, requested
    // scope, or user interaction), never by default.
    const buildModulePermissions = useCallback((
        orgs: UserMcpOrganisationItem[],
        requestedScopes: string[] | string | undefined
    ): Record<string, PermissionLevel> => {
        const map: Record<string, PermissionLevel> = {};
        const existing = orgs?.[0]?.scopes?.module;
        const requestedArr = Array.isArray(requestedScopes)
            ? requestedScopes
            : typeof requestedScopes === 'string'
            ? requestedScopes.split(' ')
            : [];

        for (const def of PERMISSION_DEFINITIONS) {
            if (existing?.[def.id]) {
                map[def.id] = existing[def.id].write ? 'write' : existing[def.id].read ? 'read' : 'none';
            } else {
                const hasWrite = requestedArr.some(s => s === `${def.id}:write` || s === `${def.id}:manage`);
                const hasRead = requestedArr.some(s => s === `${def.id}:read` || s === def.id);
                if (hasWrite) {
                    map[def.id] = 'write';
                } else if (hasRead) {
                    map[def.id] = 'read';
                } else {
                    map[def.id] = def.defaultLevel;
                }
            }
        }
        return map;
    }, []);

    const [modulePermissions, setModulePermissions] = useState<Record<string, PermissionLevel>>(() =>
        buildModulePermissions(initialOrganisations || [], (initialScopes && initialScopes.length > 0)
            ? initialScopes
            : (initialData?.scopes || []))
    );

    // 3-state toggle cycle: write -> read -> none -> write
    const cyclePermission = (id: string) => {
        setModulePermissions(prev => {
            const current = prev[id] || 'write';
            const next: PermissionLevel =
                current === 'write' ? 'read' :
                current === 'read' ? 'none' : 'write';
            return { ...prev, [id]: next };
        });
    };

    const allPermissionsState = useMemo<'write' | 'read' | 'none' | 'mixed'>(() => {
        const levels = PERMISSION_DEFINITIONS.map(def => modulePermissions[def.id] || def.defaultLevel);
        const first = levels[0];
        if (levels.every(l => l === first)) {
            return first;
        }
        return 'mixed';
    }, [modulePermissions]);

    const setAllPermissionsLevel = (level: 'write' | 'read' | 'none') => {
        setModulePermissions(() => {
            const updated: Record<string, PermissionLevel> = {};
            for (const def of PERMISSION_DEFINITIONS) {
                updated[def.id] = level;
            }
            return updated;
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
                // Re-derive module permissions from the freshly loaded grant scopes —
                // the useState initializer only saw initialOrganisations, which may have
                // been empty when the server-side fetch failed.
                setModulePermissions(buildModulePermissions(res.data, (initialScopes && initialScopes.length > 0)
                    ? initialScopes
                    : (authDetails?.scopes || [])));
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
    }, [clientId, isDemo, type, buildModulePermissions, initialScopes, authDetails]);

    // Fetch organisations for the client if not already provided
    useEffect(() => {
        if (initialOrganisations && initialOrganisations.length > 0) {
            setIsLoadingOrgs(false);
            return;
        }
        fetchOrgs();
    }, [fetchOrgs, initialOrganisations]);

    // Close org dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
                setIsOrgDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggleOrg = (orgId: string, isEnabled: boolean) => {
        if (!isEnabled) return;
        setSelectedOrgIds(prev => {
            return prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId];
        });
    };

    const handleToggleAll = () => {
        const isAllSelected = allowAllOrgs || (selectedOrgIds.length === enabledOrgs.length && enabledOrgs.length > 0);
        if (isAllSelected) {
            setAllowAllOrgs(false);
            setSelectedOrgIds([]);
        } else {
            setAllowAllOrgs(true);
            setSelectedOrgIds(enabledOrgs.map(o => o.organisation_id));
        }
    };

    // Merge Supabase scopes with initial scopes
    const rawSupabaseScopes = typeof authDetails?.scopes === 'string' ? authDetails.scopes.split(' ') : (authDetails?.scopes || []);
    const mergedScopes = Array.from(new Set([...rawSupabaseScopes, ...(initialScopes || [])])).filter(s => s !== 'offline_access');
    const scopes = mergedScopes.length > 0 ? mergedScopes : ['openid', 'email'];

    // Restores the pre-consent MCP grant state after a failed consent leg. Defined once
    // so both the structured-failure branch and the outer catch of handleDecision run it.
    const restorePriorGrant = async (grant: {
        clientId: string;
        priorGrantExisted: boolean;
        priorOrgIds: string[];
        priorAllowAll: boolean;
        priorScopes?: UserMcpScopes;
    } | null) => {
        if (!grant) return;
        try {
            await saveUserMcpAuthorizationAction(
                grant.clientId,
                grant.priorOrgIds,
                grant.priorAllowAll,
                grant.priorScopes ?? { all: false, write: false },
                clientName,
                clientIcon ?? undefined,
                redirectUri ?? undefined
            );
        } catch (rollbackErr) {
            console.error('Failed to restore prior MCP authorization after failed consent:', rollbackErr);
        }
    };

    const handleDecision = async (decision: 'approve' | 'deny') => {
        if (!authorizationId) return;

        setIsProcessing(true);
        setProcessError(null);
        let savedGrantForRollback: {
            clientId: string;
            priorGrantExisted: boolean;
            priorOrgIds: string[];
            priorAllowAll: boolean;
            priorScopes?: UserMcpScopes;
        } | null = null;

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
                // Fail closed: without a clientId we could not persist an MCP grant, and
                // approving anyway would issue the code while silently skipping the save.
                if (!clientId) {
                    setProcessError('Die Client-Konfiguration dieser Anwendung ist unvollständig (fehlende Client-ID). Die Autorisierung wurde abgebrochen.');
                    setIsProcessing(false);
                    return;
                }

                if (requiresOrgSelection) {
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
                }

                if (clientId && organisations.length > 0) {
                    const enabledOrgList = organisations.filter(o => o.mcp_zugriff_aktiviert);
                    const orgsToSave = allowAllOrgs
                        ? enabledOrgList.map(o => o.organisation_id)
                        : selectedOrgIds.filter(id => enabledOrgList.some(o => o.organisation_id === id));

                    let scopesToSave: UserMcpScopes;
                    if (allPermissionsState === 'write') {
                        scopesToSave = { all: true, write: true };
                    } else if (allPermissionsState === 'read') {
                        scopesToSave = { all: true, write: false };
                    } else {
                        // IMPORTANT: The module aliases written here (haeuser, wohnungen, mieter,
                        // betriebskosten, nebenkosten, zaehler_ablesungen, vorlagen,
                        // dokumente_metadaten) must stay in sync with MODULE_ALIASES in
                        // mietevo-mcp/src/mcp-server.ts — the MCP server resolves these keys when
                        // enforcing per-tool scopes. Drift between the two maps silently breaks
                        // scope enforcement; consent-module-aliases.test.ts guards this.
                        const moduleMap: Record<string, { read: boolean; write: boolean }> = {};
                        for (const def of PERMISSION_DEFINITIONS) {
                            const level = modulePermissions[def.id] || def.defaultLevel;
                            moduleMap[def.id] = {
                                read: level === 'read' || level === 'write',
                                write: level === 'write',
                            };
                            if (def.id === 'properties') {
                                moduleMap['haeuser'] = moduleMap[def.id];
                                moduleMap['wohnungen'] = moduleMap[def.id];
                            }
                            if (def.id === 'tenants') {
                                moduleMap['mieter'] = moduleMap[def.id];
                            }
                            if (def.id === 'finanzen') {
                                moduleMap['betriebskosten'] = moduleMap[def.id];
                                moduleMap['nebenkosten'] = moduleMap[def.id];
                            }
                            if (def.id === 'zaehler') {
                                moduleMap['zaehler_ablesungen'] = moduleMap[def.id];
                            }
                            if (def.id === 'dokumente') {
                                moduleMap['vorlagen'] = moduleMap[def.id];
                                moduleMap['dokumente_metadaten'] = moduleMap[def.id];
                            }
                        }
                        scopesToSave = {
                            all: false,
                            write: Object.values(modulePermissions).some(l => l === 'write'),
                            module: moduleMap,
                        };
                    }

                    const saveResult = await saveUserMcpAuthorizationAction(
                        clientId,
                        orgsToSave,
                        allowAllOrgs,
                        scopesToSave,
                        clientName,
                        clientIcon ?? undefined,
                        redirectUri ?? undefined
                    );

                    if (!saveResult.success) {
                        setProcessError(saveResult.error || 'Fehler beim Speichern der Organisationsberechtigungen.');
                        setIsProcessing(false);
                        return;
                    }

                    // Snapshot the persisted grant so it can be restored if the Supabase consent
                    // leg fails below — otherwise an authorization would remain recorded without
                    // a completed OAuth approval. Restoring the PRIOR state (rather than blanket-
                    // revoking) avoids silently degrading an already-working setup on re-consent.
                    const priorGrant = organisations.find(o => o.is_authorized || o.allow_all);
                    savedGrantForRollback = {
                        clientId,
                        priorGrantExisted: !!priorGrant,
                        // Snapshot from ALL organisations, not just MCP-enabled ones — an org
                        // an admin has since disabled may still hold a stored authorization,
                        // and the rollback is meant to restore that prior state unchanged.
                        priorOrgIds: priorGrant
                            ? organisations.filter(o => o.is_authorized).map(o => o.organisation_id)
                            : [],
                        priorAllowAll: priorGrant?.allow_all ?? false,
                        priorScopes: priorGrant?.scopes,
                    };
                }
            }

            // All Supabase calls go through server actions to avoid CORS issues.
            // (Supabase returns Access-Control-Allow-Origin: * which browsers block with credentials: include)
            const { success, redirect_to, error } = await submitDecisionAction(
                authorizationId,
                decision === 'approve' ? 'allow' : 'deny'
            );

            if (!success || error) {
                // Restore the pre-consent grant state: a prior authorization is re-saved
                // unchanged; without one the grant is zeroed out (fail-closed revocation).
                // Either way no MCP authorization outlives a failed consent.
                await restorePriorGrant(savedGrantForRollback);
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
            // The rollback must run here too: an exception thrown after the grant was
            // saved (network flap, unexpected server-action failure) must not leave an
            // MCP authorization behind that outlives an incomplete consent.
            await restorePriorGrant(savedGrantForRollback);
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
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 border border-destructive/20 p-4 shadow-inner">
                            <AlertTriangle className="w-10 h-10 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            Autorisierung fehlgeschlagen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Alert variant="destructive" className="rounded-2xl">
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
                        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 p-4 shadow-inner">
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
                                <div className="mb-6 space-y-2.5">
                                    <h3 className="text-sm font-medium text-muted-foreground text-center">
                                        Aktuelle Berechtigungen:
                                    </h3>
                                    <div className="space-y-2">
                                        {scopes.map((scope, index) => {
                                            const details = getScopeDetails(scope);
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * index }}
                                                    key={scope}
                                                    className="group/scope flex items-start gap-3.5 p-3 rounded-2xl bg-card border border-border/40 hover:border-border/80 hover:bg-card/90 shadow-2xs transition-colors duration-200"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover/scope:bg-primary/20 transition-colors">
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
                                <Alert variant="destructive" className="rounded-2xl mb-4 bg-destructive/10 text-destructive border-destructive/20">
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
                initial: { opacity: 0, y: 25, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.5, type: "spring", bounce: 0.3 }
            }}
        >
            <div className="relative group">
                {/* Subtle gradient glow border */}
                <div className="absolute -inset-0.5 bg-linear-to-br from-primary/30 to-primary/0 dark:from-primary/40 dark:to-primary/5 rounded-[2.5rem] blur-md opacity-30 dark:opacity-50 group-hover:opacity-60 dark:group-hover:opacity-80 transition duration-1000 group-hover:duration-300" />

                <Card className="relative border-border/50 dark:border-border/30 bg-background/85 dark:bg-background/70 backdrop-blur-2xl shadow-xl dark:shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="text-center pt-8 pb-4 px-8">
                        <OriginProductLogos clientIcon={clientIcon} clientName={clientName} />
                        <CardTitle className="text-2xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-linear-to-br from-foreground to-muted-foreground pb-0.5">
                            Verbindung autorisieren
                        </CardTitle>
                    <CardDescription className="text-sm mt-1.5 max-w-xs mx-auto text-muted-foreground">
                            <span className="font-semibold text-foreground">{clientName}</span> möchte sich mit <span className="font-semibold text-primary">Mietevo MCP</span> verbinden.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-7 pb-2 space-y-5">
                        {/* Organisation Selection Section (PostHog Style: Pill for All vs Custom + One-line Tag-Input with Dropdown) */}
                        {!isLoadingOrgs && organisations.length > 0 && (
                            <div className="space-y-2.5">
                                {/* Title */}
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 px-0.5">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <span>Freizugebende Organisationen:</span>
                                </h3>

                                {/* Mode Pill Switcher with Dropdown Trigger on 2nd Option */}
                                {organisations.length > 1 && (
                                    <div ref={orgDropdownRef} className="relative w-fit">
                                        <div
                                            className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-full select-none z-0"
                                        >
                                            {/* Tab 1: Alle freigeben */}
                                            <motion.button
                                                type="button"
                                                onClick={() => {
                                                    setAllowAllOrgs(true);
                                                    setIsOrgDropdownOpen(false);
                                                    setSelectedOrgIds(enabledOrgs.map(o => o.organisation_id));
                                                }}
                                                className={cn(
                                                    "flex-1 sm:flex-initial min-w-[150px] flex items-center justify-center gap-2 rounded-full h-9 px-4 relative outline-none cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300",
                                                    allowAllOrgs
                                                        ? "text-gray-900 dark:text-gray-100 font-semibold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {allowAllOrgs && (
                                                    <motion.div
                                                        layoutId="active-oauth-org-mode-pill"
                                                        className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                    />
                                                )}
                                                <Globe className="size-4 shrink-0 transition-transform duration-300" />
                                                <span>Alle freigeben</span>
                                            </motion.button>

                                            {/* Tab 2: Auswahl anpassen / Dropdown Trigger */}
                                            <motion.button
                                                type="button"
                                                role="combobox"
                                                aria-expanded={isOrgDropdownOpen && !allowAllOrgs}
                                                aria-controls="org-dropdown-list"
                                                onClick={() => {
                                                    if (allowAllOrgs) {
                                                        setAllowAllOrgs(false);
                                                        setIsOrgDropdownOpen(true);
                                                    } else {
                                                        setIsOrgDropdownOpen(!isOrgDropdownOpen);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex-1 sm:flex-initial min-w-[150px] flex items-center justify-center gap-1.5 rounded-full h-9 px-4 relative outline-none cursor-pointer text-xs sm:text-sm font-medium transition-colors duration-300",
                                                    !allowAllOrgs
                                                        ? "text-gray-900 dark:text-gray-100 font-semibold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {!allowAllOrgs && (
                                                    <motion.div
                                                        layoutId="active-oauth-org-mode-pill"
                                                        className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                    />
                                                )}
                                                <SlidersHorizontal className="size-4 shrink-0 transition-transform duration-300" />
                                                <span>Auswahl anpassen</span>
                                                {!allowAllOrgs && selectedOrgIds.length > 0 && (
                                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary leading-none">
                                                        {selectedOrgIds.length}
                                                    </span>
                                                )}
                                                <ChevronDown className={cn(
                                                    "w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground ml-0.5",
                                                    isOrgDropdownOpen && !allowAllOrgs && "rotate-180 text-foreground"
                                                )} />
                                            </motion.button>
                                        </div>

                                        {/* Floating Popover Dropdown */}
                                        {isOrgDropdownOpen && !allowAllOrgs && (
                                            <div
                                                id="org-dropdown-list"
                                                className="absolute left-0 right-0 sm:right-auto sm:w-80 top-full mt-2 z-50 rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-md text-popover-foreground shadow-xl p-2 space-y-1.5"
                                            >
                                                {/* Search input if more than 3 orgs */}
                                                {organisations.length > 3 && (
                                                    <div className="px-2 py-1 relative flex items-center border-b border-border/40 pb-2 mb-1">
                                                        <Search className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
                                                        <input
                                                            type="text"
                                                            aria-label="Organisation suchen"
                                                            value={orgSearchQuery}
                                                            onChange={(e) => setOrgSearchQuery(e.target.value)}
                                                            placeholder="Organisation suchen..."
                                                            className="w-full bg-transparent border-0 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                                                        />
                                                        {orgSearchQuery && (
                                                            <button
                                                                type="button"
                                                                aria-label="Suchbegriff löschen"
                                                                onClick={() => setOrgSearchQuery('')}
                                                                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Quick actions (Alle / Keine) */}
                                                <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-muted-foreground">
                                                    <span>{selectedOrgIds.length} von {enabledOrgs.length} aktiv</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedOrgIds(enabledOrgs.map(o => o.organisation_id))}
                                                            className="hover:text-primary transition-colors cursor-pointer font-medium"
                                                        >
                                                            Alle
                                                        </button>
                                                        <span>•</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedOrgIds([])}
                                                            className="hover:text-primary transition-colors cursor-pointer font-medium"
                                                        >
                                                            Keine
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Org items list */}
                                                <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
                                                    {filteredOrganisations.map((org) => {
                                                            const isEnabled = org.mcp_zugriff_aktiviert;
                                                            const isChecked = isEnabled && selectedOrgSet.has(org.organisation_id);

                                                            return (
                                                                <label
                                                                    key={org.organisation_id}
                                                                    htmlFor={`org-${org.organisation_id}`}
                                                                    className={cn(
                                                                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors duration-150 select-none",
                                                                        isEnabled
                                                                            ? isChecked
                                                                                ? "bg-primary/10 font-medium text-foreground cursor-pointer"
                                                                                : "hover:bg-muted/60 text-foreground cursor-pointer"
                                                                            : "opacity-50 cursor-not-allowed bg-muted/20"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <Checkbox
                                                                            id={`org-${org.organisation_id}`}
                                                                            checked={isChecked}
                                                                            disabled={!isEnabled}
                                                                            onCheckedChange={() => {
                                                                                if (isEnabled) {
                                                                                    handleToggleOrg(org.organisation_id, isEnabled);
                                                                                }
                                                                            }}
                                                                            className="rounded-[4px] h-4 w-4 border-primary"
                                                                        />
                                                                        <span className={cn(
                                                                            "truncate",
                                                                            !isEnabled && "line-through text-muted-foreground font-normal"
                                                                        )}>
                                                                            {org.name}
                                                                        </span>
                                                                        {org.ist_versteckt && (
                                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 rounded-full">
                                                                                Persönlich
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                        <span className="text-[10px] text-muted-foreground capitalize">
                                                                            {org.rolle === 'owner' ? 'Eigentümer' : org.rolle === 'admin' ? 'Admin' : 'Mitarbeiter'}
                                                                        </span>
                                                                        {!isEnabled && (
                                                                            <Badge
                                                                                variant="destructive"
                                                                                className="text-[9px] px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full"
                                                                            >
                                                                                Durch Administrator deaktiviert
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Subtext / Helper description */}
                                <div className="min-h-[1.25rem] flex items-center">
                                    <p className="text-xs text-muted-foreground px-0.5">
                                        {allowAllOrgs
                                            ? "Erlaubt Zugriff auf alle aktuellen und zukünftigen Organisationen."
                                            : "Erlaubt nur Zugriff auf die ausgewählten Organisationen."}
                                    </p>
                                </div>

                                {/* Single Organisation View */}
                                {organisations.length === 1 && (
                                    <div className="space-y-1.5">
                                        {organisations.map((org) => {
                                            const isEnabled = org.mcp_zugriff_aktiviert;
                                            return (
                                                <div
                                                    key={org.organisation_id}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-2xl border transition-all duration-200",
                                                        isEnabled
                                                            ? "bg-card border-border/40 shadow-2xs"
                                                            : "bg-muted/30 border-dashed border-border/40 opacity-65"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-semibold truncate">{org.name}</span>
                                                                {org.ist_versteckt && (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 rounded-full">
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
                                                            className="text-[9px] px-2 py-0.5 shrink-0 bg-destructive/10 text-destructive border border-destructive/20 rounded-full"
                                                        >
                                                            Durch Administrator deaktiviert
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {!hasEnabledOrgs && (
                                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                        <span>
                                            In allen Organisationen, in denen Sie Mitglied sind, wurde der MCP Server Zugriff durch einen Administrator deaktiviert.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Org fetch error with retry */}
                        {!isLoadingOrgs && orgFetchError && (
                            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between gap-3">
                                <div className="flex items-start gap-2 min-w-0">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span className="truncate">{orgFetchError}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchOrgs()}
                                    className="text-xs h-7 px-2.5 rounded-full shrink-0"
                                >
                                    Erneut versuchen
                                </Button>
                            </div>
                        )}

                        {/* Banner when no organisations exist */}
                        {!isLoadingOrgs && !orgFetchError && organisations.length === 0 && (
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <span>
                                    Es wurden keine Organisationen für Ihr Benutzerkonto gefunden. Der MCP Server Zugriff kann nicht autorisiert werden.
                                </span>
                            </div>
                        )}

                        {/* KI-Zugriff & Berechtigungen List (PostHog Style with 3-State Toggleable Checkmarks) */}
                        {!isLoadingOrgs && organisations.length > 0 && (
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between gap-2 px-0.5">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-primary" />
                                        <span>Erlaubte Berechtigungen:</span>
                                    </h3>

                                    {/* Mini 3-state Segmented Pill Switcher on the Right */}
                                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-muted/60 dark:bg-muted/20 border border-border/40 text-[11px] select-none shrink-0">
                                        <button
                                            type="button"
                                            aria-label="Alle Berechtigungen: Schreiben"
                                            onClick={() => setAllPermissionsLevel('write')}
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
                                                allPermissionsState === 'write'
                                                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/30"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Schreiben
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Alle Berechtigungen: Lesen"
                                            onClick={() => setAllPermissionsLevel('read')}
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
                                                allPermissionsState === 'read'
                                                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/30"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Lesen
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Alle Berechtigungen: Aus"
                                            onClick={() => setAllPermissionsLevel('none')}
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
                                                allPermissionsState === 'none'
                                                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/30"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Aus
                                        </button>
                                    </div>
                                </div>



                                {/* 3-State Interactive Permissions List (Unscrollable, clean PostHog layout with multi-state checkbox) */}
                                <div className="space-y-1.5 py-1">
                                    {PERMISSION_DEFINITIONS.map((item) => {
                                        const level = modulePermissions[item.id] || item.defaultLevel;
                                        const isWrite = level === 'write';
                                        const isRead = level === 'read';
                                        const isNone = level === 'none';

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => cyclePermission(item.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        cyclePermission(item.id);
                                                    }
                                                }}
                                                tabIndex={0}
                                                role="checkbox"
                                                aria-checked={isWrite ? true : isRead ? "mixed" : false}
                                                aria-label={`${item.label} (Aktuell: ${isWrite ? 'Lesen und Schreiben' : isRead ? 'Nur Lesen' : 'Kein Zugriff'})`}
                                                className="group flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Multi-State Checkbox (Matching table standard h-4 w-4 rounded-[4px] border-primary) */}
                                                    <div
                                                        className={cn(
                                                            "h-4 w-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-all duration-200",
                                                            isWrite
                                                                ? "bg-primary border-primary text-primary-foreground scale-105 shadow-2xs"
                                                                : isRead
                                                                ? "bg-primary/20 border-primary text-primary"
                                                                : "border-input bg-background/50 group-hover:border-primary/60"
                                                        )}
                                                    >
                                                        {isWrite && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                                                        {isRead && <Minus className="h-3.5 w-3.5 stroke-[2.5]" />}
                                                    </div>

                                                    {/* Normal paragraph next to the checkbox */}
                                                    <p className={cn(
                                                        "text-xs sm:text-[13px] leading-relaxed font-normal truncate",
                                                        isWrite && "text-foreground font-medium",
                                                        isRead && "text-foreground",
                                                        isNone && "text-muted-foreground/60 line-through"
                                                    )}>
                                                        {isWrite ? item.writeLabel : isRead ? item.readLabel : item.noneLabel}
                                                    </p>
                                                </div>

                                                {/* Subtle Inline State Indicator */}
                                                <span className={cn(
                                                    "text-[11px] shrink-0 ml-3 font-normal",
                                                    isWrite && "text-primary font-medium",
                                                    isRead && "text-muted-foreground",
                                                    isNone && "text-muted-foreground/50"
                                                )}>
                                                    {isWrite ? "Schreiben & Lesen" : isRead ? "Nur Lesen" : "Deaktiviert"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Error display */}
                        {processError && (
                            <Alert variant="destructive" className="rounded-2xl bg-destructive/10 text-destructive border-destructive/20">
                                <AlertDescription>{processError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Validation notice when no enabled org is selected or no orgs exist */}
                        {(!hasValidOrgSelection || organisations.length === 0) && !isLoading && !isLoadingOrgs && (
                            <p className="text-xs text-destructive text-center font-medium">
                                {organisations.length === 0
                                    ? "Keine Organisationen verfügbar. Autorisierung nicht möglich."
                                    : !hasEnabledOrgs
                                    ? "Keine freigebbare Organisation verfügbar (MCP-Zugriff durch Administrator deaktiviert)."
                                    : "Bitte wählen Sie mindestens eine freizugebende Organisation aus."}
                            </p>
                        )}

                        {/* Redirect URI info */}
                        {redirectUri && (
                            <p className="text-[11px] text-muted-foreground text-center">
                                Nach Autorisierung werden Sie zu <span className="font-mono text-foreground/80">
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

                    <CardFooter className="flex flex-col gap-2.5 px-7 pt-2 pb-7">
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing || isLoading || (!isDemo && requiresOrgSelection && (isLoadingOrgs || organisations.length === 0 || !hasValidOrgSelection))}
                            className="w-full h-11 rounded-xl text-sm font-semibold border-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(var(--primary),0.2)] dark:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.3)] transition-colors duration-300 disabled:opacity-50 disabled:pointer-events-none"
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
                            variant="ghost"
                            onClick={handleDeny}
                            disabled={isProcessing}
                            className="w-full h-9 rounded-xl text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            Abbrechen
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </FullScreenLayout>
    );
}
