import { createClient } from "@/utils/supabase/server"
export const runtime = 'edge'

import { NextResponse } from "next/server"
import { logger } from "@/utils/logger"

interface FinanceEntry {
  wohnung_id: string
  name: string
  betrag: number
  datum: string
  ist_einnahmen?: boolean
  notiz?: string
  tags?: string[]
}

export async function POST(request: Request) {
  const requestStartTime = Date.now()
  try {
    const body = await request.json()
    const { entries }: { entries: FinanceEntry[] } = body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Invalid entries data" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.warn("Finance entries API: unauthorized access attempt", {
        path: request.url,
        error: userError?.message,
        duration: Date.now() - requestStartTime
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate each entry
    for (const entry of entries) {
      if (!entry.wohnung_id || !entry.name || entry.betrag == null || !entry.datum) {
        return NextResponse.json(
          { error: "Missing required fields in entry" },
          { status: 400 }
        )
      }

      if (typeof entry.betrag !== 'number' || entry.betrag < 0) {
        return NextResponse.json(
          { error: "Invalid betrag value" },
          { status: 400 }
        )
      }
    }

    // Try optimized RPC first
    const rpcStartTime = Date.now()
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "insert_finance_entries_batch",
        {
          p_entries: entries,
          p_user_id: user.id
        }
      )

      const rpcDuration = Date.now() - rpcStartTime
      const totalDuration = Date.now() - requestStartTime

      if (!rpcError && rpcData?.success) {
        logger.info("✅ [Finance Entries API] Used optimized RPC function", {
          path: request.url,
          userId: user.id,
          rpcDuration,
          totalDuration,
          entriesCount: entries.length,
          inserted: rpcData.inserted,
          skipped: rpcData.skipped
        })
        return NextResponse.json({
          success: true,
          inserted: rpcData.inserted,
          skipped: rpcData.skipped,
          totalEntries: entries.length
        })
      }

      logger.warn("⚠️ [Finance Entries API] RPC function failed, using fallback", {
        path: request.url,
        userId: user.id,
        rpcDuration,
        rpcError: rpcError?.message
      })
    } catch (rpcException) {
      const rpcDuration = Date.now() - rpcStartTime
      logger.error("❌ [Finance Entries API] RPC call threw exception", rpcException as Error, {
        path: request.url,
        userId: user.id,
        rpcDuration
      })
    }

    // Fallback to standard insert
    logger.info("🔄 [Finance Entries API] Using fallback method", {
      path: request.url,
      userId: user.id
    })

    const fallbackStartTime = Date.now()
    const { data, error } = await supabase
      .from("Finanzen")
      .insert(entries.map(entry => ({ ...entry, user_id: user.id })))
      .select()

    const fallbackDuration = Date.now() - fallbackStartTime
    const totalDuration = Date.now() - requestStartTime

    if (error) {
      logger.error("❌ [Finance Entries API] Fallback insert failed", error, {
        path: request.url,
        userId: user.id,
        fallbackDuration
      })
      return NextResponse.json(
        { error: "Failed to create finance entries", details: error.message },
        { status: 500 }
      )
    }

    logger.info("✅ [Finance Entries API] Served fallback insert", {
      path: request.url,
      userId: user.id,
      fallbackDuration,
      totalDuration,
      entriesCount: entries.length,
      inserted: data?.length || 0
    })

    return NextResponse.json({
      success: true,
      entries: data
    })

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime
    logger.error("❌ [Finance Entries API] Unexpected error", error as Error, {
      path: request.url,
      totalDuration
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve finance entries (optional, for testing)
export async function GET(request: Request) {
  const requestStartTime = Date.now()
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.warn("Finance entries GET API: unauthorized access attempt", {
        path: request.url,
        error: userError?.message,
        duration: Date.now() - requestStartTime
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const wohnung_id = searchParams.get('wohnung_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from("Finanzen")
      .select("*")
      .eq("user_id", user.id)
      .order("datum", { ascending: false })
      .range(offset, offset + limit - 1)

    if (wohnung_id) {
      query = query.eq("wohnung_id", wohnung_id)
    }

    const { data, error } = await query

    if (error) {
      logger.error("Error fetching finance entries", error, { path: request.url, userId: user.id })
      return NextResponse.json(
        { error: "Failed to fetch finance entries" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      entries: data || []
    })

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime
    logger.error("Error in finance-entries GET API", error as Error, {
      path: request.url,
      totalDuration
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
