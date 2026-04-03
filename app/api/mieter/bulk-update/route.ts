import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

type BulkUpdateRequest = {
  ids: string[]
  updates: {
    wohnung_id?: string | null
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { ids, updates } = await request.json() as BulkUpdateRequest

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Mieter-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Keine Aktualisierungen angegeben." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { data, error } = await supabase
      .from('Mieter')
      .update(updates)
      .in('id', ids)
      .select()

    if (error) {
      console.error("Supabase Bulk Update Error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { successCount: data?.length || 0 },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (e) {
    console.error("PATCH /api/mieter/bulk-update error:", e)
    return NextResponse.json(
      { error: "Serverfehler beim Aktualisieren der Mieter." },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
