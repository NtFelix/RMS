export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

import { calculateFinancialSummary } from "@/utils/financeCalculations";
import { PAGINATION } from "@/constants";

async function getSummaryData(year: number) {
  const supabase = await createClient();
  
  // Calculate date range for the specified year
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  let allTransactions: any[] = [];
  let page = 0;
  const pageSize = 1000; // Process 1000 records at a time
  let hasMore = true;
  
  try {
    // Fetch all financial data for the specified year with pagination
    while (hasMore) {
      const from = page * pageSize;
      const to = (page + 1) * pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('Finanzen')
        .select('id, betrag, ist_einnahmen, datum', { count: 'exact' })
        .gte('datum', startDate)
        .lte('datum', endDate)
        .order('datum', { ascending: false })
        .range(from, to);
        
      if (error) {
        console.error('Error fetching summary data:', error);
        return null;
      }
      
      if (data && data.length > 0) {
        allTransactions = [...allTransactions, ...data];
        page++;
        
        // If we got fewer records than the page size, we've reached the end
        if (!data || data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Map the data to match the Finanzen type expected by calculateFinancialSummary
    const transactions = allTransactions.map(item => ({
      id: item.id,
      betrag: item.betrag,
      ist_einnahmen: item.ist_einnahmen,
      datum: item.datum
    }));
    
    // Use the shared utility function to calculate the summary
    return calculateFinancialSummary(transactions, year, new Date());
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
