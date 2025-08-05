"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet, Upload, Share2, Printer, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

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
      const params = new URLSearchParams({
        searchQuery: debouncedSearchQueryRef.current,
        selectedApartment: filtersRef.current.selectedApartment,
        selectedYear: filtersRef.current.selectedYear,
        selectedType: filtersRef.current.selectedType
      });
      
      const response = await fetch(`/api/finanzen/balance?${params.toString()}`);
      if (response.ok) {
        const { totalBalance, totalIncome, totalExpenses } = await response.json();
        setTotalBalance(totalBalance);
        setFilteredIncome(totalIncome);
        setFilteredExpenses(totalExpenses);
      }
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
      const response = await fetch(`/api/finanzen/summary?year=${currentYear}`);
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
    {/* Header Section */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-2">
      <div>
        <div className="text-3xl lg:text-4xl font-semibold">Guten Morgen, Nutzer</div>
        <div className="text-muted-foreground mt-1">Ihre Performance diese Woche</div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <Select defaultValue="all">
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            <SelectItem value="miete">Miete</SelectItem>
            <SelectItem value="betriebskosten">Betriebskosten</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker mode="single" className="w-full sm:w-auto" />
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Teilen
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Drucken
          </Button>
          <Button variant="default" size="sm" className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>
    </div>
    <Tabs defaultValue="overview" className="flex flex-col gap-8 p-8">
      <TabsList className={cn(
        "shadow-inner bg-transparent border-b border-border flex gap-2 pb-1 mb-6 mt-6"
      )}>
        <TabsTrigger
          value="overview"
          className={cn(
            "px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
            "transition-colors data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
          )}
        >
          Übersicht
        </TabsTrigger>
        <TabsTrigger
          value="data"
          className={cn(
            "px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
            "transition-colors data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
          )}
        >
          Daten
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="flex flex-col gap-10">
        <section className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
                <MetricCard
                  title="Ø Monatliche Einnahmen"
                  value={averageMonthlyIncome}
                  delta={0}
                  isCurrency
                  isLoading={isSummaryLoading}
                />
                <MetricCard
                  title="Ø Monatliche Ausgaben"
                  value={averageMonthlyExpenses}
                  delta={0}
                  isCurrency
                  isLoading={isSummaryLoading}
                />
                <MetricCard
                  title="Ø Monatlicher Cashflow"
                  value={averageMonthlyCashflow}
                  delta={0}
                  isCurrency
                  isLoading={isSummaryLoading}
                />
                <MetricCard
                  title="Jahresprognose"
                  value={yearlyProjection}
                  delta={0}
                  isCurrency
                  isLoading={isSummaryLoading}
                />
              </>
            )}
          </div>
        </section>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FinanceVisualization 
              finances={finData} 
              summaryData={summaryData} 
              availableYears={availableYears}
              key={summaryData?.year} 
            />
          </div>
          <StatusSummaryCard yearlyProjection={yearlyProjection} totalBalance={totalBalance} />
        </div>
      </TabsContent>
      <TabsContent value="data" className="flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
        <FinanceTransactions
          finances={finData}
          wohnungen={wohnungen}
          availableYears={availableYears}
          onEdit={handleEdit}
          onAdd={handleAddFinance}
          onAddTransaction={handleAddTransaction}
          loadFinances={() => loadMoreTransactions(false)}
          reloadRef={reloadRef}
          hasMore={hasMore}
          isLoading={isLoading}
          isFilterLoading={isFilterLoading}
          error={error}
          fullReload={refreshFinances}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </TabsContent>
    </Tabs>
  );
}

/* --- MetricCard component --- */
function MetricCard({
  title,
  value,
  delta,
  isCurrency,
  isLoading,
}: {
  title: string;
  value: number;
  delta: number;
  isCurrency?: boolean;
  isLoading?: boolean;
}) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  return (
    <Card className="bg-white shadow flex flex-col justify-between h-full">
      <CardHeader className="pb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{title}</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 items-start">
        <div className="text-2xl lg:text-3xl font-bold text-foreground">
          {isLoading
            ? <span className="inline-block h-7 w-24 bg-muted rounded animate-pulse" />
            : isCurrency
              ? value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
              : value}
        </div>
        <div className={cn(
          "text-sm flex items-center gap-1",
          isPositive && "text-green-600",
          isNegative && "text-red-600",
          !isPositive && !isNegative && "text-muted-foreground"
        )}>
          {isPositive && <ArrowUpRight className="w-4 h-4" />}
          {isNegative && <ArrowDownRight className="w-4 h-4" />}
          {delta === 0 ? "±0%" : `${isPositive ? "+" : ""}${delta}%`}
        </div>
      </CardContent>
    </Card>
  );
}

/* --- StatusSummaryCard component --- */
function StatusSummaryCard({ yearlyProjection, totalBalance }: { yearlyProjection: number, totalBalance: number }) {
  return (
    <Card className="bg-blue-600 text-white shadow-lg flex flex-col h-full justify-between">
      <CardHeader>
        <CardTitle className="text-white text-lg">Status Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Jahresprognose</div>
            <div className="text-3xl font-bold">{yearlyProjection.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Aktueller Saldo</div>
            <div className="text-2xl font-semibold">{totalBalance.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
