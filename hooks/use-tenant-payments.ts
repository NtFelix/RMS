import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from '@/hooks/use-toast'
import { TenantBentoItem } from '@/types/tenant-payment'
import { FinanceEntryPayload } from '@/types/finanzen'
import { getLatestNebenkostenAmount } from '@/utils/tenant-payment-calculations'
import { PAYMENT_KEYWORDS, PAYMENT_TAGS } from '@/utils/constants'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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

            const { tenants } = await response.json()

            // Filter for active tenants only
            const activeTenants = tenants.filter((tenant: any) =>
                !tenant.auszug || new Date(tenant.auszug) > new Date()
            )

            const formattedData: TenantBentoItem[] = activeTenants.map((mieter: any) => {
                const mieteRaw = Number(mieter.Wohnungen.miete) || 0
                const nebenkostenRaw = getLatestNebenkostenAmount(mieter.nebenkosten)

                return {
                    id: mieter.id,
                    tenant: mieter.name,
                    apartment: mieter.Wohnungen.name,
                    apartmentId: mieter.Wohnungen.id,
                    mieteRaw,
                    nebenkostenRaw,
                    actualRent: mieter.actualRent || 0,
                    actualNebenkosten: mieter.actualNebenkosten || 0,
                    missedPayments: mieter.missedPayments || {
                        rentMonths: 0,
                        nebenkostenMonths: 0,
                        totalAmount: 0
                    },
                    einzug: mieter.einzug,
                    paid: mieter.paid || false
                }
            })

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
                    .or(`name.ilike.${PAYMENT_KEYWORDS.RENT}%,name.ilike.${PAYMENT_KEYWORDS.NEBENKOSTEN}%`)

                if (error) throw error

                toast({
                    title: "Zahlung entfernt",
                    description: `Mietzahlung für ${tenant.tenant} wurde entfernt.`,
                    variant: "default",
                })
            } else {
                // Create payment entries with auto-applied tags
                const entries: FinanceEntryPayload[] = [
                    {
                        wohnung_id: tenant.apartmentId,
                        name: `${capitalize(PAYMENT_KEYWORDS.RENT)} ${tenant.apartment}`,
                        datum: new Date().toISOString().split('T')[0],
                        betrag: tenant.mieteRaw,
                        ist_einnahmen: true,
                        notiz: `${capitalize(PAYMENT_KEYWORDS.RENT)} von ${tenant.tenant}`,
                        tags: [PAYMENT_TAGS.RENT]
                    }
                ]

                if (tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0) {
                    entries.push({
                        wohnung_id: tenant.apartmentId,
                        name: `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)} ${tenant.apartment}`,
                        datum: new Date().toISOString().split('T')[0],
                        betrag: tenant.nebenkostenRaw,
                        ist_einnahmen: true,
                        notiz: `${capitalize(PAYMENT_KEYWORDS.NEBENKOSTEN)}-Vorauszahlung von ${tenant.tenant}`,
                        tags: [PAYMENT_TAGS.NEBENKOSTEN]
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
