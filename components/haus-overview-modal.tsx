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
import { useModalStore } from "@/hooks/use-modal-store";
import { formatNumber, formatCurrency } from "@/utils/format";
import { Edit, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  } = useModalStore();

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

  const handleEditWohnung = (wohnung: { id: string; name: string; groesse: number; miete: number }) => {
    // Open the existing Wohnung edit modal
    openWohnungModal(wohnung);
  };

  const handleViewWohnungDetails = (wohnung: { id: string; name: string }) => {
    // For now, just show a toast - this could be extended to navigate to a detail view
    toast({
      title: "Wohnung Details",
      description: `Details für Wohnung "${wohnung.name}" werden angezeigt.`,
      variant: "default",
    });
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {hausOverviewError || 'Die Haus-Übersicht konnte nicht geladen werden.'}
        </p>
      </div>
      <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Erneut versuchen
      </Button>
    </div>
  );

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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {hausOverviewData ? `Haus-Übersicht: ${hausOverviewData.name}` : 'Haus-Übersicht'}
          </DialogTitle>
          {hausOverviewData && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {hausOverviewData.strasse && `${hausOverviewData.strasse}, `}
                {hausOverviewData.ort}
              </p>
              {hausOverviewData.size && (
                <p>Größe: {hausOverviewData.size}</p>
              )}
              <p className="font-medium">
                Wohnungen gesamt: {hausOverviewData.wohnungen?.length || 0}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {hausOverviewLoading ? (
            <LoadingSkeleton />
          ) : hausOverviewError ? (
            <ErrorState />
          ) : !hausOverviewData?.wohnungen?.length ? (
            <EmptyState />
          ) : (
            <div className="h-full overflow-auto">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
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
                      <TableRow key={wohnung.id} className="hover:bg-gray-50">
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
                              onClick={() => handleEditWohnung(wohnung)}
                              className="h-8 w-8 p-0"
                              title="Wohnung bearbeiten"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewWohnungDetails(wohnung)}
                              className="h-8 w-8 p-0"
                              title="Details anzeigen"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}