"use client"

import { useCallback, useEffect, useState } from "react"
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

type MieterData = {
  id: string
  name: string
  einzug: string | null
  auszug: string | null
  Wohnungen: {
    id: string
    name: string
    miete: number
  }
}

export function TenantPaymentBento() {
  const [data, setData] = useState<TenantBentoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Helper function to get current month date range
  const getCurrentMonthRange = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    return {
      start: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
      end: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
    }
  }

  // Fetch payment status for the current month
  const fetchPaymentStatus = async (): Promise<Set<string>> => {
    const { start, end } = getCurrentMonthRange()
    const supabase = createClient()

    const { data: finanzData } = await supabase
      .from("Finanzen")
      .select('wohnung_id')
      .eq('ist_einnahmen', true)
      .gte('datum', start)
      .lte('datum', end)
      .ilike('name', '%Mietzahlung%')

    const paidWohnungen = new Set<string>()
    finanzData?.forEach(finanz => {
      if (finanz.wohnung_id) {
        paidWohnungen.add(finanz.wohnung_id)
      }
    })

    return paidWohnungen
  }

  // Format tenant data with payment status
  const formatTenantData = (mieterData: MieterData[], paidWohnungen: Set<string>): TenantBentoItem[] => {
    return (mieterData || [])
      .filter(mieter => mieter.Wohnungen)
      .map(mieter => ({
        id: mieter.id,
        tenant: mieter.name,
        apartment: mieter.Wohnungen.name,
        apartmentId: mieter.Wohnungen.id,
        mieteRaw: Number(mieter.Wohnungen.miete) || 0,
        paid: paidWohnungen.has(mieter.Wohnungen.id),
      }))
  }

  // Main data fetching function
  const fetchData = useCallback(async () => {
    try {
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

      if (mieterError) throw mieterError

      const paidWohnungen = await fetchPaymentStatus()
      const formattedData = formatTenantData(mieterData as unknown as MieterData[], paidWohnungen)
      setData(formattedData)
    } catch (error) {
      console.error("Fehler beim Laden der Mietdaten:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Toggle payment status for a tenant
  const toggleRentPayment = async (tenant: TenantBentoItem) => {
    try {
      setUpdatingStatus(tenant.id)
      const supabase = createClient()
      const { start, end } = getCurrentMonthRange()

      if (tenant.paid) {
        // Remove payment record
        await supabase
          .from('Finanzen')
          .delete()
          .eq('wohnung_id', tenant.apartmentId)
          .eq('ist_einnahmen', true)
          .ilike('name', '%Mietzahlung%')
          .gte('datum', start)
          .lte('datum', end)
      } else {
        // Add payment record
        await supabase
          .from('Finanzen')
          .insert({
            wohnung_id: tenant.apartmentId,
            name: `Mietzahlung ${tenant.apartment}`,
            datum: new Date().toISOString().split('T')[0],
            betrag: tenant.mieteRaw,
            ist_einnahmen: true,
            notiz: `Mietzahlung von ${tenant.tenant}`
          })
      }

      // Optimistically update the UI
      setData(prevData => 
        prevData.map(item => 
          item.id === tenant.id 
            ? { ...item, paid: !tenant.paid } 
            : item
        )
      )

    } catch (error) {
      console.error("Fehler beim Aktualisieren des Mietstatus:", error)
      // Revert optimistic update on error
      fetchData()
    } finally {
      setUpdatingStatus(null)
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden rounded-xl shadow-md">
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
                  className={`w-full flex items-center justify-between p-4 rounded-lg shadow-md bg-white border transition-colors duration-200 ${
                    tenant.paid
                      ? 'border-green-200 hover:bg-green-50/50'
                      : 'border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  {/* Left side: Tenant name and apartment */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{tenant.tenant}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Home className="h-3.5 w-3.5" />
                      <span>{tenant.apartment}</span>
                    </div>
                  </div>
                  
                  {/* Right side: Price and payment button */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1 font-medium ${
                      tenant.paid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <Tag className="h-3 w-3" />
                      <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.mieteRaw)}</span>
                    </div>
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