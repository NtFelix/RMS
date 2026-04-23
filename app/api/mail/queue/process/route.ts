import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // Manually trigger queue processing
    const { data, error } = await supabase.rpc('process_pending_queue_items')

    if (error) {
      console.error("Error triggering queue processor:", error)
      return NextResponse.json(
        { error: "Failed to trigger queue processor" },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    const result = data?.[0] || { triggered_count: 0, pending_count: 0 }

    return NextResponse.json({
      success: true,
      triggered: result.triggered_count > 0,
      pendingCount: result.pending_count,
      message: result.pending_count > 0 
        ? `Processing ${result.pending_count} pending items` 
        : 'No pending items in queue',
    }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error("Queue process error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
