"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Home, RefreshCw, Building, Users, Euro, SquareIcon, Clock } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { SummaryCard } from "@/components/summary-card"
import { ApartmentTenantRow } from "@/components/apartment-tenant-row"
import { ApartmentTenantRowContextMenu } from "@/components/apartment-tenant-row-context-menu"
import { ApartmentTenantRowSkeleton } from "@/components/apartment-tenant-row-skeleton"
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

  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [isSlowLoading, setIsSlowLoading] = React.useState(false)
  const [loadingStartTime, setLoadingStartTime] = React.useState<number | null>(null)

  // Enhanced loading progress tracking
  React.useEffect(() => {
    if (hausOverviewLoading) {
      setLoadingStartTime(Date.now())
      setLoadingProgress(0)
      setIsSlowLoading(false)

      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev // Don't complete until actual data loads
          return prev + Math.random() * 15
        })
      }, 200)

      // Slow loading detection (after 1 second)
      const slowLoadingTimeout = setTimeout(() => {
        setIsSlowLoading(true)
      }, 1000)

      return () => {
        clearInterval(progressInterval)
        clearTimeout(slowLoadingTimeout)
      }
    } else {
      // Complete progress when loading finishes
      if (loadingStartTime) {
        setLoadingProgress(100)
        setTimeout(() => {
          setLoadingProgress(0)
          setIsSlowLoading(false)
          setLoadingStartTime(null)
        }, 300)
      }
    }
  }, [hausOverviewLoading, loadingStartTime])

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
            <HausOverviewSkeleton 
              isSlowLoading={isSlowLoading} 
              loadingProgress={loadingProgress} 
            />
          ) : hausOverviewError ? (
            <ErrorState 
              error={hausOverviewError} 
              onRetry={handleRetry} 
              loadingStartTime={loadingStartTime}
            />
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

function HausOverviewSkeleton({ 
  isSlowLoading, 
  loadingProgress 
}: { 
  isSlowLoading: boolean
  loadingProgress: number 
}) {
  return (
    <div className="space-y-6">
      {/* Progress indicator for slow loading */}
      {isSlowLoading && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Haus-Übersicht wird geladen...</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
          <p className="text-xs text-blue-600">
            Dies kann bei umfangreichen Wohnungsdaten etwas dauern.
          </p>
        </div>
      )}

      {/* House Info Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Wohnungen Table Skeleton */}
      <ApartmentTenantRowSkeleton count={5} showTitle={true} />
    </div>
  )
}



function ErrorState({ 
  error, 
  onRetry, 
  loadingStartTime 
}: { 
  error: string
  onRetry: () => void
  loadingStartTime: number | null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="p-4 rounded-full bg-red-50">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">Fehler beim Laden</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {error || 'Die Haus-Übersicht konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'}
        </p>
        {loadingStartTime && (
          <p className="text-xs text-gray-500">
            Ladezeit überschritten (max. 2 Sekunden)
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>
        <Button 
          onClick={() => {}} 
          variant="ghost"
          className="text-gray-600"
        >
          Schließen
        </Button>
      </div>
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