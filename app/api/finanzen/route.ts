export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { PAGINATION } from "@/constants";

// Helper function to fetch all records with pagination
async function fetchPaginatedData(
  query: any,
  page: number,
  pageSize: number,
  sortKey: string,
  sortDirection: 'asc' | 'desc'
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  // Apply sorting
  const ascending = sortDirection === 'asc';
  
  switch (sortKey) {
    case 'name':
      query = query.order('name', { ascending });
      break;
    case 'wohnung':
      // Sort by the apartment name from the related table
      query = query.order('name', { foreignTable: 'Wohnungen', ascending });
      break;
    case 'betrag':
      query = query.order('betrag', { ascending });
      break;
    case 'typ':
      query = query.order('ist_einnahmen', { ascending });
      break;
    case 'datum':
    default:
      query = query.order('datum', { ascending });
      break;
  }
  
  // Apply pagination
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) {
    throw error;
  }
  
  return { data, count: count || 0 };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? PAGINATION.DEFAULT_PAGE_SIZE.toString(), 10);
    const searchQuery = searchParams.get('searchQuery') || '';
    const selectedApartment = searchParams.get('selectedApartment') || '';
    const selectedYear = searchParams.get('selectedYear') || '';
    const selectedType = searchParams.get('selectedType') || '';
    const sortKey = searchParams.get('sortKey') || 'datum';
    const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' || 'desc';
    
    const supabase = await createSupabaseServerClient();
    
    // Base query with only the fields we need
    let query = supabase
      .from('Finanzen')
      .select('*, Wohnungen(name)', { count: 'exact' });

    // Apply filters
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
    }

    if (selectedApartment && selectedApartment !== 'Alle Wohnungen') {
      // First get the apartment ID to filter the main Finanzen table
      const { data: apartmentData } = await supabase
        .from('Wohnungen')
        .select('id')
        .eq('name', selectedApartment)
        .single();
      
      if (apartmentData) {
        query = query.eq('wohnung_id', apartmentData.id);
      }
    }

    if (selectedYear && selectedYear !== 'Alle Jahre') {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      query = query.gte('datum', startDate).lte('datum', endDate);
    }

    if (selectedType && selectedType !== 'Alle Transaktionen') {
      const isEinnahme = selectedType === 'Einnahme';
      query = query.eq('ist_einnahmen', isEinnahme);
    }
    
    // Fetch paginated data
    const { data: transactions, count } = await fetchPaginatedData(
      query,
      page,
      pageSize,
      sortKey,
      sortDirection
    );
    
    if (!transactions) {
      return NextResponse.json([], { status: 200 });
    }
    
    return NextResponse.json(transactions, { 
      status: 200,
      headers: {
        'X-Total-Count': count?.toString() || '0', // Add total count to headers
      }
    });
  } catch (e) {
    console.error('Server error GET /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Abfrage.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
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
    
    const supabase = await createSupabaseServerClient();
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
