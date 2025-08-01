"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { useModalStore } from "@/hooks/use-modal-store";
import { useIsVisible } from "@/hooks/use-is-visible";

// Interfaces from Design Doc
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

interface PaginatedFinanceResponse {
  data: Finanz[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface FinanceTotalsResponse {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

interface FinanceFilters {
  apartment: string;
  year: string;
  type: string;
  search: string;
}

interface PaginationState {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

interface FinanzenClientWrapperProps {
  initialFinances: PaginatedFinanceResponse;
  initialTotals: FinanceTotalsResponse;
  wohnungen: Wohnung[];
}

const INITIAL_LIMIT = 25;
const MOBILE_LIMIT = 15;

export default function FinanzenClientWrapper({
  initialFinances,
  initialTotals,
  wohnungen,
}: FinanzenClientWrapperProps) {
  const [transactions, setTransactions] = useState<Finanz[]>(initialFinances.data);
  const [pagination, setPagination] = useState<PaginationState>(initialFinances.pagination);
  const [totals, setTotals] = useState<FinanceTotalsResponse>(initialTotals);
  const [filters, setFilters] = useState<FinanceFilters>({
    apartment: "all",
    year: "all",
    type: "all",
    search: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsVisible(); // Simplified mobile detection
  const debouncedSearch = useDebounce(filters.search, 300);

  const buildQueryString = (currentFilters: FinanceFilters, offset = 0) => {
    const params = new URLSearchParams();
    const limit = isMobile ? MOBILE_LIMIT : INITIAL_LIMIT;
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (currentFilters.apartment !== "all") params.set("apartment", currentFilters.apartment);
    if (currentFilters.year !== "all") params.set("year", currentFilters.year);
    if (currentFilters.type !== "all") params.set("type", currentFilters.type);
    if (currentFilters.search) params.set("search", currentFilters.search);
    return params.toString();
  };

  const fetchData = useCallback(async (newFilters: FinanceFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(newFilters);
      const [transactionsRes, totalsRes] = await Promise.all([
        fetch(`/api/finanzen?${queryString}`),
        fetch(`/api/finanzen/totals?${queryString}`),
      ]);

      if (!transactionsRes.ok || !totalsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const transactionsPayload: PaginatedFinanceResponse = await transactionsRes.json();
      const totalsPayload: FinanceTotalsResponse = await totalsRes.json();

      setTransactions(transactionsPayload.data);
      setPagination(transactionsPayload.pagination);
      setTotals(totalsPayload);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const newFilters = { ...filters, search: debouncedSearch };
    fetchData(newFilters);
  }, [debouncedSearch, filters.apartment, filters.year, filters.type, fetchData]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !pagination.hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextOffset = pagination.offset + pagination.limit;
      const queryString = buildQueryString(filters, nextOffset);
      const res = await fetch(`/api/finanzen?${queryString}`);

      if (!res.ok) throw new Error("Failed to load more transactions");

      const { data, pagination: newPagination }: PaginatedFinanceResponse = await res.json();
      setTransactions((prev) => [...prev, ...data]);
      setPagination(newPagination);
    } catch (err: any) {
      setError(err.message); // Show error for loading more
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, pagination, filters, buildQueryString]);

  const handleFilterChange = <K extends keyof FinanceFilters>(key: K, value: FinanceFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, () => fetchData(filters));
  };
  
  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, () => fetchData(filters));
  }, [wohnungen, filters, fetchData]);

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamteinnahmen</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totals.totalIncome.toFixed(2).replace(".", ",")} €</div>
                <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
            </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totals.totalExpenses.toFixed(2).replace(".", ",")} €</div>
                <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
            </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtsaldo</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totals.totalBalance.toFixed(2).replace(".", ",")} €</div>
                <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
            </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anzahl Transaktionen</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totals.transactionCount}</div>
                <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
            </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={transactions} />
      <FinanceTransactions
        finances={transactions}
        wohnungen={wohnungen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onEdit={handleEdit}
        loadMore={loadMore}
        hasMore={pagination.hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        totalCount={pagination.total}
        onAdd={() => fetchData(filters)}
      />
    </div>
  );
}
