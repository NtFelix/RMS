"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Edit, Trash, ChevronsUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"

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
  onAdd?: (finance: Finanz) => void
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
  onAdd,
  loadFinances,
  hasMore,
  isLoading,
  isFilterLoading = false,
  error,
  fullReload,
  filters,
  onFiltersChange,
}: FinanceTransactionsProps) {
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

  const apartments = ["Alle Wohnungen", ...wohnungen.map(w => w.name)]
  const years = ["Alle Jahre", ...availableYears.map(y => y.toString())]

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

  const totalBalance = sortedAndFilteredData.reduce((total, transaction) => {
    const amount = Number(transaction.betrag)
    return transaction.ist_einnahmen ? total + amount : total - amount
  }, 0)

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
          <CardTitle>Finanzliste</CardTitle>
          <CardDescription>Übersicht aller Einnahmen und Ausgaben</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={filters.selectedApartment} onValueChange={(value) => handleFilterChange('selectedApartment', value)}>
                  <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                  <SelectContent>{apartments.map((apartment) => <SelectItem key={apartment} value={apartment}>{apartment}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.selectedYear} onValueChange={(value) => handleFilterChange('selectedYear', value)}>
                  <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                  <SelectContent>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.selectedType} onValueChange={(value) => handleFilterChange('selectedType', value)}>
                  <SelectTrigger><SelectValue placeholder="Transaktionstyp auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alle Transaktionen">Alle Transaktionen</SelectItem>
                    <SelectItem value="Einnahme">Einnahme</SelectItem>
                    <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Transaktion suchen..." 
                    className="pl-8" 
                    value={filters.searchQuery} 
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" />Als CSV exportieren</Button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Saldo</div>
              <div className="text-xl font-bold">{totalBalance.toFixed(2).replace(".", ",")} €</div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell sortKey="name" className="w-[25%]">Bezeichnung</TableHeaderCell>
                    <TableHeaderCell sortKey="wohnung" className="w-[20%]">Wohnung</TableHeaderCell>
                    <TableHeaderCell sortKey="datum" className="w-[15%]">Datum</TableHeaderCell>
                    <TableHeaderCell sortKey="betrag" className="w-[15%]">Betrag</TableHeaderCell>
                    <TableHeaderCell sortKey="typ" className="w-[15%]">Typ</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFilterLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <div className="text-sm text-muted-foreground mt-2">Filter werden angewendet...</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isFilterLoading && sortedAndFilteredData.length === 0 && !isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Keine Transaktionen gefunden.</TableCell></TableRow>
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
                          <TableRow ref={isLastElement ? lastTransactionElementRef : null} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit && onEdit(finance)}>
                            <TableCell>{finance.name}</TableCell>
                            <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                            <TableCell>{formatDate(finance.datum)}</TableCell>
                            <TableCell><span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>{finance.betrag.toFixed(2).replace(".", ",")} €</span></TableCell>
                            <TableCell><Badge variant="outline" className={finance.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}</Badge></TableCell>
                          </TableRow>
                        </FinanceContextMenu>
                      )
                    })
                  ) : null}
                  {!isFilterLoading && isLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  )}
                  {!isFilterLoading && !isLoading && !hasMore && sortedAndFilteredData.length > 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Keine weiteren Transaktionen</TableCell></TableRow>
                  )}
                  {!isFilterLoading && error && (
                    <TableRow><TableCell colSpan={5} className="text-center text-red-500">{error}<Button onClick={loadFinances} variant="link">Retry</Button></TableCell></TableRow>
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
