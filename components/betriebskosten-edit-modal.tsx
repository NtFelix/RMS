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
import { Nebenkosten, Haus, Mieter } from "../lib/data-fetching"; // Removed fetchMieterByHausId
import { 
  createNebenkosten, 
  updateNebenkosten, 
  createRechnungenBatch, 
  RechnungData,
  deleteRechnungenByNebenkostenId
} from "../app/betriebskosten-actions";
import { getMieterByHausIdAction } from "../app/mieter-actions"; 
import { useToast } from "../hooks/use-toast";
import { BERECHNUNGSART_OPTIONS, BerechnungsartValue } from "../lib/constants";
import { PlusCircle, Trash2 } from "lucide-react";

interface CostItem {
  id: string; // For React key, temporary client-side ID
  art: string;
  betrag: string; // Keep as string for input binding
  berechnungsart: BerechnungsartValue | ''; // Use '' for unselected state
}

interface RechnungEinzel {
  mieterId: string;
  betrag: string;
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
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  // Part 1.1: Redefine rechnungen state
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);

  // Refs for tracking initial load and currently loaded Nebenkosten ID
  const initialLoadDoneForCurrentInstance = React.useRef(false);
  const currentlyLoadedNebenkostenId = React.useRef<string | null | undefined>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Part 1.3: Create handleRechnungChange function
  const handleRechnungChange = (costItemId: string, mieterId: string, newBetrag: string) => {
    setRechnungen(prevRechnungen => {
      const costItemRechnungen = prevRechnungen[costItemId] || selectedHausMieter.map(m => ({ mieterId: m.id, betrag: '' }));
      
      let mieterEntryExists = false;
      const updatedRechnungenForCostItem = costItemRechnungen.map(r => {
        if (r.mieterId === mieterId) {
          mieterEntryExists = true;
          return { ...r, betrag: newBetrag };
        }
        return r;
      });

      if (!mieterEntryExists) { // Should ideally not happen if initialized correctly
        updatedRechnungenForCostItem.push({ mieterId, betrag: newBetrag });
      }
      
      return {
        ...prevRechnungen,
        [costItemId]: updatedRechnungenForCostItem,
      };
    });
  };

  const handleCostItemChange = (
    index: number, 
    field: keyof Omit<CostItem, 'id'>, 
    value: string | BerechnungsartValue
  ) => {
    const newCostItems = [...costItems];
    const currentCostItem = newCostItems[index];
    const oldBerechnungsart = currentCostItem.berechnungsart;
    const costItemId = currentCostItem.id;

    (newCostItems[index] as any)[field] = value;

    // Part 3.7: Adjust rechnungen state when berechnungsart changes
    if (field === 'berechnungsart') {
      if (value === 'nach Rechnung') {
        newCostItems[index].betrag = ''; // Clear main betrag
        // Initialize rechnungen for this costItem if tenants are loaded
        setRechnungen(prevRechnungen => ({
          ...prevRechnungen,
          [costItemId]: selectedHausMieter.map(m => ({
            mieterId: m.id,
            betrag: prevRechnungen[costItemId]?.find(r => r.mieterId === m.id)?.betrag || '', // Preserve if already existed
          })),
        }));
      } else if (oldBerechnungsart === 'nach Rechnung' && value !== 'nach Rechnung') {
        // Clear rechnungen for this costItem if switching away from 'nach Rechnung'
        setRechnungen(prevRechnungen => {
          const updatedRechnungen = { ...prevRechnungen };
          delete updatedRechnungen[costItemId];
          return updatedRechnungen;
        });
      }
    }
    setCostItems(newCostItems);
  };
  
  const addCostItem = () => {
    const newId = generateId();
    // Default to the first option, or '' if no options
    const newBerechnungsart = BERECHNUNGSART_OPTIONS[0]?.value || ''; 
    const newCostItem: CostItem = { id: newId, art: '', betrag: '', berechnungsart: newBerechnungsart };
    
    setCostItems(prevCostItems => [...prevCostItems, newCostItem]);

    // The following block was removed as per instruction,
    // as the main useEffect hook [haeuserId, isOpen, toast, costItems]
    // is responsible for synchronizing the rechnungen state when costItems change.
    // if (newBerechnungsart === 'nach Rechnung') {
    //   setRechnungen(prevRechnungen => ({
    //     ...prevRechnungen,
    //     [newId]: selectedHausMieter.map(m => ({ mieterId: m.id, betrag: '' })),
    //   }));
    // }
  };

  const removeCostItem = (index: number) => {
    if (costItems.length <= 1) return;
    const itemToRemove = costItems[index];
    
    setCostItems(prevCostItems => prevCostItems.filter((_, i) => i !== index));

    // Part 3.8: Remove rechnungen entry if the removed item was 'nach Rechnung'
    if (itemToRemove.berechnungsart === 'nach Rechnung') {
      setRechnungen(prevRechnungen => {
        const updatedRechnungen = { ...prevRechnungen };
        delete updatedRechnungen[itemToRemove.id];
        return updatedRechnungen;
      });
    }
  };

  // Effect for initializing modal state when it opens or data changes
  useEffect(() => {
    if (isOpen) {
      const newNebenkostenId = nebenkostenToEdit?.id;
      const needsFullReset = !initialLoadDoneForCurrentInstance.current || newNebenkostenId !== currentlyLoadedNebenkostenId.current;

      if (needsFullReset) {
        console.log('[Modal Init Effect] Performing full reset or loading new/different Nebenkosten.');
        if (nebenkostenToEdit) {
          setJahr(nebenkostenToEdit.jahr || "");
          // Ensure haeuserId is set from nebenkostenToEdit if available, otherwise from haeuser list
          const initialHausId = nebenkostenToEdit.haeuser_id || (haeuser.length > 0 ? haeuser[0].id : "");
          setHaeuserId(initialHausId);
          setWasserkosten(nebenkostenToEdit.wasserkosten?.toString() || "");

          const existingCostItemsData: CostItem[] = (nebenkostenToEdit.nebenkostenart || []).map((art, idx) => ({
            id: generateId(),
            art: art,
            betrag: nebenkostenToEdit.berechnungsart?.[idx] === 'nach Rechnung' ? '' : nebenkostenToEdit.betrag?.[idx]?.toString() || "",
            berechnungsart: (BERECHNUNGSART_OPTIONS.find(opt => opt.value === nebenkostenToEdit.berechnungsart?.[idx])?.value as BerechnungsartValue) || '',
          }));
          setCostItems(existingCostItemsData.length > 0 ? existingCostItemsData : [{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
          // Rechnungen state will be synced by its own effect, triggered by costItems/nebenkostenToEdit change.
          // However, if switching between *different* nebenkostenToEdit items, explicitly reset rechnungen here for clarity.
          if (newNebenkostenId !== currentlyLoadedNebenkostenId.current) {
            setRechnungen({}); // Clear rechnungen for the new item to ensure fresh pre-population
          }

        } else {
          // Reset for new entry
          setJahr(new Date().getFullYear().toString());
          setHaeuserId(haeuser && haeuser.length > 0 ? haeuser[0].id : "");
          setWasserkosten("");
          setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
          setRechnungen({}); // Clear rechnungen for a new entry
        }
        currentlyLoadedNebenkostenId.current = newNebenkostenId;
        initialLoadDoneForCurrentInstance.current = true;
      } else {
        console.log('[Modal Init Effect] Skipping full reset, Nebenkosten ID is the same or already loaded.');
        // Potentially handle updates to `haeuser` prop if necessary, e.g., if current `haeuserId` becomes invalid.
        // For now, this logic is focused on preventing data loss for `nebenkostenToEdit`.
        if (haeuser && haeuserId && !haeuser.find(h => h.id === haeuserId)) {
          // If current selected hausId is no longer in the list of haeuser (e.g. due to external update)
          // set it to the first available, or clear it.
          setHaeuserId(haeuser.length > 0 ? haeuser[0].id : "");
        }
      }
    } else {
      // Modal is closed, reset all relevant states and refs
      setJahr("");
      setWasserkosten("");
      setHaeuserId(""); 
      setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      initialLoadDoneForCurrentInstance.current = false; // Reset for next open
      currentlyLoadedNebenkostenId.current = null;      // Reset for next open
    }
  }, [isOpen, nebenkostenToEdit, haeuser]); // Dependency array remains the same


  // New useEffect for Tenant Fetching
  useEffect(() => {
    if (isOpen && haeuserId) {
      const fetchTenants = async () => {
        setIsFetchingTenants(true);
        try {
          const actionResponse = await getMieterByHausIdAction(haeuserId);
          if (actionResponse.success && actionResponse.data) {
            setSelectedHausMieter(actionResponse.data);
          } else {
            const errorMessage = actionResponse.error || "Die Mieter für das ausgewählte Haus konnten nicht geladen werden.";
            toast({
              title: "Fehler beim Laden der Mieter",
              description: errorMessage,
              variant: "destructive",
            });
            setSelectedHausMieter([]);
          }
        } catch (error: any) { 
          console.error("Error calling getMieterByHausIdAction:", error);
          toast({
            title: "Systemfehler",
            description: "Ein unerwarteter Fehler ist beim Laden der Mieter aufgetreten.",
            variant: "destructive",
          });
          setSelectedHausMieter([]);
        } finally {
          setIsFetchingTenants(false);
        }
      };
      fetchTenants();
    } else if (!isOpen || !haeuserId) {
      // Clear tenants if modal is closed or no house is selected
      setSelectedHausMieter([]);
      setIsFetchingTenants(false); 
    }
  }, [haeuserId, isOpen, toast]); // This effect correctly handles tenant fetching


  // Modified useEffect for Rechnungen Synchronization
  const syncRechnungenState = (
    currentTenants: Mieter[], 
    currentCostItems: CostItem[],
    dbRechnungen?: Nebenkosten['Rechnungen'] | null
  ) => {
    setRechnungen(prevRechnungen => {
      const newRechnungenState: Record<string, RechnungEinzel[]> = {};
      currentCostItems.forEach(costItem => {
        if (costItem.berechnungsart === 'nach Rechnung') {
          newRechnungenState[costItem.id] = currentTenants.map(tenant => {
            const dbRechnungForTenant = dbRechnungen?.find(dbR => dbR.mieter_id === tenant.id && dbR.name.includes(costItem.art)); // Simple check if name includes costItem.art
            const existingEntryInState = (prevRechnungen[costItem.id] || []).find(r => r.mieterId === tenant.id);
            
            // Prioritize DB data if available for the specific cost item and tenant
            // This assumes dbRechnungForTenant.name contains enough info to link to costItem.art
            // A more robust solution would be a direct link (e.g. cost_item_art_or_id in Rechnungen table)
            let betragToSet = existingEntryInState?.betrag || ''; // Default to existing state or empty
            if (dbRechnungForTenant) {
                betragToSet = dbRechnungForTenant.betrag.toString();
            }

            return {
              mieterId: tenant.id,
              betrag: betragToSet,
            };
          });
        }
      });
      return newRechnungenState;
    });
  };

  useEffect(() => {
    if (isOpen) {
      // This effect now reacts to changes in selectedHausMieter (from tenant fetching effect),
      // costItems (from user interaction or initial load), and nebenkostenToEdit (for dbRechnungen).
      syncRechnungenState(selectedHausMieter, costItems, nebenkostenToEdit?.Rechnungen);
    } else {
      // Clear rechnungen when modal is not open
      // The main initialization effect also handles clearing rechnungen when isOpen becomes false.
      // setRechnungen({}); // This line might be redundant if the main init effect handles it.
                         // Keeping it for safety or if the main init effect's !isOpen logic changes.
                         // Re-evaluating: The main init effect's !isOpen block *does* clear rechnungen.
                         // So this specific setRechnungen({}) here is likely redundant.
                         // However, syncRechnungenState with empty tenants would also result in empty rechnungen for "nach Rechnung" items.
                         // Let's rely on the main init effect's !isOpen block for a full clear.
                         // This effect should primarily focus on SYNCING when isOpen is true.
    }
  // Dependencies for rechnungen synchronization
  }, [selectedHausMieter, costItems, nebenkostenToEdit, isOpen]); 
  // Removed toast, as syncRechnungenState does not use it.
  // The main init effect handles full reset on !isOpen.

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
      const berechnungsart = item.berechnungsart;
      let currentBetragValue: number;

      if (!art) {
        toast({ title: "Validierungsfehler", description: `Art der Kosten darf nicht leer sein. Bitte überprüfen Sie Posten ${costItems.indexOf(item) + 1}.`, variant: "destructive" });
        setIsSaving(false);
        return;
      }
      if (!berechnungsart) { 
        toast({ title: "Validierungsfehler", description: `Berechnungsart muss für Kostenart "${art}" ausgewählt werden.`, variant: "destructive" });
        setIsSaving(false);
        return;
      }

      if (item.berechnungsart === 'nach Rechnung') {
        const individualRechnungen = rechnungen[item.id] || [];
        currentBetragValue = individualRechnungen.reduce((sum, r) => sum + (parseFloat(r.betrag) || 0), 0);
        // Additional validation for individual rechnungen amounts (e.g. all must be valid numbers) can be added here if needed
        // For now, we rely on parseFloat turning invalid numbers to 0 or NaN (which || 0 handles)
      } else {
        currentBetragValue = parseFloat(item.betrag);
        if (item.betrag.trim() === '' || isNaN(currentBetragValue)) {
          toast({ title: "Validierungsfehler", description: `Betrag "${item.betrag}" ist keine gültige Zahl für Kostenart "${art}".`, variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      nebenkostenartArray.push(art);
      betragArray.push(currentBetragValue); // Push the determined betrag value
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
      const nebenkosten_id = nebenkostenToEdit?.id || response.data?.id;

      if (nebenkosten_id) {
        console.log('Nebenkosten ID:', nebenkosten_id); 
        
        // If editing, first delete existing Rechnungen for this Nebenkosten entry
        if (nebenkostenToEdit) {
          console.log('[Edit Mode] Deleting existing Rechnungen for Nebenkosten ID:', nebenkosten_id);
          const deleteResponse = await deleteRechnungenByNebenkostenId(nebenkosten_id);
          if (!deleteResponse.success) {
            toast({
              title: "Fehler beim Aktualisieren der Einzelrechnungen",
              description: `Die alten Einzelrechnungen konnten nicht gelöscht werden. Neue Rechnungen wurden nicht erstellt. Fehler: ${deleteResponse.message || "Unbekannter Fehler."}`,
              variant: "destructive",
            });
            setIsSaving(false);
            return; // Stop processing to prevent inconsistent data
          }
          console.log('[Edit Mode] Successfully deleted old Rechnungen.');
        }

        const rechnungenToSave: RechnungData[] = [];
        costItems.forEach(item => {
          if (item.berechnungsart === 'nach Rechnung') {
            const individualRechnungen = rechnungen[item.id] || [];
            individualRechnungen.forEach(rechnungEinzel => {
              const parsedAmount = parseFloat(rechnungEinzel.betrag);
              if (!isNaN(parsedAmount)) { // Changed condition to include 0 amounts
                // Find mieter name (optional, can be done in server action too if preferred)
                const mieterName = selectedHausMieter.find(m => m.id === rechnungEinzel.mieterId)?.name || rechnungEinzel.mieterId;
                
                rechnungenToSave.push({
                  nebenkosten_id: nebenkosten_id,
                  mieter_id: rechnungEinzel.mieterId,
                  betrag: parsedAmount,
                  name: `Rechnung für ${item.art || 'Unbenannte Kostenart'} - Mieter ${mieterName} - ${jahr}`,
                });
              }
            });
          }
        });

        console.log('Rechnungen to Save:', JSON.stringify(rechnungenToSave, null, 2)); // Added console.log

        if (rechnungenToSave.length > 0) {
          console.log('Calling createRechnungenBatch with rechnungenToSave'); // Added console.log
          const rechnungenSaveResponse = await createRechnungenBatch(rechnungenToSave);
          if (!rechnungenSaveResponse.success) {
            toast({ 
              title: "Fehler beim Speichern der Einzelrechnungen", 
              description: rechnungenSaveResponse.message || "Ein unbekannter Fehler ist aufgetreten.", 
              variant: "destructive" 
            });
            // Main data was saved, but individual invoices failed. User is informed.
            // onClose() will still be called.
          } else {
            // Both main data and individual invoices were saved successfully.
            toast({
              title: "Erfolgreich gespeichert",
              description: "Die Betriebskosten und alle zugehörigen Einzelrechnungen wurden erfolgreich gespeichert.",
            });
            onClose();
            return; // Exit early as we've shown the comprehensive success toast
          }
        } else {
          console.log('No Rechnungen to save.'); // Added console.log for else case
        }
      }

      // This toast is shown if no individual rechnungen needed saving, or if they failed (user already informed by specific error toast)
      toast({
        title: "Betriebskosten erfolgreich gespeichert",
        description: "Die Hauptdaten der Betriebskosten wurden gespeichert.",
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
      <DialogContent className="max-w-4xl"> {/* Changed max-w-3xl to max-w-4xl */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>
              {nebenkostenToEdit ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              Füllen Sie die Details für die Betriebskostenabrechnung aus.
            </DialogDescription>
          </DialogHeader>
          
          {/* Adjusted padding from pr-2 py-1 to p-4 for better spacing around focus rings */}
          <div className="space-y-4 overflow-y-auto max-h-[70vh] p-4"> 
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
                  <div key={item.id} className="flex flex-col gap-3 py-2 border-b last:border-b-0"> {/* Main container for a cost item row */}
                    <div className="flex flex-col sm:flex-row items-start gap-3"> {/* Inputs row */}
                      <div className="w-full sm:flex-[4_1_0%]">
                        <Input 
                          id={`art-${item.id}`}
                          placeholder="Kostenart" 
                          value={item.art} 
                          onChange={(e) => handleCostItemChange(index, 'art', e.target.value)} 
                        />
                      </div>
                      <div className="w-full sm:flex-[3_1_0%]">
                        {item.berechnungsart === 'nach Rechnung' ? (
                          <div className="flex items-center justify-center h-10 px-3 py-2 text-sm text-muted-foreground bg-gray-50 border rounded-md">
                            Beträge pro Mieter unten
                          </div>
                        ) : (
                          <Input 
                            id={`betrag-${item.id}`}
                            type="number" 
                            placeholder="Betrag (€)" 
                            value={item.betrag} 
                            onChange={(e) => handleCostItemChange(index, 'betrag', e.target.value)}
                            step="0.01"
                          />
                        )}
                      </div>
                      <div className="w-full sm:flex-[4_1_0%]">
                        <Select 
                          value={item.berechnungsart} 
                          onValueChange={(value) => handleCostItemChange(index, 'berechnungsart', value as BerechnungsartValue)}
                        >
                          <SelectTrigger id={`berechnungsart-${item.id}`}>
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
                    {/* Part 2.4 & 2.5: Replace placeholder with tenant invoice inputs */}
                    {item.berechnungsart === 'nach Rechnung' && (
                      <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3 shadow-sm">
                        <h4 className="text-md font-semibold text-gray-700">
                          Einzelbeträge für: <span className="font-normal italic">"{item.art || 'Unbenannte Kostenart'}"</span>
                        </h4>
                        {isFetchingTenants && <p className="text-sm text-gray-500">Lade Mieterdetails...</p>}
                        {!isFetchingTenants && !haeuserId && (
                          <p className="text-sm text-orange-600 p-2 bg-orange-50 border border-orange-200 rounded-md">Bitte wählen Sie zuerst ein Haus aus, um Mieter zu laden.</p>
                        )}
                        {!isFetchingTenants && haeuserId && selectedHausMieter.length === 0 && (
                          <p className="text-sm text-orange-600 p-2 bg-orange-50 border border-orange-200 rounded-md">Für das ausgewählte Haus wurden keine Mieter gefunden oder es sind keine Mieter dem Haus direkt zugeordnet.</p>
                        )}
                        {!isFetchingTenants && haeuserId && selectedHausMieter.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {selectedHausMieter.map(mieter => {
                              const rechnungForMieter = (rechnungen[item.id] || []).find(r => r.mieterId === mieter.id);
                              return (
                                <div key={mieter.id} className="grid grid-cols-10 gap-2 items-center py-1 border-b border-gray-100 last:border-b-0">
                                  <Label htmlFor={`rechnung-${item.id}-${mieter.id}`} className="col-span-6 sm:col-span-7 truncate text-sm" title={mieter.name}>
                                    {mieter.name}
                                  </Label>
                                  <div className="col-span-4 sm:col-span-3">
                                    <Input
                                      id={`rechnung-${item.id}-${mieter.id}`}
                                      type="number"
                                      step="0.01"
                                      placeholder="Betrag (€)"
                                      value={rechnungForMieter?.betrag || ''}
                                      onChange={(e) => handleRechnungChange(item.id, mieter.id, e.target.value)}
                                      className="w-full text-sm"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                         {/* Display sum of individual invoices */}
                         {item.berechnungsart === 'nach Rechnung' && rechnungen[item.id] && selectedHausMieter.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-gray-300 flex justify-end">
                                <p className="text-sm font-semibold text-gray-700">
                                    Summe Einzelbeträge: {
                                        (rechnungen[item.id] || [])
                                            .reduce((sum, r) => sum + (parseFloat(r.betrag) || 0), 0)
                                            .toFixed(2)
                                    } €
                                </p>
                            </div>
                        )}
                      </div>
                    )}
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
