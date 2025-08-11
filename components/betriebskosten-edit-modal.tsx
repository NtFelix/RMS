"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { formatNumber } from "@/utils/format";
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
import { Nebenkosten, Haus, Mieter, Wasserzaehler } from "../lib/data-fetching";
import { 
  getNebenkostenDetailsAction,
  createNebenkosten, 
  updateNebenkosten, 
  createRechnungenBatch, 
  RechnungData,
  deleteRechnungenByNebenkostenId,
  getPreviousWasserzaehlerRecordAction,
  saveWasserzaehlerData,
  getWasserzaehlerRecordsAction
} from "../app/betriebskosten-actions";
import { getMieterByHausIdAction } from "../app/mieter-actions"; 
import { useToast } from "../hooks/use-toast";
import { BERECHNUNGSART_OPTIONS, BerechnungsartValue } from "../lib/constants";
import { PlusCircle, Trash2 } from "lucide-react";
import { useModalStore } from "@/hooks/use-modal-store"; // Added import
import { LabelWithTooltip } from "./ui/label-with-tooltip";

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

interface WasserzaehlerEntry {
  id: string; // Temporary client-side ID
  mieter_id: string;
  ablese_datum: string;
  zaehlerstand: string;
  verbrauch: string;
  previous_reading: Wasserzaehler | null;
  warning?: string;
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
  const [wasserzaehlerEntries, setWasserzaehlerEntries] = useState<WasserzaehlerEntry[]>([]);
  const [isFetchingPreviousReadings, setIsFetchingPreviousReadings] = useState(false);

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


