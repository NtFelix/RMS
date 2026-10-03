import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http"
import { buildBulkDeleteResponse, summarizeSettledDeletes } from "@/lib/bulk-delete-summary"


export async function POST(request: Request) {
  try {
    const { requireApiPermission } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'loeschen');

    const supabase = await createSupabaseServerClient()
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
    
    const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
    const accessibleHaeuserIds = await getAccessibleHaeuserIds();
    if (accessibleHaeuserIds !== null) {
      for (const apt of aptsToCheck) {
        if (apt.haus_id && !accessibleHaeuserIds.includes(apt.haus_id)) {
          return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }
      }
    }

    // Jede Löschung einzeln abwarten: Die Datenbank kann einzelne Löschungen ablehnen (z. B. ein Mieter mit
    // hinterlegter Kaution in der Kaskade). Teilerfolge werden mit den Gründen der abgelehnten Löschungen
    // gemeldet (HTTP 200, die Liste muss neu geladen werden), nur wenn keine gelungen ist, antwortet die Route
    // mit 409 (fachliche Ablehnung) bzw. 500.
    const { softDeleteEntryAction } = await import("@/lib/papierkorb/utils");
    const results = await Promise.allSettled(ids.map(id => softDeleteEntryAction("Wohnungen", id)));
    for (const result of results) {
      if (result.status === "rejected") console.error("Supabase Bulk Delete Error for Wohnungen:", result.reason);
    }

    const { status, body } = buildBulkDeleteResponse(
      summarizeSettledDeletes(results),
      "Die Wohnungen konnten nicht gelöscht werden."
    );
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS })
  } catch (e) {
    console.error("POST /api/apartments/bulk-delete error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Löschen der Wohnungen." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
