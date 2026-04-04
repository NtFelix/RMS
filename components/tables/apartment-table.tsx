"use client"

import React, { useMemo, MutableRefObject } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ApartmentContextMenu } from "@/components/apartments/apartment-context-menu"
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
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, Home, Ruler, Euro, Building2, CheckCircle2, MoreVertical, X, Download, Trash2, Pencil, Gauge } from "lucide-react"
import { formatNumber } from "@/utils/format"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"
import { useModalStore } from "@/hooks/use-modal-store"
import { ActionMenu } from "@/components/ui/action-menu"
import { cn } from "@/lib/utils"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null;
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

type ApartmentSortKey = "name" | "groesse" | "miete" | "pricePerSqm" | "haus" | "status"
type SortDirection = "asc" | "desc"

interface ApartmentTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void>
  onDelete?: (id: string) => void
  initialApartments?: Apartment[]
  selectedApartments?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
}

// --- Sub-components ---

interface TableHeaderCellProps {
  sortKey?: ApartmentSortKey;
  children: React.ReactNode;
  className?: string;
  icon: React.ElementType;
  sortable?: boolean;
  onSort?: (key: ApartmentSortKey) => void;
  renderSortIcon?: (key: ApartmentSortKey) => React.ReactNode;
}

const TableHeaderCell = ({ 
  sortKey, 
  children, 
  className, 
  icon: Icon, 
  sortable = true,
  onSort,
  renderSortIcon
}: TableHeaderCellProps) => {
  return (
    <TableHead className={cn("dark:text-[#f3f4f6] group/header", className)}>
      {sortable && sortKey ? (
        <button
          onClick={() => onSort?.(sortKey)}
          type="button"
          className={cn(
            "flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm w-full text-left font-semibold",
            "cursor-pointer"
          )}
        >
          <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
          {children}
          {renderSortIcon?.(sortKey)}
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6]">
          <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
          {children}
        </div>
      )}
    </TableHead>
  );
};

interface ApartmentBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onDeleteConfirm: () => void;
}

const ApartmentBulkActions = ({ selectedCount, onClearSelection, onExport, onDeleteConfirm }: ApartmentBulkActionsProps) => (
  <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={true}
          onCheckedChange={onClearSelection}
          className="data-[state=checked]:bg-primary"
        />
        <span className="font-medium text-sm">
          {selectedCount} {selectedCount === 1 ? 'Wohnung' : 'Wohnungen'} ausgewählt
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 px-2 hover:bg-primary/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        className="h-8 gap-2"
      >
        <Download className="h-4 w-4" />
        Exportieren
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDeleteConfirm}
        className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
      >
        <Trash2 className="h-4 w-4" />
        Löschen
      </Button>
    </div>
  </div>
);

