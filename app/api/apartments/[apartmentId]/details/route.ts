export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { createRequestLogger } from "@/utils/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { apartmentId } = await params;

    if (!apartmentId) {
      return NextResponse.json({ error: "Apartment ID ist erforderlich." }, { status: 400 });
    }

    // Fetch apartment details with house information
    const { data: apartment, error: apartmentError } = await supabase
      .from('Wohnungen')
      .select(`
        id,
        name,
        groesse,
        miete,
        haus_id,
        Haeuser!inner(name)
      `)
      .eq('id', apartmentId)
      .single();

    if (apartmentError) {
      const logger = createRequestLogger(request);
      logger.error("Error fetching apartment", new Error(apartmentError.message), {
        apartmentId,
        errorCode: apartmentError.code,
        details: apartmentError.details
      });
      
      if (apartmentError.code === 'PGRST116' || apartmentError.message?.includes('No rows returned')) {
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

    // Fetch current tenant (if any)
    const today = new Date().toISOString();
    const { data: tenant, error: tenantError } = await supabase
      .from('Mieter')
      .select('*')
      .eq('wohnung_id', apartmentId)
      .or(`auszug.is.null,auszug.gt.${today}`)
      .order('einzug', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tenantError) {
      const logger = createRequestLogger(request);
      logger.warn("Error fetching tenant", {
        error: tenantError.message,
        apartmentId,
        errorCode: tenantError.code,
        details: tenantError.details
      });
      // Continue without tenant data
    }

    // Add type assertion for the apartment with Haeuser
    const apartmentWithHaeuser = apartment as typeof apartment & {
      Haeuser: { name: string } | null;
    };

    // Transform the data to match the expected interface
    const response = {
      apartment: {
        id: apartment.id,
        name: apartment.name,
        groesse: apartment.groesse,
        miete: apartment.miete,
        haus_id: apartment.haus_id,
        hausName: apartmentWithHaeuser.Haeuser?.name || 'Unbekannt',
        // Note: amenities, condition, notes are not in the current schema
        // These would need to be added to the database schema if required
        amenities: [],
        condition: undefined,
        notes: undefined,
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        telefon: tenant.telefonnummer,
        einzug: tenant.einzug,
        auszug: tenant.auszug,
        leaseTerms: undefined, // Not in current schema
        paymentHistory: [], // Would need separate table/implementation
        notes: tenant.notiz,
      } : undefined,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const logger = createRequestLogger(request);
    logger.error("Unexpected error in GET /api/apartments/[apartmentId]/details", error instanceof Error ? error : new Error(String(error)), {
      apartmentId: (await params).apartmentId
    });
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Details." }, 
      { status: 500 }
    );
  }
}