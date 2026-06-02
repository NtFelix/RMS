// Remove "use client" from here as this file will be a Server Component

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { fetchHaeuser as fetchHaeuserServer, fetchWithRpcFallback } from "../../../lib/data-fetching";
import { fetchNebenkostenListOptimized } from "@/app/betriebskosten-actions";
import { requireAuthenticatedUser } from "@/lib/server/route-access";
import BetriebskostenClientView from "./client-wrapper"; // Import the default export
// Types are still needed for data fetching
import { Haus } from "../../../lib/data-fetching";
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten";
// Server actions are fine to be imported by Server Components if needed, but not directly by client-wrapper

export default async function BetriebskostenPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  
  // Fetch all necessary data in parallel
  const [
    nebenkostenResult,
    haeuserData,
    tenantsData,
    financesData,
    wohnungenData
  ] = await Promise.all([
    fetchNebenkostenListOptimized(supabase),
    fetchHaeuserServer(supabase),
    fetchWithRpcFallback(
      supabase,
      'get_betriebskosten_mieter_overview',
      {},
      async (client) => {
        const { data, error } = await client.from('Mieter').select('id, wohnung_id, nebenkosten, einzug, auszug');
        if (error) throw error;
        return data;
      },
      'betriebskosten_mieter_overview'
    ),
    fetchWithRpcFallback(
      supabase,
      'get_betriebskosten_finanzen_overview',
      { years_back: 5 },
      async (client) => {
        const { data, error } = await client
          .from('Finanzen')
          .select('id, betrag, ist_einnahmen, tags, datum, wohnung_id')
          .eq('ist_einnahmen', true)
          .gte('datum', `${new Date().getFullYear() - 5}-01-01`)
          .or('tags.cs.{"Nebenkosten"},tags.cs.{"Vorauszahlung"}');
        if (error) throw error;
        return data;
      },
      'betriebskosten_finanzen_overview'
    ),
    supabase.from('Wohnungen').select('id, haus_id, groesse').then(r => r.data || [])
  ]);

  const nebenkostenData: OptimizedNebenkosten[] = nebenkostenResult.success ? nebenkostenResult.data || [] : [];
  const tenants = tenantsData || [];
  const finances = financesData || [];
  const wohnungen = wohnungenData || [];

  let ownerName = "Vermieter Name";
  if (user) {
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    let constructedName = "";
    if (firstName && lastName) constructedName = `${firstName} ${lastName}`;
    else if (firstName) constructedName = firstName;
    else if (lastName) constructedName = lastName;
    ownerName = constructedName || user.email || "Vermieter Name";
  }

  return (
    <BetriebskostenClientView
      initialNebenkosten={nebenkostenData}
      initialHaeuser={haeuserData}
      initialTenants={tenants}
      initialFinances={finances}
      initialWohnungen={wohnungen}
      ownerName={ownerName}
    />
  );
}
