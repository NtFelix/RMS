export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createRequestLogger } from "@/utils/logger";

interface WohnungWithMieter {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  hausName: string;
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

/**
 * GET /api/wohnungen/[id]/overview
 * 
 * Fetches overview data for a specific Wohnung including all associated Mieter
 * (both current and historical). This endpoint supports the WohnungOverviewModal
 * component as specified in the property overview modals feature.
 * 
 * @param request - The HTTP request object
 * @param params - Route parameters containing the Wohnung ID
 * @returns WohnungWithMieter with Wohnung details and Mieter list
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { id: wohnungId } = await params;

    // Validate input parameters
    if (!wohnungId || wohnungId.trim() === '') {
      return NextResponse.json(
        { error: "Wohnungs-ID ist erforderlich." },
        { status: 400 }
      );
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(wohnungId)) {
      return NextResponse.json(
        { error: "Ungültige Wohnungs-ID Format." },
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
        haus_id,
        Haeuser(name)
      `)
      .eq('id', wohnungId)
      .single();

    if (wohnungError) {
      const logger = createRequestLogger(request);
      logger.error("Error fetching Wohnung", new Error(wohnungError.message), {
        wohnungId,
        errorCode: wohnungError.code,
        details: wohnungError.details
      });
      
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
      const logger = createRequestLogger(request);
      logger.error("Error fetching Mieter", new Error(mieterError.message), {
        wohnungId,
        errorCode: mieterError.code,
        details: mieterError.details
      });
      
      return NextResponse.json(
        { error: "Fehler beim Laden der Mieterdaten." },
        { status: 500 }
      );
    }

    // Process Mieter with status and validate data
    const today = new Date();
    const mieter: MieterOverviewData[] = (mieterData || []).map(mieterItem => {
      // Validate required fields
      if (!mieterItem.id || !mieterItem.name) {
        const logger = createRequestLogger(request);
        logger.warn('Invalid Mieter data', {
          wohnungId,
          mieterItem: {
            id: mieterItem.id,
            hasName: !!mieterItem.name,
            hasEmail: !!mieterItem.email
          }
        });
      }

      // Determine if tenant is active or moved out
      const isActive = !mieterItem.auszug || new Date(mieterItem.auszug) > today;

      return {
        id: mieterItem.id,
        name: mieterItem.name || 'Unbekannt',
        email: mieterItem.email || undefined,
        telefon: mieterItem.telefonnummer || undefined,
        einzug: mieterItem.einzug || undefined,
        auszug: mieterItem.auszug || undefined,
        status: isActive ? 'active' : 'moved_out'
      };
    });

    // Define the type for Wohnung data from Supabase
    type WohnungData = {
      id: string;
      name: string | null;
      groesse: number | null;
      miete: number | null;
      haus_id: string | null;
      Haeuser: Array<{ name: string }> | null;
    };

    // Cast the data to our type
    const typedWohnungData = wohnungData as WohnungData;

    // Validate and structure the response data to match WohnungWithMieter interface
    const response = {
      id: typedWohnungData.id,
      name: typedWohnungData.name || 'Unbekannt',
      groesse: typedWohnungData.groesse || 0,
      miete: typedWohnungData.miete || 0,
      hausName: typedWohnungData.Haeuser?.[0]?.name || 'Unbekannt',
      mieter
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const logger = createRequestLogger(request);
    logger.error("Unexpected error in GET /api/wohnungen/[id]/overview", error instanceof Error ? error : new Error(String(error)), {
      wohnungId: (await params).id
    });
    
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Wohnungsübersicht." },
      { status: 500 }
    );
  }
}