  // useEffect for Tenant and Wasserzaehler Data Fetching
  useEffect(() => {
    if (isBetriebskostenModalOpen && haeuserId && jahr) {
      const fetchTenantsAndReadings = async () => {
        setIsFetchingTenants(true);
        setIsFetchingPreviousReadings(true);
        setWasserzaehlerEntries([]);

        try {
          const tenantResponse = await getMieterByHausIdAction(haeuserId, jahr);
          if (!tenantResponse.success || !tenantResponse.data) {
            toast({ title: "Fehler beim Laden der Mieter", description: tenantResponse.error || "Unbekannter Fehler", variant: "destructive" });
            setSelectedHausMieter([]);
            setWasserzaehlerEntries([]);
            return;
          }

          setSelectedHausMieter(tenantResponse.data);

          const editId = betriebskostenInitialData?.id;
          let existingEntries: Wasserzaehler[] = [];
          if (editId) {
            const existingWasserzaehlerResponse = await getWasserzaehlerRecordsAction(editId);
            if (existingWasserzaehlerResponse.success && existingWasserzaehlerResponse.data) {
              existingEntries = existingWasserzaehlerResponse.data;
            }
          }

          const newEntriesPromises = tenantResponse.data.map(async (mieter) => {
            const previousReadingResponse = await getPreviousWasserzaehlerRecordAction(mieter.id);
            const existingEntry = existingEntries.find(e => e.mieter_id === mieter.id);

            return {
              id: generateId(),
              mieter_id: mieter.id,
              ablese_datum: existingEntry?.ablese_datum || '',
              zaehlerstand: existingEntry?.zaehlerstand?.toString() || '',
              verbrauch: existingEntry?.verbrauch?.toString() || '',
              previous_reading: previousReadingResponse.data || null,
              warning: '',
            };
          });

          const newEntries = await Promise.all(newEntriesPromises);
          setWasserzaehlerEntries(newEntries);

        } catch (error: any) {
          console.error("Error fetching tenants or readings:", error);
          toast({ title: "Systemfehler", description: "Daten für Mieter oder Zählerstände konnten nicht geladen werden.", variant: "destructive" });
          setSelectedHausMieter([]);
          setWasserzaehlerEntries([]);
        } finally {
          setIsFetchingTenants(false);
          setIsFetchingPreviousReadings(false);
        }
      };

      fetchTenantsAndReadings();
    } else if (!isBetriebskostenModalOpen || !haeuserId) {
      setSelectedHausMieter([]);
      setWasserzaehlerEntries([]);
      setIsFetchingTenants(false);
      setIsFetchingPreviousReadings(false);
    }
  }, [isBetriebskostenModalOpen, haeuserId, jahr, betriebskostenInitialData?.id, toast]);


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
        // Save Wasserzaehler data
        const wasserzaehlerDataToSave = {
          nebenkosten_id: nebenkosten_id,
          entries: wasserzaehlerEntries.filter(e => e.ablese_datum && e.zaehlerstand),
        };
        const wasserzaehlerResponse = await saveWasserzaehlerData(wasserzaehlerDataToSave);
        if (!wasserzaehlerResponse.success) {
          toast({ title: "Fehler beim Speichern der Zählerstände", description: wasserzaehlerResponse.message, variant: "destructive" });
        }

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
      toast({ title: "Betriebskosten erfolgreich gespeichert", description: "Die Hauptdaten der Betriebskosten und Zählerstände wurden gespeichert." });
      if (betriebskostenModalOnSuccess) betriebskostenModalOnSuccess();
      closeBetriebskostenModal();
    } else {
      toast({ title: "Fehler beim Speichern", description: response.message || "Ein unbekannter Fehler ist aufgetreten.", variant: "destructive" });
      setBetriebskostenModalDirty(true); // Save failed, mark as dirty
    }
    setIsSaving(false);
  };

  const handleWasserzaehlerChange = (index: number, field: keyof Omit<WasserzaehlerEntry, 'id' | 'mieter_id' | 'previous_reading'>, value: string) => {
    const newEntries = [...wasserzaehlerEntries];
    const entry = newEntries[index];
    (entry as any)[field] = value;

    if (field === 'zaehlerstand') {
      const currentReading = parseFloat(value);
      const previousReading = entry.previous_reading?.zaehlerstand;
      if (!isNaN(currentReading) && previousReading !== null && previousReading !== undefined) {
        const consumption = currentReading - previousReading;
        entry.verbrauch = consumption.toString();
        if (consumption < 0) {
          entry.warning = "Verbrauch ist negativ.";
        } else if (consumption > 1000) { // Example of a high value
          entry.warning = "Verbrauch ist ungewöhnlich hoch.";
        } else {
          entry.warning = '';
        }
      }
    }

    setWasserzaehlerEntries(newEntries);
    setBetriebskostenModalDirty(true);
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
              <div className="space-y-2">
                <LabelWithTooltip 
                  htmlFor="formJahr" 
                  infoText="Das Jahr, für das die Nebenkostenabrechnung gilt."
                >
                  Jahr *
                </LabelWithTooltip>
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
              <div className="space-y-2">
                <LabelWithTooltip 
                  htmlFor="formHausId" 
                  infoText="Wählen Sie das Haus aus, für das die Nebenkostenabrechnung erstellt wird."
                >
                  Haus *
                </LabelWithTooltip>
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

            <div className="space-y-2">
              <LabelWithTooltip 
                htmlFor="formWasserkosten" 
                infoText="Die gesamten Wasserkosten für das ausgewählte Haus in diesem Jahr."
              >
                Wasserkosten (€)
              </LabelWithTooltip>
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
                                              formatNumber(
                                                  (rechnungen[item.id] || [])
                                                      .reduce((sum, r) => sum + (parseFloat(r.betrag) || 0), 0)
                                              )
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

            {/* Wasserzähler Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Wasserzählerstände</h3>
              <div className="rounded-md border p-4 space-y-4 shadow-sm">
                {isFetchingTenants || isFetchingPreviousReadings ? (
                  <p>Lade Mieter und Zählerstände...</p>
                ) : wasserzaehlerEntries.length > 0 ? (
                  <div className="space-y-4">
                    {wasserzaehlerEntries.map((entry, index) => {
                      const mieter = selectedHausMieter.find(m => m.id === entry.mieter_id);
                      return (
                        <div key={entry.id} className="p-3 bg-gray-50 border rounded-md">
                          <p className="font-semibold">{mieter?.name}</p>
                          {entry.previous_reading ? (
                            <p className="text-sm text-gray-500">
                              Vorherige Ablesung: {new Date(entry.previous_reading.ablese_datum).toLocaleDateString()} - {entry.previous_reading.zaehlerstand}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">Keine vorherige Ablesung gefunden</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                            <div className="space-y-1">
                              <Label htmlFor={`ablesedatum-${entry.id}`}>Ablesedatum</Label>
                              <Input
                                id={`ablesedatum-${entry.id}`}
                                type="date"
                                value={entry.ablese_datum}
                                onChange={(e) => handleWasserzaehlerChange(index, 'ablese_datum', e.target.value)}
                                disabled={isSaving}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`zaehlerstand-${entry.id}`}>Zählerstand</Label>
                              <Input
                                id={`zaehlerstand-${entry.id}`}
                                type="number"
                                value={entry.zaehlerstand}
                                onChange={(e) => handleWasserzaehlerChange(index, 'zaehlerstand', e.target.value)}
                                disabled={isSaving}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`verbrauch-${entry.id}`}>Verbrauch</Label>
                              <Input
                                id={`verbrauch-${entry.id}`}
                                type="number"
                                value={entry.verbrauch}
                                onChange={(e) => handleWasserzaehlerChange(index, 'verbrauch', e.target.value)}
                                disabled={isSaving}
                              />
                            </div>
                          </div>
                          {entry.warning && <p className="text-sm text-red-500 mt-1">{entry.warning}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Für das ausgewählte Haus und Jahr wurden keine Mieter gefunden.
                  </p>
                )}
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
