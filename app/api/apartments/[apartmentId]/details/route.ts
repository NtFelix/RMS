export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string }> }
) {
  try {
    const supabase = await createClient();
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
      console.error("Error fetching apartment:", apartmentError);
      return NextResponse.json({ error: "Wohnung nicht gefunden." }, { status: 404 });
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
      console.error("Error fetching tenant:", tenantError);
      // Continue without tenant data
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
    console.error("GET /api/apartments/[apartmentId]/details error:", error);
    return NextResponse.json({ error: "Serverfehler beim Laden der Details." }, { status: 500 });
  }
}