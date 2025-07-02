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
  const userProfile = userId ? await fetchUserProfile() : null;

  // Use a more specific field for owner name if available, e.g., userProfile.full_name
  // For now, using email as a placeholder if a more suitable field isn't present
  // Also, providing a default fallback if userProfile or email is null.
  const ownerName = userProfile?.email || "Vermieter Name";

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
