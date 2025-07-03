export const runtime = 'edge';
import { fetchNebenkostenList, fetchHaeuser, fetchUserProfile } from "../../../lib/data-fetching";
import BetriebskostenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export default async function BetriebskostenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  const nebenkostenData = await fetchNebenkostenList();
  const haeuserData = await fetchHaeuser();
  // const userProfile = userId ? await fetchUserProfile() : null; // User profile from 'profiles' table might not be needed if display name is from auth.users

  let ownerName = "Vermieter Name"; // Default fallback
  if (user) {
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    let constructedName = "";

    if (firstName && lastName) {
      constructedName = `${firstName} ${lastName}`;
    } else if (firstName) {
      constructedName = firstName;
    } else if (lastName) {
      constructedName = lastName;
    }

    ownerName = constructedName || user.email || "Vermieter Name";
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Betriebskosten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Betriebskosten und Abrechnungen</p>
        </div>
      </div>
      <BetriebskostenClientWrapper 
        initialNebenkosten={nebenkostenData} 
        initialHaeuser={haeuserData} 
        userId={userId}
        ownerName={ownerName}
      />
    </div>
  )
}
