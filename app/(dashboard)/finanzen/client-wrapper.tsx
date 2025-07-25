"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { useModalStore } from "@/hooks/use-modal-store";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";
import { Finance } from "../../../types/Finanzen";

interface Wohnung {
  id: string;
  name: string;
}

interface FinanzenClientWrapperProps {
  finances: Finance[];
  wohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ finances, wohnungen }: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finance[]>(finances);
  const { openFinanceModal } = useModalStore();

  const handleSuccess = useCallback((data: any) => {
    const exists = finData.some(item => item.id === data.id);
    if (exists) {
      setFinData(prev => prev.map(item => (item.id === data.id ? { ...item, ...data } : item)));
    } else {
      setFinData(prev => [data, ...prev]);
    }
  }, [finData]);

  const handleAddTransaction = () => {
    openFinanceModal(undefined, wohnungen, handleSuccess);
  };

  const currentYear = new Date().getFullYear();
  const financesForCurrentYear = finData.filter(f => f.datum && new Date(f.datum).getFullYear() === currentYear);

  const monthlyData = financesForCurrentYear.reduce((acc, item) => {
    const month = new Date(item.datum!).getMonth();
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 };
    }
    if (item.ist_einnahmen) {
      acc[month].income += Number(item.betrag);
    } else {
      acc[month].expenses += Number(item.betrag);
    }
    return acc;
  }, {} as Record<number, { income: number; expenses: number }>);

  const monthlyEntries = Object.values(monthlyData);
  const totalIncome = monthlyEntries.reduce((sum, item) => sum + item.income, 0);
  const totalExpenses = monthlyEntries.reduce((sum, item) => sum + item.expenses, 0);

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const monthsPassed = currentMonthIndex + 1;

  const totalsForPassedMonths = Object.entries(monthlyData).reduce(
    (acc, [monthKey, data]) => {
      const monthIndex = Number(monthKey);
      if (monthIndex <= currentMonthIndex) {
        acc.income += data.income;
        acc.expenses += data.expenses;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const averageMonthlyIncome = totalsForPassedMonths.income / monthsPassed;
  const averageMonthlyExpenses = totalsForPassedMonths.expenses / monthsPassed;
  const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;
  const yearlyProjection = averageMonthlyCashflow * 12;

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
            <div className="text-2xl font-bold">{averageMonthlyIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittliche monatliche Einnahmen</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatliche Ausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageMonthlyExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittliche monatliche Ausgaben</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatlicher Cashflow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageMonthlyCashflow.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Durchschnittlicher monatlicher Überschuss</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jahresprognose</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearlyProjection.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Geschätzter Jahresgewinn</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization finances={finData} />
      <DataTable columns={columns} data={finData} filterColumn="name" />
    </div>
  );
}
