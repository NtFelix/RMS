import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ConsentUI from './ConsentUI';

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

    // Just pass the authorization_id to the client component
    // The client will call getAuthorizationDetails and approveAuthorization
    // This avoids any potential issues with server-side calls consuming the authorization
    return (
        <ConsentUI
            type="consent"
            authorizationId={authorizationId}
        />
    );
}
