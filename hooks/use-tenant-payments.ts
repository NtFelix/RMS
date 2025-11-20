import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from '@/hooks/use-toast'
import { TenantBentoItem } from '@/types/tenant-payment'
import { getLatestNebenkostenAmount } from '@/utils/tenant-payment-calculations'

export function useTenantPayments() {
    const [data, setData] = useState<TenantBentoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

    const getCurrentMonthRange = () => {
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()
        return {
            start: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
            end: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/tenants-data')
            if (!response.ok) {
                throw new Error('Failed to fetch tenant data')
            }

            const { tenants, finances } = await response.json()

            // Filter for active tenants only
            const activeTenants = tenants.filter((tenant: any) =>
                !tenant.auszug || new Date(tenant.auszug) > new Date()
            )

            const { start, end } = getCurrentMonthRange()

            // Process payment status and missed payments
            const tenantsWithPayments = activeTenants.map((mieter: any) => {
                const mieteRaw = Number(mieter.Wohnungen.miete) || 0
                const nebenkostenRaw = getLatestNebenkostenAmount(mieter.nebenkosten)

                // Filter finances for this tenant's apartment
                const tenantFinances = finances.filter((finance: any) =>
                    finance.wohnung_id === mieter.Wohnungen.id
                )

                // Current month payments
                const currentMonthPayments = tenantFinances.filter((finance: any) =>
                    finance.datum >= start && finance.datum <= end
                )

                const currentPayments = {
                    rent: currentMonthPayments
                        .filter((p: any) => p.name?.includes('Mietzahlung'))
                        .reduce((sum: number, p: any) => sum + (p.betrag || 0), 0),
                    nebenkosten: currentMonthPayments
                        .filter((p: any) => p.name?.includes('Nebenkosten'))
                        .reduce((sum: number, p: any) => sum + (p.betrag || 0), 0)
                }

                // Missed payments are calculated on the server
                const missedPayments = mieter.missedPayments || {
                    rentMonths: 0,
                    nebenkostenMonths: 0,
                    totalAmount: 0
                }

                return {
                    id: mieter.id,
                    tenant: mieter.name,
                    apartment: mieter.Wohnungen.name,
                    apartmentId: mieter.Wohnungen.id,
                    mieteRaw,
                    nebenkostenRaw,
                    actualRent: currentPayments.rent,
                    actualNebenkosten: currentPayments.nebenkosten,
                    missedPayments,
                    einzug: mieter.einzug,
                    // We'll set 'paid' later
                    paid: false
                }
            })

            // Get paid apartments for current month
            const paidWohnungen: Set<string> = new Set(
                finances
                    .filter((f: any) =>
                        f.datum >= start &&
                        f.datum <= end &&
                        f.ist_einnahmen &&
                        (f.name?.includes('Mietzahlung') || f.name?.includes('Nebenkosten'))
                    )
                    .map((f: any) => f.wohnung_id)
                    .filter((id: any): id is string => typeof id === 'string')
            )

            const formattedData: TenantBentoItem[] = tenantsWithPayments.map((item: any) => ({
                ...item,
                paid: paidWohnungen.has(item.apartmentId)
            }))

            setData(formattedData)
        } catch (error) {
            console.error("Fehler beim Laden der Mietdaten:", error)
            setError(error instanceof Error ? error.message : 'Unbekannter Fehler')
        } finally {
            setLoading(false)
        }
    }, [])

    const toggleRentPayment = async (tenant: TenantBentoItem) => {
        if (updatingStatus === tenant.id) return

        const originalData = [...data]
        setUpdatingStatus(tenant.id)

        try {
            // Optimistic update
            setData(prevData =>
                prevData.map(item =>
                    item.id === tenant.id
                        ? { ...item, paid: !tenant.paid }
                        : item
                )
            )

            const { start, end } = getCurrentMonthRange()
            const supabase = createClient()

            if (tenant.paid) {
                // Remove payment records
                const { error } = await supabase
                    .from('Finanzen')
                    .delete()
                    .eq('wohnung_id', tenant.apartmentId)
                    .eq('ist_einnahmen', true)
                    .gte('datum', start)
                    .lte('datum', end)
                    .or('name.ilike.Mietzahlung%,name.ilike.Nebenkosten%')

                if (error) throw error

                toast({
                    title: "Zahlung entfernt",
                    description: `Mietzahlung für ${tenant.tenant} wurde entfernt.`,
                    variant: "default",
                })
            } else {
                // Create payment entries
                const entries = [
                    {
                        wohnung_id: tenant.apartmentId,
                        name: `Mietzahlung ${tenant.apartment}`,
                        datum: new Date().toISOString().split('T')[0],
                        betrag: tenant.mieteRaw,
                        ist_einnahmen: true,
                        notiz: `Mietzahlung von ${tenant.tenant}`
                    }
                ]

                if (tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0) {
                    entries.push({
                        wohnung_id: tenant.apartmentId,
                        name: `Nebenkosten ${tenant.apartment}`,
                        datum: new Date().toISOString().split('T')[0],
                        betrag: tenant.nebenkostenRaw,
                        ist_einnahmen: true,
                        notiz: `Nebenkosten-Vorauszahlung von ${tenant.tenant}`
                    })
                }

                const response = await fetch('/api/finance-entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entries })
                })

                const resData = await response.json()
                if (!response.ok) {
                    throw new Error(resData.error || 'Failed to create entries')
                }

                const entryCount = entries.length
                toast({
                    title: "Zahlung als bezahlt markiert",
                    description: `${entryCount} Zahlungseinträge für ${tenant.tenant} wurden erstellt.`,
                    variant: "success",
                })
            }

            // We could re-fetch here to be sure, but optimistic update + success is usually enough.
            // However, to get exact DB state (ids etc), a refetch is good.
            // But for UI responsiveness, we already updated.
            // The original code in Bento didn't refetch on success (except for error revert).
            // The original code in Modal DID refetch on success.
            // Let's stick to optimistic update and maybe background refresh if needed.
            // For now, just optimistic is fine as per Bento implementation.

        } catch (error) {
            console.error("Fehler beim Aktualisieren des Mietstatus:", error)
            setData(originalData) // Revert
            toast({
                title: "Fehler beim Aktualisieren",
                description: error instanceof Error ? error.message : 'Unbekannter Fehler',
                variant: "destructive",
            })
        } finally {
            setUpdatingStatus(null)
        }
    }

    return {
        data,
        loading,
        error,
        updatingStatus,
        fetchData,
        toggleRentPayment,
        setData
    }
}
