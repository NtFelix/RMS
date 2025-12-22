"use client"

import React, { useState, useMemo, useRef, useCallback } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FinanceContextMenu } from "@/components/finance/finance-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, FileText, Home, Calendar, Euro, TrendingUp, Pencil, Trash2, MoreVertical, X, Download, Loader2, CheckCircle2, Filter, Database, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/format"

interface Finanz {
  id: string;
  wohnung_id?: string;
  name: string;
  datum?: string;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string;
  Wohnungen?: { name: string };
}

interface Wohnung { 
  id: string; 
  name: string; 
}

// Define sortable fields for finance table
type FinanceSortKey = "name" | "wohnung" | "datum" | "betrag" | "typ" | ""
type SortDirection = "asc" | "desc"

interface FinanceTableProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
  filter: string;
  searchQuery: string;
  onEdit?: (f: Finanz) => void;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
  selectedFinances?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  isFilterLoading?: boolean;
  hasMore?: boolean;
  isLoading?: boolean;
  error?: string | null;
  loadFinances?: () => void;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function FinanceTable({ 
  finances, 
  wohnungen, 
  filter, 
  searchQuery, 
  onEdit, 
  onRefresh,
  onDelete, 
  selectedFinances: externalSelectedFinances, 
  onSelectionChange,
  isFilterLoading = false,
  hasMore = false,
  isLoading = false,
  error = null,
  loadFinances
}: FinanceTableProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [financeToDelete, setFinanceToDelete] = useState<Finanz | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<FinanceSortKey>("datum")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [internalSelectedFinances, setInternalSelectedFinances] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const contextMenuRefs = React.useRef<Map<string, HTMLElement>>(new Map())

  // Use external selection state if provided, otherwise use internal
  const selectedFinances = externalSelectedFinances ?? internalSelectedFinances
  const setSelectedFinances = onSelectionChange ?? setInternalSelectedFinances

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null)
  const lastTransactionElementRef = useCallback((node: HTMLTableRowElement) => {
    if (isLoading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadFinances && loadFinances()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, hasMore, loadFinances])

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Map wohnung_id to wohnung name
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  // Sorting logic - filtering is handled by the server
  const sortedData = useMemo(() => {
    let result = [...finances];

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'wohnung') {
          valA = a.Wohnungen?.name || ''
          valB = b.Wohnungen?.name || ''
        } else if (sortKey === 'typ') {
          valA = a.ist_einnahmen ? 'Einnahme' : 'Ausgabe'
          valB = b.ist_einnahmen ? 'Einnahme' : 'Ausgabe'
        } else if (sortKey === 'datum') {
          valA = a.datum ? new Date(a.datum).getTime() : 0
          valB = b.datum ? new Date(b.datum).getTime() : 0
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

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
  }, [finances, sortKey, sortDirection])

  // Get IDs of all currently visible finance records for selection handling
  const visibleFinanceIds = useMemo(() => 
    sortedData.map((finance: Finanz) => finance.id), 
    [sortedData]
  )

  const allSelected = visibleFinanceIds.length > 0 && visibleFinanceIds.every((id) => selectedFinances.has(id))
  const partiallySelected = visibleFinanceIds.some((id) => selectedFinances.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedFinances)
    if (isChecked) {
      visibleFinanceIds.forEach((id) => next.add(id))
    } else {
      visibleFinanceIds.forEach((id) => next.delete(id))
    }
    setSelectedFinances(next)
  }

  const handleSelectFinance = (financeId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedFinances)
    if (isChecked) {
      next.add(financeId)
    } else {
      next.delete(financeId)
    }
    setSelectedFinances(next)
  }

  const handleSort = (key: FinanceSortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: FinanceSortKey) => {
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
    if (selectedFinances.size === 0) return;
    
    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedFinances);
    
    try {
      const response = await fetch('/api/finanzen/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Erfolg",
          description: `${selectedIds.length} Transaktionen erfolgreich gelöscht.`,
          variant: "success",
        });
        
        // Refresh the data after successful deletion
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(result.error || 'Fehler beim Löschen der Transaktionen');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Fehler",
        description: "Beim Löschen der ausgewählten Transaktionen ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setSelectedFinances(new Set());
    }
  }

  // Helper function to properly escape CSV values
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const handleBulkExport = () => {
    const selectedFinancesData = finances.filter(f => selectedFinances.has(f.id))
    
    // Create CSV header
    const headers = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')
    
    // Create CSV rows with proper escaping
    const csvRows = selectedFinancesData.map(f => {
      const row = [
        f.name,
        f.Wohnungen?.name || '',
        f.datum || '',
        f.betrag.toString(),
        f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
        f.notiz || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })
    
    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedFinances.size} Transaktionen exportiert.`,
      variant: "success",
    })
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: FinanceSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
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
      {!externalSelectedFinances && selectedFinances.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={true}
                onCheckedChange={() => setSelectedFinances(new Set())}
                className="data-[state=checked]:bg-primary"
              />
              <span className="font-medium text-sm">
                {selectedFinances.size} {selectedFinances.size === 1 ? 'Transaktion' : 'Transaktionen'} ausgewählt
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFinances(new Set())}
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
                  aria-label="Alle Transaktionen auswählen"
                  checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                  className="transition-transform duration-100 hover:scale-105"
                />
              </div>
            </TableHead>
            <TableHeaderCell sortKey="name" className="w-[250px] dark:text-[#f3f4f6]" icon={FileText}>Bezeichnung</TableHeaderCell>
            <TableHeaderCell sortKey="wohnung" className="dark:text-[#f3f4f6]" icon={Home}>Wohnung</TableHeaderCell>
            <TableHeaderCell sortKey="datum" className="dark:text-[#f3f4f6]" icon={Calendar}>Datum</TableHeaderCell>
            <TableHeaderCell sortKey="betrag" className="dark:text-[#f3f4f6]" icon={Euro}>Betrag</TableHeaderCell>
            <TableHeaderCell sortKey="typ" className="dark:text-[#f3f4f6]" icon={TrendingUp}>Typ</TableHeaderCell>
            <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={Pencil} sortable={false}>Aktionen</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isFilterLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Filter className="h-4 w-4 text-primary" />
                      Filter werden angewendet
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Transaktionen werden gefiltert und sortiert...
                    </div>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isFilterLoading && sortedData.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Database className="h-12 w-12 text-muted-foreground/40" />
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">Keine Transaktionen gefunden</h3>
                    <p className="text-xs text-muted-foreground max-w-sm text-center">
                      Es wurden noch keine Transaktionen erstellt oder die aktuellen Filter ergeben keine Ergebnisse.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : !isFilterLoading ? (
            sortedData.map((finance: Finanz, index: number) => {
              const isLastElement = sortedData.length === index + 1;
              const isLastRow = index === sortedData.length - 1
              const isSelected = selectedFinances.has(finance.id)
              
              return (
                <FinanceContextMenu
                  key={finance.id}
                  finance={finance}
                  onEdit={() => onEdit?.(finance)}
                  onRefresh={onRefresh} // Pass the onRefresh prop here
                >
                  <TableRow 
                    ref={isLastElement ? lastTransactionElementRef : (el) => {
                      if (el) {
                        contextMenuRefs.current.set(finance.id, el)
                      } else {
                        contextMenuRefs.current.delete(finance.id)
                      }
                    }}
                    className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${
                      isSelected 
                        ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}` 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => onEdit?.(finance)}
                  >
                  <TableCell 
                    className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`} 
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      aria-label={`Transaktion ${finance.name} auswählen`}
                      checked={selectedFinances.has(finance.id)}
                      onCheckedChange={(checked) => handleSelectFinance(finance.id, checked)}
                    />
                  </TableCell>
                  <TableCell className={`font-medium py-4 dark:text-[#f3f4f6] flex items-center gap-3`}>
                    <Avatar className="h-9 w-9 flex-shrink-0 bg-primary text-primary-foreground">
                      <AvatarImage src="" alt={finance.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(finance.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{finance.name}</span>
                  </TableCell>
                  <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{finance.Wohnungen?.name || '-'}</TableCell>
                  <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{formatDate(finance.datum)}</TableCell>
                  <TableCell className={`py-4`}>
                    <span className={finance.ist_einnahmen ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {formatCurrency(finance.betrag)}
                    </span>
                  </TableCell>
                  <TableCell className={`py-4`}>
                    <Badge 
                      variant="outline" 
                      className={finance.ist_einnahmen 
                        ? "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-900/30 dark:text-red-400"
                      }
                    >
                      {finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className={`py-2 pr-2 text-right w-[80px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`} 
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rowElement = contextMenuRefs.current.get(finance.id)
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
              </FinanceContextMenu>
            )
            })
          ) : null}
          {!isFilterLoading && isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div className="absolute inset-0 h-6 w-6 rounded-full border border-primary/20 animate-ping"></div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Weitere Transaktionen werden geladen...
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isFilterLoading && !isLoading && !hasMore && sortedData.length > 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div className="absolute inset-0 h-6 w-6 rounded-full bg-green-500/10 animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-sm font-medium text-foreground">
                      Alle Transaktionen geladen
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sortedData.length} von {finances.length} Einträgen insgesamt
                    </div>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isFilterLoading && error && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                      <Search className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-sm font-medium text-red-600">Fehler beim Laden</h3>
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                      {error}
                    </p>
                    <Button onClick={loadFinances} variant="outline" size="sm" className="mt-2">
                      <Loader2 className="mr-2 h-3 w-3" />
                      Erneut versuchen
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Transaktion wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!financeToDelete) return
              setIsDeleting(true)
              if (onDelete) await onDelete(financeToDelete.id)
              setIsDeleting(false)
              setShowDeleteConfirm(false)
            }} className="bg-red-600 hover:bg-red-700">{isDeleting ? "Lösche..." : "Löschen"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Transaktionen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedFinances.size} Transaktionen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedFinances.size} Transaktionen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}