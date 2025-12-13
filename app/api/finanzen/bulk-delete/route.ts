import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen IDs zum Löschen übergeben.' }, 
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    
    // Delete all selected finance records in a single transaction
    const { data, error } = await supabase
      .from('Finanzen')
      .delete()
      .in('id', ids);
      
    if (error) {
      console.error('Bulk delete error:', error);
      return NextResponse.json(
        { error: 'Fehler beim Löschen der Transaktionen' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, count: ids.length }, 
      { status: 200 }
    );
    
  } catch (e) {
    console.error('Server error during bulk delete:', e);
    return NextResponse.json(
      { error: 'Serverfehler beim Massenlöschen von Transaktionen' }, 
      { status: 500 }
    );
  }
}
