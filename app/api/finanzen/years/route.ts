export const runtime = 'edge';
import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const currentYear = new Date().getFullYear();
    
    // Use SQL to get distinct years directly from the database
    const { data, error } = await supabase
      .from('Finanzen')
      .select('datum', { count: 'exact' })
      .not('datum', 'is', null);
      
    if (error) {
      console.error('GET /api/finanzen/years error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no data, return current year
    if (!data || data.length === 0) {
      return NextResponse.json([currentYear], { status: 200 });
    }

    // Get the minimum and maximum years from the data
    const years = new Set<number>();
    
    // Add current year by default
    years.add(currentYear);
    
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

    // Convert to sorted array in descending order
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    return NextResponse.json(sortedYears, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500 });
  }
}