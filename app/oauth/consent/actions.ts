'use server';

import { createClient } from '@/utils/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
 * Fetches the authorization request details from Supabase.
 * Must run server-side — Supabase CORS policy blocks client-side requests
 * with credentials from cross-origin pages.
 *
 * NOTE: This endpoint requires Authorization: Bearer <access_token>, NOT cookies.
 */
export async function getAuthorizationDetailsAction(authorizationId: string) {
    try {
        validateId(authorizationId);
        const accessToken = await getAccessToken();
        const url = buildAuthUrl(authorizationId);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_ANON_KEY,
            },
        });

        const responseText = await response.text();

        if (!response.ok) {
            const msg = parseSupabaseAuthError(responseText, `Failed to fetch details: ${response.status}`);
            return { success: false, error: msg, data: null };
        }

        try {
            const data = JSON.parse(responseText);
            return { success: true, data, error: null };
        } catch {
            return { success: false, error: 'Invalid JSON response from Supabase', data: null };
        }
    } catch (err: any) {
        console.error('Server Action: getAuthorizationDetails failed:', err.message);
        return { success: false, error: err.message || 'Failed to load authorization details', data: null };
    }
}

/**
 * Submits the user's consent decision (allow or deny) to Supabase.
 * Must run server-side — same CORS restriction as above.
 *
 * NOTE: This endpoint requires Authorization: Bearer <access_token>, NOT cookies.
 */
export async function submitDecisionAction(authorizationId: string, decision: 'allow' | 'deny') {
    try {
        validateId(authorizationId);
        if (decision !== 'allow' && decision !== 'deny') {
            throw new Error('Invalid decision value');
        }

        const accessToken = await getAccessToken();
        const url = buildAuthUrl(authorizationId);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ decision }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            const msg = parseSupabaseAuthError(responseText, `Decision failed: ${response.status}`);
            return { success: false, redirect_to: null, error: msg };
        }

        try {
            const data = JSON.parse(responseText);
            return { success: true, redirect_to: data.redirect_to || data.redirect_url || null, error: null };
        } catch {
            return { success: false, redirect_to: null, error: 'Invalid JSON response from Supabase' };
        }
    } catch (err: any) {
        console.error('Server Action: submitDecision failed:', err.message);
        return { success: false, redirect_to: null, error: err.message || 'Authorization decision failed' };
    }
}

/**
 * @deprecated Use submitDecisionAction('allow') instead.
 * Kept for backward compatibility with any existing callers.
 */
export async function approveAuthorizationAction(authorizationId: string) {
    const result = await submitDecisionAction(authorizationId, 'allow');
    return {
        success: result.success,
        redirect_to: result.redirect_to,
        error: result.error,
    };
}
