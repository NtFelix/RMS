"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { useModalStore } from "@/hooks/use-modal-store";
import { useIsMobile } from "@/hooks/use-mobile";

interface Finanz {
  id: string;
  wohnung_id?: string;
  name: string;
  datum?: string;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string;
  Wohnungen?: { name: string };
  wohnung?: { name: string };
}

interface Wohnung { id: string; name: string; }

interface FinanzenClientWrapperProps {
  initialWohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ initialWohnungen }: FinanzenClientWrapperProps) {
  const { openFinanceModal } = useModalStore();
  const isMobile = useIsMobile();

  const [transactions, setTransactions] = useState<Finanz[]>([]);
  const [totals, setTotals] = useState({ balance: 0, income: 0, expenses: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    searchQuery: "",
    selectedApartment: "Alle Wohnungen",
    selectedYear: new Date().getFullYear().toString(),
    selectedType: "Alle Transaktionen",
    sortKey: "datum",
    sortDirection: "desc",
  });

  const fetchTransactions = useCallback(async (newFilters?: Partial<typeof filters>, reset = false) => {
    const currentFilters = { ...filters, ...newFilters };
    const isInitialLoad = reset || page === 1;

    if (isInitialLoad) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const currentPage = reset ? 1 : page;
      const limit = isMobile ? 15 : 25;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy: currentFilters.sortKey,
        sortDirection: currentFilters.sortDirection,
      });

      if (currentFilters.selectedApartment !== "Alle Wohnungen") {
        const wohnung = initialWohnungen.find(w => w.name === currentFilters.selectedApartment);
        if (wohnung) params.append('wohnungId', wohnung.id);
      }
      if (currentFilters.selectedYear !== "Alle Jahre") params.append('year', currentFilters.selectedYear);
      if (currentFilters.selectedType !== "Alle Transaktionen") params.append('type', currentFilters.selectedType);
      if (currentFilters.searchQuery) params.append('searchQuery', currentFilters.searchQuery);

      const response = await fetch(`/api/finanzen?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();

      setTotals(data.totals);
      setTotalCount(data.totalCount || 0);
      setTransactions(prev => reset ? data.transactions : [...prev, ...data.transactions]);
      setPage(currentPage + 1);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isMobile, page, filters, initialWohnungen]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setPage(1);
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchTransactions(updatedFilters, true);
  };

  useEffect(() => {
    fetchTransactions(filters, true);
  }, []); // Fetch on initial mount

  const handleSuccess = useCallback(() => {
    fetchTransactions(filters, true);
  }, [fetchTransactions, filters]);

  const handleEdit = useCallback((finance: Finanz) => {
    openFinanceModal(finance, initialWohnungen, handleSuccess);
  }, [initialWohnungen, handleSuccess, openFinanceModal]);

  const handleAddTransaction = () => {
    openFinanceModal(undefined, initialWohnungen, handleSuccess);
  };

  const { income: totalIncome, expenses: totalExpenses, balance: totalBalance } = totals;

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamteinnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Summe aller gefilterten Einnahmen</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Summe aller gefilterten Ausgaben</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtsaldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Aktueller Finanzstatus der Auswahl</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={transactions} />

      <FinanceTransactions 
        initialWohnungen={initialWohnungen}
        onEdit={handleEdit}
        transactions={transactions}
        totalCount={totalCount}
        totals={totals}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        filters={filters}
        onFilterChange={handleFilterChange}
        loadMore={() => fetchTransactions()}
      />
    </div>
  );
}
