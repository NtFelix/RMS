'use server';

import { cookies } from 'next/headers';

export async function approveAuthorizationAction(authorizationId: string) {
    try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.toString();

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorizations/${authorizationId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error_description || errorData.message || `Approval failed: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, redirect_to: data.redirect_to };
    } catch (err: any) {
        console.error('Server Action: Authorization approval failed:', err);
        return { success: false, error: err.message || 'Authorization approval failed' };
    }
}
