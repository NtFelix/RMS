export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Filtering
    const wohnungId = searchParams.get('wohnungId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const type = searchParams.get('type');
    const searchQuery = searchParams.get('searchQuery');

    // Base query for transactions
    let query = supabase.from('Finanzen').select('datum, betrag, ist_einnahmen, wohnung:Wohnungen(name)');

    // Apply filters
    if (wohnungId) query = query.eq('wohnung_id', wohnungId);
    if (year) query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    if (type) query = query.eq('ist_einnahmen', type === 'Einnahme');
    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%,wohnung.name.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by month
    const monthlyData = data.reduce((acc, item) => {
        if (!item.datum) return acc;
        const date = new Date(item.datum);
        const month = date.getMonth(); // 0-11

        if (!acc[month]) {
            acc[month] = { income: 0, expenses: 0 };
        }

        if (item.ist_einnahmen) {
            acc[month].income += Number(item.betrag);
        } else {
            acc[month].expenses += Number(item.betrag);
        }

        return acc;
    }, {} as Record<number, { income: number; expenses: number }>);

    // Format for chart
    const chartData = Array.from({ length: 12 }, (_, i) => {
        const monthName = new Date(2000, i, 1).toLocaleString('de-DE', { month: 'short' });
        return {
            month: monthName,
            Einnahmen: monthlyData[i]?.income || 0,
            Ausgaben: monthlyData[i]?.expenses || 0,
        };
    });

    return NextResponse.json(chartData);

  } catch (e: any) {
    console.error('Server error GET /api/finanzen/chart:', e);
    return NextResponse.json({ error: 'Serverfehler bei der Chart-Daten-Abfrage.', details: e.message }, { status: 500 });
  }
}
