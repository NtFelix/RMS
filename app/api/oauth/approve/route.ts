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
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: any) {
                        // Route handlers can set cookies
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: any) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        // Get the current session to extract the access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error('No session found:', sessionError);
            return NextResponse.redirect(new URL(`/oauth/consent?error=no_session&message=Not authenticated`, request.url));
        }

        console.log('Session found, approving authorization:', authorizationId);

        // Make the approval request with the access token
        const approveUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorizations/${authorizationId}/approve`;

        const response = await fetch(approveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        const responseText = await response.text();
        console.log('Approval response status:', response.status);
        console.log('Approval response body:', responseText);

        if (!response.ok) {
            let errorData: any = {};
            try {
                errorData = JSON.parse(responseText);
            } catch { }
            const errorMessage = errorData.error_description || errorData.message || errorData.error || `Approval failed: ${response.status}`;
            return NextResponse.redirect(new URL(`/oauth/consent?error=approval_failed&message=${encodeURIComponent(errorMessage)}`, request.url));
        }

        const data = JSON.parse(responseText);

        if (data.redirect_to) {
            return NextResponse.redirect(data.redirect_to);
        } else {
            return NextResponse.redirect(new URL('/oauth/consent?error=no_redirect&message=No redirect URL received', request.url));
        }
    } catch (err: any) {
        console.error('Approval error:', err);
        return NextResponse.redirect(new URL(`/oauth/consent?error=server_error&message=${encodeURIComponent(err.message)}`, request.url));
    }
}
