"use client"

import { useState, useEffect, useRef, useCallback, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Edit, Trash, ChevronsUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { toast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"

interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { name: string }
  wohnung?: { name: string };
}

interface Wohnung { id: string; name: string; }

interface FinanceTransactionsProps {
  initialWohnungen: Wohnung[]
  onEdit: (finance: Finanz) => void
  transactions: Finanz[]
  totalCount: number
  totals: { balance: number, income: number, expenses: number }
  loading: boolean
  loadingMore: boolean
  error: string | null
  filters: any
  onFilterChange: (newFilters: any) => void
  loadMore: () => void
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function FinanceTransactions({
  initialWohnungen,
  onEdit,
  transactions,
  totalCount,
  totals,
  loading,
  loadingMore,
  error,
  filters,
  onFilterChange,
  loadMore
}: FinanceTransactionsProps) {
  const loaderRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== filters.searchQuery) {
        onFilterChange({ searchQuery });
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, filters.searchQuery, onFilterChange]);

  const apartments = ["Alle Wohnungen", ...initialWohnungen.map(w => w.name)];
  const years = ["Alle Jahre", ...Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString())];

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && !loading && !loadingMore && transactions.length < totalCount) {
        loadMore();
      }
    }, { threshold: 1.0 });

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [loaderRef, loading, loadingMore, totalCount, transactions.length, loadMore]);

  const handleSort = (key: string) => {
    onFilterChange({
      sortKey: key,
      sortDirection: filters.sortKey === key && filters.sortDirection === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleStatusToggle = async (finance: Finanz) => {
    try {
      const response = await fetch(`/api/finanzen?id=${finance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ist_einnahmen: !finance.ist_einnahmen }),
      });
      if (!response.ok) throw new Error("Status konnte nicht geändert werden.");
      toast({
        title: "Status geändert",
        description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.`,
      });
      onFilterChange({}); // Refetch data
    } catch (error) {
      toast({ title: "Fehler", description: "Der Status konnte nicht geändert werden.", variant: "destructive" });
    }
  };

  const renderSortIcon = (key: string) => {
    if (filters.sortKey !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    return filters.sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: string, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div onClick={() => handleSort(sortKey)} className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2">
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Finanzliste</CardTitle>
          <CardDescription>Übersicht aller Einnahmen und Ausgaben</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={filters.selectedApartment} onValueChange={(val) => onFilterChange({ selectedApartment: val })}>
                  <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                  <SelectContent>{apartments.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.selectedYear} onValueChange={(val) => onFilterChange({ selectedYear: val })}>
                  <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.selectedType} onValueChange={(val) => onFilterChange({ selectedType: val })}>
                  <SelectTrigger><SelectValue placeholder="Typ auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alle Transaktionen">Alle Transaktionen</SelectItem>
                    <SelectItem value="Einnahme">Einnahme</SelectItem>
                    <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Suchen..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Zeige {transactions.length} von {totalCount} Transaktionen
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Saldo</div>
                <div className="text-xl font-bold">{totals.balance.toFixed(2).replace(".", ",")} €</div>
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
                  {(loading || isPending) && transactions.length === 0 ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5} className="p-4"><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell></TableRow>
                    ))
                  ) : transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Keine Transaktionen gefunden.</TableCell></TableRow>
                  ) : (
                    transactions.map((t) => (
                      <FinanceContextMenu key={t.id} finance={t} onEdit={() => onEdit(t)} onStatusToggle={() => handleStatusToggle(t)} onRefresh={() => onFilterChange({})}>
                        <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(t)}>
                          <TableCell>{t.name}</TableCell>
                          <TableCell>{t.wohnung?.name || t.Wohnungen?.name || '-'}</TableCell>
                          <TableCell>{formatDate(t.datum)}</TableCell>
                          <TableCell><span className={t.ist_einnahmen ? "text-green-600" : "text-red-600"}>{t.betrag.toFixed(2).replace(".", ",")} €</span></TableCell>
                          <TableCell><Badge variant="outline" className={t.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{t.ist_einnahmen ? "Einnahme" : "Ausgabe"}</Badge></TableCell>
                        </TableRow>
                      </FinanceContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div ref={loaderRef} className="h-10 flex items-center justify-center">
              {loadingMore && <Loader2 className="h-6 w-6 animate-spin" />}
              {!loadingMore && error && (
                <div className="text-center text-red-500">
                  <p>Fehler beim Laden: {error}</p>
                  <Button onClick={loadMore} variant="outline" size="sm" className="mt-2">Erneut versuchen</Button>
                </div>
              )}
              {!loadingMore && !error && transactions.length > 0 && transactions.length >= totalCount && (
                <p className="text-sm text-muted-foreground">Keine weiteren Transaktionen verfügbar.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
