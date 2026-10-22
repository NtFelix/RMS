import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ConsentUI from './ConsentUI';
import {
    getAuthorizationDetailsAction,
    getUserMcpOrganisationsAction,
    type AuthorizationDetails,
    type UserMcpOrganisationItem
} from './actions';

export const metadata: Metadata = {
    title: 'OAuth Autorisierung | Mietevo',
    robots: {
        index: false,
        follow: false,
    },
};



interface PageProps {
    searchParams: Promise<{
        authorization_id?: string;
        error?: string;
        message?: string;
    }>;
}

// Static fallback shown while ConsentContent resolves. Mirrors the loading state of ConsentUI
// (same centred container and card). Contains no request or user data.
function ConsentFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 font-sans">
            <div className="w-full max-w-lg md:max-w-[530px]">
                <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Laden...</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Static shell: searchParams is passed down un-awaited so the shell is not blocked by request data.
export default function ConsentPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<ConsentFallback />}>
            <ConsentContent searchParams={searchParams} />
        </Suspense>
    );
}

async function ConsentContent({ searchParams }: PageProps) {
    const params = await searchParams;
    const authorizationId = params.authorization_id;
    const error = params.error;
    const message = params.message;

    // Handle error state
    if (error && message) {
        return <ConsentUI
            type="error"
            error={message}
        />;
    }

    // If no authorization_id, show error
    if (!authorizationId) {
        return <ConsentUI
            type="error"
            error="Missing authorization_id. This page requires an OAuth authorization request."
        />;
    }

    // Create Supabase server client safely
    const supabase = await createSupabaseServerClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // 1. Properly construct the path with its parameters
        const consentPath = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;

        // 2. Encode the ENTIRE path as a query parameter
        // Note: Use '/auth/login' as the base path and add the '?'
        const loginUrl = `/auth/login?redirect=${encodeURIComponent(consentPath)}`;

        // 3. Perform the redirect
        redirect(loginUrl);
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

    // Detect auto-approval: Supabase successfully returned a payload without client details.
    // Instead of auto-redirecting (which silently completes the flow without user awareness),
    // show a manage screen where the user can review the app, manage it, or continue.
    const autoRedirectUrl = (data?.redirect_url || data?.redirect_to) as string | undefined;
    const isAutoApproved = success && !data?.client;

    if (isAutoApproved) {
        if (!autoRedirectUrl) {
            return (
                <ConsentUI
                    type="error"
                    error="Automatische Autorisierung fehlgeschlagen: Kein Weiterleitungs-Link gefunden."
                />
            );
        }
        return (
            <ConsentUI
                type="manage"
                authorizationId={authorizationId}
                initialData={data as AuthorizationDetails}
                autoRedirectUrl={autoRedirectUrl}
            />
        );
    }

    // Load initial user organisations for the consent screen
    let initialOrganisations: UserMcpOrganisationItem[] = [];
    if (user && success) {
        const orgsResult = await getUserMcpOrganisationsAction(data?.client?.id);
        if (orgsResult.success && orgsResult.data) {
            initialOrganisations = orgsResult.data;
        }
    }

    return (
        <ConsentUI
            type="consent"
            authorizationId={authorizationId}
            initialData={success ? (data || undefined) : undefined}
            initialError={!success ? (fetchError || undefined) : undefined}
            initialOrganisations={initialOrganisations}
        />
    );
}
