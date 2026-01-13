"use client"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DashboardTenantContextMenu } from "@/components/dashboard/dashboard-tenant-context-menu"
import { formatNumber } from "@/utils/format"
import { PAYMENT_TAGS } from "@/utils/constants"

type TenantDataItem = {
  id: string
  apartment: string
  tenant: string
  size: string
  rent: string
  pricePerSqm: string
  status: 'Miete bezahlt' | 'Miete unbezahlt'
  tenantId: string
  apartmentId: string
  mieteRaw: number
}

export function TenantDataTable() {
  const [tenantData, setTenantData] = useState<TenantDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editTenantId, setEditTenantId] = useState<string | null>(null)
  const [editApartmentId, setEditApartmentId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

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
      .or(`auszug.is.null,auszug.gt.${new Date().toISOString()}`)

    if (mieterError) {
      console.error("Fehler beim Abrufen der Mieter:", mieterError)
      setLoading(false)
      return
    }

    // Finanzdaten für Mietstatus abrufen
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    const { data: finanzData, error: finanzError } = await supabase
      .from("Finanzen")
      .select('*')
      .eq('ist_einnahmen', true)
      .gte('datum', startOfMonth)
      .lte('datum', endOfMonth)
      .ilike('name', '%Mietzahlung%')

    if (finanzError) {
      console.error("Fehler beim Abrufen der Finanzen:", finanzError)
    }

    // Zuordnung Wohnung -> Mietstatus erstellen
    const mietStatus: Record<string, boolean> = {}
    finanzData?.forEach(finanz => {
      if (finanz.wohnung_id) {
        mietStatus[finanz.wohnung_id] = true
      }
    })

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
          tenantId: mieter.id,
          apartmentId: wohnung.id,
          apartment: wohnung.name || "Keine Wohnung",
          tenant: mieter.name,
          size: groesse > 0 ? `${formatNumber(groesse)} m²` : "-",
          rent: miete > 0 ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(miete) : "-",
          pricePerSqm: pricePerSqm > 0 ? `${formatNumber(pricePerSqm)} €/m²` : "-",
          status: mietStatus[wohnung.id] ? 'Miete bezahlt' : 'Miete unbezahlt',
          mieteRaw: miete
        }
      })

    setTenantData(formattedData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleRentPayment = async (tenant: TenantDataItem) => {
    try {
      setUpdatingStatus(tenant.id)
      const supabase = createClient()

      if (tenant.status === 'Miete bezahlt') {
        // Lösche Mietzahlung aus Finanzen für den aktuellen Monat
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
        const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

        const { error } = await supabase
          .from('Finanzen')
          .delete()
          .eq('wohnung_id', tenant.apartmentId)
          .eq('ist_einnahmen', true)
          .ilike('name', '%Mietzahlung%')
          .gte('datum', startOfMonth)
          .lte('datum', endOfMonth)

        if (error) throw error

        toast({
          title: "Mietstatus aktualisiert",
          description: `Mietzahlung für ${tenant.apartment} als unbezahlt markiert.`
        })
      } else {
        // Füge Mietzahlung zu Finanzen hinzu
        const currentDate = new Date().toISOString().split('T')[0]

        const { error } = await supabase
          .from('Finanzen')
          .insert({
            wohnung_id: tenant.apartmentId,
            name: `Mietzahlung ${tenant.apartment}`,
            datum: currentDate,
            betrag: tenant.mieteRaw,
            ist_einnahmen: true,
            notiz: `Mietzahlung von ${tenant.tenant}`,
            tags: [PAYMENT_TAGS.RENT]
          })

        if (error) throw error

        toast({
          title: "Mietstatus aktualisiert",
          description: `Mietzahlung für ${tenant.apartment} als bezahlt markiert.`
        })
      }

      // Daten neu laden
      await fetchData()
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Mietstatus:", error)
      toast({
        title: "Fehler",
        description: "Der Mietstatus konnte nicht aktualisiert werden.",
        variant: "destructive"
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const openTenantModal = (id: string) => {
    setEditTenantId(id)
  }

  const openApartmentModal = (id: string) => {
    setEditApartmentId(id)
  }

  return (
    <Card>
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
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Wohnung</TableHead>
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
                    <DashboardTenantContextMenu
                      key={tenant.id}
                      tenantData={tenant}
                      openTenantModal={openTenantModal}
                      openApartmentModal={openApartmentModal}
                    >
                      <TableRow className="hover:bg-gray-50 cursor-pointer">
                        <TableCell className="font-medium">{tenant.apartment}</TableCell>
                        <TableCell>{tenant.tenant}</TableCell>
                        <TableCell>{tenant.size}</TableCell>
                        <TableCell>{tenant.rent}</TableCell>
                        <TableCell>{tenant.pricePerSqm}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className={tenant.status === 'Miete bezahlt' ?
                              'bg-green-50 text-green-700 hover:bg-green-100' :
                              'bg-red-50 text-red-700 hover:bg-red-100'}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRentPayment(tenant)
                            }}
                            disabled={updatingStatus === tenant.id}
                          >
                            {updatingStatus === tenant.id ? (
                              <span className="animate-pulse">Aktualisiere...</span>
                            ) : (
                              <>
                                {tenant.status === 'Miete bezahlt' ? (
                                  <><Check className="mr-1 h-4 w-4" /> Miete bezahlt</>
                                ) : (
                                  <><X className="mr-1 h-4 w-4" /> Miete unbezahlt</>
                                )}
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    </DashboardTenantContextMenu>
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

      {/* Removed unused edit modals due to updated server-side handling */}
    </Card>
  )
}
