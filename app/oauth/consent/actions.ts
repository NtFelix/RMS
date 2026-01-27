'use server';

import { cookies } from 'next/headers';

export async function approveAuthorizationAction(authorizationId: string) {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log('Authorization approval attempt for:', authorizationId);
        console.log('Cookies being sent:', allCookies.map(c => c.name).join(', '));

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorizations/${authorizationId}/approve`;
        console.log('Calling URL:', url);

        const response = await fetch(url, {
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
