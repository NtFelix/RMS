export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

import { Finanzen } from "@/types/supabase";

export default async function FinanzenPage() {
  const supabase = await createClient();
  // Wohnungen laden
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];
  // Finanzen laden
  const { data: finanzenData } = await supabase.from('Finanzen').select('*, Wohnungen(name)');
  const finances: Finanzen[] = finanzenData ?? [];

  return <FinanzenClientWrapper finances={finances} wohnungen={wohnungen} />;
}
