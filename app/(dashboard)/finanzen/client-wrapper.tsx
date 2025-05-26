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

interface FinanzenClientWrapperProps {
  finances: Finanz[];
  wohnungen: Wohnung[];
}

export default function FinanzenClientWrapper({ finances, wohnungen }: FinanzenClientWrapperProps) {
  // Local state for dialog (dialogOpen, editingId, formData) is removed
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);
  // const [formData, setFormData] = useState({ 
  //   wohnung_id: "", 
  //   name: "", 
  //   datum: "", 
  //   betrag: "", 
  //   ist_einnahmen: false, 
  //   notiz: "" 
  // });
  const [finData, setFinData] = useState<Finanz[]>(finances); // Keep for display
  const reloadRef = useRef<(() => void) | null>(null); // Keep for FinanceTransactions reload

  // Add handler for new entries
  const handleAddFinance = useCallback((newFinance: Finanz) => {
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
  
  // Handle successful form submission
  const handleSuccess = useCallback((data: any) => {
    // The server returns the created/updated finance entry
    if (data) {
      handleAddFinance(data);
    }
  }, [handleAddFinance]);

  // useEffect for 'open-add-finance-modal' event is removed.
  // This will be handled by CommandMenu triggering useModalStore.

  // Werte berechnen (keep)
  const totalIncome = finData.filter(f => f.ist_einnahmen).reduce((sum, item) => sum + Number(item.betrag), 0);
  const totalExpenses = finData.filter(f => !f.ist_einnahmen).reduce((sum, item) => sum + Number(item.betrag), 0);
  const monthlyCashflow = totalIncome - totalExpenses;
  const yearlyProjection = monthlyCashflow * 12;

  // handleOpenChange, handleChange, handleDateChange, and original handleSubmit are removed.
  // The old handleEdit is also removed. A new one will be added in the next step for the global modal.
  const handleEdit = useCallback((finance: Finanz) => {
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
            <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatliche Betriebskosten</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCashflow.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatlicher Überschuss</p>
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
      <FinanceTransactions 
        finances={finData} 
        onEdit={handleEdit} 
        onAdd={handleAddFinance}
        loadFinances={refreshFinances} 
        reloadRef={reloadRef}
      />
    </div>
  );
}
