import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Mieter-ID ist erforderlich." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('Mieter')
      .delete()
      .in('id', ids)
      .select()

    if (error) {
      console.error("Supabase Bulk Delete Error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { successCount: data?.length || 0 },
      { status: 200 }
    )
  } catch (e) {
    console.error("POST /api/mieter/bulk-delete error:", e)
    return NextResponse.json(
      { error: "Serverfehler beim Löschen der Mieter." },
      { status: 500 }
    )
  }
}
