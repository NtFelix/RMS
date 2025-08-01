export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { getFinanceYears } from "@/lib/data-fetching";
import { NextResponse } from "next/server";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

// Define a more specific type for our transactions to help with type safety
type FinanzRow = {
  betrag: number;
  ist_einnahmen: boolean;
  // Add other fields that might be present in totalsData if needed
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const apartmentId = searchParams.get('apartmentId');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const searchQuery = searchParams.get('searchQuery');
    const sortKey = searchParams.get('sortKey') || 'datum';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Base query for fetching transactions
    let query = supabase
      .from('Finanzen')
      .select('*, Wohnungen(id, name)', { count: 'exact' });

    // Apply common filters
    if (apartmentId && apartmentId !== 'all') {
      query = query.eq('wohnung_id', apartmentId);
    }
    if (year && year !== 'all') {
      query = query.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    }
    if (type && type !== 'all') {
      query = query.eq('ist_einnahmen', type === 'einnahme');
    }
    if (searchQuery) {
      const searchString = `%${searchQuery}%`;
      query = query.or(`name.ilike.${searchString},notiz.ilike.${searchString},Wohnungen.name.ilike.${searchString}`);
    }

    // This query will be used for the final paginated result
    const transactionsPromise = query
      .order(sortKey, { ascending: sortDirection === 'asc' })
      .range(from, to);

    // --- Totals Query ---
    // This query will be used to calculate the total income and expenses based on the same filters.
    // It's intentionally not paginated.
    let totalsQueryBuilder;
    if (searchQuery) {
        // If there's a search query, we need to join with Wohnungen to filter correctly
        totalsQueryBuilder = supabase.from('Finanzen').select('betrag, ist_einnahmen, Wohnungen!inner(name)');
        const searchString = `%${searchQuery}%`;
        totalsQueryBuilder = totalsQueryBuilder.or(`name.ilike.${searchString},notiz.ilike.${searchString},Wohnungen.name.ilike.${searchString}`);
    } else {
        totalsQueryBuilder = supabase.from('Finanzen').select('betrag, ist_einnahmen');
    }

    // Apply common filters to totals query as well
    if (apartmentId && apartmentId !== 'all') {
        totalsQueryBuilder = totalsQueryBuilder.eq('wohnung_id', apartmentId);
    }
    if (year && year !== 'all') {
        totalsQueryBuilder = totalsQueryBuilder.gte('datum', `${year}-01-01`).lte('datum', `${year}-12-31`);
    }
    if (type && type !== 'all') {
        totalsQueryBuilder = totalsQueryBuilder.eq('ist_einnahmen', type === 'einnahme');
    }

    const totalsPromise = totalsQueryBuilder;
    const yearsPromise = getFinanceYears();

    const [
      { data: transactions, error, count },
      { data: totalsData, error: totalsError },
      availableYears
    ] = await Promise.all([
      transactionsPromise,
      totalsPromise,
      yearsPromise
    ]);

    if (error) throw error;
    if (totalsError) throw totalsError;

    const typedTotalsData = totalsData as FinanzRow[];
    const totalIncome = typedTotalsData.filter(t => t.ist_einnahmen).reduce((acc, t) => acc + t.betrag, 0);
    const totalExpenses = typedTotalsData.filter(t => !t.ist_einnahmen).reduce((acc, t) => acc + t.betrag, 0);

    return NextResponse.json({
      transactions,
      total: count,
      totalIncome,
      totalExpenses,
      availableYears,
    }, { status: 200 });

  } catch (e: any) {
    console.error('Server error GET /api/finanzen:', e);
    return NextResponse.json({ error: e.message || 'Serverfehler bei Finanzen-Abfrage.' }, { status: 500 });
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
