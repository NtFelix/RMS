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
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton
import { Nebenkosten, Haus, Mieter } from "../lib/data-fetching";
import { 
  getNebenkostenDetailsAction, // Added getNebenkostenDetailsAction
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
import { useModalStore } from "@/hooks/use-modal-store"; // Added import

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
  nebenkostenToEdit?: Nebenkosten | { id: string } | null | undefined; // Updated prop type
  haeuser: Haus[];
  userId: string; // userId might not be needed if RLS is fully relied upon for mutations
}

interface BetriebskostenEditModalPropsRefactored {
  // All props like isOpen, onClose, nebenkostenToEdit, haeuser will be removed
  // and sourced from the useModalStore.
  // We might keep `userId` if it's truly essential and not derivable elsewhere,
  // but the comment suggests it might be removed. For now, let's assume it's not needed.
}


export function BetriebskostenEditModal({/* Props are now from store */ }: BetriebskostenEditModalPropsRefactored) {
  const {
    isBetriebskostenModalOpen,
    closeBetriebskostenModal,
    betriebskostenInitialData,
    betriebskostenModalHaeuser,
    betriebskostenModalOnSuccess,
    isBetriebskostenModalDirty,
    setBetriebskostenModalDirty,
    openConfirmationModal,
  } = useModalStore();

  const [jahr, setJahr] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [haeuserId, setHaeuserId] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);

  const houseOptions: ComboboxOption[] = (betriebskostenModalHaeuser || []).map(h => ({ value: h.id, label: h.name }));

  // New states for details loading
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalNebenkostenData, setModalNebenkostenData] = useState<Nebenkosten | null>(null);

  // Ref for tracking currently loaded Nebenkosten ID to avoid redundant fetches/re-initializations
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

      if (!mieterEntryExists) {
        updatedRechnungenForCostItem.push({ mieterId, betrag: newBetrag });
      }
      
      return {
        ...prevRechnungen,
        [costItemId]: updatedRechnungenForCostItem,
      };
    });
    setBetriebskostenModalDirty(true);
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

    if (field === 'berechnungsart') {
      if (value === 'nach Rechnung') {
        newCostItems[index].betrag = '';
        setRechnungen(prevRechnungen => ({
          ...prevRechnungen,
          [costItemId]: selectedHausMieter.map(m => ({
            mieterId: m.id,
            betrag: prevRechnungen[costItemId]?.find(r => r.mieterId === m.id)?.betrag || '',
          })),
        }));
      } else if (oldBerechnungsart === 'nach Rechnung' && value !== 'nach Rechnung') {
        setRechnungen(prevRechnungen => {
          const updatedRechnungen = { ...prevRechnungen };
          delete updatedRechnungen[costItemId];
          return updatedRechnungen;
        });
      }
    }
    setCostItems(newCostItems);
    setBetriebskostenModalDirty(true);
  };
  
  const addCostItem = () => {
    const newId = generateId();
    const newBerechnungsart = BERECHNUNGSART_OPTIONS[0]?.value || ''; 
    const newCostItem: CostItem = { id: newId, art: '', betrag: '', berechnungsart: newBerechnungsart };
    
    setCostItems(prevCostItems => [...prevCostItems, newCostItem]);
    setBetriebskostenModalDirty(true);
  };

  const removeCostItem = (index: number) => {
    if (costItems.length <= 1) return;
    const itemToRemove = costItems[index];
    
    setCostItems(prevCostItems => prevCostItems.filter((_, i) => i !== index));

    if (itemToRemove.berechnungsart === 'nach Rechnung') {
      setRechnungen(prevRechnungen => {
        const updatedRechnungen = { ...prevRechnungen };
        delete updatedRechnungen[itemToRemove.id];
        return updatedRechnungen;
      });
    }
    setBetriebskostenModalDirty(true);
  };

  const attemptClose = () => {
    closeBetriebskostenModal(); // Store handles confirmation for outside click/X
  };

  const handleCancelClick = () => {
    closeBetriebskostenModal({ force: true }); // Force close for "Abbrechen" button
  };

  // Main useEffect for Data Fetching and Initialization
  useEffect(() => {
    const resetAllStates = (forNewEntry: boolean = true) => {
      setJahr(forNewEntry ? new Date().getFullYear().toString() : "");
      setWasserkosten("");
      setHaeuserId(forNewEntry && betriebskostenModalHaeuser && betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "");
      setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      // Do not reset isLoadingDetails here as it's controlled by the fetch logic
      setModalNebenkostenData(null);
      currentlyLoadedNebenkostenId.current = null;
      if (isBetriebskostenModalOpen) setBetriebskostenModalDirty(false); // Reset dirty state when modal opens/data loads
    };

    if (isBetriebskostenModalOpen) {
      const editId = betriebskostenInitialData?.id;

      if (editId && editId !== currentlyLoadedNebenkostenId.current) {
        setIsLoadingDetails(true);
        resetAllStates(false); // Reset states, but not to "new entry" defaults yet
        setModalNebenkostenData(null);
        setCostItems([]); // Show skeleton for cost items
        setRechnungen({});

        getNebenkostenDetailsAction(editId)
          .then(response => {
            if (response.success && response.data) {
              const fetchedData = response.data;
              setModalNebenkostenData(fetchedData);
              setJahr(fetchedData.jahr || "");
              setHaeuserId(fetchedData.haeuser_id || (betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : ""));
              setWasserkosten(fetchedData.wasserkosten?.toString() || "");

              const newCostItems: CostItem[] = (fetchedData.nebenkostenart || []).map((art, idx) => ({
                id: generateId(),
                art: art,
                betrag: fetchedData.berechnungsart?.[idx] === 'nach Rechnung' ? '' : fetchedData.betrag?.[idx]?.toString() || "",
                berechnungsart: (BERECHNUNGSART_OPTIONS.find(opt => opt.value === fetchedData.berechnungsart?.[idx])?.value as BerechnungsartValue) || '',
              }));
              setCostItems(newCostItems.length > 0 ? newCostItems : [{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
              setBetriebskostenModalDirty(false); // Data loaded, not dirty yet
            } else {
              toast({
                title: "Fehler beim Laden der Details",
                description: response.message || "Die Nebenkostendetails konnten nicht geladen werden. Das Fenster wird geschlossen.",
                variant: "destructive",
              });
              setModalNebenkostenData(null);
              attemptClose();
            }
          })
          .catch(error => {
            toast({
              title: "Systemfehler",
              description: "Ein unerwarteter Fehler ist beim Laden der Nebenkostendetails aufgetreten. Das Fenster wird geschlossen.",
              variant: "destructive",
            });
            setModalNebenkostenData(null);
            if (editId) {
              attemptClose();
            }
          })
          .finally(() => {
            setIsLoadingDetails(false);
            currentlyLoadedNebenkostenId.current = editId;
          });
      } else if (!editId) {
        resetAllStates(true); // Creating a new entry
        setIsLoadingDetails(false);
        currentlyLoadedNebenkostenId.current = null;
        setBetriebskostenModalDirty(false);
      } else { // Modal reopened for the same item
        if (modalNebenkostenData && haeuserId && !(betriebskostenModalHaeuser || []).find(h => h.id === haeuserId)) {
           setHaeuserId(betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "");
           setBetriebskostenModalDirty(true); // Haus selection changed due to available list, consider dirty
        }
        // Reset dirty state if modal is just reopened without data change
        if (!isBetriebskostenModalDirty) setBetriebskostenModalDirty(false);
      }
    } else {
      resetAllStates(false); // Modal is closed
    }
  }, [isBetriebskostenModalOpen, betriebskostenInitialData, betriebskostenModalHaeuser, toast, setBetriebskostenModalDirty]);


  // New useEffect for Tenant Fetching
  useEffect(() => {
    if (isBetriebskostenModalOpen && haeuserId && jahr) { // Ensure jahr is also present
      const fetchTenants = async () => {
        setIsFetchingTenants(true);
        try {
          const actionResponse = await getMieterByHausIdAction(haeuserId, jahr);
          if (actionResponse.success && actionResponse.data) {
            setSelectedHausMieter(actionResponse.data);
            // Potentially set dirty if tenant list change affects calculations for "nach Rechnung"
            // This is complex, for now, direct user changes to amounts will set dirty flag.
          } else {
            const errorMessage = actionResponse.error || "Die Mieter für das ausgewählte Haus konnten nicht geladen werden.";
            toast({ title: "Fehler beim Laden der Mieter", description: errorMessage, variant: "destructive" });
            setSelectedHausMieter([]);
          }
        } catch (error: any) { 
          console.error("Error calling getMieterByHausIdAction:", error);
          toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist beim Laden der Mieter aufgetreten.", variant: "destructive" });
          setSelectedHausMieter([]);
        } finally {
          setIsFetchingTenants(false);
        }
      };
      fetchTenants();
    } else if (!isBetriebskostenModalOpen || !haeuserId) {
      setSelectedHausMieter([]);
      setIsFetchingTenants(false); 
    }
  }, [haeuserId, isBetriebskostenModalOpen, toast, jahr, setBetriebskostenModalDirty]); // Added setBetriebskostenModalDirty


  // Modified useEffect for Rechnungen Synchronization
  const syncRechnungenState = (
    currentTenants: Mieter[], 
    currentCostItems: CostItem[],
  ) => {
    setRechnungen(prevRechnungen => {
      const newRechnungenState: Record<string, RechnungEinzel[]> = {};
      const dbRechnungenSource = modalNebenkostenData?.Rechnungen;

      currentCostItems.forEach(costItem => {
        if (costItem.berechnungsart === 'nach Rechnung') {
          newRechnungenState[costItem.id] = currentTenants.map(tenant => {
            const dbRechnungForTenant = dbRechnungenSource?.find(
              dbR => dbR.mieter_id === tenant.id && dbR.name === costItem.art
            );
            const existingEntryInState = (prevRechnungen[costItem.id] || []).find(r => r.mieterId === tenant.id);
            
            let betragToSet = '';
            if (dbRechnungForTenant) {
              betragToSet = dbRechnungForTenant.betrag.toString();
            } else if (existingEntryInState) {
              betragToSet = existingEntryInState.betrag;
            }
            return { mieterId: tenant.id, betrag: betragToSet };
          });
        }
      });
      return newRechnungenState;
    });
    // Do not set dirty here, this is data sync. User actions will set dirty.
  };

  useEffect(() => {
    if (isBetriebskostenModalOpen && !isLoadingDetails) {
      syncRechnungenState(selectedHausMieter, costItems);
    }
  }, [selectedHausMieter, costItems, modalNebenkostenData, isBetriebskostenModalOpen, isLoadingDetails]);


  const handleSubmit = async () => {
    setIsSaving(true);
    setBetriebskostenModalDirty(false); // Assume save will succeed or fail, reset dirty state preemptively

    const currentEditId = modalNebenkostenData?.id || betriebskostenInitialData?.id;

    if (!jahr || !haeuserId) {
      toast({ title: "Fehlende Eingaben", description: "Jahr und Haus sind Pflichtfelder.", variant: "destructive" });
      setIsSaving(false); setBetriebskostenModalDirty(true); // Save failed, it's dirty again
      return;
    }
    
    const parsedWasserkosten = wasserkosten ? parseFloat(wasserkosten) : null;
    if (wasserkosten.trim() !== '' && isNaN(parsedWasserkosten as number)) {
      toast({ title: "Ungültige Eingabe", description: "Wasserkosten müssen eine gültige Zahl sein.", variant: "destructive" });
      setIsSaving(false); setBetriebskostenModalDirty(true);
      return;
    }

    if (costItems.length === 0) {
        toast({ title: "Validierungsfehler", description: "Mindestens ein Kostenpunkt muss hinzugefügt werden.", variant: "destructive" });
        setIsSaving(false); setBetriebskostenModalDirty(true);
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
        setIsSaving(false); setBetriebskostenModalDirty(true);
        return;
      }
      if (!berechnungsart) { 
        toast({ title: "Validierungsfehler", description: `Berechnungsart muss für Kostenart "${art}" ausgewählt werden.`, variant: "destructive" });
        setIsSaving(false); setBetriebskostenModalDirty(true);
        return;
      }

      if (item.berechnungsart === 'nach Rechnung') {
        const individualRechnungen = rechnungen[item.id] || [];
        currentBetragValue = individualRechnungen.reduce((sum, r) => sum + (parseFloat(r.betrag) || 0), 0);
      } else {
        currentBetragValue = parseFloat(item.betrag);
        if (item.betrag.trim() === '' || isNaN(currentBetragValue)) {
          toast({ title: "Validierungsfehler", description: `Betrag "${item.betrag}" ist keine gültige Zahl für Kostenart "${art}".`, variant: "destructive" });
          setIsSaving(false); setBetriebskostenModalDirty(true);
          return;
        }
      }
      nebenkostenartArray.push(art);
      betragArray.push(currentBetragValue);
      berechnungsartArray.push(berechnungsart);
    }

    const submissionData = {
      jahr: jahr.trim(),
      nebenkostenart: nebenkostenartArray,
      betrag: betragArray,
      berechnungsart: berechnungsartArray,
      wasserkosten: parsedWasserkosten,
      haeuser_id: haeuserId,
    };

    let response;
    if (currentEditId) {
      response = await updateNebenkosten(currentEditId, submissionData);
    } else {
      response = await createNebenkosten(submissionData);
    }

    if (response.success) {
      const nebenkosten_id = currentEditId || response.data?.id;
      if (nebenkosten_id) {
        if (currentEditId) {
          const deleteResponse = await deleteRechnungenByNebenkostenId(nebenkosten_id);
          if (!deleteResponse.success) {
            toast({ title: "Fehler beim Aktualisieren der Einzelrechnungen", description: `Die alten Einzelrechnungen konnten nicht gelöscht werden. Neue Rechnungen wurden nicht erstellt. Fehler: ${deleteResponse.message || "Unbekannter Fehler."}`, variant: "destructive" });
            setIsSaving(false); /* Don't set dirty here, main save was ok */ return;
          }
        }

        const rechnungenToSave: RechnungData[] = [];
        costItems.forEach(item => {
          if (item.berechnungsart === 'nach Rechnung') {
            const individualRechnungen = rechnungen[item.id] || [];
            individualRechnungen.forEach(rechnungEinzel => {
              const parsedAmount = parseFloat(rechnungEinzel.betrag);
              if (!isNaN(parsedAmount)) {
                rechnungenToSave.push({
                  nebenkosten_id: nebenkosten_id,
                  mieter_id: rechnungEinzel.mieterId,
                  betrag: parsedAmount,
                  name: item.art,
                });
              }
            });
          }
        });

        if (rechnungenToSave.length > 0) {
          const rechnungenSaveResponse = await createRechnungenBatch(rechnungenToSave);
          if (!rechnungenSaveResponse.success) {
            toast({ title: "Fehler beim Speichern der Einzelrechnungen", description: rechnungenSaveResponse.message || "Ein unbekannter Fehler ist aufgetreten.", variant: "destructive" });
          } else {
            toast({ title: "Erfolgreich gespeichert", description: "Die Betriebskosten und alle zugehörigen Einzelrechnungen wurden erfolgreich gespeichert." });
            if (betriebskostenModalOnSuccess) betriebskostenModalOnSuccess();
            closeBetriebskostenModal(); // Will close directly as dirty is false
            setIsSaving(false);
            return;
          }
        }
      }
      toast({ title: "Betriebskosten erfolgreich gespeichert", description: "Die Hauptdaten der Betriebskosten wurden gespeichert." });
      if (betriebskostenModalOnSuccess) betriebskostenModalOnSuccess();
      closeBetriebskostenModal(); // Will close directly as dirty is false
    } else {
      toast({ title: "Fehler beim Speichern", description: response.message || "Ein unbekannter Fehler ist aufgetreten.", variant: "destructive" });
      setBetriebskostenModalDirty(true); // Save failed, mark as dirty
    }
    setIsSaving(false);
  };

  // Handle input changes to set dirty flag
  const handleJahrChange = (e: React.ChangeEvent<HTMLInputElement>) => { setJahr(e.target.value); setBetriebskostenModalDirty(true); };
  const handleWasserkostenChange = (e: React.ChangeEvent<HTMLInputElement>) => { setWasserkosten(e.target.value); setBetriebskostenModalDirty(true); };
  const handleHausChange = (value: string | null) => { setHaeuserId(value || ""); setBetriebskostenModalDirty(true); };


  if (!isBetriebskostenModalOpen) {
    return null;
  }

  return (
    <Dialog open={isBetriebskostenModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        className="max-w-4xl"
        isDirty={isBetriebskostenModalDirty}
        onAttemptClose={attemptClose}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>
              {betriebskostenInitialData?.id || modalNebenkostenData?.id ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              {isLoadingDetails ? "Lade Details..." : "Füllen Sie die Details für die Betriebskostenabrechnung aus."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[70vh] p-4"> 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formJahr">Jahr *</Label>
                {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                  <Input
                    id="formJahr"
                    value={jahr}
                    onChange={handleJahrChange}
                    placeholder="z.B. 2023"
                    required
                    disabled={isSaving}
                  />
                )}
              </div>
              <div>
                <Label htmlFor="formHausId">Haus *</Label>
                {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                  <CustomCombobox
                    width="w-full"
                    options={houseOptions}
                    value={haeuserId}
                    onChange={handleHausChange}
                    placeholder="Haus auswählen..."
                    searchPlaceholder="Haus suchen..."
                    emptyText="Kein Haus gefunden."
                    disabled={isSaving}
                  />
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="formWasserkosten">Wasserkosten (€)</Label>
              {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                <Input
                  id="formWasserkosten"
                  type="number"
                  value={wasserkosten}
                  onChange={handleWasserkostenChange}
                  placeholder="z.B. 500.00"
                  step="0.01"
                  disabled={isSaving}
                />
              )}
            </div>

            {/* Kostenpositionen Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Kostenaufstellung</h3>
              <div className="rounded-md border p-4 space-y-0 shadow-sm">
                {isLoadingDetails && (betriebskostenInitialData?.id || modalNebenkostenData?.id) ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`skel-cost-${idx}`} className="flex flex-col gap-3 py-2 border-b last:border-b-0">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <Skeleton className="h-10 w-full sm:flex-[4_1_0%]" />
                        <Skeleton className="h-10 w-full sm:flex-[3_1_0%]" />
                        <Skeleton className="h-10 w-full sm:flex-[4_1_0%]" />
                        <Skeleton className="h-10 w-10 flex-none self-center sm:self-start" />
                      </div>
                    </div>
                  ))
                ) : (
                  costItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 py-2 border-b last:border-b-0"
                      role="group"
                      aria-label={`Kostenposition ${index + 1}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="w-full sm:flex-[4_1_0%]">
                          <Input 
                            id={`art-${item.id}`}
                            placeholder="Kostenart"
                            value={item.art}
                            onChange={(e) => handleCostItemChange(index, 'art', e.target.value)}
                            disabled={isSaving}
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
                              disabled={isSaving}
                            />
                          )}
                        </div>
                        <div className="w-full sm:flex-[4_1_0%]">
                          <Select
                            value={item.berechnungsart}
                            onValueChange={(value) => handleCostItemChange(index, 'berechnungsart', value as BerechnungsartValue)}
                            disabled={isSaving}
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
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCostItem(index)}
                            disabled={costItems.length <= 1 || isLoadingDetails || isSaving}
                            aria-label="Kostenposition entfernen"
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {item.berechnungsart === 'nach Rechnung' && (
                        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3 shadow-sm">
                          <h4 className="text-md font-semibold text-gray-700">
                            Einzelbeträge für: <span className="font-normal italic">"{item.art || 'Unbenannte Kostenart'}"</span>
                          </h4>
                          {(isLoadingDetails || isFetchingTenants) && (!selectedHausMieter || selectedHausMieter.length === 0) ? (
                              Array.from({ length: 3 }).map((_, skelIdx) => (
                                <div key={`skel-tenant-${skelIdx}`} className="grid grid-cols-10 gap-2 items-center py-1">
                                  <Skeleton className="h-8 w-full col-span-6 sm:col-span-7" />
                                  <Skeleton className="h-8 w-full col-span-4 sm:col-span-3" />
                                </div>
                              ))
                          ) : (
                            <>
                              {!isFetchingTenants && !haeuserId && (
                                <p className="text-sm text-orange-600 p-2 bg-orange-50 border border-orange-200 rounded-md">Bitte wählen Sie zuerst ein Haus aus, um Mieter zu laden.</p>
                              )}
                              {!isFetchingTenants && haeuserId && selectedHausMieter.length === 0 && !isLoadingDetails && (
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
                                            disabled={isLoadingDetails || isSaving}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {item.berechnungsart === 'nach Rechnung' && rechnungen[item.id] && selectedHausMieter.length > 0 && !isLoadingDetails && (
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
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  onClick={addCostItem}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={isLoadingDetails || isSaving}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Kostenposition hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSaving || isLoadingDetails}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingDetails}>
              {isSaving ? "Speichern..." : (isLoadingDetails ? "Laden..." : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
