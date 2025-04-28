import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TenantFilters } from "@/components/tenant-filters"
import { TenantTable } from "@/components/tenant-table"
import { TenantDialogWrapper } from "@/components/tenant-dialog-wrapper"
import TenantClientWrapper from "./client-wrapper"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

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

async function handleSubmit(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const payload: any = {
    wohnung_id: formData.get('wohnung_id') || null,
    name: formData.get('name'),
    einzug: formData.get('einzug') || null,
    auszug: formData.get('auszug') || null,
    email: formData.get('email') || null,
    telefonnummer: formData.get('telefonnummer') || null,
    notiz: formData.get('notiz') || null,
    nebenkosten: formData.get('nebenkosten') ? String(formData.get('nebenkosten')).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : null,
    nebenkosten_datum: formData.get('nebenkosten_datum') ? String(formData.get('nebenkosten_datum')).split(',').map(s => s.trim()).filter(Boolean) : null
  };
  const id = formData.get('id');
  if (id) {
    await supabase.from('Mieter').update(payload).eq('id', id as string);
  } else {
    await supabase.from('Mieter').insert(payload);
  }
  revalidatePath('/mieter');
}

export default async function MieterPage() {
  // Lade Daten serverseitig
  const supabase = await createClient();
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
