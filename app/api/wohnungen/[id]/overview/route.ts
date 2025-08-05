export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface WohnungOverviewResponse {
  wohnung: {
    id: string;
    name: string;
    groesse: number;
    miete: number;
    hausName: string;
  };
  mieter: MieterOverviewData[];
}

interface MieterOverviewData {
  id: string;
  name: string;
  email?: string;
  telefon?: string;
  einzug?: string;
  auszug?: string;
  status: 'active' | 'moved_out';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: wohnungId } = await params;

    if (!wohnungId) {
      return NextResponse.json(
        { error: "Wohnungs-ID ist erforderlich." },
        { status: 400 }
      );
    }

    // Fetch Wohnung with Haus information
    const { data: wohnungData, error: wohnungError } = await supabase
      .from('Wohnungen')
      .select(`
        id, 
        name, 
        groesse, 
        miete,
        Haeuser!inner(name)
      `)
      .eq('id', wohnungId)
      .single();

    if (wohnungError) {
      console.error("Error fetching Wohnung:", wohnungError);
      if (wohnungError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Wohnung nicht gefunden." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Fehler beim Laden der Wohnungsdaten." },
        { status: 500 }
      );
    }

    // Fetch all Mieter for this Wohnung (current and historical)
    const { data: mieterData, error: mieterError } = await supabase
      .from('Mieter')
      .select('id, name, email, telefonnummer, einzug, auszug')
      .eq('wohnung_id', wohnungId)
      .order('einzug', { ascending: false, nullsFirst: false });

    if (mieterError) {
      console.error("Error fetching Mieter:", mieterError);
      return NextResponse.json(
        { error: "Fehler beim Laden der Mieterdaten." },
        { status: 500 }
      );
    }

    // Process Mieter with status
    const today = new Date();
    const mieter: MieterOverviewData[] = mieterData.map(mieterItem => {
      // Determine if tenant is active or moved out
      const isActive = !mieterItem.auszug || new Date(mieterItem.auszug) > today;

      return {
        id: mieterItem.id,
        name: mieterItem.name,
        email: mieterItem.email || undefined,
        telefon: mieterItem.telefonnummer || undefined,
        einzug: mieterItem.einzug || undefined,
        auszug: mieterItem.auszug || undefined,
        status: isActive ? 'active' : 'moved_out'
      };
    });

    const response: WohnungOverviewResponse = {
      wohnung: {
        id: wohnungData.id,
        name: wohnungData.name,
        groesse: wohnungData.groesse,
        miete: wohnungData.miete,
        hausName: (wohnungData.Haeuser as any)?.name || 'Unbekannt'
      },
      mieter
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("GET /api/wohnungen/[id]/overview error:", error);
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Wohnungsübersicht." },
      { status: 500 }
    );
  }
}