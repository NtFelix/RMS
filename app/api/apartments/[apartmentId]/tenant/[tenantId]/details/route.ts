export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string; tenantId: string }> }
) {
  try {
    const supabase = await createClient();
    const { apartmentId, tenantId } = await params;

    if (!apartmentId || !tenantId) {
      return NextResponse.json({ error: "Apartment ID und Tenant ID sind erforderlich." }, { status: 400 });
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
      console.error("Error fetching apartment:", apartmentError);
      return NextResponse.json({ error: "Wohnung nicht gefunden." }, { status: 404 });
    }

    // Fetch specific tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('Mieter')
      .select('*')
      .eq('id', tenantId)
      .eq('wohnung_id', apartmentId)
      .single();

    if (tenantError) {
      console.error("Error fetching tenant:", tenantError);
      return NextResponse.json({ error: "Mieter nicht gefunden." }, { status: 404 });
    }

    // Transform the data to match the expected interface
    const response = {
      apartment: {
        id: apartment.id,
        name: apartment.name,
        groesse: apartment.groesse,
        miete: apartment.miete,
        hausName: (apartment.Haeuser as any)?.name || 'Unbekannt',
        // Note: amenities, condition, notes are not in the current schema
        // These would need to be added to the database schema if required
        amenities: [],
        condition: undefined,
        notes: undefined,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        telefon: tenant.telefonnummer,
        einzug: tenant.einzug,
        auszug: tenant.auszug,
        leaseTerms: undefined, // Not in current schema
        paymentHistory: [], // Would need separate table/implementation
        notes: tenant.notiz,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("GET /api/apartments/[apartmentId]/tenant/[tenantId]/details error:", error);
    return NextResponse.json({ error: "Serverfehler beim Laden der Details." }, { status: 500 });
  }
}