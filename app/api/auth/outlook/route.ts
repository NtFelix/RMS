import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const clientId = process.env.OUTLOOK_CLIENT_ID
  const tenantId = process.env.OUTLOOK_TENANT_ID
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI
  
  if (!clientId || !tenantId || !redirectUri) {
    return NextResponse.json(
      { error: "Outlook OAuth configuration missing" },
      { status: 500 }
    )
  }

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

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`

  return NextResponse.redirect(authUrl)
}
