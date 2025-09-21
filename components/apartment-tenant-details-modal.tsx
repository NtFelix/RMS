"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  User, 
  Edit, 
  Mail, 
  Phone, 
  Calendar,
  FileText,
  Euro,
  Building,
  Clock
} from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { formatCurrency, formatNumber } from "@/utils/format"
import { cn } from "@/lib/utils"

export function ApartmentTenantDetailsModal() {
  const {
    isApartmentTenantDetailsModalOpen,
    apartmentTenantDetailsData,
    apartmentTenantDetailsLoading,
    apartmentTenantDetailsError,
    closeApartmentTenantDetailsModal,
    setApartmentTenantDetailsError,
    setApartmentTenantDetailsLoading,
    setApartmentTenantDetailsData,
    // Modal opening functions for edit actions
    openWohnungModal,
    openTenantModal,
    refreshApartmentTenantDetailsData,
  } = useModalStore()

  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [isSlowLoading, setIsSlowLoading] = React.useState(false)
  const [loadingStartTime, setLoadingStartTime] = React.useState<number | null>(null)

  // Enhanced loading progress tracking
  React.useEffect(() => {
    if (apartmentTenantDetailsLoading) {
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
  }, [apartmentTenantDetailsLoading, loadingStartTime])

  const handleRetry = async () => {
    if (apartmentTenantDetailsData?.apartment?.id) {
      setApartmentTenantDetailsError(undefined)
      setApartmentTenantDetailsLoading(true)
      
      try {
        const url = apartmentTenantDetailsData.tenant
          ? `/api/apartments/${apartmentTenantDetailsData.apartment.id}/tenant/${apartmentTenantDetailsData.tenant.id}/details`
          : `/api/apartments/${apartmentTenantDetailsData.apartment.id}/details`
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to load data')
        }
        const data = await response.json()
        setApartmentTenantDetailsData(data)
        setApartmentTenantDetailsLoading(false)
      } catch (error) {
        setApartmentTenantDetailsError(error instanceof Error ? error.message : 'An error occurred')
        setApartmentTenantDetailsLoading(false)
      }
    }
  }

  const handleEditApartment = async () => {
    if (!apartmentTenantDetailsData?.apartment) return;
    
    const apartment = apartmentTenantDetailsData.apartment;
    
    // Transform the apartment data for the edit modal
    const transformedApartment = {
      id: apartment.id,
      name: apartment.name,
      groesse: apartment.groesse,
      miete: apartment.miete,
      haus_id: apartment.haus_id,
      // Include any other necessary fields that might be needed for editing
      ...(apartment.notes && { notes: apartment.notes }),
      ...(apartment.amenities && { amenities: apartment.amenities }),
      ...(apartment.condition && { condition: apartment.condition })
    };
    
    // Only fetch the specific house we need
    try {
      // If we already have the house name, we can use it directly
      // Otherwise, we'd fetch it from the API
      const houseInfo = apartment.haus_id && apartment.hausName
        ? [{ id: apartment.haus_id, name: apartment.hausName }]
        : [];
      
      // Open the modal with the existing house info
      // The modal can handle fetching additional house data if needed
      openWohnungModal(transformedApartment, houseInfo, () => {
        // Refresh data after successful edit
        refreshApartmentTenantDetailsData();
      });
    } catch (error) {
      console.error('Error preparing apartment edit:', error);
      // Fallback to minimal data if there's an error
      openWohnungModal(transformedApartment, [], () => {
        refreshApartmentTenantDetailsData();
      });
    }
  }

  const handleEditTenant = () => {
    if (apartmentTenantDetailsData?.tenant) {
      const tenant = apartmentTenantDetailsData.tenant
      // Transform the tenant data to match the expected format for the edit modal
      const transformedTenant = {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email || '',
        telefonnummer: tenant.telefon || '',
        einzug: tenant.einzug || '',
        auszug: tenant.auszug || '',
        notiz: tenant.notes || '',
        wohnung_id: apartmentTenantDetailsData.apartment.id
      }
      const wohnungen = [{ id: apartmentTenantDetailsData.apartment.id, name: apartmentTenantDetailsData.apartment.name }]
      // Note: The tenant modal doesn't currently support success callbacks, 
      // so we'll need to rely on the modal closing to trigger a refresh
      openTenantModal(transformedTenant, wohnungen)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nicht angegeben'
    try {
      return new Date(dateString).toLocaleDateString('de-DE')
    } catch {
      return 'Ungültiges Datum'
    }
  }

  if (!isApartmentTenantDetailsModalOpen) return null

  return (
    <Dialog open={isApartmentTenantDetailsModalOpen} onOpenChange={() => closeApartmentTenantDetailsModal()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle className="sr-only">
            {apartmentTenantDetailsError 
              ? "Fehler beim Laden" 
              : "Wohnung-Mieter Details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {apartmentTenantDetailsError 
              ? "Es ist ein Fehler beim Laden der Wohnung-Mieter Details aufgetreten."
              : "Detaillierte Informationen über die Wohnung und den aktuellen Mieter."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto">
          {apartmentTenantDetailsLoading ? (
            <ApartmentTenantDetailsSkeleton 
              isSlowLoading={isSlowLoading} 
              loadingProgress={loadingProgress} 
            />
          ) : apartmentTenantDetailsError ? (
            <ErrorState 
              error={apartmentTenantDetailsError} 
              onRetry={handleRetry}
              loadingStartTime={loadingStartTime}
              onClose={closeApartmentTenantDetailsModal}
            />
          ) : apartmentTenantDetailsData ? (
            <div className="space-y-6">
              {/* Apartment Details Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Wohnungsdetails
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditApartment}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Bearbeiten
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Haus:</span>
                        <span>{apartmentTenantDetailsData.apartment.hausName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Wohnung:</span>
                        <span>{apartmentTenantDetailsData.apartment.name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Größe:</span>
                        <span>{formatNumber(apartmentTenantDetailsData.apartment.groesse)} m²</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Miete:</span>
                        <span>{formatCurrency(apartmentTenantDetailsData.apartment.miete)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional apartment details if available */}
                  {apartmentTenantDetailsData.apartment.amenities && apartmentTenantDetailsData.apartment.amenities.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-medium">Ausstattung:</span>
                      <div className="flex flex-wrap gap-2">
                        {apartmentTenantDetailsData.apartment.amenities.map((amenity, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {apartmentTenantDetailsData.apartment.condition && (
                    <div className="space-y-2">
                      <span className="font-medium">Zustand:</span>
                      <p className="text-sm text-muted-foreground">
                        {apartmentTenantDetailsData.apartment.condition}
                      </p>
                    </div>
                  )}
                  
                  {apartmentTenantDetailsData.apartment.notes && (
                    <div className="space-y-2">
                      <span className="font-medium">Notizen:</span>
                      <p className="text-sm text-muted-foreground">
                        {apartmentTenantDetailsData.apartment.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tenant Details Section */}
              {apartmentTenantDetailsData.tenant ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Mieterdetails
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditTenant}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Bearbeiten
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Name:</span>
                          <span>{apartmentTenantDetailsData.tenant.name}</span>
                        </div>
                        {apartmentTenantDetailsData.tenant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">E-Mail:</span>
                            <a 
                              href={`mailto:${apartmentTenantDetailsData.tenant.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {apartmentTenantDetailsData.tenant.email}
                            </a>
                          </div>
                        )}
                        {apartmentTenantDetailsData.tenant.telefon && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Telefon:</span>
                            <a 
                              href={`tel:${apartmentTenantDetailsData.tenant.telefon}`}
                              className="text-blue-600 hover:underline"
                            >
                              {apartmentTenantDetailsData.tenant.telefon}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Einzug:</span>
                          <span>{formatDate(apartmentTenantDetailsData.tenant.einzug)}</span>
                        </div>
                        {apartmentTenantDetailsData.tenant.auszug && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Auszug:</span>
                            <span>{formatDate(apartmentTenantDetailsData.tenant.auszug)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {apartmentTenantDetailsData.tenant.leaseTerms && (
                      <div className="space-y-2">
                        <span className="font-medium">Mietvertrag:</span>
                        <p className="text-sm text-muted-foreground">
                          {apartmentTenantDetailsData.tenant.leaseTerms}
                        </p>
                      </div>
                    )}
                    
                    {apartmentTenantDetailsData.tenant.notes && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Notizen:</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {apartmentTenantDetailsData.tenant.notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Payment History Section */}
                    {apartmentTenantDetailsData.tenant.paymentHistory && apartmentTenantDetailsData.tenant.paymentHistory.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Zahlungshistorie:</span>
                        </div>
                        <div className="space-y-2 pl-6">
                          {apartmentTenantDetailsData.tenant.paymentHistory.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg transition-colors duration-150 hover:bg-accent/50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{formatDate(payment.date)}</span>
                                {payment.description && (
                                  <span className="text-sm text-muted-foreground">- {payment.description}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-xs",
                                  payment.status === 'paid' && "bg-green-100 text-green-800",
                                  payment.status === 'pending' && "bg-yellow-100 text-yellow-800",
                                  payment.status === 'overdue' && "bg-red-100 text-red-800"
                                )}>
                                  {payment.status === 'paid' && 'Bezahlt'}
                                  {payment.status === 'pending' && 'Ausstehend'}
                                  {payment.status === 'overdue' && 'Überfällig'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
                    <User className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold">Keine Mieter</h3>
                      <p className="text-sm text-muted-foreground">
                        Diese Wohnung ist derzeit nicht vermietet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ApartmentTenantDetailsSkeleton({ 
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
            <span className="text-sm font-medium">Detaillierte Informationen werden geladen...</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
          <p className="text-xs text-blue-600">
            Dies kann bei umfangreichen Mieter-Daten etwas dauern.
          </p>
        </div>
      )}

      {/* Apartment Details Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Tenant Details Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2 pl-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorState({ 
  error, 
  onRetry, 
  loadingStartTime,
  onClose
}: { 
  error: string
  onRetry: () => void
  loadingStartTime: number | null
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="p-4 rounded-full bg-red-50">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">Fehler beim Laden</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {error || 'Die Wohnungs- und Mieter-Details konnten nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'}
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
          onClick={onClose}
          variant="ghost"
          className="text-gray-600"
        >
          Schließen
        </Button>
      </div>
    </div>
  )
}