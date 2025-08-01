"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Edit, Trash, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceContextMenu } from "@/components/finance-context-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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

interface FinanceFilters {
  apartment: string;
  year: string;
  type: string;
  search: string;
}

interface FinanceTransactionsProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
  filters: FinanceFilters;
  onFilterChange: (key: keyof FinanceFilters, value: any) => void;
  onEdit: (finance: Finanz) => void;
  onAdd: () => void;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  totalCount: number;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function FinanceTransactions({
  finances,
  wohnungen,
  filters,
  onFilterChange,
  onEdit,
  onAdd,
  loadMore,
  hasMore,
  isLoading,
  isLoadingMore,
  totalCount
}: FinanceTransactionsProps) {

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const apartments = ["Alle Wohnungen", ...wohnungen.map(w => w.name)];
  const years = ["Alle Jahre", ...Array.from(new Set(finances.map(f => f.datum ? f.datum.split("-")[0] : ''))).filter(Boolean).sort((a,b) => Number(b) - Number(a))];

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);


  const handleExportCsv = () => {
    const header = ['Bezeichnung','Wohnung','Datum','Betrag','Typ','Notiz'];
    const rows = finances.map(f => [
      `"${f.name.replace(/"/g, '""')}"`,
      f.Wohnungen?.name || '',
      f.datum ? formatDate(f.datum) : '',
      f.betrag.toString().replace('.',','),
      f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      `"${(f.notiz || '').replace(/"/g, '""')}"`
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Finanzliste</CardTitle>
          <CardDescription>
            {`Zeigt ${finances.length} von ${totalCount} Transaktionen`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                <Select value={filters.apartment} onValueChange={(value) => onFilterChange("apartment", value)}>
                  <SelectTrigger><SelectValue placeholder="Wohnung auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Wohnungen</SelectItem>
                    {wohnungen.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filters.year} onValueChange={(value) => onFilterChange("year", value)}>
                  <SelectTrigger><SelectValue placeholder="Jahr auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Jahre</SelectItem>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(value) => onFilterChange("type", value)}>
                  <SelectTrigger><SelectValue placeholder="Transaktionstyp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Transaktionen</SelectItem>
                    <SelectItem value="income">Einnahme</SelectItem>
                    <SelectItem value="expense">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative col-span-1 sm:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Transaktion suchen..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => onFilterChange("search", e.target.value)}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Bezeichnung</TableHead>
                    <TableHead className="w-[20%]">Wohnung</TableHead>
                    <TableHead className="w-[15%]">Datum</TableHead>
                    <TableHead className="w-[15%]">Betrag</TableHead>
                    <TableHead className="w-[15%]">Typ</TableHead>
                    <TableHead className="w-[10%] text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : finances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Keine Transaktionen gefunden.</TableCell>
                    </TableRow>
                  ) : (
                    finances.map((finance) => (
                      <FinanceContextMenu
                        key={finance.id}
                        finance={finance}
                        onEdit={() => onEdit(finance)}
                        onStatusToggle={() => {
                          // This is a placeholder. A proper implementation would call a server action
                          // and then refresh the data via the onAdd() callback.
                          console.log("Status toggle for", finance.id);
                          onAdd();
                        }}
                        onRefresh={onAdd}
                      >
                        <TableRow>
                          <TableCell>{finance.name}</TableCell>
                          <TableCell>{finance.Wohnungen?.name || "-"}</TableCell>
                          <TableCell>{formatDate(finance.datum)}</TableCell>
                          <TableCell>
                            <span className={finance.ist_einnahmen ? "text-green-600" : "text-red-600"}>
                              {finance.betrag.toFixed(2).replace(".", ",")} €
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={finance.ist_einnahmen ? "default" : "destructive"}>
                              {finance.ist_einnahmen ? "Einnahme" : "Ausgabe"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(finance)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </FinanceContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div ref={loadMoreRef} className="flex justify-center items-center p-4">
              {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin" />}
              {!hasMore && finances.length > 0 && <p className="text-sm text-muted-foreground">Keine weiteren Transaktionen.</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