interface ApartmentTableRowProps {
  apt: Apartment;
  index: number;
  isSelected: boolean;
  isLastRow: boolean;
  onSelect: (id: string, checked: CheckedState) => void;
  onEdit?: (apt: Apartment) => void;
  onRefresh?: () => void | Promise<void>;
  contextMenuRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

const ApartmentTableRowItem = React.memo(({ apt, index, isSelected, isLastRow, onSelect, onEdit, onRefresh, contextMenuRefs }: ApartmentTableRowProps) => (
  <ApartmentContextMenu
    key={apt.id}
    apartment={apt}
    onEdit={() => onEdit?.(apt)}
    onRefresh={() => {
      if (onRefresh) onRefresh();
    }}
  >
    <TableRow
      ref={(el) => {
        if (el) contextMenuRefs.current.set(apt.id, el)
        else contextMenuRefs.current.delete(apt.id)
      }}
      className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
        ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      onClick={() => onEdit?.(apt)}
    >
      <TableCell
        className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          aria-label={`Wohnung ${apt.name} auswählen`}
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(apt.id, checked)}
        />
      </TableCell>
      <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>{apt.name}</TableCell>
      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{formatNumber(apt.groesse)} m²</TableCell>
      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{formatNumber(apt.miete)} €</TableCell>
      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{formatNumber(apt.miete / apt.groesse)} €/m²</TableCell>
      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{apt.Haeuser?.name || '-'}</TableCell>
      <TableCell className={`py-4`}>
        {apt.status === 'vermietet' ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-900/30 dark:text-green-400">
            vermietet
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">
            frei
          </Badge>
        )}
      </TableCell>
      <TableCell
        className={`py-2 pr-2 text-right w-[130px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <ActionMenu
          actions={[
            {
              id: `edit-${apt.id}`,
              icon: Pencil,
              label: "Bearbeiten",
              onClick: () => onEdit?.(apt),
              variant: 'primary',
            },
            {
              id: `meter-${apt.id}`,
              icon: Gauge,
              label: "Zähler verwalten",
              onClick: () => {
                useOnboardingStore.getState().completeStep('create-meter-select');
                useModalStore.getState().openZaehlerModal(apt.id, apt.name);
              },
              variant: 'default',
            },
            {
              id: index === 0 ? "apartment-menu-trigger-0" : `more-${apt.id}`,
              icon: MoreVertical,
              label: "Mehr Optionen",
              onClick: (e) => {
                if (index === 0) {
                  useOnboardingStore.getState().completeStep('create-meter-open-menu');
                }
                if (!e) return;
                const rowElement = contextMenuRefs.current.get(apt.id)
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
  </ApartmentContextMenu>
));

ApartmentTableRowItem.displayName = "ApartmentTableRowItem";

// --- Reducer and main component ---

type ApartmentState = {
  sortKey: ApartmentSortKey;
  sortDirection: SortDirection;
  internalSelectedApartments: Set<string>;
  showBulkDeleteConfirm: boolean;
  isBulkDeleting: boolean;
};

type ApartmentAction =
  | { type: 'SET_SORT'; payload: { key: ApartmentSortKey; direction: SortDirection } }
  | { type: 'SET_SELECTED_APARTMENTS'; payload: Set<string> }
  | { type: 'SET_BULK_DELETE_CONFIRM'; payload: boolean }
  | { type: 'SET_IS_BULK_DELETING'; payload: boolean };

function apartmentReducer(state: ApartmentState, action: ApartmentAction): ApartmentState {
  switch (action.type) {
    case 'SET_SORT': return { ...state, sortKey: action.payload.key, sortDirection: action.payload.direction };
    case 'SET_SELECTED_APARTMENTS': return { ...state, internalSelectedApartments: action.payload };
    case 'SET_BULK_DELETE_CONFIRM': return { ...state, showBulkDeleteConfirm: action.payload };
    case 'SET_IS_BULK_DELETING': return { ...state, isBulkDeleting: action.payload };
    default: return state;
  }
}

export function ApartmentTable({ filter, searchQuery, reloadRef, onEdit, onTableRefresh, onDelete, initialApartments, selectedApartments: externalSelectedApartments, onSelectionChange }: ApartmentTableProps) {
  const router = useRouter()
  const [state, dispatch] = React.useReducer(apartmentReducer, {
    sortKey: "name",
    sortDirection: "asc",
    internalSelectedApartments: new Set<string>(),
    showBulkDeleteConfirm: false,
    isBulkDeleting: false,
  });

  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  const selectedApartments = externalSelectedApartments ?? state.internalSelectedApartments
  const setSelectedApartments = React.useCallback((next: Set<string>) => {
    if (onSelectionChange) onSelectionChange(next);
    else dispatch({ type: 'SET_SELECTED_APARTMENTS', payload: next });
  }, [onSelectionChange])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...(initialApartments ?? [])]

    if (filter === 'free') result = result.filter(apt => apt.status === 'frei')
    else if (filter === 'rented') result = result.filter(apt => apt.status === 'vermietet')

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (apt) =>
          apt.name.toLowerCase().includes(query) ||
          apt.groesse.toString().includes(query) ||
          apt.miete.toString().includes(query) ||
          (apt.Haeuser?.name && apt.Haeuser.name.toLowerCase().includes(query))
      )
    }

    if (state.sortKey) {
      result.sort((a, b) => {
        let valA, valB
        if (state.sortKey === 'pricePerSqm') {
          valA = a.miete / a.groesse
          valB = b.miete / b.groesse
        } else if (state.sortKey === 'haus') {
          valA = a.Haeuser?.name || ''
          valB = b.Haeuser?.name || ''
        } else {
          valA = a[state.sortKey]
          valB = b[state.sortKey]
        }
        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return state.sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return state.sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return state.sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }
    return result
  }, [initialApartments, filter, searchQuery, state.sortKey, state.sortDirection])

  const visibleApartmentIds = useMemo(() => sortedAndFilteredData.map((apt) => apt.id), [sortedAndFilteredData])
  const allSelected = visibleApartmentIds.length > 0 && visibleApartmentIds.every((id) => selectedApartments.has(id))
  const partiallySelected = visibleApartmentIds.some((id) => selectedApartments.has(id)) && !allSelected

  const handleSelectAll = React.useCallback((checked: CheckedState) => {
    const next = new Set(selectedApartments)
    if (checked === true) visibleApartmentIds.forEach((id) => next.add(id))
    else visibleApartmentIds.forEach((id) => next.delete(id))
    setSelectedApartments(next)
  }, [selectedApartments, visibleApartmentIds, setSelectedApartments])

  const handleSelectApartment = React.useCallback((apartmentId: string, checked: CheckedState) => {
    const next = new Set(selectedApartments)
    if (checked === true) next.add(apartmentId)
    else next.delete(apartmentId)
    setSelectedApartments(next)
  }, [selectedApartments, setSelectedApartments])

  const handleSort = React.useCallback((key: ApartmentSortKey) => {
    dispatch({ 
      type: 'SET_SORT', 
      payload: { key, direction: state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc" } 
    });
  }, [state.sortKey, state.sortDirection])

  const renderSortIcon = (key: ApartmentSortKey) => {
    if (state.sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    return state.sortDirection === "asc" ? <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" /> : <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
  }

  const handleBulkDelete = async () => {
    if (selectedApartments.size === 0) return;
    dispatch({ type: 'SET_IS_BULK_DELETING', payload: true });
    const selectedIds = Array.from(selectedApartments);
    try {
      const response = await fetch('/api/apartments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Wohnungen.');
      }
      const { successCount } = await response.json();
      const failedCount = selectedIds.length - successCount;
      dispatch({ type: 'SET_BULK_DELETE_CONFIRM', payload: false });
      setSelectedApartments(new Set());
      if (successCount > 0) {
        toast({ title: "Erfolg", description: `${successCount} Wohnungen erfolgreich gelöscht${failedCount > 0 ? `, ${failedCount} fehlgeschlagen` : ''}.`, variant: "success" });
        if (onTableRefresh) await onTableRefresh();
        router.refresh();
      } else {
        toast({ title: "Fehler", description: "Keine Wohnungen konnten gelöscht werden.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Fehler", description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Wohnungen aufgetreten.", variant: "destructive" });
    } finally {
      dispatch({ type: 'SET_IS_BULK_DELETING', payload: false });
    }
  }

  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleBulkExport = () => {
    const selectedApartmentsData = (initialApartments ?? []).filter(a => selectedApartments.has(a.id))
    const headers = ['Wohnung', 'Größe (m²)', 'Miete (€)', '€/m²', 'Haus', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')
    const csvRows = selectedApartmentsData.map(a => {
      const row = [a.name, a.groesse.toString(), a.miete.toString(), (a.miete / a.groesse).toFixed(2), a.Haeuser?.name || '', a.status]
      return row.map(value => escapeCsvValue(value)).join(',')
    })
    const csvContent = [csvHeader, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wohnungen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast({ title: "Export erfolgreich", description: `${selectedApartments.size} Wohnungen exportiert.`, variant: "success" })
  }

  return (
    <div className="rounded-lg">
      {!externalSelectedApartments && selectedApartments.size > 0 && (
        <ApartmentBulkActions
          selectedCount={selectedApartments.size}
          onClearSelection={() => setSelectedApartments(new Set())}
          onExport={handleBulkExport}
          onDeleteConfirm={() => dispatch({ type: 'SET_BULK_DELETE_CONFIRM', payload: true })}
        />
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0 min-h-[600px]">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
                <TableHead className="w-12 pl-0 pr-0 -ml-2">
                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                    <Checkbox
                      aria-label="Alle Wohnungen auswählen"
                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      className="transition-transform duration-100 hover:scale-105"
                    />
                  </div>
                </TableHead>
                <TableHeaderCell sortKey="name" className="w-[200px]" icon={Home} onSort={handleSort} renderSortIcon={renderSortIcon}>Wohnung</TableHeaderCell>
                <TableHeaderCell sortKey="groesse" className="w-[120px]" icon={Ruler} onSort={handleSort} renderSortIcon={renderSortIcon}>Größe</TableHeaderCell>
                <TableHeaderCell sortKey="miete" className="w-[110px]" icon={Euro} onSort={handleSort} renderSortIcon={renderSortIcon}>Miete</TableHeaderCell>
                <TableHeaderCell sortKey="pricePerSqm" className="w-[130px]" icon={Euro} onSort={handleSort} renderSortIcon={renderSortIcon}>€/m²</TableHeaderCell>
                <TableHeaderCell sortKey="haus" icon={Building2} onSort={handleSort} renderSortIcon={renderSortIcon}>Haus</TableHeaderCell>
                <TableHeaderCell sortKey="status" className="w-[110px]" icon={CheckCircle2} onSort={handleSort} renderSortIcon={renderSortIcon}>Status</TableHeaderCell>
                <TableHeaderCell className="w-[80px] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-[400px] text-center">Keine Wohnungen gefunden.</TableCell></TableRow>
              ) : (
                sortedAndFilteredData.map((apt, index) => (
                  <ApartmentTableRowItem
                    key={apt.id}
                    apt={apt}
                    index={index}
                    isSelected={selectedApartments.has(apt.id)}
                    isLastRow={index === sortedAndFilteredData.length - 1}
                    onSelect={handleSelectApartment}
                    onEdit={onEdit}
                    onRefresh={onTableRefresh}
                    contextMenuRefs={contextMenuRefs}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={state.showBulkDeleteConfirm} onOpenChange={(open) => dispatch({ type: 'SET_BULK_DELETE_CONFIRM', payload: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Wohnungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie wirklich {selectedApartments.size} Wohnungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={state.isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={state.isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {state.isBulkDeleting ? "Lösche..." : `${selectedApartments.size} Wohnungen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
