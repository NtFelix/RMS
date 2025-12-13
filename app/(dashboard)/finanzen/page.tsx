export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createSupabaseServerClient } from "@/lib/supabase-server";


import { PAGINATION } from "@/constants";

async function getSummaryData(year: number) {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Use the optimized Supabase function that handles pagination internally
    const { data, error } = await supabase.rpc('get_financial_year_summary', {
      target_year: year
    });
    
    if (error) {
      console.error('Error fetching summary data with RPC:', error);
      // Fallback to the function that returns raw data for client-side calculation
      return await getSummaryDataFallback(year);
    }

    if (!data || data.length === 0) {
      // Return empty summary for the year
      const { calculateFinancialSummary } = await import("@/utils/financeCalculations");
      return calculateFinancialSummary([], year, new Date());
    }

    const { processRpcFinancialSummary } = await import("@/utils/financeCalculations");
    return processRpcFinancialSummary(data[0], year);
  } catch (error) {
    console.error('Error in getSummaryData:', error);
    return await getSummaryDataFallback(year);
  }
}

async function getSummaryDataFallback(year: number) {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Fallback: Use the function that returns all transactions for the year
    const { data, error } = await supabase.rpc('get_financial_summary_data', {
      target_year: year
    });
    
    if (error) {
      console.error('Error fetching summary data with fallback RPC:', error);
      return null;
    }

    // Calculate summary using the utility function
    const { calculateFinancialSummary } = await import("@/utils/financeCalculations");
    return calculateFinancialSummary(data || [], year, new Date());
  } catch (error) {
    console.error('Error in getSummaryDataFallback:', error);
    return null;
  }
}

async function getAvailableYears() {
  const supabase = await createSupabaseServerClient();
  const { fetchAvailableFinanceYears } = await import("@/utils/financeCalculations");
  return await fetchAvailableFinanceYears(supabase);
}

export default async function FinanzenPage() {
  const supabase = await createSupabaseServerClient();
  
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
