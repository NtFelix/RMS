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

    // Get Outlook account
    const { data: account, error: accountError } = await supabase
      .from("Mail_Accounts")
      .select("id")
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

    // Call edge function directly via Supabase Functions
    const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
      body: {
        accountId: account.id,
        userId: user.id,
      },
    })

    if (error) {
      console.error("Edge function error:", error)
      return NextResponse.json(
        { 
          error: "Failed to start sync",
          details: error.message || error.toString(),
          data: data
        },
        { status: 500 }
      )
    }

    // Check if data contains an error
    if (data?.error) {
      console.error("Edge function returned error:", data)
      return NextResponse.json(
        { 
          error: data.error,
          details: data.details
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageCount: data?.messageCount || 0,
      syncedAt: data?.syncedAt,
    })
  } catch (error) {
    console.error("Outlook sync error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
