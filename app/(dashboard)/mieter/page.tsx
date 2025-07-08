// "use client" directive removed - this is now a Server Component file.

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { handleSubmit as mieterServerAction } from "../../../app/mieter-actions";
import MieterClientView from "./client-wrapper"; // Import the default export

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

export default async function MieterPage() {
  const supabase = await createSupabaseServerClient();
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen: Wohnung[] = wohnungenData ?? [];
  const { data: mieterData } = await supabase.from('Mieter').select('*');
  // Ensure mieterData conforms to Tenant[] type, especially if DB schema differs slightly
  const mieter: Tenant[] = mieterData ? mieterData.map(m => ({...m})) : [];


  return (
    <MieterClientView
      initialTenants={mieter}
      initialWohnungen={wohnungen}
      serverAction={mieterServerAction}
    />
  );
}
