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
import { Edit, Eye, Phone, Mail, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    openTenantModal,
  } = useModalStore();

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

  const handleEditMieter = (mieter: { id: string; name: string; email?: string; telefon?: string }) => {
    // Open the existing Tenant edit modal
    openTenantModal(mieter);
  };

  const handleViewMieterDetails = (mieter: { id: string; name: string }) => {
    // For now, just show a toast - this could be extended to navigate to a detail view
    toast({
      title: "Mieter Details",
      description: `Details für Mieter "${mieter.name}" werden angezeigt.`,
      variant: "default",
    });
  };

  const handleContactMieter = (mieter: { id: string; name: string; email?: string; telefon?: string }) => {
    if (mieter.email) {
      window.location.href = `mailto:${mieter.email}`;
    } else if (mieter.telefon) {
      window.location.href = `tel:${mieter.telefon}`;
    } else {
      toast({
        title: "Keine Kontaktdaten",
        description: `Für Mieter "${mieter.name}" sind keine Kontaktdaten hinterlegt.`,
        variant: "destructive",
      });
    }
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
          {wohnungOverviewError || 'Die Wohnungs-Übersicht konnte nicht geladen werden.'}
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
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {wohnungOverviewData ? `Wohnungs-Übersicht: ${wohnungOverviewData.name}` : 'Wohnungs-Übersicht'}
          </DialogTitle>
          {wohnungOverviewData && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Haus: {wohnungOverviewData.hausName}
              </p>
              <p>
                Größe: {formatNumber(wohnungOverviewData.groesse)} m² • 
                Miete: {formatCurrency(wohnungOverviewData.miete)} • 
                Miete pro m²: {formatCurrency(wohnungOverviewData.miete / wohnungOverviewData.groesse)}
              </p>
              <p className="font-medium">
                Mieter gesamt: {wohnungOverviewData.mieter?.length || 0}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {wohnungOverviewLoading ? (
            <LoadingSkeleton />
          ) : wohnungOverviewError ? (
            <ErrorState />
          ) : !wohnungOverviewData?.mieter?.length ? (
            <EmptyState />
          ) : (
            <div className="h-full overflow-auto">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
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
                      <TableRow key={mieter.id} className="hover:bg-gray-50">
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
                              onClick={() => handleEditMieter(mieter)}
                              className="h-8 w-8 p-0"
                              title="Mieter bearbeiten"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewMieterDetails(mieter)}
                              className="h-8 w-8 p-0"
                              title="Details anzeigen"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleContactMieter(mieter)}
                              className="h-8 w-8 p-0"
                              title="Kontaktieren"
                              disabled={!mieter.email && !mieter.telefon}
                            >
                              {mieter.email ? (
                                <Mail className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
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