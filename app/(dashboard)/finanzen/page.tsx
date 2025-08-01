export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function FinanzenPage() {
  const supabase = await createClient();
  // Wohnungen for filter dropdown
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];

  // Finances are now fetched on the client side
  return <FinanzenClientWrapper wohnungen={wohnungen} />;
}
