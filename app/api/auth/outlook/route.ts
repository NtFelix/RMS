import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { ROUTES } from "@/lib/constants"

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const tenantId = process.env.OUTLOOK_TENANT_ID

  if (!clientId || !tenantId) {
    return NextResponse.json(
      { error: "Outlook OAuth configuration missing" },
      { status: 500 }
    )
  }

  // Dynamically derive redirect URI from the request URL
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}${ROUTES.API_OUTLOOK_CALLBACK}`

  // Store user ID in state parameter for callback
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64")

  const scopes = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "User.Read"
  ].join(" ")

  // Use 'common' endpoint for multi-tenant apps that support all Microsoft accounts
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes,
    state: state,
  })

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
