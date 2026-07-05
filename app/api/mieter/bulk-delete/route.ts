import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'loeschen');

    const supabase = await createClient()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Mieter-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Fetch wohnung_ids of these tenants
    const { data: tenantsToCheck, error: checkError } = await supabase
      .from('Mieter')
      .select('wohnung_id')
      .in('id', ids);
      
    if (checkError || !tenantsToCheck) {
      return NextResponse.json({ error: "Fehler bei der Berechtigungsprüfung" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
    
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const accessibleWohnungIds = await getAccessibleWohnungIds();
    if (accessibleWohnungIds !== null) {
      for (const t of tenantsToCheck) {
        if (t.wohnung_id && !accessibleWohnungIds.includes(t.wohnung_id)) {
          return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }
      }
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
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { successCount: data?.length || 0 },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (e) {
    console.error("POST /api/mieter/bulk-delete error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Löschen der Mieter." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
