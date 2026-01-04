"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet, PlusCircle, Search, Euro, TrendingUp, TrendingDown, Download, Info } from "lucide-react";
import { FinanceVisualization } from "@/components/finance/finance-visualization";
import { FinanceTable } from "@/components/tables/finance-table";
import { FinanceBulkActionBar } from "@/components/finance/finance-bulk-action-bar";
import { SummaryCardSkeleton } from "@/components/skeletons/summary-card-skeleton";
import { SummaryCard } from "@/components/common/summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/common/stat-card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { CustomCombobox } from "@/components/ui/custom-combobox";

import { PAGINATION } from "@/constants";
import { useModalStore } from "@/hooks/use-modal-store";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";

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

interface SummaryData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalCashflow: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyCashflow: number;
  yearlyProjection: number;
  monthsPassed: number;
  monthlyData: Record<number, { income: number; expenses: number }>;
}

interface FinanzenClientWrapperProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
  summaryData: SummaryData | null;
  initialAvailableYears?: number[];
  initialYear?: number;
  isUsingFallbackYear?: boolean;
  currentYear?: number;
}

// Utility function to remove duplicates based on ID
const deduplicateFinances = (finances: Finanz[]): Finanz[] => {
  const seen = new Set<string>();
  return finances.filter(finance => {
    if (seen.has(finance.id)) {
      return false;
    }
    seen.add(finance.id);
    return true;
  });
};

