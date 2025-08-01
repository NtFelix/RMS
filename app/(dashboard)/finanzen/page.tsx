export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export default async function FinanzenPage() {
  const supabase = await createClient();
  // Wohnungen laden
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];
  // Finanzen laden
  const { data: finanzenData } = await supabase.from('Finanzen').select('*, Wohnungen(name)').order('datum', { ascending: false }).range(0, 24);
  const finances = finanzenData ?? [];

  return <FinanzenClientWrapper finances={finances} wohnungen={wohnungen} />;
}
