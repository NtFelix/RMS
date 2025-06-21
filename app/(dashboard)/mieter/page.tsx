export const runtime = 'edge';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TenantFilters } from "@/components/tenant-filters"
import { TenantTable } from "@/components/tenant-table"
import { TenantDialogWrapper } from "@/components/tenant-dialog-wrapper"
import TenantClientWrapper from "./client-wrapper"
// createClient and revalidatePath are no longer needed here as handleSubmit is imported
import { handleSubmit } from "../../../app/mieter-actions" // Adjusted import path

interface Mieter {
  id: string
  wohnung_id?: string
  name: string
  einzug?: string
  auszug?: string
  email?: string
  telefonnummer?: string
  notiz?: string
  nebenkosten?: number[]
  nebenkosten_datum?: string[]
}

interface Wohnung {
  id: string
  name: string
}

// Original handleSubmit function is now removed from here and imported from mieter-actions.ts

export default async function MieterPage() {
  // Lade Daten serverseitig
  // createClient is still needed for fetching initial page data
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient(); // Added await here
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen: Wohnung[] = wohnungenData ?? [];
  const { data: mieterData } = await supabase.from('Mieter').select('*');
  const mieter: Mieter[] = mieterData ?? [];

  // SSR-optimiertes Dialog-Handling
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
      </div>

      <TenantClientWrapper tenants={mieter} wohnungen={wohnungen} serverAction={handleSubmit} />
    </div>
  );
}
