import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('authorization_id');
    const baseUrl = new URL(request.url).origin;

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        console.error('Missing Supabase environment variables');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    try {
        const cookieStore = await cookies();

        // Create Supabase server client with cookie handling
        const supabase = createServerClient(
            supabaseUrl,
            anonKey,
            {
                cookies: {
                    getAll: async () => cookieStore.getAll(),
                    setAll: async (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    },
                },
            }
        );

        // Check if user is authenticated and get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error('No session found:', sessionError);
            return NextResponse.redirect(new URL(`/oauth/consent?error=no_session&message=Not authenticated. Please login first.`, baseUrl));
        }

        console.log('User authenticated:', session.user.id);
        console.log('Approving authorization:', authorizationId);

        // Try calling the approval endpoint directly with the access token
        // Use the standard Supabase OAuth authorize endpoint
        const approveUrl = `${supabaseUrl}/auth/v1/oauth/authorize`;

        console.log('Calling approve URL:', approveUrl);

        const response = await fetch(approveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                authorization_id: authorizationId,
                consent: 'approve',
            }),
        });

        const responseText = await response.text();
        console.log('Approve response status:', response.status);

        if (!response.ok) {
            console.error('Approve failed:', responseText);

            // If the first attempt fails, we can try the SDK method as a robust fallback
            // This handles potential differences in internal vs public endpoints
            console.log('API call failed, trying SDK method as fallback...');
            try {
                const { data: sdkData, error: sdkError } = await (supabase.auth as unknown as import('@/types/supabase').SupabaseAuthWithOAuth).oauth.approveAuthorization(authorizationId);

                if (sdkError) {
                    throw sdkError;
                }

                if (sdkData?.redirect_to) {
                    return NextResponse.redirect(sdkData.redirect_to);
                }
                // If success but no redirect, we might be done or need to guess
                console.log('SDK success but no explicit redirect_to returned immediately');
            } catch (sdkErr: any) {
                console.error('SDK fallback also failed:', sdkErr);
                return NextResponse.redirect(new URL(`/oauth/consent?error=approval_failed&message=${encodeURIComponent(sdkErr.message || 'Unknown error')}`, baseUrl));
            }
        }

        // Parse successful API response
        try {
            const data = JSON.parse(responseText);
            if (data.redirect_to) {
                console.log('Redirecting to:', data.redirect_to);
                return NextResponse.redirect(data.redirect_to);
            }
        } catch (e) {
            console.error('Failed to parse approval response JSON:', e);
        }

        return NextResponse.redirect(new URL(`/oauth/consent?error=no_redirect&message=No redirect URL received`, baseUrl));
    } catch (err: any) {
        console.error('Approval error:', err);
        return NextResponse.redirect(new URL(`/oauth/consent?error=server_error&message=${encodeURIComponent(err.message)}`, baseUrl));
    }
}
