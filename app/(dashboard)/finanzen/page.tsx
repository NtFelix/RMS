export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";


import { PAGINATION } from "@/constants";

async function getSummaryData(year: number) {
  const supabase = await createClient();
  
  try {
    // For server-side rendering, we'll use direct database queries
    // The client-side will use the optimized analytics API
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const { data, error } = await supabase
      .from('Finanzen')
      .select('betrag, ist_einnahmen, datum')
      .gte('datum', startDate)
      .lte('datum', endDate);
      
    if (error) {
      console.error('Error fetching summary data:', error);
      return null;
    }

    // Calculate summary using the utility function
    const { calculateFinancialSummary } = await import("@/utils/financeCalculations");
    return calculateFinancialSummary(data || [], year, new Date());
  } catch (error) {
    console.error('Error in getSummaryData:', error);
    return null;
  }
}

async function getAvailableYears() {
  const supabase = await createClient();
  
  try {
    // Try to use the optimized database function
    const { data, error } = await supabase.rpc('get_available_finance_years');
    
    if (!error && data) {
      return data.map((item: any) => item.year).sort((a: number, b: number) => b - a);
    }
  } catch (error) {
    console.log('RPC function not available for years, using fallback');
  }

  // Fallback to regular query
  const { data, error } = await supabase
    .from('Finanzen')
    .select('datum')
    .not('datum', 'is', null);

  if (error) {
    console.error('Error fetching available years:', error);
    return [new Date().getFullYear()]; // Return current year as fallback
  }

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
      console.warn('Invalid date format:', item.datum);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

export default async function FinanzenPage() {
  const supabase = await createClient();
  
  // Wohnungen laden
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];
  
  // Initial Finanzen laden (nur die erste Seite für die Transaktionsliste)
  const { data: finanzenData } = await supabase
    .from('Finanzen')
    .select('*, Wohnungen(name)')
    .order('datum', { ascending: false })
    .range(0, PAGINATION.DEFAULT_PAGE_SIZE - 1);
  const finances = finanzenData ?? [];

  // Summary-Daten für das aktuelle Jahr laden
  const currentYear = new Date().getFullYear();
  const summaryData = await getSummaryData(currentYear);
  
  // Available years laden
  const availableYears = await getAvailableYears();

  return <FinanzenClientWrapper 
    finances={finances} 
    wohnungen={wohnungen} 
    summaryData={summaryData}
    initialAvailableYears={availableYears}
  />;
}
