"use client";

import { useState, useMemo } from "react";
import { AbrechnungModal } from "./abrechnung-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Nebenkosten, Mieter, WasserzaehlerFormData, Wasserzaehler, Rechnung, Haus } from "../lib/data-fetching";
import { Edit, Trash2, FileText, Droplets, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal";
import { getMieterForNebenkostenAction, saveWasserzaehlerData, getWasserzaehlerRecordsAction, getRechnungenForNebenkostenAction } from "@/app/betriebskosten-actions";
import { toast } from "sonner";
import { useModalStore } from "@/hooks/use-modal-store";

type SortKey = keyof Nebenkosten | 'hausName' | 'totalCost';
type SortDirection = "asc" | "desc";

interface OperatingCostsTableProps {
  nebenkosten: Nebenkosten[];
  onEdit?: (item: Nebenkosten) => void;
  onDeleteItem: (id: string) => void;
  ownerName: string;
  allHaeuser: Haus[];
}

export function OperatingCostsTable({ nebenkosten, onEdit, onDeleteItem, ownerName, allHaeuser }: OperatingCostsTableProps) {
  const { openWasserzaehlerModal } = useModalStore();
  const [overviewItem, setOverviewItem] = useState<Nebenkosten | null>(null);
  const [isLoadingDataForModal, setIsLoadingDataForModal] = useState(false);
  const [selectedNebenkostenItem, setSelectedNebenkostenItem] = useState<Nebenkosten | null>(null);
  const [isAbrechnungModalOpen, setIsAbrechnungModalOpen] = useState(false);
  const [selectedNebenkostenForAbrechnung, setSelectedNebenkostenForAbrechnung] = useState<Nebenkosten | null>(null);
  const [tenantsForAbrechnungModal, setTenantsForAbrechnungModal] = useState<Mieter[]>([]);
  const [isLoadingAbrechnungData, setIsLoadingAbrechnungData] = useState(false);
  const [rechnungenForAbrechnungModal, setRechnungenForAbrechnungModal] = useState<Rechnung[]>([]);
  const [wasserzaehlerReadingsForAbrechnungModal, setWasserzaehlerReadingsForAbrechnungModal] = useState<Wasserzaehler[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("jahr");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedNebenkosten = useMemo(() => {
    let result = [...nebenkosten];
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB;
        if (sortKey === 'hausName') {
          valA = a.Haeuser?.name ?? '';
          valB = b.Haeuser?.name ?? '';
        } else if (sortKey === 'totalCost') {
          valA = (a.betrag?.reduce((sum, val) => sum + (val ?? 0), 0) ?? 0) + (a.wasserkosten ?? 0);
          valB = (b.betrag?.reduce((sum, val) => sum + (val ?? 0), 0) ?? 0) + (b.wasserkosten ?? 0);
        } else {
          valA = a[sortKey as keyof Nebenkosten];
          valB = b[sortKey as keyof Nebenkosten];
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
        return 0;
      });
    }
    return result;
  }, [nebenkosten, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: SortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div onClick={() => handleSort(sortKey)} className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2">
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  );

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };
  
  const handleOpenOverview = (item: Nebenkosten) => setOverviewItem(item);
  const handleCloseOverview = () => setOverviewItem(null);

  const handleOpenWasserzaehlerModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht gefunden.");
      return;
    }
    setIsLoadingDataForModal(true);
    setSelectedNebenkostenItem(item);
    try {
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr);
      if (mieterResult.success && mieterResult.data) {
        const existingReadingsResult = await getWasserzaehlerRecordsAction(item.id);
        const existingReadings = existingReadingsResult.success ? existingReadingsResult.data : null;
        if (!existingReadingsResult.success) toast.error(`Fehler beim Laden vorhandener Zählerstände: ${existingReadingsResult.message || "Unbekannter Fehler"}`);
        openWasserzaehlerModal(item, mieterResult.data, existingReadings, handleSaveWasserzaehler);
      } else {
        toast.error(`Fehler beim Laden der Mieterdaten: ${mieterResult.message || "Unbekannter Fehler"}`);
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten aufgetreten.");
    } finally {
      setIsLoadingDataForModal(false);
    }
  };

  const handleSaveWasserzaehler = async (data: WasserzaehlerFormData) => {
    try {
      const result = await saveWasserzaehlerData(data);
      if (result.success) {
        toast.success("Wasserzählerdaten erfolgreich gespeichert!");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      else throw new Error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  const handleOpenAbrechnungModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht gefunden.");
      return;
    }
    setIsLoadingAbrechnungData(true);
    setSelectedNebenkostenForAbrechnung(item);
    try {
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr);
      const rechnungenResult = await getRechnungenForNebenkostenAction(item.id);
      const wasserzaehlerResult = await getWasserzaehlerRecordsAction(item.id);

      if (mieterResult.success && mieterResult.data) {
        setTenantsForAbrechnungModal(mieterResult.data);
        setRechnungenForAbrechnungModal(rechnungenResult.success ? rechnungenResult.data || [] : []);
        setWasserzaehlerReadingsForAbrechnungModal(wasserzaehlerResult.success ? wasserzaehlerResult.data || [] : []);
        if (!rechnungenResult.success) toast.error(`Fehler beim Laden der Rechnungen: ${rechnungenResult.message || "Fehler"}`);
        if (!wasserzaehlerResult.success) toast.error(`Fehler beim Laden der Wasserzählerstände: ${wasserzaehlerResult.message || "Fehler"}`);
        setIsAbrechnungModalOpen(true);
      } else {
        toast.error(`Fehler beim Laden der Mieterdaten: ${mieterResult.message || "Unbekannter Fehler"}`);
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten für die Abrechnung aufgetreten.");
    } finally {
      setIsLoadingAbrechnungData(false);
    }
  };

  const handleCloseAbrechnungModal = () => {
    setIsAbrechnungModalOpen(false);
    setSelectedNebenkostenForAbrechnung(null);
    setTenantsForAbrechnungModal([]);
    setRechnungenForAbrechnungModal([]);
    setWasserzaehlerReadingsForAbrechnungModal([]);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell sortKey="jahr">Jahr</TableHeaderCell>
            <TableHeaderCell sortKey="hausName">Haus</TableHeaderCell>
            <TableHead>Kostenarten</TableHead>
            <TableHead>Beträge</TableHead>
            <TableHead>Berechnungsarten</TableHead>
            <TableHeaderCell sortKey="wasserkosten">Wasserkosten</TableHeaderCell>
            <TableHeaderCell sortKey="totalCost">Gesamtkosten</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedNebenkosten.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-24 text-center">Keine Betriebskostenabrechnungen gefunden.</TableCell></TableRow>
          ) : (
            sortedNebenkosten.map((item) => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <TableRow onClick={() => onEdit?.(item)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{item.jahr || '-'}</TableCell>
                    <TableCell>{item.Haeuser?.name || 'N/A'}</TableCell>
                    <TableCell>{item.nebenkostenart?.map((art, idx) => <div key={idx}>{art || '-'}</div>) ?? '-'}</TableCell>
                    <TableCell>{item.betrag?.map((b, idx) => <div key={idx}>{formatCurrency(b)}</div>) ?? '-'}</TableCell>
                    <TableCell>{item.berechnungsart?.map((ba, idx) => <div key={idx}>{ba || '-'}</div>) ?? '-'}</TableCell>
                    <TableCell>{formatCurrency(item.wasserkosten)}</TableCell>
                    <TableCell>{formatCurrency((item.betrag?.reduce((s, v) => s + (v ?? 0), 0) ?? 0) + (item.wasserkosten ?? 0))}</TableCell>
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenOverview(item); }} className="flex items-center gap-2 cursor-pointer"><FileText className="h-4 w-4" /><span>Übersicht</span></ContextMenuItem>
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(item); }} className="flex items-center gap-2 cursor-pointer"><Edit className="h-4 w-4" /><span>Bearbeiten</span></ContextMenuItem>
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenWasserzaehlerModal(item); }} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingDataForModal && selectedNebenkostenItem?.id === item.id}><Droplets className="h-4 w-4" /><span>{isLoadingDataForModal && selectedNebenkostenItem?.id === item.id ? "Lade Mieter..." : "Wasserzähler"}</span></ContextMenuItem>
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenAbrechnungModal(item); }} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id}><FileText className="h-4 w-4" /><span>{isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id ? "Lade Daten..." : "Abrechnung erstellen"}</span></ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-900/50"><Trash2 className="h-4 w-4" /><span>Löschen</span></ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))
          )}
        </TableBody>
      </Table>
      {overviewItem && <OperatingCostsOverviewModal isOpen={!!overviewItem} onClose={handleCloseOverview} nebenkosten={overviewItem} />}
      {selectedNebenkostenForAbrechnung && (
        <AbrechnungModal
          isOpen={isAbrechnungModalOpen}
          onClose={handleCloseAbrechnungModal}
          nebenkostenItem={selectedNebenkostenForAbrechnung}
          tenants={tenantsForAbrechnungModal}
          rechnungen={rechnungenForAbrechnungModal}
          wasserzaehlerReadings={wasserzaehlerReadingsForAbrechnungModal}
          ownerName={ownerName}
          ownerAddress={(() => {
            const selectedHaus = allHaeuser.find(h => h.id === selectedNebenkostenForAbrechnung.haeuser_id);
            return selectedHaus ? `${selectedHaus.strasse}, ${selectedHaus.ort}` : "Platzhalter Adresse";
          })()}
        />
      )}
    </div>
  );
}
