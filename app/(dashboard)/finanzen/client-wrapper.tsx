"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { useModalStore } from "@/hooks/use-modal-store";

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

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
}

export interface Filters {
  apartmentId: string;
  year: string;
  type: string;
  searchQuery: string;
  sortBy: string;
  sortDirection: string;
}

interface FinanzenClientWrapperProps {
  wohnungen: Wohnung[];
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function FinanzenClientWrapper({ wohnungen }: FinanzenClientWrapperProps) {
  const [transactions, setTransactions] = useState<Finanz[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    apartmentId: "Alle Wohnungen",
    year: "Alle Jahre",
    type: "Alle Transaktionen",
    searchQuery: "",
    sortBy: "datum",
    sortDirection: "desc",
  });

  const isMobile = useIsMobile();
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  const fetchTransactions = useCallback(async (isNewFilter = false) => {
    if (loading && !isNewFilter && !initialLoading) return;

    setLoading(true);
    if(isNewFilter) {
      setInitialLoading(true);
    }
    setError(null);

    const currentPage = isNewFilter ? 1 : page;
    const limit = isMobile ? 15 : 25;

    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: limit.toString(),
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });

    if (filters.apartmentId !== "Alle Wohnungen") params.append('apartmentId', filters.apartmentId);
    if (filters.year !== "Alle Jahre") params.append('year', filters.year);
    if (filters.type !== "Alle Transaktionen") params.append('type', filters.type);
    if (debouncedSearchQuery) params.append('searchQuery', debouncedSearchQuery);

    try {
      const res = await fetch(`/api/finanzen?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      const data = await res.json();

      const newTransactions = data.transactions || [];
      setTransactions(prev => isNewFilter ? newTransactions : [...prev, ...newTransactions]);
      setTotalCount(data.totalCount);
      setTotals(data.totals);
      setPage(currentPage + 1);
      setHasMore((isNewFilter ? newTransactions.length : transactions.length + newTransactions.length) < data.totalCount);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [page, filters, debouncedSearchQuery, isMobile, loading, initialLoading, transactions.length]);

  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
        isFirstRun.current = false;
        fetchTransactions(true);
    } else {
        setPage(1);
        fetchTransactions(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.apartmentId, filters.year, filters.type, debouncedSearchQuery, filters.sortBy, filters.sortDirection]);

  const refreshData = useCallback(() => {
    setPage(1);
    fetchTransactions(true);
  },[fetchTransactions]);

  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, refreshData);
  }, [wohnungen, refreshData]);

  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, refreshData);
  };

  const handleFilterChange = (filterName: keyof Omit<Filters, 'searchQuery'>, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
  }

  const handleSortChange = (key: string, direction: string) => {
    setFilters(prev => ({...prev, sortBy: key, sortDirection: direction}))
  }

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamteinnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals ? `${totals.totalIncome.toFixed(2).replace(".", ",")} €` : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals ? `${totals.totalExpenses.toFixed(2).replace(".", ",")} €` : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtsaldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals ? `${totals.totalBalance.toFixed(2).replace(".", ",")} €` : '...'}
            </div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anzahl Transaktionen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={transactions} />
      <FinanceTransactions 
        finances={transactions}
        onEdit={handleEdit}
        loadMore={() => fetchTransactions(false)}
        hasMore={hasMore}
        isLoading={loading}
        isInitialLoading={initialLoading}
        error={error}
        onRetry={refreshData}
        totalCount={totalCount}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        wohnungen={wohnungen}
      />
    </div>
  );
}
