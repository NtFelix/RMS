"use client"

import { useEffect, useRef } from "react"
import { useInView } from 'react-intersection-observer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Edit, ChevronsUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast"

// Interfaces
interface Finanz {
  id: string
  wohnung_id?: string
  name: string
  datum?: string
  betrag: number
  ist_einnahmen: boolean
  notiz?: string
  Wohnungen?: { id: string; name: string }
}
interface Wohnung { id: string; name: string; }
type FinanceSortKey = "name" | "wohnung" | "datum" | "betrag" | "typ"
type SortDirection = "asc" | "desc"

interface FinanceTransactionsProps {
  transactions: Finanz[]
  onEdit: (finance: Finanz) => void
  onAdd: () => void
  loadFinances: () => Promise<void>
  // New props for server-side controls
  filters: { apartmentId: string; year: string; type: string; searchQuery: string; };
  onFilterChange: (filterName: keyof FinanceTransactionsProps['filters'], value: string) => void;
  sorting: { key: string; direction: string; };
  onSortChange: (key: FinanceSortKey) => void;
  wohnungen: Wohnung[];
  availableYears: string[];
  // Infinite scroll props
  loadMore: () => void;
  hasMore: boolean;
  totalCount: number;
  loading: 'initial' | 'loading' | 'error' | 'idle';
  loadingMore: boolean;
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
  transactions,
  onEdit,
  onAdd,
  loadFinances,
  filters,
  onFilterChange,
  sorting,
  onSortChange,
  wohnungen,
  availableYears,
  loadMore,
  hasMore,
  totalCount,
  loading,
  loadingMore,
}: FinanceTransactionsProps) {
  const { ref, inView } = useInView({ threshold: 0, triggerOnce: false });

  useEffect(() => {
    if (inView && !loadingMore && hasMore) {
      loadMore();
    }
  }, [inView, loadMore, loadingMore, hasMore]);

  const handleExportCsv = () => {
    const header = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz'];
    const rows = transactions.map(f => [
      f.name,
      f.Wohnungen?.name || '',
      f.datum ? formatDate(f.datum) : '',
      f.betrag.toString().replace('.', ','),
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

  const renderSortIcon = (key: FinanceSortKey) => {
    if (sorting.key !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return sorting.direction === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: FinanceSortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div
        onClick={() => onSortChange(sortKey)}
        className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2"
      >
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  const balance = transactions.reduce((acc, t) => acc + (t.ist_einnahmen ? t.betrag : -t.betrag), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Finanzliste</CardTitle>
          <CardDescription>
            {`Zeigt ${transactions.length} von ${totalCount} Transaktionen`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={filters.apartmentId} onValueChange={(val) => onFilterChange('apartmentId', val)}>
                  <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Wohnungen</SelectItem>
                    {wohnungen.map((wohnung) => (
                      <SelectItem key={wohnung.id} value={wohnung.id}>
                        {wohnung.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.year} onValueChange={(val) => onFilterChange('year', val)}>
                  <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Jahre</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.type} onValueChange={(val) => onFilterChange('type', val)}>
                  <SelectTrigger><SelectValue placeholder="Transaktionstyp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Transaktionen</SelectItem>
                    <SelectItem value="einnahme">Einnahme</SelectItem>
                    <SelectItem value="ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Transaktion suchen..."
                    className="pl-8"
                    value={filters.searchQuery}
                    onChange={(e) => onFilterChange('searchQuery', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Als CSV exportieren
                </Button>
              </div>
            </div>

            <div className="text-right">
                <div className="text-sm text-muted-foreground">Saldo (geladene Transaktionen)</div>
                <div className="text-xl font-bold">{balance.toFixed(2).replace(".", ",")} €</div>
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
                  {loading === 'initial' ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Keine Transaktionen gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((finance) => (
                      <FinanceContextMenu
                        key={finance.id}
                        finance={finance}
                        onEdit={() => onEdit && onEdit(finance)}
                        onStatusToggle={async () => {
                          try {
                            const response = await fetch(`/api/finanzen/${finance.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ 
                                ist_einnahmen: !finance.ist_einnahmen 
                              }),
                            })
                            
                            if (!response.ok) {
                              throw new Error("Fehler beim Umschalten des Status")
                            }
                            
                            toast({
                              title: "Status geändert",
                              description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.`,
                            })
                            
                            // Aktualisieren der Daten
                            loadFinances && loadFinances()
                          } catch (error) {
                            console.error("Fehler beim Umschalten des Status:", error)
                            toast({
                              title: "Fehler",
                              description: "Der Status konnte nicht geändert werden.",
                              variant: "destructive",
                            })
                          }
                        }}
                        onRefresh={() => {
                          loadFinances && loadFinances()
                        }}
                      >
                        <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(finance)}>
                          <TableCell>{finance.name}</TableCell>
                          <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                          <TableCell>{formatDate(finance.datum)}</TableCell>
                          <TableCell>
                            <span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>
                              {finance.betrag.toFixed(2).replace(".", ",")} €
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={finance.ist_einnahmen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                              {finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </FinanceContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Loading/Error/End-of-data indicators */}
            <div ref={ref} className="flex justify-center items-center p-4 h-14">
              {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {!loadingMore && !hasMore && transactions.length > 0 && <p className="text-sm text-muted-foreground">Keine weiteren Transaktionen verfügbar</p>}
              {loading === 'error' && (
                <div className="text-center text-red-500">
                  <p>Fehler beim Laden der Transaktionen.</p>
                  <Button onClick={() => loadFinances()} variant="outline" size="sm" className="mt-2">
                    Erneut versuchen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
