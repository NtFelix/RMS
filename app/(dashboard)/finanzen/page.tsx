export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function FinanzenPage() {
  const supabase = await createClient();

  // Fetch initial data for the finance page, paginated to the first 25 entries
  // This logic mirrors the GET API route to ensure consistency

  // 1. Fetch apartments for filter dropdowns
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];

  // 2. Fetch the first page of transactions
  const limit = 25;
  const { data: initialTransactions, error: transactionsError, count } = await supabase
    .from('Finanzen')
    .select('*, Wohnungen(name)', { count: 'exact' })
    .order('datum', { ascending: false })
    .range(0, limit - 1);

  if (transactionsError) {
    console.error("Error fetching initial finances:", transactionsError);
    // Render the wrapper with empty state to handle the error client-side
    return <FinanzenClientWrapper initialFinances={{transactions: [], totalCount: 0, totals: {income: 0, expense: 0, balance: 0}}} wohnungen={wohnungen} />;
  }

  // 3. Fetch all data for initial totals calculation (unfiltered)
  const { data: allFinancesForTotals, error: totalsError } = await supabase
    .from('Finanzen')
    .select('betrag, ist_einnahmen');

  if (totalsError) {
    console.error("Error fetching finances for totals:", totalsError);
    // Render with zeroed totals
    return <FinanzenClientWrapper initialFinances={{transactions: initialTransactions || [], totalCount: count || 0, totals: {income: 0, expense: 0, balance: 0}}} wohnungen={wohnungen} />;
  }

  const initialTotals = allFinancesForTotals.reduce((acc, t) => {
    if (t.ist_einnahmen) {
      acc.income += t.betrag;
    } else {
      acc.expense += t.betrag;
    }
    return acc;
  }, { income: 0, expense: 0 });

  const initialBalance = initialTotals.income - initialTotals.expense;

  const initialFinanceData = {
    transactions: initialTransactions || [],
    totalCount: count || 0,
    totals: { ...initialTotals, balance: initialBalance }
  };

  return <FinanzenClientWrapper initialFinances={initialFinanceData} wohnungen={wohnungen} />;
}
