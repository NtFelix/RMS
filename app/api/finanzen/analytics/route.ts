export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary, type FinanceTransaction } from "@/utils/financeCalculations";

interface FinanceRecord {
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
  wohnung_id?: string;
  name?: string;
  notiz?: string;
}

import type { MonthlyData } from "@/utils/financeCalculations";

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

  // Fallback to pagination-safe function
  console.log(`🔄 [Finance Analytics] FALLBACK: Using pagination-safe function...`);
  const fallbackStartTime = Date.now();
  
  const { data, error } = await supabase.rpc('get_financial_summary_data', {
    target_year: year
  });

  const fallbackDuration = Date.now() - fallbackStartTime;

  if (error) {
    console.error(`❌ [Finance Analytics] Fallback RPC query failed:`, error);
    throw error;
  }

  console.log(`📊 [Finance Analytics] Fallback RPC completed (${fallbackDuration}ms) - processing ${data?.length || 0} records`);
  
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
        console.log(`📈 [Finance Analytics] Chart data action deprecated - use /api/finanzen/charts instead`);
        return NextResponse.json({ 
          error: 'Chart data action deprecated. Use /api/finanzen/charts endpoint instead.' 
        }, { status: 410 });
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
      
      const summary = summaryData[0];
      
      // Convert the database result to our expected format
      const monthlyData: Record<number, { income: number; expenses: number; cashflow: number }> = {};
      
      // Initialize all months
      for (let i = 0; i < 12; i++) {
        monthlyData[i] = { income: 0, expenses: 0, cashflow: 0 };
      }
      
      // Populate with actual data from the database
      if (summary.monthly_data) {
        Object.entries(summary.monthly_data as Record<string, any>).forEach(([month, data]) => {
          const monthIndex = parseInt(month);
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex] = {
              income: Number(data.income || 0),
              expenses: Number(data.expenses || 0),
              cashflow: Number(data.cashflow || 0)
            };
          }
        });
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const monthsPassed = year === currentYear ? currentDate.getMonth() + 1 : 12;
      
      // Calculate averages based on passed months
      let incomeForPassedMonths = 0;
      let expensesForPassedMonths = 0;
      
      for (let i = 0; i < (year === currentYear ? currentDate.getMonth() + 1 : 12); i++) {
        incomeForPassedMonths += monthlyData[i].income;
        expensesForPassedMonths += monthlyData[i].expenses;
      }
      
      const averageMonthlyIncome = monthsPassed > 0 ? incomeForPassedMonths / monthsPassed : 0;
      const averageMonthlyExpenses = monthsPassed > 0 ? expensesForPassedMonths / monthsPassed : 0;
      const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;

      const result = {
        year,
        totalIncome: Number(summary.total_income || 0),
        totalExpenses: Number(summary.total_expenses || 0),
        totalCashflow: Number(summary.total_cashflow || 0),
        averageMonthlyIncome,
        averageMonthlyExpenses,
        averageMonthlyCashflow,
        yearlyProjection: averageMonthlyCashflow * 12,
        monthsPassed,
        monthlyData
      };

      console.log(`💰 [Finance Analytics] Summary results: Income: €${result.totalIncome}, Expenses: €${result.totalExpenses}, Cashflow: €${result.totalCashflow}`);
      return NextResponse.json(result, { status: 200 });
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
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  console.log(`📈 [Finance Analytics] Summary: Fallback retrieved ${data?.length || 0} transactions (${fallbackDuration}ms)`);
  
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
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
    
    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      
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
  
  return NextResponse.json(summary, { status: 200 });
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

  // Fallback to regular query with pagination
  console.log(`🔄 [Finance Analytics] Available Years: Using fallback query method with pagination`);
  const fallbackStartTime = Date.now();
  
  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
  
  // Add current year by default
  years.add(currentYear);
  
  try {
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    let totalRecords = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('Finanzen')
        .select('datum')
        .not('datum', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('❌ [Finance Analytics] Available Years: Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch available years' }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      totalRecords += data.length;

      // Process dates to extract years
      data.forEach((item: { datum: string | null }) => {
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

      // If we got fewer records than the page size, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    const fallbackDuration = Date.now() - fallbackStartTime;
    console.log(`📊 [Finance Analytics] Available Years: Fallback pagination completed - processed ${totalRecords} records in ${page + 1} pages (${fallbackDuration}ms)`);
  } catch (error) {
    console.error('❌ [Finance Analytics] Available Years: Pagination error:', error);
    return NextResponse.json({ error: 'Failed to fetch available years' }, { status: 500 });
  }

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