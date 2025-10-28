import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from("Mail_Accounts")
      .select("mailadresse, ist_aktiv, erstellungsdatum, sync_enabled, last_sync_at, provider_user_id")
      .eq("user_id", user.id)
      .not("provider_user_id", "is", null)
      .order("erstellungsdatum", { ascending: false })

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching Outlook status:", error)
      return NextResponse.json(
        { error: "Failed to fetch connection status" },
        { status: 500 }
      )
    }

    // Return the first Outlook account (if any)
    const outlookAccount = data && data.length > 0 ? data[0] : null

    return NextResponse.json({
      connected: !!outlookAccount,
      connection: outlookAccount ? {
        email: outlookAccount.mailadresse,
        is_active: outlookAccount.ist_aktiv,
        sync_enabled: outlookAccount.sync_enabled,
        connected_at: outlookAccount.erstellungsdatum,
        last_sync_at: outlookAccount.last_sync_at,
      } : null
    })
  } catch (error) {
    console.error("Outlook status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