export default function FinanzenClientWrapper({
  finances: initialFinances,
  wohnungen,
  summaryData: initialSummaryData,
  initialAvailableYears = [],
  initialYear,
  isUsingFallbackYear = false,
  currentYear = new Date().getFullYear()
}: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finanz[]>(deduplicateFinances(initialFinances));
  const [summaryData, setSummaryData] = useState<SummaryData | null>(initialSummaryData);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(initialSummaryData !== null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>(initialAvailableYears);
  const [selectedFinances, setSelectedFinances] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    searchQuery: '',
    selectedApartment: 'Alle Wohnungen',
    selectedYear: 'Alle Jahre',
    selectedType: 'Alle Transaktionen',
    sortKey: 'datum',
    sortDirection: 'desc'
  });
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [filteredIncome, setFilteredIncome] = useState(0);
  const [filteredExpenses, setFilteredExpenses] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const reloadRef = useRef<(() => void) | null>(null);
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);
  const filtersRef = useRef(filters);
  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);

  // Update refs when values change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    debouncedSearchQueryRef.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  const loadMoreTransactions = useCallback(async (resetData = false) => {
    if (isLoading || (!hasMore && !resetData)) return;
    setIsLoading(true);
    setError(null);

    const targetPage = resetData ? 1 : page + 1;

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE.toString(),
        searchQuery: debouncedSearchQueryRef.current,
        selectedApartment: filtersRef.current.selectedApartment,
        selectedYear: filtersRef.current.selectedYear,
        selectedType: filtersRef.current.selectedType,
        sortKey: filtersRef.current.sortKey,
        sortDirection: filtersRef.current.sortDirection
      });

      const response = await fetch(`/api/finanzen?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const newTransactions = await response.json();
      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);

      if (resetData) {
        setFinData(deduplicateFinances(newTransactions));
        setPage(1);
      } else {
        setFinData(prev => {
          // Create a Set of existing IDs to avoid duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewTransactions = newTransactions.filter((transaction: Finanz) => !existingIds.has(transaction.id));
          return [...prev, ...uniqueNewTransactions];
        });
        setPage(prev => prev + 1);
      }

      // Check if there are more records to load
      const loadedCount = resetData ? newTransactions.length : finData.length + newTransactions.length;
      setHasMore(loadedCount < totalCount);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while loading transactions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading]);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_filtered_financial_summary', {
        search_query: debouncedSearchQueryRef.current,
        apartment_name: filtersRef.current.selectedApartment,
        target_year: filtersRef.current.selectedYear,
        transaction_type: filtersRef.current.selectedType
      });

      if (error) {
        console.error('Failed to fetch filtered summary:', error);
        throw new Error(error.message);
      }

      // The RPC function is designed to always return a single row.
      // We provide a fallback just in case the contract changes or an unexpected error occurs.
      const summary = data?.[0] ?? { total_balance: 0, total_income: 0, total_expenses: 0 };
      setTotalBalance(Number(summary.total_balance));
      setFilteredIncome(Number(summary.total_income));
      setFilteredExpenses(Number(summary.total_expenses));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      if (error instanceof Error) {
        setError(`Failed to fetch balance: ${error.message}`);
      } else {
        setError('An unknown error occurred while fetching balance');
      }
    } finally {
      setBalanceLoading(false);
    }
  }, []); // No dependencies needed since we use refs

  const refreshSummaryData = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/finanzen/analytics?action=summary&year=${currentYear}`);
      if (response.ok) {
        const newSummaryData = await response.json();
        setSummaryData(newSummaryData);
        setHasInitialData(true);
      }
    } catch (error) {
      console.error('Failed to refresh summary data:', error);
      if (error instanceof Error) {
        setError(`Failed to refresh summary data: ${error.message}`);
      } else {
        setError('An unknown error occurred while refreshing summary data');
      }
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const handleAddFinance = useCallback((newFinance: Finanz) => {
    setFinData(prev => {
      const existingIndex = prev.findIndex(item => item.id === newFinance.id);
      if (existingIndex !== -1) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newFinance };
        return updated;
      }
      // Add new item at the beginning
      return [newFinance, ...prev];
    });

    // Refresh summary data if the transaction is from current year
    const currentYear = new Date().getFullYear();
    if (newFinance.datum && new Date(newFinance.datum).getFullYear() === currentYear) {
      refreshSummaryData();
    }

    // Refresh balance to reflect the new/updated transaction
    fetchBalance();
  }, [refreshSummaryData, fetchBalance]);

  const handleBulkUpdateSuccess = useCallback((updatedFinances: Finanz[]) => {
    if (!updatedFinances?.length) {
      return;
    }

    const currentYear = new Date().getFullYear();
    const shouldRefreshSummary = updatedFinances.some(finance => (
      finance.datum && new Date(finance.datum).getFullYear() === currentYear
    ));

    setFinData(prev => {
      const updatesById = new Map(updatedFinances.map(finance => [finance.id, finance]));
      return prev.map(item => updatesById.get(item.id) ? { ...item, ...updatesById.get(item.id)! } : item);
    });

    if (shouldRefreshSummary) {
      refreshSummaryData();
    }

    fetchBalance();
  }, [refreshSummaryData, fetchBalance]);

  const handleSuccess = useCallback((data: any) => {
    if (data) {
      handleAddFinance(data);
    }
  }, [handleAddFinance]);

  // Use server-provided summary data or fallback to default values
  const averageMonthlyIncome = summaryData?.averageMonthlyIncome ?? 0;
  const averageMonthlyExpenses = summaryData?.averageMonthlyExpenses ?? 0;
  const averageMonthlyCashflow = summaryData?.averageMonthlyCashflow ?? 0;
  const yearlyProjection = summaryData?.yearlyProjection ?? 0;
  const totalIncome = summaryData?.totalIncome ?? 0;
  const totalExpenses = summaryData?.totalExpenses ?? 0;

  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const handleAddTransaction = useCallback(() => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const refreshFinances = async () => {
    await loadMoreTransactions(true);
    await refreshSummaryData();
    await fetchBalance();
  };

  // Constants for filter options
  const ALL_APARTMENTS_FILTER = 'Alle Wohnungen';
  const ALL_YEARS_FILTER = 'Alle Jahre';

  // Filter options
  const apartmentOptions = useMemo(() =>
    [ALL_APARTMENTS_FILTER, ...wohnungen.map(w => w.name)].map(a => ({ value: a, label: a })),
    [wohnungen]
  );

  const yearOptions = useMemo(() =>
    [ALL_YEARS_FILTER, ...availableYears.map(y => y.toString())].map(y => ({ value: y, label: y })),
    [availableYears]
  );

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };

  // Summary calculation for StatCards
  const summary = useMemo(() => {
    const totalTransactions = finData.length;
    const incomeCount = finData.filter(f => f.ist_einnahmen).length;
    const expenseCount = totalTransactions - incomeCount;

    // Average transaction amount
    const transactionAmounts = finData.map(f => f.betrag).filter(amount => amount > 0);
    const avgTransaction = transactionAmounts.length ? transactionAmounts.reduce((s, v) => s + v, 0) / transactionAmounts.length : 0;

    return { totalTransactions, incomeCount, expenseCount, avgTransaction };
  }, [finData]);

  // Wohnungen map for bulk actions
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen]);

  // Helper function to properly escape CSV values
  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedFinances.size === 0) return;

    try {
      const response = await fetch('/api/finanzen/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedFinances) })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Erfolg",
          description: `${selectedFinances.size} Transaktionen erfolgreich gelöscht.`,
          variant: "success",
        });

        // Refresh the data after successful deletion
        if (refreshFinances) {
          refreshFinances();
        }

        // Clear selection after successful deletion
        setSelectedFinances(new Set());
      } else {
        throw new Error(result.error || 'Fehler beim Löschen der Transaktionen');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Fehler",
        description: "Beim Löschen der ausgewählten Transaktionen ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  }, [selectedFinances, refreshFinances]);

  const handleBulkExport = useCallback(() => {
    const selectedFinancesData = finData.filter(f => selectedFinances.has(f.id))

    // Create CSV header
    const headers = ['Bezeichnung', 'Wohnung', 'Datum', 'Betrag', 'Typ', 'Notiz']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedFinancesData.map(f => {
      const row = [
        f.name,
        f.Wohnungen?.name || '',
        f.datum || '',
        f.betrag.toString(),
        f.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
        f.notiz || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finanzen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }, [selectedFinances, finData, escapeCsvValue]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters.selectedApartment) params.append('selectedApartment', filters.selectedApartment);
    if (filters.selectedYear) params.append('selectedYear', filters.selectedYear);
    if (filters.selectedType) params.append('selectedType', filters.selectedType);

    const url = `/api/finanzen/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/finanzen/analytics?action=available-years');
      if (response.ok) {
        const years = await response.json();
        setAvailableYears(years);
      } else {
        // Fallback to the old API if the new one fails
        console.warn('New analytics API failed, falling back to old years API');
        const fallbackResponse = await fetch('/api/finanzen/years');
        if (fallbackResponse.ok) {
          const years = await fallbackResponse.json();
          setAvailableYears(years);
        }
      }
    } catch (error) {
      console.error('Failed to fetch available years:', error);
      if (error instanceof Error) {
        setError(`Failed to fetch available years: ${error.message}`);
      } else {
        setError('An unknown error occurred while fetching available years');
      }
    }
  }, []);

  useEffect(() => {
    fetchAvailableYears();
    fetchBalance(); // Initial balance fetch
  }, []); // Only run once on mount

  useEffect(() => {
    setIsFilterLoading(true);
    const timer = setTimeout(() => {
      loadMoreTransactions(true).finally(() => setIsFilterLoading(false));
      fetchBalance();
    }, 100);

    return () => clearTimeout(timer);
  }, [filters.selectedApartment, filters.selectedYear, filters.selectedType, filters.sortKey, filters.sortDirection, debouncedSearchQuery]);


  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />

      {/* Fallback Year Notification Banner */}
      {isUsingFallbackYear && initialYear && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Daten aus {initialYear} werden angezeigt
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Für das aktuelle Jahr ({currentYear}) liegen noch keine Finanzdaten vor.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards for Current Year */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        {isSummaryLoading && hasInitialData ? (
          <>
            <SummaryCardSkeleton
              title="Ø Monatliche Einnahmen"
              icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
            />
            <SummaryCardSkeleton
              title="Ø Monatliche Ausgaben"
              icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
            />
            <SummaryCardSkeleton
              title="Ø Monatlicher Cashflow"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            />
            <SummaryCardSkeleton
              title="Jahresprognose"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        ) : (
          <>
            <SummaryCard
              title="Ø Monatliche Einnahmen"
              value={averageMonthlyIncome}
              description="Durchschnittliche monatliche Einnahmen"
              icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
              isLoading={isSummaryLoading}
            />
            <SummaryCard
              title="Ø Monatliche Ausgaben"
              value={averageMonthlyExpenses}
              description="Durchschnittliche monatliche Ausgaben"
              icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
              isLoading={isSummaryLoading}
            />
            <SummaryCard
              title="Ø Monatlicher Cashflow"
              value={averageMonthlyCashflow}
              description="Durchschnittlicher monatlicher Überschuss"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              isLoading={isSummaryLoading}
            />
            <SummaryCard
              title="Jahresprognose"
              value={yearlyProjection}
              description="Geschätzter Jahresgewinn"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              isLoading={isSummaryLoading}
            />
          </>
        )}
      </div>

      <FinanceVisualization
        finances={finData}
        summaryData={summaryData}
        availableYears={availableYears}
        initialYear={initialYear}
        key={summaryData?.year}
      />

      {/* Filtered Summary Cards */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
        {balanceLoading ? (
          <>
            <SummaryCardSkeleton
              title="Gefilterte Einnahmen"
              icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
            />
            <SummaryCardSkeleton
              title="Gefilterte Ausgaben"
              icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
            />
            <SummaryCardSkeleton
              title="Aktueller Saldo"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            />
          </>
        ) : (
          <>
            <SummaryCard
              title="Gefilterte Einnahmen"
              value={filteredIncome}
              description="Einnahmen basierend auf aktuellen Filtern"
              icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />}
              isLoading={balanceLoading}
            />
            <SummaryCard
              title="Gefilterte Ausgaben"
              value={filteredExpenses}
              description="Ausgaben basierend auf aktuellen Filtern"
              icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />}
              isLoading={balanceLoading}
            />
            <SummaryCard
              title="Aktueller Saldo"
              value={totalBalance}
              description="Gesamtsaldo aller Transaktionen"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              isLoading={balanceLoading}
            />
          </>
        )}
      </div>

      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Finanzverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Verwalten Sie hier alle Ihre Einnahmen und Ausgaben</p>
            </div>
            <div className="mt-0 sm:mt-1">
              <ResponsiveButtonWithTooltip onClick={handleAddTransaction} icon={<PlusCircle className="h-4 w-4" />} shortText="Hinzufügen">
                Transaktion hinzufügen
              </ResponsiveButtonWithTooltip>
            </div>
          </div>
        </CardHeader>
        <div className="px-4 sm:px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-4 sm:mt-6">
            {/* Filter Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full md:flex-1">
                <CustomCombobox
                  options={apartmentOptions}
                  value={filters.selectedApartment}
                  onChange={(value) => handleFilterChange('selectedApartment', value ?? ALL_APARTMENTS_FILTER)}
                  placeholder="Wohnung auswählen"
                  searchPlaceholder="Wohnung suchen..."
                  emptyText="Keine Wohnung gefunden"
                  width="w-full"
                />
                <CustomCombobox
                  options={yearOptions}
                  value={filters.selectedYear}
                  onChange={(value) => handleFilterChange('selectedYear', value ?? ALL_YEARS_FILTER)}
                  placeholder="Jahr auswählen"
                  searchPlaceholder="Jahr suchen..."
                  emptyText="Kein Jahr gefunden"
                  width="w-full"
                />
                <CustomCombobox
                  options={[
                    { value: "Alle Transaktionen", label: "Alle Transaktionen" },
                    { value: "Einnahme", label: "Einnahme" },
                    { value: "Ausgabe", label: "Ausgabe" }
                  ]}
                  value={filters.selectedType}
                  onChange={(value) => handleFilterChange('selectedType', value ?? 'Alle Transaktionen')}
                  placeholder="Transaktionstyp auswählen"
                  searchPlaceholder="Typ suchen..."
                  emptyText="Kein Typ gefunden"
                  width="w-full"
                />
                <SearchInput
                  placeholder="Transaktion suchen..."
                  wrapperClassName="col-span-1 sm:col-span-2 md:col-span-1"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  onClear={() => handleFilterChange('searchQuery', '')}
                />
              </div>
              <div className="flex items-center gap-2 md:flex-shrink-0">
                <ResponsiveButtonWithTooltip variant="outline" onClick={handleExportCsv} icon={<Download className="h-4 w-4" />} shortText="Exportieren">
                  Als CSV exportieren
                </ResponsiveButtonWithTooltip>
              </div>
            </div>

            <FinanceBulkActionBar
              selectedFinances={selectedFinances}
              wohnungsMap={wohnungsMap}
              onClearSelection={() => setSelectedFinances(new Set())}
              onExport={handleBulkExport}
              onDelete={handleBulkDelete}
              onUpdate={handleBulkUpdateSuccess}
            />
          </div>
          <FinanceTable
            finances={finData}
            wohnungen={wohnungen}
            filter={filters.selectedType}
            searchQuery={filters.searchQuery}
            onEdit={handleEdit}
            onRefresh={refreshFinances} // Pass the refresh function here
            selectedFinances={selectedFinances}
            onSelectionChange={setSelectedFinances}
            isFilterLoading={isFilterLoading}
            hasMore={hasMore}
            isLoading={isLoading}
            error={error}
            loadFinances={() => loadMoreTransactions(false)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
