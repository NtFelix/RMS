"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet, PlusCircle, Search, Euro, TrendingUp, TrendingDown } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTable } from "@/components/finance-table";
import { FinanceBulkActionBar } from "@/components/finance-bulk-action-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/stat-card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";

import { PAGINATION } from "@/constants";
import { useModalStore } from "@/hooks/use-modal-store";
import { useDebounce } from "@/hooks/use-debounce";

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

export default function FinanzenClientWrapper({ finances: initialFinances, wohnungen, summaryData: initialSummaryData, initialAvailableYears = [] }: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finanz[]>(deduplicateFinances(initialFinances));
  const [summaryData, setSummaryData] = useState<SummaryData | null>(initialSummaryData);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(initialSummaryData !== null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>(initialAvailableYears);
  const [filter, setFilter] = useState<"all" | "income" | "expenses">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
    <div className="flex flex-col gap-8 p-8 bg-gray-50/50 dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="Transaktionen gesamt"
          value={summary.totalTransactions}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Einnahmen / Ausgaben"
          value={`${summary.incomeCount} / ${summary.expenseCount}`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Transaktionsbetrag"
          value={summary.avgTransaction}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Aktueller Saldo"
          value={totalBalance}
          unit="€"
          decimals
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>

      <FinanceVisualization 
        finances={finData} 
        summaryData={summaryData} 
        availableYears={availableYears}
        key={summaryData?.year} 
      />

      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Finanzverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Einnahmen und Ausgaben</p>
            </div>
            <div className="mt-1">
              <ButtonWithTooltip onClick={handleAddTransaction} className="sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Transaktion hinzufügen
              </ButtonWithTooltip>
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all" as const, label: "Alle Transaktionen" },
                  { value: "income" as const, label: "Einnahmen" },
                  { value: "expenses" as const, label: "Ausgaben" },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={filter === value ? "default" : "ghost"}
                    onClick={() => setFilter(value)}
                    className="h-9 rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Transaktionen suchen..."
                  className="pl-10 rounded-full"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <FinanceBulkActionBar
              selectedFinances={selectedFinances}
              finances={finData}
              wohnungsMap={wohnungsMap}
              onClearSelection={() => setSelectedFinances(new Set())}
              onExport={handleBulkExport}
              onDelete={() => {/* TODO: Implement bulk delete */}}
            />
          </div>
          <FinanceTable
            finances={finData}
            wohnungen={wohnungen}
            filter={filter}
            searchQuery={searchQuery}
            onEdit={handleEdit}
            selectedFinances={selectedFinances}
            onSelectionChange={setSelectedFinances}
          />
        </CardContent>
      </Card>
    </div>
  );
}
