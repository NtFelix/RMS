import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const runtime = 'edge';

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

    // Clear OAuth tokens and disable sync for Outlook accounts
    const { error } = await supabase
      .from("Mail_Accounts")
      .update({
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        provider_user_id: null,
        provider_tenant_id: null,
        sync_enabled: false,
        ist_aktiv: false,
      })
      .eq("user_id", user.id)
      .not("provider_user_id", "is", null)

    if (error) {
      console.error("Error disconnecting Outlook:", error)
      return NextResponse.json(
        { error: "Failed to disconnect Outlook account" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Outlook disconnect error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
