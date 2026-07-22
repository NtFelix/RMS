export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import Loading from "./loading";
import FinanzenClientWrapper from "./client-wrapper";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { fetchWithRpcFallback } from "@/lib/data-fetching";
import { calculateFinancialSummary, processRpcFinancialSummary, fetchAvailableFinanceYears } from "@/utils/financeCalculations";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";


import { PAGINATION } from "@/constants";
import { getAccessibleWohnungIds } from "@/lib/object-scope";

async function getSummaryData(supabase: SupabaseClient, year: number, accessibleWohnungIds: string[] | null) {
  if (accessibleWohnungIds !== null) {
    // Restricted employee: bypass RPC and query Finanzen directly with scoping.
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const { data: rawFinances, error } = await supabase
      .from('Finanzen')
      .select('*')
      .in('wohnung_id', accessibleWohnungIds)
      .gte('datum', yearStart)
      .lte('datum', yearEnd);

    if (error) {
      console.error('Error fetching scoped finance data for summary:', error);
      return calculateFinancialSummary([], year, new Date());
    }

    return calculateFinancialSummary(rawFinances || [], year, new Date());
  }

  const data = await fetchWithRpcFallback<unknown>(
    supabase,
    'get_financial_year_summary',
    { target_year: year },
    async () => {
      const { data, error } = await supabase.rpc('get_financial_summary_data', {
        target_year: year
      });

      if (error) {
        throw error;
      }

      return data || [];
    },
    'finanzen_year_summary'
  );

  if (!data) {
    console.warn(`[finanzen] Both RPC and fallback returned no data for year ${year}. Rendering empty summary.`);
    return calculateFinancialSummary([], year, new Date());
  }

  if (Array.isArray(data)) {
    const isProcessedSummary = data.length > 0 && 'total_income' in data[0];
    if (isProcessedSummary) {
      return processRpcFinancialSummary(data[0], year);
    }
    return calculateFinancialSummary(data, year, new Date());
  }

  return processRpcFinancialSummary(data, year);
}

async function getAvailableYears(supabase: SupabaseClient) {
  return fetchAvailableFinanceYears(supabase);
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
  // availableYears is sorted in descending order
  const fallbackYear = availableYears.find(year => year < currentYear);

  return fallbackYear ?? currentYear;
}

export default async function FinanzenPage() {
  const { supabase } = await requireAuthenticatedUser();

  const currentYear = new Date().getFullYear();

  // Permission check.
  const [canView, canCreate, canEdit, canDelete, accessibleWohnungIds] = await Promise.all([
    hasPermission('finanzen', 'ansehen'),
    hasPermission('finanzen', 'erstellen'),
    hasPermission('finanzen', 'bearbeiten'),
    hasPermission('finanzen', 'loeschen'),
    getAccessibleWohnungIds(),
  ]);
  if (!canView) {
    redirect('/unauthorized');
  }

  // Load all initial data in parallel
  const fetchWohnungen = () => {
    let q = supabase.from('Wohnungen').select('id,name,miete');
    if (accessibleWohnungIds !== null) {
      q = q.in('id', accessibleWohnungIds);
    }
    return q;
  };

  const fetchFinanzen = () => {
    let q = supabase
      .from('Finanzen')
      .select('*, Wohnungen(name)')
      .order('datum', { ascending: false })
      .range(0, PAGINATION.DEFAULT_PAGE_SIZE - 1);
    if (accessibleWohnungIds !== null) {
      q = q.in('wohnung_id', accessibleWohnungIds);
    }
    return q;
  };

  const [
    wohnungenResult,
    finanzenResult,
    availableYears,
    initialSummaryData
  ] = await Promise.all([
    // Wohnungen laden
    fetchWohnungen(),

    // Initial Finanzen laden (nur die erste Seite für die Transaktionsliste)
    fetchFinanzen(),

    // Available years laden (needed for fallback logic)
    getAvailableYears(supabase).catch((error) => {
      console.error('Failed to fetch available years:', error);
      return []; // Fallback to an empty array to prevent page crash.
    }),

    // Summary-Daten für das aktuelle Jahr laden
    getSummaryData(supabase, currentYear, accessibleWohnungIds)
  ]);

  if (wohnungenResult.error) {
    console.error('Error fetching Wohnungen:', wohnungenResult.error.message);
  }
  const wohnungen = wohnungenResult.data ?? [];

  if (finanzenResult.error) {
    console.error('Error fetching Finanzen:', finanzenResult.error.message);
  }
  const finances = finanzenResult.data ?? [];

  let summaryData = initialSummaryData;

  // Determine the best year to display and potentially reload summary for that year
  const initialYear = determineInitialYear(currentYear, availableYears, summaryData);

  // If we're falling back to a previous year, load that year's summary data
  if (initialYear !== currentYear) {
    summaryData = await getSummaryData(supabase, initialYear, accessibleWohnungIds);
  }

  return <Suspense fallback={<Loading />}>
    <FinanzenClientWrapper
      finances={finances}
      wohnungen={wohnungen}
      summaryData={summaryData}
      initialAvailableYears={availableYears}
      initialYear={initialYear}
      isUsingFallbackYear={initialYear !== currentYear}
      currentYear={currentYear}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  </Suspense>;
}
