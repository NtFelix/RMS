import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

type BulkUpdatePayload = {
  ids: string[];
  updates: {
    haus_id: string | null;
  };
};

export async function PATCH(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'bearbeiten');

    const supabase = await createClient()
    const { ids, updates } = await request.json() as BulkUpdatePayload

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Wohnungs-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Keine Aktualisierungen angegeben." },
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

    // Check scope of new target house
    if (updates.haus_id && !(await verifyEntityInScope(updates.haus_id))) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    // Only allow specific fields to be updated in bulk
    const allowedUpdates = {
      haus_id: updates.haus_id
    };

    const { data, error } = await supabase
      .from('Wohnungen')
      .update(allowedUpdates)
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
    console.error("PATCH /api/apartments/bulk-update error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Aktualisieren der Wohnungen." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}
