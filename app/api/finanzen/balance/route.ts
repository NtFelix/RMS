export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Helper function to fetch all records with pagination
async function fetchAllRecords(query: any) {
  const pageSize = 1000; // Process 1000 records at a time
  let page = 0;
  let allRecords: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      page++;
      // If we got fewer records than the page size, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  
  return allRecords;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('searchQuery') || '';
    const selectedApartment = searchParams.get('selectedApartment') || '';
    const selectedYear = searchParams.get('selectedYear') || '';
    const selectedType = searchParams.get('selectedType') || '';

    const supabase = await createClient();
    let query = supabase
      .from('Finanzen')
      .select('betrag, ist_einnahmen, name, notiz, datum, wohnung_id', { count: 'exact' });

    // Apply the same filters as the main query
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

    // Fetch all records with pagination
    const allRecords = await fetchAllRecords(query);
    const transactionCount = allRecords.length;

    // Calculate the total balance server-side
    const totalBalance = allRecords.reduce((total, transaction) => {
      const amount = Number(transaction.betrag);
      return transaction.ist_einnahmen ? total + amount : total - amount;
    }, 0);

    return NextResponse.json({ 
      totalBalance,
      transactionCount
    }, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/balance:', e);
    return NextResponse.json({ error: 'Serverfehler bei Balance-Berechnung.' }, { status: 500 });
  }
}