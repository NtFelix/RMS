"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react";
import { FinanceVisualization } from "@/components/finance-visualization";
import { FinanceTransactions } from "@/components/finance-transactions";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    wohnung_id: "", 
    name: "", 
    datum: "", 
    betrag: "", 
    ist_einnahmen: false, 
    notiz: "" 
  });
  const [finData, setFinData] = useState<Finanz[]>(finances);
  const reloadRef = useRef<(() => void) | null>(null);

  // Werte berechnen
  const totalIncome = finData.filter(f => f.ist_einnahmen).reduce((sum, item) => sum + Number(item.betrag), 0);
  const totalExpenses = finData.filter(f => !f.ist_einnahmen).reduce((sum, item) => sum + Number(item.betrag), 0);
  const monthlyCashflow = totalIncome - totalExpenses;
  const yearlyProjection = monthlyCashflow * 12;

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setFormData({ wohnung_id: "", name: "", datum: "", betrag: "", ist_einnahmen: false, notiz: "" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = useCallback((finance: Finanz) => {
    setEditingId(finance.id);
    setFormData({
      wohnung_id: finance.wohnung_id || "",
      name: finance.name,
      datum: finance.datum || "",
      betrag: finance.betrag?.toString() || "",
      ist_einnahmen: finance.ist_einnahmen,
      notiz: finance.notiz || ""
    });
    setDialogOpen(true);
  }, []);

  // SSR: Submission via API Route
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.betrag) {
      toast({ title: "Fehler", description: "Name und Betrag sind erforderlich", variant: "destructive" });
      return;
    }
    const payload: any = { name: formData.name, betrag: parseFloat(formData.betrag), ist_einnahmen: formData.ist_einnahmen };
    if (formData.wohnung_id) payload.wohnung_id = formData.wohnung_id;
    if (formData.datum) payload.datum = formData.datum;
    if (formData.notiz) payload.notiz = formData.notiz;
    try {
      const url = editingId ? `/api/finanzen?id=${editingId}` : '/api/finanzen';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: editingId ? "Aktualisiert" : "Gespeichert", description: editingId ? "Transaktion aktualisiert." : "Transaktion hinzugefügt." });
        handleOpenChange(false);
        // Neu laden
        const dataRes = await fetch('/api/finanzen');
        if (dataRes.ok) {
          const newData = await dataRes.json();
          setFinData(newData);
        }
        if (reloadRef.current) reloadRef.current();
      } else {
        const err = await res.json();
        toast({ title: "Fehler", description: err.details || err.error || "Unbekannter Fehler", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Netzwerkfehler", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Transaktion hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Transaktion bearbeiten' : 'Transaktion hinzufügen'}</DialogTitle>
              <DialogDescription>Füllen Sie die erforderlichen Felder aus.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Bezeichnung</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="betrag">Betrag (€)</Label>
                  <Input id="betrag" name="betrag" type="number" step="0.01" min="0.01" value={formData.betrag} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="datum">Datum</Label>
                  <Input id="datum" name="datum" type="date" value={formData.datum} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="wohnung_id">Wohnung</Label>
                  <Select value={formData.wohnung_id} onValueChange={(v) => setFormData({...formData, wohnung_id: v})}>
                    <SelectTrigger id="wohnung_id">
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent>
                      {wohnungen.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ist_einnahmen">Typ</Label>
                  <Select
                    value={formData.ist_einnahmen ? 'Einnahmen' : 'Ausgaben'}
                    onValueChange={(v) => setFormData({...formData, ist_einnahmen: v === 'Einnahmen'})}
                  >
                    <SelectTrigger id="ist_einnahmen">
                      <SelectValue placeholder="Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Einnahmen">Einnahmen</SelectItem>
                      <SelectItem value="Ausgaben">Ausgaben</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notiz">Notiz</Label>
                  <Input id="notiz" name="notiz" value={formData.notiz} onChange={handleChange} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingId ? 'Aktualisieren' : 'Speichern'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      <FinanceTransactions finances={finData} reloadRef={reloadRef} onEdit={handleEdit} loadFinances={async () => {
        const dataRes = await fetch('/api/finanzen');
        if (dataRes.ok) {
          const newData = await dataRes.json();
          setFinData(newData);
        }
      }} />
    </div>
  );
}
