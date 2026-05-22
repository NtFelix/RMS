export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary, type FinanceTransaction } from "@/utils/financeCalculations";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

interface FinanceRecord {
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
  wohnung_id?: string;
  name?: string;
  notiz?: string;
}

import type { MonthlyData } from "@/utils/financeCalculations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    console.log(`🚀 [Finance Analytics] API called - Action: ${action}, Year: ${year}`);
    const requestStartTime = Date.now();
    
    const supabase = await createClient();

    let response: Response;
    switch (action) {
      case 'summary':
        console.log(`📊 [Finance Analytics] Handling summary request for year ${year}`);
        response = await handleSummary(supabase, year);
        break;
      case 'filtered-summary':
        console.log(`🔍 [Finance Analytics] Handling filtered summary request (DEPRECATED - use Supabase RPC instead)`);
        response = await handleFilteredSummary(supabase, searchParams);
        break;
      case 'chart-data':
        console.log(`📈 [Finance Analytics] Chart data action deprecated - use /api/finanzen/charts instead`);
        return NextResponse.json({ 
          error: 'Chart data action deprecated. Use /api/finanzen/charts endpoint instead.' 
        }, { status: 410, headers: NO_CACHE_HEADERS });
        break;
      case 'available-years':
        console.log(`📅 [Finance Analytics] Handling available years request`);
        response = await handleAvailableYears(supabase);
        break;
      default:
        console.log(`❌ [Finance Analytics] Invalid action: ${action}`);
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    
    const totalDuration = Date.now() - requestStartTime;
    console.log(`✅ [Finance Analytics] Request completed in ${totalDuration}ms`);
    
    return response;
    
  } catch (error) {
    console.error('❌ [Finance Analytics] API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

async function handleSummary(supabase: any, year: number): Promise<Response> {
  console.log(`📊 [Finance Analytics] Summary: Fetching data for year ${year}`);
  const queryStartTime = Date.now();

  try {
    // Try to use the optimized Supabase function first
    const { data: summaryData, error: rpcError } = await supabase.rpc('get_financial_year_summary', {
      target_year: year
    });

    const rpcDuration = Date.now() - queryStartTime;

    if (!rpcError && summaryData && summaryData.length > 0) {
      console.log(`✅ [Finance Analytics] Summary: Used optimized RPC function (${rpcDuration}ms)`);
      
      const { processRpcFinancialSummary } = await import("@/utils/financeCalculations");
      const result = processRpcFinancialSummary(summaryData[0], year);

      console.log(`💰 [Finance Analytics] Summary results: Income: €${result.totalIncome}, Expenses: €${result.totalExpenses}, Cashflow: €${result.totalCashflow}`);
      return NextResponse.json(result, { status: 200, headers: NO_CACHE_HEADERS });
    } else {
      console.log(`⚠️ [Finance Analytics] Summary: RPC function failed or returned no data, using fallback`);
    }
  } catch (error) {
    console.log(`🔄 [Finance Analytics] Summary: RPC function not available, using fallback method`);
  }

  // Fallback to the function that returns all transactions for the year
  console.log(`🔄 [Finance Analytics] Summary: Using fallback with pagination-safe function`);
  const fallbackStartTime = Date.now();
  
  const { data, error } = await supabase.rpc('get_financial_summary_data', {
    target_year: year
  });

  const fallbackDuration = Date.now() - fallbackStartTime;

  if (error) {
    console.error('❌ [Finance Analytics] Summary fallback database error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500, headers: NO_CACHE_HEADERS });
  }

  console.log(`📈 [Finance Analytics] Summary: Fallback retrieved ${data?.length || 0} transactions (${fallbackDuration}ms)`);
  
  const calcStartTime = Date.now();
  const summary = calculateFinancialSummary(data || [], year, new Date());
  const calcDuration = Date.now() - calcStartTime;
  
  console.log(`🧮 [Finance Analytics] Summary: Calculations completed (${calcDuration}ms)`);
  console.log(`💰 [Finance Analytics] Summary results: Income: €${summary.totalIncome}, Expenses: €${summary.totalExpenses}, Cashflow: €${summary.totalCashflow}`);
  
  return NextResponse.json(summary, { status: 200, headers: NO_CACHE_HEADERS });
}

async function handleFilteredSummary(supabase: any, searchParams: URLSearchParams): Promise<Response> {
  const searchQuery = searchParams.get('searchQuery') || '';
  const selectedApartment = searchParams.get('selectedApartment') || '';
  const selectedYear = searchParams.get('selectedYear') || '';
  const selectedType = searchParams.get('selectedType') || '';

  console.log(`🔍 [Finance Analytics] Filtered Summary - Filters: Query="${searchQuery}", Apartment="${selectedApartment}", Year="${selectedYear}", Type="${selectedType}"`);

  // Build the query with filters
  let query = supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum, wohnung_id, name, notiz');

  let appliedFilters: string[] = [];

  // Apply filters
  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
    appliedFilters.push(`text search: "${searchQuery}"`);
  }

  if (selectedApartment && selectedApartment !== 'Alle Wohnungen') {
    // Get apartment ID first
    const { data: apartmentData } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('name', selectedApartment)
      .single();
    
    if (apartmentData) {
      query = query.eq('wohnung_id', apartmentData.id);
      appliedFilters.push(`apartment: "${selectedApartment}"`);
    }
  }

  if (selectedYear && selectedYear !== 'Alle Jahre') {
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    query = query.gte('datum', startDate).lte('datum', endDate);
    appliedFilters.push(`year: ${selectedYear}`);
  }

  if (selectedType && selectedType !== 'Alle Transaktionen') {
    const isEinnahme = selectedType === 'Einnahme';
    query = query.eq('ist_einnahmen', isEinnahme);
    appliedFilters.push(`type: ${selectedType}`);
  }

  console.log(`🎯 [Finance Analytics] Applied filters: ${appliedFilters.length > 0 ? appliedFilters.join(', ') : 'none'}`);
  
  const queryStartTime = Date.now();
  
  // Fetch all records with pagination to handle large datasets
  const pageSize = 1000;
  let page = 0;
  let allRecords: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('❌ [Finance Analytics] Filtered summary database error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
    
    if (data && data.length > 0) {
      allRecords.push(...data);
      
      // If we got fewer records than the page size, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  const queryDuration = Date.now() - queryStartTime;
  console.log(`📊 [Finance Analytics] Filtered query returned ${allRecords.length} transactions in ${page + 1} pages (${queryDuration}ms)`);
  
  const summary = calculateFilteredSummary(allRecords);
  console.log(`💰 [Finance Analytics] Filtered results: Balance: €${summary.totalBalance}, Income: €${summary.totalIncome}, Expenses: €${summary.totalExpenses}`);
  
  return NextResponse.json(summary, { status: 200, headers: NO_CACHE_HEADERS });
}



async function handleAvailableYears(supabase: any): Promise<Response> {
  try {
    console.log(`📅 [Finance Analytics] Available Years: Fetching distinct years from database`);
    const queryStartTime = Date.now();
    
    // Try to use an optimized query to get distinct years
    const { data, error } = await supabase
      .rpc('get_available_finance_years');

    const rpcDuration = Date.now() - queryStartTime;

    if (!error && data) {
      console.log(`✅ [Finance Analytics] Available Years: Used optimized RPC function (${rpcDuration}ms)`);
      console.log(`📊 [Finance Analytics] Available Years: Found ${data.length} years: ${data.map((item: any) => item.year).join(', ')}`);
      
      const years = data.map((item: any) => item.year).sort((a: number, b: number) => b - a);
      return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
    } else {
      console.log(`⚠️ [Finance Analytics] Available Years: RPC function not available, using fallback`);
    }
  } catch (error) {
    console.log(`🔄 [Finance Analytics] Available Years: RPC failed, using fallback method`);
  }

  // Fallback to utility function with pagination
  console.log(`🔄 [Finance Analytics] Available Years: Using fallback query method with pagination`);
  const fallbackStartTime = Date.now();
  
  try {
    const { fetchAvailableFinanceYears } = await import("@/utils/financeCalculations");
    const years = await fetchAvailableFinanceYears(supabase);
    
    const fallbackDuration = Date.now() - fallbackStartTime;
    console.log(`📊 [Finance Analytics] Available Years: Fallback completed (${fallbackDuration}ms)`);
    console.log(`📅 [Finance Analytics] Available Years: Processed years: ${years.join(', ')}`);
    
    return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('❌ [Finance Analytics] Available Years: Fallback error:', error);
    return NextResponse.json({ error: 'Failed to fetch available years' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

function calculateFilteredSummary(transactions: FinanceRecord[]) {
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(transaction => {
    const amount = Number(transaction.betrag);
    if (transaction.ist_einnahmen) {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  });

  return {
    totalBalance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses
  };
}