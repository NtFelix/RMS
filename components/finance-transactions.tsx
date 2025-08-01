"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, ChevronsUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
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

interface FinanceTransactionsProps {
  finances: Finanz[];
  totalCount: number;
  loadMore: (filters: any, page: number, limit: number) => void;
  isLoading: boolean;
  onEdit?: (finance: Finanz) => void;
  onAdd?: (finance: Finanz) => void;
  loadFinances: (filters?: any, page?: number, limit?: number) => Promise<void>;
  wohnungen: { id: string; name: string }[];
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

export function FinanceTransactions({ finances, totalCount, loadMore, isLoading, onEdit, onAdd, loadFinances, wohnungen }: FinanceTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApartment, setSelectedApartment] = useState("Alle Wohnungen")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedType, setSelectedType] = useState("Alle Transaktionen")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [financeToDelete, setFinanceToDelete] = useState<Finanz | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<FinanceSortKey>("datum")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [page, setPage] = useState(1)

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: any) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && finances.length < totalCount) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, finances.length, totalCount]);

  const getApartmentIdByName = (name: string) => {
    const apartment = wohnungen.find(w => w.name === name)
    return apartment ? apartment.id : undefined
  }

  const applyFilters = useCallback(() => {
    const filters: any = {}
    if (searchQuery) filters.search = searchQuery
    const apartmentId = getApartmentIdByName(selectedApartment)
    if (apartmentId) filters.apartmentId = apartmentId
    if (selectedYear !== "Alle Jahre") filters.year = selectedYear
    if (selectedType !== "Alle Transaktionen") filters.type = selectedType
    filters.sortKey = sortKey
    filters.sortDirection = sortDirection
    setPage(1)
    loadFinances(filters, 1, 25)
  }, [searchQuery, selectedApartment, selectedYear, selectedType, sortKey, sortDirection, loadFinances])

  useEffect(() => {
    const handler = setTimeout(() => {
      applyFilters()
    }, 300)
    return () => clearTimeout(handler)
  }, [applyFilters])

  useEffect(() => {
    if (page > 1) {
      const filters: any = {}
      if (searchQuery) filters.search = searchQuery
      const apartmentId = getApartmentIdByName(selectedApartment)
      if (apartmentId) filters.apartmentId = apartmentId
      if (selectedYear !== "Alle Jahre") filters.year = selectedYear
      if (selectedType !== "Alle Transaktionen") filters.type = selectedType
      filters.sortKey = sortKey
      filters.sortDirection = sortDirection
      loadMore(filters, page, 25)
    }
  }, [page])

  const handleSort = (key: FinanceSortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const renderSortIcon = (key: FinanceSortKey) => {
    if (sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: FinanceSortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div onClick={() => handleSort(sortKey)} className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2">
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  const handleExportCsv = () => {
    const header = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz'];
    const rows = finances.map(f => [
      f.name,
      f.Wohnungen?.name || '',
      f.datum || '',
      f.betrag.toString(),
      f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      f.notiz || ''
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finanzen.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteConfirm = async () => {
    if (!financeToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/finanzen/${financeToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Gelöscht', description: 'Transaktion wurde entfernt.' })
        applyFilters()
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

  const uniqueApartments = ["Alle Wohnungen", ...new Set(wohnungen.map(w => w.name))];
  const uniqueYears = useMemo(() => ["Alle Jahre", ...new Set(finances.filter(f => f.datum).map(f => f.datum!.split('-')[0]).sort((a, b) => parseInt(b) - parseInt(a)))], [finances]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Finanzliste</CardTitle>
          <CardDescription>
            Zeige {finances.length} von {totalCount} Transaktionen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={selectedApartment} onValueChange={setSelectedApartment}>
                  <SelectTrigger><SelectValue placeholder="Wohnung" /></SelectTrigger>
                  <SelectContent>{uniqueApartments.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue placeholder="Jahr" /></SelectTrigger>
                  <SelectContent>{uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alle Transaktionen">Alle Typen</SelectItem>
                    <SelectItem value="Einnahme">Einnahme</SelectItem>
                    <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Suchen..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" />Exportieren</Button>
              </div>
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
                  {finances.length === 0 && !isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Keine Transaktionen gefunden.</TableCell></TableRow>
                  ) : (
                    finances.map((finance, index) => (
                      <FinanceContextMenu
                        key={finance.id}
                        finance={finance}
                        onEdit={() => onEdit && onEdit(finance)}
                        onStatusToggle={async () => {
                          try {
                            const response = await fetch(`/api/finanzen/${finance.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ist_einnahmen: !finance.ist_einnahmen }),
                            });
                            if (!response.ok) throw new Error("Status konnte nicht geändert werden");
                            toast({
                              title: "Status geändert",
                              description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.`,
                            });
                            applyFilters();
                          } catch (error) {
                            toast({
                              title: "Fehler",
                              description: "Der Status konnte nicht geändert werden.",
                              variant: "destructive",
                            });
                          }
                        }}
                        onRefresh={applyFilters}
                      >
                        <TableRow ref={finances.length === index + 1 ? lastElementRef : null} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit && onEdit(finance)}>
                          <TableCell>{finance.name}</TableCell>
                          <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                          <TableCell>{formatDate(finance.datum)}</TableCell>
                          <TableCell><span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>{finance.betrag.toFixed(2).replace(".", ",")} €</span></TableCell>
                          <TableCell><Badge variant="outline" className={finance.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}</Badge></TableCell>
                        </TableRow>
                      </FinanceContextMenu>
                    ))
                  )}
                  {isLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  )}
                  {!isLoading && finances.length === totalCount && finances.length > 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Keine weiteren Transaktionen.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle><AlertDialogDescription>Möchten Sie diese Transaktion wirklich löschen? Dies kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600" disabled={isDeleting}>{isDeleting ? 'Löschen...' : 'Löschen'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
