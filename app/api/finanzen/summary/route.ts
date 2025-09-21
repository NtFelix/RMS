export const runtime = 'edge';
import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary } from "../../../../utils/financeCalculations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    // Calculate date range for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = await createClient();
    
    // Try to use the optimized Supabase function first
    let data: any[] = [];
    let error: any = null;
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_summary_data', {
        target_year: year
      });
      
      if (!rpcError && rpcData) {
        data = rpcData;
      } else {
        throw new Error('RPC function failed or returned no data');
      }
    } catch (rpcError) {
      console.log('Summary API: RPC function not available, using fallback query');
      
      // Fallback to direct query (with potential pagination issues for very large datasets)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('Finanzen')
        .select('id, betrag, ist_einnahmen, datum')
        .gte('datum', startDate)
        .lte('datum', endDate)
        .order('datum', { ascending: false });
        
      data = fallbackData || [];
      error = fallbackError;
    }
      
    if (error) {
      console.error('GET /api/finanzen/summary error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate summary statistics using the shared utility function
    const summary = calculateFinancialSummary(
      data || [],
      year,
      new Date()
    );
    
    // Include monthlyData in the response
    const { monthlyData, ...restSummary } = summary;
    const summaryWithMonthlyData = { ...restSummary, monthlyData };

    return NextResponse.json(summaryWithMonthlyData, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/summary:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Zusammenfassung.' }, { status: 500 });
  }
}