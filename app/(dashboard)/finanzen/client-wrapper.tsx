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

interface SummaryData {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyCashflow: number;
  yearlyProjection: number;
}

export default function FinanzenClientWrapper({ initialWohnungen }: FinanzenClientWrapperProps) {
  const { openFinanceModal } = useModalStore();
  const isMobile = useIsMobile();

  const [transactions, setTransactions] = useState<Finanz[]>([]);
  const [totals, setTotals] = useState({ balance: 0, income: 0, expenses: 0 });
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
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

  const fetchChartData = useCallback(async (newFilters?: Partial<typeof filters>) => {
    setChartLoading(true);
    const currentFilters = { ...filters, ...newFilters };
    try {
      const params = new URLSearchParams();
      if (currentFilters.selectedApartment !== "Alle Wohnungen") {
        const wohnung = initialWohnungen.find(w => w.name === currentFilters.selectedApartment);
        if (wohnung) params.append('wohnungId', wohnung.id);
      }
      if (currentFilters.selectedYear !== "Alle Jahre") params.append('year', currentFilters.selectedYear);
      if (currentFilters.selectedType !== "Alle Transaktionen") params.append('type', currentFilters.selectedType);
      if (currentFilters.searchQuery) params.append('searchQuery', currentFilters.searchQuery);

      const response = await fetch(`/api/finanzen/chart?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setChartLoading(false);
    }
  }, [filters, initialWohnungen]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/finanzen/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setPage(1);
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchTransactions(updatedFilters, true);
    fetchChartData(updatedFilters);
  };

  useEffect(() => {
    fetchTransactions(filters, true);
    fetchSummary();
    fetchChartData(filters);
  }, []);

  const handleSuccess = useCallback(() => {
    fetchTransactions(filters, true);
    fetchSummary();
    fetchChartData(filters);
  }, [fetchTransactions, fetchSummary, fetchChartData, filters]);

  const handleEdit = useCallback((finance: Finanz) => {
    openFinanceModal(finance, initialWohnungen, handleSuccess);
  }, [initialWohnungen, handleSuccess, openFinanceModal]);

  const handleAddTransaction = () => {
    openFinanceModal(undefined, initialWohnungen, handleSuccess);
  };

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
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatliche Einnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.averageMonthlyIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittliche monatliche Einnahmen</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatliche Ausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.averageMonthlyExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittliche monatliche Ausgaben</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatlicher Cashflow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.averageMonthlyCashflow.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittlicher monatlicher Überschuss</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jahresprognose</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.yearlyProjection.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Geschätzter Jahresgewinn</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={chartData} loading={chartLoading} />

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
