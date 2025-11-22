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
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import { TenantBentoItem } from "@/types/tenant-payment"

export default function TenantPaymentOverviewModal() {
  const {
    isTenantPaymentOverviewModalOpen,
    closeTenantPaymentOverviewModal,
    openTenantPaymentEditModal
  } = useModalStore()

  const {
    data,
    loading,
    error,
    updatingStatus,
    fetchData,
    toggleRentPayment
  } = useTenantPayments()

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
      fetchData()
    }
  }, [isTenantPaymentOverviewModalOpen, fetchData])

  const filteredTenants = data?.filter((tenant) => {
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
          <motion.div layout className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mieter oder Wohnung suchen..."
              className="pl-9 pr-3 py-2 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div layout>
                <Button variant="outline" className="rounded-xl px-3">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter nach Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={activeFilter === null}
                onCheckedChange={() => setActiveFilter(null)}
              >
                Alle
              </DropdownMenuCheckboxItem>
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

          {/* Active Filter Pill */}
          <AnimatePresence>
            {activeFilter && (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.95, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.95, width: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setActiveFilter(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 overflow-hidden whitespace-nowrap"
              >
                <motion.span layout="position">{activeFilter}</motion.span>
                <motion.div layout="position">
                  <X className="h-3.5 w-3.5" />
                </motion.div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Fehler beim Laden</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : data && data.length > 0 ? (
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
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.actualRent || tenant.mieteRaw)}
                        </span>
                      </div>

                      {tenant.nebenkostenRaw && tenant.nebenkostenRaw > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Nebenkosten:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.actualNebenkosten || tenant.nebenkostenRaw)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm font-semibold border-t pt-1">
                        <span>Gesamt:</span>
                        <span>
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((tenant.actualRent || tenant.mieteRaw) + (tenant.actualNebenkosten || tenant.nebenkostenRaw || 0))}
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
                          fetchData()
                        })}
                      >
                        <Edit className="h-3 w-3" />
                        Anpassen
                      </button>

                      <button
                        type="button"
                        className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-medium border transition-colors duration-150 flex items-center justify-center gap-1 ${!tenant.paid
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : hasDifferentPayments(tenant)
                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30'
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
                            {tenant.paid ? 'Bezahlt' : 'Unbezahlt'}
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
