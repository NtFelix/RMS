import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export const runtime = 'edge';

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen IDs zum Löschen übergeben.' }, 
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = await createClient();
    
    // Delete all selected finance records in a single transaction
    const { data, error } = await supabase
      .from('Finanzen')
      .delete()
      .in('id', ids);
      
    if (error) {
      console.error('Bulk delete error:', error);
      return NextResponse.json(
        { error: 'Fehler beim Löschen der Transaktionen' }, 
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }
    
    return NextResponse.json(
      { success: true, count: ids.length }, 
      { status: 200, headers: NO_CACHE_HEADERS }
    );
    
  } catch (e) {
    console.error('Server error during bulk delete:', e);
    return NextResponse.json(
      { error: 'Serverfehler beim Massenlöschen von Transaktionen' }, 
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
