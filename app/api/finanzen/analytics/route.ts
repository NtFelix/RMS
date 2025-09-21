export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary } from "@/utils/financeCalculations";

interface FinanceRecord {
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
  wohnung_id?: string;
  name?: string;
  notiz?: string;
}

interface MonthlyData {
  income: number;
  expenses: number;
  cashflow: number;
}

async function getOptimizedMonthlyData(supabase: any, year: number): Promise<Record<number, MonthlyData>> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  console.log(`🔍 [Finance Analytics] Attempting to fetch monthly data for year ${year}`);

  try {
    // Try to use the database function if it exists
    console.log(`📊 [Finance Analytics] Trying optimized Supabase RPC function...`);
    const startTime = Date.now();
    
    const { data: monthlyData, error: rpcError } = await supabase
      .rpc('get_monthly_finance_data', { 
        start_date: startDate, 
        end_date: endDate 
      });

    const rpcDuration = Date.now() - startTime;

    if (!rpcError && monthlyData) {
      console.log(`✅ [Finance Analytics] SUCCESS: Used optimized Supabase RPC function (${rpcDuration}ms)`);
      console.log(`📈 [Finance Analytics] RPC returned ${monthlyData.length} monthly records`);
      
      // Transform RPC result to expected format
      const result: Record<number, MonthlyData> = {};
      
      // Initialize all months
      for (let i = 0; i < 12; i++) {
        result[i] = { income: 0, expenses: 0, cashflow: 0 };
      }

      // Fill with actual data
      monthlyData.forEach((row: any) => {
        const month = row.month - 1; // Convert to 0-based index
        result[month] = {
          income: parseFloat(row.total_income) || 0,
          expenses: parseFloat(row.total_expenses) || 0,
          cashflow: (parseFloat(row.total_income) || 0) - (parseFloat(row.total_expenses) || 0)
        };
      });

      console.log(`🎯 [Finance Analytics] Processed monthly data for months: ${monthlyData.map((r: any) => r.month).join(', ')}`);
      return result;
    } else {
      console.log(`⚠️ [Finance Analytics] RPC function failed or returned no data:`, rpcError?.message || 'No data returned');
    }
  } catch (error) {
    console.log(`❌ [Finance Analytics] RPC function not available or failed:`, error);
  }

  // Fallback to regular query and client-side calculation
  console.log(`🔄 [Finance Analytics] FALLBACK: Using server-side calculation...`);
  const fallbackStartTime = Date.now();
  
  const { data, error } = await supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum')
    .gte('datum', startDate)
    .lte('datum', endDate);

  const fallbackDuration = Date.now() - fallbackStartTime;

  if (error) {
    console.error(`❌ [Finance Analytics] Fallback query failed:`, error);
    throw error;
  }

  console.log(`📊 [Finance Analytics] Fallback query completed (${fallbackDuration}ms) - processing ${data?.length || 0} records`);
  
  const summary = calculateFinancialSummary(data || [], year, new Date());
  console.log(`✅ [Finance Analytics] Server-side calculation completed`);
  
  return summary.monthlyData;
}

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
        console.log(`🔍 [Finance Analytics] Handling filtered summary request`);
        response = await handleFilteredSummary(supabase, searchParams);
        break;
      case 'chart-data':
        console.log(`📈 [Finance Analytics] Handling chart data request for year ${year}`);
        response = await handleChartData(supabase, year);
        break;
      case 'available-years':
        console.log(`📅 [Finance Analytics] Handling available years request`);
        response = await handleAvailableYears(supabase);
        break;
      default:
        console.log(`❌ [Finance Analytics] Invalid action: ${action}`);
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
    
    const totalDuration = Date.now() - requestStartTime;
    console.log(`✅ [Finance Analytics] Request completed in ${totalDuration}ms`);
    
    return response;
    
  } catch (error) {
    console.error('❌ [Finance Analytics] API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleSummary(supabase: any, year: number): Promise<Response> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  console.log(`📊 [Finance Analytics] Summary: Querying transactions from ${startDate} to ${endDate}`);
  const queryStartTime = Date.now();

  const { data, error } = await supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum')
    .gte('datum', startDate)
    .lte('datum', endDate);

  const queryDuration = Date.now() - queryStartTime;

  if (error) {
    console.error('❌ [Finance Analytics] Summary database error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  console.log(`📈 [Finance Analytics] Summary: Retrieved ${data?.length || 0} transactions (${queryDuration}ms)`);
  
  const calcStartTime = Date.now();
  const summary = calculateFinancialSummary(data || [], year, new Date());
  const calcDuration = Date.now() - calcStartTime;
  
  console.log(`🧮 [Finance Analytics] Summary: Calculations completed (${calcDuration}ms)`);
  console.log(`💰 [Finance Analytics] Summary results: Income: €${summary.totalIncome}, Expenses: €${summary.totalExpenses}, Cashflow: €${summary.totalCashflow}`);
  
  return NextResponse.json(summary, { status: 200 });
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
  const { data, error } = await query;
  const queryDuration = Date.now() - queryStartTime;

  if (error) {
    console.error('❌ [Finance Analytics] Filtered summary database error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  console.log(`📊 [Finance Analytics] Filtered query returned ${data?.length || 0} transactions (${queryDuration}ms)`);
  
  const summary = calculateFilteredSummary(data || []);
  console.log(`💰 [Finance Analytics] Filtered results: Balance: €${summary.totalBalance}, Income: €${summary.totalIncome}, Expenses: €${summary.totalExpenses}`);
  
  return NextResponse.json(summary, { status: 200 });
}

async function handleChartData(supabase: any, year: number): Promise<Response> {
  try {
    console.log(`📈 [Finance Analytics] Chart Data: Starting data fetch for year ${year}`);
    const chartStartTime = Date.now();
    
    const monthlyData = await getOptimizedMonthlyData(supabase, year);
    
    const chartDuration = Date.now() - chartStartTime;
    console.log(`📊 [Finance Analytics] Chart Data: Completed in ${chartDuration}ms`);
    
    // Log summary of monthly data
    const monthsWithData = Object.entries(monthlyData)
      .filter(([_, data]) => data.income > 0 || data.expenses > 0)
      .map(([month, _]) => parseInt(month) + 1); // Convert back to 1-based month numbers
    
    console.log(`📅 [Finance Analytics] Chart Data: Found data for months: ${monthsWithData.length > 0 ? monthsWithData.join(', ') : 'none'}`);
    
    return NextResponse.json({ monthlyData }, { status: 200 });
  } catch (error) {
    console.error('❌ [Finance Analytics] Chart data error:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
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
      return NextResponse.json(years, { status: 200 });
    } else {
      console.log(`⚠️ [Finance Analytics] Available Years: RPC function not available, using fallback`);
    }
  } catch (error) {
    console.log(`🔄 [Finance Analytics] Available Years: RPC failed, using fallback method`);
  }

  // Fallback to regular query
  console.log(`🔄 [Finance Analytics] Available Years: Using fallback query method`);
  const fallbackStartTime = Date.now();
  
  const { data, error } = await supabase
    .from('Finanzen')
    .select('datum')
    .not('datum', 'is', null);

  const fallbackDuration = Date.now() - fallbackStartTime;

  if (error) {
    console.error('❌ [Finance Analytics] Available Years: Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch available years' }, { status: 500 });
  }

  console.log(`📊 [Finance Analytics] Available Years: Fallback query returned ${data?.length || 0} records (${fallbackDuration}ms)`);

  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
  
  // Add current year by default
  years.add(currentYear);
  
  // Process dates to extract years
  data?.forEach(item => {
    if (!item.datum) return;
    
    try {
      const date = new Date(item.datum);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        if (year <= currentYear + 1) {
          years.add(year);
        }
      }
    } catch (e) {
      console.warn('❌ [Finance Analytics] Invalid date format:', item.datum);
    }
  });

  const sortedYears = Array.from(years).sort((a, b) => b - a);
  console.log(`📅 [Finance Analytics] Available Years: Processed years: ${sortedYears.join(', ')}`);
  
  return NextResponse.json(sortedYears, { status: 200 });
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