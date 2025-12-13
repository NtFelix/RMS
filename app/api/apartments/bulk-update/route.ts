import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const runtime = 'edge';

type BulkUpdatePayload = {
  ids: string[];
  updates: {
    haus_id: string | null;
  };
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { ids, updates } = await request.json() as BulkUpdatePayload

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Wohnungs-ID ist erforderlich." },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Keine Aktualisierungen angegeben." },
        { status: 400 }
      )
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
        { status: 500 }
      )
    }

    return NextResponse.json(
      { successCount: data?.length || 0 },
      { status: 200 }
    )
  } catch (e) {
    console.error("PATCH /api/apartments/bulk-update error:", e)
    return NextResponse.json(
      { error: "Serverfehler beim Aktualisieren der Wohnungen." },
      { status: 500 }
    )
  }
}
