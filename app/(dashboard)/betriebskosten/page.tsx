export const runtime = 'edge';
import { fetchNebenkostenList, fetchHaeuser } from "../../../lib/data-fetching";
import BetriebskostenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export default async function BetriebskostenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const nebenkostenData = await fetchNebenkostenList();
  const haeuserData = await fetchHaeuser();

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
        userId={user?.id}
      />
    </div>
  )
}
