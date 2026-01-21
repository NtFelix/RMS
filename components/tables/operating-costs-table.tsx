"use client"

import React, { useState, useMemo } from "react"
import dynamic from 'next/dynamic'
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog"
import type { Nebenkosten, Mieter, Wasserzaehler, Rechnung, Haus } from "@/lib/types";
import { OptimizedNebenkosten, AbrechnungModalData } from "@/types/optimized-betriebskosten"; // Removed WasserzaehlerModalData
import { isoToGermanDate } from "@/utils/date-calculations"
import { Edit, Trash2, FileText, Droplets, ChevronsUpDown, ArrowUp, ArrowDown, Calendar, Building2, Euro, Calculator, MoreVertical, X, Download, Pencil, Loader2 } from "lucide-react"

// Lazy load modals to reduce bundle size
const AbrechnungModal = dynamic(() => import('@/components/finance/abrechnung-modal').then(mod => mod.AbrechnungModal), { ssr: false })
const OperatingCostsOverviewModal = dynamic(() => import('@/components/finance/operating-costs-overview-modal').then(mod => mod.OperatingCostsOverviewModal), { ssr: false })
const ZaehlerVerwaltungModal = dynamic(() => import('@/components/water-meters/meter-verwaltung-modal').then(mod => mod.MeterVerwaltungModal), { ssr: false })
const ZaehlerAblesenModal = dynamic(() => import('@/components/water-meters/meter-ablesungen-modal').then(mod => mod.MeterAblesungenModal), { ssr: false })

import {
  getAbrechnungModalDataAction,
  deleteNebenkosten as deleteNebenkostenServerAction,
  bulkDeleteNebenkosten
} from "@/app/betriebskosten-actions" // Removed old wasserzaehler imports
import { toast } from "@/hooks/use-toast" // For notifications
import { useModalStore } from "@/hooks/use-modal-store"
import { ActionMenu } from "@/components/ui/action-menu"
import { useRouter } from "next/navigation"
import { sumAllZaehlerValues } from "@/lib/zaehler-utils"

// Define sortable fields for operating costs table
type OperatingCostsSortKey = "zeitraum" | "haus" | "zaehlerkosten" | ""
type SortDirection = "asc" | "desc"

interface OperatingCostsTableProps {
  nebenkosten: OptimizedNebenkosten[];
  onEdit?: (item: OptimizedNebenkosten) => void;
  onDeleteItem: (id: string) => void;
  ownerName: string;
  allHaeuser: Haus[];
  selectedItems?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export function OperatingCostsTable({
  nebenkosten,
  onEdit,
  onDeleteItem,
  ownerName,
  allHaeuser,
  selectedItems: externalSelectedItems,
  onSelectionChange
}: OperatingCostsTableProps) {
  const router = useRouter()

  // Old openWasserzaehlerModalOptimized removed - now using new ZaehlerAblesenModal
  const [overviewItem, setOverviewItem] = useState<OptimizedNebenkosten | null>(null);
  // Old wasserzähler modal state removed - now using new ZaehlerAblesenModal
  const [isAbrechnungModalOpen, setIsAbrechnungModalOpen] = useState(false);
  const [selectedNebenkostenForAbrechnung, setSelectedNebenkostenForAbrechnung] = useState<OptimizedNebenkosten | null>(null);
  const [abrechnungModalData, setAbrechnungModalData] = useState<AbrechnungModalData | null>(null);
  const [isLoadingAbrechnungData, setIsLoadingAbrechnungData] = useState(false);
  const [sortKey, setSortKey] = useState<OperatingCostsSortKey>("zeitraum")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())
  const [isZaehlerVerwaltungOpen, setIsZaehlerVerwaltungOpen] = useState(false)
  const [selectedHausForVerwaltung, setSelectedHausForVerwaltung] = useState<{ id: string; name: string } | null>(null)
  const [isZaehlerAblesenOpen, setIsZaehlerAblesenOpen] = useState(false)
  const [selectedNebenkostenForAblesen, setSelectedNebenkostenForAblesen] = useState<OptimizedNebenkosten | null>(null)

