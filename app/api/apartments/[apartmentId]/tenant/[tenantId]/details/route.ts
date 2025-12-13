export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { createRequestLogger } from "@/utils/logger";

interface ApartmentTenantDetailsResponse {
  apartment: {
    id: string;
    name: string;
    groesse: number;
    miete: number;
    hausName: string;
    hausAddress?: string;
    pricePerSqm?: number;
    amenities?: string[];
    condition?: string;
    notes?: string;
  };
  tenant?: {
    id: string;
    name: string;
    email?: string;
    telefon?: string;
    einzug?: string;
    auszug?: string;
    leaseTerms?: string;
    paymentHistory?: PaymentRecord[];
    notes?: string;
    kautionData?: {
      amount?: number;
      paymentDate?: string;
      status?: string;
    };
  };
  financialInfo?: {
    currentRent: number;
    rentPerSqm: number;
    totalPaidRent?: number;
    outstandingAmount?: number;
  };
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  type: string;
  status: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string; tenantId: string }> }
) {
  // Extract IDs at the start of the function to ensure they're in scope for error handling
  let apartmentId: string | undefined;
  let tenantId: string | undefined;
  try {
    const supabase = await createSupabaseServerClient();
    // Get the parameters
    const paramsData = await params;
    apartmentId = paramsData.apartmentId;
    tenantId = paramsData.tenantId;

    // Enhanced input validation
    if (!apartmentId || !tenantId) {
      return NextResponse.json(
        { error: "Apartment ID und Tenant ID sind erforderlich." }, 
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apartmentId) || !uuidRegex.test(tenantId)) {
      return NextResponse.json(
        { error: "Ungültige ID-Formate." }, 
        { status: 400 }
      );
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
        Haeuser!inner(
          name,
          strasse,
          ort
        )
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
      
      if (apartmentError.code === 'PGRST116') {
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

    // Fetch specific tenant with enhanced data
    const { data: tenant, error: tenantError } = await supabase
      .from('Mieter')
      .select('*')
      .eq('id', tenantId)
      .eq('wohnung_id', apartmentId)
      .single();

    if (tenantError) {
      const logger = createRequestLogger(request);
      logger.error("Error fetching tenant", new Error(tenantError.message), {
        tenantId,
        apartmentId,
        errorCode: tenantError.code,
        details: tenantError.details
      });
      
      if (tenantError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Mieter nicht gefunden oder nicht dieser Wohnung zugeordnet." }, 
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Fehler beim Laden der Mieterdaten." }, 
        { status: 500 }
      );
    }

    // Calculate financial information
    const currentRent = apartment.miete || 0;
    const rentPerSqm = apartment.groesse > 0 ? currentRent / apartment.groesse : 0;
    
    // Calculate total paid rent (simplified calculation based on move-in date)
    let totalPaidRent = 0;
    if (tenant.einzug) {
      const moveInDate = new Date(tenant.einzug);
      const endDate = tenant.auszug ? new Date(tenant.auszug) : new Date();
      
      // Calculate months rented accurately, accounting for partial months
      let monthsRented = (endDate.getFullYear() - moveInDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - moveInDate.getMonth());
      
      // Adjust if end day is before move-in day (not a full month)
      if (endDate.getDate() < moveInDate.getDate()) {
        monthsRented--;
      }
      
      // Ensure we don't have negative months
      monthsRented = Math.max(0, monthsRented);
      
      totalPaidRent = monthsRented * currentRent;
    }

    // Build house address string
    const hausData = apartment.Haeuser as any;
    const hausAddress = hausData?.strasse && hausData?.ort 
      ? `${hausData.strasse}, ${hausData.ort}`
      : hausData?.ort || undefined;

    // Parse kaution data if available
    let kautionData;
    if (tenant.kaution) {
      try {
        const parsedKaution = typeof tenant.kaution === 'string' 
          ? JSON.parse(tenant.kaution) 
          : tenant.kaution;
        kautionData = {
          amount: parsedKaution.amount,
          paymentDate: parsedKaution.paymentDate,
          status: parsedKaution.status,
        };
      } catch (e) {
        const logger = createRequestLogger(request);
        logger.warn("Error parsing kaution data", {
          tenantId,
          apartmentId,
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }

    // Transform the data to match the expected interface
    const response: ApartmentTenantDetailsResponse = {
      apartment: {
        id: apartment.id,
        name: apartment.name,
        groesse: apartment.groesse || 0,
        miete: currentRent,
        hausName: hausData?.name || 'Unbekannt',
        hausAddress,
        pricePerSqm: Math.round(rentPerSqm * 100) / 100,
        // Note: amenities, condition, notes are not in the current schema
        // These would need to be added to the database schema if required
        amenities: [],
        condition: undefined,
        notes: undefined,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email || undefined,
        telefon: tenant.telefonnummer || undefined,
        einzug: tenant.einzug || undefined,
        auszug: tenant.auszug || undefined,
        leaseTerms: undefined, // Not in current schema
        paymentHistory: [], // Would need separate table/implementation
        notes: tenant.notiz || undefined,
        kautionData,
      },
      financialInfo: {
        currentRent,
        rentPerSqm: Math.round(rentPerSqm * 100) / 100,
        totalPaidRent: Math.round(totalPaidRent * 100) / 100,
        outstandingAmount: 0, // Would need separate calculation based on payment records
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const logger = createRequestLogger(request);
    const errorContext: Record<string, any> = {
      error: error instanceof Error ? error.message : 'Unknown error',
      // Add IDs if they were successfully extracted
      ...(apartmentId && { apartmentId }),
      ...(tenantId && { tenantId })
    };
    
    logger.error("Failed to fetch apartment/tenant details", 
      error instanceof Error ? error : new Error(String(error)),
      errorContext
    );
    
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Details." }, 
      { status: 500 }
    );
  }
}