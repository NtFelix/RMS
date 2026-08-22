'use server';

import { ensureAuth } from '@/lib/auth-utils';
import { getSupabasePublicEnv } from '@/lib/supabase-env';

function getSupabaseConfig() {
    const { url, anonKey } = getSupabasePublicEnv();
    if (!url || !anonKey) {
        throw new Error('Supabase configuration missing (URL or Anon Key)');
    }
    return { url, anonKey };
}

const ERR_AUTH_EXPIRED =
    'Dieser Autorisierungslink wurde bereits verwendet oder ist abgelaufen. Bitte starten Sie den Verbindungsvorgang erneut.';
const ERR_AUTH_UNAUTHORIZED =
    'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';

/** Validates an authorizationId to prevent SSRF via path traversal */
function validateId(authorizationId: string): void {
    if (!authorizationId || authorizationId.length < 10 || authorizationId.length > 64) {
        throw new Error('Invalid authorization identifier format');
    }
    // Only allow alphanumeric, hyphens, and URL-safe base64 chars
    if (!/^[A-Za-z0-9\-_]+$/.test(authorizationId)) {
        throw new Error('Invalid authorization identifier characters');
    }
}

/** Builds the authorization endpoint URL */
function buildAuthUrl(authorizationId: string): string {
    const { url } = getSupabaseConfig();
    return new URL(
        '/auth/v1/oauth/authorizations/' + encodeURIComponent(authorizationId),
        url
    ).toString();
}

/** Parses a Supabase Auth error from a response text. */
function parseSupabaseAuthError(responseText: string, fallbackMessage: string): string {
    let errorData: any = {};
    try {
        errorData = JSON.parse(responseText);
    } catch {
        // Not a JSON response — avoid leaking raw HTML/gateway errors to UI
        return fallbackMessage;
    }
    return errorData.error_description || errorData.message || errorData.error || fallbackMessage;
}

/**
 * Internal helper to perform a fetch to the Supabase OAuth authorization endpoint.
 * Includes a mandatory timeout and standard headers.
 */
async function fetchAuthEndpoint(url: string, accessToken: string, options: RequestInit = {}) {
    const { anonKey } = getSupabaseConfig();
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'apikey': anonKey,
        },
        // Prevent blocking server actions indefinitely
        signal: AbortSignal.timeout(5000),
    });
}

/**
 * Details of an OAuth authorization request returned by Supabase.
 */
export interface AuthorizationDetails {
    id?: string;
    state?: string;
    client?: {
        id?: string;
        name?: string;
        logo_uri?: string;
    };
    redirect_uri?: string;
    scopes?: string | string[];
    redirect_to?: string;
    redirect_url?: string;
    /** Set to true by Supabase when the app was previously approved — skip the decision POST endpoint */
    auto_approved?: boolean;
}

/**
 * Result of the getAuthorizationDetails server action.
 */
export interface AuthorizationDetailsResult {
    success: boolean;
    data: AuthorizationDetails | null;
    error: string | null;
    /** True if the authorization was already consumed/processed previously */
    alreadyProcessed?: boolean;
}

/**
 * Fetches the authorization request details from Supabase GoTrue Auth REST endpoint.
 * GET /auth/v1/oauth/authorizations/{id}
 * Must run server-side — Supabase CORS policy blocks client-side requests.
 */
export async function getAuthorizationDetailsAction(authorizationId: string): Promise<AuthorizationDetailsResult> {
    const { supabase } = await ensureAuth();
    try {
        validateId(authorizationId);
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
            return { success: false, error: ERR_AUTH_UNAUTHORIZED, data: null };
        }

        const url = buildAuthUrl(authorizationId);
        const response = await fetchAuthEndpoint(url, accessToken, { method: 'GET' });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: ERR_AUTH_EXPIRED, data: null };
            }
            if (response.status === 400) {
                // Any 400 from GET /oauth/authorizations/{id} means the authorization
                // is in a terminal state — already consumed by a prior auto_approved redirect.
                return { success: true, alreadyProcessed: true, error: null, data: null };
            }
            if (response.status === 401 || response.status === 403) {
                return { success: false, error: ERR_AUTH_UNAUTHORIZED, data: null };
            }
            const responseText = await response.text();
            const msg = parseSupabaseAuthError(responseText, `Failed to load authorization details (${response.status})`);
            console.error('[OAuth] getAuthorizationDetails failed:', response.status, msg);
            return { success: false, error: msg, data: null };
        }

        const data = (await response.json()) as AuthorizationDetails;
        return { success: true, data, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load authorization details";
        console.error('Server Action: getAuthorizationDetails failed:', message);
        return { success: false, error: message, data: null };
    }
}

/**
 * Submits the user's consent decision (allow or deny) to Supabase GoTrue Auth REST endpoint.
 * POST /auth/v1/oauth/authorizations/{id}/consent
 */
