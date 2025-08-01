"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { toast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

import { Finanz, Wohnung } from '@/types';

interface FinanceTransactionsProps {
  onEdit?: (finance: Finanz) => void
  wohnungen: Wohnung[]
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
};

export function FinanceTransactions({ onEdit, wohnungen }: FinanceTransactionsProps) {
  const {
    transactions, totalCount, totals, isLoading, isAppending, hasMore, error,
    apartmentId, year, type, searchQuery,
    setFilter, fetchTransactions, fetchNextPage, retry
  } = useFinanceStore();

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLTableRowElement) => {
    if (isLoading || isAppending) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchNextPage();
      }
    }, { threshold: 1.0 });
    if (node) observer.current.observe(node);
  }, [isLoading, isAppending, hasMore, fetchNextPage]);

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  useEffect(() => {
    setFilter({ searchQuery: debouncedSearchQuery });
  }, [debouncedSearchQuery, setFilter]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = ["Alle Jahre"];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i.toString());
    }
    return years;
  }, []);

  const handleExportCsv = () => {
    const header = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz'];
    const rows = transactions.map(f => [ f.name, f.Wohnungen?.name || '', f.datum || '', f.betrag.toString().replace('.', ','), f.ist_einnahmen ? 'Einnahme' : 'Ausgabe', f.notiz || '' ]);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finanzliste</CardTitle>
        <CardDescription>
          Übersicht aller Einnahmen und Ausgaben. Zeigt {transactions.length} von {totalCount} Transaktionen an.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
              <Select value={apartmentId} onValueChange={(value) => setFilter({ apartmentId: value })}>
                <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle Wohnungen">Alle Wohnungen</SelectItem>
                  {wohnungen.map((wohnung) => ( <SelectItem key={wohnung.id} value={wohnung.id}>{wohnung.name}</SelectItem> ))}
                </SelectContent>
              </Select>

              <Select value={year} onValueChange={(value) => setFilter({ year: value })}>
                <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                <SelectContent>{years.map((y) => ( <SelectItem key={y} value={y}>{y}</SelectItem> ))}</SelectContent>
              </Select>

              <Select value={type} onValueChange={(value) => setFilter({ type: value })}>
                <SelectTrigger><SelectValue placeholder="Transaktionstyp auswählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle Transaktionen">Alle Transaktionen</SelectItem>
                  <SelectItem value="Einnahme">Einnahme</SelectItem>
                  <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative col-span-1 sm:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Transaktion suchen..." className="pl-8" value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={transactions.length === 0}><Download className="mr-2 h-4 w-4" />Als CSV exportieren</Button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Saldo (gefiltert)</div>
            <div className="text-xl font-bold">{totals.balance.toFixed(2).replace(".", ",")} €</div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Bezeichnung</TableHead>
                  <TableHead className="w-[20%]">Wohnung</TableHead>
                  <TableHead className="w-[15%]">Datum</TableHead>
                  <TableHead className="w-[15%]">Betrag</TableHead>
                  <TableHead className="w-[15%]">Typ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 && !error ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">Keine Transaktionen für die aktuellen Filter gefunden.</TableCell></TableRow>
                ) : (
                  transactions.map((finance, index) => {
                    const isLastElement = transactions.length === index + 1;
                    return (
                      <FinanceContextMenu key={finance.id} finance={finance} onEdit={() => onEdit && onEdit(finance)} onStatusToggle={async () => { try { await fetch(`/api/finanzen/${finance.id}`, { method: "PATCH", body: JSON.stringify({ ist_einnahmen: !finance.ist_einnahmen }), }); toast({ title: "Status geändert" }); fetchTransactions({ force: true }); } catch (error) { toast({ title: "Fehler", variant: "destructive" }); } }} onRefresh={() => fetchTransactions({ force: true })}>
                        <TableRow ref={isLastElement ? lastElementRef : null} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit && onEdit(finance)}>
                          <TableCell>{finance.name}</TableCell>
                          <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                          <TableCell>{formatDate(finance.datum)}</TableCell>
                          <TableCell><span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>{finance.betrag.toFixed(2).replace(".", ",")} €</span></TableCell>
                          <TableCell><Badge variant="outline" className={finance.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}</Badge></TableCell>
                        </TableRow>
                      </FinanceContextMenu>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-center items-center py-4">
            {isAppending && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {!isAppending && !hasMore && transactions.length > 0 && <p className="text-sm text-muted-foreground">Keine weiteren Transaktionen verfügbar</p>}
            {error && !isAppending && (
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Fehler beim Laden: {error}</p>
                <Button onClick={() => retry()} variant="outline">Erneut versuchen</Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
