export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { fetchAvailableFinanceYears } from "../../../../utils/financeCalculations";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET() {
  try {
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const wohnungIds = await getAccessibleWohnungIds();

    if (wohnungIds !== null && wohnungIds.length === 0) {
      return NextResponse.json([], { status: 200, headers: NO_CACHE_HEADERS });
    }

    const supabase = await createClient();

    if (wohnungIds !== null) {
      const { data, error } = await supabase
        .from('Finanzen')
        .select('datum')
        .in('wohnung_id', wohnungIds);
        
      if (error) {
        throw error;
      }
      
      const years = Array.from(new Set(data.map((item: any) => {
        return item.datum ? new Date(item.datum).getFullYear() : new Date().getFullYear();
      }))).sort((a, b) => b - a);
      return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
    }

    const years = await fetchAvailableFinanceYears(supabase);
    return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}