"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ChevronsUpDown, ArrowUp, ArrowDown, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceContextMenu } from "@/components/finance-context-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Filters } from "@/app/(dashboard)/finanzen/client-wrapper";
import { deleteFinanceAction, financeServerAction } from "@/app/finanzen-actions";

// Interfaces
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
interface Wohnung { id: string; name: string; }
type FinanceSortKey = "name" | "wohnung" | "datum" | "betrag" | "typ";

interface FinanceTransactionsProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
  onEdit: (finance: Finanz) => void;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  onRetry: () => void;
  totalCount: number;
  filters: Filters;
  onFilterChange: (filterName: keyof Omit<Filters, 'searchQuery' | 'sortBy' | 'sortDirection'>, value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (key: string, direction: string) => void;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SkeletonRow = () => (
  <TableRow>
    <TableCell className="h-12"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
  </TableRow>
);

export function FinanceTransactions({
  finances,
  wohnungen,
  onEdit,
  loadMore,
  hasMore,
  isLoading,
  isInitialLoading,
  error,
  onRetry,
  totalCount,
  filters,
  onFilterChange,
  onSearchChange,
  onSortChange,
}: FinanceTransactionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [financeToDelete, setFinanceToDelete] = useState<Finanz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastTransactionElementRef = useCallback((node: HTMLElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMore]);

  const apartments = ["Alle Wohnungen", ...wohnungen.map(w => w.id)];
  const apartmentNameMap = wohnungen.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as Record<string, string>);

  const years = ["Alle Jahre", ...Array.from(new Set(Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString())))];

  const handleSort = (key: FinanceSortKey) => {
    const newDirection = filters.sortBy === key && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(key, newDirection);
  };

  const renderSortIcon = (key: FinanceSortKey) => {
    if (filters.sortBy !== key) return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    return filters.sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const TableHeaderCell = ({ sortKey, children, className }: { sortKey: FinanceSortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <div onClick={() => handleSort(sortKey)} className="flex items-center gap-2 cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/50 -ml-2">
        {children}
        {renderSortIcon(sortKey)}
      </div>
    </TableHead>
  );

  const handleExportCsv = () => {
    const header = ['Bezeichnung','Wohnung','Datum','Betrag','Typ','Notiz'];
    const rows = finances.map(f => [
      f.name,
      f.Wohnungen?.name||'',
      f.datum||'',
      f.betrag.toString().replace('.',','),
      f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      f.notiz||''
    ].join(';'));
    const csvContent = [header.join(';'), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'finanzen.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteConfirm = async () => {
    if (!financeToDelete) return;
    setIsDeleting(true);
    const result = await deleteFinanceAction(financeToDelete.id);
    if (result.success) {
      toast({ title: 'Gelöscht', description: 'Transaktion wurde erfolgreich entfernt.' });
      onRetry(); // Refresh data
    } else {
      toast({ title: 'Fehler', description: result.error?.message || 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setFinanceToDelete(null);
  };

  const handleStatusToggle = async (finance: Finanz) => {
    const { Wohnungen, ...financeData } = finance;
    const result = await financeServerAction(finance.id, {
      ...financeData,
      ist_einnahmen: !finance.ist_einnahmen,
    });

    if (result.success) {
      toast({ title: 'Status geändert', description: `Transaktion wurde als ${!finance.ist_einnahmen ? 'Einnahme' : 'Ausgabe'} markiert.` });
      onRetry(); // Refresh data
    } else {
      toast({ title: 'Fehler', description: result.error?.message || 'Status konnte nicht geändert werden.', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transaktionen</CardTitle>
          <CardDescription>
            {`Zeige ${finances.length} von ${totalCount} Transaktionen.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={filters.apartmentId} onValueChange={(value) => onFilterChange('apartmentId', value)}>
                  <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                  <SelectContent>
                    {apartments.map((apartmentId) => (
                      <SelectItem key={apartmentId} value={apartmentId}>
                        {apartmentNameMap[apartmentId] || 'Alle Wohnungen'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.year} onValueChange={(value) => onFilterChange('year', value)}>
                  <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                  <SelectContent>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
                  <SelectTrigger><SelectValue placeholder="Typ auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alle Transaktionen">Alle Transaktionen</SelectItem>
                    <SelectItem value="Einnahme">Einnahme</SelectItem>
                    <SelectItem value="Ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Transaktion suchen..." className="pl-8" value={filters.searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={finances.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell sortKey="name" className="w-[25%]">Bezeichnung</TableHeaderCell>
                    <TableHeaderCell sortKey="wohnung" className="w-[20%]">Wohnung</TableHeaderCell>
                    <TableHeaderCell sortKey="datum" className="w-[15%]">Datum</TableHeaderCell>
                    <TableHeaderCell sortKey="betrag" className="w-[15%] text-right">Betrag</TableHeaderCell>
                    <TableHeaderCell sortKey="typ" className="w-[15%]">Typ</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
                        <p className="font-semibold text-red-600">Fehler beim Laden der Transaktionen</p>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <Button onClick={onRetry}>Erneut versuchen</Button>
                      </TableCell>
                    </TableRow>
                  ) : finances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">Keine Transaktionen für die aktuellen Filter gefunden.</TableCell>
                    </TableRow>
                  ) : (
                    finances.map((finance, index) => {
                      const rowRef = finances.length === index + 1 ? lastTransactionElementRef : null;
                      return (
                        <FinanceContextMenu key={finance.id} finance={finance} onEdit={() => onEdit(finance)} onRefresh={onRetry} onStatusToggle={() => handleStatusToggle(finance)}>
                          <TableRow ref={rowRef} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(finance)}>
                            <TableCell>{finance.name}</TableCell>
                            <TableCell>{finance.Wohnungen?.name || '-'}</TableCell>
                            <TableCell>{formatDate(finance.datum)}</TableCell>
                            <TableCell className="text-right">
                              <span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>
                                {finance.betrag.toFixed(2).replace(".", ",")} €
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={finance.ist_einnahmen ? "default" : "destructive"} className={finance.ist_einnahmen ? "bg-green-100 text-green-800" : ""}>
                                {finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </FinanceContextMenu>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {isLoading && !isInitialLoading && (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Lade mehr...</p>
              </div>
            )}
            {!isLoading && !hasMore && finances.length > 0 && (
              <div className="text-center py-4 text-muted-foreground">
                Keine weiteren Transaktionen verfügbar.
              </div>
            )}
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
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Löschen...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
