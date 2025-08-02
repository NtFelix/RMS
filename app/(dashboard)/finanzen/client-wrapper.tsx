"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton";
import { SummaryCard } from "@/components/summary-card";
import { useModalStore } from "@/hooks/use-modal-store";

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

export default function FinanzenClientWrapper({ finances: initialFinances, wohnungen, summaryData: initialSummaryData }: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finanz[]>(initialFinances);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(initialSummaryData);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(initialSummaryData !== null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadRef = useRef<(() => void) | null>(null);

  const loadMoreTransactions = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finanzen?page=${page + 1}&pageSize=25`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const newTransactions = await response.json();
      setFinData(prev => [...prev, ...newTransactions]);
      setPage(prev => prev + 1);
      setHasMore(newTransactions.length > 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading]);

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
      const exists = prev.some(item => item.id === newFinance.id);
      if (exists) {
        return prev.map(item =>
          item.id === newFinance.id ? { ...item, ...newFinance } : item
        );
      }
      return [newFinance, ...prev];
    });
    
    // Refresh summary data if the transaction is from current year
    const currentYear = new Date().getFullYear();
    if (newFinance.datum && new Date(newFinance.datum).getFullYear() === currentYear) {
      refreshSummaryData();
    }
  }, [refreshSummaryData]);

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
    setIsLoading(true);
    setIsSummaryLoading(true);
    setError(null);
    try {
      const [transactionsResponse, summaryResponse] = await Promise.all([
        fetch('/api/finanzen?page=1&pageSize=25'),
        fetch(`/api/finanzen/summary?year=${new Date().getFullYear()}`)
      ]);
      
      if (!transactionsResponse.ok) {
        throw new Error('Failed to refresh transactions');
      }
      
      const newData = await transactionsResponse.json();
      setFinData(newData);
      setPage(1);
      setHasMore(newData.length > 0);
      
      if (summaryResponse.ok) {
        const newSummaryData = await summaryResponse.json();
        setSummaryData(newSummaryData);
        setHasInitialData(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsSummaryLoading(false);
    }
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

      <FinanceVisualization finances={finData} summaryData={summaryData} key={summaryData?.year} />
      <FinanceTransactions
        finances={finData}
        onEdit={handleEdit}
        onAdd={handleAddFinance}
        loadFinances={loadMoreTransactions}
        reloadRef={reloadRef}
        hasMore={hasMore}
        isLoading={isLoading}
        error={error}
        fullReload={refreshFinances}
      />
    </div>
  );
}
