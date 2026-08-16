'use server';

import { ensureAuth } from '@/lib/auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    return new URL(
        '/auth/v1/oauth/authorizations/' + encodeURIComponent(authorizationId),
        SUPABASE_URL
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
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'apikey': SUPABASE_ANON_KEY,
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

        const consentUrl = `${SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`;
        const consentValue = decision === 'allow' ? 'approve' : 'deny';
        // Dual payload (consent + decision) provides compatibility across different Supabase GoTrue versions.
        const consentPayload = JSON.stringify({
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
