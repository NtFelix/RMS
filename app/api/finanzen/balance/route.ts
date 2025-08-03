export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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
      .select('betrag, ist_einnahmen');

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

    const { data, error } = await query;
      
    if (error) {
      console.error('GET /api/finanzen/balance error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate the total balance server-side
    const totalBalance = (data || []).reduce((total, transaction) => {
      const amount = Number(transaction.betrag);
      return transaction.ist_einnahmen ? total + amount : total - amount;
    }, 0);

    return NextResponse.json({ 
      totalBalance,
      transactionCount: data?.length || 0 
    }, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/balance:', e);
    return NextResponse.json({ error: 'Serverfehler bei Balance-Berechnung.' }, { status: 500 });
  }
}