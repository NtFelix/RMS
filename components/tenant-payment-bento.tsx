"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { Home, User, Tag, Edit, Check, Wrench, AlertCircle } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"

type TenantBentoItem = {
  id: string
  tenant: string
  apartment: string
  apartmentId: string
  mieteRaw: number
  nebenkostenRaw?: number
  paid: boolean
  actualRent?: number
  actualNebenkosten?: number
  missedPayments: {
    rentMonths: number
    nebenkostenMonths: number
    totalAmount: number
  }
  einzug?: string | null
}

type NebenkostenEntry = {
  id?: string
  amount?: string | number
  date?: string | null
}

type MieterData = {
  id: string
  name: string
  einzug: string | null
  auszug: string | null
  nebenkosten?: NebenkostenEntry[] | null
  Wohnungen: {
    id: string
    name: string
    miete: number
  }
}

const getLatestNebenkostenAmount = (entries?: NebenkostenEntry[] | null): number => {
  if (!Array.isArray(entries)) return 0

  const parsedEntries = entries
    .map(entry => {
      const amount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount)
      const dateValue = entry.date ? new Date(entry.date) : null
      return {
        amount: !Number.isNaN(amount) ? amount : 0,
        dateValue,
      }
    })
    .filter(entry => entry.amount > 0)

  if (!parsedEntries.length) return 0

  parsedEntries.sort((a, b) => {
    if (!a.dateValue && !b.dateValue) return 0
    if (!a.dateValue) return 1
    if (!b.dateValue) return -1
    return b.dateValue.getTime() - a.dateValue.getTime()
  })

  return parsedEntries[0]?.amount ?? 0
}

