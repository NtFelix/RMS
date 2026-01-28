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

        // Check if user is authenticated and get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error('No session found:', sessionError);
            return NextResponse.redirect(new URL(`/oauth/consent?error=no_session&message=Not authenticated. Please login first.`, baseUrl));
        }

        console.log('User authenticated:', session.user.id);
        console.log('Approving authorization:', authorizationId);

        // Try calling the approval endpoint directly with the access token
        // The SDK might be calling the wrong endpoint, so let's try different API paths
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Try the correct endpoint based on Supabase OAuth Server API
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
        console.log('Approve response body:', responseText);

        if (!response.ok) {
            // Try alternative endpoint
            console.log('First endpoint failed, trying alternative...');

            const altUrl = `${supabaseUrl}/auth/v1/authorize`;
            const altResponse = await fetch(altUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    authorization_id: authorizationId,
                }),
            });

            const altResponseText = await altResponse.text();
            console.log('Alt response status:', altResponse.status);
            console.log('Alt response body:', altResponseText);

            if (!altResponse.ok) {
                // If both fail, try the SDK method as fallback
                console.log('Trying SDK method as fallback...');
                try {
                    const { data: sdkData, error: sdkError } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);

                    if (sdkError) {
                        return NextResponse.redirect(new URL(`/oauth/consent?error=approval_failed&message=${encodeURIComponent(sdkError.message)}`, baseUrl));
                    }

                    if (sdkData?.redirect_to) {
                        return NextResponse.redirect(sdkData.redirect_to);
                    }
                } catch (sdkErr: any) {
                    console.error('SDK fallback also failed:', sdkErr);
                }

                return NextResponse.redirect(new URL(`/oauth/consent?error=approval_failed&message=${encodeURIComponent(`API error: ${response.status}`)}`, baseUrl));
            }

            // Parse alt response
            try {
                const altData = JSON.parse(altResponseText);
                if (altData.redirect_to) {
                    return NextResponse.redirect(altData.redirect_to);
                }
            } catch { }
        }

        // Parse response
        try {
            const data = JSON.parse(responseText);
            if (data.redirect_to) {
                console.log('Redirecting to:', data.redirect_to);
                return NextResponse.redirect(data.redirect_to);
            }
        } catch { }

        return NextResponse.redirect(new URL(`/oauth/consent?error=no_redirect&message=No redirect URL received`, baseUrl));
    } catch (err: any) {
        console.error('Approval error:', err);
        return NextResponse.redirect(new URL(`/oauth/consent?error=server_error&message=${encodeURIComponent(err.message)}`, baseUrl));
    }
}
