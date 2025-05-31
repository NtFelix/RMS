"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu"
import { Nebenkosten, Mieter, WasserzaehlerFormData } from "../lib/data-fetching" // Adjusted path
import { Edit, Trash2, FileText, Droplets } from "lucide-react" // Added Droplets
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal"
import { WasserzaehlerModal } from "./wasserzaehler-modal" // Added
import { getMieterForNebenkostenAction, saveWasserzaehlerData } from "@/app/betriebskosten-actions" // Adjusted path
import { toast } from "sonner" // For notifications


interface OperatingCostsTableProps {
  nebenkosten: Nebenkosten[]; 
  onEdit?: (item: Nebenkosten) => void; 
  onDeleteItem: (id: string) => void;
}

export function OperatingCostsTable({ nebenkosten, onEdit, onDeleteItem }: OperatingCostsTableProps) {
  const [overviewItem, setOverviewItem] = useState<Nebenkosten | null>(null);
  const [isWasserzaehlerModalOpen, setIsWasserzaehlerModalOpen] = useState(false);
  const [selectedNebenkostenItem, setSelectedNebenkostenItem] = useState<Nebenkosten | null>(null);
  const [mieterForModal, setMieterForModal] = useState<Mieter[]>([]);
  const [isLoadingDataForModal, setIsLoadingDataForModal] = useState(false);
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };
  
  const handleOpenOverview = (item: Nebenkosten) => {
    setOverviewItem(item);
  };
  
  const handleCloseOverview = () => {
    setOverviewItem(null);
  }; 

  const handleOpenWasserzaehlerModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht gefunden.");
      return;
    }
    setIsLoadingDataForModal(true);
    setSelectedNebenkostenItem(item); // Set this early for the loading indicator text
    try {
      // Call the new server action
      const result = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr);

      if (result.success && result.data) {
        setMieterForModal(result.data);
        setIsWasserzaehlerModalOpen(true);
      } else {
        console.error("Error fetching mieter via action:", result.message);
        toast.error(`Fehler beim Laden der Mieterdaten: ${result.message || "Unbekannter Fehler"}`);
        // Do not open modal if data fetching failed
        // setSelectedNebenkostenItem(null); // Optionally clear selection if modal won't open
      }
    } catch (error) { // Catch errors from the action call itself (e.g., network issues)
      console.error("Error calling getMieterForNebenkostenAction:", error);
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Mieterdaten aufgetreten.");
      // setSelectedNebenkostenItem(null); // Optionally clear selection
    } finally {
      setIsLoadingDataForModal(false);
    }
  };

  const handleSaveWasserzaehler = async (data: WasserzaehlerFormData) => {
    // setIsLoadingDataForModal(true); // Or a specific saving state
    try {
      const result = await saveWasserzaehlerData(data);
      if (result.success) {
        toast.success("Wasserzählerdaten erfolgreich gespeichert!");
        setIsWasserzaehlerModalOpen(false);
        // Optionally, re-fetch Nebenkosten list or update the specific item if display changes
      } else {
        toast.error(`Fehler beim Speichern: ${result.message}`);
      }
    } catch (error) {
      console.error("Error calling saveWasserzaehlerData:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      // setIsLoadingDataForModal(false);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jahr</TableHead>
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
                    <TableCell className="font-medium">{item.jahr || '-'}</TableCell>
                    <TableCell>{item.Haeuser?.name || 'N/A'}</TableCell>
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
                    disabled={isLoadingDataForModal && selectedNebenkostenItem?.id === item.id}
                  >
                    <Droplets className="h-4 w-4" />
                    <span>{isLoadingDataForModal && selectedNebenkostenItem?.id === item.id ? "Lade Mieter..." : "Wasserzähler"}</span>
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

      {/* Wasserzaehler Modal */}
      {selectedNebenkostenItem && (
        <WasserzaehlerModal
          isOpen={isWasserzaehlerModalOpen}
          onClose={() => setIsWasserzaehlerModalOpen(false)}
          nebenkosten={selectedNebenkostenItem}
          mieterList={mieterForModal}
          onSave={handleSaveWasserzaehler}
          // existingWasserzaehlerData={...} // If you implement pre-filling
        />
      )}
    </div>
  )
}
