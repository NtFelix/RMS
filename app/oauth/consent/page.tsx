import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ConsentUI from './ConsentUI';
import { getAuthorizationDetailsAction } from './actions';
import { safeServerRedirect } from '@/lib/oauth-utils';

export const runtime = 'edge';

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

    // Handle error state
    if (error && message) {
        return <ConsentUI
            type="error"
            error={decodeURIComponent(message)}
        />;
    }

    // If no authorization_id, show error
    if (!authorizationId) {
        return <ConsentUI
            type="error"
            error="Missing authorization_id. This page requires an OAuth authorization request."
        />;
    }

    // Create Supabase server client
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Redirect to login, preserving authorization_id
        redirect(`/login?redirect=/oauth/consent?authorization_id=${authorizationId}`);
    }

    // When Supabase has already auto-approved the app, it responds with a ConsentResponse
    // (which includes redirect_url) instead of an AuthorizationDetailsResponse.
    // It does NOT include an `auto_approved` property in the JSON, nor does it include `client`.
    // We must NOT POST a decision in this case — Supabase returns 405 Method Not Allowed
    // or 400 Validation Failed. Instead, redirect directly.
    const { success, data, error: fetchError, alreadyProcessed } = await getAuthorizationDetailsAction(authorizationId);

    // When the authorization was already consumed (400 from Supabase or already processed), it means
    // the auto_approved redirect already completed the OAuth flow successfully.
    // Show a success screen instead of an error.
    if (alreadyProcessed) {
        return <ConsentUI type="success" />;
    }

    // Detect auto-approval: The response has a redirect URL but no client details
    const autoRedirectUrl = data?.redirect_url || data?.redirect_to;
    const isAutoApproved = success && autoRedirectUrl && !data?.client;

    if (isAutoApproved) {
        console.info('[OAuth SSR] auto_approved detected', {
            authorizationId,
            redirect_to: data?.redirect_to,
            redirect_url: data?.redirect_url,
            resolved: autoRedirectUrl,
        });

        if (autoRedirectUrl) {
            safeServerRedirect(autoRedirectUrl as string);
        }

        // auto_approved but no redirect url — redirect to a user-friendly error page
        // instead of silently rendering the consent UI which would cause a 400 on approve.
        redirect(`/oauth/consent?error=true&message=${encodeURIComponent('Automatische Autorisierung fehlgeschlagen: Kein Weiterleitungs-Link gefunden.')}`);
    }

    return (
        <ConsentUI
            type="consent"
            authorizationId={authorizationId}
            initialData={success ? (data || undefined) : undefined}
            initialError={!success ? (fetchError || undefined) : undefined}
        />
    );
}
