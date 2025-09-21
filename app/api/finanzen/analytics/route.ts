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

  try {
    // Try to use the database function if it exists
    const { data: monthlyData, error: rpcError } = await supabase
      .rpc('get_monthly_finance_data', { 
        start_date: startDate, 
        end_date: endDate 
      });

    if (!rpcError && monthlyData) {
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

      return result;
    }
  } catch (error) {
    console.log('RPC function not available, falling back to client-side calculation');
  }

  // Fallback to regular query and client-side calculation
  const { data, error } = await supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum')
    .gte('datum', startDate)
    .lte('datum', endDate);

  if (error) {
    throw error;
  }

  const summary = calculateFinancialSummary(data || [], year, new Date());
  return summary.monthlyData;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    const supabase = await createClient();

    switch (action) {
      case 'summary':
        return await handleSummary(supabase, year);
      case 'filtered-summary':
        return await handleFilteredSummary(supabase, searchParams);
      case 'chart-data':
        return await handleChartData(supabase, year);
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleSummary(supabase: any, year: number): Promise<Response> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum')
    .gte('datum', startDate)
    .lte('datum', endDate);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  const summary = calculateFinancialSummary(data || [], year, new Date());
  return NextResponse.json(summary, { status: 200 });
}

async function handleFilteredSummary(supabase: any, searchParams: URLSearchParams): Promise<Response> {
  const searchQuery = searchParams.get('searchQuery') || '';
  const selectedApartment = searchParams.get('selectedApartment') || '';
  const selectedYear = searchParams.get('selectedYear') || '';
  const selectedType = searchParams.get('selectedType') || '';

  // Build the query with filters
  let query = supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen, datum, wohnung_id, name, notiz');

  // Apply filters
  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`);
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
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  const summary = calculateFilteredSummary(data || []);
  return NextResponse.json(summary, { status: 200 });
}

async function handleChartData(supabase: any, year: number): Promise<Response> {
  try {
    const monthlyData = await getOptimizedMonthlyData(supabase, year);
    return NextResponse.json({ monthlyData }, { status: 200 });
  } catch (error) {
    console.error('Chart data error:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
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