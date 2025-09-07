"use client"

import { useState, useMemo, useCallback } from "react"
import { AbrechnungModal } from "./abrechnung-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu"
import { Nebenkosten, Mieter, WasserzaehlerFormData, Wasserzaehler, Rechnung, Haus } from "../lib/data-fetching" // Adjusted path, Added Rechnung and Haus
import { OptimizedNebenkosten, WasserzaehlerModalData, AbrechnungModalData } from "@/types/optimized-betriebskosten";
import { isoToGermanDate } from "@/utils/date-calculations"
import { Edit, Trash2, FileText, Droplets } from "lucide-react" // Removed Calculator
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal"
import { WasserzaehlerModal } from "./wasserzaehler-modal" // Added
import { saveWasserzaehlerDataOptimized, getWasserzaehlerModalDataAction, getAbrechnungModalDataAction } from "@/app/betriebskosten-actions" // Updated to use optimized actions
import { toast } from "sonner" // For notifications
import { useModalStore } from "@/hooks/use-modal-store"
import { MobileFilterButton, FilterOption } from "@/components/mobile/mobile-filter-button"
import { MobileSearchBar } from "@/components/mobile/mobile-search-bar"
import { useIsMobile } from "@/hooks/use-mobile"


interface OperatingCostsTableProps {
  nebenkosten: OptimizedNebenkosten[]; 
  onEdit?: (item: OptimizedNebenkosten) => void; 
  onDeleteItem: (id: string) => void;
  ownerName: string;
  allHaeuser: Haus[];
  filter?: string;
  searchQuery?: string;
  onFilterChange?: (filter: string) => void;
  onSearchChange?: (search: string) => void;
}

