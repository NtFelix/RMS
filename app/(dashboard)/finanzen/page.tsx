export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";


import { PAGINATION } from "@/constants";

async function getSummaryData(year: number) {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();
  const { fetchAvailableFinanceYears } = await import("@/utils/financeCalculations");
  return await fetchAvailableFinanceYears(supabase);
}

/**
 * Determines the best year to display initially.
 * If the current year has no data, falls back to the most recent year with data.
 * @param currentYear - The current calendar year
 * @param availableYears - Array of years that have financial data (sorted descending)
 * @param summaryData - Summary data for the current year
 * @returns The year that should be displayed initially
 */
function determineInitialYear(
  currentYear: number,
  availableYears: number[],
  summaryData: Awaited<ReturnType<typeof getSummaryData>>
): number {
  // Check if current year has meaningful data
  const hasCurrentYearData = summaryData && (
    summaryData.totalIncome > 0 ||
    summaryData.totalExpenses > 0
  );

  if (hasCurrentYearData) {
    return currentYear;
  }

  // Fallback to the most recent year with data
  // availableYears is sorted in descending order, so find the first year that isn't the current year
  const fallbackYear = availableYears.find(year => year !== currentYear && year < currentYear);

  return fallbackYear ?? currentYear;
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

  // Available years laden (needed for fallback logic)
  const availableYears = await getAvailableYears();

  // Summary-Daten für das aktuelle Jahr laden
  const currentYear = new Date().getFullYear();
  let summaryData = await getSummaryData(currentYear);

  // Determine the best year to display and potentially reload summary for that year
  const initialYear = determineInitialYear(currentYear, availableYears, summaryData);

  // If we're falling back to a previous year, load that year's summary data
  if (initialYear !== currentYear) {
    summaryData = await getSummaryData(initialYear);
  }

  return <FinanzenClientWrapper
    finances={finances}
    wohnungen={wohnungen}
    summaryData={summaryData}
    initialAvailableYears={availableYears}
    initialYear={initialYear}
    isUsingFallbackYear={initialYear !== currentYear}
  />;
}
