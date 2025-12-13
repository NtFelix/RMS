export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createRequestLogger } from "@/utils/logger";

interface HausOverviewResponse {
  id: string;
  name: string;
  strasse?: string;
  ort: string;
  size?: string;
  totalArea: number;
  totalRent: number;
  apartmentCount: number;
  tenantCount: number;
  summaryStats: {
    averageRent: number;
    medianRent: number;
    averageSize: number;
    medianSize: number;
    occupancyRate: number;
    averageRentPerSqm: number;
    totalPotentialRent: number;
    vacancyRate: number;
  };
  wohnungen: WohnungOverviewData[];
}

interface MieterFromDB {
  id: string;
  name: string;
  einzug: string | null;
  auszug: string | null;
}

interface WohnungOverviewData {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  status: 'frei' | 'vermietet';
  rentPerSqm?: number;
  currentTenant?: {
    id: string;
    name: string;
    einzug?: string;
  };
  Mieter?: MieterFromDB[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { id: hausId } = await params;

    // Enhanced input validation
    if (!hausId) {
      return NextResponse.json(
        { error: "Haus-ID ist erforderlich." },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(hausId)) {
      return NextResponse.json(
        { error: "Ungültiges Haus-ID-Format." },
        { status: 400 }
      );
    }

    // Optimized single query to fetch all data at once
    const { data: combinedData, error: combinedError } = await supabase
      .from('Haeuser')
      .select(`
        id,
        name,
        strasse,
        ort,
        groesse,
        Wohnungen (
          id,
          name,
          groesse,
          miete,
          Mieter (
            id,
            name,
            einzug,
            auszug
          )
        )
      `)
      .eq('id', hausId)
      .single();

    if (combinedError) {
      console.error("Error fetching Haus overview data:", combinedError);
      if (combinedError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Haus nicht gefunden." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Fehler beim Laden der Hausübersicht." },
        { status: 500 }
      );
    }

    const hausData = combinedData;
    const wohnungenData = hausData.Wohnungen || [];

    // Process Wohnungen with tenant status
    const today = new Date();
    const wohnungen: WohnungOverviewData[] = wohnungenData.map(wohnung => {
      // Find current tenant (no move-out date or move-out date in the future)
      const currentTenant = (wohnung.Mieter || []).find((mieter: MieterFromDB) => 
        !mieter.auszug || new Date(mieter.auszug) > today
      );

      const rentPerSqm = wohnung.groesse > 0 ? (wohnung.miete || 0) / wohnung.groesse : 0;

      return {
        id: wohnung.id,
        name: wohnung.name,
        groesse: wohnung.groesse || 0,
        miete: wohnung.miete || 0,
        status: currentTenant ? 'vermietet' : 'frei',
        rentPerSqm: Math.round(rentPerSqm * 100) / 100,
        currentTenant: currentTenant ? {
          id: currentTenant.id,
          name: currentTenant.name,
          einzug: currentTenant.einzug || undefined
        } : undefined
      };
    });

    // Calculate enhanced summary statistics
    // Use house.groesse if available, otherwise sum apartment sizes
    const totalArea = hausData.groesse && hausData.groesse > 0 
      ? hausData.groesse 
      : wohnungenData.reduce((sum, wohnung) => sum + (wohnung.groesse || 0), 0);
    const totalRent = wohnungen
      .filter(w => w.status === 'vermietet')
      .reduce((sum, wohnung) => sum + (wohnung.miete || 0), 0);
    const totalPotentialRent = wohnungenData.reduce((sum, wohnung) => sum + (wohnung.miete || 0), 0);
    const apartmentCount = wohnungenData.length;
    const tenantCount = wohnungen.filter(w => w.currentTenant).length;
    const vacantCount = apartmentCount - tenantCount;
    
    // Calculate averages and medians with better handling of edge cases
    const rentValues = wohnungenData
      .map(w => w.miete || 0)
      .filter(rent => rent > 0);
    const sizeValues = wohnungenData
      .map(w => w.groesse || 0)
      .filter(size => size > 0);
    const rentPerSqmValues = wohnungen
      .map(w => w.rentPerSqm || 0)
      .filter(rentPerSqm => rentPerSqm > 0);
    
    const averageRent = rentValues.length > 0 
      ? Math.round((rentValues.reduce((sum, rent) => sum + rent, 0) / rentValues.length) * 100) / 100 
      : 0;
    const averageSize = sizeValues.length > 0 
      ? Math.round((sizeValues.reduce((sum, size) => sum + size, 0) / sizeValues.length) * 100) / 100 
      : 0;
    const averageRentPerSqm = rentPerSqmValues.length > 0 
      ? Math.round((rentPerSqmValues.reduce((sum, rentPerSqm) => sum + rentPerSqm, 0) / rentPerSqmValues.length) * 100) / 100 
      : 0;
    
    // Calculate medians with proper sorting
    const calculateMedian = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      return Math.round(median * 100) / 100;
    };
    
    const medianRent = calculateMedian(rentValues);
    const medianSize = calculateMedian(sizeValues);
    
    // Calculate rates as percentages
    const occupancyRate = apartmentCount > 0 
      ? Math.round((tenantCount / apartmentCount) * 10000) / 100 
      : 0;
    const vacancyRate = apartmentCount > 0 
      ? Math.round((vacantCount / apartmentCount) * 10000) / 100 
      : 0;

    const response: HausOverviewResponse = {
      id: hausData.id,
      name: hausData.name,
      strasse: hausData.strasse || undefined,
      ort: hausData.ort,
      size: hausData.groesse?.toString(),
      totalArea: Math.round(totalArea * 100) / 100,
      totalRent: Math.round(totalRent * 100) / 100,
      apartmentCount,
      tenantCount,
      summaryStats: {
        averageRent,
        medianRent,
        averageSize,
        medianSize,
        occupancyRate,
        averageRentPerSqm,
        totalPotentialRent: Math.round(totalPotentialRent * 100) / 100,
        vacancyRate,
      },
      wohnungen
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const logger = createRequestLogger(request);
    logger.error("Error in GET /api/haeuser/[id]/overview", error instanceof Error ? error : new Error(String(error)), {
      hausId: (await params).id
    });
    
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Hausübersicht." },
      { status: 500 }
    );
  }
}