// Remove "use client" from here as this file will be a Server Component

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { fetchHaeuser as fetchHaeuserServer } from "../../../lib/data-fetching";
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
    tenantsResult,
    financesResult
  ] = await Promise.all([
    fetchNebenkostenListOptimized(),
    fetchHaeuserServer(supabase),
    supabase.from('Mieter').select('id, wohnung_id, nebenkosten, einzug, auszug'),
    supabase
      .from('Finanzen')
      .select('id, betrag, ist_einnahmen, tags, datum, wohnung_id')
      .eq('ist_einnahmen', true)
      .gte('datum', `${new Date().getFullYear() - 5}-01-01`)
      .or('tags.cs.{"Nebenkosten"},tags.cs.{"Vorauszahlung"}')
  ]);

  const nebenkostenData: OptimizedNebenkosten[] = nebenkostenResult.success ? nebenkostenResult.data || [] : [];
  const tenants = tenantsResult.data || [];
  const finances = financesResult.data || [];

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
      ownerName={ownerName}
    />
  );
}
