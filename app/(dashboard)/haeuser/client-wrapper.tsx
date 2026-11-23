"use client";

import { useState, useRef, useCallback, useMemo, useReducer } from "react";
import { useTabParams } from "@/hooks/use-tab-params";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Building, Home, Key, Download, Trash2, Loader2, Building2, BarChart3, Wallet, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/stat-card";
import { HouseTable, House, type SortKey, type SortDirection } from "@/components/tables/house-table";
import { formatPlzOrt } from "@/lib/address";
import { useModalStore } from "@/hooks/use-modal-store";
import {
  SecondaryRail,
  RailSection,
  RailNavItem,
  RailStats,
  RailStat,
  PageTopBar,
  ToolbarFilterMenu,
  ToolbarSortMenu,
  ToolbarSearch,
  ToolbarPrimaryButton,
  SelectionPill,
  SelectionPillAction,
} from "@/components/dashboard/shell";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { HousesDonutChart } from "@/components/dashboard/dashboard-charts";
import { cn } from "@/lib/utils";
import { formatBulkDeleteSuffix } from "@/lib/bulk-delete-summary";
import { starteLoeschenMitKautionen } from "@/lib/kautionen-loeschen";

const safeParseFloat = (val: unknown): number => {
  if (typeof val === "number") return val;
  const str = String(val || "0").trim();
  if (str.includes(",")) {
    return parseFloat(str.replace(/\./g, "").replace(/,/g, "."));
  }
  return parseFloat(str) || 0;
};

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const currencyFormatterFull = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const decimalFormatter = new Intl.NumberFormat("de-DE", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("de-DE");

interface HaeuserClientViewProps {
  enrichedHaeuser: House[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

type Tab = "houses" | "overview";

interface BulkState {
  selectedHouses: Set<string>;
  showBulkDeleteConfirm: boolean;
  isBulkDeleting: boolean;
}

type BulkAction =
  | { type: "SET_SELECTED"; payload: Set<string> }
  | { type: "TOGGLE_BULK_DELETE_CONFIRM"; payload: boolean }
  | { type: "SET_BULK_DELETING"; payload: boolean }
  | { type: "RESET_BULK" };

function bulkReducer(state: BulkState, action: BulkAction): BulkState {
  switch (action.type) {
    case "SET_SELECTED":
      return { ...state, selectedHouses: action.payload };
    case "TOGGLE_BULK_DELETE_CONFIRM":
      return { ...state, showBulkDeleteConfirm: action.payload };
    case "SET_BULK_DELETING":
      return { ...state, isBulkDeleting: action.payload };
    case "RESET_BULK":
      return { selectedHouses: new Set(), showBulkDeleteConfirm: false, isBulkDeleting: false };
    default:
      return state;
  }
}

function AddHouseButton({ onAdd, canCreate }: { onAdd: () => void; canCreate: boolean }) {
  const button = (
    <ToolbarPrimaryButton
      id="create-object-btn"
      icon={Plus}
      aria-label="Haus hinzufügen"
      disabled={!canCreate}
      onClick={() => {
        useOnboardingStore.getState().completeStep('create-house-start');
        onAdd();
      }}
    >
      Neues Haus
    </ToolbarPrimaryButton>
  );

  if (canCreate) return button;

  // Disabled Buttons feuern keine Pointer-Events: Tooltip hängt am umgebenden span
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={5}>
          Keine Berechtigung zum Erstellen
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "ort", label: "Ort" },
  { value: "size", label: "Größe" },
  { value: "rent", label: "Miete" },
  { value: "pricePerSqm", label: "Miete pro m²" },
  { value: "status", label: "Status" },
];

function HousesTab({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  filterCounts,
  cityFilter,
  onCityFilterChange,
  sortKey,
  sortDirection,
  onSortChange,
  selectedHouses,
  onClearSelection,
  onBulkExport,
  onBulkDeleteClick,
  flags,
  onAdd,
  onEdit,
  enrichedHaeuser,
  tableReloadRef,
  onSelectionChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  filterCounts: { full: number; vacant: number };
  cityFilter: string[];
  onCityFilterChange: (cities: string[]) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey, direction: SortDirection) => void;
  selectedHouses: Set<string>;
  onClearSelection: () => void;
  onBulkExport: () => void;
  onBulkDeleteClick: () => void;
  flags: { isBulkDeleting: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
  onAdd: () => void;
  onEdit: (house: House) => void;
  enrichedHaeuser: House[];
  tableReloadRef: React.MutableRefObject<(() => void) | null>;
  onSelectionChange: (selected: Set<string>) => void;
}) {
  // Orte mit Anzahl Häuser, alphabetisch
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    enrichedHaeuser.forEach((h) => {
      if (h.ort) counts.set(h.ort, (counts.get(h.ort) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "de-DE"))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [enrichedHaeuser]);

  return (
    <>
      <PageTopBar
        breadcrumbs={[{ label: "Objekte" }, { label: "Häuser" }]}
        tools={
          <>
            <ToolbarFilterMenu
              groups={[
                {
                  id: "belegung",
                  label: "Belegung",
                  options: [
                    { value: "full", label: "Voll belegt", count: filterCounts.full },
                    { value: "vacant", label: "Mit freien Wohnungen", count: filterCounts.vacant },
                  ],
                  selected: filter === "all" ? [] : [filter],
                  onChange: (selected) => onFilterChange(selected[0] ?? "all"),
                },
                {
                  id: "ort",
                  label: "Ort",
                  options: cityOptions,
                  selected: cityFilter,
                  multiple: true,
                  onChange: onCityFilterChange,
                },
              ]}
              onReset={() => {
                onFilterChange("all");
                onCityFilterChange([]);
              }}
            />
            <ToolbarSortMenu
              options={SORT_OPTIONS}
              sortKey={sortKey}
              direction={sortDirection}
              onChange={(key, direction) => onSortChange(key as SortKey, direction)}
            />
            <ToolbarSearch
              data-testid="search-input"
              placeholder="Häuser suchen…"
              value={searchQuery}
              onChange={onSearchChange}
            />
          </>
        }
        actions={<AddHouseButton onAdd={onAdd} canCreate={flags.canCreate} />}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6 animate-in fade-in duration-300">
        <HouseTable
          filter={filter}
          searchQuery={searchQuery}
          cityFilter={cityFilter}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          reloadRef={tableReloadRef}
          onEdit={onEdit}
          initialHouses={enrichedHaeuser}
          selectedHouses={selectedHouses}
          onSelectionChange={onSelectionChange}
          canEdit={flags.canEdit}
          canDelete={flags.canDelete}
        />
      </div>
      <SelectionPill count={selectedHouses.size} noun={["Haus", "Häuser"]} onClear={onClearSelection}>
        <SelectionPillAction icon={Download} onClick={onBulkExport}>
          Exportieren
        </SelectionPillAction>
        <SelectionPillAction
          icon={flags.isBulkDeleting ? Loader2 : Trash2}
          variant="destructive"
          onClick={onBulkDeleteClick}
          disabled={flags.isBulkDeleting || !flags.canDelete}
          aria-label={`Löschen (${selectedHouses.size})`}
          className={flags.isBulkDeleting ? "[&_svg]:animate-spin" : undefined}
        >
          {flags.isBulkDeleting ? "Löschen…" : "Löschen"}
        </SelectionPillAction>
      </SelectionPill>
    </>
  );
}

function OverviewTab({
  enrichedHaeuser,
  summary,
  financialMetrics,
  efficiencyMetrics,
}: {
  enrichedHaeuser: House[];
  summary: { totalHouses: number; totalApartments: number; freeApartments: number; avgSize: number; avgRent: number; totalSize: number; totalRent: number };
  financialMetrics: { sollMiete: number; istMiete: number; leerstandskosten: number; vacancyRate: number };
  efficiencyMetrics: { portfolioAvg: number; highestHouse: { name: string; value: number }; lowestHouse: { name: string; value: number }; list: Array<{ id: string; name: string; size: number; rentPerSqm: number; percentageOfTarget: number; ort?: string | null; totalApartments: number; freeApartments: number }> };
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Ø Hausgröße"
          value={summary.avgSize}
          unit="m²"
          icon={<Building2 className="size-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
        />
        <StatCard
          title="Ø Hausmiete"
          value={summary.avgRent}
          unit="€"
          decimals
          icon={<Key className="size-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PropertyDistributionCard enrichedHaeuser={enrichedHaeuser} summary={summary} />
        <RentChartCard enrichedHaeuser={enrichedHaeuser} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
        <FinancialAnalysisCard financialMetrics={financialMetrics} />
        <EfficiencyCard efficiencyMetrics={efficiencyMetrics} />
      </div>
    </div>
  );
}

function PropertyDistributionCard({ enrichedHaeuser, summary }: { enrichedHaeuser: House[]; summary: { totalSize: number; totalRent: number } }) {
  return (
    <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base font-semibold">Objektverteilung & Flächen</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-primary/5 border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-muted-foreground block mb-1">Fläche Gesamt</span>
            <span className="text-xl font-bold">{numberFormatter.format(summary.totalSize)} m²</span>
          </div>
          <div className="p-4 rounded-2xl bg-primary/5 border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-muted-foreground block mb-1">Soll-Miete Gesamt</span>
            <span className="text-xl font-bold">{currencyFormatterFull.format(summary.totalRent)}</span>
          </div>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Flächen & Einheiten</h4>
          {enrichedHaeuser.map(h => {
            const occupied = (h.totalApartments ?? 0) - (h.freeApartments ?? 0);
            const total = h.totalApartments ?? 0;
            const isFullyOccupied = h.freeApartments === 0;

            return (
              <div
                key={h.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                    <Building2 className="size-4.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block group-hover:text-accent transition-colors duration-200">
                      {h.name}
                    </span>
                    {formatPlzOrt(h.plz, h.ort) && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                        {formatPlzOrt(h.plz, h.ort)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
                  <div className="flex items-center gap-1 text-muted-foreground min-w-[70px]">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{h.size}</span>
                    <span className="text-[10px]">m²</span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Home className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {occupied}/{total}
                    </span>
                    <span className="text-[10px] text-muted-foreground">belegt</span>
                  </div>

                  <div className="shrink-0 min-w-[90px] flex justify-end">
                    <Badge
                      variant="outline"
                      className={cn(
                        isFullyOccupied
                          ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0.5 px-2"
                          : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0.5 px-2"
                      )}
                    >
                      {isFullyOccupied ? "Voll belegt" : `${h.freeApartments} frei`}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RentChartCard({ enrichedHaeuser }: { enrichedHaeuser: House[] }) {
  return (
    <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
      <CardHeader className="px-0 pt-0 pb-2">
        <CardTitle className="text-base font-semibold">Mietertrag pro Haus</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">Monatliche Soll-Miete nach Objekten</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 flex-1 min-h-[260px]">
        <HousesDonutChart houses={enrichedHaeuser} />
      </CardContent>
    </Card>
  );
}

function FinancialAnalysisCard({ financialMetrics }: { financialMetrics: { sollMiete: number; istMiete: number; leerstandskosten: number; vacancyRate: number } }) {
  return (
    <Card className="lg:col-span-4 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base font-semibold">
          Rendite- & Leerstands-Analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 flex-1 flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/5 text-emerald-500 shrink-0">
                <Wallet className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Soll-Miete (Belegt)</span>
                <span className="text-[10px] text-muted-foreground block truncate">Bei 100% Zahlungseingang</span>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 pl-[42px] mt-0.5">
              {currencyFormatter.format(financialMetrics.istMiete)}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-zinc-500/5 text-zinc-500 dark:text-zinc-400 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Soll-Miete (Portfolio)</span>
                <span className="text-[10px] text-muted-foreground block truncate">Max. Potenzial bei Vollvermietung</span>
              </div>
            </div>
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 shrink-0 pl-[42px] mt-0.5">
              {currencyFormatter.format(financialMetrics.sollMiete)}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/5 text-rose-500 shrink-0">
                <Home className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Entgangene Miete (Leerstand)</span>
                <span className="text-[10px] text-rose-500/70 block truncate">Potenziell fehlendes Einkommen</span>
              </div>
            </div>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0 pl-[42px] mt-0.5">
              {currencyFormatter.format(financialMetrics.leerstandskosten)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/80">
          <div className="flex flex-col gap-0.5 text-xs font-semibold">
            <span className="text-muted-foreground">Mietertragspotenzial</span>
            <span className="text-accent font-bold text-sm">
              {Math.round(100 - financialMetrics.vacancyRate)}% ausgeschöpft
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent/95 to-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.round(100 - financialMetrics.vacancyRate)}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-normal">
            Die Quote der potenziell entgangenen Miete durch Leerstand beträgt <span className="font-semibold text-rose-600 dark:text-rose-400">{financialMetrics.vacancyRate.toFixed(1)}%</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EfficiencyCard({ efficiencyMetrics }: { efficiencyMetrics: {
  portfolioAvg: number;
  highestHouse: { name: string; value: number };
  lowestHouse: { name: string; value: number };
  list: Array<{ id: string; name: string; size: number; rentPerSqm: number; percentageOfTarget: number; ort?: string | null; totalApartments: number; freeApartments: number }>;
} }) {
  return (
    <Card className="lg:col-span-8 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col gap-4">
      <CardHeader className="px-0 pt-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Mietpreis- & Flächeneffizienz
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 flex-1 flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/5 border border-zinc-200/50 dark:border-zinc-800/30">
          <div className="text-left border-r border-zinc-200/60 dark:border-zinc-800/80 pr-4">
            <span className="text-[10px] sm:text-xs text-muted-foreground block mb-1">Ø Quadratmeter-Miete</span>
            <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {decimalFormatter.format(efficiencyMetrics.portfolioAvg)} €/m²
            </span>
          </div>
          <div className="text-left pl-4 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground block mb-0.5">Spitzenreiter (€/m²)</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block truncate max-w-[130px] sm:max-w-[200px]">
              {efficiencyMetrics.highestHouse.name}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {decimalFormatter.format(efficiencyMetrics.highestHouse.value)} €/m²
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[360px] flex-1 custom-scrollbar">
          {efficiencyMetrics.list.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground italic">
              Keine Effizienzdaten vorhanden.
            </div>
          ) : (
            efficiencyMetrics.list.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col gap-2 p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-xs transition-all duration-200"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent transition-colors duration-200 shrink-0">
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-zinc-800 dark:text-zinc-200 font-semibold truncate block group-hover:text-accent transition-colors duration-200">{item.name}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-normal mt-0.5">
                        {item.ort && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="size-3 shrink-0" />
                            {item.ort}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Home className="size-3 shrink-0" />
                          {item.totalApartments - item.freeApartments}/{item.totalApartments} belegt
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-zinc-950 dark:text-zinc-50 shrink-0">
                    {decimalFormatter.format(item.rentPerSqm)} €/m²
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${item.percentageOfTarget}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const HOUSE_FILTERS = [
  { value: "all" as const, label: "Alle Häuser" },
  { value: "full" as const, label: "Voll belegt" },
  { value: "vacant" as const, label: "Mit freien Wohnungen" },
];

const VALID_HAEUSER_TABS = ["houses", "overview"] as const;

export default function HaeuserClientView({ enrichedHaeuser, canCreate = true, canEdit = true, canDelete = true }: HaeuserClientViewProps) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useTabParams<Tab>("houses", VALID_HAEUSER_TABS);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [{ selectedHouses, showBulkDeleteConfirm, isBulkDeleting }, dispatchBulk] = useReducer(bulkReducer, {
    selectedHouses: new Set<string>(),
    showBulkDeleteConfirm: false,
    isBulkDeleting: false,
  });
  const tableReloadRef = useRef<() => void>(null);
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    if (tableReloadRef.current) {
      tableReloadRef.current();
    }
  }, []);

  const handleAdd = useCallback(() => {
    try {
      openHouseModal(undefined, refreshTable);
    } catch (error) {
      console.error('Error opening house modal:', error);
    }
  }, [openHouseModal, refreshTable]);

  const handleEdit = useCallback(
    (house: House) => {
      try {
        openHouseModal(house, refreshTable, canDelete);
      } catch (error) {
        console.error('Error opening house modal:', error);
      }
    },
    [openHouseModal, refreshTable, canDelete]
  );

  const summary = useMemo(() => {
    const totals = enrichedHaeuser.reduce(
      (acc, h) => {
        const apts = h.totalApartments ?? 0;
        const free = h.freeApartments ?? 0;
        const sizeVal = safeParseFloat(h.size);
        const rentVal = safeParseFloat(h.rent);

        acc.totalApartments += apts;
        acc.freeApartments += free;
        if (!isNaN(sizeVal)) acc.totalSize += sizeVal;
        if (!isNaN(rentVal)) acc.totalRent += rentVal;

        return acc;
      },
      { totalApartments: 0, freeApartments: 0, totalSize: 0, totalRent: 0 }
    );

    const totalHouses = enrichedHaeuser.length;
    const avgSize = totalHouses > 0 ? Math.round(totals.totalSize / totalHouses) : 0;
    const avgRent = totalHouses > 0 ? Math.round(totals.totalRent / totalHouses) : 0;

    return { totalHouses, ...totals, avgSize, avgRent };
  }, [enrichedHaeuser]);

  const financialMetrics = useMemo(() => {
    let totalSollMiete = 0;
    let totalIstMiete = 0;
    let totalLeerstandskosten = 0;

    enrichedHaeuser.forEach(h => {
      const rentNum = safeParseFloat(h.rent);
      const totalApts = h.totalApartments || 0;
      const freeApts = h.freeApartments || 0;
      
      totalSollMiete += rentNum;
      if (totalApts > 0) {
        const occupiedApts = totalApts - freeApts;
        totalIstMiete += rentNum * (occupiedApts / totalApts);
        totalLeerstandskosten += rentNum * (freeApts / totalApts);
      }
    });

    return {
      sollMiete: totalSollMiete,
      istMiete: totalIstMiete,
      leerstandskosten: totalLeerstandskosten,
      vacancyRate: totalSollMiete > 0 ? (totalLeerstandskosten / totalSollMiete) * 100 : 0
    };
  }, [enrichedHaeuser]);

  const efficiencyMetrics = useMemo(() => {
    let highestHouse = { name: "N/A", value: 0 };
    let lowestHouse = { name: "N/A", value: Infinity };
    const list: Array<{
      id: string;
      name: string;
      size: number;
      rentPerSqm: number;
      percentageOfTarget: number;
      ort?: string | null;
      totalApartments: number;
      freeApartments: number;
    }> = [];

    let totalSqm = 0;
    let totalRent = 0;
    
    const TARGET_SQM_RENT = 15;

    enrichedHaeuser.forEach(h => {
      const sizeNum = safeParseFloat(h.size);
      const rentNum = safeParseFloat(h.rent);
      
      if (sizeNum > 0 && rentNum > 0) {
        const rentPerSqm = rentNum / sizeNum;
        totalSqm += sizeNum;
        totalRent += rentNum;

        list.push({
          id: h.id,
          name: h.name,
          size: sizeNum,
          rentPerSqm,
          percentageOfTarget: Math.min(Math.round((rentPerSqm / TARGET_SQM_RENT) * 100), 100),
          ort: formatPlzOrt(h.plz, h.ort),
          totalApartments: h.totalApartments || 0,
          freeApartments: h.freeApartments || 0
        });

        if (rentPerSqm > highestHouse.value) {
          highestHouse = { name: h.name, value: rentPerSqm };
        }
        if (rentPerSqm < lowestHouse.value) {
          lowestHouse = { name: h.name, value: rentPerSqm };
        }
      }
    });

    const portfolioAvg = totalSqm > 0 ? totalRent / totalSqm : 0;
    if (lowestHouse.value === Infinity) {
      lowestHouse = { name: "N/A", value: 0 };
    }

    list.sort((a, b) => b.rentPerSqm - a.rentPerSqm);

    return {
      portfolioAvg,
      highestHouse,
      lowestHouse,
      list: list.slice(0, 8)
    };
  }, [enrichedHaeuser]);

  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedHousesData = enrichedHaeuser.filter(h => selectedHouses.has(h.id))

    const headers = ['Haus', 'Ort', 'Größe (m²)', 'Miete (€)', '€/m²', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedHousesData.map(h => {
      const row = [
        h.name,
        formatPlzOrt(h.plz, h.ort),
        h.size || '',
        h.rent || '',
        h.pricePerSqm || '',
        `${(h.totalApartments ?? 0) - (h.freeApartments ?? 0)}/${h.totalApartments ?? 0} belegt`
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `haeuser_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedHouses.size} Häuser exportiert.`,
      variant: "success",
    })
  }, [selectedHouses, enrichedHaeuser, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedHouses.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Haus zum Löschen aus.",
        variant: "destructive",
      });
      return;
    }

    dispatchBulk({ type: "SET_BULK_DELETING", payload: true });
    const selectedIds = Array.from(selectedHouses);

    try {
      const response = await fetch('/api/haeuser/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Häuser.');
      }

      // Teilerfolg (z. B. ein Mieter mit hinterlegter Kaution im Haus): die Route nennt die Gründe der abgelehnten Löschungen.
      const { successCount, reasons = [] } = await response.json();

      toast({
        title: "Erfolg",
        description: `${successCount} Häuser erfolgreich gelöscht${formatBulkDeleteSuffix(selectedIds.length - successCount, reasons)}`,
        variant: "success",
      });

      refreshTable();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Häuser aufgetreten.",
        variant: "destructive",
      });
    } finally {
      dispatchBulk({ type: "RESET_BULK" });
    }
  }, [selectedHouses, router, refreshTable]);

  // Zuerst die Auswirkung laden, dann EIN Dialog: ohne gebuchte Kaution die übliche Frage, sonst die Übersicht (ersetzt die Frage).
  // Abbruch der Übersicht löscht nichts und lässt die Auswahl erhalten.
  const handleBulkDeleteClick = useCallback(() => {
    void starteLoeschenMitKautionen("Haeuser", Array.from(selectedHouses), {
      einfach: () => dispatchBulk({ type: "TOGGLE_BULK_DELETE_CONFIRM", payload: true }),
      loeschen: handleBulkDelete,
    });
  }, [selectedHouses, handleBulkDelete]);

  // Zähler der Filter-Einträge: dasselbe Prädikat wie in HouseTable
  const filterCounts = useMemo(() => ({
    all: enrichedHaeuser.length,
    full: enrichedHaeuser.filter((h) => h.freeApartments === 0).length,
    vacant: enrichedHaeuser.filter((h) => (h.freeApartments ?? 0) > 0).length,
  }), [enrichedHaeuser]);

  const addAction = <AddHouseButton onAdd={handleAdd} canCreate={canCreate} />;

  return (
    <div className="flex flex-col min-h-full">
      <SecondaryRail title="Häuser">
        <RailSection label="Ansichten">
          <RailNavItem
            icon={Building2}
            label="Häuser"
            active={currentTab === "houses"}
            onClick={() => setCurrentTab("houses")}
          />
          <RailNavItem
            icon={BarChart3}
            label="Übersicht"
            active={currentTab === "overview"}
            onClick={() => setCurrentTab("overview")}
          />
        </RailSection>

        <RailSection label="Kennzahlen">
          <RailStats>
            <RailStat
              label="Häuser gesamt"
              value={summary.totalHouses}
              icon={<Building className="size-4 text-muted-foreground" />}
            />
            <RailStat
              label="Wohnungen gesamt"
              value={summary.totalApartments}
              icon={<Home className="size-4 text-muted-foreground" />}
            />
            <RailStat
              label="Freie Wohnungen"
              value={summary.freeApartments}
              icon={<Key className="size-4 text-muted-foreground" />}
            />
          </RailStats>
        </RailSection>

        {currentTab === "houses" && (
          <RailSection label="Filter">
            {HOUSE_FILTERS.map(({ value, label }) => (
              <RailNavItem
                key={value}
                data-testid={`filter-${value}`}
                label={label}
                active={filter === value}
                count={filterCounts[value]}
                onClick={() => setFilter(value)}
              />
            ))}
          </RailSection>
        )}
      </SecondaryRail>

      {currentTab === "houses" ? (
        <HousesTab
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          filterCounts={filterCounts}
          cityFilter={cityFilter}
          onCityFilterChange={setCityFilter}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={(key, direction) => {
            setSortKey(key);
            setSortDirection(direction);
          }}
          selectedHouses={selectedHouses}
          onSelectionChange={(selected) => dispatchBulk({ type: "SET_SELECTED", payload: selected })}
          onClearSelection={() => dispatchBulk({ type: "SET_SELECTED", payload: new Set() })}
          onBulkExport={handleBulkExport}
          onBulkDeleteClick={handleBulkDeleteClick}
          flags={{ isBulkDeleting, canCreate, canEdit, canDelete }}
          onAdd={handleAdd}
          onEdit={handleEdit}
          enrichedHaeuser={enrichedHaeuser}
          tableReloadRef={tableReloadRef}
        />
      ) : (
        <>
          <PageTopBar
            breadcrumbs={[{ label: "Objekte" }, { label: "Häuser" }, { label: "Übersicht" }]}
            actions={addAction}
          />
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <OverviewTab
              enrichedHaeuser={enrichedHaeuser}
              summary={summary}
              financialMetrics={financialMetrics}
              efficiencyMetrics={efficiencyMetrics}
            />
          </div>
        </>
      )}

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={(open) => dispatchBulk({ type: "TOGGLE_BULK_DELETE_CONFIRM", payload: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Häuser löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedHouses.size} Häuser löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkDelete()} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedHouses.size} Häuser löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
