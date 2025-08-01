export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

const INITIAL_LIMIT = 25;

async function fetchInitialData(supabase: any) {
  const transactionsQuery = supabase
    .from("Finanzen")
    .select("*, Wohnungen(name)", { count: "exact" })
    .order("datum", { ascending: false })
    .range(0, INITIAL_LIMIT - 1);

  const totalsQuery = supabase.from("Finanzen").select("betrag, ist_einnahmen", { count: "exact" });
  const wohnungenQuery = supabase.from("Wohnungen").select("id, name");

  const [
    { data: transactionsData, error: tError, count: tCount },
    { data: totalsData, error: oError, count: oCount },
    { data: wohnungenData, error: wError },
  ] = await Promise.all([transactionsQuery, totalsQuery, wohnungenQuery]);

  if (tError || oError || wError) {
    console.error("Error fetching initial data:", tError || oError || wError);
    // Return empty/default values on error
    return {
      initialFinances: { data: [], pagination: { offset: 0, limit: INITIAL_LIMIT, total: 0, hasMore: false } },
      initialTotals: { totalBalance: 0, totalIncome: 0, totalExpenses: 0, transactionCount: 0 },
      wohnungen: [],
    };
  }

  const totalTransactions = tCount ?? 0;

  const totalIncome = totalsData
    .filter((t: any) => t.ist_einnahmen)
    .reduce((sum: number, t: any) => sum + t.betrag, 0);
  const totalExpenses = totalsData
    .filter((t: any) => !t.ist_einnahmen)
    .reduce((sum: number, t: any) => sum + t.betrag, 0);

  return {
    initialFinances: {
      data: transactionsData ?? [],
      pagination: {
        offset: 0,
        limit: INITIAL_LIMIT,
        total: totalTransactions,
        hasMore: totalTransactions > INITIAL_LIMIT,
      },
    },
    initialTotals: {
      totalBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      transactionCount: oCount ?? 0,
    },
    wohnungen: wohnungenData ?? [],
  };
}

export default async function FinanzenPage() {
  const supabase = await createClient();
  const { initialFinances, initialTotals, wohnungen } = await fetchInitialData(supabase);

  return (
    <FinanzenClientWrapper
      initialFinances={initialFinances}
      initialTotals={initialTotals}
      wohnungen={wohnungen}
    />
  );
}
