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

  return <FinanzenClientWrapper finances={finances} wohnungen={wohnungen} summaryData={summaryData} />;
}
