import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http"
import { fehlerAusRpc, istEingabeObjekt, mieterEingabeAusBody, personEingabeAusBody } from "@/lib/mieter-schreibpfad"


type BulkUpdateRequest = {
  ids: string[]
  updates: {
    wohnung_id?: string | null
    [feld: string]: unknown
  }
}

export async function PATCH(request: Request) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'bearbeiten');

    const supabase = await createSupabaseServerClient()
    const { ids, updates: rawUpdates } = await request.json() as BulkUpdateRequest

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Mieter-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Personen- und Mieterfelder getrennt übernehmen (Whitelist); das Altfeld "kaution" wird verworfen.
    const person = istEingabeObjekt(rawUpdates) ? personEingabeAusBody(rawUpdates) : {}
    const mieter = istEingabeObjekt(rawUpdates) ? mieterEingabeAusBody(rawUpdates) : {}
    if (Object.keys(person).length === 0 && Object.keys(mieter).length === 0) {
      return NextResponse.json(
        { error: "Keine Aktualisierungen angegeben." },
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

    // Check scope of new target apartment
    if (typeof mieter.wohnung_id === 'string' && !(await verifyWohnungInScope(mieter.wohnung_id))) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    // Je Mieter eine RPC (Person und Mieter liegen getrennt, die RPC ändert nur die übergebenen Felder).
    // Alle Ergebnisse abwarten, damit die Anzahl der erfolgreichen Änderungen stimmt.
    const ergebnisse = await Promise.allSettled(
      ids.map(async (id) => {
        const { error } = await supabase.rpc('mieter_aktualisieren', {
          p_mieter_id: id,
          p_person: person,
          p_mieter: mieter,
        });
        if (error) throw error;
      })
    );

    const fehlgeschlagen = ergebnisse.filter((e): e is PromiseRejectedResult => e.status === 'rejected');
    if (fehlgeschlagen.length > 0) {
      const erster = fehlgeschlagen[0].reason as { code?: string; message?: string };
      console.error("Supabase Bulk Update Error:", erster?.code)
      return NextResponse.json(
        { error: fehlerAusRpc(erster ?? {}).message, successCount: ergebnisse.length - fehlgeschlagen.length },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { successCount: ergebnisse.length },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (e) {
    console.error("PATCH /api/mieter/bulk-update error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Aktualisieren der Mieter." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
