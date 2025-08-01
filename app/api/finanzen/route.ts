export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Filtering
    const wohnungId = searchParams.get('wohnungId');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const searchQuery = searchParams.get('searchQuery');

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'datum';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Base query for transactions
    let query = supabase.from('Finanzen').select('*, wohnung:Wohnungen(name)', { count: 'exact' });

    // Apply filters
    if (wohnungId) query = query.eq('wohnung_id', wohnungId);
    if (year) query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    if (type) query = query.eq('ist_einnahmen', type === 'Einnahme');
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%,wohnung.name.ilike.%${searchQuery}%`);
    }

    // --- Fetch totals based on the filtered query ---
    const { data: totalData, error: totalError } = await query;
    if (totalError) throw totalError;

    const totals = totalData.reduce((acc, t) => {
      if (t.ist_einnahmen) {
        acc.income += t.betrag;
      } else {
        acc.expenses += t.betrag;
      }
      return acc;
    }, { income: 0, expenses: 0 });
    const totalBalance = totals.income - totals.expenses;

    // --- Now, apply sorting and pagination to the query ---
    const sortOptions = { ascending: sortDirection === 'asc' };
    if (sortBy === 'wohnung') {
      query = query.order('name', { referencedTable: 'Wohnungen', ...sortOptions });
    } else {
      query = query.order(sortBy, sortOptions);
    }

    query = query.range(from, to);

    // Fetch paginated data
    const { data: transactions, error: transactionsError, count } = await query;
    if (transactionsError) throw transactionsError;

    return NextResponse.json({
      transactions,
      totalCount: count,
      totals: {
        balance: totalBalance,
        income: totals.income,
        expenses: totals.expenses,
      },
    });

  } catch (e: any) {
    console.error('Server error GET /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Abfrage.', details: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const data = await request.json();
    
    const { error, data: result } = await supabase
      .from('Finanzen')
      .insert(data)
      .select('*, wohnung:Wohnungen(name)')
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
