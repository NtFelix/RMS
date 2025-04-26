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
}

// Serverseitige Datenabruffunktion
async function fetchWohnungen() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('Wohnungen').select('*')
  
  if (error) {
    console.error('Fehler beim Laden der Wohnungen:', error)
    return []
  }
  
  return data || []
}

// Serverseitige Funktion zum Abrufen der Häuser
async function fetchHouses() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('Haeuser').select('id,name')
  
  if (error) {
    console.error('Fehler beim Laden der Häuser:', error)
    return []
  }
  
  return data || []
}

export default async function WohnungenPage() {
  // Serverseitiges Datenfetching mit async/await
  const wohnungen = await fetchWohnungen()
  const houses = await fetchHouses()

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
          <WohnungenClient initialWohnungen={wohnungen} houses={houses} />
        </CardContent>
      </Card>
    </div>
  )
}
