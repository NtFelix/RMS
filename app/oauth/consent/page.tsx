import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ConsentUI from './ConsentUI';

export const metadata: Metadata = {
    title: 'Autorisierung - Mietevo',
    description: 'OAuth Autorisierungsseite',
    robots: { index: false },
};

interface PageProps {
    searchParams: Promise<{
        authorization_id?: string;
        error?: string;
        message?: string;
    }>;
}

export default async function ConsentPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const authorizationId = params.authorization_id;
    const error = params.error;
    const message = params.message;

    if (error && message) {
        return <ConsentUI type="error" error={message} />;
    }

    if (!authorizationId) {
        return <ConsentUI
            type="error"
            error="Missing authorization_id. This page requires an OAuth authorization request."
        />;
    }

    // Lightweight auth check: verify Supabase session cookie exists before rendering consent UI.
    // This avoids a flash of the consent page followed by redirect to login.
    // Using createServerClient + getUser() caused 524 timeouts on Cloud Run (network requests),
    // but reading a cookie is instant and safe.
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const hasSession = allCookies.some(c => c.name.startsWith('sb-'));
    if (!hasSession) {
        const loginUrl = `/auth/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`)}`;
        redirect(loginUrl);
    }

    return <ConsentUI type="consent" authorizationId={authorizationId} />;
}
