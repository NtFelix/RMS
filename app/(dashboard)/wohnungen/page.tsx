export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { WohnungenClient } from "./client"

// Define Wohnung type
export interface Wohnung {
  id: string
  name: string
  groesse: number | string
  miete: number | string
  haus_id?: string
  status?: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug: string
    auszug: string
  }
  Haeuser: {
    name: string
  }
}

export default async function WohnungenPage() {
  const supabase = await createClient()
  // Wohnungen mit Haeuser-Daten laden
  const { data: apartments, error: apartmentsError } = await supabase
    .from('Wohnungen')
    .select('id,name,groesse,miete,haus_id,Haeuser(name)')
  if (apartmentsError) {
    console.error('Fehler beim Laden der Wohnungen:', apartmentsError)
    return <div>Fehler beim Laden der Wohnungen</div>
  }
  // Mieter für Status laden
  const { data: tenants, error: tenantsError } = await supabase
    .from('Mieter')
    .select('id,wohnung_id,einzug,auszug,name')
  if (tenantsError) {
    console.error('Fehler beim Laden der Mieter:', tenantsError)
  }
  // Wohnungen anreichern mit Status und Tenant
  const today = new Date()
  const enrichedWohnungen = apartments.map((apt) => {
    const tenant = tenants?.find((t) => t.wohnung_id === apt.id)
    let status: 'frei' | 'vermietet' = 'frei'
    if (tenant && (!tenant.auszug || new Date(tenant.auszug) > today)) {
      status = 'vermietet'
    }
    return {
      ...apt,
      Haeuser: Array.isArray(apt.Haeuser) ? apt.Haeuser[0] : apt.Haeuser,
      status,
      tenant: tenant
        ? { id: tenant.id, name: tenant.name, einzug: tenant.einzug as string, auszug: tenant.auszug as string }
        : null,
    }
  })
  // Häuser für Dropdown laden
  const { data: housesData, error: housesError } = await supabase
    .from('Haeuser')
    .select('id,name')
  if (housesError) {
    console.error('Fehler beim Laden der Häuser:', housesError)
  }
  const houses = housesData || []

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wohnungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Wohnungen und Apartments</p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Wohnungsverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Wohnungen verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Client Component für interaktive UI-Elemente */}
          <WohnungenClient initialWohnungen={enrichedWohnungen} houses={houses} />
        </CardContent>
      </Card>
    </div>
  )
}
