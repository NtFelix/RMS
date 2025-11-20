"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useModalStore } from "@/hooks/use-modal-store"
import { Home, User, Tag, Edit, Check, Wrench, AlertCircle, Maximize2 } from "lucide-react"
import { useTenantPayments } from "@/hooks/use-tenant-payments"
import { TenantBentoItem } from "@/types/tenant-payment"

export function TenantPaymentBento() {
  const {
    data,
    loading,
    updatingStatus,
    fetchData,
    toggleRentPayment
  } = useTenantPayments()

  const { openTenantPaymentEditModal, openTenantPaymentOverviewModal } = useModalStore()

  // Helper function to determine if payments differ from normal
  const hasDifferentPayments = (tenant: TenantBentoItem) => {
    const rentDiffers = tenant.actualRent && tenant.actualRent !== tenant.mieteRaw
    const nebenkostenDiffers = tenant.actualNebenkosten && tenant.actualNebenkosten !== (tenant.nebenkostenRaw || 0)
    return rentDiffers || nebenkostenDiffers
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mietzahlungen</CardTitle>
            <CardDescription>Bezahlt vs. offen</CardDescription>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
            onClick={() => openTenantPaymentOverviewModal()}
            title="Maximieren"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
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
                  className={`w-full flex flex-col p-4 rounded-2xl shadow-md bg-card border transition-colors duration-200 ${!tenant.paid
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
                            {[
                              tenant.missedPayments.rentMonths > 0 ? `${tenant.missedPayments.rentMonths} Miete` : null,
                              tenant.missedPayments.nebenkostenMonths > 0 ? `${tenant.missedPayments.nebenkostenMonths} NK` : null
                            ].filter(Boolean).join(', ')} ausstehend
                            {' '}({new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(tenant.missedPayments.totalAmount)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right side: Price tags - aligned with tenant name */}
                    <div className="flex flex-col items-end gap-1">
                      {/* Main rent price */}
                      <div className={`flex items-center gap-1 font-medium ${!tenant.paid ? 'text-red-600 dark:text-red-400' :
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
                        <div className={`flex items-center gap-1 text-xs font-medium ${!tenant.paid ? 'text-red-600/70 dark:text-red-400/70' :
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
                      }, fetchData)}
                    >
                      <Edit className="h-3 w-3" />
                      Anpassen
                    </button>

                    {/* All button (right) */}
                    <button
                      type="button"
                      className={
                        `flex-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors duration-150 flex items-center justify-center gap-1 ${!tenant.paid
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
