import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const runtime = 'edge';

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

    // Get queue statistics for the current user
    const { data: stats, error: statsError } = await supabase
      .rpc('get_queue_stats', { p_user_id: user.id })

    if (statsError) {
      console.error("Error fetching queue stats:", statsError)
      return NextResponse.json(
        { error: "Failed to fetch queue statistics" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || {
        total_items: 0,
        pending_items: 0,
        processing_items: 0,
        completed_items: 0,
        failed_items: 0,
        total_messages_imported: 0,
      },
    })
  } catch (error) {
    console.error("Queue status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
