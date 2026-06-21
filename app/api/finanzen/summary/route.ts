export const runtime = 'edge';
import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateFinancialSummary } from "../../../../utils/financeCalculations";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    // Calculate date range for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = await createClient();
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const wohnungIds = await getAccessibleWohnungIds();

    if (wohnungIds !== null && wohnungIds.length === 0) {
      const summary = calculateFinancialSummary([], year, new Date());
      const { monthlyData, ...restSummary } = summary;
      return NextResponse.json({ ...restSummary, monthlyData }, { status: 200, headers: NO_CACHE_HEADERS });
    }
    
    // Try to use the optimized Supabase function first
    let data: any[] = [];
    let error: any = null;
    
    // Only use RPC if user is unrestricted
    if (wohnungIds === null) {
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
        console.log('Summary API: RPC function not available, using fallback query with pagination');
      }
    }

    // Fallback path or if scoped
    if (data.length === 0) {
      // Fallback to direct query with pagination
      const allData: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        let query = supabase
          .from('Finanzen')
          .select('id, betrag, ist_einnahmen, datum, wohnung_id')
          .gte('datum', startDate)
          .lte('datum', endDate);

        if (wohnungIds !== null) {
          query = query.in('wohnung_id', wohnungIds);
        }

        const { data: pageData, error: pageError } = await query
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
      
      data = allData;
    }
      
    if (error) {
      console.error('GET /api/finanzen/summary error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
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

    return NextResponse.json(summaryWithMonthlyData, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Server error GET /api/finanzen/summary:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Zusammenfassung.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}