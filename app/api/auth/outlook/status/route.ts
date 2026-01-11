import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { connected: false },
        { status: 200 }
      )
    }

    // Get Outlook account
    const { data: account, error: accountError } = await supabase
      .from("Mail_Accounts")
      .select("*")
      .eq("user_id", user.id)
      .not("provider_user_id", "is", null)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { connected: false },
        { status: 200 }
      )
    }

    // Check token expiry
    const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
    const now = new Date()
    const isExpired = tokenExpiresAt ? tokenExpiresAt <= now : false
    const expiresInHours = tokenExpiresAt 
      ? Math.floor((tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
      : null

    return NextResponse.json({
      connected: true,
      connection: {
        email: account.mailadresse,
        sync_enabled: account.sync_enabled,
        last_sync_at: account.last_sync_at,
        last_sync_error: account.last_sync_error,
        token_expires_at: account.token_expires_at,
        token_expired: isExpired,
        token_expires_in_hours: expiresInHours,
        needs_reauth: !account.sync_enabled || isExpired,
      }
    })
  } catch (error) {
    console.error("Outlook status error:", error)
    return NextResponse.json(
      { connected: false },
      { status: 200 }
    )
  }
}
