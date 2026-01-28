'use server';

import { cookies } from 'next/headers';

export async function approveAuthorizationAction(authorizationId: string) {
    try {
        // Validate the authorizationId to prevent SSRF and unexpected paths.
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(authorizationId)) {
            throw new Error('Invalid authorization identifier format');
        }

        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log('Authorization approval attempt for:', authorizationId);
        console.log('Cookies being sent:', allCookies.map(c => c.name).join(', '));

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const url = new URL('/auth/v1/oauth/authorizations/' + encodeURIComponent(authorizationId) + '/approve', baseUrl);
        console.log('Calling URL:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', responseText);

        if (!response.ok) {
            let errorData: any = {};
            try {
                errorData = JSON.parse(responseText);
            } catch { }
            throw new Error(errorData.error_description || errorData.message || errorData.error || `Approval failed: ${response.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        return { success: true, redirect_to: data.redirect_to };
    } catch (err: any) {
        console.error('Server Action: Authorization approval failed:', err);
        return { success: false, error: err.message || 'Authorization approval failed' };
    }
}