export async function submitDecisionAction(authorizationId: string, decision: 'allow' | 'deny') {
    const { supabase } = await ensureAuth();
    try {
        validateId(authorizationId);
        if (decision !== 'allow' && decision !== 'deny') {
            throw new Error('Invalid decision value');
        }

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
            return { success: false, redirect_to: null, error: ERR_AUTH_UNAUTHORIZED };
        }

        const { url } = getSupabaseConfig();
        const consentUrl = `${url}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`;
        const consentValue = decision === 'allow' ? 'approve' : 'deny';
        // Multi-field payload (action + consent + decision) provides compatibility across different Supabase GoTrue versions.
        const consentPayload = JSON.stringify({
            action: consentValue,
            consent: consentValue,
            decision: decision,
        });

        let response = await fetchAuthEndpoint(consentUrl, accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: consentPayload,
        });

        // Fallback to /auth/v1/oauth/authorizations/{id} if /consent returns 404 or 405 (endpoint not supported)
        if (response.status === 404 || response.status === 405) {
            const fallbackUrl = buildAuthUrl(authorizationId);
            response = await fetchAuthEndpoint(fallbackUrl, accessToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: consentPayload,
            });
        }

        if (!response.ok) {
            if (response.status === 404 || response.status === 405) {
                return { success: false, redirect_to: null, error: ERR_AUTH_EXPIRED };
            }
            if (response.status === 401 || response.status === 403) {
                return { success: false, redirect_to: null, error: ERR_AUTH_UNAUTHORIZED };
            }
            const responseText = await response.text();
            const msg = parseSupabaseAuthError(responseText, `Decision failed (${response.status})`);
            console.error('[OAuth] submitDecision failed:', response.status, msg);
            return { success: false, redirect_to: null, error: msg };
        }

        const data = (await response.json()) as { redirect_to?: string; redirect_url?: string };
        const redirectTo = data.redirect_to || data.redirect_url || null;
        return { success: true, redirect_to: redirectTo, error: null };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Authorization decision failed";
        console.error('Server Action: submitDecision failed:', message);
        return { success: false, redirect_to: null, error: message };
    }
}

/**
 * Structure of granular MCP module & write scopes.
 */
export interface McpModuleScope {
    read: boolean;
    write: boolean;
}

export interface UserMcpScopes {
    all?: boolean;
    write?: boolean;
    module?: Record<string, McpModuleScope>;
}

/**
 * Item structure returned by get_user_mcp_organisations RPC.
 */
export interface UserMcpOrganisationItem {
    organisation_id: string;
    name: string;
    ist_versteckt: boolean;
    rolle: string;
    mcp_zugriff_aktiviert: boolean;
    is_authorized: boolean;
    allow_all: boolean;
    scopes?: UserMcpScopes;
}

/**
 * Fetches all organisations the authenticated user belongs to with their MCP access status and client authorizations.
 */
export async function getUserMcpOrganisationsAction(
    clientId?: string
): Promise<{ success: boolean; data?: UserMcpOrganisationItem[]; error?: string }> {
    let supabase;
    try {
        ({ supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

    try {
        const { data, error } = await supabase.rpc('get_user_mcp_organisations', {
            p_client_id: clientId || null,
        });

        if (error) {
            console.error('[OAuth] getUserMcpOrganisations failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, data: (data || []) as UserMcpOrganisationItem[] };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load user organisations";
        console.error('Server Action: getUserMcpOrganisations failed:', message);
        return { success: false, error: message };
    }
}

export interface SaveUserMcpAuthorizationResult {
    success: boolean;
    data?: {
        success: boolean;
        user_id?: string;
        client_id?: string;
        allowed_organisation_ids?: string[];
        allow_all?: boolean;
        scopes?: UserMcpScopes;
    };
    error?: string;
}

/**
 * Persists the user's MCP organisation and scope authorization selection for a given client_id.
 */
export async function saveUserMcpAuthorizationAction(
    clientId: string,
    allowedOrgIds: string[],
    allowAll: boolean,
    scopes?: UserMcpScopes
): Promise<SaveUserMcpAuthorizationResult> {
    let supabase;
    try {
        ({ supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

    if (!clientId || !clientId.trim()) {
        return { success: false, error: 'Client-ID ist erforderlich' };
    }

    const defaultScopes: UserMcpScopes = { all: true, write: true };
    const finalScopes = scopes || defaultScopes;

    try {
        const { data, error } = await supabase.rpc('save_user_mcp_authorization', {
            p_client_id: clientId.trim(),
            p_allowed_org_ids: allowedOrgIds || [],
            p_allow_all: allowAll,
            p_scopes: finalScopes,
        });

        if (error) {
            console.error('[OAuth] saveUserMcpAuthorization failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save user MCP authorizations";
        console.error('Server Action: saveUserMcpAuthorization failed:', message);
        return { success: false, error: message };
    }
}
    }
}
