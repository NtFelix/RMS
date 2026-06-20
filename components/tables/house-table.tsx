"use client"

import React, { useState, useEffect, useCallback, useMemo, useReducer, MutableRefObject } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { HouseContextMenu } from "@/components/houses/house-context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, Home, MapPin, Ruler, Euro, TrendingUp, CheckCircle2, MoreVertical, X, Download, Trash2, Pencil, Eye } from "lucide-react"
import { useModalStore } from "@/hooks/use-modal-store"
import { ActionMenu } from "@/components/ui/action-menu"

export interface House {
  id: string
  name: string
  strasse?: string
  ort: string
  size?: string
  rent?: string
  pricePerSqm?: string
  status?: string
  totalApartments?: number
  freeApartments?: number
}

type SortKey = keyof Omit<House, 'totalApartments' | 'freeApartments'> | 'status'
type SortDirection = "asc" | "desc"

interface HouseTableProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit: (house: House) => void
  initialHouses?: House[]
  selectedHouses?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
  canEdit?: boolean
  canDelete?: boolean
}

interface SortState {
  sortKey: SortKey
  sortDirection: SortDirection
}

type SortAction =
  | { type: "TOGGLE"; payload: SortKey }
  | { type: "SET"; payload: SortState }

function sortReducer(state: SortState, action: SortAction): SortState {
  switch (action.type) {
    case "TOGGLE":
      if (state.sortKey === action.payload) {
        return { ...state, sortDirection: state.sortDirection === "asc" ? "desc" : "asc" }
      }
      return { sortKey: action.payload, sortDirection: "asc" }
    case "SET":
      return action.payload
    default:
      return state
  }
}

interface DialogState {
  showDeleteConfirm: boolean
  houseToDelete: House | null
  isDeleting: boolean
  showBulkDeleteConfirm: boolean
  isBulkDeleting: boolean
}

type DialogAction =
  | { type: "OPEN_DELETE"; payload: House }
  | { type: "CLOSE_DELETE" }
  | { type: "SET_DELETING"; payload: boolean }
  | { type: "OPEN_BULK_DELETE" }
  | { type: "CLOSE_BULK_DELETE" }
  | { type: "SET_BULK_DELETING"; payload: boolean }
  | { type: "RESET_ALL" }

const initialDialogState: DialogState = {
  showDeleteConfirm: false,
  houseToDelete: null,
  isDeleting: false,
  showBulkDeleteConfirm: false,
  isBulkDeleting: false,
}

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_DELETE":
      return { ...state, showDeleteConfirm: true, houseToDelete: action.payload }
    case "CLOSE_DELETE":
      return { ...state, showDeleteConfirm: false, houseToDelete: null }
    case "SET_DELETING":
      return { ...state, isDeleting: action.payload }
    case "OPEN_BULK_DELETE":
      return { ...state, showBulkDeleteConfirm: true }
    case "CLOSE_BULK_DELETE":
      return { ...state, showBulkDeleteConfirm: false }
    case "SET_BULK_DELETING":
      return { ...state, isBulkDeleting: action.payload }
    case "RESET_ALL":
      return initialDialogState
    default:
      return state
  }
}

function BulkActionBar({
  selectedCount,
  onClearSelection,
  onExport,
  onDelete,
  canDelete,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={onClearSelection}
            className="data-[state=checked]:bg-primary"
          />
          <span className="font-medium text-sm">
            {selectedCount} {selectedCount === 1 ? 'Haus' : 'Häuser'} ausgewählt
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
          onClick={onDelete}
          disabled={!canDelete}
          className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </Button>
      </div>
    </div>
  );
}

