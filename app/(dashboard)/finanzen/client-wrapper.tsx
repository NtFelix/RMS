"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { useModalStore } from "@/hooks/use-modal-store";
import { useIsMobile } from "@/hooks/use-mobile";

// Interfaces
interface Finanz {
  id: string;
  wohnung_id?: string;
  name: string;
  datum?: string;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string;
  Wohnungen?: { id: string; name: string };
}

interface Wohnung { id: string; name: string; }

interface Totals {
  totalIncome: number;
  totalExpenses: number;
}

export default function FinanzenClientWrapper() {
  // State Management
  const [transactions, setTransactions] = useState<Finanz[]>([]);
  const [wohnungen, setWohnungen] = useState<Wohnung[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalIncome: 0, totalExpenses: 0 });
  const [totalCount, setTotalCount] = useState(0);

  // Filters and Sorting State
  const [filters, setFilters] = useState({
    apartmentId: 'all',
    year: 'all',
    type: 'all',
    searchQuery: '',
  });
  const [debouncedSearchQuery] = useDebounce(filters.searchQuery, 300);
  const [sorting, setSorting] = useState({ key: 'datum', direction: 'desc' });

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isMobile = useIsMobile();
  const limit = isMobile ? 15 : 25;

  // Loading and Error State
  const [loading, setLoading] = useState<'initial' | 'loading' | 'error' | 'idle'>('initial');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchWohnungenAndYears = useCallback(async () => {
    try {
      // These are relatively static and can be fetched once.
      const wohnungenRes = await fetch('/api/wohnungen');
      const finanzenMetaRes = await fetch('/api/finanzen/meta'); // A new endpoint for meta data

      const wohnungenData = await wohnungenRes.json();
      const finanzenMetaData = await finanzenMetaRes.json();

      setWohnungen(wohnungenData.wohnungen || []);
      setAvailableYears(finanzenMetaData.years || []);

    } catch (error) {
      console.error("Failed to fetch initial data", error);
    }
  }, []);

  useEffect(() => {
    fetchWohnungenAndYears();
  }, [fetchWohnungenAndYears]);

  const fetchFinances = useCallback(async (isNewFilter = false) => {
    if (isNewFilter) {
      setLoading('loading');
      setPage(1); // Reset page for new filters
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: isNewFilter ? '1' : String(page),
        limit: String(limit),
        sortKey: sorting.key,
        sortDirection: sorting.direction,
      });

      if (filters.apartmentId !== 'all') params.append('apartmentId', filters.apartmentId);
      if (filters.year !== 'all') params.append('year', filters.year);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (debouncedSearchQuery) params.append('searchQuery', debouncedSearchQuery);

      const res = await fetch(`/api/finanzen?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch finances');

      const data = await res.json();

      setTransactions(prev => isNewFilter ? data.transactions : [...prev, ...data.transactions]);
      setHasMore(data.transactions.length === limit);

      if (isNewFilter) {
        setTotals({ totalIncome: data.totalIncome, totalExpenses: data.totalExpenses });
        setTotalCount(data.total);
      }

      setLoading('idle');
    } catch (error) {
      console.error(error);
      setLoading('error');
    } finally {
      setLoadingMore(false);
    }
  }, [page, limit, sorting, filters, debouncedSearchQuery]);

  // Effect for initial load and filter changes
  useEffect(() => {
    fetchFinances(true);
  }, [filters.apartmentId, filters.year, filters.type, debouncedSearchQuery, sorting]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && loading === 'idle') {
      setPage(prevPage => prevPage + 1);
    }
  }, [loadingMore, hasMore, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchFinances(false);
    }
  }, [page]);


  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSortChange = (key: string) => {
    setSorting(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Memoized values for summary cards
  const summaryData = useMemo(() => {
    const balance = totals.totalIncome - totals.totalExpenses;
    return {
      balance,
      totalIncome: totals.totalIncome,
      totalExpenses: totals.totalExpenses,
    };
  }, [totals]);


  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, () => fetchFinances(true));
  };

  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, () => fetchFinances(true));
  }, [wohnungen, fetchFinances]);


  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamteinnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf den aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf den aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.balance.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf den aktuellen Filtern</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={transactions} />
      <FinanceTransactions 
        transactions={transactions}
        onEdit={handleEdit}
        onAdd={() => fetchFinances(true)}
        loadFinances={() => fetchFinances(true)}
        // Pass down new props for server-side handling
        filters={filters}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        onSortChange={handleSortChange}
        wohnungen={wohnungen}
        availableYears={availableYears}
        // Infinite scroll props
        loadMore={loadMore}
        hasMore={hasMore}
        totalCount={totalCount}
        loading={loading}
        loadingMore={loadingMore}
      />
    </div>
  );
}
