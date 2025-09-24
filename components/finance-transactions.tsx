"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip"
import { Search, Download, Edit, Trash, ChevronsUpDown, ArrowUp, ArrowDown, Loader2, CheckCircle2, Filter, Database, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FinanceTableToolbar } from "@/components/finance-table-toolbar"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/utils/format"
import { CustomCombobox } from "@/components/ui/custom-combobox"

const ALL_APARTMENTS_FILTER = 'Alle Wohnungen';
const ALL_YEARS_FILTER = 'Alle Jahre';

interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
}

type FinanceSortKey = "name" | "wohnung" | "datum" | "betrag" | "typ"
type SortDirection = "asc" | "desc"

interface Wohnung { id: string; name: string; }

interface Filters {
  searchQuery: string;
  selectedApartment: string;
  selectedYear: string;
  selectedType: string;
  sortKey: string;
  sortDirection: string;
}

interface FinanceTransactionsProps {
  finances: Finanz[]
  wohnungen: Wohnung[]
  availableYears: number[]
  reloadRef?: any
  onEdit?: (finance: Finanz) => void
  onAddTransaction?: () => void
  loadFinances?: () => void
  hasMore: boolean
  isLoading: boolean
  isFilterLoading?: boolean
  error: string | null
  fullReload?: () => Promise<void>
  filters: Filters
  onFiltersChange: (filters: Filters) => void
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

export function FinanceTransactions({
  finances,
  wohnungen,
  availableYears,
  reloadRef,
  onEdit,
  onAddTransaction,
  loadFinances,
  hasMore,
  isLoading,
  isFilterLoading = false,
  error,
  fullReload,
  filters,
  onFiltersChange,
}: FinanceTransactionsProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [financeToDelete, setFinanceToDelete] = useState<Finanz | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const apartmentOptions = useMemo(() => 
    [ALL_APARTMENTS_FILTER, ...wohnungen.map(w => w.name)].map(a => ({ value: a, label: a })), 
    [wohnungen]
  )

  const yearOptions = useMemo(() => 
    [ALL_YEARS_FILTER, ...availableYears.map(y => y.toString())].map(y => ({ value: y, label: y })), 
    [availableYears]
  )

  // Since filtering is now done server-side, we just use the finances directly
  const sortedAndFilteredData = finances

  const handleSort = (key: FinanceSortKey) => {
    const newDirection = filters.sortKey === key && filters.sortDirection === "asc" ? "desc" : "asc"
    onFiltersChange({
      ...filters,
      sortKey: key,
      sortDirection: newDirection
    })
  }

  const renderSortIcon = (key: FinanceSortKey) => {
    if (filters.sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return filters.sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: FinanceSortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div onClick={() => handleSort(sortKey)} className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2">
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  // Balance is now calculated server-side and passed as a prop

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters.selectedApartment) params.append('selectedApartment', filters.selectedApartment);
    if (filters.selectedYear) params.append('selectedYear', filters.selectedYear);
    if (filters.selectedType) params.append('selectedType', filters.selectedType);

    const url = `/api/finanzen/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handleDeleteConfirm = async () => {
    if (!financeToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/finanzen?id=${financeToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Gelöscht', description: 'Transaktion wurde entfernt.' })
        fullReload && fullReload()
      } else {
        const err = await res.json()
        toast({ title: 'Fehler', description: err.error || 'Löschen fehlgeschlagen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Netzwerkfehler', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setFinanceToDelete(null)
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Finanzliste</CardTitle>
              <CardDescription>Übersicht aller Einnahmen und Ausgaben</CardDescription>
            </div>
            {onAddTransaction && (
              <ButtonWithTooltip onClick={onAddTransaction} className="sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Transaktion hinzufügen
              </ButtonWithTooltip>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <CustomCombobox
                  options={apartmentOptions}
                  value={filters.selectedApartment}
                  onChange={(value) => handleFilterChange('selectedApartment', value ?? ALL_APARTMENTS_FILTER)}
                  placeholder="Wohnung auswählen"
                  searchPlaceholder="Wohnung suchen..."
                  emptyText="Keine Wohnung gefunden"
                  width="w-full"
                />
                <CustomCombobox
                  options={yearOptions}
                  value={filters.selectedYear}
                  onChange={(value) => handleFilterChange('selectedYear', value ?? ALL_YEARS_FILTER)}
                  placeholder="Jahr auswählen"
                  searchPlaceholder="Jahr suchen..."
                  emptyText="Kein Jahr gefunden"
                  width="w-full"
                />
                <CustomCombobox
                  options={[
                    { value: "Alle Transaktionen", label: "Alle Transaktionen" },
                    { value: "Einnahme", label: "Einnahme" },
                    { value: "Ausgabe", label: "Ausgabe" }
                  ]}
                  value={filters.selectedType}
                  onChange={(value) => handleFilterChange('selectedType', value ?? 'Alle Transaktionen')}
                  placeholder="Transaktionstyp auswählen"
                  searchPlaceholder="Typ suchen..."
                  emptyText="Kein Typ gefunden"
                  width="w-full"
                />
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Transaktion suchen..." 
                    className="pl-10" 
                    value={filters.searchQuery} 
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <ButtonWithTooltip variant="outline" size="sm" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" />Als CSV exportieren</ButtonWithTooltip>
              </div>
            </div>
            <div className="rounded-lg border relative min-h-[60vh]">
              {isFilterLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-md flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 p-6">
                    <div className="relative">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Filter className="h-4 w-4 text-primary" />
                      Filter werden angewendet
                    </div>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  {Object.keys(rowSelection).length > 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <FinanceTableToolbar numSelected={Object.keys(rowSelection).length} selectedIds={Object.keys(rowSelection)} onRefresh={fullReload} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={sortedAndFilteredData.length > 0 && Object.keys(rowSelection).length === sortedAndFilteredData.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newSelection = sortedAndFilteredData.reduce((acc, fin) => {
                                acc[fin.id] = true;
                                return acc;
                              }, {} as Record<string, boolean>);
                              setRowSelection(newSelection);
                            } else {
                              setRowSelection({});
                            }
                          }}
                        />
                      </TableHead>
                      <TableHeaderCell sortKey="name" className="w-[25%]">Bezeichnung</TableHeaderCell>
                      <TableHeaderCell sortKey="wohnung" className="w-[20%]">Wohnung</TableHeaderCell>
                      <TableHeaderCell sortKey="datum" className="w-[15%]">Datum</TableHeaderCell>
                      <TableHeaderCell sortKey="betrag" className="w-[15%]">Betrag</TableHeaderCell>
                      <TableHeaderCell sortKey="typ" className="w-[15%]">Typ</TableHeaderCell>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {isFilterLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
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
                  {!isFilterLoading && sortedAndFilteredData.length === 0 && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
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
                              {filters.searchQuery || filters.selectedApartment !== ALL_APARTMENTS_FILTER || filters.selectedYear !== ALL_YEARS_FILTER || filters.selectedType !== 'Alle Transaktionen'
                                ? 'Versuchen Sie, Ihre Filter anzupassen oder zu entfernen.'
                                : 'Es wurden noch keine Transaktionen erstellt.'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !isFilterLoading ? (
                    sortedAndFilteredData.map((finance, index) => {
                      const isLastElement = sortedAndFilteredData.length === index + 1;
                      return (
                        <FinanceContextMenu
                          key={finance.id}
                          finance={finance}
                          onEdit={() => onEdit && onEdit(finance)}
                          onStatusToggle={async () => {
                            try {
                              const response = await fetch(`/api/finanzen/${finance.id}`, {
                                method: "PATCH", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ist_einnahmen: !finance.ist_einnahmen }),
                              })
                              if (!response.ok) throw new Error("Fehler beim Umschalten des Status")
                              toast({ title: "Status geändert", description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.` })
                              fullReload && fullReload()
                            } catch (error) {
                              console.error("Fehler beim Umschalten des Status:", error)
                              toast({ title: "Fehler", description: "Der Status konnte nicht geändert werden.", variant: "destructive" })
                            }
                          }}
                          onRefresh={() => fullReload && fullReload()}
                        >
                          <TableRow ref={isLastElement ? lastTransactionElementRef : null} className="hover:bg-muted/50 cursor-pointer" data-state={rowSelection[finance.id] ? 'selected' : ''}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={rowSelection[finance.id] || false}
                                onCheckedChange={() => {
                                  setRowSelection(prev => {
                                    const newSelection = { ...prev };
                                    if (newSelection[finance.id]) {
                                      delete newSelection[finance.id];
                                    } else {
                                      newSelection[finance.id] = true;
                                    }
                                    return newSelection;
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell onClick={() => onEdit && onEdit(finance)}>{finance.name}</TableCell>
                            <TableCell onClick={() => onEdit && onEdit(finance)}>{finance.Wohnungen?.name || '-'}</TableCell>
                            <TableCell onClick={() => onEdit && onEdit(finance)}>{formatDate(finance.datum)}</TableCell>
                            <TableCell onClick={() => onEdit && onEdit(finance)}><span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>{formatCurrency(finance.betrag)}</span></TableCell>
                            <TableCell onClick={() => onEdit && onEdit(finance)}><Badge variant="outline" className={finance.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}</Badge></TableCell>
                          </TableRow>
                        </FinanceContextMenu>
                      )
                    })
                  ) : null}
                  {!isFilterLoading && isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
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
                  {!isFilterLoading && !isLoading && !hasMore && sortedAndFilteredData.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
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
                              {sortedAndFilteredData.length} {sortedAndFilteredData.length === 1 ? 'Eintrag' : 'Einträge'} 
                              {filters.searchQuery || filters.selectedApartment !== ALL_APARTMENTS_FILTER || filters.selectedYear !== ALL_YEARS_FILTER || filters.selectedType !== 'Alle Transaktionen'
                                ? ' entsprechen Ihren Filterkriterien'
                                : ' insgesamt'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isFilterLoading && error && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
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
                            <ButtonWithTooltip onClick={loadFinances} variant="outline" size="sm" className="mt-2">
                              <Loader2 className="mr-2 h-3 w-3" />
                              Erneut versuchen
                            </ButtonWithTooltip>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie diese Transaktion wirklich löschen? Dies kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600" disabled={isDeleting}>{isDeleting ? 'Löschen...' : 'Löschen'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