  // Use external selection state if provided, otherwise use internal
  const selectedItems = externalSelectedItems ?? internalSelectedItems
  const setSelectedItems = onSelectionChange ?? setInternalSelectedItems
  // Sorting and filtering logic
  const sortedData = useMemo(() => {
    let result = [...nebenkosten]

    // Apply sorting
    if (sortKey !== "") {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'zeitraum') {
          valA = a.startdatum || ''
          valB = b.startdatum || ''
        } else if (sortKey === 'haus') {
          valA = a.haus_name || ''
          valB = b.haus_name || ''
        } else if (sortKey === 'zaehlerkosten') {
          // Sum all meter costs from JSONB
          valA = sumAllZaehlerValues(a.zaehlerkosten)
          valB = sumAllZaehlerValues(b.zaehlerkosten)
        } else {
          return 0
        }

        // Convert to number if it's a numeric value for proper sorting
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [nebenkosten, sortKey, sortDirection])

  const visibleItemIds = useMemo(() => sortedData.map((item) => item.id), [sortedData])

  const allSelected = visibleItemIds.length > 0 && visibleItemIds.every((id) => selectedItems.has(id))
  const partiallySelected = visibleItemIds.some((id) => selectedItems.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedItems)
    if (isChecked) {
      visibleItemIds.forEach((id) => next.add(id))
    } else {
      visibleItemIds.forEach((id) => next.delete(id))
    }
    setSelectedItems(next)
  }

