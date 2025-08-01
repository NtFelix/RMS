export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { FinanceTotalsResponse, FinanceFilters } from "@/lib/data-fetching";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters from query string
    const filters: FinanceFilters = {
      apartment: searchParams.get('apartment') || undefined,
      year: searchParams.get('year') || undefined,
      type: searchParams.get('type') as 'income' | 'expense' || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Build the query with the same filter logic as the main finanzen endpoint
    let query = supabase
      .from('Finanzen')
      .select('betrag, ist_einnahmen, name, datum, notiz, wohnung_id, Wohnungen!left(name)');

    // Apply apartment filter - we need to do this differently for server-side filtering
    // First get the wohnung_id for the apartment name if apartment filter is applied
    let wohnungId: string | null = null;
    if (filters.apartment && filters.apartment !== 'Alle Wohnungen') {
      const { data: wohnungData, error: wohnungError } = await supabase
        .from('Wohnungen')
        .select('id')
        .eq('name', filters.apartment)
        .single();
      
      if (wohnungError || !wohnungData) {
        // If apartment not found, return empty totals
        const response: FinanceTotalsResponse = {
          totalBalance: 0,
          totalIncome: 0,
          totalExpenses: 0,
          transactionCount: 0,
        };
        return NextResponse.json(response, { status: 200 });
      }
      
      wohnungId = wohnungData.id;
      query = query.eq('wohnung_id', wohnungId);
    }

    // Apply year filter
    if (filters.year && filters.year !== 'Alle Jahre') {
      // Filter by year using date range
      const yearStart = `${filters.year}-01-01`;
      const yearEnd = `${filters.year}-12-31`;
      query = query.gte('datum', yearStart).lte('datum', yearEnd);
    }

    // Apply transaction type filter
    if (filters.type) {
      const isIncome = filters.type === 'income';
      query = query.eq('ist_einnahmen', isIncome);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`name.ilike.${searchTerm},notiz.ilike.${searchTerm},Wohnungen.name.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/finanzen/totals error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Keine Daten gefunden' }, { status: 404 });
    }

    // Calculate totals from the filtered data
    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    data.forEach((transaction) => {
      const amount = Number(transaction.betrag) || 0;
      transactionCount++;
      
      if (transaction.ist_einnahmen) {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    });

    const totalBalance = totalIncome - totalExpenses;

    const response: FinanceTotalsResponse = {
      totalBalance,
      totalIncome,
      totalExpenses,
      transactionCount,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/totals:', e);
    return NextResponse.json({ 
      error: 'Serverfehler bei der Berechnung der Finanztotale.' 
    }, { status: 500 });
  }
}