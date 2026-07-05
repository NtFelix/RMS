import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { requireApiPermission } = await import("@/lib/api-permissions");
    await requireApiPermission('haeuser', 'loeschen');

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Haus-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Verify all houses are in user's scope
    const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
    const accessibleHaeuserIds = await getAccessibleHaeuserIds();
    if (accessibleHaeuserIds !== null) {
      const inaccessibleId = ids.find(id => !accessibleHaeuserIds.includes(id));
      if (inaccessibleId) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
    }

    try {
      const { softDeleteEntryAction } = await import("@/lib/papierkorb/utils");
      await Promise.all(ids.map(id => softDeleteEntryAction("Haeuser", id)));
    } catch (error: any) {
      console.error("Supabase Bulk Delete Error for Haeuser:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { successCount: ids.length },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (e) {
    console.error("POST /api/haeuser/bulk-delete error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (e as Error).message || "Serverfehler beim Löschen der Häuser." },
      { status, headers: NO_CACHE_HEADERS }
    )
  }
}


