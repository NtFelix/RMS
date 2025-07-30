"use client"

import { useState, useMemo, useCallback } from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { AbrechnungModal } from "./abrechnung-modal"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import { Nebenkosten, Mieter, Wasserzaehler, Rechnung, Haus } from "../lib/data-fetching"
import { Edit, Trash2, FileText, Droplets } from "lucide-react"
import { OperatingCostsOverviewModal } from "./operating-costs-overview-modal"
import { getMieterForNebenkostenAction, saveWasserzaehlerData, getWasserzaehlerRecordsAction, getRechnungenForNebenkostenAction } from "@/app/betriebskosten-actions"
import { toast } from "sonner"
import { useModalStore } from "@/hooks/use-modal-store"
import { DataTable } from "@/components/data-table"

interface OperatingCostsTableProps {
  nebenkosten: Nebenkosten[]
  onEdit?: (item: Nebenkosten) => void
  onDeleteItem: (id: string) => void
  ownerName: string
  allHaeuser: Haus[]
  searchQuery: string
}

export function OperatingCostsTable({
  nebenkosten,
  onEdit,
  onDeleteItem,
  ownerName,
  allHaeuser,
  searchQuery,
}: OperatingCostsTableProps) {
  const { openWasserzaehlerModal } = useModalStore()
  const [overviewItem, setOverviewItem] = useState<Nebenkosten | null>(null)
  const [isLoadingDataForModal, setIsLoadingDataForModal] = useState(false)
  const [selectedNebenkostenItem, setSelectedNebenkostenItem] = useState<Nebenkosten | null>(null)
  const [isAbrechnungModalOpen, setIsAbrechnungModalOpen] = useState(false)
  const [selectedNebenkostenForAbrechnung, setSelectedNebenkostenForAbrechnung] = useState<Nebenkosten | null>(null)
  const [tenantsForAbrechnungModal, setTenantsForAbrechnungModal] = useState<Mieter[]>([])
  const [isLoadingAbrechnungData, setIsLoadingAbrechnungData] = useState(false)
  const [rechnungenForAbrechnungModal, setRechnungenForAbrechnungModal] = useState<Rechnung[]>([])
  const [wasserzaehlerReadingsForAbrechnungModal, setWasserzaehlerReadingsForAbrechnungModal] = useState<Wasserzaehler[]>([])
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-"
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }
  
  const handleOpenOverview = (item: Nebenkosten) => setOverviewItem(item)
  const handleCloseOverview = () => setOverviewItem(null)

  const handleOpenWasserzaehlerModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht gefunden.")
      return
    }
    setIsLoadingDataForModal(true)
    setSelectedNebenkostenItem(item)
    try {
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr)
      if (mieterResult.success && mieterResult.data) {
        const existingReadingsResult = await getWasserzaehlerRecordsAction(item.id)
        const existingReadings = existingReadingsResult.success ? existingReadingsResult.data : null
        if (!existingReadingsResult.success) {
          toast.error(`Fehler beim Laden vorhandener Zählerstände: ${existingReadingsResult.message || "Unbekannter Fehler"}`)
        }
        openWasserzaehlerModal(item, mieterResult.data, existingReadings, handleSaveWasserzaehler)
      } else {
        toast.error(`Fehler beim Laden der Mieterdaten: ${mieterResult.message || "Unbekannter Fehler"}`)
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten aufgetreten.")
    } finally {
      setIsLoadingDataForModal(false)
    }
  }

  const handleSaveWasserzaehler = async (data: any) => {
    try {
      const result = await saveWasserzaehlerData(data)
      if (result.success) {
        toast.success("Wasserzählerdaten erfolgreich gespeichert!")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      if (error instanceof Error) throw error
      else throw new Error("Ein unerwarteter Fehler ist aufgetreten.")
    }
  }

  const handleOpenAbrechnungModal = async (item: Nebenkosten) => {
    if (!item.haeuser_id || !item.jahr) {
      toast.error("Haus-ID oder Jahr für Nebenkostenabrechnung nicht für Abrechnung gefunden.")
      return
    }
    setIsLoadingAbrechnungData(true)
    setSelectedNebenkostenForAbrechnung(item)
    try {
      const mieterResult = await getMieterForNebenkostenAction(item.haeuser_id, item.jahr)
      const rechnungenResult = await getRechnungenForNebenkostenAction(item.id)
      const wasserzaehlerResult = await getWasserzaehlerRecordsAction(item.id)

      setTenantsForAbrechnungModal(mieterResult.success ? mieterResult.data || [] : [])
      setRechnungenForAbrechnungModal(rechnungenResult.success ? rechnungenResult.data || [] : [])
      setWasserzaehlerReadingsForAbrechnungModal(wasserzaehlerResult.success ? wasserzaehlerResult.data || [] : [])

      if (!mieterResult.success) toast.error(`Fehler beim Laden der Mieterdaten für Abrechnung: ${mieterResult.message || "Unbekannter Fehler"}`)
      if (!rechnungenResult.success) toast.error(`Fehler beim Laden der Rechnungen: ${rechnungenResult.message || "Keine Rechnungen gefunden oder Fehler."}`)
      if (!wasserzaehlerResult.success) toast.error(`Fehler beim Laden der Wasserzählerstände: ${wasserzaehlerResult.message || "Keine Daten gefunden oder Fehler."}`)

      setIsAbrechnungModalOpen(true)
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist beim Abrufen der Daten für die Abrechnung aufgetreten.")
    } finally {
      setIsLoadingAbrechnungData(false)
    }
  }

  const handleCloseAbrechnungModal = () => {
    setIsAbrechnungModalOpen(false)
    setSelectedNebenkostenForAbrechnung(null)
    setTenantsForAbrechnungModal([])
    setRechnungenForAbrechnungModal([])
    setWasserzaehlerReadingsForAbrechnungModal([])
  }

  const columns = useMemo(() => [
    { key: "jahr", header: "Jahr" },
    { key: "Haeuser", header: "Haus" },
    { key: "nebenkostenart", header: "Kostenarten" },
    { key: "betrag", header: "Beträge" },
    { key: "berechnungsart", header: "Berechnungsarten" },
    { key: "wasserkosten", header: "Wasserkosten" },
  ], [])

  const renderRow = useCallback((item: Nebenkosten) => (
    <ContextMenu key={item.id}>
      <ContextMenuTrigger asChild>
        <TableRow onClick={() => onEdit?.(item)} className="cursor-pointer hover:bg-muted/50">
          <TableCell className="font-medium">{item.jahr || '-'}</TableCell>
          <TableCell>{item.Haeuser?.name || 'N/A'}</TableCell>
          <TableCell>{item.nebenkostenart?.join(", ") || '-'}</TableCell>
          <TableCell>{item.betrag?.map(b => formatCurrency(b)).join(", ") || '-'}</TableCell>
          <TableCell>{item.berechnungsart?.join(", ") || '-'}</TableCell>
          <TableCell>{formatCurrency(item.wasserkosten)}</TableCell>
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenOverview(item); }} className="flex items-center gap-2 cursor-pointer">
          <FileText className="h-4 w-4" /><span>Übersicht</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(item); }} className="flex items-center gap-2 cursor-pointer">
          <Edit className="h-4 w-4" /><span>Bearbeiten</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenWasserzaehlerModal(item); }} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingDataForModal && selectedNebenkostenItem?.id === item.id}>
          <Droplets className="h-4 w-4" /><span>{isLoadingDataForModal && selectedNebenkostenItem?.id === item.id ? "Lade Mieter..." : "Wasserzähler"}</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleOpenAbrechnungModal(item); }} className="flex items-center gap-2 cursor-pointer" disabled={isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id}>
          <FileText className="h-4 w-4" /><span>{isLoadingAbrechnungData && selectedNebenkostenForAbrechnung?.id === item.id ? "Lade Daten..." : "Abrechnung erstellen"}</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-500 dark:focus:text-red-500 dark:focus:bg-red-900/50">
          <Trash2 className="h-4 w-4" /><span>Löschen</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ), [onEdit, onDeleteItem, isLoadingDataForModal, selectedNebenkostenItem, isLoadingAbrechnungData, selectedNebenkostenForAbrechnung])

  return (
    <>
      <DataTable
        data={nebenkosten}
        columns={columns as any}
        searchQuery={searchQuery}
        filter={""}
        renderRow={renderRow}
        onEdit={(item) => onEdit?.(item as Nebenkosten)}
        onDelete={(item) => onDeleteItem((item as Nebenkosten).id)}
      />
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
    </>
  )
}
