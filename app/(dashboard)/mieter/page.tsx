// "use client" directive removed - this is now a Server Component file.

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { handleSubmit as mieterServerAction } from "../../../app/mieter-actions";
import MieterClientView from "./client-wrapper"; // Import the default export

// Define Tenant and Wohnung types for data fetching and prop passing.
// These should ideally be centralized if used in multiple places.
interface Tenant {
  id: string;
  wohnung_id?: string;
  name: string;
  einzug?: string;
  auszug?: string;
  email?: string;
  telefonnummer?: string;
  notiz?: string;
  nebenkosten?: number[];
}

interface Wohnung {
  id: string;
  name: string;
}

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
