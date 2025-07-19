"use client"

import { useState, useMemo } from "react"
import { AbrechnungModal } from "./abrechnung-modal"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import { Nebenkosten, Mieter, WasserzaehlerFormData, Wasserzaehler, Rechnung, Haus } from "../lib/data-fetching"
import { Edit, Trash2, FileText, Droplets, ArrowUpDown } from "lucide-react"
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal"
import { getMieterForNebenkostenAction, saveWasserzaehlerData, getWasserzaehlerRecordsAction, getRechnungenForNebenkostenAction } from "@/app/betriebskosten-actions"
import { toast } from "sonner"
import { useModalStore } from "@/hooks/use-modal-store"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"

interface OperatingCostsTableProps {
  nebenkosten: Nebenkosten[];
  onEdit?: (item: Nebenkosten) => void;
  onDeleteItem: (id: string) => void;
  ownerName: string;
  allHaeuser: Haus[];
}

export function OperatingCostsTable({
  nebenkosten,
  onEdit,
  onDeleteItem,
  ownerName,
  allHaeuser
}: OperatingCostsTableProps) {
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
        if (!existingReadingsResult.success) {
          toast.error(`Fehler beim Laden vorhandener Zählerstände: ${existingReadingsResult.message || "Unbekannter Fehler"}`);
        }
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
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht für Abrechnung gefunden.");
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
        setRechnungenForAbrechnungModal(rechnungenResult.success && rechnungenResult.data ? rechnungenResult.data : []);
        setWasserzaehlerReadingsForAbrechnungModal(wasserzaehlerResult.success && wasserzaehlerResult.data ? wasserzaehlerResult.data : []);
        setIsAbrechnungModalOpen(true);
      } else {
        toast.error(`Fehler beim Laden der Mieterdaten für Abrechnung: ${mieterResult.message || "Unbekannter Fehler"}`);
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

  const columns: ColumnDef<Nebenkosten>[] = useMemo(() => [
    {
      accessorKey: "jahr",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Jahr <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              onClick={() => onEdit?.(row.original)}
              className="cursor-pointer hover:bg-muted/50 p-2 rounded"
            >
              {row.original.jahr || '-'}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem onClick={() => handleOpenOverview(row.original)} className="flex items-center gap-2 cursor-pointer"><FileText className="h-4 w-4" /><span>Übersicht</span></ContextMenuItem>
            <ContextMenuItem onClick={() => onEdit?.(row.original)} className="flex items-center gap-2 cursor-pointer"><Edit className="h-4 w-4" /><span>Bearbeiten</span></ContextMenuItem>
            <ContextMenuItem onClick={() => handleOpenWasserzaehlerModal(row.original)} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingDataForModal && selectedNebenkostenItem?.id === row.original.id}><Droplets className="h-4 w-4" /><span>{isLoadingDataForModal && selectedNebenkostenItem?.id === row.original.id ? "Lade Mieter..." : "Wasserzähler"}</span></ContextMenuItem>
            <ContextMenuItem onClick={() => handleOpenAbrechnungModal(row.original)} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === row.original.id}><FileText className="h-4 w-4" /><span>{isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === row.original.id ? "Lade Daten..." : "Abrechnung erstellen"}</span></ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onDeleteItem(row.original.id)} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-900/50"><Trash2 className="h-4 w-4" /><span>Löschen</span></ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    },
    { accessorKey: "Haeuser.name", header: "Haus" },
    { accessorKey: "nebenkostenart", header: "Kostenarten", cell: ({ row }) => <div>{row.original.nebenkostenart?.map((art, idx) => <div key={idx}>{art || '-'}</div>)}</div> },
    { accessorKey: "betrag", header: "Beträge", cell: ({ row }) => <div>{row.original.betrag?.map((b, idx) => <div key={idx}>{formatCurrency(b)}</div>)}</div> },
    { accessorKey: "berechnungsart", header: "Berechnungsarten", cell: ({ row }) => <div>{row.original.berechnungsart?.map((ba, idx) => <div key={idx}>{ba || '-'}</div>)}</div> },
    { accessorKey: "wasserkosten", header: "Wasserkosten", cell: ({ row }) => formatCurrency(row.original.wasserkosten) },
  ], [isLoadingDataForModal, selectedNebenkostenItem, isLoadingAbrechnungData, selectedNebenkostenForAbrechnung, onEdit, onDeleteItem]);

  return (
    <div>
      <DataTable columns={columns} data={nebenkosten} />
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
          ownerAddress={allHaeuser.find(h => h.id === selectedNebenkostenForAbrechnung.haeuser_id)?.strasse || "Platzhalter Adresse"}
        />
      )}
    </div>
  )
}
