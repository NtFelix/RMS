"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Nebenkosten, Haus } from "../lib/data-fetching";
import { createNebenkosten, updateNebenkosten } from "../app/betriebskosten-actions";
import { useToast } from "../hooks/use-toast";
import { BERECHNUNGSART_OPTIONS, BerechnungsartValue } from "../lib/constants";
import { PlusCircle, Trash2 } from "lucide-react";

interface CostItem {
  id: string; // For React key, temporary client-side ID
  art: string;
  betrag: string; // Keep as string for input binding
  berechnungsart: BerechnungsartValue | ''; // Use '' for unselected state
}

interface BetriebskostenEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkostenToEdit?: Nebenkosten | null;
  haeuser: Haus[];
  userId: string;
}

export function BetriebskostenEditModal({
  isOpen,
  onClose,
  nebenkostenToEdit,
  haeuser,
  userId,
}: BetriebskostenEditModalProps) {
  const [jahr, setJahr] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [haeuserId, setHaeuserId] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleCostItemChange = (index: number, field: keyof Omit<CostItem, 'id'>, value: string | BerechnungsartValue) => {
    const newCostItems = [...costItems];
    // Type assertion for field to avoid TS errors with complex union types on 'value'
    (newCostItems[index] as any)[field] = value;
    setCostItems(newCostItems);
  };

  const addCostItem = () => {
    setCostItems([
      ...costItems,
      { id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' },
    ]);
  };

  const removeCostItem = (index: number) => {
    if (costItems.length <= 1) return; // Prevent removing the last item
    const newCostItems = costItems.filter((_, i) => i !== index);
    setCostItems(newCostItems);
  };

  useEffect(() => {
    if (isOpen) {
      if (nebenkostenToEdit) {
        setJahr(nebenkostenToEdit.jahr || "");
        setHaeuserId(nebenkostenToEdit.haeuser_id || "");
        setWasserkosten(nebenkostenToEdit.wasserkosten?.toString() || "");

        const existingCostItems: CostItem[] = (nebenkostenToEdit.nebenkostenart || []).map((art, index) => ({
          id: generateId(),
          art: art,
          betrag: nebenkostenToEdit.betrag?.[index]?.toString() || "",
          berechnungsart: (BERECHNUNGSART_OPTIONS.find(opt => opt.value === nebenkostenToEdit.berechnungsart?.[index])?.value as BerechnungsartValue) || '',
        }));
        setCostItems(existingCostItems.length > 0 ? existingCostItems : [{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);

      } else {
        // Reset for new entry
        setJahr(new Date().getFullYear().toString());
        setHaeuserId(haeuser && haeuser.length > 0 ? haeuser[0].id : "");
        setWasserkosten("");
        setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      }
    }
  }, [isOpen, nebenkostenToEdit, haeuser]);

  const handleSubmit = async () => {
    setIsSaving(true);

    if (!jahr || !haeuserId) {
      toast({
        title: "Fehlende Eingaben",
        description: "Jahr und Haus sind Pflichtfelder.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }
    
    const parsedWasserkosten = wasserkosten ? parseFloat(wasserkosten) : null;
    if (wasserkosten.trim() !== '' && isNaN(parsedWasserkosten as number)) {
      toast({ title: "Ungültige Eingabe", description: "Wasserkosten müssen eine gültige Zahl sein.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    if (costItems.length === 0) {
        toast({ title: "Validierungsfehler", description: "Mindestens ein Kostenpunkt muss hinzugefügt werden.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    const nebenkostenartArray: string[] = [];
    const betragArray: number[] = [];
    const berechnungsartArray: (BerechnungsartValue | '')[] = [];

    for (const item of costItems) {
      const art = item.art.trim();
      const betragValue = parseFloat(item.betrag); // Or Number(item.betrag)
      const berechnungsart = item.berechnungsart;

      if (!art) {
        toast({ title: "Validierungsfehler", description: `Art der Kosten darf nicht leer sein. Bitte überprüfen Sie Posten ${costItems.indexOf(item) + 1}.`, variant: "destructive" });
        setIsSaving(false);
        return;
      }
      // Allow 0 as a valid amount, but not empty strings that become NaN
      if (item.betrag.trim() === '' || isNaN(betragValue)) {
        toast({ title: "Validierungsfehler", description: `Betrag "${item.betrag}" ist keine gültige Zahl für Kostenart "${art}".`, variant: "destructive" });
        setIsSaving(false);
        return;
      }
      if (!berechnungsart) { // Check for empty string as per CostItem type
        toast({ title: "Validierungsfehler", description: `Berechnungsart muss für Kostenart "${art}" ausgewählt werden.`, variant: "destructive" });
        setIsSaving(false);
        return;
      }

      nebenkostenartArray.push(art);
      betragArray.push(betragValue);
      berechnungsartArray.push(berechnungsart);
    }

    const formData = {
      jahr: jahr.trim(),
      nebenkostenart: nebenkostenartArray,
      betrag: betragArray,
      berechnungsart: berechnungsartArray,
      wasserkosten: parsedWasserkosten,
      haeuser_id: haeuserId,
      // user_id: userId, // This line is removed
    };

    let response;
    if (nebenkostenToEdit) {
      response = await updateNebenkosten(nebenkostenToEdit.id, formData);
    } else {
      response = await createNebenkosten(formData);
    }

    if (response.success) {
      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Betriebskostendaten wurden erfolgreich gespeichert.",
      });
      onClose();
    } else {
      toast({
        title: "Fehler beim Speichern",
        description: response.message || "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>
              {nebenkostenToEdit ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              Füllen Sie die Details für die Betriebskostenabrechnung aus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4"> {/* Removed py-4, relying on DialogContent padding and space-y for inter-element spacing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formJahr">Jahr *</Label>
                <Input 
                  id="formJahr" 
                  value={jahr} 
                  onChange={(e) => setJahr(e.target.value)} 
                  placeholder="z.B. 2023" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="formHausId">Haus *</Label>
                <Select value={haeuserId} onValueChange={setHaeuserId} required>
                  <SelectTrigger id="formHausId">
                    <SelectValue placeholder="Haus auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {haeuser.map((haus) => (
                      <SelectItem key={haus.id} value={haus.id}>
                        {haus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div> {/* Removed mb-4 as parent has space-y-4 */}
              <Label htmlFor="formWasserkosten">Wasserkosten (€)</Label>
              <Input
                id="formWasserkosten"
                type="number"
                value={wasserkosten}
                onChange={(e) => setWasserkosten(e.target.value)}
                placeholder="z.B. 500.00"
                step="0.01"
              />
            </div>

            {/* Kostenpositionen Section - Visually Grouped */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Kostenaufstellung</h3>
              <div className="rounded-md border p-4 space-y-0 shadow-sm"> {/* Changed space-y-4 to space-y-0 as items have their own padding now */}
                {costItems.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start gap-3 py-2 border-b last:border-b-0">
                    <div className="w-full sm:flex-[4_1_0%]">
                      <Input 
                        id={`art-${item.id}`} // Simplified ID
                        placeholder="Kostenart" 
                        value={item.art} 
                        onChange={(e) => handleCostItemChange(index, 'art', e.target.value)} 
                      />
                    </div>
                    <div className="w-full sm:flex-[3_1_0%]">
                      <Input 
                        id={`betrag-${item.id}`} // Simplified ID
                        type="number" 
                        placeholder="Betrag (€)" 
                        value={item.betrag} 
                        onChange={(e) => handleCostItemChange(index, 'betrag', e.target.value)}
                        step="0.01" 
                      />
                    </div>
                    <div className="w-full sm:flex-[4_1_0%]">
                      <Select 
                        value={item.berechnungsart} 
                        onValueChange={(value) => handleCostItemChange(index, 'berechnungsart', value as BerechnungsartValue)}
                      >
                        <SelectTrigger id={`berechnungsart-${item.id}`}> {/* Simplified ID */}
                          <SelectValue placeholder="Berechnungsart..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BERECHNUNGSART_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-none self-center sm:self-start pt-1 sm:pt-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeCostItem(index)} 
                        disabled={costItems.length <= 1}
                        aria-label="Kostenposition entfernen"
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={addCostItem} variant="outline" size="sm" className="mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Kostenposition hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
