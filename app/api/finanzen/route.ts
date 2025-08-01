export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '25', 10)
  const apartmentId = searchParams.get('apartmentId')
  const year = searchParams.get('year')
  const type = searchParams.get('type')
  const searchQuery = searchParams.get('searchQuery')
  const sortBy = searchParams.get('sortBy') || 'datum'
  const sortDirection = searchParams.get('sortDirection') || 'desc'

  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    const supabase = await createClient()

    // Base query
    let query = supabase.from('Finanzen').select('*, Wohnungen(name)')

    // Apply filters
    if (apartmentId && apartmentId !== 'Alle Wohnungen') {
      query = query.eq('wohnung_id', apartmentId)
    }
    if (year && year !== 'Alle Jahre') {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('datum', startDate).lte('datum', endDate)
    }
    if (type && type !== 'Alle Transaktionen') {
      query = query.eq('ist_einnahmen', type === 'Einnahme')
    }
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`)
    }

    // Clone the query for separate counts and totals
    const countQuery = supabase.from('Finanzen').select('*', { count: 'exact', head: true })
    const totalsQuery = supabase.from('Finanzen').select('betrag, ist_einnahmen')

    // Apply same filters to count and totals queries
    if (apartmentId && apartmentId !== 'Alle Wohnungen') {
      countQuery.eq('wohnung_id', apartmentId)
      totalsQuery.eq('wohnung_id', apartmentId)
    }
    if (year && year !== 'Alle Jahre') {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      countQuery.gte('datum', startDate).lte('datum', endDate)
      totalsQuery.gte('datum', startDate).lte('datum', endDate)
    }
    if (type && type !== 'Alle Transaktionen') {
      const isEinnahme = type === 'Einnahme'
      countQuery.eq('ist_einnahmen', isEinnahme)
      totalsQuery.eq('ist_einnahmen', isEinnahme)
    }
    if (searchQuery) {
      const orFilter = `name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`
      countQuery.or(orFilter)
      totalsQuery.or(orFilter)
    }

    // Apply sorting
    if (sortBy === 'wohnung') {
      query = query.order('Wohnungen(name)', { ascending: sortDirection === 'asc' })
    } else {
      query = query.order(sortBy, { ascending: sortDirection === 'asc' })
    }

    // Apply pagination
    query = query.range(from, to)

    // Execute all queries in parallel
    const [
      { data: transactions, error: transactionsError },
      { count: totalCount, error: countError },
      { data: totalsData, error: totalsError }
    ] = await Promise.all([query, countQuery, totalsQuery])

    if (transactionsError || countError || totalsError) {
      console.error('GET /api/finanzen error:', transactionsError || countError || totalsError)
      return NextResponse.json({ error: (transactionsError || countError || totalsError)?.message }, { status: 500 })
    }

    // Calculate totals
    const totals = (totalsData || []).reduce(
      (acc, t) => {
        if (t.ist_einnahmen) {
          acc.totalIncome += t.betrag
        } else {
          acc.totalExpenses += t.betrag
        }
        return acc
      },
      { totalIncome: 0, totalExpenses: 0 }
    )
    const totalBalance = totals.totalIncome - totals.totalExpenses

    return NextResponse.json({
      transactions,
      totalCount: totalCount ?? 0,
      totals: { ...totals, totalBalance },
    })
  } catch (e) {
    console.error('Server error GET /api/finanzen:', e)
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Abfrage.' }, { status: 500 })
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
