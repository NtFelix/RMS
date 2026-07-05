import { NextResponse } from "next/server";
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export const runtime = 'edge';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const { ids, updates } = await request.json();
    
    if (!Array.isArray(ids) || !updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage. IDs und Updates werden benötigt.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Keine IDs zum Aktualisieren angegeben.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = createSupabaseServerClient();
    
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('finanzen', 'bearbeiten');

    // First, verify which records exist and can be updated
    const { data: existingRecords, error: fetchError } = await supabase
      .from('Finanzen')
      .select('id, wohnung_id')
      .in('id', ids);

    if (fetchError) {
      console.error('Fehler beim Abrufen der Finanzdaten:', fetchError);
      return NextResponse.json(
        { error: 'Fehler beim Überprüfen der Finanzdaten' },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const existingRecordsList = existingRecords || [];
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const accessibleWohnungIds = await getAccessibleWohnungIds();
    if (accessibleWohnungIds !== null) {
      for (const record of existingRecordsList) {
        if (record.wohnung_id && !accessibleWohnungIds.includes(record.wohnung_id)) {
          return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS });
        }
      }
    }

    if (updates.wohnung_id && !(await verifyWohnungInScope(updates.wohnung_id))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const existingIds = existingRecordsList.map((record: { id: string }) => record.id);
    const missingIds = ids.filter((id: string) => !existingIds.includes(id));
    const validIds = ids.filter((id: string) => existingIds.includes(id));

    if (validIds.length === 0) {
      return NextResponse.json(
        { 
          error: 'Keine gültigen Finanzdaten zum Aktualisieren gefunden',
          updatedCount: 0,
          total: ids.length,
          missingIds
        },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Update only the existing records
    const { data: updatedRecords, error: updateError } = await supabase
      .from('Finanzen')
      .update(updates)
      .in('id', validIds)
      .select(`
        id,
        wohnung_id,
        name,
        datum,
        betrag,
        ist_einnahmen,
        notiz,
        Wohnungen ( name )
      `);

    if (updateError) {
      console.error('Fehler beim Aktualisieren der Finanzdaten:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren der Finanzdaten' },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedRecords?.length || 0,
      total: ids.length,
      updatedRecords: updatedRecords ?? [],
      missingIds: missingIds.length > 0 ? missingIds : undefined
    }, { headers: NO_CACHE_HEADERS });

  } catch (error) {
    console.error('Unerwarteter Fehler bei der Massenaktualisierung:', error);
    const status = (error as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json(
      { error: (error as Error).message || 'Interner Serverfehler' },
      { status, headers: NO_CACHE_HEADERS }
    );
  }
}
