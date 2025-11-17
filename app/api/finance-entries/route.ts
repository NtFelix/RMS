import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

interface FinanceEntry {
  wohnung_id: string
  name: string
  betrag: number
  datum: string
  ist_einnahmen: boolean
  notiz?: string
}

export async function POST(request: Request) {
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

    // Validate each entry
    for (const entry of entries) {
      if (!entry.wohnung_id || !entry.name || !entry.betrag || !entry.datum) {
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

    // Insert all entries in a single batch
    const { data, error } = await supabase
      .from("Finanzen")
      .insert(entries)
      .select()

    if (error) {
      console.error("Error creating finance entries:", error)
      return NextResponse.json(
        { error: "Failed to create finance entries", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: data
    })

  } catch (error) {
    console.error("Error in finance-entries API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve finance entries (optional, for testing)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wohnung_id = searchParams.get('wohnung_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let query = supabase
      .from("Finanzen")
      .select("*")
      .order("datum", { ascending: false })
      .range(offset, offset + limit - 1)

    if (wohnung_id) {
      query = query.eq("wohnung_id", wohnung_id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching finance entries:", error)
      return NextResponse.json(
        { error: "Failed to fetch finance entries" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      entries: data || []
    })

  } catch (error) {
    console.error("Error in finance-entries GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
