"use client";
import { deleteTenantAction } from "@/app/mieter-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useModalStore } from "@/hooks/use-modal-store";
import { formatNumber, formatCurrency } from "@/utils/format";
import { Edit, Eye, Phone, Mail, AlertCircle, RefreshCw, Clock, Home, Users, Ruler, Euro, Calendar, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCardSkeleton } from "@/components/skeletons/summary-card-skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function WohnungOverviewModal() {
  const {
    isWohnungOverviewModalOpen,
    wohnungOverviewData,
    wohnungOverviewLoading,
    wohnungOverviewError,
    closeWohnungOverviewModal,
    setWohnungOverviewLoading,
    setWohnungOverviewError,
    setWohnungOverviewData,
    refreshWohnungOverviewData,
    openTenantModal,
  } = useModalStore();

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mieterToDelete, setMieterToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enhanced loading progress tracking
  useEffect(() => {
    if (wohnungOverviewLoading) {
      setLoadingStartTime(Date.now());
      setLoadingProgress(0);
      setIsSlowLoading(false);

      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev; // Don't complete until actual data loads
          return prev + Math.random() * 15;
        });
      }, 200);

      // Slow loading detection (after 1 second)
      const slowLoadingTimeout = setTimeout(() => {
        setIsSlowLoading(true);
      }, 1000);

      // 2-second timeout as per requirements
      const timeoutId = setTimeout(() => {
        if (wohnungOverviewLoading) {
          setWohnungOverviewError('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.');
          setWohnungOverviewLoading(false);
        }
      }, 2000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(slowLoadingTimeout);
        clearTimeout(timeoutId);
      };
    } else {
      // Complete progress when loading finishes
      if (loadingStartTime) {
        setLoadingProgress(100);
        setTimeout(() => {
          setLoadingProgress(0);
          setIsSlowLoading(false);
          setLoadingStartTime(null);
        }, 300);
      }
    }
  }, [wohnungOverviewLoading, loadingStartTime]);

  const handleRetry = async () => {
    if (!wohnungOverviewData?.id) return;
    
    setWohnungOverviewLoading(true);
    setWohnungOverviewError(undefined);

    try {
      const response = await fetch(`/api/wohnungen/${wohnungOverviewData.id}/overview`);
      if (!response.ok) {
        throw new Error('Failed to fetch Wohnung overview data');
      }
      const data = await response.json();
      setWohnungOverviewData(data);
    } catch (error) {
      setWohnungOverviewError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setWohnungOverviewLoading(false);
    }
  };

  const handleEditMieter = (mieter: { id: string; name: string; email?: string; telefon?: string; einzug?: string; auszug?: string }) => {
    // Prepare the mieter data for the edit modal
    const mieterData = {
      id: mieter.id,
      name: mieter.name,
      email: mieter.email || '',
      telefonnummer: mieter.telefon || '',
      einzug: mieter.einzug || '',
      auszug: mieter.auszug || '',
      wohnung_id: wohnungOverviewData?.id || '',
      notiz: '', // Not available in overview data
      nebenkosten: [] // Not available in overview data
    };

    // Prepare wohnungen list (current wohnung should be included)
    const wohnungen = wohnungOverviewData ? [{
      id: wohnungOverviewData.id,
      name: wohnungOverviewData.name
    }] : [];

    // Define success callback to refresh overview data
    const onSuccess = () => {
      refreshWohnungOverviewData();
    };

    // Open the Tenant edit modal with the prepared data
    openTenantModal(mieterData, wohnungen);
  };

  const handleViewMieterDetails = (mieter: { id: string; name: string }) => {
    // Show detailed information about the tenant
    toast({
      title: "Mieter Details",
      description: `Detailansicht für "${mieter.name}" wird geöffnet.`,
      variant: "default",
    });
    // This could be extended to navigate to a dedicated detail page
    // or open a detailed modal in the future
  };

  const handleContactMieter = (mieter: { id: string; name: string; email?: string; telefon?: string }) => {
    // Prioritize email over phone for contact
    if (mieter.email && mieter.email.trim() !== '') {
      // Open email client
      const subject = encodeURIComponent(`Betreff: Wohnung ${wohnungOverviewData?.name || ''}`);
      const body = encodeURIComponent(`Hallo ${mieter.name},\n\n`);
      window.location.href = `mailto:${mieter.email}?subject=${subject}&body=${body}`;
      
      toast({
        title: "E-Mail wird geöffnet",
        description: `E-Mail an ${mieter.name} wird in Ihrem Standard-E-Mail-Programm geöffnet.`,
        variant: "default",
      });
    } else if (mieter.telefon && mieter.telefon.trim() !== '') {
      // Open phone dialer
      window.location.href = `tel:${mieter.telefon}`;
      
      toast({
        title: "Telefon wird gewählt",
        description: `Telefonnummer ${mieter.telefon} wird gewählt.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Keine Kontaktdaten verfügbar",
        description: `Für ${mieter.name} sind keine E-Mail-Adresse oder Telefonnummer hinterlegt.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMieter = (mieter: { id: string; name: string }) => {
    setMieterToDelete(mieter);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMieter = async () => {
    if (!mieterToDelete) return;

    try {
      setIsDeleting(true);
      
      // Use the server action to delete the tenant
      const { success, error } = await deleteTenantAction(mieterToDelete.id);

      if (success) {
        toast({
          title: "Erfolg",
          description: `Der Mieter "${mieterToDelete.name}" wurde erfolgreich gelöscht.`,
          variant: "default",
        });
        
        // Refresh the overview data
        refreshWohnungOverviewData();
      } else {
        toast({
          title: "Fehler",
          description: error?.message || "Der Mieter konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting mieter:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMieterToDelete(null);
    }
  };

  // Enhanced loading skeleton component with progress indicator
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Progress indicator for slow loading */}
      {isSlowLoading && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Mieter-Daten werden geladen...</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
          <p className="text-xs text-blue-600">
            Dies kann bei umfangreichen Mieter-Historien etwas dauern.
          </p>
        </div>
      )}

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCardSkeleton title="Wohnungsgröße" icon={<Ruler className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Monatsmiete" icon={<Euro className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Mieter Status" icon={<Users className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Belegung" icon={<Calendar className="h-5 w-5 text-muted-foreground" />} />
      </div>

      {/* Skeleton content */}
      <div className="space-y-4">
        
        {/* Table skeleton */}
        <div className="rounded-md border">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="p-4 rounded-full bg-red-50">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">Fehler beim Laden</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {wohnungOverviewError || 'Die Wohnungs-Übersicht konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'}
        </p>
        {loadingStartTime && (
          <p className="text-xs text-gray-500">
            Ladezeit überschritten (max. 2 Sekunden)
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>
        <Button 
          onClick={() => closeWohnungOverviewModal()} 
          variant="ghost"
          className="text-gray-600"
        >
          Schließen
        </Button>
      </div>
    </div>
  );

  // Summary cards component
  const SummaryCards = () => {
    if (!wohnungOverviewData) return null;

    const activeTenants = wohnungOverviewData.mieter?.filter(m => m.status === 'active').length || 0;
    const totalTenants = wohnungOverviewData.mieter?.length || 0;
    const pricePerSqm = wohnungOverviewData.groesse > 0 ? wohnungOverviewData.miete / wohnungOverviewData.groesse : 0;
    
    // Find current tenant for occupancy info
    const currentTenant = wohnungOverviewData.mieter?.find(m => m.status === 'active');
    const occupancyDays = currentTenant?.einzug 
      ? Math.floor((Date.now() - new Date(currentTenant.einzug).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const cards = [
      {
        title: "Wohnungsgröße",
        value: `${formatNumber(wohnungOverviewData.groesse)} m²`,
        description: `${formatCurrency(pricePerSqm)}/m²`,
        icon: <Ruler className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Monatsmiete",
        value: formatCurrency(wohnungOverviewData.miete),
        description: `${formatCurrency(wohnungOverviewData.miete * 12)}/Jahr`,
        icon: <Euro className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Mieter Status",
        value: `${activeTenants}/${totalTenants}`,
        description: activeTenants > 0 ? "Vermietet" : "Frei",
        icon: <Users className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Belegung",
        value: occupancyDays > 0 ? `${occupancyDays} Tage` : "Leer",
        description: currentTenant ? `seit ${new Date(currentTenant.einzug!).toLocaleDateString('de-DE')}` : "Keine aktiven Mieter",
        icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((card, index) => (
          <Card key={index} className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className="h-5 w-5 text-muted-foreground">
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Keine Mieter</h3>
        <p className="text-sm text-muted-foreground">
          Diese Wohnung hat noch keine Mieter.
        </p>
      </div>
    </div>
  );

  if (!isWohnungOverviewModalOpen) {
    return null;
  }

  return (
    <Dialog open={isWohnungOverviewModalOpen} onOpenChange={(open) => !open && closeWohnungOverviewModal()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {wohnungOverviewData ? `Wohnungs-Übersicht: ${wohnungOverviewData.name}` : 'Wohnungs-Übersicht'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {wohnungOverviewError ? (
              "Es ist ein Fehler beim Laden der Wohnungs-Übersicht aufgetreten."
            ) : wohnungOverviewData ? (
              `Detaillierte Übersicht für ${wohnungOverviewData.name} mit Mietern und Informationen.`
            ) : (
              "Lade Wohnungs-Übersicht mit Mietern und Informationen."
            )}
          </DialogDescription>
          {wohnungOverviewData && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Haus: {wohnungOverviewData.hausName}</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {wohnungOverviewLoading ? (
            <LoadingSkeleton />
          ) : wohnungOverviewError ? (
            <ErrorState />
          ) : !wohnungOverviewData?.mieter?.length ? (
            <div className="space-y-6">
              <SummaryCards />
              <EmptyState />
            </div>
          ) : (
            <div className="h-full overflow-auto space-y-6">
              <SummaryCards />
              <div className="rounded-md border">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Einzug</TableHead>
                        <TableHead>Auszug</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead className="w-[140px]">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wohnungOverviewData.mieter.map((mieter) => (
                        <ContextMenu key={mieter.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow className="hover:bg-gray-50 cursor-context-menu">
                              <TableCell className="font-medium">{mieter.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    mieter.status === 'active'
                                      ? "bg-green-50 text-green-700 hover:bg-green-50"
                                      : "bg-gray-50 text-gray-700 hover:bg-gray-50"
                                  }
                                >
                                  {mieter.status === 'active' ? 'aktiv' : 'ausgezogen'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {mieter.einzug ? (
                                  new Date(mieter.einzug).toLocaleDateString('de-DE')
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {mieter.auszug ? (
                                  new Date(mieter.auszug).toLocaleDateString('de-DE')
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {mieter.email ? (
                                  <a 
                                    href={`mailto:${mieter.email}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {mieter.email}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {mieter.telefon ? (
                                  <a 
                                    href={`tel:${mieter.telefon}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {mieter.telefon}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMieter(mieter);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Mieter bearbeiten"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewMieterDetails(mieter);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Details anzeigen"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContactMieter(mieter);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title={
                                      mieter.email && mieter.email.trim() !== '' 
                                        ? `E-Mail an ${mieter.email}` 
                                        : mieter.telefon && mieter.telefon.trim() !== ''
                                        ? `Anrufen: ${mieter.telefon}`
                                        : "Keine Kontaktdaten verfügbar"
                                    }
                                    disabled={(!mieter.email || mieter.email.trim() === '') && (!mieter.telefon || mieter.telefon.trim() === '')}
                                  >
                                    {mieter.email && mieter.email.trim() !== '' ? (
                                      <Mail className="h-4 w-4" />
                                    ) : mieter.telefon && mieter.telefon.trim() !== '' ? (
                                      <Phone className="h-4 w-4" />
                                    ) : (
                                      <Mail className="h-4 w-4 opacity-50" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-64">
                            <ContextMenuItem 
                              onClick={() => handleEditMieter(mieter)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Bearbeiten</span>
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleContactMieter(mieter)}
                              className="flex items-center gap-2 cursor-pointer"
                              disabled={(!mieter.email || mieter.email.trim() === '') && (!mieter.telefon || mieter.telefon.trim() === '')}
                            >
                              {mieter.email && mieter.email.trim() !== '' ? (
                                <Mail className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              <span>Kontaktieren</span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem 
                              onClick={() => handleDeleteMieter(mieter)}
                              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Löschen</span>
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mieter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Mieter "{mieterToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMieter} 
              disabled={isDeleting} 
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}