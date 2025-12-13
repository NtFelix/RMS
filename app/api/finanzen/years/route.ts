export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAvailableFinanceYears } from "../../../../utils/financeCalculations";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const years = await fetchAvailableFinanceYears(supabase);
    return NextResponse.json(years, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500 });
  }
}