"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { Home, User, Tag } from "lucide-react"

type TenantBentoItem = {
  id: string
  tenant: string
  apartment: string
  apartmentId: string
  mieteRaw: number
  paid: boolean
}

export function TenantPaymentBento() {
  const [data, setData] = useState<TenantBentoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch active tenants and their apartments
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
            miete
          )
        `)
        .or(`auszug.is.null,auszug.gt.${new Date().toISOString()}`)

      if (mieterError) {
        setLoading(false)
        return
      }

      // Fetch payment info for current month
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
      const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

      const { data: finanzData } = await supabase
        .from("Finanzen")
        .select('wohnung_id')
        .eq('ist_einnahmen', true)
        .gte('datum', startOfMonth)
        .lte('datum', endOfMonth)
        .ilike('name', '%Mietzahlung%')

      // Build paid lookup set
      const paidWohnungen = new Set<string>()
      finanzData?.forEach(finanz => {
        if (finanz.wohnung_id) {
          paidWohnungen.add(finanz.wohnung_id)
        }
      })

      // Format data for bento grid
      const formatted: TenantBentoItem[] = (mieterData || [])
        .filter(mieter => mieter.Wohnungen)
        .map(mieter => {
          const wohnung = mieter.Wohnungen as unknown as { id: string; name: string; miete: number }
          return {
            id: mieter.id,
            tenant: mieter.name,
            apartment: wohnung.name,
            apartmentId: wohnung.id,
            mieteRaw: Number(wohnung.miete) || 0,
            paid: paidWohnungen.has(wohnung.id),
          }
        })

      setData(formatted)
      setLoading(false)
    }

    fetchData()
  }, [])

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Copy of toggleRentPayment logic from TenantDataTable
  const toggleRentPayment = async (tenant: TenantBentoItem) => {
    try {
      setUpdatingStatus(tenant.id)
      const supabase = createClient()

      if (tenant.paid) {
        // Remove Mietzahlung from Finanzen for current month
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
        const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

        await supabase
          .from('Finanzen')
          .delete()
          .eq('wohnung_id', tenant.apartmentId)
          .eq('ist_einnahmen', true)
          .ilike('name', '%Mietzahlung%')
          .gte('datum', startOfMonth)
          .lte('datum', endOfMonth)
      } else {
        // Add Mietzahlung to Finanzen
        const currentDate = new Date().toISOString().split('T')[0]

        await supabase
          .from('Finanzen')
          .insert({
            wohnung_id: tenant.apartmentId,
            name: `Mietzahlung ${tenant.apartment}`,
            datum: currentDate,
            betrag: tenant.mieteRaw,
            ist_einnahmen: true,
            notiz: `Mietzahlung von ${tenant.tenant}`
          })
      }

      // Refresh data
      setLoading(true)
      const supabase2 = createClient()

      const { data: mieterData, error: mieterError } = await supabase2
        .from("Mieter")
        .select(`
          id,
          name,
          einzug,
          auszug,
          Wohnungen:wohnung_id (
            id,
            name,
            miete
          )
        `)
        .or(`auszug.is.null,auszug.gt.${new Date().toISOString()}`)

      // Fetch payment info for current month again
      const currentDate2 = new Date()
      const currentMonth2 = currentDate2.getMonth() + 1
      const currentYear2 = currentDate2.getFullYear()
      const startOfMonth2 = new Date(currentYear2, currentMonth2 - 1, 1).toISOString().split('T')[0]
      const endOfMonth2 = new Date(currentYear2, currentMonth2, 0).toISOString().split('T')[0]

      const { data: finanzData2 } = await supabase2
        .from("Finanzen")
        .select('wohnung_id')
        .eq('ist_einnahmen', true)
        .gte('datum', startOfMonth2)
        .lte('datum', endOfMonth2)
        .ilike('name', '%Mietzahlung%')

      const paidWohnungen2 = new Set<string>()
      finanzData2?.forEach(finanz => {
        if (finanz.wohnung_id) {
          paidWohnungen2.add(finanz.wohnung_id)
        }
      })

      const formatted2: TenantBentoItem[] = (mieterData || [])
        .filter(mieter => mieter.Wohnungen)
        .map(mieter => {
          const wohnung = mieter.Wohnungen as unknown as { id: string; name: string; miete: number }
          return {
            id: mieter.id,
            tenant: mieter.name,
            apartment: wohnung.name,
            apartmentId: wohnung.id,
            mieteRaw: Number(wohnung.miete) || 0,
            paid: paidWohnungen2.has(wohnung.id),
          }
        })

      setData(formatted2)
    } catch (error) {
      // Optionally notify error
      console.error("Fehler beim Aktualisieren des Mietstatus:", error)
    } finally {
      setUpdatingStatus(null)
      setLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Mietzahlungen</CardTitle>
        <CardDescription>Bezahlt vs. offen</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.length > 0 ? (
              data.map((tenant) => (
                <div
                  key={tenant.id}
                  className="w-full flex flex-col justify-between p-4 rounded-lg shadow-md bg-white border"
                >
                  <div>
                    <div className="flex items-center gap-1 font-semibold">
                      <User className="h-3.5 w-3.5" />
                      <span>{tenant.tenant}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Home className="h-3.5 w-3.5" />
                      <span className="mr-2">{tenant.apartment}</span>
                      <span className={`flex items-center gap-1 ${tenant.paid ? 'text-green-600' : 'text-red-600'}`}>
                        <Tag className="h-3 w-3" />
                        <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.mieteRaw)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className={
                        `px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150 ${
                          tenant.paid
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`
                      }
                      disabled={updatingStatus === tenant.id}
                      onClick={() => toggleRentPayment(tenant)}
                    >
                      {updatingStatus === tenant.id
                        ? 'Aktualisiere...'
                        : tenant.paid
                        ? 'Miete bezahlt'
                        : 'Miete unbezahlt'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-6">Keine aktiven Mieter gefunden.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}