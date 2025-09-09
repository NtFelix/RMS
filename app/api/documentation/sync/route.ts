export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated (optional - depends on requirements)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich.' },
        { status: 401 }
      );
    }

    // Call the Supabase Edge Function for Notion sync
    const { data, error } = await supabase.functions.invoke('sync-notion-docs', {
      body: { manual: true }
    });

    if (error) {
      console.error('Sync function error:', error);
      return NextResponse.json(
        { error: 'Fehler beim Synchronisieren der Dokumentation.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Synchronisation erfolgreich gestartet.',
        result: data 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/documentation/sync error:', error);
    return NextResponse.json(
      { error: 'Serverfehler beim Starten der Synchronisation.' },
      { status: 500 }
    );
  }
}