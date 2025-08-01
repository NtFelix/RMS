export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Filtering
    const wohnungId = searchParams.get('wohnungId');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const searchQuery = searchParams.get('searchQuery');

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'datum';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Base query for transactions
    let query = supabase.from('Finanzen').select('*, wohnung:Wohnungen(name)');

    // Apply filters
    if (wohnungId) query = query.eq('wohnung_id', wohnungId);
    if (year) query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    if (type) query = query.eq('ist_einnahmen', type === 'Einnahme');
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%,wohnung.name.ilike.%${searchQuery}%`);
    }

    // Apply sorting
    const sortOptions = { ascending: sortDirection === 'asc' };
    if (sortBy === 'wohnung') {
      query = query.order('name', { referencedTable: 'Wohnungen', ...sortOptions });
    } else {
      query = query.order(sortBy, sortOptions);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    return NextResponse.json(transactions);

  } catch (e: any) {
    console.error('Server error GET /api/export/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler bei der Finanz-Export-Abfrage.', details: e.message }, { status: 500 });
  }
}
