"use client";

import { useState, useEffect, useTransition, useMemo, useCallback, useRef, Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";

import { getAuditLogsAction, getAuditLogDetailsAction } from "@/app/organisation-actions";
import { 
  Clock, 
  User, 
  Eye, 
  Copy,
  RefreshCw, 
  Download,
  Info,
  Calculator,
  Key,
  AlertCircle,
  Building2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AuditLogDetailSkeleton } from "./organisation-loading-skeletons";
import { MODULE_CONFIG, ACTION_CONFIG, getTableIcon } from "@/lib/organisation/permission-utils";

interface AuditLogSummary {
  id: string;
  organisation_id: string;
  tabellenname: string;
  datensatz_id: string;
  aktion: 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';
  geaendert_von: string | null;
  geaendert_von_name: string;
  geaendert_von_email: string | null;
  geaendert_am: string;
}

interface AuditLogDetail extends AuditLogSummary {
  alte_daten: any;
  neue_daten: any;
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
  Organisation: "Organisation",
  Organisation_Mitglieder: "Mitarbeiter",
  Organisation_Policies: "Richtlinien",
  Organisation_Mitglieder_Policies: "Mitarbeiter-Richtlinien",
  Organisation_Mitglieder_Overrides: "Mitarbeiter-Abweichungen",
  Organisation_Einladungen: "Einladungen",
};

const FRIENDLY_COLUMN_MAP: Record<string, string> = {
  id: "ID",
  name: "Name",
  beschreibung: "Beschreibung",
  strasse: "Straße",
  hausnummer: "Hausnummer",
  plz: "PLZ",
  ort: "Ort",
  land: "Land",
  groesse: "Größe (m²)",
  kaltmiete: "Kaltmiete",
  warmmiete: "Warmmiete",
  nebenkosten: "Nebenkosten",
  telefon: "Telefonnummer",
  email: "E-Mail-Adresse",
  rolle: "Rolle",
  status: "Status",
  erstellt_am: "Erstellt am",
  geaendert_am: "Geändert am",
  einstellungen: "Einstellungen",
  einheiten: "Einheiten",
  zaehlernummer: "Zählernummer",
  stand: "Zählerstand",
  ablesedatum: "Ablesedatum",
  betrag: "Betrag",
  faellig_am: "Fällig am",
  bezahlt: "Bezahlt",
  kaution: "Kaution",
  amount: "Betrag",
  paymentDate: "Zahlungsdatum",
  createdAt: "Erstellt am",
  updatedAt: "Aktualisiert am",
  zaehlerkosten: "Zählerkosten",
  zaehlerverbrauch: "Zählerverbrauch",
  bewerbung_metadaten: "Bewerbungsdaten",
  berechtigungen: "Berechtigungen",
  module: "Module",
  objekte: "Objektzugriff",
  policy_id: "Richtlinie",
};



// Action color classes
function getActionBadgeColor(action: AuditLogSummary['aktion']) {
  switch (action) {
    case 'INSERT':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900/40';
    case 'UPDATE':
      return 'bg-blue-500/10 text-blue-700 border-blue-200/60 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-900/40';
    case 'SOFT_DELETE':
      return 'bg-amber-500/10 text-amber-700 border-amber-200/60 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-900/40';
    case 'RESTORE':
      return 'bg-teal-500/10 text-teal-700 border-teal-200/60 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-900/40';
    case 'DELETE':
      return 'bg-rose-500/10 text-rose-700 border-rose-200/60 dark:bg-rose-500/20 dark:text-rose-500 dark:border-rose-900/40';
    default:
      return 'bg-zinc-500/10 text-zinc-700 border-zinc-200/60 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-800/40';
  }
}



const ZAEHLER_LABEL_MAP: Record<string, string> = {
  kaltwasser: "Kaltwasserzähler",
  warmwasser: "Warmwasserzähler",
  waermemenge: "Wärmemengenzähler",
  heizkostenverteiler: "Heizkostenverteiler",
  strom: "Stromzähler",
  gas: "Gaszähler",
};

// Simple diff view
function SimpleDiff({ aktion, alteDaten, neueDaten }: { aktion: string; alteDaten: any; neueDaten: any }) {
  const oldObj = alteDaten || {};
  const newObj = neueDaten || {};

  const isDelete = aktion === "DELETE" || aktion === "SOFT_DELETE";

  function getChangedKeys(objA: any, objB: any): string[] {
    const all = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    return Array.from(all).filter((k) => JSON.stringify(objA?.[k]) !== JSON.stringify(objB?.[k]));
  }

  function renderPermissionActions(oldActions: string[] | undefined, newActions: string[] | undefined) {
    const oldSet = new Set(oldActions || []);
    const newSet = new Set(newActions || []);
    const added = Array.from(newSet).filter((a) => !oldSet.has(a));
    const removed = Array.from(oldSet).filter((a) => !newSet.has(a));

    return (
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {removed.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-rose-500/70 uppercase tracking-wider">Entzogen:</span>
            {removed.map((a) => {
              const cfg = ACTION_CONFIG[a];
              const Icon = cfg?.icon;
              return (
                <span key={a} className="inline-flex items-center gap-1 text-rose-500/70 line-through text-xs">
                  {Icon && <Icon className="size-3.5" />}
                  {cfg?.label || a}
                </span>
              );
            })}
          </div>
        )}
        {added.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-emerald-600/70 uppercase tracking-wider">Erteilt:</span>
            {added.map((a) => {
              const cfg = ACTION_CONFIG[a];
              const Icon = cfg?.icon;
              return (
                <span key={a} className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                  {Icon && <Icon className="size-3.5" />}
                  {cfg?.label || a}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderModuleDiff(oldModules: any, newModules: any): React.ReactNode {
    const oldMod = oldModules || {};
    const newMod = newModules || {};
    const allModKeys = Array.from(new Set([...Object.keys(oldMod), ...Object.keys(newMod)]));
    const changedModKeys = allModKeys.filter((k) => JSON.stringify(oldMod[k]) !== JSON.stringify(newMod[k]));

    if (changedModKeys.length === 0) return null;

    return (
      <div className="space-y-3.5">
        {changedModKeys.map((modKey) => {
          const cfg = MODULE_CONFIG[modKey];
          const Icon = cfg?.icon;
          const oldActs: string[] = oldMod[modKey] || [];
          const newActs: string[] = newMod[modKey] || [];

          return (
            <div key={modKey} className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-1 sm:space-y-0">
              <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                {Icon && <Icon className="size-4 text-zinc-500" />}
                {cfg?.label || modKey}
              </span>
              {renderPermissionActions(oldActs, newActs)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderObjekteDiff(oldObjekte: any, newObjekte: any): React.ReactNode {
    const oldH = oldObjekte?.haeuser;
    const newH = newObjekte?.haeuser;
    if (JSON.stringify(oldH) === JSON.stringify(newH)) return null;

    const renderHouseVal = (val: any) => {
      if (val === null) return { label: "Alle Häuser (uneingeschränkt)", className: "font-medium" };
      if (Array.isArray(val) && val.length === 0) return { label: "Keine Häuser", className: "text-muted-foreground" };
      if (Array.isArray(val)) return { label: `${val.length} Häuser (spezifisch)`, className: "text-muted-foreground" };
      return { label: String(val), className: "" };
    };

    const oldR = renderHouseVal(oldH);
    const newR = renderHouseVal(newH);

    return (
      <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-0.5 sm:space-y-0">
        <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
          <Building2 className="size-4 text-zinc-500" />
          Häuserzugriff
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm text-rose-500/70 line-through ${oldR.className}`}>{oldR.label}</span>
          <span className="text-muted-foreground/30 text-xs shrink-0">→</span>
          <span className={`text-sm font-medium text-emerald-600 dark:text-emerald-400 ${newR.className}`}>{newR.label}</span>
        </div>
      </div>
    );
  }

  function renderNebenkostenDiff(oldVal: any, newVal: any): React.ReactNode {
    const oldArr: { amount?: string | number; date?: string }[] = Array.isArray(oldVal) ? oldVal : [];
    const newArr: { amount?: string | number; date?: string }[] = Array.isArray(newVal) ? newVal : [];

    if (JSON.stringify(oldArr) === JSON.stringify(newArr)) return null;

    return (
      <div className="border-2 border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4 space-y-3 bg-zinc-50/10 dark:bg-zinc-950/10">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest">
          <Calculator className="size-4 text-zinc-500" />
          Nebenkosten-Vorauszahlungen
        </div>
        <div className="space-y-2">
          {newArr.map((entry, i) => {
            const oldEntry = oldArr.find((o) => o.date === entry.date);
            const isNew = !oldEntry;
            const amountChanged = oldEntry && String(oldEntry.amount) !== String(entry.amount);
            const dateStr = entry.date ? new Date(entry.date + "T00:00:00").toLocaleDateString("de-DE") : "—";
            return (
              <div key={entry.date || i} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground min-w-[80px]">{dateStr}:</span>
                {isNew ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{entry.amount} €</span>
                ) : amountChanged ? (
                  <>
                    <span className="text-rose-500/70 line-through">{oldEntry.amount} €</span>
                    <span className="text-muted-foreground/30 text-xs">→</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{entry.amount} €</span>
                  </>
                ) : (
                  <span className="font-medium">{entry.amount} €</span>
                )}
              </div>
            );
          })}
          {oldArr
            .filter((o) => !newArr.some((n) => n.date === o.date))
            .map((removed, i) => (
              <div key={`removed-${removed.date || i}`} className="text-sm text-rose-500/70 line-through">
                {removed.date ? new Date(removed.date + "T00:00:00").toLocaleDateString("de-DE") : "—"}: {removed.amount} €
              </div>
            ))}
        </div>
      </div>
    );
  }

  function renderKautionDiff(oldVal: any, newVal: any): React.ReactNode {
    const fields: { key: string; label: string }[] = [
      { key: "amount", label: "Betrag" },
      { key: "paymentDate", label: "Zahlungsdatum" },
      { key: "status", label: "Status" },
    ];

    const changedFields = fields.filter((f) => JSON.stringify(oldVal?.[f.key]) !== JSON.stringify(newVal?.[f.key]));
    if (changedFields.length === 0) return null;

    return (
      <div className="sm:grid sm:gap-3 space-y-2 sm:space-y-0">
        {changedFields.map((f) => {
          const oldV = f.key === "paymentDate" && oldVal?.[f.key]
            ? new Date(oldVal[f.key] + "T00:00:00").toLocaleDateString("de-DE")
            : f.key === "amount" ? `${oldVal?.[f.key]} €` : String(oldVal?.[f.key] ?? "—");
          const newV = f.key === "paymentDate" && newVal?.[f.key]
            ? new Date(newVal[f.key] + "T00:00:00").toLocaleDateString("de-DE")
            : f.key === "amount" ? `${newVal?.[f.key]} €` : String(newVal?.[f.key] ?? "—");

          return (
            <div key={f.key} className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-0.5 sm:space-y-0">
              <span className="text-sm text-muted-foreground/70">{f.label}</span>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-rose-500/70 line-through">{oldV}</span>
                <span className="text-muted-foreground/30 text-xs">→</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{newV}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderZaehlerMapDiff(oldVal: any, newVal: any): React.ReactNode {
    const allKeys = Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]));
    const changed = allKeys.filter((k) => (oldVal?.[k] ?? 0) !== (newVal?.[k] ?? 0));
    if (changed.length === 0) return null;

    return (
      <div className="sm:grid sm:gap-3 space-y-2 sm:space-y-0">
        {changed.map((k) => {
          const label = ZAEHLER_LABEL_MAP[k] || k;
          const oldV = oldVal?.[k] ?? 0;
          const newV = newVal?.[k] ?? 0;
          return (
            <div key={k} className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-0.5 sm:space-y-0">
              <span className="text-sm text-muted-foreground/70">{label}</span>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {oldVal ? (
                  <>
                    <span className="text-rose-500/70 line-through">{oldV}</span>
                    <span className="text-muted-foreground/30 text-xs">→</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{newV}</span>
                  </>
                ) : (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{newV}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderField(key: string, oldVal: any, newVal: any, depth: number): React.ReactNode {
    const label = FRIENDLY_COLUMN_MAP[key] || key;

    // Permission-specific rendering
    if (key === "module") return <Fragment key={key}>{renderModuleDiff(oldVal, newVal)}</Fragment>;
    if (key === "objekte") return <Fragment key={key}>{renderObjekteDiff(oldVal, newVal)}</Fragment>;
    // JSONB-specific rendering
    if (key === "nebenkosten") return <Fragment key={key}>{renderNebenkostenDiff(oldVal, newVal)}</Fragment>;
    if (key === "kaution") return <Fragment key={key}>{renderKautionDiff(oldVal, newVal)}</Fragment>;
    if (key === "zaehlerkosten" || key === "zaehlerverbrauch") return <Fragment key={key}>{renderZaehlerMapDiff(oldVal, newVal)}</Fragment>;

    const bothObjects =
      typeof oldVal === "object" && oldVal !== null && !Array.isArray(oldVal) &&
      typeof newVal === "object" && newVal !== null && !Array.isArray(newVal);

    if (bothObjects) {
      const subKeys = getChangedKeys(oldVal, newVal);
      if (subKeys.length === 0) return null;

      return (
        <div key={key} className="space-y-3">
          {depth === 0 ? (
            <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest block">{label}</span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground/70 block" style={{ paddingLeft: depth * 12 }}>{label}</span>
          )}
          <div style={{ paddingLeft: (depth + 1) * 12 }}>
            {subKeys.map((subKey) => renderField(subKey, oldVal[subKey], newVal[subKey], depth + 1))}
          </div>
        </div>
      );
    }

    const isJson = typeof oldVal === "object" && oldVal !== null ||
                  typeof newVal === "object" && newVal !== null;

    if (isJson) {
      return (
        <div key={key} className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-1 sm:space-y-0" style={{ paddingLeft: depth * 12 }}>
          <span className="text-sm text-muted-foreground/70">{label}</span>
          <div className="grid grid-cols-2 gap-2">
            {isDelete || aktion === "UPDATE" || aktion === "RESTORE" ? (
              <pre className="text-xs bg-rose-500/[0.03] border border-rose-500/10 rounded-xl p-2.5 text-rose-600/80 dark:text-rose-400/80 overflow-auto max-h-[160px] leading-relaxed">
                {JSON.stringify(oldVal, null, 2)}
              </pre>
            ) : (
              <div />
            )}
            {isDelete ? (
              <div />
            ) : (
              <pre className="text-xs bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-2.5 text-emerald-700 dark:text-emerald-400 overflow-auto max-h-[160px] leading-relaxed">
                {JSON.stringify(newVal, null, 2)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    // Primitive value
    const displayVal = (val: any) => {
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "boolean") return val ? "Ja" : "Nein";
      return String(val);
    };

    return (
      <div key={key} className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-0.5 sm:space-y-0" style={{ paddingLeft: depth * 12 }}>
        <span className="text-sm text-muted-foreground/70">{label}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {isDelete ? (
            <span className="text-sm text-rose-500/70 line-through break-all">{displayVal(oldVal)}</span>
          ) : aktion === "INSERT" ? (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 break-all">{displayVal(newVal)}</span>
          ) : (
            <>
              <span className="text-sm text-rose-500/70 line-through break-all">{displayVal(oldVal)}</span>
              <span className="text-muted-foreground/30 text-xs shrink-0">→</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 break-all">{displayVal(newVal)}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isDelete) {
    const all = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    return (
      <div className="sm:grid sm:gap-5 space-y-3 sm:space-y-0">
        {all.map((key) => renderField(key, oldObj[key], newObj[key], 0))}
      </div>
    );
  }

  if (aktion === "INSERT") {
    const all = Object.keys(newObj);
    return (
      <div className="sm:grid sm:gap-5 space-y-3 sm:space-y-0">
        {all.map((key) => renderField(key, undefined, newObj[key], 0))}
      </div>
    );
  }

  // UPDATE / RESTORE
  const changedKeys = getChangedKeys(oldObj, newObj);
  if (changedKeys.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-sm text-muted-foreground/70 justify-center">
        <Info className="size-4 shrink-0 text-muted-foreground/40" />
        <span>Keine Feldänderungen vorhanden.</span>
      </div>
    );
  }

  return (
    <div className="sm:grid sm:gap-5 space-y-3 sm:space-y-0">
      {changedKeys.map((key) => renderField(key, oldObj[key], newObj[key], 0))}
    </div>
  );
}

export function OrganisationAuditLogTab() {
  const [logs, setLogs] = useState<AuditLogSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Tracking checkbox selected log IDs
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  // Clientside search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Infinite Scroll Pagination State
  const [page, setPage] = useState(1);
  const limit = 20;
  const [hasMore, setHasMore] = useState(true);

  // Filter States
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("last-7-days");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");

  // Detailed view sheet states
  const [detailedLog, setDetailedLog] = useState<AuditLogDetail | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // loading state transitions
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef(false);

  // Load data based on filters and page
  useEffect(() => {
    let active = true;
    
    const load = async () => {
      setError(null);
      const offset = (page - 1) * limit;
      
      const res = await getAuditLogsAction(
        limit + 1,
        offset,
        filterTable === "all" ? undefined : filterTable,
        filterAction === "all" ? undefined : filterAction
      );

      if (!active) return;

      if (res.success && res.data) {
        const hasNext = res.data.length > limit;
        const pageData = hasNext ? res.data.slice(0, limit) : res.data;
        
        setLogs(prev => {
          if (page === 1) {
            return pageData as AuditLogSummary[];
          } else {
            const existingIds = new Set(prev.map(l => l.id));
            const newItems = (pageData as AuditLogSummary[]).filter(l => !existingIds.has(l.id));
            return [...prev, ...newItems];
          }
        });
        setHasMore(hasNext);
      } else {
        setError(res.error?.message || "Fehler beim Laden des Audit-Logs.");
      }

      if (refreshRef.current && page === 1) {
        refreshRef.current = false;
        toast({
          title: "Aktualisiert",
          description: "Audit-Logs wurden neu geladen."
        });
      }
    };

    startTransition(() => {
      load();
    });

    return () => {
      active = false;
    };
  // Filter and search changes reset to page 1 so the latest matching entries load from the server.
  // customDateFrom/customDateTo excluded — the server doesn't filter by date, only client-side.
  }, [page, filterTable, filterAction, filterUser, filterTimeframe, searchQuery]);

  const handleFilterTableChange = (val: string) => {
    setFilterTable(val);
    setPage(1);
  };

  const handleFilterActionChange = (val: string) => {
    setFilterAction(val);
    setPage(1);
  };

  const handleFilterUserChange = (val: string) => {
    setFilterUser(val);
    setPage(1);
  };

  const handleFilterTimeframeChange = (val: string) => {
    setFilterTimeframe(val);
    setPage(1);
  };

  const handleSearchQueryChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleRefresh = () => {
    refreshRef.current = true;
    setPage(1);
  };

  // Scroll handler to load more logs when reaching bottom of table container
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
    if (isNearBottom && hasMore && !isPending) {
      setPage(p => p + 1);
    }
  }, [hasMore, isPending]);

  const handleSelectLog = (logId: string) => {
    setIsDetailsLoading(true);
    setIsSheetOpen(true);
    setDetailedLog(null);

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

  // Reset selected logs when filter changes
  useEffect(() => {
    setSelectedLogIds(new Set());
  }, [filterTable, filterAction, filterUser, filterTimeframe, searchQuery, customDateFrom, customDateTo]);

  // Prune stale selections — IDs that no longer exist in logs (e.g. after pagination refresh)
  useEffect(() => {
    setSelectedLogIds(prev => {
      const validIds = new Set(logs.map(l => l.id));
      let changed = false;
      for (const id of prev) {
        if (!validIds.has(id)) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const pruned = new Set(prev);
      for (const id of prev) {
        if (!validIds.has(id)) pruned.delete(id);
      }
      return pruned;
    });
  }, [logs]);

  const handleToggleAll = () => {
    const allSelected = filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.has(log.id));
    setSelectedLogIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredLogs.forEach(log => next.delete(log.id));
      } else {
        filteredLogs.forEach(log => next.add(log.id));
      }
      return next;
    });
  };

  const escapeCsvValue = (value: string | null | undefined): string => {
    if (!value) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const selectedLogsData = useMemo(() =>
    logs.filter(l => selectedLogIds.has(l.id)),
    [logs, selectedLogIds]
  );

  const handleBulkExport = async (format: 'csv' | 'xlsx') => {
    const data = selectedLogsData;
    const rows = data.map(l => ({
      ID: l.id,
      Tabelle: TABLE_NAME_MAP[l.tabellenname] || l.tabellenname,
      Aktion: l.aktion,
      'Geändert von': l.geaendert_von_name,
      'E-Mail': l.geaendert_von_email || '',
      Zeitpunkt: new Date(l.geaendert_am).toLocaleString('de-DE'),
    }));

    if (format === 'csv') {
      const headers = Object.keys(rows[0] || {});
      const csvHeader = headers.map(h => escapeCsvValue(h)).join(',');
      const csvRows = rows.map(r => headers.map(h => escapeCsvValue(String((r as any)[h] ?? ''))).join(','));
      const content = [csvHeader, ...csvRows].join('\n');
      const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "Export erfolgreich", description: `${data.length} Logs als CSV exportiert.`, variant: "success" });
    } else {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit-Log');
      XLSX.writeFile(wb, `audit-log_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export erfolgreich", description: `${data.length} Logs als Excel exportiert.`, variant: "success" });
    }
  };

  const handleBulkCopy = async (format: 'json' | 'md') => {
    const data = selectedLogsData;
    const text = format === 'json'
      ? JSON.stringify(data, null, 2)
      : ['| ID | Tabelle | Aktion | Geändert von | E-Mail | Zeitpunkt |',
         '|---|---|---|---|---|---|',
         ...data.map(l => `| ${l.id} | ${TABLE_NAME_MAP[l.tabellenname] || l.tabellenname} | ${l.aktion} | ${l.geaendert_von_name} | ${l.geaendert_von_email || ''} | ${new Date(l.geaendert_am).toLocaleString('de-DE')} |`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Kopiert", description: `${data.length} Logs als ${format.toUpperCase()} in die Zwischenablage kopiert.`, variant: "success" });
    } catch {
      toast({ title: "Fehler", description: "Konnte nicht in die Zwischenablage kopiert werden.", variant: "destructive" });
    }
  };

  // Extract unique users dynamically from the loaded logs to fill user filter
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    logs.forEach(log => {
      if (log.geaendert_von_name) {
        users.add(log.geaendert_von_name);
      }
    });
    return Array.from(users).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  // Clientside filters combining text search, timeframe, user selectors
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Text Search Filter
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const nameMatch = log.geaendert_von_name?.toLowerCase().includes(query);
        const emailMatch = log.geaendert_von_email?.toLowerCase().includes(query);
        const tableMatch = (TABLE_NAME_MAP[log.tabellenname] || log.tabellenname).toLowerCase().includes(query);
        const actionMatch = log.aktion?.toLowerCase().includes(query);
        const idMatch = log.datensatz_id?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !tableMatch && !actionMatch && !idMatch) {
          return false;
        }
      }

      // 2. User Filter
      if (filterUser !== "all" && log.geaendert_von_name !== filterUser) {
        return false;
      }

      // 3. Time period filter
      if (filterTimeframe !== "all") {
        const logDate = new Date(log.geaendert_am);
        const now = new Date();
        
        if (filterTimeframe === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (logDate < startOfToday) return false;
        } else if (filterTimeframe === "last-7-days") {
          const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          if (logDate < sevenDaysAgo) return false;
        } else if (filterTimeframe === "last-30-days") {
          const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          if (logDate < thirtyDaysAgo) return false;
        } else if (filterTimeframe === "custom") {
          if (customDateFrom) {
            const fromDate = new Date(customDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (logDate < fromDate) return false;
          }
          if (customDateTo) {
            const toDate = new Date(customDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (logDate > toDate) return false;
          }
        }
      }

      return true;
    });
  }, [logs, searchQuery, filterUser, filterTimeframe, customDateFrom, customDateTo]);

  return (
    <Card className="w-full rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden bg-white dark:bg-zinc-950 flex flex-col">
      {/* Top Header Section with Title, Description, and Actions */}
      <CardHeader className="p-6 border-b border-zinc-200/40 dark:border-zinc-800/40 flex flex-col gap-4 bg-zinc-50/50 dark:bg-zinc-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
Audit-Log
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Vollständiges Audit-Log über alle Datenaktivitäten Ihrer Organisation.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isPending}
              className="rounded-xl flex items-center gap-1.5 h-9 cursor-pointer border-zinc-200 dark:border-zinc-800 hover:bg-muted"
            >
              <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Top Filters Dashboard Bar */}
        <div className="flex flex-wrap gap-3 items-end pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40">
          <div className="flex-1 min-w-[130px]">
            <Select value={filterTimeframe} onValueChange={handleFilterTimeframeChange}>
              <SelectTrigger aria-label="Zeitraum filtern" className="rounded-xl h-9 text-xs bg-transparent border-zinc-200 dark:border-zinc-800 w-full">
                <SelectValue placeholder="Zeitraum" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg text-xs">Alle Zeiten</SelectItem>
                <SelectItem value="today" className="rounded-lg text-xs">Heute</SelectItem>
                <SelectItem value="last-7-days" className="rounded-lg text-xs">Letzte 7 Tage</SelectItem>
                <SelectItem value="last-30-days" className="rounded-lg text-xs">Letzte 30 Tage</SelectItem>
                <SelectItem value="custom" className="rounded-lg text-xs">Benutzerdefiniert...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[130px]">
            <Select value={filterTable} onValueChange={handleFilterTableChange}>
              <SelectTrigger aria-label="Tabelle filtern" className="rounded-xl h-9 text-xs bg-transparent border-zinc-200 dark:border-zinc-800 w-full">
                <SelectValue placeholder="Tabelle" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg text-xs">Alle Tabellen</SelectItem>
                {Object.entries(TABLE_NAME_MAP).map(([dbName, label]) => (
                  <SelectItem key={dbName} value={dbName} className="rounded-lg text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[130px]">
            <Select value={filterAction} onValueChange={handleFilterActionChange}>
              <SelectTrigger aria-label="Aktion filtern" className="rounded-xl h-9 text-xs bg-transparent border-zinc-200 dark:border-zinc-800 w-full">
                <SelectValue placeholder="Aktion" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg text-xs">Alle Aktionen</SelectItem>
                <SelectItem value="INSERT" className="rounded-lg text-xs">Erstellen (INSERT)</SelectItem>
                <SelectItem value="UPDATE" className="rounded-lg text-xs">Bearbeiten (UPDATE)</SelectItem>
                <SelectItem value="SOFT_DELETE" className="rounded-lg text-xs">In Papierkorb (SOFT_DELETE)</SelectItem>
                <SelectItem value="RESTORE" className="rounded-lg text-xs">Wiederherstellen (RESTORE)</SelectItem>
                <SelectItem value="DELETE" className="rounded-lg text-xs">Endgültig löschen (DELETE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[130px]">
            <Select value={filterUser} onValueChange={handleFilterUserChange}>
              <SelectTrigger aria-label="Mitarbeiter filtern" className="rounded-xl h-9 text-xs bg-transparent border-zinc-200 dark:border-zinc-800 w-full">
                <SelectValue placeholder="Mitarbeiter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="rounded-lg text-xs">Alle Mitarbeiter</SelectItem>
                {uniqueUsers.map(name => (
                  <SelectItem key={name} value={name} className="rounded-lg text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[1.5] min-w-[180px]">
            <SearchInput
              aria-label="Audit-Logs durchsuchen"
              id="search-logs"
              placeholder="Suche..."
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              onClear={() => handleSearchQueryChange("")}
              className="w-full h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Custom date range fields when selected */}
        {filterTimeframe === "custom" && (
          <div className="flex gap-4 pt-3 items-center justify-start border-t border-dashed border-zinc-200/50 dark:border-zinc-800/50 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Zeitraum von:</span>
              <input
                type="date"
                aria-label="Startdatum für benutzerdefinierten Zeitraum"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="text-xs p-2 h-8.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">bis:</span>
              <input
                type="date"
                aria-label="Enddatum für benutzerdefinierten Zeitraum"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="text-xs p-2 h-8.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        )}
      </CardHeader>

      {/* Main content: Scrollable Full-Width Infinite Table Body */}
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {error && (
          <div className="p-4 m-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div 
          ref={containerRef}
          onScroll={handleScroll}
          aria-live="polite"
          className="overflow-y-auto max-h-[calc(100vh-240px)] scrollbar-thin relative bg-zinc-50/5 dark:bg-zinc-950/5"
        >
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
              <TableRow className="hover:bg-transparent border-b-0 h-8 hover:!scale-100 active:!scale-100 hover:!transform-none active:!transform-none">
                <TableHead className="w-[48px] p-0 py-1.5 pl-6 md:py-1.5 md:pl-6 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? (
                    <Checkbox checked onCheckedChange={() => setSelectedLogIds(new Set())} className="data-[state=checked]:bg-primary" />
                  ) : (
                    <Checkbox 
                      checked={filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.has(log.id))}
                      onCheckedChange={handleToggleAll}
                      aria-label="Alle auswählen"
                      className="hover:scale-100 data-[state=checked]:scale-100 focus-visible:scale-100"
                    />
                  )}
                </TableHead>
                <TableHead className="w-[150px] font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 py-1.5 px-4 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? null : "Zeitpunkt"}
                </TableHead>
                <TableHead className="w-[140px] font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 py-1.5 px-4 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? null : "Datenbereich"}
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 py-1.5 px-4 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? null : "Aktion"}
                </TableHead>
                <TableHead className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 py-1.5 px-4 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? null : "Geändert von"}
                </TableHead>
                <TableHead className="text-right w-[280px] font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 py-1.5 pl-4 pr-6 md:pr-6 h-8 hover:bg-transparent dark:hover:bg-transparent">
                  {selectedLogIds.size > 0 ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] font-medium text-zinc-500 mr-1 whitespace-nowrap">{selectedLogIds.size} ausgewählt</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-lg text-[11px] px-2.5 cursor-pointer">
                            <Download className="size-3" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl min-w-[110px]">
                          <DropdownMenuItem className="text-xs rounded-lg cursor-pointer" onClick={() => handleBulkExport('csv')}>Als CSV</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs rounded-lg cursor-pointer" onClick={() => handleBulkExport('xlsx')}>Als XLSX</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-lg text-[11px] px-2.5 cursor-pointer">
                            <Copy className="size-3" />
                            Kopieren
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl min-w-[110px]">
                          <DropdownMenuItem className="text-xs rounded-lg cursor-pointer" onClick={() => handleBulkCopy('json')}>Als JSON</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs rounded-lg cursor-pointer" onClick={() => handleBulkCopy('md')}>Als Markdown</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : "Details"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && isPending ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-zinc-200/30 dark:border-zinc-800/30 h-8 hover:!scale-100 active:!scale-100 hover:!transform-none active:!transform-none">
                    <TableCell className="py-1 px-4 h-8"><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="py-1 px-4 h-8"><div className="h-3 w-28 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="py-1 px-4 h-8"><div className="h-3 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="py-1 px-4 h-8"><div className="h-4.5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="py-1 px-4 h-8"><div className="h-3 w-36 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="text-right py-1 px-4 h-8"><div className="h-5 w-5 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow className="hover:!scale-100 active:!scale-100 hover:!transform-none active:!transform-none">
                  <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-foreground">
                    <Info className="size-6 mx-auto mb-1.5 text-zinc-400 stroke-1" />
                    Keine Logs gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(log => {
                  const TableIcon = getTableIcon(log.tabellenname);
                  return (
                    <TableRow 
                      key={log.id} 
                      onClick={() => handleSelectLog(log.id)}
                      className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 cursor-pointer border-b border-zinc-200/30 dark:border-zinc-800/30 last:border-0 transition-colors h-8 hover:!scale-100 active:!scale-100 hover:!transform-none active:!transform-none"
                    >
                      <TableCell className="p-0 py-1 pl-6 md:py-1 md:pl-6 h-auto" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedLogIds.has(log.id)}
                          onCheckedChange={() => {
                            setSelectedLogIds(prev => {
                              const next = new Set(prev);
                              if (next.has(log.id)) {
                                next.delete(log.id);
                              } else {
                                next.add(log.id);
                              }
                              return next;
                            });
                          }}
                          aria-label={TABLE_NAME_MAP[log.tabellenname] ? `Zeile auswählen: ${TABLE_NAME_MAP[log.tabellenname]}` : "Zeile auswählen"}
                          className="hover:scale-100 data-[state=checked]:scale-100 focus-visible:scale-100"
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-[11px] py-1 px-4 h-auto" suppressHydrationWarning>
                        {new Date(log.geaendert_am).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </TableCell>
                      <TableCell className="py-1 px-4 h-auto">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                          <TableIcon className="size-3.5 text-zinc-500 shrink-0" />
                          {TABLE_NAME_MAP[log.tabellenname] || log.tabellenname}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 px-4 h-auto">
                        <Badge variant="outline" className={cn("px-1.5 py-0 font-bold text-[8px] border uppercase rounded-md shadow-none scale-90", getActionBadgeColor(log.aktion))}>
                          {log.aktion === 'SOFT_DELETE' ? 'Papierkorb' : log.aktion}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1 px-4 h-auto">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-800 dark:text-zinc-200">
                          <User className="size-3 text-zinc-400 shrink-0" />
                          <span className="font-semibold">{log.geaendert_von_name}</span>
                          {log.geaendert_von_email && (
                            <span className="text-[10px] text-muted-foreground font-normal">({log.geaendert_von_email})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-1 pl-4 pr-6 md:pr-6 h-auto w-[90px]">
                        <ActionMenu
                          actions={[
                            { id: `open-${log.id}`, icon: Eye, label: "Details anzeigen", onClick: (e) => { e?.stopPropagation(); handleSelectLog(log.id); } },
                            { id: `copy-${log.id}`, icon: Copy, label: "Als JSON kopieren", onClick: async (e) => { 
                              e?.stopPropagation(); 
                              try {
                                await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                toast({ title: "Kopiert", description: "Log als JSON in die Zwischenablage kopiert.", variant: "success" });
                              } catch {
                                toast({ title: "Fehler", description: "Konnte nicht in die Zwischenablage kopiert werden.", variant: "destructive" });
                              }
                            } },
                          ]}
                          shape="pill"
                          visibility="hover"
                          className="inline-flex"
                          stopPropagation
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Infinite Scroll loading spinner */}
              {isPending && page > 1 && (
                <TableRow className="hover:!scale-100 active:!scale-100 hover:!transform-none active:!transform-none">
                  <TableCell colSpan={6} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin h-7 w-7 text-primary" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm font-medium text-muted-foreground">Weitere Einträge werden geladen...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {/* Slide-over details sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-[600px] flex flex-col h-full p-0 gap-0"
        >
          <div className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1">
              <div className="max-w-[90%] mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 space-y-4 sm:space-y-8">
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-primary/80">
                    {detailedLog ? (() => {
                      const TableIcon = getTableIcon(detailedLog.tabellenname);
                      return <TableIcon className="h-8 w-8 sm:h-10 sm:w-10" />;
                    })() : <Clock className="h-8 w-8 sm:h-10 sm:w-10" />}
                  </div>
                  <div className="space-y-1">
                    <SheetTitle className="text-2xl sm:text-4xl font-bold tracking-tight">
                      Änderungsdetails
                    </SheetTitle>
                    <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
                      Detaillierter Verlauf des Systemereignisses und Feldunterschiede.
                    </SheetDescription>
                  </div>
                </div>

                {isDetailsLoading ? (
                  <AuditLogDetailSkeleton />
                ) : detailedLog ? (
                  <div className="space-y-8 sm:space-y-10">
                    {/* Ereignis section */}
                    <div className="sm:space-y-5 sm:pt-4 sm:border-t sm:border-border/40">
                      <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                        Ereignis
                      </div>
                      <div className="sm:grid sm:gap-5 space-y-3 sm:space-y-0">
                        <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-0.5 sm:space-y-0">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <Database className="size-3.5 text-zinc-500" />
                            Tabelle
                          </span>
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            {(() => {
                              const Icon = getTableIcon(detailedLog.tabellenname);
                              return <Icon className="size-4 text-zinc-500" />;
                            })()}
                            {TABLE_NAME_MAP[detailedLog.tabellenname] || detailedLog.tabellenname}
                          </span>
                        </div>
                        <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-0.5 sm:space-y-0">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <Eye className="size-3.5 text-zinc-500" />
                            Aktion
                          </span>
                          <Badge variant="outline" className={cn("w-fit px-2.5 py-0.5 uppercase font-bold text-[10px] rounded-full", getActionBadgeColor(detailedLog.aktion))}>
                            {detailedLog.aktion === "SOFT_DELETE" ? "Papierkorb" : detailedLog.aktion}
                          </Badge>
                        </div>
                        <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-0.5 sm:space-y-0">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <Clock className="size-3.5 text-zinc-500" />
                            Zeitpunkt
                          </span>
                          <span className="text-sm font-medium" suppressHydrationWarning>
                            {new Date(detailedLog.geaendert_am).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-0.5 sm:space-y-0">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <User className="size-3.5 text-zinc-500" />
                            Geändert von
                          </span>
                          <span className="text-sm font-medium">{detailedLog.geaendert_von_name}</span>
                        </div>
                        <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-0.5 sm:space-y-0">
                          <span className="text-sm text-muted-foreground/70 flex items-center gap-1.5">
                            <Key className="size-3.5 text-zinc-500" />
                            Datensatz-ID
                          </span>
                          <span className="text-sm font-mono text-muted-foreground select-all break-all">{detailedLog.datensatz_id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Änderungen section */}
                    <div className="sm:space-y-5 sm:pt-4 sm:border-t sm:border-border/40">
                      <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                        Änderungen
                      </div>
                      <SimpleDiff 
                        aktion={detailedLog.aktion} 
                        alteDaten={detailedLog.alte_daten} 
                        neueDaten={detailedLog.neue_daten} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-16">
                    Keine Details geladen.
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <SheetFooter className="px-4 pb-8 pt-2 sm:p-8 sm:pb-14 sm:pt-4">
              <div className="max-w-[90%] mx-auto w-full flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:shadow-none"
                  onClick={() => setIsSheetOpen(false)}
                >
                  Schließen
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
