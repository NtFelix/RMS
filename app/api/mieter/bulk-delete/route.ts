import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http"
import { buildBulkDeleteResponse, createDeleteError, summarizeSettledDeletes } from "@/lib/bulk-delete-summary"


export async function POST(request: Request) {
  try {
    const { requireApiPermission } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'loeschen');

    const supabase = await createSupabaseServerClient()
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

    // Jeder Mieter wird einzeln gelöscht, die Datenbank kann einzelne Löschungen ablehnen (z. B. Mieter mit
    // hinterlegter Kaution, SQLSTATE KA009). Alle Ergebnisse abwarten: Teilerfolge werden mit den Gründen der
    // abgelehnten Löschungen gemeldet (HTTP 200), nur wenn keine gelungen ist, antwortet die Route mit 409 bzw. 500.
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const { error } = await supabase.rpc('soft_delete_record', {
          p_table_name: 'Mieter',
          p_record_id: id,
        });
        if (error) {
          console.error("Supabase Bulk Delete Error for Mieter:", id, error);
          throw createDeleteError(error.message, error.code);
        }
      })
    );

    const { status, body } = buildBulkDeleteResponse(
      summarizeSettledDeletes(results),
      "Die Mieter konnten nicht gelöscht werden."
    );
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS })
  } catch (e) {
    console.error("POST /api/mieter/bulk-delete error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Löschen der Mieter." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