  const handleSelectItem = (itemId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedItems)
    if (isChecked) {
      next.add(itemId)
    } else {
      next.delete(itemId)
    }
    setSelectedItems(next)
  }

  const handleSort = (key: OperatingCostsSortKey) => {
    if (key === "") return
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: OperatingCostsSortKey) => {
    if (key === "" || sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleOpenOverview = (item: OptimizedNebenkosten) => {
    setOverviewItem(item);
  };

  const handleCloseOverview = () => {
    setOverviewItem(null);
  };

  // Old handleOpenWasserzaehlerModal function removed - now using new WasserZaehlerAblesenModal

  // Old handleSaveWasserzaehler function removed - now using new WasserZaehlerAblesenModal

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
          metersCount: Array.isArray(result.data.meters) ? result.data.meters.length : 'n/a',
          readingsCount: Array.isArray(result.data.readings) ? result.data.readings.length : 'n/a',
          firstTenant: Array.isArray(result.data.tenants) && result.data.tenants.length > 0 ? {
            id: result.data.tenants[0].id,
            name: result.data.tenants[0].name,
            wohnung_id: result.data.tenants[0].wohnung_id,
          } : null,
        });
        setAbrechnungModalData(result.data);
        setIsAbrechnungModalOpen(true);
      } else {
        console.error("Error fetching Abrechnung modal data:", result.message);
        toast({
          title: "Fehler",
          description: `Fehler beim Laden der Abrechnungsdaten: ${result.message || "Unbekannter Fehler"}`,
          variant: "destructive"
        });
        setAbrechnungModalData(null);
      }
    } catch (error) {
      console.error("Error calling getAbrechnungModalDataAction:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist beim Abrufen der Daten für die Abrechnung aufgetreten.",
        variant: "destructive"
      });
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

  const handleBulkDelete = async () => {
    if (!selectedItems.size) {
      toast({
        title: "Aktion nicht möglich",
        description: "Keine Betriebskostenabrechnungen zum Löschen ausgewählt.",
        variant: "destructive"
      });
      return;
    }

    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedItems);

    try {
      const result = await bulkDeleteNebenkosten(selectedIds);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Erfolgreich ${selectedItems.size} Betriebskostenabrechnung${selectedItems.size > 1 ? 'en' : ''} gelöscht.`,
          variant: "success"
        });
        setSelectedItems(new Set());
        router.refresh();
      } else {
        toast({
          title: "Fehler",
          description: result.message || "Fehler beim Löschen der Betriebskostenabrechnungen",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error during bulk delete:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  }

  // Helper function to properly escape CSV values
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleBulkExport = () => {
    const selectedItemsData = nebenkosten.filter(item => selectedItems.has(item.id))

    // Create CSV header
    const headers = ['Zeitraum', 'Haus', 'Kostenarten', 'Beträge', 'Berechnungsarten', 'Zählerkosten']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedItemsData.map(item => {
      const zeitraum = item.startdatum && item.enddatum
        ? `${isoToGermanDate(item.startdatum)} bis ${isoToGermanDate(item.enddatum)}`
        : ''
      const kostenarten = item.nebenkostenart?.join('; ') || ''
      const betraege = item.betrag?.map(b => typeof b === 'number' ? formatCurrency(b) : '').join('; ') || ''
      const berechnungsarten = item.berechnungsart?.join('; ') || ''

      const row = [
        zeitraum,
        item.haus_name || '',
        kostenarten,
        betraege,
        berechnungsarten,
        // Sum zaehlerkosten JSONB values
        formatCurrency(sumAllZaehlerValues(item.zaehlerkosten) || null)
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `betriebskosten_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedItems.size} Betriebskostenabrechnungen exportiert.`,
      variant: "success"
    })
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: OperatingCostsSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>
      <div
        onClick={() => sortable && handleSort(sortKey)}
        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}
      >
        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
        {children}
        {sortable && renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-lg">
      {/* Bulk Action Bar - only show if using internal state */}
      {!externalSelectedItems && selectedItems.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedItems(new Set())}
                className="data-[state=checked]:bg-primary"
              />
              <span className="font-medium text-sm">
                {selectedItems.size} {selectedItems.size === 1 ? 'Abrechnung' : 'Abrechnungen'} ausgewählt
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
              className="h-8 px-2 hover:bg-primary/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="h-8 gap-2"
            >
              <Download className="h-4 w-4" />
              Exportieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={isBulkDeleting}
              className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Löschen ({selectedItems.size})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0 min-h-[600px]">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
                <TableHead className="w-12 pl-0 pr-0 -ml-2">
                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                    <Checkbox
                      aria-label="Alle Abrechnungen auswählen"
                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      className="transition-transform duration-100 hover:scale-105"
                    />
                  </div>
                </TableHead>
                <TableHeaderCell sortKey="zeitraum" className="w-[250px] dark:text-[#f3f4f6]" icon={Calendar}>Zeitraum</TableHeaderCell>
                <TableHeaderCell sortKey="haus" className="w-[150px] dark:text-[#f3f4f6]" icon={Building2}>Haus</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[140px] dark:text-[#f3f4f6]" icon={FileText} sortable={false}>Kostenarten</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[150px] dark:text-[#f3f4f6]" icon={Euro} sortable={false}>Beträge</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[160px] dark:text-[#f3f4f6]" icon={Calculator} sortable={false}>Berechnungsarten</TableHeaderCell>
                <TableHeaderCell sortKey="zaehlerkosten" className="w-[130px] dark:text-[#f3f4f6]" icon={Droplets}>Zählerkosten</TableHeaderCell>
                <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[400px] text-center">
                    Keine Betriebskostenabrechnungen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => {
                  const isLastRow = index === sortedData.length - 1
                  const isSelected = selectedItems.has(item.id)

                  return (
                    <ContextMenu key={item.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          ref={(el) => {
                            if (el) {
                              contextMenuRefs.current.set(item.id, el)
                            } else {
                              contextMenuRefs.current.delete(item.id)
                            }
                          }}
                          className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
                            ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          onClick={() => onEdit?.(item)}
                        >
                          <TableCell
                            className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              aria-label={`Abrechnung auswählen`}
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                            />
                          </TableCell>
                          <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>
                            {item.startdatum && item.enddatum
                              ? `${isoToGermanDate(item.startdatum)} bis ${isoToGermanDate(item.enddatum)}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{item.haus_name || 'N/A'}</TableCell>
                          <TableCell className={`py-4 dark:text-[#f3f4f6]`}>
                            {item.nebenkostenart && item.nebenkostenart.length > 0 ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">
                                {item.nebenkostenart.length} {item.nebenkostenart.length === 1 ? 'Kostenart' : 'Kostenarten'}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`py-4 dark:text-[#f3f4f6]`}>
                            {item.betrag && item.betrag.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  {formatCurrency(
                                    item.betrag.reduce((sum, b) => sum + (typeof b === 'number' ? b : 0), 0)
                                  )}
                                </span>
                                {item.betrag.length > 1 && (
                                  <span className="text-xs text-muted-foreground">{item.betrag.length} Positionen</span>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`py-4 dark:text-[#f3f4f6]`}>
                            {item.berechnungsart && item.berechnungsart.length > 0 ? (
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
                                {item.berechnungsart.length} {item.berechnungsart.length === 1 ? 'Berechnungsart' : 'Berechnungsarten'}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{formatCurrency(sumAllZaehlerValues(item.zaehlerkosten) || null)}</TableCell>
                          <TableCell
                            className={`py-2 pr-2 text-right w-[130px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ActionMenu
                              actions={[
                                {
                                  id: `edit-${item.id}`,
                                  icon: Pencil,
                                  label: "Bearbeiten",
                                  onClick: () => onEdit?.(item),
                                  variant: 'primary',
                                },
                                {
                                  id: `overview-${item.id}`,
                                  icon: FileText,
                                  label: "Übersicht",
                                  onClick: () => handleOpenOverview(item),
                                  variant: 'default',
                                },
                                {
                                  id: `more-${item.id}`,
                                  icon: MoreVertical,
                                  label: "Mehr Optionen",
                                  onClick: (e) => {
                                    if (!e) return;
                                    const rowElement = contextMenuRefs.current.get(item.id)
                                    if (rowElement) {
                                      const contextMenuEvent = new MouseEvent('contextmenu', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        clientX: e.clientX,
                                        clientY: e.clientY,
                                      })
                                      rowElement.dispatchEvent(contextMenuEvent)
                                    }
                                  },
                                  variant: 'default',
                                }
                              ]}
                              shape="pill"
                              visibility="always"
                              className="inline-flex"
                            />
                          </TableCell>
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
                        {/* Old Wasserzähler modal button removed - now using new ZaehlerAblesenModal */}
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNebenkostenForAblesen(item);
                            setIsZaehlerAblesenOpen(true);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Droplets className="h-4 w-4" />
                          <span>Zähler</span>
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Overview Modal */}
      {overviewItem && (
        <OperatingCostsOverviewModal
          isOpen={!!overviewItem}
          onClose={handleCloseOverview}
          nebenkosten={overviewItem}
        />
      )}

      {/* Zaehler Modal is now handled by the modal store */}

      {/* Abrechnung Modal */}
      {selectedNebenkostenForAbrechnung && abrechnungModalData && (
        <AbrechnungModal
          isOpen={isAbrechnungModalOpen}
          onClose={handleCloseAbrechnungModal}
          nebenkostenItem={selectedNebenkostenForAbrechnung}
          tenants={abrechnungModalData.tenants ?? []}
          rechnungen={abrechnungModalData.rechnungen ?? []}
          meters={abrechnungModalData.meters ?? []}
          readings={abrechnungModalData.readings ?? []}
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

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Abrechnungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedItems.size} Betriebskostenabrechnungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedItems.size} Abrechnungen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zaehler Verwaltung Modal */}
      {selectedHausForVerwaltung && (
        <ZaehlerVerwaltungModal
          isOpen={isZaehlerVerwaltungOpen}
          onClose={() => {
            setIsZaehlerVerwaltungOpen(false);
            setSelectedHausForVerwaltung(null);
          }}
          hausId={selectedHausForVerwaltung.id}
          hausName={selectedHausForVerwaltung.name}
        />
      )}

      {/* Zaehler Ablesungen Modal */}
      {selectedNebenkostenForAblesen && (
        <ZaehlerAblesenModal
          isOpen={isZaehlerAblesenOpen}
          onClose={() => {
            setIsZaehlerAblesenOpen(false);
            setSelectedNebenkostenForAblesen(null);
          }}
          hausId={selectedNebenkostenForAblesen.haeuser_id || ''}
          hausName={selectedNebenkostenForAblesen.haus_name || 'Unbekanntes Haus'}
          startdatum={selectedNebenkostenForAblesen.startdatum || ''}
          enddatum={selectedNebenkostenForAblesen.enddatum || ''}
          nebenkostenId={selectedNebenkostenForAblesen.id}
        />
      )}
    </div>
  )
}
