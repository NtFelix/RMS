// Remove "use client" from here as this file will be a Server Component

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { fetchNebenkostenList, fetchHaeuser as fetchHaeuserServer } from "../../../lib/data-fetching";
import { createClient } from "@/utils/supabase/server";
import BetriebskostenClientView from "./client-wrapper"; // Import the default export
// Types are still needed for data fetching
import { Nebenkosten, Haus } from "../../../lib/data-fetching";
// Server actions are fine to be imported by Server Components if needed, but not directly by client-wrapper

export default async function BetriebskostenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  const nebenkostenData: Nebenkosten[] = await fetchNebenkostenList();
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
      userId={userId} // Pass userId, not serverUserId
      ownerName={ownerName}    // Pass ownerName, not serverOwnerName
    />
  );
}
