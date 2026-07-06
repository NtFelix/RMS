"use client";

import { useState, useEffect, useTransition, useId } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuditLogsAction, getAuditLogDetailsAction } from "@/app/organisation-actions";
import { 
  Clock, 
  Database, 
  User, 
  Eye, 
  RefreshCw, 
  FileJson, 
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLogSummary {
  id: string;
  organisation_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';
  changed_by: string | null;
  changed_by_name: string;
  changed_by_email: string | null;
  changed_at: string;
}

interface AuditLogDetail extends AuditLogSummary {
  old_data: any;
  new_data: any;
}

// Map database table names to human-readable names
const TABLE_NAME_MAP: Record<string, string> = {
  Haeuser: "Häuser",
  Wohnungen: "Wohnungen",
  Mieter: "Mieter",
  Finanzen: "Finanzen",
  Dokumente_Metadaten: "Dokumente",
  Aufgaben: "Aufgaben",
  Nebenkosten: "Nebenkosten",
  Zaehler: "Zähler",
  Zaehler_Ablesungen: "Ablesungen",
  Rechnungen: "Rechnungen",
  Vorlagen: "Vorlagen",
};

// Pure helper function to format individual values
function formatValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'boolean') return val ? 'Ja' : 'Nein';
  return String(val);
}

// Pure helper function to get color classes based on audit action
function getActionBadgeColor(action: AuditLogSummary['action']) {
  switch (action) {
    case 'INSERT':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'UPDATE':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'SOFT_DELETE':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'RESTORE':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
    case 'DELETE':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
  }
}

// Sub-component for showing visual diffs between old and new state
interface AuditLogDiffProps {
  action: string;
  oldData: any;
  newData: any;
}

