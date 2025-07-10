"use client";

import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog"; // Added
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea"; // Was unused, keeping it commented
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

export function BetriebskostenEditModal({
  isOpen,
  onClose,
  nebenkostenToEdit,
  haeuser,
  // userId, // userId removed from props if not directly used for mutations here
}: BetriebskostenEditModalProps) {
  const [jahr, setJahr] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [haeuserId, setHaeuserId] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);
  const [showConfirmDiscardModal, setShowConfirmDiscardModal] = useState(false);

  // States for dirty checking
  const [initialJahr, setInitialJahr] = useState("");
  const [initialWasserkosten, setInitialWasserkosten] = useState("");
  const [initialHaeuserId, setInitialHaeuserId] = useState("");
  const [initialCostItems, setInitialCostItems] = useState<CostItem[]>([]);
  const [initialRechnungen, setInitialRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const initialRechnungenLoaded = React.useRef(false);


  const houseOptions: ComboboxOption[] = haeuser.map(h => ({ value: h.id, label: h.name }));

  // New states for details loading
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalNebenkostenData, setModalNebenkostenData] = useState<Nebenkosten | null>(null);

  // Ref for tracking currently loaded Nebenkosten ID to avoid redundant fetches/re-initializations
  const currentlyLoadedNebenkostenId = React.useRef<string | null | undefined>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const isCostItemsDirty = (currentItems: CostItem[], initialItems: CostItem[]): boolean => {
    if (currentItems.length !== initialItems.length) return true;
    for (let i = 0; i < currentItems.length; i++) {
      const current = currentItems[i];
      // Attempt to find by ID, but if initial item doesn't have a stable ID matching current, consider it dirty.
      // This handles newly added items not present in initialCostItems.
      const initial = initialItems.find(item => item.id === current.id);
      if (!initial) return true;
      if (current.art !== initial.art ||
          current.betrag !== initial.betrag ||
          current.berechnungsart !== initial.berechnungsart) {
        return true;
      }
    }
    return false;
  };

  const isRechnungenDirty = (currentRech: Record<string, RechnungEinzel[]>, initialRech: Record<string, RechnungEinzel[]>): boolean => {
    const currentKeys = Object.keys(currentRech);
    const initialKeys = Object.keys(initialRech);

    if (currentKeys.length !== initialKeys.length) return true;

    for (const key of currentKeys) {
      if (!initialRech[key]) return true;

      const currentEntries = currentRech[key];
      const initialEntries = initialRech[key];

      if (currentEntries.length !== initialEntries.length) return true;

      for (const currentEntry of currentEntries) { // Iterate through current entries
        const initialEntry = initialEntries.find(entry => entry.mieterId === currentEntry.mieterId);
        if (!initialEntry || currentEntry.betrag !== initialEntry.betrag) return true;
      }
    }
     // Check if any key from initial is missing in current (handles deletion of cost items of type 'nach Rechnung')
     for (const key of initialKeys) {
      if (!currentRech[key]) return true;
    }
    return false;
  };

  const checkDirtyStateBetriebskosten = useCallback(() => {
    if (jahr !== initialJahr) return true;
    if (wasserkosten !== initialWasserkosten) return true;
    if (haeuserId !== initialHaeuserId) return true;
    if (isCostItemsDirty(costItems, initialCostItems)) return true;
    if (isRechnungenDirty(rechnungen, initialRechnungen)) return true;
    return false;
  }, [
    jahr, initialJahr,
    wasserkosten, initialWasserkosten,
    haeuserId, initialHaeuserId,
    costItems, initialCostItems,
    rechnungen, initialRechnungen
  ]);

  const handleAttemptCloseBetriebskosten = useCallback((event?: Event) => {
    if (checkDirtyStateBetriebskosten()) {
      if (event) event.preventDefault();
      setShowConfirmDiscardModal(true);
    } else {
      onClose();
    }
  }, [checkDirtyStateBetriebskosten, onClose]);

  const handleMainModalOpenChangeBetriebskosten = (isOpenDialog: boolean) => {
    if (!isOpenDialog && checkDirtyStateBetriebskosten()) {
      setShowConfirmDiscardModal(true);
    } else if (!isOpenDialog) {
      onClose();
    }
  };

  const handleConfirmDiscardBetriebskosten = () => {
    onClose();
    setShowConfirmDiscardModal(false);
  };

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

  // Main useEffect for Data Fetching and Initialization
  useEffect(() => {
    const resetAllStates = () => {
      setJahr("");
      setWasserkosten("");
      setHaeuserId("");
      setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      setIsLoadingDetails(false);
      setModalNebenkostenData(null);
      currentlyLoadedNebenkostenId.current = null;
      initialRechnungenLoaded.current = false; // Reset this flag too
      // Also reset initial states for dirty checking
      setInitialJahr("");
      setInitialWasserkosten("");
      setInitialHaeuserId("");
      setInitialCostItems([]);
      setInitialRechnungen({});
      setShowConfirmDiscardModal(false);
    };

    if (isOpen) {
      const editId = nebenkostenToEdit?.id;
      initialRechnungenLoaded.current = false; // Reset on open/editId change

      if (editId && editId !== currentlyLoadedNebenkostenId.current) {
        setIsLoadingDetails(true);
        setModalNebenkostenData(null);
        setJahr(""); setInitialJahr("");
        setWasserkosten(""); setInitialWasserkosten("");
        setHaeuserId(""); setInitialHaeuserId("");
        setCostItems([]); setInitialCostItems([]);
        setRechnungen({}); setInitialRechnungen({});

        getNebenkostenDetailsAction(editId)
          .then(response => {
            if (response.success && response.data) {
              const fetchedData = response.data;
              setModalNebenkostenData(fetchedData); // This will trigger the rechnungen sync effect

              const currentJahr = fetchedData.jahr || "";
              setJahr(currentJahr); setInitialJahr(currentJahr);

              const currentHausId = fetchedData.haeuser_id || (haeuser.length > 0 ? haeuser[0].id : "");
              setHaeuserId(currentHausId); setInitialHaeuserId(currentHausId);

              const currentWasserkosten = fetchedData.wasserkosten?.toString() || "";
              setWasserkosten(currentWasserkosten); setInitialWasserkosten(currentWasserkosten);

              const newCostItems: CostItem[] = (fetchedData.nebenkostenart || []).map((art, idx) => ({
                id: generateId(),
                art: art,
                betrag: fetchedData.berechnungsart?.[idx] === 'nach Rechnung' ? '' : fetchedData.betrag?.[idx]?.toString() || "",
                berechnungsart: (BERECHNUNGSART_OPTIONS.find(opt => opt.value === fetchedData.berechnungsart?.[idx])?.value as BerechnungsartValue) || '',
              }));
              const finalCostItems = newCostItems.length > 0 ? newCostItems : [{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }];
              setCostItems(finalCostItems);
              // Deep copy for initialCostItems, ensuring IDs are part of the copied objects
              setInitialCostItems(JSON.parse(JSON.stringify(finalCostItems.map(ci => ({...ci})))));


            } else {
              toast({
                title: "Fehler beim Laden der Details",
                description: response.message || "Die Nebenkostendetails konnten nicht geladen werden. Das Fenster wird geschlossen.",
                variant: "destructive",
              });
              setModalNebenkostenData(null);
              onClose();
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
              onClose();
            }
          })
          .finally(() => {
            setIsLoadingDetails(false);
            currentlyLoadedNebenkostenId.current = editId;
          });
      } else if (!editId) {
        resetAllStates();
        const currentJahr = new Date().getFullYear().toString();
        setJahr(currentJahr); setInitialJahr(currentJahr);

        const currentHausId = haeuser && haeuser.length > 0 ? haeuser[0].id : "";
        setHaeuserId(currentHausId); setInitialHaeuserId(currentHausId);

        const defaultCostItem = { id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' };
        setCostItems([defaultCostItem]);
        setInitialCostItems(JSON.parse(JSON.stringify([{...defaultCostItem}]))); // Deep copy

        setWasserkosten(""); setInitialWasserkosten(""); // Ensure these are also reset for new entry
        setRechnungen({}); setInitialRechnungen({});


        setIsLoadingDetails(false);
        currentlyLoadedNebenkostenId.current = null;
      } else {
        if (modalNebenkostenData && haeuserId && !haeuser.find(h => h.id === haeuserId)) {
           const newHausId = haeuser.length > 0 ? haeuser[0].id : "";
           setHaeuserId(newHausId);
           setInitialHaeuserId(newHausId); // Also update initial if it's a forced change
        }
      }
    } else {
      resetAllStates();
    }
  }, [isOpen, nebenkostenToEdit, haeuser, toast, onClose]);


  // New useEffect for Tenant Fetching
  useEffect(() => {
    if (isOpen && haeuserId) {
      const fetchTenants = async () => {
        setIsFetchingTenants(true);
        try {
          // Pass the selected year to filter tenants who lived in the house during that year
          const actionResponse = await getMieterByHausIdAction(haeuserId, jahr);
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
  }, [haeuserId, isOpen, toast, jahr]); // Added jahr to dependency array to refetch when year changes


  // Modified useEffect for Rechnungen Synchronization
  const syncRechnungenState = (
    currentTenants: Mieter[], 
    currentCostItems: CostItem[],
    // dbRechnungen source is now modalNebenkostenData
  ) => {
    setRechnungen(prevRechnungen => {
      const newRechnungenState: Record<string, RechnungEinzel[]> = {};
      const dbRechnungenSource = modalNebenkostenData?.Rechnungen;

      currentCostItems.forEach(costItem => {
        if (costItem.berechnungsart === 'nach Rechnung') {
          newRechnungenState[costItem.id] = currentTenants.map(tenant => {
            // Try to find a matching Rechnung from the fetched DB data
            const dbRechnungForTenant = dbRechnungenSource?.find(
              dbR => dbR.mieter_id === tenant.id && dbR.name === costItem.art
            );

            // Check if there's an existing entry in the current rechnungen state (e.g. from user input before tenants loaded)
            const existingEntryInState = (prevRechnungen[costItem.id] || []).find(r => r.mieterId === tenant.id);
            
            let betragToSet = ''; // Default to empty
            if (dbRechnungForTenant) {
              betragToSet = dbRechnungForTenant.betrag.toString();
            } else if (existingEntryInState) {
              // If no DB entry, but there was something in state (e.g. user started typing then tenants loaded), preserve it.
              // This case might be less common if tenants load quickly.
              betragToSet = existingEntryInState.betrag;
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
    if (isOpen && !isLoadingDetails) {
      syncRechnungenState(selectedHausMieter, costItems);
      // After the first sync when data is loaded, capture this as initialRechnungen
      // This needs to be careful not to overwrite on subsequent tenant/costItem changes if not desired for "initial"
      if(modalNebenkostenData && !initialRechnungenLoaded.current && Object.keys(rechnungen).length > 0) {
        // Create a deep copy for initialRechnungen based on the current rechnungen state
        // which should now be populated from modalNebenkostenData or initialized
        const currentRechnungenCopy = JSON.parse(JSON.stringify(rechnungen));
        setInitialRechnungen(currentRechnungenCopy);
        initialRechnungenLoaded.current = true;
      } else if (!modalNebenkostenData && !(nebenkostenToEdit?.id) && !initialRechnungenLoaded.current && costItems.some(ci => ci.berechnungsart === 'nach Rechnung')) {
        // For new entries, if 'nach Rechnung' items exist, initialize empty rechnungen as initial
        // Use nebenkostenToEdit?.id directly here
        const currentRechnungenCopy = JSON.parse(JSON.stringify(rechnungen));
        setInitialRechnungen(currentRechnungenCopy);
        initialRechnungenLoaded.current = true;
      }
    }
    if (!isOpen) { // When modal closes, reset this flag
        initialRechnungenLoaded.current = false;
    }
  }, [selectedHausMieter, costItems, modalNebenkostenData, isOpen, isLoadingDetails, rechnungen, nebenkostenToEdit?.id]); // Added rechnungen and editId from nebenkostenToEdit


  const handleSubmit = async () => {
    setIsSaving(true);
    const editId = nebenkostenToEdit?.id; // Use prop for consistency in submit action context

    const currentEditId = modalNebenkostenData?.id || editId;


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
    // Use currentEditId to determine if updating or creating
    if (currentEditId) {
      response = await updateNebenkosten(currentEditId, formData);
    } else {
      response = await createNebenkosten(formData);
    }

    if (response.success) {
      const nebenkosten_id = currentEditId || response.data?.id;

      if (nebenkosten_id) {
        console.log('Nebenkosten ID:', nebenkosten_id);

        // If editing (currentEditId was present), first delete existing Rechnungen
        if (currentEditId) {
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
                  name: item.art, // Changed name assignment to item.art
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
    <>
    <Dialog open={isOpen} onOpenChange={handleMainModalOpenChangeBetriebskosten}>
      <DialogContent
        className="max-w-4xl"
        onInteractOutsideOptional={(e) => {
          if (isOpen && checkDirtyStateBetriebskosten()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else if (isOpen) { // Not dirty, allow close
            onClose();
          }
        }}
        onEscapeKeyDown={(e) => { // Radix specific prop for escape key
          if (checkDirtyStateBetriebskosten()) {
            e.preventDefault();
            setShowConfirmDiscardModal(true);
          } else {
            onClose(); // Not dirty, allow close
          }
        }}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>
              {nebenkostenToEdit?.id || modalNebenkostenData?.id ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
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
                    onChange={(e) => setJahr(e.target.value)}
                    placeholder="z.B. 2023"
                    required
                    disabled={isSaving || isLoadingDetails}
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
                    onChange={(value) => setHaeuserId(value || "")}
                    placeholder="Haus auswählen..."
                    searchPlaceholder="Haus suchen..."
                    emptyText="Kein Haus gefunden."
                    disabled={isSaving || isLoadingDetails}
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
                  onChange={(e) => setWasserkosten(e.target.value)}
                  placeholder="z.B. 500.00"
                  step="0.01"
                  disabled={isSaving || isLoadingDetails}
                />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Kostenaufstellung</h3>
              <div className="rounded-md border p-4 space-y-0 shadow-sm">
                {isLoadingDetails && (nebenkostenToEdit?.id || modalNebenkostenData?.id) ? (
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
                            disabled={isSaving || isLoadingDetails}
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
                              disabled={isSaving || isLoadingDetails}
                            />
                          )}
                        </div>
                        <div className="w-full sm:flex-[4_1_0%]">
                          <Select
                            value={item.berechnungsart}
                            onValueChange={(value) => handleCostItemChange(index, 'berechnungsart', value as BerechnungsartValue)}
                            disabled={isSaving || isLoadingDetails}
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
                <Button type="button" onClick={addCostItem} variant="outline" size="sm" className="mt-2" disabled={isLoadingDetails || isSaving}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Kostenposition hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleAttemptCloseBetriebskosten()} disabled={isSaving || isLoadingDetails}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingDetails}>
              {isSaving ? "Speichern..." : (isLoadingDetails ? "Laden..." : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmationAlertDialog
        isOpen={showConfirmDiscardModal}
        onOpenChange={setShowConfirmDiscardModal}
        onConfirm={handleConfirmDiscardBetriebskosten}
        title="Änderungen verwerfen?"
        description="Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?"
        confirmButtonText="Verwerfen"
        cancelButtonText="Weiter bearbeiten"
        confirmButtonVariant="destructive"
      />
    </>
  );
}
