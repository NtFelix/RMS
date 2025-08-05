export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface HausOverviewResponse {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  size?: number;
  wohnungen: WohnungOverviewData[];
}

interface WohnungOverviewData {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  status: 'frei' | 'vermietet';
  currentTenant?: {
    id: string;
    name: string;
    einzug?: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: hausId } = await params;

    if (!hausId) {
      return NextResponse.json(
        { error: "Haus-ID ist erforderlich." },
        { status: 400 }
      );
    }

    // Fetch Haus with all Wohnungen and current tenant status
    const { data: hausData, error: hausError } = await supabase
      .from('Haeuser')
      .select('id, name, strasse, ort, groesse')
      .eq('id', hausId)
      .single();

    if (hausError) {
      console.error("Error fetching Haus:", hausError);
      if (hausError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Haus nicht gefunden." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Fehler beim Laden der Hausdaten." },
        { status: 500 }
      );
    }

    // Fetch all Wohnungen for this Haus
    const { data: wohnungenData, error: wohnungenError } = await supabase
      .from('Wohnungen')
      .select('id, name, groesse, miete')
      .eq('haus_id', hausId)
      .order('name');

    if (wohnungenError) {
      console.error("Error fetching Wohnungen:", wohnungenError);
      return NextResponse.json(
        { error: "Fehler beim Laden der Wohnungsdaten." },
        { status: 500 }
      );
    }

    // Fetch current tenants for all apartments in this house
    const { data: mieterData, error: mieterError } = await supabase
      .from('Mieter')
      .select('id, name, einzug, auszug, wohnung_id')
      .in('wohnung_id', wohnungenData.map(w => w.id));

    if (mieterError) {
      console.error("Error fetching Mieter:", mieterError);
      return NextResponse.json(
        { error: "Fehler beim Laden der Mieterdaten." },
        { status: 500 }
      );
    }

    // Process Wohnungen with tenant status
    const today = new Date();
    const wohnungen: WohnungOverviewData[] = wohnungenData.map(wohnung => {
      // Find current tenant (no move-out date or move-out date in the future)
      const currentTenant = mieterData.find(mieter => 
        mieter.wohnung_id === wohnung.id && 
        (!mieter.auszug || new Date(mieter.auszug) > today)
      );

      return {
        id: wohnung.id,
        name: wohnung.name,
        groesse: wohnung.groesse,
        miete: wohnung.miete,
        status: currentTenant ? 'vermietet' : 'frei',
        currentTenant: currentTenant ? {
          id: currentTenant.id,
          name: currentTenant.name,
          einzug: currentTenant.einzug || undefined
        } : undefined
      };
    });

    // Calculate total size from all Wohnungen
    const totalSize = wohnungenData.reduce((sum, wohnung) => sum + (wohnung.groesse || 0), 0);

    const response: HausOverviewResponse = {
      id: hausData.id,
      name: hausData.name,
      strasse: hausData.strasse || undefined,
      ort: hausData.ort,
      size: totalSize > 0 ? totalSize : (hausData.groesse || undefined),
      wohnungen
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("GET /api/haeuser/[id]/overview error:", error);
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Hausübersicht." },
      { status: 500 }
    );
  }
}