function AuditLogDiff({ action, oldData, newData }: AuditLogDiffProps) {
  const oldObj = oldData || {};
  const newObj = newData || {};

  if (action === 'INSERT') {
    return (
      <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
        {Object.entries(newObj).map(([key, val]) => (
          <div key={key} className="grid grid-cols-3 py-1.5 border-b border-border/40 last:border-0 text-sm">
            <span className="font-medium text-muted-foreground col-span-1">{key}</span>
            <span className="text-foreground col-span-2 break-all font-mono text-xs">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (action === 'DELETE' || action === 'SOFT_DELETE') {
    return (
      <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
        {Object.entries(oldObj).map(([key, val]) => (
          <div key={key} className="grid grid-cols-3 py-1.5 border-b border-border/40 last:border-0 text-sm">
            <span className="font-medium text-muted-foreground col-span-1">{key}</span>
            <span className="text-foreground col-span-2 line-through opacity-70 break-all font-mono text-xs">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // UPDATE or RESTORE diffing
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  const changedKeys = allKeys.filter(k => {
    const oldVal = oldObj[k];
    const newVal = newObj[k];
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  });

  if (changedKeys.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-zinc-50 border border-zinc-100 dark:bg-zinc-950/20 dark:border-zinc-900/40 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0 text-zinc-500" />
        <span>Keine geänderten Felder vorhanden (z.B. nur interne Metadaten oder unberührte Relationen).</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changedKeys.map(key => (
        <div key={key} className="border rounded-lg p-3 bg-muted/10 space-y-2">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{key}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
              <div className="text-[10px] text-rose-500/80 mb-1 font-sans uppercase font-bold">Vorher:</div>
              <span className="line-through break-all">{formatValue(oldObj[key])}</span>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <div className="text-[10px] text-emerald-500/80 mb-1 font-sans uppercase font-bold">Nachher:</div>
              <span className="break-all">{formatValue(newObj[key])}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrganisationAuditLogTab() {
  const [logs, setLogs] = useState<AuditLogSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 15;
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  // Details Sheet State
  const [detailedLog, setDetailedLog] = useState<AuditLogDetail | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // loading state derived from useTransition
  const [isPending, startTransition] = useTransition();

  // Generate unique IDs for accessibility labels
  const tableFilterSelectId = useId();
  const actionFilterSelectId = useId();

  // Reset page to 1 when filters change to avoid getting stuck on empty pages
  useEffect(() => {
    setPage(1);
  }, [filterTable, filterAction]);

  // Load log summary list from database using page and filter selections
  const fetchLogs = (currentPage: number, table: string, action: string) => {
    setError(null);
    const offset = (currentPage - 1) * limit;

    startTransition(async () => {
      const res = await getAuditLogsAction(
        limit + 1, 
        offset, 
        table === "all" ? undefined : table, 
        action === "all" ? undefined : action
      );
      if (res.success && res.data) {
        const hasNext = res.data.length > limit;
        const pageData = hasNext ? res.data.slice(0, limit) : res.data;
        
        setLogs(pageData as AuditLogSummary[]);
        setHasMore(hasNext);
      } else {
        setError(res.error?.message || "Fehler beim Laden des Audit-Logs.");
      }
    });
  };

  useEffect(() => {
    fetchLogs(page, filterTable, filterAction);
  }, [page, filterTable, filterAction]);

  // Load detailed log on selection
  const handleSelectLog = (logId: string) => {
    setIsDetailsLoading(true);
    setIsSheetOpen(true);
    setDetailedLog(null);

    // Call details action (separate transition for independent detail loading state)
    startTransition(async () => {
      const res = await getAuditLogDetailsAction(logId);
      if (res.success && res.data) {
        setDetailedLog(res.data as AuditLogDetail);
      } else {
        setError(res.error?.message || "Fehler beim Laden der Details.");
        setIsSheetOpen(false);
      }
      setIsDetailsLoading(false);
    });
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="size-5 text-indigo-500" />
              Audit-Log
            </CardTitle>
            <CardDescription>
              Vollständiges Protokoll aller Änderungen an Häusern, Wohnungen, Mietern, Finanzen und mehr.
            </CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full md:w-auto flex items-center gap-1.5"
            onClick={() => fetchLogs(page, filterTable, filterAction)}
            disabled={isPending}
          >
            <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
            Aktualisieren
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40 mt-2">
          <div className="flex-1 max-w-[240px]">
            <label htmlFor={tableFilterSelectId} className="text-xs font-medium text-muted-foreground mb-1 block">
              Tabelle filtern
            </label>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger id={tableFilterSelectId}>
                <SelectValue placeholder="Alle Tabellen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Tabellen</SelectItem>
                {Object.entries(TABLE_NAME_MAP).map(([dbName, label]) => (
                  <SelectItem key={dbName} value={dbName}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 max-w-[200px]">
            <label htmlFor={actionFilterSelectId} className="text-xs font-medium text-muted-foreground mb-1 block">
              Aktion filtern
            </label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger id={actionFilterSelectId}>
                <SelectValue placeholder="Alle Aktionen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                <SelectItem value="INSERT">Erstellen (INSERT)</SelectItem>
                <SelectItem value="UPDATE">Bearbeiten (UPDATE)</SelectItem>
                <SelectItem value="SOFT_DELETE">In Papierkorb (SOFT_DELETE)</SelectItem>
                <SelectItem value="RESTORE">Wiederherstellen (RESTORE)</SelectItem>
                <SelectItem value="DELETE">Endgültig löschen (DELETE)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="rounded-md border border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Zeitpunkt</TableHead>
                <TableHead className="w-[150px]">Tabelle</TableHead>
                <TableHead className="w-[140px]">Aktion</TableHead>
                <TableHead>Geändert von</TableHead>
                <TableHead className="text-right w-[100px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && logs.length === 0 ? (
                // Skeleton Loader during initial page load
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Keine Einträge im Audit-Log gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow 
                    key={log.id} 
                    className="group hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectLog(log.id)}
                  >
                    <TableCell className="font-medium whitespace-nowrap" suppressHydrationWarning>
                      {new Date(log.changed_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <Database className="size-3.5 text-zinc-400 shrink-0" />
                        {TABLE_NAME_MAP[log.table_name] || log.table_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("px-2 py-0.5 font-semibold text-xs border uppercase rounded-full shadow-none", getActionBadgeColor(log.action))}>
                        {log.action === 'SOFT_DELETE' ? 'Papierkorb' : log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          <User className="size-3.5 text-zinc-400 shrink-0" />
                          {log.changed_by_name}
                        </span>
                        {log.changed_by_email && (
                          <span className="text-xs text-muted-foreground pl-5">{log.changed_by_email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="size-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        {!isPending && logs.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              Seite {page}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                disabled={page === 1 || isPending}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Vorherige
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                disabled={!hasMore || isPending}
                onClick={() => setPage(p => p + 1)}
              >
                Nächste
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Audit Log Entry Details Side Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[640px] w-full flex flex-col h-full bg-background border-l border-border">
          <SheetHeader className="pb-4 border-b border-border/40">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Clock className="size-5 text-indigo-500" />
              Änderungsdetails
            </SheetTitle>
            <SheetDescription>
              Genaue Details zur ausgeführten Datenbankaktion.
            </SheetDescription>
          </SheetHeader>

          {isDetailsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              <span className="text-sm text-muted-foreground">Details werden geladen...</span>
            </div>
          ) : detailedLog ? (
            <ScrollArea className="flex-1 pr-1">
              <div className="space-y-6 py-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/10 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Tabelle</span>
                    <span className="font-semibold text-foreground">{TABLE_NAME_MAP[detailedLog.table_name] || detailedLog.table_name}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Aktion</span>
                    <Badge variant="outline" className={cn("px-2 py-0.5 mt-0.5 border uppercase font-bold", getActionBadgeColor(detailedLog.action))}>
                      {detailedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Zeitpunkt</span>
                    <span className="text-foreground" suppressHydrationWarning>
                      {new Date(detailedLog.changed_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Ausgeführt von</span>
                    <span className="text-foreground font-medium block">{detailedLog.changed_by_name}</span>
                    {detailedLog.changed_by_email && (
                      <span className="text-xs text-muted-foreground">{detailedLog.changed_by_email}</span>
                    )}
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground block uppercase">Datensatz-ID (UUID)</span>
                    <span className="font-mono text-xs break-all text-foreground">{detailedLog.record_id}</span>
                  </div>
                </div>

                {/* Data Diff & Raw JSON Tabs */}
                <Tabs defaultValue="diff" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 border border-border/40 bg-muted/30">
                    <TabsTrigger value="diff" className="flex items-center gap-1.5">
                      <ListFilter className="size-4" />
                      Änderungsvergleich
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="flex items-center gap-1.5">
                      <FileJson className="size-4" />
                      Rohdaten (JSON)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="diff" className="pt-4">
                    <h3 className="font-semibold text-sm mb-3 text-foreground">Feldänderungen:</h3>
                    <AuditLogDiff 
                      action={detailedLog.action} 
                      oldData={detailedLog.old_data} 
                      newData={detailedLog.new_data} 
                    />
                  </TabsContent>

                  <TabsContent value="raw" className="pt-4">
                    <div className="space-y-4">
                      {detailedLog.old_data && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-rose-500 uppercase">Alter Zustand (old_data)</h4>
                          <pre className="p-3 bg-zinc-950 text-zinc-200 dark:bg-zinc-900 rounded-lg text-xs overflow-auto max-h-[220px] font-mono leading-relaxed">
                            {JSON.stringify(detailedLog.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {detailedLog.new_data && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-semibold text-emerald-500 uppercase">Neuer Zustand (new_data)</h4>
                          <pre className="p-3 bg-zinc-950 text-zinc-200 dark:bg-zinc-900 rounded-lg text-xs overflow-auto max-h-[220px] font-mono leading-relaxed">
                            {JSON.stringify(detailedLog.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              Keine Details geladen.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
