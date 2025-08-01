export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getFinanceYears } from "@/lib/data-fetching";

export async function GET() {
  try {
    const supabase = await createClient();

    const wohnungenPromise = supabase.from('Wohnungen').select('id, name');
    const yearsPromise = getFinanceYears();

    const [
      { data: wohnungen, error: wohnungenError },
      years
    ] = await Promise.all([
      wohnungenPromise,
      yearsPromise
    ]);

    if (wohnungenError) throw wohnungenError;

    return NextResponse.json({
      wohnungen,
      years,
    }, { status: 200 });

  } catch (e: any) {
    console.error('Server error GET /api/finanzen/meta:', e);
    return NextResponse.json({ error: e.message || 'Serverfehler bei Metadaten-Abfrage.' }, { status: 500 });
  }
}
