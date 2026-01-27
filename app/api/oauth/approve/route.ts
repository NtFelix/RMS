import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('authorization_id');

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 });
    }

    try {
        const cookieStore = await cookies();

        // Create Supabase server client with cookie handling
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: async () => cookieStore.getAll(),
                    setAll: async (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    },
                },
            }
        );

        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('No user found:', userError);
            const baseUrl = new URL(request.url).origin;
            return NextResponse.redirect(new URL(`/oauth/consent?error=no_session&message=Not authenticated. Please login first.`, baseUrl));
        }

        console.log('User authenticated:', user.id);
        console.log('Approving authorization:', authorizationId);

        // Use the Supabase SDK to approve the authorization
        const { data, error } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);

        if (error) {
            console.error('Approval error:', error);
            const baseUrl = new URL(request.url).origin;
            return NextResponse.redirect(new URL(`/oauth/consent?error=approval_failed&message=${encodeURIComponent(error.message)}`, baseUrl));
        }

        console.log('Approval successful, redirecting to:', data.redirect_to);

        // Redirect back to the client with authorization code
        return NextResponse.redirect(data.redirect_to);
    } catch (err: any) {
        console.error('Approval error:', err);
        const baseUrl = new URL(request.url).origin;
        return NextResponse.redirect(new URL(`/oauth/consent?error=server_error&message=${encodeURIComponent(err.message)}`, baseUrl));
    }
}
