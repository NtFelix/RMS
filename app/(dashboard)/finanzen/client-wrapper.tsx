"use client";

import { useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { useModalStore } from "@/hooks/use-modal-store";
import { useFinanceStore } from "@/hooks/use-finance-store";
import { useIsMobile } from "@/hooks/use-mobile";

import { Finanz, Wohnung } from '@/types';

interface FinanzenClientWrapperProps {
  initialFinances: {
    transactions: Finanz[];
    totalCount: number;
    totals: {
      income: number;
      expense: number;
      balance: number;
    };
  };
  wohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ initialFinances, wohnungen }: FinanzenClientWrapperProps) {
  const initialized = useRef(false);
  const {
    transactions,
    totals,
    initialize,
    fetchTransactions,
    setLimit
  } = useFinanceStore(state => ({
    transactions: state.transactions,
    totals: state.totals,
    initialize: state.initialize,
    fetchTransactions: state.fetchTransactions,
    setLimit: state.setLimit
  }));

  const isMobile = useIsMobile();

  // Initialize the store with server-fetched data only once
  useEffect(() => {
    if (!initialized.current) {
      initialize(initialFinances);
      initialized.current = true;
    }
  }, [initialize, initialFinances]);

  // Set the transaction limit based on device type
  useEffect(() => {
    setLimit(isMobile ? 15 : 25);
  }, [isMobile, setLimit]);

  // Handler for the "Add Transaction" button
  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, () => {
      fetchTransactions({ force: true });
    });
  };
  
  // Handler for editing a transaction (passed to the table)
  const handleEdit = useCallback((finance: Finanz) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, () => {
      fetchTransactions({ force: true });
    });
  }, [wohnungen, fetchTransactions]);

  // The summary cards now display data directly from the Zustand store
  const totalIncome = totals.income;
  const totalExpenses = totals.expense;
  const totalBalance = totals.balance;

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
            <div className="text-2xl font-bold">{totalIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Basierend auf aktuellen Filtern</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jahresprognose</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Jahresprognose logic is removed as it's complex and not part of core requirements */}
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Nicht verfügbar</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={transactions} />
      <FinanceTransactions 
        wohnungen={wohnungen}
        onEdit={handleEdit} 
      />
    </div>
  );
}
