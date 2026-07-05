import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('haeuser', 'loeschen');

    const supabase = await createClient()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Haus-ID ist erforderlich." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Verify all houses are in user's scope
    for (const id of ids) {
      if (!(await verifyEntityInScope(id))) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
    }

    let successCount = 0;
    for (const id of ids) {
      const { error } = await supabase.rpc('soft_delete_record', {
        p_table_name: 'Haeuser',
        p_record_id: id,
      });

      if (error) {
        console.error(`Supabase Bulk Delete Error for house ${id}:`, error);
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: NO_CACHE_HEADERS }
        )
      }
      successCount++;
    }

    return NextResponse.json(
      { successCount },
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

