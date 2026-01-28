import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

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

        // Mock registry - in production this should be in a database or env var.
        // The user should add their valid client IDs here.
        const ALLOWED_CLIENTS: Record<string, string | null> = {
            // 'client-id': 'client-secret' (or null if public client)
            // Example:
            // [process.env.OAUTH_CLIENT_ID!]: process.env.OAUTH_CLIENT_SECRET || null
        };

        // If we have a configured client ID in env, allow it
        if (process.env.OAUTH_CLIENT_ID) {
            ALLOWED_CLIENTS[process.env.OAUTH_CLIENT_ID] = process.env.OAUTH_CLIENT_SECRET || null;
        }

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
        // Validate client_id and client_secret
        // If ALLOWED_CLIENTS is empty, we warn but (for now) proceed if no client_id was provided? 
        // No, the critical alert says we MUST validate.
        // Ideally we should reject unknown clients.
        // However, if the registry is empty, we might break the app if it relies on "any client".
        // Use a flag to enable strict mode, or check if ALLOWED_CLIENTS has entries.

        const isStrictValidation = Object.keys(ALLOWED_CLIENTS).length > 0;

        if (isStrictValidation) {
            if (!ALLOWED_CLIENTS.hasOwnProperty(client_id)) {
                return NextResponse.json({ error: 'invalid_client', error_description: 'Unknown client_id' }, { status: 401 });
            }
            const expectedSecret = ALLOWED_CLIENTS[client_id];
            if (expectedSecret && expectedSecret !== client_secret) {
                return NextResponse.json({ error: 'invalid_client', error_description: 'Invalid client_secret' }, { status: 401 });
            }
        } else {
            console.error('CRITICAL: No OAuth clients configured. Rejecting request. Please configure ALLOWED_CLIENTS in app/api/oauth/token/route.ts or set OAUTH_CLIENT_ID env var.');
            return NextResponse.json({ error: 'invalid_client', error_description: 'Client authentication failed: server not configured.' }, { status: 500 });
        }

        // Proxy to Supabase's token endpoint
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
            } catch (e) {
                console.error('Failed to parse error response from Supabase token endpoint:', e);
            }

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
            scope: tokenData.scope || 'email',
        });

    } catch (err: any) {
        console.error('Token exchange error:', err);
        return NextResponse.json(
            { error: 'server_error', error_description: err.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
