// Remove "use client" from here as this file will be a Server Component

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { fetchHaeuser as fetchHaeuserServer } from "../../../lib/data-fetching";
import { fetchNebenkostenListOptimized } from "@/app/betriebskosten-actions";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BetriebskostenClientView from "./client-wrapper"; // Import the default export
// Types are still needed for data fetching
import { Haus } from "../../../lib/data-fetching";
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten";
// Server actions are fine to be imported by Server Components if needed, but not directly by client-wrapper

export default async function BetriebskostenPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use optimized function that eliminates individual getHausGesamtFlaeche calls
  const nebenkostenResult = await fetchNebenkostenListOptimized();
  const nebenkostenData: OptimizedNebenkosten[] = nebenkostenResult.success ? nebenkostenResult.data || [] : [];
  
  const haeuserData: Haus[] = await fetchHaeuserServer();

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
      ownerName={ownerName}
    />
  );
}
