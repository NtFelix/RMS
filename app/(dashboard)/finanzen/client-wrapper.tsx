"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinancesDataTable } from "@/components/data-tables/finances-data-table";
import { Finance } from "@/components/columns/finances-columns";
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

interface Wohnung { id: string; name: string; }

interface FinanzenClientWrapperProps {
  finances: Finance[];
  wohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ finances, wohnungen }: FinanzenClientWrapperProps) {
  const [finData, setFinData] = useState<Finance[]>(finances);

  // Add handler for new entries
  const handleAddFinance = useCallback((newFinance: Finance) => {
    setFinData(prev => {
      // Check if the entry already exists to prevent duplicates
      const exists = prev.some(item => item.id === newFinance.id);
      if (exists) {
        // If it exists, update the existing entry
        return prev.map(item => 
          item.id === newFinance.id ? { ...item, ...newFinance } : item
        );
      }
      // If it's a new entry, add it to the beginning of the list
      return [newFinance, ...prev];
    });
  }, []);
  
  const handleSuccess = useCallback(() => {
    // The server returns the created/updated finance entry
    // For now, router.refresh() in the modal should handle revalidation.
    // We can also consider a client-side revalidation to avoid a full page reload.
    // For example, by using the `useSWR` hook.
  }, []);

  // useEffect for 'open-add-finance-modal' event is removed.
  // This will be handled by CommandMenu triggering useModalStore.

  // Werte berechnen (keep)
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

  // Improved average calculation - only consider months that have passed
  const now = new Date();
  const currentMonthIndex = now.getMonth(); // 0-based (0 = January)
  const monthsPassed = currentMonthIndex + 1;

  const totalsForPassedMonths = Object.entries(monthlyData).reduce(
    (acc, [monthKey, data]) => {
      const monthIndex = Number(monthKey); // monthKey is already 0-based from getMonth()
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

  // handleOpenChange, handleChange, handleDateChange, and original handleSubmit are removed.
  const handleEdit = useCallback((finance: Finance) => {
    useModalStore.getState().openFinanceModal(finance, wohnungen, handleSuccess);
  }, [wohnungen, handleSuccess]);

  const handleAddTransaction = () => {
    useModalStore.getState().openFinanceModal(undefined, wohnungen, handleSuccess);
  };
  
  // Function to refresh finance data, can be called by FinanceTransactions or after modal operations
  const refreshFinances = async () => {
    // This logic was part of the old handleSubmit, adapt if still needed for table refresh
    // For now, router.refresh() in the modal should handle revalidation.
    // If specific client-side state update is needed without full page reload, this can be expanded.
    const dataRes = await fetch('/api/finanzen'); // Or call a server action that just fetches
    if (dataRes.ok) {
      const newData = await dataRes.json();
      setFinData(newData);
    }
  };


  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        {/* Button to add a new transaction - now uses the global modal store */}
        <Button onClick={handleAddTransaction} className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Transaktion hinzufügen
        </Button>
        {/* The local Dialog for add/edit is removed */}
      </div>

      {/* Summary Cards (keep) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Cards remain the same */}
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
      <FinancesDataTable 
        data={finData} 
        onEdit={handleEdit} 
        onRefresh={refreshFinances}
        enableSelection={true}
      />
    </div>
  );
}
