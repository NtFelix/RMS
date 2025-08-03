"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton";
import { SummaryCard } from "@/components/summary-card";
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

export default function FinanzenClientWrapper({ finances: initialFinances, wohnungen, summaryData: initialSummaryData }: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finanz[]>(deduplicateFinances(initialFinances));
  const [summaryData, setSummaryData] = useState<SummaryData | null>(initialSummaryData);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(initialSummaryData !== null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
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
      
      setHasMore(newTransactions.length === 25);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading]);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const params = new URLSearchParams({
        searchQuery: debouncedSearchQueryRef.current,
        selectedApartment: filtersRef.current.selectedApartment,
        selectedYear: filtersRef.current.selectedYear,
        selectedType: filtersRef.current.selectedType
      });
      
      const response = await fetch(`/api/finanzen/balance?${params.toString()}`);
      if (response.ok) {
        const { totalBalance } = await response.json();
        setTotalBalance(totalBalance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, []); // No dependencies needed since we use refs

  const refreshSummaryData = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`/api/finanzen/summary?year=${currentYear}`);
      if (response.ok) {
        const newSummaryData = await response.json();
        setSummaryData(newSummaryData);
        setHasInitialData(true);
      }
    } catch (error) {
      console.error('Failed to refresh summary data:', error);
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

  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, handleSuccess);
  };

  const refreshFinances = async () => {
    await loadMoreTransactions(true);
    await refreshSummaryData();
    await fetchBalance();
  };

  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch('/api/finanzen/years');
      if (response.ok) {
        const years = await response.json();
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Failed to fetch available years:', error);
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
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        <Button onClick={handleAddTransaction} className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Transaktion hinzufügen
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        key={summaryData?.year} 
      />
      <FinanceTransactions
        finances={finData}
        wohnungen={wohnungen}
        availableYears={availableYears}
        onEdit={handleEdit}
        onAdd={handleAddFinance}
        loadFinances={() => loadMoreTransactions(false)}
        reloadRef={reloadRef}
        hasMore={hasMore}
        isLoading={isLoading}
        isFilterLoading={isFilterLoading}
        error={error}
        fullReload={refreshFinances}
        filters={filters}
        onFiltersChange={setFilters}
        totalBalance={totalBalance}
        balanceLoading={balanceLoading}
      />
    </div>
  );
}
