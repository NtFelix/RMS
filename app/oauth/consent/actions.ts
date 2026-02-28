'use server';

import { cookies } from 'next/headers';

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

/** Gets the current user's session cookies to forward to Supabase */
async function getSessionCookieHeader(): Promise<string> {
    const cookieStore = await cookies();
    return cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Fetches the authorization request details from Supabase.
 * Must run server-side — Supabase CORS policy blocks client-side requests
 * with credentials from cross-origin pages.
 */
export async function getAuthorizationDetailsAction(authorizationId: string) {
    try {
        validateId(authorizationId);
        const cookieHeader = await getSessionCookieHeader();
        const url = buildAuthUrl(authorizationId);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': cookieHeader,
                'apikey': SUPABASE_ANON_KEY,
            },
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorData: any = {};
            try { errorData = JSON.parse(responseText); } catch { /* */ }
            const msg = errorData.error_description || errorData.message || errorData.error
                || `Failed to fetch details: ${response.status}`;
            return { success: false, error: msg, data: null };
        }

        const data = JSON.parse(responseText);
        return { success: true, data, error: null };
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

        const cookieHeader = await getSessionCookieHeader();
        const url = buildAuthUrl(authorizationId);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ decision }),
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorData: any = {};
            try { errorData = JSON.parse(responseText); } catch { /* */ }
            const msg = errorData.error_description || errorData.message || errorData.error
                || `Decision failed: ${response.status}`;
            throw new Error(msg);
        }

        const data = JSON.parse(responseText);
        return { success: true, redirect_to: data.redirect_to || data.redirect_url || null, error: null };
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
        error: result.error ?? undefined,
    };
}
