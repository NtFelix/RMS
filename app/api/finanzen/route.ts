export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const apartmentId = searchParams.get('apartmentId');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const searchQuery = searchParams.get('searchQuery');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Base query for transactions
    let query = supabase
      .from('Finanzen')
      .select('*, Wohnungen(name)', { count: 'exact' });

    // Base query for totals, applied on the same filters
    // We fetch all matching transactions to calculate totals server-side
    let totalsQuery = supabase
      .from('Finanzen')
      .select('betrag, ist_einnahmen');

    // Apply filters to both queries
    if (apartmentId && apartmentId !== 'Alle Wohnungen') {
      query = query.eq('wohnung_id', apartmentId);
      totalsQuery = totalsQuery.eq('wohnung_id', apartmentId);
    }
    if (year && year !== 'Alle Jahre') {
      query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
      totalsQuery = totalsQuery.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    }
    if (type && type !== 'Alle Transaktionen') {
      query = query.eq('ist_einnahmen', type === 'Einnahme');
      totalsQuery = totalsQuery.eq('ist_einnahmen', type === 'Einnahme');
    }
    if (searchQuery) {
      const cleanedQuery = searchQuery.replace(/[:()|&]/g, ' ').trim();
      query = query.textSearch('fts', cleanedQuery, { type: 'websearch' });
      // Note: totalsQuery does not support fts, so we apply a similar filter logic
      // This is a simplification. For full accuracy, totals should be calculated on the result of a query that supports FTS.
      // A more robust solution might involve a database function.
      // For now, we apply a broad `or` filter for totals calculation when a search query is present.
      totalsQuery = totalsQuery.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
    }

    // Execute paginated query for transactions
    query = query.order('datum', { ascending: false }).range(from, to);

    const { data: transactions, error, count } = await query;
    if (error) {
      console.error('GET /api/finanzen paginated error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Execute query to get all filtered data for total calculations
    const { data: allFilteredData, error: totalsError } = await totalsQuery;
    if (totalsError) {
      console.error('GET /api/finanzen totals error:', totalsError);
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    // Calculate totals
    const totals = allFilteredData.reduce((acc, t) => {
      if (t.ist_einnahmen) {
        acc.income += t.betrag;
      } else {
        acc.expense += t.betrag;
      }
      return acc;
    }, { income: 0, expense: 0 });

    const balance = totals.income - totals.expense;

    return NextResponse.json({
      transactions,
      totalCount: count,
      totals: { ...totals, balance }
    }, { status: 200 });

  } catch (e) {
    console.error('Server error GET /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Abfrage.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const data = await request.json();
    
    const { error, data: result } = await supabase
      .from('Finanzen')
      .insert(data)
      .select('*, Wohnungen(name)')
      .single();
      
    if (error) {
      console.error('POST /api/finanzen error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 });
    }
    
    if (!result) {
      return NextResponse.json({ error: 'Transaktion konnte nicht erstellt werden' }, { status: 500 });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('Server error POST /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Erstellen der Transaktion.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = await createClient();
    const data = await request.json();
    
    const { error, data: result } = await supabase
      .from('Finanzen')
      .update(data)
      .match({ id })
      .select();
      
    if (error) {
      console.error('PUT /api/finanzen error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 });
    }
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
    }
    
    return NextResponse.json(result[0], { status: 200 });
  } catch (e) {
    console.error('Server error PUT /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Aktualisieren der Transaktion.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Transaktions-ID erforderlich.' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { error } = await supabase.from('Finanzen').delete().match({ id });
    
    if (error) {
      console.error('DELETE /api/finanzen error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Transaktion gelöscht' }, { status: 200 });
  } catch (e) {
    console.error('Server error DELETE /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Löschen der Transaktion.' }, { status: 500 });
  }
}