export function OperatingCostsTable({
  nebenkosten,
  onEdit,
  onDeleteItem,
  ownerName,
  allHaeuser,
  filter = 'all',
  searchQuery = '',
  onFilterChange,
  onSearchChange
}: OperatingCostsTableProps) {
  const { openWasserzaehlerModalOptimized } = useModalStore();
  const [overviewItem, setOverviewItem] = useState<OptimizedNebenkosten | null>(null);
  const [isLoadingWasserzaehlerModal, setIsLoadingWasserzaehlerModal] = useState(false);
  const [selectedNebenkostenItem, setSelectedNebenkostenItem] = useState<OptimizedNebenkosten | null>(null);
  const [isAbrechnungModalOpen, setIsAbrechnungModalOpen] = useState(false);
  const [selectedNebenkostenForAbrechnung, setSelectedNebenkostenForAbrechnung] = useState<OptimizedNebenkosten | null>(null);
  const [abrechnungModalData, setAbrechnungModalData] = useState<AbrechnungModalData | null>(null);
  const [isLoadingAbrechnungData, setIsLoadingAbrechnungData] = useState(false);
  const isMobile = useIsMobile();
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Mobile filter options
  const filterOptions: FilterOption[] = useMemo(() => {
    const totalItems = nebenkosten.length
    // You can add more specific filters based on your business logic
    // For now, using basic filters similar to other tables
    return [
      { id: 'all', label: 'Alle', count: totalItems },
      { id: 'pending', label: 'Ausstehend', count: totalItems }, // Placeholder count
      { id: 'previous', label: 'Vorherige', count: 0 } // Placeholder count
    ]
  }, [nebenkosten])

  // Mobile filter handlers
  const handleMobileFilterChange = useCallback((filters: string[]) => {
    // For operating costs filters, we only allow one filter at a time
    const newFilter = filters.length > 0 ? filters[filters.length - 1] : 'all'
    onFilterChange?.(newFilter)
  }, [onFilterChange])

  const handleMobileSearchChange = useCallback((search: string) => {
    onSearchChange?.(search)
  }, [onSearchChange])

  // Get active filters for mobile filter button
  const activeFilters = useMemo(() => {
    return filter === 'all' ? [] : [filter]
  }, [filter])
  
  const handleOpenOverview = (item: OptimizedNebenkosten) => {
    setOverviewItem(item);
  };
  
  const handleCloseOverview = () => {
    setOverviewItem(null);
  }; 

  const handleOpenWasserzaehlerModal = async (item: OptimizedNebenkosten) => {
    setIsLoadingWasserzaehlerModal(true);
    setSelectedNebenkostenItem(item);
    
    try {
      // Use the optimized single server action call
      const result = await getWasserzaehlerModalDataAction(item.id);

      if (result.success && result.data) {
        // Open modal using the new optimized method with pre-structured data
        openWasserzaehlerModalOptimized(
          item,
          result.data,
          handleSaveWasserzaehler
        );
      } else {
        console.error("Error fetching Wasserzähler modal data:", result.message);
        toast.error(`Fehler beim Laden der Wasserzählerdaten: ${result.message || "Unbekannter Fehler"}`);
      }
    } catch (error) {
      console.error("Error calling getWasserzaehlerModalDataAction:", error);
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten aufgetreten.");
    } finally {
      setIsLoadingWasserzaehlerModal(false);
    }
  };

  const handleSaveWasserzaehler = async (data: WasserzaehlerFormData): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await saveWasserzaehlerDataOptimized(data);
      if (result.success) {
        toast.success(result.message || "Wasserzählerdaten erfolgreich gespeichert!");
        // Return success result to the modal
        return { success: true };
      } else {
        // Handle validation errors specifically
        if (result.validationErrors && result.validationErrors.length > 0) {
          const validationMessage = result.validationErrors.join('\n');
          toast.error(`Validierungsfehler:\n${validationMessage}`);
          return { success: false, message: `Validierungsfehler: ${validationMessage}` };
        }
        
        const errorMessage = result.message || "Die Wasserzählerstände konnten nicht gespeichert werden.";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error("Error calling saveWasserzaehlerDataOptimized:", error);
      const errorMessage = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const handleOpenAbrechnungModal = async (item: OptimizedNebenkosten) => {
    setIsLoadingAbrechnungData(true);
    setSelectedNebenkostenForAbrechnung(item);
    
    try {
      // Use the optimized single server action call
      const result = await getAbrechnungModalDataAction(item.id);

      if (result.success && result.data) {
        // Debug: log fetched data before updating state
        console.debug('[OperatingCostsTable] getAbrechnungModalDataAction success', {
          nebenkostenId: item.id,
          tenantsCount: Array.isArray(result.data.tenants) ? result.data.tenants.length : 'n/a',
          rechnungenCount: Array.isArray(result.data.rechnungen) ? result.data.rechnungen.length : 'n/a',
          wasserzaehlerCount: Array.isArray(result.data.wasserzaehler_readings) ? result.data.wasserzaehler_readings.length : 'n/a',
          firstTenant: Array.isArray(result.data.tenants) && result.data.tenants.length > 0 ? {
            id: (result.data.tenants[0] as any).id,
            name: (result.data.tenants[0] as any).name,
            wohnung_id: (result.data.tenants[0] as any).wohnung_id,
          } : null,
        });
        setAbrechnungModalData(result.data);
        setIsAbrechnungModalOpen(true);
      } else {
        console.error("Error fetching Abrechnung modal data:", result.message);
        toast.error(`Fehler beim Laden der Abrechnungsdaten: ${result.message || "Unbekannter Fehler"}`);
        setAbrechnungModalData(null);
      }
    } catch (error) {
      console.error("Error calling getAbrechnungModalDataAction:", error);
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten für die Abrechnung aufgetreten.");
      setAbrechnungModalData(null);
    } finally {
      setIsLoadingAbrechnungData(false);
    }
  };

  const handleCloseAbrechnungModal = () => {
    setIsAbrechnungModalOpen(false);
    setSelectedNebenkostenForAbrechnung(null);
    setAbrechnungModalData(null);
  };

  return (
    <div className="rounded-md border">
      {/* Mobile Filter and Search Bar */}
      {isMobile && (onFilterChange || onSearchChange) && (
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50/50">
          {onFilterChange && (
            <MobileFilterButton
              filters={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={handleMobileFilterChange}
            />
          )}
          {onSearchChange && (
            <MobileSearchBar
              value={searchQuery}
              onChange={handleMobileSearchChange}
              placeholder="Betriebskosten suchen..."
            />
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zeitraum</TableHead>
            <TableHead>Haus</TableHead>
            <TableHead>Kostenarten</TableHead>
            <TableHead>Beträge</TableHead>
            <TableHead>Berechnungsarten</TableHead>
            <TableHead>Wasserkosten</TableHead>
            {/* Removed Aktionen TableHead */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {nebenkosten.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                Keine Betriebskostenabrechnungen gefunden.
              </TableCell>
            </TableRow>
          ) : (
            nebenkosten.map((item) => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <TableRow 
                    onClick={() => onEdit?.(item)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {item.startdatum && item.enddatum 
                        ? `${isoToGermanDate(item.startdatum)} bis ${isoToGermanDate(item.enddatum)}` 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{item.haus_name || 'N/A'}</TableCell>
                    <TableCell>
                      {item.nebenkostenart && item.nebenkostenart.length > 0
                        ? item.nebenkostenart.map((art: string, idx: number) => <div key={idx}>{art || '-'}</div>)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.betrag && item.betrag.length > 0
                        ? item.betrag.map((b: number | null, idx: number) => <div key={idx}>{typeof b === 'number' ? formatCurrency(b) : '-'}</div>)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.berechnungsart && item.berechnungsart.length > 0
                        ? item.berechnungsart.map((ba: string, idx: number) => <div key={idx}>{ba || '-'}</div>)
                        : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(item.wasserkosten)}</TableCell>
                    {/* Removed Aktionen TableCell */}
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleOpenOverview(item); }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Übersicht</span>
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Bearbeiten</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenWasserzaehlerModal(item);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                    disabled={isLoadingWasserzaehlerModal && selectedNebenkostenItem?.id === item.id}
                  >
                    <Droplets className="h-4 w-4" />
                    <span>{isLoadingWasserzaehlerModal && selectedNebenkostenItem?.id === item.id ? "Lade Daten..." : "Wasserzähler"}</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAbrechnungModal(item);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                    disabled={isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id}
                  >
                    <FileText className="h-4 w-4" />
                    <span>{isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id ? "Lade Daten..." : "Abrechnung erstellen"}</span>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Löschen</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Overview Modal */}
      {overviewItem && (
        <OperatingCostsOverviewModal
          isOpen={!!overviewItem}
          onClose={handleCloseOverview}
          nebenkosten={overviewItem}
        />
      )}

      {/* Wasserzaehler Modal is now handled by the modal store */}

      {/* Abrechnung Modal */}
      {selectedNebenkostenForAbrechnung && abrechnungModalData && (
        <AbrechnungModal
          isOpen={isAbrechnungModalOpen}
          onClose={handleCloseAbrechnungModal}
          nebenkostenItem={selectedNebenkostenForAbrechnung}
          tenants={abrechnungModalData.tenants ?? []}
          rechnungen={abrechnungModalData.rechnungen ?? []}
          wasserzaehlerReadings={abrechnungModalData.wasserzaehler_readings ?? []}
          ownerName={ownerName}
          ownerAddress={(() => {
            const selectedHaus = allHaeuser.find(h => h.id === selectedNebenkostenForAbrechnung.haeuser_id);
            if (!selectedHaus) {
              return "Platzhalter Adresse";
            }
            const addressParts = [selectedHaus.strasse, selectedHaus.ort].filter(Boolean);
            return addressParts.length > 0 ? addressParts.join(', ') : "Platzhalter Adresse";
          })()}
        />
      )}
    </div>
  )
}