export function TenantPaymentBento() {
  const [data, setData] = useState<TenantBentoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const { openTenantPaymentEditModal } = useModalStore()

  // Helper function to determine if payments differ from normal
  const hasDifferentPayments = (tenant: TenantBentoItem) => {
    const rentDiffers = tenant.actualRent && tenant.actualRent !== tenant.mieteRaw
    const nebenkostenDiffers = tenant.actualNebenkosten && tenant.actualNebenkosten !== (tenant.nebenkostenRaw || 0)
    return rentDiffers || nebenkostenDiffers
  }

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
      .select('wohnung_id, name')
      .eq('ist_einnahmen', true)
      .gte('datum', start)
      .lte('datum', end)
      .or('name.ilike.Mietzahlung%,name.ilike.Nebenkosten%')

    const paidWohnungen = new Set<string>()
    finanzData?.forEach(finanz => {
      if (finanz.wohnung_id) {
        paidWohnungen.add(finanz.wohnung_id)
      }
    })

    return paidWohnungen
  }

  // Format tenant data with payment status
  const formatTenantData = (mieterData: (MieterData & { actualRent?: number; actualNebenkosten?: number; missedPayments?: { rentMonths: number; nebenkostenMonths: number; totalAmount: number } })[], paidWohnungen: Set<string>): TenantBentoItem[] => {
    return mieterData.map(mieter => ({
      id: mieter.id,
      tenant: mieter.name,
      apartment: mieter.Wohnungen.name,
      apartmentId: mieter.Wohnungen.id,
      mieteRaw: Number(mieter.Wohnungen.miete) || 0,
      nebenkostenRaw: getLatestNebenkostenAmount(mieter.nebenkosten),
      paid: paidWohnungen.has(mieter.Wohnungen.id),
      actualRent: mieter.actualRent,
      actualNebenkosten: mieter.actualNebenkosten,
      missedPayments: mieter.missedPayments || { rentMonths: 0, nebenkostenMonths: 0, totalAmount: 0 },
      einzug: mieter.einzug
    }))
  }

  // Get current month's finance payments for a tenant
  const getCurrentMonthFinancePayments = async (apartmentId: string) => {
    const supabase = createClient()
    const { start, end } = getCurrentMonthRange()
    
    const { data, error } = await supabase
      .from('Finanzen')
      .select('name, betrag')
      .eq('wohnung_id', apartmentId)
      .gte('datum', start)
      .lte('datum', end)
      .or('name.ilike.Mietzahlung%,name.ilike.Nebenkosten%')
    
    if (error) throw error
    
    const payments = {
      rent: 0,
      nebenkosten: 0
    }
    
    data?.forEach(payment => {
      if (payment.name?.includes('Mietzahlung')) {
        payments.rent += Number(payment.betrag) || 0
      } else if (payment.name?.includes('Nebenkosten')) {
        payments.nebenkosten += Number(payment.betrag) || 0
      }
    })
    
    return payments
  }

  // Get missed payments history for a tenant
  const getMissedPaymentsHistory = async (apartmentId: string, einzug: string, mieteRaw: number, nebenkostenRaw: number = 0) => {
    const supabase = createClient()
    
    // Get all months from tenant move-in date to current month
    const moveInDate = new Date(einzug)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    
    let missedRentMonths = 0
    let missedNebenkostenMonths = 0
    let totalMissedAmount = 0
    
    // Iterate through each month from move-in to current
    for (let year = moveInDate.getFullYear(); year <= currentYear; year++) {
      const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
      const endMonth = (year === currentYear) ? currentMonth : 11
      
      for (let month = startMonth; month <= endMonth; month++) {
        const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
        const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]
        
        // Check if rent was paid for this month
        const { data: rentPayments } = await supabase
          .from('Finanzen')
          .select('betrag')
          .eq('wohnung_id', apartmentId)
          .eq('ist_einnahmen', true)
          .gte('datum', monthStart)
          .lte('datum', monthEnd)
          .ilike('name', '%Mietzahlung%')
        
        const rentPaid = rentPayments?.reduce((sum, payment) => sum + (payment.betrag || 0), 0) || 0
        
        if (rentPaid < mieteRaw) {
          missedRentMonths++
          totalMissedAmount += (mieteRaw - rentPaid)
        }
        
        // Check if nebenkosten was paid for this month (if applicable)
        if (nebenkostenRaw > 0) {
          const { data: nebenkostenPayments } = await supabase
            .from('Finanzen')
            .select('betrag')
            .eq('wohnung_id', apartmentId)
            .eq('ist_einnahmen', true)
            .gte('datum', monthStart)
            .lte('datum', monthEnd)
            .ilike('name', '%Nebenkosten%')
          
          const nebenkostenPaid = nebenkostenPayments?.reduce((sum, payment) => sum + (payment.betrag || 0), 0) || 0
          
          if (nebenkostenPaid < nebenkostenRaw) {
            missedNebenkostenMonths++
            totalMissedAmount += (nebenkostenRaw - nebenkostenPaid)
          }
        }
      }
    }
    
    return {
      rentMonths: missedRentMonths,
      nebenkostenMonths: missedNebenkostenMonths,
      totalAmount: totalMissedAmount
    }
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
          nebenkosten,
          Wohnungen:wohnung_id (
            id,
            name,
            miete
          )
        `)
        .or(`auszug.is.null,auszug.gt.${new Date().toISOString()}`)

      if (mieterError) throw mieterError

      // Fetch payment status for the current month
      const paidWohnungen = await fetchPaymentStatus()
      
      // Fetch current month finance payments and missed payments history for each tenant
      const tenantsWithPayments = await Promise.all(
        (mieterData as unknown as MieterData[]).map(async (mieter) => {
          const currentPayments = await getCurrentMonthFinancePayments(mieter.Wohnungen.id)
          const mieteRaw = Number(mieter.Wohnungen.miete) || 0
          const nebenkostenRaw = getLatestNebenkostenAmount(mieter.nebenkosten)
          const missedPayments = await getMissedPaymentsHistory(
            mieter.Wohnungen.id, 
            mieter.einzug || new Date().toISOString(), 
            mieteRaw, 
            nebenkostenRaw
          )
          
          return {
            ...mieter,
            actualRent: currentPayments.rent,
            actualNebenkosten: currentPayments.nebenkosten,
            missedPayments
          }
        })
      )
      
      const formattedData = formatTenantData(tenantsWithPayments, paidWohnungen)
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
        // Remove payment records (both rent and nebenkosten)
        await supabase
          .from('Finanzen')
          .delete()
          .eq('wohnung_id', tenant.apartmentId)
          .eq('ist_einnahmen', true)
          .gte('datum', start)
          .lte('datum', end)
          .or('name.ilike.Mietzahlung%,name.ilike.Nebenkosten%')
      } else {
        // Add rent payment record
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

        // Add nebenkosten payment record if nebenkosten exists
        if (tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0) {
          await supabase
            .from('Finanzen')
            .insert({
              wohnung_id: tenant.apartmentId,
              name: `Nebenkosten ${tenant.apartment}`,
              datum: new Date().toISOString().split('T')[0],
              betrag: tenant.nebenkostenRaw,
              ist_einnahmen: true,
              notiz: `Nebenkosten-Vorauszahlung von ${tenant.tenant}`
            })
        }
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
    <Card className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
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
                  className={`w-full flex flex-col p-4 rounded-2xl shadow-md bg-card border transition-colors duration-200 ${
                    !tenant.paid
                      ? 'border-red-200 dark:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/20'
                      : hasDifferentPayments(tenant)
                        ? 'border-orange-200 dark:border-orange-800 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                        : 'border-green-200 dark:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-900/20'
                  }`}
                >
                  {/* Top section: Tenant info and price */}
                  <div className="flex items-start justify-between mb-3">
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
                      
                      {/* Missed payments history */}
                      {(tenant.missedPayments.rentMonths > 0 || tenant.missedPayments.nebenkostenMonths > 0) && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>
                            {tenant.missedPayments.rentMonths + tenant.missedPayments.nebenkostenMonths} Monat{tenant.missedPayments.rentMonths + tenant.missedPayments.nebenkostenMonths !== 1 ? 'e' : ''} ausstehend 
                            ({new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.missedPayments.totalAmount)})
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side: Price tags - aligned with tenant name */}
                    <div className="flex flex-col items-end gap-1">
                      {/* Main rent price */}
                      <div className={`flex items-center gap-1 font-medium ${
                        !tenant.paid ? 'text-red-600 dark:text-red-400' : 
                          hasDifferentPayments(tenant) ? 'text-orange-600 dark:text-orange-400' : 
                          'text-green-600 dark:text-green-400'
                      }`}>
                        <Tag className="h-3 w-3" />
                        {tenant.actualRent && tenant.actualRent !== tenant.mieteRaw ? (
                          <div className="flex items-center gap-1">
                            <span className="line-through text-sm opacity-60">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.mieteRaw)}
                            </span>
                            <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.actualRent)}</span>
                          </div>
                        ) : (
                          <span>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.mieteRaw)}</span>
                        )}
                      </div>
                      
                      {/* Nebenkosten prepayment - smaller */}
                      {tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0 && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          !tenant.paid ? 'text-red-600/70 dark:text-red-400/70' : 
                            hasDifferentPayments(tenant) ? 'text-orange-600/70 dark:text-orange-400/70' : 
                            'text-green-600/70 dark:text-green-400/70'
                        }`}>
                          <Wrench className="h-2.5 w-2.5" />
                          {tenant.actualNebenkosten && tenant.actualNebenkosten !== tenant.nebenkostenRaw ? (
                            <div className="flex items-center gap-1">
                              <span className="line-through opacity-60">
                                NK: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.nebenkostenRaw)}
                              </span>
                              <span>NK: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.actualNebenkosten)}</span>
                            </div>
                          ) : (
                            <span>NK: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.nebenkostenRaw)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom section: Action buttons */}
                  <div className="flex gap-2 mt-auto w-full">
                    {/* Anpassen button (left) */}
                    <button
                      type="button"
                      className="flex-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors duration-150 bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/50 flex items-center justify-center gap-1"
                      disabled={updatingStatus === tenant.id}
                      onClick={() => openTenantPaymentEditModal({
                        id: tenant.id,
                        tenant: tenant.tenant,
                        apartment: tenant.apartment,
                        apartmentId: tenant.apartmentId,
                        mieteRaw: tenant.mieteRaw,
                        nebenkostenRaw: tenant.nebenkostenRaw || 0,
                        einzug: tenant.einzug
                      })}
                    >
                      <Edit className="h-3 w-3" />
                      Anpassen
                    </button>
                    
                    {/* All button (right) */}
                    <button
                      type="button"
                      className={
                        `flex-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors duration-150 flex items-center justify-center gap-1 ${
                          !tenant.paid
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50'
                            : hasDifferentPayments(tenant)
                              ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                              : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50'
                        }`
                      }
                      disabled={updatingStatus === tenant.id}
                      onClick={() => toggleRentPayment(tenant)}
                    >
                      {updatingStatus === tenant.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-current"></div>
                          Aktualisiere...
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" />
                          {tenant.paid ? 'Bezahlt' : 'Unbezahlt'}
                        </>
                      )}
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