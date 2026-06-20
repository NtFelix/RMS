import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'loeschen');

    const supabase = await createClient()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Wohnungs-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Fetch haus_ids of these apartments
    const { data: aptsToCheck, error: checkError } = await supabase
      .from('Wohnungen')
      .select('haus_id')
      .in('id', ids);
      
    if (checkError || !aptsToCheck) {
      return NextResponse.json({ error: "Fehler bei der Berechtigungsprüfung" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
    
    for (const apt of aptsToCheck) {
      if (apt.haus_id && !(await verifyEntityInScope(apt.haus_id))) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
      }
    }

    const { data, error } = await supabase
      .from('Wohnungen')
      .delete()
      .in('id', ids)
      .select()

    if (error) {
      console.error("Supabase Bulk Delete Error:", error)
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
    console.error("POST /api/apartments/bulk-delete error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Löschen der Wohnungen." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
