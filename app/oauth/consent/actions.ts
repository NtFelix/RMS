'use server';

import { cookies } from 'next/headers';

export async function approveAuthorizationAction(authorizationId: string) {
    try {
        // Validate the authorizationId — Supabase uses a URL-safe base64 string (not UUID)
        if (!authorizationId || authorizationId.length < 10 || authorizationId.length > 60) {
            throw new Error('Invalid authorization identifier format');
        }

        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log('Authorization approval attempt for:', authorizationId);
        console.log('Cookies being sent:', allCookies.map(c => c.name).join(', '));

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // Correct Supabase OAuth authorization approval endpoint:
        // POST /auth/v1/oauth/authorizations/{id}  with body { decision: "allow" }
        // (NOT /approve or /consent — those paths don't exist in Supabase)
        const url = new URL('/auth/v1/oauth/authorizations/' + encodeURIComponent(authorizationId), baseUrl);
        console.log('Calling URL:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ decision: 'allow' }),
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', responseText);

        if (!response.ok) {
            let errorData: any = {};
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse error response from Supabase:', e);
            }
            throw new Error(errorData.error_description || errorData.message || errorData.error || `Approval failed: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        return { success: true, redirect_to: data.redirect_to };
    } catch (err: any) {
        console.error('Server Action: Authorization approval failed:', err);
        return { success: false, error: err.message || 'Authorization approval failed' };
    }
}
