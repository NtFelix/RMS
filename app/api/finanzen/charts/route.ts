export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary } from "../../../../utils/financeCalculations";

// Type definitions for the financial data structure
interface WohnungData {
  name: string;
}

interface FinancialItem {
  id: string;
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
  name: string;
  wohnung_id: string;
  Wohnungen: WohnungData | WohnungData[] | null;
}

// Helper function to safely extract apartment name from Wohnungen data
function getApartmentName(wohnungen: WohnungData | WohnungData[] | null): string | undefined {
  if (!wohnungen) return undefined;
  
  // Handle array format (when Supabase returns joined data as array)
  if (Array.isArray(wohnungen) && wohnungen.length > 0) {
    return wohnungen[0]?.name;
  }
  
  // Handle object format (when Supabase returns joined data as object)
  if (typeof wohnungen === 'object' && 'name' in wohnungen) {
    return wohnungen.name;
  }
  
  return undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    // Calculate date range for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = await createSupabaseServerClient();
    
    // Try to use the optimized Supabase function first
    let data: FinancialItem[] = [];
    let error: any = null;
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_chart_data', {
        target_year: year
      });
      
      if (!rpcError && rpcData) {
        // Convert the RPC result to match our expected format
        data = rpcData.map((item: any) => ({
          id: item.id,
          betrag: item.betrag,
          ist_einnahmen: item.ist_einnahmen,
          datum: item.datum,
          name: item.name || '',
          wohnung_id: item.wohnung_id || '',
          Wohnungen: item.apartment_name ? { name: item.apartment_name } : null
        }));
      } else {
        throw new Error('RPC function failed or returned no data');
      }
    } catch (rpcError) {
      console.log('Charts API: RPC function not available, using fallback query with pagination');
      
      // Fallback to direct query with pagination
      const allData: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('Finanzen')
          .select('id, betrag, ist_einnahmen, datum, name, wohnung_id, Wohnungen(name)')
          .gte('datum', startDate)
          .lte('datum', endDate)
          .order('datum', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (pageError) {
          error = pageError;
          break; // Exit loop on error
        }
        
        if (pageData && pageData.length > 0) {
          allData.push(...pageData);
        }
        
        if (!pageData || pageData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      data = allData as FinancialItem[] || [];
    }
      
    if (error) {
      console.error('GET /api/finanzen/charts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process data for charts
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    
    // Initialize monthly data
    const monthlyData: Record<number, { income: number; expenses: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { income: 0, expenses: 0 };
    }
    
    // Initialize apartment income map
    const apartmentIncomeMap = new Map<string, number>();
    
    // Initialize expense categories map
    const expenseCategoriesMap = new Map<string, number>();
    
    // Process each transaction
    (data as FinancialItem[] || []).forEach(item => {
      if (!item.datum) return;
      
      const itemDate = new Date(item.datum);
      const month = itemDate.getMonth();
      const amount = Number(item.betrag);
      
      // Update monthly data
      if (item.ist_einnahmen) {
        monthlyData[month].income += amount;
        
        // Update apartment income (only for income transactions)
        const apartmentName = getApartmentName(item.Wohnungen);

        if (apartmentName) {
          const currentValue = apartmentIncomeMap.get(apartmentName) || 0;
          apartmentIncomeMap.set(apartmentName, currentValue + amount);
        }
      } else {
        monthlyData[month].expenses += amount;
        
        // Update expense categories (only for expense transactions)
        const category = item.name ? item.name.split(' ')[0] : 'Sonstiges';
        const currentValue = expenseCategoriesMap.get(category) || 0;
        expenseCategoriesMap.set(category, currentValue + amount);
      }
    });

    // Convert to chart format
    const monthlyIncome = monthNames.map((month, index) => ({
      month,
      einnahmen: monthlyData[index].income
    }));
    
    const incomeExpenseRatio = monthNames.map((month, index) => ({
      month,
      einnahmen: monthlyData[index].income,
      ausgaben: monthlyData[index].expenses
    }));
    
    const incomeByApartment = Array.from(apartmentIncomeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    const expenseCategories = Array.from(expenseCategoriesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Transform data to match the expected type
    const transformedData = (data as FinancialItem[] || []).map(item => ({
      ...item,
      Wohnungen: getApartmentName(item.Wohnungen) 
        ? { name: getApartmentName(item.Wohnungen)! } 
        : null
    }));

    // Calculate summary statistics using the shared utility function
    const summary = calculateFinancialSummary(
      transformedData,
      year,
      new Date()
    );

    const response = {
      year,
      summary,
      charts: {
        monthlyIncome,
        incomeExpenseRatio,
        incomeByApartment,
        expenseCategories
      },
      monthlyData
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/charts:', e);
    return NextResponse.json({ error: 'Serverfehler bei Chart-Daten.' }, { status: 500 });
  }
}