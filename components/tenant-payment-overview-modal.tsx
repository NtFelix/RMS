"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { createClient } from "@/utils/supabase/client"
import { Home, User, Tag, Edit, Check, Wrench, AlertCircle, X, Maximize2, Search, Filter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { type TenantBentoItem, getLatestNebenkostenAmount } from "./tenant-payment-bento"
import { Input } from "@/components/ui/input"

export default function TenantPaymentOverviewModal() {
  const {
    isTenantPaymentOverviewModalOpen,
    closeTenantPaymentOverviewModal,
    tenantPaymentOverviewData,
    tenantPaymentOverviewLoading,
    tenantPaymentOverviewError,
    setTenantPaymentOverviewData,
    setTenantPaymentOverviewLoading,
    setTenantPaymentOverviewError,
    openTenantPaymentEditModal
  } = useModalStore()

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Helper function to determine if payments differ from normal
  const hasDifferentPayments = (tenant: TenantBentoItem) => {
    const rentDiffers = tenant.actualRent && tenant.actualRent !== tenant.mieteRaw
    const nebenkostenDiffers = tenant.actualNebenkosten && tenant.actualNebenkosten !== (tenant.nebenkostenRaw || 0)
    return rentDiffers || nebenkostenDiffers
  }

  const handleFilterToggle = (filter: string) => {
    setActiveFilter((prevFilter) => (prevFilter === filter ? null : filter))
  }

  // Fetch data when modal opens
  useEffect(() => {
    if (isTenantPaymentOverviewModalOpen) {
      const fetchData = async () => {
        try {
          setTenantPaymentOverviewLoading(true)
          setTenantPaymentOverviewError(undefined)

          // Use the optimized API endpoint
          const response = await fetch('/api/tenants-data')
          if (!response.ok) {
            throw new Error('Failed to fetch tenant data')
          }

          const { tenants, finances } = await response.json()

          // Filter for active tenants only
          const activeTenants = tenants.filter((tenant: any) =>
            !tenant.auszug || new Date(tenant.auszug) > new Date()
          )

          // Get current month range for payment status
          const currentDate = new Date()
          const currentMonth = currentDate.getMonth() + 1
          const currentYear = currentDate.getFullYear()
          const start = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
          const end = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

          // Process payment status and missed payments using the data we already have
          const tenantsWithPayments = activeTenants.map((mieter: any) => {
            const mieteRaw = Number(mieter.Wohnungen.miete) || 0
            const nebenkostenRaw = getLatestNebenkostenAmount(mieter.nebenkosten)

            // Get current month payments
            const currentPayments = {
              rent: 0,
              nebenkosten: 0
            }

            finances
              .filter((f: any) =>
                f.wohnung_id === mieter.Wohnungen.id &&
                f.datum >= start &&
                f.datum <= end &&
                f.ist_einnahmen
              )
              .forEach((f: any) => {
                if (f.name?.includes('Mietzahlung')) {
                  currentPayments.rent = Number(f.betrag) || 0
                } else if (f.name?.includes('Nebenkosten')) {
                  currentPayments.nebenkosten = Number(f.betrag) || 0
                }
              })

            // Calculate missed payments
            const moveInDate = new Date(mieter.einzug)
            let missedRentMonths = 0
            let missedNebenkostenMonths = 0
            let totalMissedAmount = 0

            // Iterate through each month from move-in to current
            for (let year = moveInDate.getFullYear(); year <= currentYear; year++) {
              const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
              const endMonth = (year === currentYear) ? currentDate.getMonth() : 11

              for (let month = startMonth; month <= endMonth; month++) {
                const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
                const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]

                // Check if rent was paid for this month
                const rentPaid = finances.some((f: any) =>
                  f.wohnung_id === mieter.Wohnungen.id &&
                  f.datum >= monthStart &&
                  f.datum <= monthEnd &&
                  f.ist_einnahmen &&
                  f.name?.includes('Mietzahlung')
                )

                if (!rentPaid) {
                  missedRentMonths++
                  totalMissedAmount += mieteRaw
                }

                // Check if nebenkosten were paid for this month (if applicable)
                if (nebenkostenRaw > 0) {
                  const nebenkostenPaid = finances.some((f: any) =>
                    f.wohnung_id === mieter.Wohnungen.id &&
                    f.datum >= monthStart &&
                    f.datum <= monthEnd &&
                    f.ist_einnahmen &&
                    f.name?.includes('Nebenkosten')
                  )

                  if (!nebenkostenPaid) {
                    missedNebenkostenMonths++
                    totalMissedAmount += nebenkostenRaw
                  }
                }
              }
            }

            const missedPayments = {
              rentMonths: missedRentMonths,
              nebenkostenMonths: missedNebenkostenMonths,
              totalAmount: totalMissedAmount
            }

            return {
              ...mieter,
              actualRent: currentPayments.rent,
              actualNebenkosten: currentPayments.nebenkosten,
              missedPayments
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

          // Format tenant data with payment status
          const formattedData = tenantsWithPayments.map((mieter: any) => ({
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

          setTenantPaymentOverviewData(formattedData)
        } catch (error) {
          console.error("Fehler beim Laden der Mietdaten:", error)
          setTenantPaymentOverviewError(error instanceof Error ? error.message : 'Unbekannter Fehler')
        } finally {
          setTenantPaymentOverviewLoading(false)
        }
      }

      fetchData()
    }
  }, [isTenantPaymentOverviewModalOpen, setTenantPaymentOverviewData, setTenantPaymentOverviewLoading, setTenantPaymentOverviewError])

  // Handle toggle payment status
  const toggleRentPayment = async (tenant: TenantBentoItem) => {
    if (updatingStatus === tenant.id) return

    // Store original data for potential revert
    const originalData = tenantPaymentOverviewData

    try {
      setUpdatingStatus(tenant.id)

      // Optimistic update
      if (tenantPaymentOverviewData) {
        setTenantPaymentOverviewData(
          tenantPaymentOverviewData.map(t =>
            t.id === tenant.id ? { ...t, paid: !t.paid } : t
          )
        )
      }

      const supabase = createClient()

      if (tenant.paid) {
        // Remove payment entries
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()
        const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
        const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

        const { error: deleteError } = await supabase
          .from('Finanzen')
          .delete()
          .eq('wohnung_id', tenant.apartmentId)
          .gte('datum', monthStart)
          .lte('datum', monthEnd)
          .or('name.ilike.Mietzahlung%,name.ilike.Nebenkosten%')

        if (deleteError) throw deleteError

        // Show success toast
        toast({
          title: "Zahlung entfernt",
          description: `Mietzahlung für ${tenant.tenant} wurde entfernt.`,
          variant: "default",
        })
      } else {
        // Add payment entries using the optimized API endpoint
        const entries = []

        // Add rent entry
        entries.push({
          wohnung_id: tenant.apartmentId,
          name: `Mietzahlung ${tenant.apartment}`,
          datum: new Date().toISOString().split('T')[0],
          betrag: tenant.mieteRaw,
          ist_einnahmen: true,
          notiz: `Mietzahlung von ${tenant.tenant}`
        })

        // Add nebenkosten entry if applicable
        if (tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0) {
          entries.push({
            wohnung_id: tenant.apartmentId,
            name: `Nebenkosten ${tenant.apartment}`,
            datum: new Date().toISOString().split('T')[0],
            betrag: tenant.nebenkostenRaw,
            ist_einnahmen: true,
            notiz: `Nebenkosten von ${tenant.tenant}`
          })
        }

        if (entries.length > 0) {
          const response = await fetch('/api/finance-entries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entries }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create entries')
          }

          // Show success toast
          const entryCount = 1 + (tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0 ? 1 : 0)
          toast({
            title: "Zahlung als bezahlt markiert",
            description: `${entryCount} Zahlungseinträge für ${tenant.tenant} wurden erstellt.`,
            variant: "success",
          })
        }
      }

      // Refresh data
      const { data: refreshedData } = await supabase
        .from('Finanzen')
        .select('*')
        .eq('ist_einnahmen', true)

      // Re-fetch the data to get updated state
      const response = await fetch('/api/tenants-data')
      if (response.ok) {
        const { tenants, finances } = await response.json()
        // Process and update data similar to initial fetch
        // ... (this would be the same logic as in the initial fetch)
      }

    } catch (error) {
      console.error("Fehler beim Aktualisieren des Mietstatus:", error)
      // Revert optimistic update on error
      if (originalData) {
        setTenantPaymentOverviewData(originalData)
      }
      toast({
        title: "Fehler beim Aktualisieren",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredTenants = tenantPaymentOverviewData?.filter((tenant) => {
    const matchesSearch = tenant.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.apartment.toLowerCase().includes(searchTerm.toLowerCase())

    if (!activeFilter) {
      return matchesSearch
    }

    const matchesFilter = (() => {
      if (activeFilter === "Bezahlt") {
        return tenant.paid
      }
      if (activeFilter === "Offen") {
        return !tenant.paid
      }
      if (activeFilter === "Verpasste Zahlungen") {
        return tenant.missedPayments.totalAmount > 0
      }
      return false
    })()

    return matchesSearch && matchesFilter
  }) || []

  return (
    <Dialog open={isTenantPaymentOverviewModalOpen} onOpenChange={() => closeTenantPaymentOverviewModal()}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Mietzahlungen Übersicht
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filter Row */}
        <div className="flex gap-2 mb-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mieter oder Wohnung suchen..."
              className="pl-9 pr-3 py-2 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[150px] justify-between rounded-xl px-3">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  {activeFilter || "Filter"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter nach Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Bezahlt", "Offen", "Verpasste Zahlungen"].map((filter) => (
                <DropdownMenuCheckboxItem
                  key={filter}
                  checked={activeFilter === filter}
                  onCheckedChange={() => handleFilterToggle(filter)}
                >
                  {filter}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tenantPaymentOverviewLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : tenantPaymentOverviewError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-muted-foreground">{tenantPaymentOverviewError}</p>
            </div>
          ) : tenantPaymentOverviewData && tenantPaymentOverviewData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTenants.map((tenant) => (
                <Card
                  key={tenant.id}
                  className={`transition-colors duration-200 rounded-4xl ${!tenant.paid
                    ? 'border-red-200 dark:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/20'
                    : hasDifferentPayments(tenant)
                      ? 'border-orange-200 dark:border-orange-800 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                      : 'border-green-200 dark:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-900/20'
                    }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <User className="h-3.5 w-3.5" />
                          {tenant.tenant}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Home className="h-3 w-3" />
                          {tenant.apartment}
                        </div>
                      </div>
                      <Badge
                        variant={tenant.paid ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {tenant.paid ? "Bezahlt" : "Offen"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 pt-0">
                    {/* Payment amounts */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Miete:</span>
                        <span className="font-medium">
                          {tenant.actualRent ? `€${tenant.actualRent.toFixed(2)}` : `€${tenant.mieteRaw.toFixed(2)}`}
                        </span>
                      </div>

                      {tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Nebenkosten:</span>
                          <span className="font-medium">
                            {tenant.actualNebenkosten ? `€${tenant.actualNebenkosten.toFixed(2)}` : `€${tenant.nebenkostenRaw.toFixed(2)}`}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm font-semibold border-t pt-1">
                        <span>Gesamt:</span>
                        <span>
                          €{((tenant.actualRent || tenant.mieteRaw) + (tenant.actualNebenkosten || tenant.nebenkostenRaw || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Missed payments warning */}
                    {tenant.missedPayments.totalAmount > 0 && (
                      <div className="flex items-center gap-2 p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <div className="text-xs text-orange-700 dark:text-orange-300">
                          <div className="font-medium">Verpasste Zahlungen</div>
                          <div>
                            {tenant.missedPayments.rentMonths} Miete, {tenant.missedPayments.nebenkostenMonths} NK
                          </div>
                          <div className="font-semibold">€{tenant.missedPayments.totalAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="flex-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition-colors duration-150 bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/50 flex items-center justify-center gap-1"
                        disabled={updatingStatus === tenant.id}
                        onClick={() => openTenantPaymentEditModal({
                          id: tenant.id,
                          tenant: tenant.tenant,
                          apartment: tenant.apartment,
                          apartmentId: tenant.apartmentId,
                          mieteRaw: tenant.mieteRaw,
                          nebenkostenRaw: tenant.nebenkostenRaw || 0,
                          einzug: tenant.einzug
                        }, () => {
                          // Refresh data when modal closes
                          window.location.reload()
                        })}
                      >
                        <Edit className="h-3 w-3" />
                        Anpassen
                      </button>

                      <button
                        type="button"
                        className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition-colors duration-150 flex items-center justify-center gap-1 ${tenant.paid
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                          }`}
                        disabled={updatingStatus === tenant.id}
                        onClick={() => toggleRentPayment(tenant)}
                      >
                        {updatingStatus === tenant.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-current" />
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            {tenant.paid ? 'Unbezahlt' : 'Bezahlt'}
                          </>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Mieter gefunden</h3>
              <p className="text-muted-foreground">Es wurden keine aktiven Mieter gefunden.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
