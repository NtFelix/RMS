export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function FinanzenPage() {
  const supabase = await createClient();
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];

  // Initial data fetch is now handled in the client wrapper
  return <FinanzenClientWrapper initialFinances={[]} initialTotals={{ income: 0, expenses: 0, balance: 0 }} initialCount={0} wohnungen={wohnungen} />;
}
