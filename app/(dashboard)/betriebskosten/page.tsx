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
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function BetriebskostenPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  // Permission check.
  const [canView, canCreate, canEdit, canDelete, canViewMeters, accessibleHaeuserResult] = await Promise.all([
    hasPermission('betriebskosten', 'ansehen'),
    hasPermission('betriebskosten', 'erstellen'),
    hasPermission('betriebskosten', 'bearbeiten'),
    hasPermission('betriebskosten', 'loeschen'),
    hasPermission('zaehler', 'ansehen'),
    supabase.rpc('get_accessible_haeuser_ids'),
  ]);
  const accessibleIds = accessibleHaeuserResult.data;
  if (!canView) {
    redirect('/unauthorized');
  }

  const [
    nebenkostenResult,
    haeuserData,
    tenantsData,
    financesData
  ] = await Promise.all([
    fetchNebenkostenListOptimized(),
    fetchHaeuserServer(supabase),
    fetchWithRpcFallback(
      supabase,
      'get_betriebskosten_mieter_overview',
      {},
      async () => {
        const { data, error } = await supabase.from('Mieter').select('id, wohnung_id, nebenkosten, einzug, auszug');
        if (error) throw error;
        return data;
      },
      'betriebskosten_mieter_overview'
    ),
    fetchWithRpcFallback(
      supabase,
      'get_betriebskosten_finanzen_overview',
      { years_back: 5 },
      async () => {
        const { data, error } = await supabase
          .from('Finanzen')
          .select('id, betrag, ist_einnahmen, tags, datum, wohnung_id')
          .eq('ist_einnahmen', true)
          .gte('datum', `${new Date().getFullYear() - 5}-01-01`)
          .or('tags.cs.{"Nebenkosten"},tags.cs.{"Vorauszahlung"}');
        if (error) throw error;
        return data;
      },
      'betriebskosten_finanzen_overview'
    )
  ]);

  const nebenkostenData: OptimizedNebenkosten[] = nebenkostenResult.success ? nebenkostenResult.data || [] : [];
  const tenants = tenantsData || [];
  const finances = financesData || [];

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
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      canViewMeters={canViewMeters}
    />
  );
}
