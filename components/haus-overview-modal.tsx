"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Home, RefreshCw, Building, Users, Euro, SquareIcon } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { SummaryCard } from "@/components/summary-card"
import { ApartmentTenantRow } from "@/components/apartment-tenant-row"
import { ApartmentTenantRowContextMenu } from "@/components/apartment-tenant-row-context-menu"
import { formatCurrency, formatNumber } from "@/utils/format"
import { cn } from "@/lib/utils"

export function HausOverviewModal() {
  const {
    isHausOverviewModalOpen,
    hausOverviewData,
    hausOverviewLoading,
    hausOverviewError,
    closeHausOverviewModal,
    setHausOverviewError,
    openHausOverviewModal,
    // Modal opening functions for context menu actions
    openWohnungModal,
    openTenantModal,
    openApartmentTenantDetailsModal,
    openWohnungOverviewModal,
    setHausOverviewLoading,
    setHausOverviewData,
  } = useModalStore()

  const handleRetry = async () => {
    if (hausOverviewData?.id) {
      setHausOverviewError(undefined)
      setHausOverviewLoading(true)
      
      try {
        const response = await fetch(`/api/haeuser/${hausOverviewData.id}/overview`)
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        const data = await response.json()
        setHausOverviewData(data)
        setHausOverviewLoading(false)
      } catch (error) {
        setHausOverviewError(error instanceof Error ? error.message : 'An error occurred')
        setHausOverviewLoading(false)
      }
    }
  }

  const handleEditApartment = (apartmentId: string) => {
    // Find the apartment data and open the edit modal
    const apartment = hausOverviewData?.wohnungen.find(w => w.id === apartmentId)
    if (apartment && hausOverviewData) {
      // Transform the apartment data to match the expected format
      const transformedApartment = {
        id: apartment.id,
        name: apartment.name,
        groesse: apartment.groesse,
        miete: apartment.miete,
        haus_id: hausOverviewData.id
      }
      const hausData = [{ id: hausOverviewData.id, name: hausOverviewData.name }]
      openWohnungModal(transformedApartment, hausData, () => {
        // Refresh data after successful edit
        // Note: In a real implementation, we might want to refresh the data
        // For now, we'll just close and reopen the modal
      })
    }
  }

  const handleEditTenant = (tenantId: string) => {
    // Find the tenant data and open the edit modal
    const apartment = hausOverviewData?.wohnungen.find(w => w.currentTenant?.id === tenantId)
    if (apartment?.currentTenant) {
      openTenantModal(apartment.currentTenant, hausOverviewData?.wohnungen)
    }
  }

  const handleViewDetails = (apartmentId: string, tenantId?: string) => {
    // Open the Wohnung overview modal instead of apartment-tenant details
    openWohnungOverviewModal(apartmentId)
  }

  const handleSummaryCardClick = (cardType: 'area' | 'apartments' | 'tenants' | 'rent') => {
    // Placeholder for future detailed view navigation
    console.log(`Summary card clicked: ${cardType}`)
  }

  if (!isHausOverviewModalOpen) return null

  return (
    <Dialog open={isHausOverviewModalOpen} onOpenChange={() => closeHausOverviewModal()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            {hausOverviewError ? (
              "Fehler beim Laden"
            ) : hausOverviewData ? (
              `${hausOverviewData.name} - Übersicht`
            ) : (
              "Haus-Übersicht"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {hausOverviewLoading ? (
            <HausOverviewSkeleton />
          ) : hausOverviewError ? (
            <ErrorState error={hausOverviewError} onRetry={handleRetry} />
          ) : hausOverviewData ? (
            <div className="space-y-6">
              {/* House Header Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Haus-Übersicht: {hausOverviewData.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {hausOverviewData.strasse && `${hausOverviewData.strasse}, `}
                  {hausOverviewData.ort}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>Größe: {hausOverviewData.size && typeof hausOverviewData.size === 'string' ? hausOverviewData.size.replace(/(\d+)/, (match) => formatNumber(parseInt(match))) : `${formatNumber(hausOverviewData.totalArea || 0)} m²`}</span>
                  <span>Wohnungen gesamt: {hausOverviewData.apartmentCount || hausOverviewData.wohnungen?.length || 0}</span>
                </div>
              </div>

              {/* Wohnungen Table */}
              <div className="space-y-3">
                <h4 className="font-medium">Wohnungen</h4>
                {hausOverviewData.wohnungen.length > 0 ? (
                  <div className="space-y-2">
                    {hausOverviewData.wohnungen.map((apartment) => (
                      <div key={apartment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-medium">{apartment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatNumber(apartment.groesse)} m²
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(apartment.miete)}</div>
                            <div className="text-sm text-muted-foreground">
                              {apartment.currentTenant ? apartment.currentTenant.name : 'frei'}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              apartment.status === 'vermietet' 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            )}>
                              {apartment.status === 'frei' ? 'leer' : apartment.status}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Wohnung bearbeiten"
                              onClick={() => handleEditApartment(apartment.id)}
                            >
                              Bearbeiten
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Mieter-Übersicht anzeigen"
                              onClick={() => handleViewDetails(apartment.id, apartment.currentTenant?.id)}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HausOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* House Info Skeleton */}
      <div className="text-center space-y-2">
        <Skeleton className="w-16 h-16 mx-auto rounded-full" />
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ApartmentTenantListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center space-y-2">
        <h3 className="font-semibold">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error}
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Erneut versuchen
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
      <Home className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="font-semibold">Keine Wohnungen</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Dieses Haus hat noch keine Wohnungen.
        </p>
      </div>
    </div>
  )
}