function escapeCsvValue(value: string | null | undefined): string {
  if (!value) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function SortIcon({ currentSortKey, sortKey, sortDirection }: { currentSortKey: SortKey; sortKey: SortKey; sortDirection: SortDirection }) {
  if (currentSortKey !== sortKey) {
    return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
  ) : (
    <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
  )
}

function TableHeaderCell({ sortKey, currentSortKey, sortDirection, children, className = '', icon: Icon, sortable = true, onSort }: {
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  children: React.ReactNode;
  className?: string;
  icon: React.ElementType;
  sortable?: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>
      <div
        onClick={() => sortable && onSort(sortKey)}
        onKeyUp={(e) => { if (sortable && (e.key === 'Enter' || e.key === ' ')) onSort(sortKey) }}
        role={sortable ? 'button' : undefined}
        tabIndex={sortable ? 0 : undefined}
        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}
      >
        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
        {children}
        {sortable && <SortIcon currentSortKey={currentSortKey} sortKey={sortKey} sortDirection={sortDirection} />}
      </div>
    </TableHead>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  houseName,
  isDeleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houseName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie das Haus &quot;{houseName}&quot; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
            {isDeleting ? "Löschen..." : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  isBulkDeleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isBulkDeleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mehrere Häuser löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie wirklich {selectedCount} Häuser löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
            {isBulkDeleting ? "Lösche..." : `${selectedCount} Häuser löschen`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function HouseTableRow({ house, isLastRow, isSelected, selectedHouses, onSelectHouse, onEdit, sortKey, sortDirection, onSort, contextMenuRefs, flags }: {
  house: House;
  isLastRow: boolean;
  isSelected: boolean;
  selectedHouses: Set<string>;
  onSelectHouse: (id: string, checked: CheckedState) => void;
  onEdit: (house: House) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  contextMenuRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  flags: { canEdit: boolean; canDelete: boolean };
}) {
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  };

  return (
    <HouseContextMenu
      house={house}
      onEdit={() => onEdit(house)}
      onRefresh={() => {}}
      canEdit={flags.canEdit}
      canDelete={flags.canDelete}
    >
      <TableRow
        ref={(el) => {
          if (el) {
            contextMenuRefs.current.set(house.id, el)
          } else {
            contextMenuRefs.current.delete(house.id)
          }
        }}
        className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
          ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
        onClick={() => flags.canEdit ? onEdit(house) : useModalStore.getState().openHausOverviewModal(house.id)}
      >
        <TableCell
          className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            aria-label={`Haus ${house.name} auswählen`}
            checked={selectedHouses.has(house.id)}
            onCheckedChange={(checked) => onSelectHouse(house.id, checked)}
          />
        </TableCell>
        <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>{house.name}</TableCell>
        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{house.ort}</TableCell>
        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{house.size ? `${house.size} m²` : "-"}</TableCell>
        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{house.rent ? `${house.rent} €` : "-"}</TableCell>
        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{house.pricePerSqm ? `${house.pricePerSqm} €/m²` : "-"}</TableCell>
        <TableCell className={`py-4`}>
          {(house.totalApartments ?? 0) === 0 ? (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/50 dark:text-gray-300">
              Keine Wohnungen
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={
                (house.freeApartments ?? 0) > 0
                  ? "bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-900/30 dark:text-green-400"
              }
            >
              {(house.totalApartments ?? 0) - (house.freeApartments ?? 0)}/{house.totalApartments ?? 0} belegt
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
                id: `edit-${house.id}`,
                icon: Pencil,
                label: "Bearbeiten",
                onClick: () => onEdit(house),
                variant: 'primary',
                disabled: !flags.canEdit,
                tooltip: !flags.canEdit ? "Keine Berechtigung zum Bearbeiten" : undefined,
              },
              {
                id: `overview-${house.id}`,
                icon: Eye,
                label: "Übersicht",
                onClick: () => useModalStore.getState().openHausOverviewModal(house.id),
                variant: 'default',
              },
              {
                id: `more-${house.id}`,
                icon: MoreVertical,
                label: "Mehr Optionen",
                onClick: (e) => {
                  if (!e) return;
                  const rowElement = contextMenuRefs.current.get(house.id)
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
    </HouseContextMenu>
  );
}

function HouseTableContent({
  allSelected,
  partiallySelected,
  handleSelectAll,
  sortKey,
  sortDirection,
  handleSort,
  sortedAndFilteredData,
  selectedHouses,
  handleSelectHouse,
  onEdit,
  canEdit,
  canDelete,
  contextMenuRefs,
}: {
  allSelected: boolean;
  partiallySelected: boolean;
  handleSelectAll: (checked: CheckedState) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  handleSort: (key: SortKey) => void;
  sortedAndFilteredData: House[];
  selectedHouses: Set<string>;
  handleSelectHouse: (id: string, checked: CheckedState) => void;
  onEdit: (house: House) => void;
  canEdit: boolean;
  canDelete: boolean;
  contextMenuRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] first:[&:hover_th]:rounded-tl-lg last:[&:hover_th]:rounded-tr-lg">
              <TableHead className="w-12 pl-0 pr-0 -ml-2">
                <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                  <Checkbox
                    aria-label="Alle Häuser auswählen"
                    checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAll}
                    className="transition-transform duration-100 hover:scale-105"
                  />
                </div>
              </TableHead>
              <TableHeaderCell sortKey="name" currentSortKey={sortKey} sortDirection={sortDirection} className="w-[250px] dark:text-[#f3f4f6]" icon={Home} onSort={handleSort}>Häuser</TableHeaderCell>
              <TableHeaderCell sortKey="ort" currentSortKey={sortKey} sortDirection={sortDirection} className="dark:text-[#f3f4f6]" icon={MapPin} onSort={handleSort}>Ort</TableHeaderCell>
              <TableHeaderCell sortKey="size" currentSortKey={sortKey} sortDirection={sortDirection} className="dark:text-[#f3f4f6]" icon={Ruler} onSort={handleSort}>Größe</TableHeaderCell>
              <TableHeaderCell sortKey="rent" currentSortKey={sortKey} sortDirection={sortDirection} className="dark:text-[#f3f4f6]" icon={Euro} onSort={handleSort}>Miete</TableHeaderCell>
              <TableHeaderCell sortKey="pricePerSqm" currentSortKey={sortKey} sortDirection={sortDirection} className="dark:text-[#f3f4f6]" icon={TrendingUp} onSort={handleSort}>Miete pro m²</TableHeaderCell>
              <TableHeaderCell sortKey="status" currentSortKey={sortKey} sortDirection={sortDirection} className="dark:text-[#f3f4f6]" icon={CheckCircle2} onSort={handleSort}>Status</TableHeaderCell>
              <TableHeaderCell sortKey="name" currentSortKey={sortKey} sortDirection={sortDirection} className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false} onSort={handleSort}>Aktionen</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Keine Häuser gefunden.
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((house, index) => {
                const isLastRow = index === sortedAndFilteredData.length - 1
                const isSelected = selectedHouses.has(house.id)
                return (
                  <HouseTableRow
                    key={house.id}
                    house={house}
                    isLastRow={isLastRow}
                    isSelected={isSelected}
                    selectedHouses={selectedHouses}
                    onSelectHouse={handleSelectHouse}
                    onEdit={onEdit}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    contextMenuRefs={contextMenuRefs}
                    flags={{ canEdit, canDelete }}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function useHouseTable({ filter, searchQuery, reloadRef, initialHouses, selectedHouses: externalSelectedHouses, onSelectionChange }: {
  filter?: string;
  searchQuery?: string;
  reloadRef?: React.MutableRefObject<(() => void) | null>;
  initialHouses?: House[];
  selectedHouses?: Set<string>;
  onSelectionChange?: (houses: Set<string>) => void;
}) {
  const router = useRouter()
  const [houses, setHouses] = useState<House[]>(initialHouses ?? [])
  const [{ sortKey, sortDirection }, dispatchSort] = useReducer(sortReducer, { sortKey: "name" as SortKey, sortDirection: "asc" as SortDirection })
  const [internalSelectedHouses, setInternalSelectedHouses] = useState<Set<string>>(new Set())
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, initialDialogState)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(null as never)
  if (!contextMenuRefs.current) {
    contextMenuRefs.current = new Map()
  }

  const selectedHouses = externalSelectedHouses ?? internalSelectedHouses
  const setSelectedHouses = onSelectionChange ?? setInternalSelectedHouses

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch("/api/haeuser")
      if (res.ok) {
        const data = await res.json()
        setHouses(data)
        return data
      }
      return []
    } catch (error) {
      console.error('Error fetching houses:', error)
      return []
    }
  }, [])

  useEffect(() => {
    if (reloadRef) {
      reloadRef.current = fetchHouses
    }
    if (!initialHouses || initialHouses.length === 0) {
      fetchHouses()
    }
    return () => {
      if (reloadRef) {
        reloadRef.current = null
      }
    }
  }, [fetchHouses, initialHouses, reloadRef])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...houses]

    if (filter === "full") {
      result = result.filter((house) => house.freeApartments === 0)
    } else if (filter === "vacant") {
      result = result.filter((house) => (house.freeApartments ?? 0) > 0)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (house) =>
          house.name.toLowerCase().includes(query) ||
          (house.ort && house.ort.toLowerCase().includes(query)) ||
          (house.size && house.size.toLowerCase().includes(query)) ||
          (house.rent && house.rent.toLowerCase().includes(query)) ||
          (house.pricePerSqm && house.pricePerSqm.toLowerCase().includes(query))
      )
    }

    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'status') {
          valA = (a.totalApartments ?? 0) - (a.freeApartments ?? 0)
          valB = (b.totalApartments ?? 0) - (b.freeApartments ?? 0)
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

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
  }, [houses, filter, searchQuery, sortKey, sortDirection])

  const visibleHouseIds = useMemo(() => sortedAndFilteredData.map((house) => house.id), [sortedAndFilteredData])

  const allSelected = visibleHouseIds.length > 0 && visibleHouseIds.every((id) => selectedHouses.has(id))
  const partiallySelected = visibleHouseIds.some((id) => selectedHouses.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedHouses)
    if (isChecked) {
      visibleHouseIds.forEach((id) => next.add(id))
    } else {
      visibleHouseIds.forEach((id) => next.delete(id))
    }
    setSelectedHouses(next)
  }

  const handleSelectHouse = (houseId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedHouses)
    if (isChecked) {
      next.add(houseId)
    } else {
      next.delete(houseId)
    }
    setSelectedHouses(next)
  }

  const handleSort = (key: SortKey) => {
    dispatchSort({ type: "TOGGLE", payload: key })
  }

  const handleBulkDelete = async () => {
    if (selectedHouses.size === 0) return;

    dispatchDialog({ type: "SET_BULK_DELETING", payload: true });
    const selectedIds = Array.from(selectedHouses);

    try {
      const response = await fetch('/api/haeuser/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Häuser.');
      }

      const { successCount } = await response.json();
      const failedCount = selectedIds.length - successCount;

      dispatchDialog({ type: "CLOSE_BULK_DELETE" });
      setSelectedHouses(new Set());

      if (successCount > 0) {
        toast({
          title: "Erfolg",
          description: `${successCount} Häuser erfolgreich gelöscht${failedCount > 0 ? `, ${failedCount} fehlgeschlagen` : ''}.`,
          variant: "success",
        });

        await fetchHouses();
        router.refresh();
      } else {
        toast({
          title: "Fehler",
          description: "Keine Häuser konnten gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Häuser aufgetreten.",
        variant: "destructive",
      });
    } finally {
      dispatchDialog({ type: "SET_BULK_DELETING", payload: false });
    }
  }

  const handleBulkExport = () => {
    const selectedHousesData = houses.filter(h => selectedHouses.has(h.id))

    const headers = ['Haus', 'Ort', 'Größe (m²)', 'Miete (€)', '€/m²', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedHousesData.map(h => {
      const row = [
        h.name,
        h.ort || '',
        h.size || '',
        h.rent || '',
        h.pricePerSqm || '',
        `${(h.totalApartments ?? 0) - (h.freeApartments ?? 0)}/${h.totalApartments ?? 0} belegt`
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `haeuser_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedHouses.size} Häuser exportiert.`,
      variant: "success",
    })
  }

  const handleDeleteConfirm = async () => {
    if (!dialogState.houseToDelete) return
    dispatchDialog({ type: "SET_DELETING", payload: true })

    try {
      const response = await fetch(`/api/haeuser/${dialogState.houseToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Haus gelöscht',
          description: `Das Haus "${dialogState.houseToDelete.name}" wurde erfolgreich gelöscht.`,
          variant: 'success',
        })
        await fetchHouses()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Löschen fehlgeschlagen')
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Ein Fehler ist beim Löschen aufgetreten',
        variant: 'destructive',
      })
    } finally {
      dispatchDialog({ type: "CLOSE_DELETE" })
      dispatchDialog({ type: "SET_DELETING", payload: false })
    }
  }

  return {
    router,
    selectedHouses,
    setSelectedHouses,
    allSelected,
    partiallySelected,
    handleSelectAll,
    handleSelectHouse,
    handleSort,
    handleBulkDelete,
    handleBulkExport,
    handleDeleteConfirm,
    sortedAndFilteredData,
    sortKey,
    sortDirection,
    dialogState,
    dispatchDialog,
    contextMenuRefs,
    fetchHouses,
  }
}

export function HouseTable({ filter, searchQuery, reloadRef, onEdit, initialHouses, selectedHouses: externalSelectedHouses, onSelectionChange, canEdit = true, canDelete = true }: HouseTableProps) {
  const {
    router,
    selectedHouses,
    setSelectedHouses,
    allSelected,
    partiallySelected,
    handleSelectAll,
    handleSelectHouse,
    handleSort,
    handleBulkDelete,
    handleBulkExport,
    handleDeleteConfirm,
    sortedAndFilteredData,
    sortKey,
    sortDirection,
    dialogState,
    dispatchDialog,
    contextMenuRefs,
  } = useHouseTable({ filter, searchQuery, reloadRef, initialHouses, selectedHouses: externalSelectedHouses, onSelectionChange })

  return (
    <div className="rounded-lg">
      {!externalSelectedHouses && selectedHouses.size > 0 && (
        <BulkActionBar
          selectedCount={selectedHouses.size}
          onClearSelection={() => setSelectedHouses(new Set())}
          onExport={handleBulkExport}
          onDelete={() => dispatchDialog({ type: "OPEN_BULK_DELETE" })}
          canDelete={canDelete}
        />
      )}
      <HouseTableContent
        allSelected={allSelected}
        partiallySelected={partiallySelected}
        handleSelectAll={handleSelectAll}
        sortKey={sortKey}
        sortDirection={sortDirection}
        handleSort={handleSort}
        sortedAndFilteredData={sortedAndFilteredData}
        selectedHouses={selectedHouses}
        handleSelectHouse={handleSelectHouse}
        onEdit={onEdit}
        canEdit={canEdit}
        canDelete={canDelete}
        contextMenuRefs={contextMenuRefs}
      />

      <DeleteConfirmDialog
        open={dialogState.showDeleteConfirm}
        onOpenChange={(open) => !open && dispatchDialog({ type: "CLOSE_DELETE" })}
        houseName={dialogState.houseToDelete?.name ?? ""}
        isDeleting={dialogState.isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      <BulkDeleteConfirmDialog
        open={dialogState.showBulkDeleteConfirm}
        onOpenChange={(open) => !open && dispatchDialog({ type: "CLOSE_BULK_DELETE" })}
        selectedCount={selectedHouses.size}
        isBulkDeleting={dialogState.isBulkDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
