"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"

type TenantDataItem = {
  id: string
  apartment: string
  tenant: string
  size: string
  rent: string
  pricePerSqm: string
  status: string
}

export function TenantDataTable() {
  const [tenantData, setTenantData] = useState<TenantDataItem[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()
      
      // Mieter und verknüpfte Wohnungen abrufen
      const { data: mieterData, error: mieterError } = await supabase
        .from("Mieter")
        .select(`
          id,
          name,
          einzug,
          auszug,
          Wohnungen:wohnung_id (
            id,
            name,
            groesse,
            miete
          )
        `)
        .is('auszug', null) // Nur aktive Mietverhältnisse
      
      if (mieterError) {
        console.error("Fehler beim Abrufen der Mieter:", mieterError)
        setLoading(false)
        return
      }
      
      // Daten für die Tabelle aufbereiten
      const formattedData: TenantDataItem[] = mieterData
        .filter(mieter => mieter.Wohnungen) // Nur Mieter mit Wohnungen
        .map(mieter => {
          // Wohnungen ist ein Objekt, nicht ein Array bei Foreign Key Joins
          const wohnung = mieter.Wohnungen as unknown as {
            id: string;
            name: string;
            groesse: number;
            miete: number;
          };
          
          const groesse = Number(wohnung.groesse) || 0
          const miete = Number(wohnung.miete) || 0
          const pricePerSqm = groesse > 0 ? miete / groesse : 0
          
          return {
            id: mieter.id,
            apartment: wohnung.name || "Keine Wohnung",
            tenant: mieter.name,
            size: groesse > 0 ? `${groesse.toFixed(2)} m²` : "-",
            rent: miete > 0 ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(miete) : "-",
            pricePerSqm: pricePerSqm > 0 ? `${pricePerSqm.toFixed(2)} €/m²` : "-",
            status: "Miete bezahlt", // Standard-Status (könnte später durch tatsächliche Zahlungsdaten ersetzt werden)
          }
        })
      
      setTenantData(formattedData)
      setLoading(false)
    }
    
    fetchData()
  }, [])
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Mieterübersicht</CardTitle>
        <CardDescription>Aktuelle Mietverhältnisse und Wohnungsdaten</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wohnung</TableHead>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Größe</TableHead>
                  <TableHead>Miete</TableHead>
                  <TableHead>Preis pro m²</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantData.length > 0 ? (
                  tenantData.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.apartment}</TableCell>
                      <TableCell>{tenant.tenant}</TableCell>
                      <TableCell>{tenant.size}</TableCell>
                      <TableCell>{tenant.rent}</TableCell>
                      <TableCell>{tenant.pricePerSqm}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                          {tenant.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Keine Mietdaten verfügbar</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
