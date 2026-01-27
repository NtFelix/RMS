import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Token Exchange Endpoint
 * 
 * This endpoint handles the authorization code exchange for access tokens.
 * It proxies the request to Supabase's token endpoint.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            grant_type,
            code,
            client_id,
            client_secret,
            redirect_uri,
            code_verifier
        } = body;

        console.log('Token exchange request received');
        console.log('grant_type:', grant_type);
        console.log('redirect_uri:', redirect_uri);
        console.log('code_verifier present:', !!code_verifier);

        // Validate required fields
        if (!grant_type || !code || !client_id || !redirect_uri) {
            return NextResponse.json(
                { error: 'invalid_request', error_description: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // For now, we'll proxy to Supabase's token endpoint
        // In production, you might want to validate client_id and client_secret against your OAuth app registry
        const supabaseTokenUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`;

        const tokenRequestBody: Record<string, string> = {
            auth_code: code,
            code_verifier: code_verifier,
        };

        console.log('Calling Supabase token endpoint:', supabaseTokenUrl);

        const tokenResponse = await fetch(supabaseTokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify(tokenRequestBody),
        });

        const responseText = await tokenResponse.text();
        console.log('Supabase token response status:', tokenResponse.status);
        console.log('Supabase token response:', responseText);

        if (!tokenResponse.ok) {
            let errorData: any = {};
            try {
                errorData = JSON.parse(responseText);
            } catch { }

            return NextResponse.json(
                {
                    error: errorData.error || 'token_exchange_failed',
                    error_description: errorData.error_description || errorData.message || `Token exchange failed: ${tokenResponse.status}`
                },
                { status: tokenResponse.status }
            );
        }

        // Parse and return the token response
        const tokenData = JSON.parse(responseText);

        return NextResponse.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'Bearer',
            expires_in: tokenData.expires_in,
            refresh_token: tokenData.refresh_token,
            scope: 'email',
        });

    } catch (err: any) {
        console.error('Token exchange error:', err);
        return NextResponse.json(
            { error: 'server_error', error_description: err.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
