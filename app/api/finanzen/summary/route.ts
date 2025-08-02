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
    
    // Fetch all financial data for the specified year
    const { data, error } = await supabase
      .from('Finanzen')
      .select('id, betrag, ist_einnahmen, datum')
      .gte('datum', startDate)
      .lte('datum', endDate)
      .order('datum', { ascending: false });
      
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