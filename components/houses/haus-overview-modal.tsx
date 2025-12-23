"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Home, RefreshCw, Building, Users, Euro, SquareIcon, Clock } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { SummaryCard } from "@/components/common/summary-card"
import { ApartmentTenantRow } from "@/components/apartments/apartment-tenant-row"
import { ApartmentTenantRowContextMenu } from "@/components/apartments/apartment-tenant-row-context-menu"
import { ApartmentTenantRowSkeleton } from "@/components/apartments/apartment-tenant-row-skeleton"
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
    refreshHausOverviewData,
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
        refreshHausOverviewData()
      })
    }
  }

  const handleEditTenant = (tenantId: string) => {
    // Find the tenant data and open the edit modal
    const apartment = hausOverviewData?.wohnungen.find(w => w.currentTenant?.id === tenantId)
    if (apartment?.currentTenant && hausOverviewData) {
      // Transform tenant data to match expected format
      const transformedTenant = {
        id: apartment.currentTenant.id,
        name: apartment.currentTenant.name,
        email: '', // Not available in overview data
        telefonnummer: '', // Not available in overview data
        einzug: apartment.currentTenant.einzug || '',
        auszug: '', // Not available in overview data
        notiz: '', // Not available in overview data
        wohnung_id: apartment.id
      }
      const wohnungen = hausOverviewData.wohnungen.map(w => ({ id: w.id, name: w.name }))
      openTenantModal(transformedTenant, wohnungen)
    }
  }

  const handleViewDetails = (apartmentId: string, tenantId?: string) => {
    // Open the apartment-tenant details modal for comprehensive information
    openApartmentTenantDetailsModal(apartmentId, tenantId)
  }

  const handleSummaryCardClick = (cardType: 'area' | 'apartments' | 'tenants' | 'rent') => {
    // Implement summary card click handlers for detailed information access
    switch (cardType) {
      case 'area':
        // Show detailed area breakdown by apartment
        console.log('Showing area breakdown by apartment')
        // Could scroll to apartment list or highlight area information
        break
      case 'apartments':
        // Highlight or filter the apartment list
        console.log('Highlighting apartment list')
        // Could scroll to apartment section
        const apartmentSection = document.querySelector('[data-apartment-list]')
        if (apartmentSection) {
          apartmentSection.scrollIntoView({ behavior: 'smooth' })
        }
        break
      case 'tenants':
        // Show tenant-specific information or filtering
        console.log('Showing tenant information')
        // Could filter to show only occupied apartments
        break
      case 'rent':
        // Display rent breakdown and financial details
        console.log('Showing rent breakdown')
        // Could show detailed financial information
        break
    }
  }

  if (!isHausOverviewModalOpen) return null

  return (
    <Dialog open={isHausOverviewModalOpen} onOpenChange={() => closeHausOverviewModal()}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {hausOverviewError ? (
              "Fehler beim Laden"
            ) : hausOverviewData ? (
              `${hausOverviewData.name} - Übersicht`
            ) : (
              "Haus-Übersicht"
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {hausOverviewError ? (
              "Es ist ein Fehler beim Laden der Haus-Übersicht aufgetreten."
            ) : hausOverviewData ? (
              `Detaillierte Übersicht für ${hausOverviewData.name} mit Wohnungen und Mietern.`
            ) : (
              "Lade Haus-Übersicht mit Wohnungen und Mietern."
            )}
          </DialogDescription>
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
            <div className="flex gap-6 h-full">
              {/* Left Section - Summary (1/3 width) */}
              <div className="w-1/3 space-y-6">
                {/* House Header Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-6 w-6 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{hausOverviewData.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hausOverviewData.strasse && `${hausOverviewData.strasse}, `}
                    {hausOverviewData.ort}
                  </p>
                </div>

                {/* Summary Cards - Vertical Stack */}
                <div className="space-y-3">
                  <SummaryCard
                    title="Gesamtfläche"
                    value={hausOverviewData.totalArea || 0}
                    icon={<SquareIcon className="h-4 w-4 text-muted-foreground" />}
                    valueFormatter={(val) => `${formatNumber(Number(val))} m²`}
                    hoverDetails={{
                      average: hausOverviewData.summaryStats?.averageSize,
                      median: hausOverviewData.summaryStats?.medianSize,
                      breakdown: hausOverviewData.wohnungen.map(w => ({
                        label: w.name,
                        value: w.groesse
                      })),
                      isCurrency: false
                    }}
                    onClick={() => handleSummaryCardClick('area')}
                  />
                  <SummaryCard
                    title="Gesamtmiete"
                    value={hausOverviewData.totalRent || 0}
                    icon={<Euro className="h-4 w-4 text-muted-foreground" />}
                    hoverDetails={{
                      average: hausOverviewData.summaryStats?.averageRent,
                      median: hausOverviewData.summaryStats?.medianRent,
                      breakdown: hausOverviewData.wohnungen
                        .filter(w => w.status === 'vermietet')
                        .map(w => ({
                          label: w.name,
                          value: w.miete
                        })),
                      isCurrency: true
                    }}
                    onClick={() => handleSummaryCardClick('rent')}
                  />
                  <SummaryCard
                    title="Mieter"
                    value={hausOverviewData.tenantCount || 0}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    valueFormatter={(val) => `${val} aktiv`}
                    hoverDetails={{
                      breakdown: [
                        { label: 'Vermietet', value: hausOverviewData.tenantCount || 0 },
                        { label: 'Frei', value: (hausOverviewData.apartmentCount || 0) - (hausOverviewData.tenantCount || 0) }
                      ],
                      isCurrency: false
                    }}
                    onClick={() => handleSummaryCardClick('tenants')}
                  />
                  <SummaryCard
                    title="Wohnungen"
                    value={hausOverviewData.apartmentCount || hausOverviewData.wohnungen?.length || 0}
                    icon={<Building className="h-4 w-4 text-muted-foreground" />}
                    valueFormatter={(val) => `${val} Stk.`}
                    onClick={() => handleSummaryCardClick('apartments')}
                  />
                </div>
              </div>

              {/* Right Section - Apartment List (2/3 width) */}
              <div className="w-2/3">
                {/* Wohnungen Table with scrollable container */}
                <div className="space-y-3 h-[calc(100vh-300px)] overflow-y-auto pr-2" data-apartment-list>
                <h4 className="font-medium">Wohnungen</h4>
                {hausOverviewData.wohnungen.length > 0 ? (
                  <div className="space-y-2">
                    {hausOverviewData.wohnungen.map((apartment) => (
                      <ApartmentTenantRowContextMenu
                        key={apartment.id}
                        apartmentId={apartment.id}
                        tenantId={apartment.currentTenant?.id}
                        apartmentData={{
                          id: apartment.id,
                          name: apartment.name,
                          groesse: apartment.groesse,
                          miete: apartment.miete
                        }}
                        tenantData={apartment.currentTenant ? {
                          id: apartment.currentTenant.id,
                          name: apartment.currentTenant.name,
                          einzug: apartment.currentTenant.einzug
                        } : undefined}
                        onEditApartment={() => handleEditApartment(apartment.id)}
                        onEditTenant={() => apartment.currentTenant && handleEditTenant(apartment.currentTenant.id)}
                        onViewDetails={() => handleViewDetails(apartment.id, apartment.currentTenant?.id)}
                      >
                        <ApartmentTenantRow
                          apartment={apartment}
                          hausName={hausOverviewData.name}
                          onEditApartment={() => handleEditApartment(apartment.id)}
                          onEditTenant={() => apartment.currentTenant && handleEditTenant(apartment.currentTenant.id)}
                          onViewDetails={() => handleViewDetails(apartment.id, apartment.currentTenant?.id)}
                        />
                      </ApartmentTenantRowContextMenu>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
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