'use server';

import { createClient } from '@/utils/supabase/server';

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
        // Not a JSON response, use the raw text if available.
        return responseText || fallbackMessage;
    }
    return errorData.error_description || errorData.message || errorData.error || fallbackMessage;
}

/**
 * Retrieves the current user's access token from their Supabase session.
 * The /auth/v1/oauth/authorizations/{id} endpoint requires a Bearer token,
 * NOT cookies — unlike most other Supabase Auth endpoints.
 */
async function getAccessToken(): Promise<string> {
    const supabase = await createClient();

    // getUser() securely validates the JWT against the Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        throw new Error('Not authenticated: invalid or expired session');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
    }
    if (!session?.access_token) {
        throw new Error('Not authenticated: no valid session found');
    }
    return session.access_token;
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
 * Fetches the authorization request details from Supabase.
 * Uses the Supabase JS client SDK's getAuthorizationDetails method.
 * Must run server-side — Supabase CORS policy blocks client-side requests.
 */
export async function getAuthorizationDetailsAction(authorizationId: string): Promise<AuthorizationDetailsResult> {
    try {
        validateId(authorizationId);
        const supabase = await createClient();

        // Verify the user is authenticated first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: ERR_AUTH_UNAUTHORIZED, data: null };
        }

        const { data, error } = await (supabase.auth as any).oauth.getAuthorizationDetails(authorizationId);

        if (error) {
            const msg = error.message || 'Failed to load authorization details';
            console.error('[OAuth] getAuthorizationDetails error:', msg, error);
            // Check if this is a "already processed" 400 error
            if (msg.toLowerCase().includes('cannot be processed') ||
                msg.toLowerCase().includes('validation_failed') ||
                error.status === 400) {
                return { success: true, alreadyProcessed: true, error: null, data: null };
            }
            if (error.status === 404) {
                return { success: false, error: ERR_AUTH_EXPIRED, data: null };
            }
            return { success: false, error: msg, data: null };
        }

        return { success: true, data: data as AuthorizationDetails, error: null };
    } catch (err: any) {
        console.error('Server Action: getAuthorizationDetails failed:', err.message);
        return { success: false, error: err.message || 'Failed to load authorization details', data: null };
    }
}

/**
 * Submits the user's consent decision (allow or deny) to Supabase.
 * Uses the Supabase JS client SDK which knows the correct endpoint
 * (POST /authorizations/{id}/consent) and request body format.
 */
export async function submitDecisionAction(authorizationId: string, decision: 'allow' | 'deny') {
    try {
        validateId(authorizationId);
        if (decision !== 'allow' && decision !== 'deny') {
            throw new Error('Invalid decision value');
        }

        const supabase = await createClient();

        // Verify the user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, redirect_to: null, error: ERR_AUTH_UNAUTHORIZED };
        }

        if (decision === 'allow') {
            // supabase.auth.oauth.approveAuthorization() POSTs to
            // /auth/v1/oauth/authorizations/{id}/consent with the correct body format
            const { data, error } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);
            if (error) {
                console.error('[OAuth] approveAuthorization failed:', error.message);
                return { success: false, redirect_to: null, error: error.message };
            }
            return { success: true, redirect_to: data?.redirect_url || data?.redirect_to || null, error: null };
        } else {
            const { data, error } = await (supabase.auth as any).oauth.denyAuthorization(authorizationId);
            if (error) {
                console.error('[OAuth] denyAuthorization failed:', error.message);
                return { success: false, redirect_to: null, error: error.message };
            }
            return { success: true, redirect_to: data?.redirect_url || data?.redirect_to || null, error: null };
        }
    } catch (err: any) {
        console.error('Server Action: submitDecision failed:', err.message);
        return { success: false, redirect_to: null, error: err.message || 'Authorization decision failed' };
    }
}

/**
 * @deprecated Use submitDecisionAction('allow') instead.
 */
export async function approveAuthorizationAction(authorizationId: string) {
    const result = await submitDecisionAction(authorizationId, 'allow');
    return {
        success: result.success,
        redirect_to: result.redirect_to,
        error: result.error,
    };
}
