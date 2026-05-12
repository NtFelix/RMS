export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { fetchAvailableFinanceYears } from "../../../../utils/financeCalculations";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET() {
  try {
    const supabase = await createClient();
    const years = await fetchAvailableFinanceYears(supabase);
    return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}