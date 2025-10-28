import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get Outlook account with valid tokens
    const { data: account, error: accountError } = await supabase
      .from("Mail_Accounts")
      .select("*")
      .eq("user_id", user.id)
      .not("provider_user_id", "is", null)
      .eq("sync_enabled", true)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: "No Outlook account connected" },
        { status: 404 }
      )
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(account.token_expires_at)
    const now = new Date()
    
    let accessToken = account.access_token_encrypted

    if (tokenExpiresAt <= now) {
      // Refresh the token
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${account.provider_tenant_id}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            refresh_token: account.refresh_token_encrypted,
            grant_type: "refresh_token",
          }),
        }
      )

      if (!tokenResponse.ok) {
        // Token refresh failed, mark sync error
        await supabase
          .from("Mail_Accounts")
          .update({
            last_sync_error: new Date().toISOString(),
            sync_enabled: false,
          })
          .eq("id", account.id)

        return NextResponse.json(
          { error: "Token refresh failed. Please reconnect your account." },
          { status: 401 }
        )
      }

      const tokens = await tokenResponse.json()
      accessToken = tokens.access_token

      // Update tokens in database
      await supabase
        .from("Mail_Accounts")
        .update({
          access_token_encrypted: tokens.access_token,
          refresh_token_encrypted: tokens.refresh_token || account.refresh_token_encrypted,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq("id", account.id)
    }

    // Fetch emails from Microsoft Graph API
    const messagesResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error("Failed to fetch messages:", errorText)
      
      await supabase
        .from("Mail_Accounts")
        .update({
          last_sync_error: new Date().toISOString(),
        })
        .eq("id", account.id)

      return NextResponse.json(
        { error: "Failed to fetch emails from Outlook" },
        { status: 500 }
      )
    }

    const messages = await messagesResponse.json()

    // Update last sync time
    await supabase
      .from("Mail_Accounts")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq("id", account.id)

    return NextResponse.json({
      success: true,
      messageCount: messages.value?.length || 0,
      messages: messages.value || [],
    })
  } catch (error) {
    console.error("Outlook sync error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
