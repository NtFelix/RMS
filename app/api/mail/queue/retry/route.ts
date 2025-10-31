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

    // Retry failed queue items for the current user
    const { data, error } = await supabase.rpc('retry_failed_queue_items', { 
      p_user_id: user.id 
    })

    if (error) {
      console.error("Error retrying failed items:", error)
      return NextResponse.json(
        { error: "Failed to retry queue items" },
        { status: 500 }
      )
    }

    const retriedCount = data || 0

    return NextResponse.json({
      success: true,
      retriedCount,
      message: retriedCount > 0 
        ? `Retrying ${retriedCount} failed items` 
        : 'No failed items to retry',
    })
  } catch (error) {
    console.error("Queue retry error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
