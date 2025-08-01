export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function FinanzenPage() {
  const supabase = await createClient();
  // Wohnungen laden (needed for filters and modals)
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];

  // Finances will now be fetched on the client side
  return <FinanzenClientWrapper initialWohnungen={wohnungen} />;
}
