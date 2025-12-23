"use client"

import React, { useState, useEffect, useMemo, MutableRefObject } from "react"
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
import { ChevronsUpDown, ArrowUp, ArrowDown, Home, Ruler, Euro, Building2, CheckCircle2, MoreVertical, X, Download, Trash2, Pencil } from "lucide-react"
import { formatNumber } from "@/utils/format"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id?: string
  Haeuser?: { name: string } | null; // Allow null here
  status: 'frei' | 'vermietet'
  tenant?: {
    id: string
    name: string
    einzug?: string
    auszug?: string
  } | null
}

// Define sortable fields for apartments
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

export function ApartmentTable({ filter, searchQuery, reloadRef, onEdit, onTableRefresh, onDelete, initialApartments, selectedApartments: externalSelectedApartments, onSelectionChange }: ApartmentTableProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<ApartmentSortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [internalSelectedApartments, setInternalSelectedApartments] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  // Use external selection state if provided, otherwise use internal
  const selectedApartments = externalSelectedApartments ?? internalSelectedApartments
  const setSelectedApartments = onSelectionChange ?? setInternalSelectedApartments

  const sortedAndFilteredData = useMemo(() => {
    let result = [...(initialApartments ?? [])]

    // Filter by status
    if (filter === 'free') {
      result = result.filter(apt => apt.status === 'frei')
    } else if (filter === 'rented') {
      result = result.filter(apt => apt.status === 'vermietet')
    }

    // Filter by search query
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

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'pricePerSqm') {
          valA = a.miete / a.groesse
          valB = b.miete / b.groesse
        } else if (sortKey === 'haus') {
          valA = a.Haeuser?.name || ''
          valB = b.Haeuser?.name || ''
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
  }, [initialApartments, filter, searchQuery, sortKey, sortDirection])

  const visibleApartmentIds = useMemo(() => sortedAndFilteredData.map((apt) => apt.id), [sortedAndFilteredData])

  const allSelected = visibleApartmentIds.length > 0 && visibleApartmentIds.every((id) => selectedApartments.has(id))
  const partiallySelected = visibleApartmentIds.some((id) => selectedApartments.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedApartments)
    if (isChecked) {
      visibleApartmentIds.forEach((id) => next.add(id))
    } else {
      visibleApartmentIds.forEach((id) => next.delete(id))
    }
    setSelectedApartments(next)
  }

  const handleSelectApartment = (apartmentId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedApartments)
    if (isChecked) {
      next.add(apartmentId)
    } else {
      next.delete(apartmentId)
    }
    setSelectedApartments(next)
  }

  const handleSort = (key: ApartmentSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: ApartmentSortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  }

  const handleBulkDelete = async () => {
    if (selectedApartments.size === 0) return;

    setIsBulkDeleting(true);
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

      setShowBulkDeleteConfirm(false);
      setSelectedApartments(new Set());

      if (successCount > 0) {
        toast({
          title: "Erfolg",
          description: `${successCount} Wohnungen erfolgreich gelöscht${failedCount > 0 ? `, ${failedCount} fehlgeschlagen` : ''}.`,
          variant: "success",
        });

        if (onTableRefresh) await onTableRefresh();
        router.refresh();
      } else {
        toast({
          title: "Fehler",
          description: "Keine Wohnungen konnten gelöscht werden.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Wohnungen aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
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
      const row = [
        a.name,
        a.groesse.toString(),
        a.miete.toString(),
        (a.miete / a.groesse).toFixed(2),
        a.Haeuser?.name || '',
        a.status
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wohnungen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedApartments.size} Wohnungen exportiert.`,
      variant: "success",
    })
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: ApartmentSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
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
      {!externalSelectedApartments && selectedApartments.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedApartments(new Set())}
                className="data-[state=checked]:bg-primary"
              />
              <span className="font-medium text-sm">
                {selectedApartments.size} {selectedApartments.size === 1 ? 'Wohnung' : 'Wohnungen'} ausgewählt
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedApartments(new Set())}
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
              className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
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
                <TableHeaderCell sortKey="name" className="w-[200px] dark:text-[#f3f4f6]" icon={Home}>Wohnung</TableHeaderCell>
                <TableHeaderCell sortKey="groesse" className="w-[120px] dark:text-[#f3f4f6]" icon={Ruler}>Größe</TableHeaderCell>
                <TableHeaderCell sortKey="miete" className="w-[110px] dark:text-[#f3f4f6]" icon={Euro}>Miete</TableHeaderCell>
                <TableHeaderCell sortKey="pricePerSqm" className="w-[130px] dark:text-[#f3f4f6]" icon={Euro}>€/m²</TableHeaderCell>
                <TableHeaderCell sortKey="haus" className="dark:text-[#f3f4f6]" icon={Building2}>Haus</TableHeaderCell>
                <TableHeaderCell sortKey="status" className="w-[110px] dark:text-[#f3f4f6]" icon={CheckCircle2}>Status</TableHeaderCell>
                <TableHeaderCell sortKey="name" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Keine Wohnungen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredData.map((apt, index) => {
                  const isLastRow = index === sortedAndFilteredData.length - 1
                  const isSelected = selectedApartments.has(apt.id)

                  return (
                    <ApartmentContextMenu
                      key={apt.id}
                      apartment={apt}
                      onEdit={() => onEdit?.(apt)}
                      onRefresh={async () => {
                        if (onTableRefresh) {
                          await onTableRefresh();
                        }
                      }}
                    >
                      <TableRow
                        ref={(el) => {
                          if (el) {
                            contextMenuRefs.current.set(apt.id, el)
                          } else {
                            contextMenuRefs.current.delete(apt.id)
                          }
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
                            checked={selectedApartments.has(apt.id)}
                            onCheckedChange={(checked) => handleSelectApartment(apt.id, checked)}
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
                          className={`py-2 pr-2 text-right w-[80px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            id={index === 0 ? "apartment-menu-trigger-0" : undefined}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                            onClick={(e) => {
                              if (index === 0) {
                                useOnboardingStore.getState().completeStep('create-meter-open-menu');
                              }
                              e.stopPropagation()
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
                            }}
                          >
                            <span className="sr-only">Menü öffnen</span>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </ApartmentContextMenu>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Wohnungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedApartments.size} Wohnungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedApartments.size} Wohnungen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
