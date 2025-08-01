"use client";

import { useState, useRef, useCallback, useEffect } from "react"; // useEffect might be removable if not used elsewhere
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
// Dialog, Input, Label, Select, DatePicker, toast, format are removed as they were for the local modal
// If other parts of the component use them, they should be kept. For now, assuming they are modal-specific.
// import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// import { toast } from "@/components/ui/use-toast";
// import { DatePicker } from "@/components/ui/date-picker";
// import { format } from "date-fns";

import { useModalStore } from "@/hooks/use-modal-store"; // Added

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
  income: number;
  expenses: number;
  balance: number;
}

interface FinanzenClientWrapperProps {
  initialFinances: Finanz[];
  initialTotals: Totals;
  initialCount: number;
  wohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ initialFinances, initialTotals, initialCount, wohnungen }: FinanzenClientWrapperProps) {
  const [finances, setFinances] = useState<Finanz[]>(initialFinances);
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [totalCount, setTotalCount] = useState<number>(initialCount);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { openFinanceModal } = useModalStore();

  const fetchFinances = useCallback(async (filters = {}, page = 1, limit = 25) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      const response = await fetch(`/api/finanzen?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch finances');
      const data = await response.json();

      if (page === 1) {
        setFinances(data.transactions);
      } else {
        setFinances(prev => [...prev, ...data.transactions]);
      }
      setTotals(data.totals);
      setTotalCount(data.count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinances();
  }, [fetchFinances]);

  const handleSuccess = useCallback(() => {
    fetchFinances();
  }, [fetchFinances]);

  const handleEdit = useCallback((finance: Finanz) => {
    openFinanceModal(finance, wohnungen, handleSuccess);
  }, [openFinanceModal, wohnungen, handleSuccess]);

  const handleAddTransaction = () => {
    openFinanceModal(undefined, wohnungen, handleSuccess);
  };
  
  // Calculate summary card values from API totals
  const currentYear = new Date().getFullYear();
  const averageMonthlyIncome = totals.income / 12;
  const averageMonthlyExpenses = totals.expenses / 12;
  const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;
  const yearlyProjection = totals.balance;


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
            <CardTitle className="text-sm font-medium">Gesamteinnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.income.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Summe aller Einnahmen</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.expenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Summe aller Ausgaben</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtsaldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.balance.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Aktueller Gesamt-Saldo</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anzahl Transaktionen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Anzahl der Transaktionen</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={finances} />
      <FinanceTransactions 
        finances={finances}
        totalCount={totalCount}
        loadMore={fetchFinances}
        isLoading={isLoading}
        onEdit={handleEdit}
        onAdd={handleSuccess}
        loadFinances={fetchFinances}
        wohnungen={wohnungen}
      />
    </div>
  );
}
