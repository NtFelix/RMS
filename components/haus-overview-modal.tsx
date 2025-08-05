"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useModalStore } from "@/hooks/use-modal-store";
import { formatNumber, formatCurrency } from "@/utils/format";
import { Edit, Eye, AlertCircle, RefreshCw, Clock, Home, Users, Ruler, Euro, MapPin, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton";
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

export function HausOverviewModal() {
  const {
    isHausOverviewModalOpen,
    hausOverviewData,
    hausOverviewLoading,
    hausOverviewError,
    closeHausOverviewModal,
    setHausOverviewLoading,
    setHausOverviewError,
    setHausOverviewData,
    openWohnungModal,
    openWohnungOverviewModal,
  } = useModalStore();

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wohnungToDelete, setWohnungToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enhanced loading progress tracking
  useEffect(() => {
    if (hausOverviewLoading) {
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
        if (hausOverviewLoading) {
          setHausOverviewError('Das Laden dauert länger als erwartet. Bitte versuchen Sie es erneut.');
          setHausOverviewLoading(false);
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
  }, [hausOverviewLoading, loadingStartTime]);

  const handleRetry = async () => {
    if (!hausOverviewData?.id) return;
    
    setHausOverviewLoading(true);
    setHausOverviewError(undefined);

    try {
      const response = await fetch(`/api/haeuser/${hausOverviewData.id}/overview`);
      if (!response.ok) {
        throw new Error('Failed to fetch Haus overview data');
      }
      const data = await response.json();
      setHausOverviewData(data);
    } catch (error) {
      setHausOverviewError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setHausOverviewLoading(false);
    }
  };

  const handleEditWohnung = (wohnung: { id: string; name: string; groesse: number; miete: number; haus_id?: string }) => {
    // Prepare the wohnung data for the edit modal
    const wohnungData = {
      id: wohnung.id,
      name: wohnung.name,
      groesse: wohnung.groesse,
      miete: wohnung.miete,
      haus_id: wohnung.haus_id || hausOverviewData?.id || null
    };

    // Prepare haeuser list (current house should be included)
    const haeuser = hausOverviewData ? [{
      id: hausOverviewData.id,
      name: hausOverviewData.name
    }] : [];

    // Define success callback to refresh overview data
    const onSuccess = async () => {
      if (hausOverviewData?.id) {
        try {
          setHausOverviewLoading(true);
          const response = await fetch(`/api/haeuser/${hausOverviewData.id}/overview`);
          if (response.ok) {
            const updatedData = await response.json();
            setHausOverviewData(updatedData);
          }
        } catch (error) {
          console.error('Failed to refresh overview data:', error);
        } finally {
          setHausOverviewLoading(false);
        }
      }
    };

    // Open the Wohnung edit modal with the prepared data
    openWohnungModal(wohnungData, haeuser, onSuccess);
  };

  const handleViewWohnungDetails = (wohnung: { id: string; name: string }) => {
    // Open the Wohnung overview modal to show tenant details
    openWohnungOverviewModal(wohnung.id);
  };

  const handleDeleteWohnung = (wohnung: { id: string; name: string }) => {
    setWohnungToDelete(wohnung);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteWohnung = async () => {
    if (!wohnungToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/wohnungen/${wohnungToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: `Die Wohnung "${wohnungToDelete.name}" wurde erfolgreich gelöscht.`,
          variant: "default",
        });
        
        // Refresh the overview data
        if (hausOverviewData?.id) {
          const refreshResponse = await fetch(`/api/haeuser/${hausOverviewData.id}/overview`);
          if (refreshResponse.ok) {
            const updatedData = await refreshResponse.json();
            setHausOverviewData(updatedData);
          }
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Fehler",
          description: errorData.error || "Die Wohnung konnte nicht gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting wohnung:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setWohnungToDelete(null);
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
            <span className="text-sm font-medium">Daten werden geladen...</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
          <p className="text-xs text-blue-600">
            Dies kann bei größeren Datenmengen etwas dauern.
          </p>
        </div>
      )}

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCardSkeleton title="Gesamtfläche" icon={<Ruler className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Wohnungen" icon={<Home className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Mieter" icon={<Users className="h-5 w-5 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Gesamtmiete" icon={<Euro className="h-5 w-5 text-muted-foreground" />} />
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
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-1">
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
          {hausOverviewError || 'Die Haus-Übersicht konnte nicht geladen werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'}
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
          onClick={() => closeHausOverviewModal()} 
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
    if (!hausOverviewData) return null;

    const totalRent = hausOverviewData.wohnungen?.reduce((sum, w) => sum + w.miete, 0) || 0;
    const totalArea = hausOverviewData.wohnungen?.reduce((sum, w) => sum + w.groesse, 0) || 0;
    const occupiedCount = hausOverviewData.wohnungen?.filter(w => w.status === 'vermietet').length || 0;
    const totalApartments = hausOverviewData.wohnungen?.length || 0;

    const cards = [
      {
        title: "Gesamtfläche",
        value: `${formatNumber(totalArea)} m²`,
        description: `${formatNumber(hausOverviewData.size || 0)} m² Hausfläche`,
        icon: <Ruler className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Wohnungen",
        value: `${totalApartments}`,
        description: `${occupiedCount} vermietet, ${totalApartments - occupiedCount} frei`,
        icon: <Home className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Mieter",
        value: `${occupiedCount}`,
        description: `${((occupiedCount / Math.max(totalApartments, 1)) * 100).toFixed(0)}% Auslastung`,
        icon: <Users className="h-5 w-5 text-muted-foreground" />,
      },
      {
        title: "Gesamtmiete",
        value: formatCurrency(totalRent),
        description: totalArea > 0 ? `${formatCurrency(totalRent / totalArea)}/m²` : "Keine Fläche",
        icon: <Euro className="h-5 w-5 text-muted-foreground" />,
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
        <h3 className="text-lg font-semibold">Keine Wohnungen</h3>
        <p className="text-sm text-muted-foreground">
          Dieses Haus hat noch keine Wohnungen.
        </p>
      </div>
    </div>
  );

  if (!isHausOverviewModalOpen) {
    return null;
  }

  return (
    <Dialog open={isHausOverviewModalOpen} onOpenChange={(open) => !open && closeHausOverviewModal()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {hausOverviewData ? `Haus-Übersicht: ${hausOverviewData.name}` : 'Haus-Übersicht'}
          </DialogTitle>
          {hausOverviewData && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {hausOverviewData.strasse && `${hausOverviewData.strasse}, `}
                {hausOverviewData.ort}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {hausOverviewLoading ? (
            <LoadingSkeleton />
          ) : hausOverviewError ? (
            <ErrorState />
          ) : !hausOverviewData?.wohnungen?.length ? (
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
                        <TableHead className="w-[200px]">Wohnung</TableHead>
                        <TableHead>Größe</TableHead>
                        <TableHead>Miete</TableHead>
                        <TableHead>Miete pro m²</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktueller Mieter</TableHead>
                        <TableHead className="w-[120px]">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hausOverviewData.wohnungen.map((wohnung) => (
                        <ContextMenu key={wohnung.id}>
                          <ContextMenuTrigger asChild>
                            <TableRow className="hover:bg-gray-50 cursor-context-menu">
                              <TableCell className="font-medium">{wohnung.name}</TableCell>
                              <TableCell>{formatNumber(wohnung.groesse)} m²</TableCell>
                              <TableCell>{formatCurrency(wohnung.miete)}</TableCell>
                              <TableCell>{formatCurrency(wohnung.miete / wohnung.groesse)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    wohnung.status === 'vermietet'
                                      ? "bg-green-50 text-green-700 hover:bg-green-50"
                                      : "bg-blue-50 text-blue-700 hover:bg-blue-50"
                                  }
                                >
                                  {wohnung.status === 'vermietet' ? 'vermietet' : 'frei'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {wohnung.currentTenant ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">{wohnung.currentTenant.name}</div>
                                    {wohnung.currentTenant.einzug && (
                                      <div className="text-xs text-muted-foreground">
                                        seit {new Date(wohnung.currentTenant.einzug).toLocaleDateString('de-DE')}
                                      </div>
                                    )}
                                  </div>
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
                                      handleEditWohnung({ ...wohnung, haus_id: hausOverviewData.id });
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Wohnung bearbeiten"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewWohnungDetails(wohnung);
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Mieter-Übersicht anzeigen"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-64">
                            <ContextMenuItem 
                              onClick={() => handleEditWohnung({ ...wohnung, haus_id: hausOverviewData.id })}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Bearbeiten</span>
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleViewWohnungDetails(wohnung)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Users className="h-4 w-4" />
                              <span>Mieter-Übersicht</span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem 
                              onClick={() => handleDeleteWohnung(wohnung)}
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
            <AlertDialogTitle>Wohnung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Wohnung "{wohnungToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteWohnung} 
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