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

    // Get Outlook account
    const { data: account, error: accountError } = await supabase
      .from("Mail_Accounts")
      .select("id")
      .eq("user_id", user.id)
      .not("provider_user_id", "is", null)
      .eq("sync_enabled", true)
      .single()

    if (accountError || !account) {
      console.error("Account lookup error:", accountError)
      return NextResponse.json(
        {
          error: "No Outlook account connected",
          details: accountError?.message
        },
        { status: 404 }
      )
    }

    console.log("Found Outlook account:", account.id)

    // Call edge function directly via Supabase Functions
    console.log("Calling queue-outlook-sync edge function...")
    const { data, error } = await supabase.functions.invoke('queue-outlook-sync', {
      body: {
        accountId: account.id,
        userId: user.id,
      },
    })

    console.log("Edge function response:", { data, error })

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
          details: data.details,
          requiresReauth: data.requiresReauth || false
        },
        { status: data.requiresReauth ? 401 : 500 }
      )
    }

    // The queue processor is triggered automatically by pg_cron every 10 seconds
    // No need to manually trigger it here

    return NextResponse.json({
      success: true,
      message: data?.message || "Email import started",
      queueId: data?.queueId,
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
