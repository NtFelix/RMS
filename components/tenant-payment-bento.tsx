"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"

type TenantBentoItem = {
  id: string
  tenant: string
  apartment: string
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
            name
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
          const wohnung = mieter.Wohnungen as { id: string; name: string }
          return {
            id: mieter.id,
            tenant: mieter.name,
            apartment: wohnung.name,
            paid: paidWohnungen.has(wohnung.id),
          }
        })

      setData(formatted)
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mietzahlungen</CardTitle>
        <CardDescription>Bezahlt vs. offen</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(120px,1fr)]">
            {data.length > 0 ? (
              data.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex flex-col justify-between p-4 rounded-lg shadow-md bg-white border"
                >
                  <div>
                    <div className="font-semibold">{tenant.tenant}</div>
                    <div className="text-sm text-muted-foreground">{tenant.apartment}</div>
                  </div>
                  <div className="mt-4">
                    {tenant.paid ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        Bezahlt
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        Offen
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-6">Keine aktiven Mieter gefunden.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}