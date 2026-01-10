import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { encryptToken } from "@/lib/encryption"

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Validate required environment variables early
  const clientId = process.env.OUTLOOK_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Missing Outlook OAuth environment variables")
    return NextResponse.redirect(`${appUrl}?outlook_error=server_config_error`)
  }

  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(`${appUrl}?outlook_error=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}?outlook_error=missing_params`)
  }

  try {
    // SECURITY: Get user ID from the authenticated session, NOT from the state parameter
    // The state parameter should only be used for CSRF protection
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("User not authenticated during OAuth callback")
      return NextResponse.redirect(`${appUrl}/auth/login?error=session_expired`)
    }

    const userId = user.id

    // Verify state parameter matches to prevent CSRF attacks
    // State is base64 encoded JSON containing the original userId
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      if (stateData.userId !== userId) {
        console.error("State userId mismatch - possible CSRF attempt")
        return NextResponse.redirect(`${appUrl}?outlook_error=state_mismatch`)
      }
    } catch (e) {
      console.error("Invalid state parameter:", e)
      return NextResponse.redirect(`${appUrl}?outlook_error=invalid_state`)
    }

    // Exchange code for tokens using 'common' endpoint for multi-tenant support
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(`${appUrl}?outlook_error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Decode the access token to get tenant ID (JWT payload)
    let tenantId = process.env.OUTLOOK_TENANT_ID
    try {
      const tokenParts = tokens.access_token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        tenantId = payload.tid || tenantId
        console.log('Extracted tenant ID from token:', tenantId)
      }
    } catch (e) {
      console.error('Failed to decode token:', e)
    }

    // Get user profile from Microsoft Graph
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error("Failed to fetch user profile:", errorText)
      return NextResponse.redirect(`${appUrl}?outlook_error=profile_fetch_failed`)
    }

    const profile = await profileResponse.json()

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token)
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token)

    // Reuse the supabase client created earlier for authentication
    const email = profile.mail || profile.userPrincipalName

    // Check if email already exists for this user
    const { data: existing } = await supabase
      .from("Mail_Accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("mailadresse", email)
      .single()

    let dbError

    if (existing) {
      // Update existing record
      const result = await supabase
        .from("Mail_Accounts")
        .update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          provider_user_id: profile.id,
          provider_tenant_id: tenantId,
          ist_aktiv: true,
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
      dbError = result.error
    } else {
      // Insert new record
      const result = await supabase
        .from("Mail_Accounts")
        .insert({
          user_id: userId,
          mailadresse: email,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          provider_user_id: profile.id,
          provider_tenant_id: tenantId,
          ist_aktiv: true,
          sync_enabled: true,
          erstellungsdatum: new Date().toISOString().split('T')[0],
          last_sync_at: new Date().toISOString(),
        })
      dbError = result.error
    }

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.redirect(`${appUrl}?outlook_error=database_error`)
    }

    return NextResponse.redirect(`${appUrl}?outlook_success=true`)
  } catch (error) {
    console.error("Outlook OAuth callback error:", error)
    return NextResponse.redirect(`${appUrl}?outlook_error=unknown`)
  }
}
