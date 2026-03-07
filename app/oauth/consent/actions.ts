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
 * Must run server-side — Supabase CORS policy blocks client-side requests
 * with credentials from cross-origin pages.
 */
export async function getAuthorizationDetailsAction(authorizationId: string): Promise<AuthorizationDetailsResult> {
    try {
        validateId(authorizationId);
        const accessToken = await getAccessToken();
        const url = buildAuthUrl(authorizationId);

        const response = await fetchAuthEndpoint(url, accessToken, { method: 'GET' });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: ERR_AUTH_EXPIRED, data: null };
            }
            if (response.status === 400) {
                const responseText = await response.text();
                const lowerText = responseText.toLowerCase();
                console.warn('[OAuth] GET authorization returned 400, body:', responseText);
                // Supabase returns 400 with error_code "validation_failed" when the
                // authorization was already consumed (auto_approved redirect completed).
                // The response body format varies — check for known indicators.
                if (
                    lowerText.includes('validation_failed') ||
                    lowerText.includes('cannot be processed') ||
                    lowerText.includes('already')
                ) {
                    return { success: true, alreadyProcessed: true, error: null, data: null };
                }
                // If it's a truly unexpected 400, fall through to generic error handling
                const msg = parseSupabaseAuthError(responseText, `Failed to fetch details: ${response.status}`);
                return { success: false, error: msg, data: null };
            }
            if (response.status === 401 || response.status === 403) {
                return { success: false, error: ERR_AUTH_UNAUTHORIZED, data: null };
            }
            const responseText = await response.text();
            const msg = parseSupabaseAuthError(responseText, `Failed to fetch details: ${response.status}`);
            return { success: false, error: msg, data: null };
        }

        try {
            const data = await response.json() as AuthorizationDetails;
            return { success: true, data, error: null };
        } catch (e) {
            console.error('[OAuth] Failed to parse AuthorizationDetails JSON:', e);
            return { success: false, error: 'Invalid response format from Supabase', data: null };
        }
    } catch (err: any) {
        console.error('Server Action: getAuthorizationDetails failed:', err.message);
        return { success: false, error: err.message || 'Failed to load authorization details', data: null };
    }
}

/**
 * Submits the user's consent decision (allow or deny) to Supabase.
 * Must run server-side — same CORS restriction as above.
 */
export async function submitDecisionAction(authorizationId: string, decision: 'allow' | 'deny') {
    try {
        validateId(authorizationId);
        if (decision !== 'allow' && decision !== 'deny') {
            throw new Error('Invalid decision value');
        }

        const accessToken = await getAccessToken();
        const url = buildAuthUrl(authorizationId);

        // Pre-flight GET: if Supabase already auto-approved this authorization, POSTing
        // a decision returns 405 Method Not Allowed. Detect this case server-side and
        // return the redirect_to directly — no POST needed.
        if (decision === 'allow') {
            try {
                const preCheck = await fetchAuthEndpoint(url, accessToken, { method: 'GET' });

                if (preCheck.ok) {
                    const preCheckData = await preCheck.json() as AuthorizationDetails;
                    if (preCheckData?.auto_approved) {
                        const redirectUrl = preCheckData.redirect_to || preCheckData.redirect_url || null;
                        console.info('[OAuth] submitDecisionAction: auto_approved detected, skipping POST');
                        return { success: true, redirect_to: redirectUrl, error: null };
                    }
                } else if (preCheck.status === 404 || preCheck.status === 400 || preCheck.status === 405) {
                    console.warn('[OAuth] pre-check GET indicates terminal state:', preCheck.status);
                    return { success: false, redirect_to: null, error: ERR_AUTH_EXPIRED };
                } else if (preCheck.status === 401 || preCheck.status === 403) {
                    return { success: false, redirect_to: null, error: ERR_AUTH_UNAUTHORIZED };
                } else {
                    console.warn('[OAuth] pre-check GET returned unexpected status', preCheck.status);
                    // Fall through to POST for other statuses (e.g. 5xx) to be defensive
                }
            } catch (e: any) {
                console.warn('[OAuth] pre-check failed, falling through to POST', e.message);
            }
        }

        const response = await fetchAuthEndpoint(url, accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision }),
        });

        if (!response.ok) {
            if (response.status === 404 || response.status === 405) {
                return { success: false, redirect_to: null, error: ERR_AUTH_EXPIRED };
            }
            if (response.status === 401 || response.status === 403) {
                return { success: false, redirect_to: null, error: ERR_AUTH_UNAUTHORIZED };
            }
            const responseText = await response.text();
            const msg = parseSupabaseAuthError(responseText, `Decision failed: ${response.status}`);
            return { success: false, redirect_to: null, error: msg };
        }

        try {
            const data = await response.json();
            return { success: true, redirect_to: data.redirect_to || data.redirect_url || null, error: null };
        } catch (e) {
            console.error('[OAuth] Failed to parse decision response JSON:', e);
            return { success: false, redirect_to: null, error: 'Invalid response format from Supabase' };
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
