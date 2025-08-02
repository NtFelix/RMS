export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get distinct years from financial data
    const { data, error } = await supabase
      .from('Finanzen')
      .select('datum')
      .not('datum', 'is', null)
      .order('datum', { ascending: false });
      
    if (error) {
      console.error('GET /api/finanzen/years error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract unique years from dates
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Add current year by default
    years.add(currentYear);
    
    (data || []).forEach(item => {
      if (item.datum) {
        let year: number;
        
        // Handle different date formats
        if (item.datum.includes('-')) {
          // YYYY-MM-DD format
          year = parseInt(item.datum.split('-')[0]);
        } else if (item.datum.includes('.')) {
          // DD.MM.YYYY format
          year = parseInt(item.datum.split('.')[2]);
        } else {
          return; // Skip invalid formats
        }
        
        if (year >= 2020 && year <= currentYear + 1) {
          years.add(year);
        }
      }
    });

    // Convert to sorted array
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    return NextResponse.json(sortedYears, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500 });
  }
}