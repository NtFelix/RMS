"use client"

import { useState } from "react"
import { AbrechnungModal } from "./abrechnung-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu"
import { Nebenkosten, Mieter, WasserzaehlerFormData, Wasserzaehler, Rechnung } from "../lib/data-fetching" // Adjusted path, Added Rechnung
import { Edit, Trash2, FileText, Droplets } from "lucide-react" // Removed Calculator
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal"
import { WasserzaehlerModal } from "./wasserzaehler-modal" // Added
import { getMieterForNebenkostenAction, saveWasserzaehlerData, getWasserzaehlerRecordsAction, getRechnungenForNebenkostenAction } from "@/app/betriebskosten-actions" // Adjusted path, Added getRechnungenForNebenkostenAction
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
  const [existingWasserzaehlerRecords, setExistingWasserzaehlerRecords] = useState<Wasserzaehler[] | null>(null);
  const [isAbrechnungModalOpen, setIsAbrechnungModalOpen] = useState(false);
  const [selectedNebenkostenForAbrechnung, setSelectedNebenkostenForAbrechnung] = useState<Nebenkosten | null>(null);
  const [tenantsForAbrechnungModal, setTenantsForAbrechnungModal] = useState<Mieter[]>([]);
  const [isLoadingAbrechnungData, setIsLoadingAbrechnungData] = useState(false);
  const [rechnungenForAbrechnungModal, setRechnungenForAbrechnungModal] = useState<Rechnung[]>([]);
  
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
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr);

      if (mieterResult.success && mieterResult.data) {
        setMieterForModal(mieterResult.data);

        // Fetch existing Wasserzaehler records
        const existingReadingsResult = await getWasserzaehlerRecordsAction(item.id); // item.id is nebenkosten_id

        if (existingReadingsResult.success && existingReadingsResult.data) {
          setExistingWasserzaehlerRecords(existingReadingsResult.data);
        } else {
          console.error("Error fetching existing Wasserzaehler records:", existingReadingsResult.message);
          toast.error(`Fehler beim Laden vorhandener Zählerstände: ${existingReadingsResult.message || "Unbekannter Fehler"}`);
          setExistingWasserzaehlerRecords(null); // Ensure it's reset if fetch fails
        }
        setIsWasserzaehlerModalOpen(true); // Open modal after all data is fetched (or attempted)
      } else {
        console.error("Error fetching mieter via action:", mieterResult.message);
        toast.error(`Fehler beim Laden der Mieterdaten: ${mieterResult.message || "Unbekannter Fehler"}`);
        setMieterForModal([]); // Ensure mieter list is empty if it failed
        setExistingWasserzaehlerRecords(null); // Reset existing records too
      }
    } catch (error) { // Catch errors from the action call itself (e.g., network issues)
      console.error("Error calling getMieterForNebenkostenAction or getWasserzaehlerRecordsAction:", error);
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten aufgetreten.");
      setExistingWasserzaehlerRecords(null);
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

  const handleOpenAbrechnungModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht für Abrechnung gefunden.");
      return;
    }
    setIsLoadingAbrechnungData(true);
    setSelectedNebenkostenForAbrechnung(item);
    try {
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr);
      if (mieterResult.success && mieterResult.data) {
        setTenantsForAbrechnungModal(mieterResult.data);

        // Fetch Rechnungen for the Nebenkosten item
        const rechnungenResult = await getRechnungenForNebenkostenAction(item.id);
        if (rechnungenResult.success && rechnungenResult.data) {
          setRechnungenForAbrechnungModal(rechnungenResult.data);
        } else {
          toast.error(`Fehler beim Laden der Rechnungen: ${rechnungenResult.message || "Keine Rechnungen gefunden oder Fehler."}`);
          setRechnungenForAbrechnungModal([]); // Ensure it's empty if fetch fails or no data
        }
        setIsAbrechnungModalOpen(true); // Open modal only after all data is fetched
      } else {
        toast.error(`Fehler beim Laden der Mieterdaten für Abrechnung: ${mieterResult.message || "Unbekannter Fehler"}`);
        setTenantsForAbrechnungModal([]);
        setRechnungenForAbrechnungModal([]); // Also clear rechnungen if mieter fetch fails
      }
    } catch (error) {
      console.error("Error calling getMieterForNebenkostenAction or getRechnungenForNebenkostenAction for Abrechnung:", error);
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten für die Abrechnung aufgetreten.");
      setTenantsForAbrechnungModal([]);
      setRechnungenForAbrechnungModal([]);
    } finally {
      setIsLoadingAbrechnungData(false);
    }
  };

  const handleCloseAbrechnungModal = () => {
    setIsAbrechnungModalOpen(false);
    setSelectedNebenkostenForAbrechnung(null);
    setTenantsForAbrechnungModal([]);
    setRechnungenForAbrechnungModal([]); // Clear Rechnungen data on close
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

      {/* Wasserzaehler Modal */}
      {selectedNebenkostenItem && (
        <WasserzaehlerModal
          isOpen={isWasserzaehlerModalOpen}
          onClose={() => {
            setIsWasserzaehlerModalOpen(false);
            setSelectedNebenkostenItem(null); // Also clear selected item
            setExistingWasserzaehlerRecords(null); // Clear existing records on close
          }}
          nebenkosten={selectedNebenkostenItem}
          mieterList={mieterForModal}
          onSave={handleSaveWasserzaehler}
          existingReadings={existingWasserzaehlerRecords} // New prop
        />
      )}

      {/* Abrechnung Modal */}
      {selectedNebenkostenForAbrechnung && (
        <AbrechnungModal
          isOpen={isAbrechnungModalOpen}
          onClose={handleCloseAbrechnungModal}
          nebenkostenItem={selectedNebenkostenForAbrechnung}
          tenants={tenantsForAbrechnungModal}
          rechnungen={rechnungenForAbrechnungModal} // Pass the Rechnungen data
        />
      )}
    </div>
  )
}
