export const runtime = 'edge';
import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const currentYear = new Date().getFullYear();
    
    // Try to use the optimized database function first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_finance_years');
      
      if (!rpcError && rpcData) {
        const years = rpcData.map((item: any) => item.year).sort((a: number, b: number) => b - a);
        return NextResponse.json(years, { status: 200 });
      }
    } catch (error) {
      console.log('Years API: RPC function not available, using fallback with pagination');
    }

    // Fallback to regular query with pagination
    const years = new Set<number>();
    
    // Add current year by default
    years.add(currentYear);
    
    try {
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('Finanzen')
          .select('datum')
          .not('datum', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('GET /api/finanzen/years pagination error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        // Process dates to extract years
        data.forEach(item => {
          if (!item.datum) return;
          
          try {
            // Parse the date string to a Date object
            const date = new Date(item.datum);
            // If the date is valid, get the full year
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              // Include all valid years up to next year
              if (year <= currentYear + 1) {
                years.add(year);
              }
            }
          } catch (e) {
            console.warn('Invalid date format:', item.datum);
          }
        });

        // If we got fewer records than the page size, we've reached the end
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.error('Years API pagination error:', error);
      return NextResponse.json({ error: 'Failed to fetch years with pagination' }, { status: 500 });
    }

    // Convert to sorted array in descending order
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    return NextResponse.json(sortedYears, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500 });
  }
}