export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    // Filtering
    const searchQuery = searchParams.get('search') || '';
    const apartmentId = searchParams.get('apartmentId');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    // Sorting
    const sortKey = searchParams.get('sortKey') || 'datum';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Build base query for transactions
    let query = supabase
      .from('Finanzen')
      .select('*, Wohnungen(name)', { count: 'exact' });

    // Apply filters
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
    }
    if (apartmentId) {
      query = query.eq('wohnung_id', apartmentId);
    }
    if (year) {
      query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    }
    if (type) {
      query = query.eq('ist_einnahmen', type === 'Einnahme');
    }

    // Apply sorting
    if (sortKey) {
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('GET /api/finanzen error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build query for totals
    let totalsQuery = supabase
      .from('Finanzen')
      .select('betrag, ist_einnahmen');

    // Apply the same filters for totals
    if (searchQuery) {
      totalsQuery = totalsQuery.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
    }
    if (apartmentId) {
      totalsQuery = totalsQuery.eq('wohnung_id', apartmentId);
    }
    if (year) {
      totalsQuery = totalsQuery.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    }
    if (type) {
      totalsQuery = totalsQuery.eq('ist_einnahmen', type === 'Einnahme');
    }

    const { data: totalsData, error: totalsError } = await totalsQuery;

    if (totalsError) {
      console.error('Error fetching totals:', totalsError);
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    const totals = totalsData.reduce(
      (acc, curr) => {
        if (curr.ist_einnahmen) {
          acc.income += curr.betrag;
        } else {
          acc.expenses += curr.betrag;
        }
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    const balance = totals.income - totals.expenses;

    return NextResponse.json({
      transactions,
      count: count || 0,
      totals: { ...totals, balance },
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
