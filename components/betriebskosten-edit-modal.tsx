"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatNumber } from "@/utils/format";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { normalizeBerechnungsart } from "../utils/betriebskosten";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, Trash2, GripVertical } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Mieter, Nebenkosten } from "../lib/data-fetching";
import { BerechnungsartValue, BERECHNUNGSART_OPTIONS } from "../lib/constants";
import { 
  getNebenkostenDetailsAction,
  createNebenkosten, 
  updateNebenkosten, 
  createRechnungenBatch, 
  RechnungData,
  deleteRechnungenByNebenkostenId,
} from "../app/betriebskosten-actions";
import { getMieterByHausIdAction } from "../app/mieter-actions"; 
import { useToast } from "../hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { LabelWithTooltip } from "./ui/label-with-tooltip";
import { CustomCombobox } from "./ui/custom-combobox";
import { SortableCostItem, type CostItem, type RechnungEinzel } from "./sortable-cost-item";

// Re-export for other components that might need it
export type { CostItem, RechnungEinzel };

interface ComboboxOption {
  value: string;
  label: string;
}

interface BetriebskostenEditModalPropsRefactored {}

export function BetriebskostenEditModal({}: BetriebskostenEditModalPropsRefactored) {
  const {
    isBetriebskostenModalOpen,
    closeBetriebskostenModal,
    betriebskostenInitialData,
    betriebskostenModalHaeuser,
    betriebskostenModalOnSuccess,
    isBetriebskostenModalDirty,
    setBetriebskostenModalDirty,
  } = useModalStore();

  const [jahr, setJahr] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [hausId, setHausId] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [modalNebenkostenData, setModalNebenkostenData] = useState<Nebenkosten | null>(null);
  const currentlyLoadedNebenkostenId = React.useRef<string | null | undefined>(null);

  // Tooltip next to dropdown: track hovered verteilerschlüssel, dropdown rect, and hovered item position
  const [hoveredBerechnungsart, setHoveredBerechnungsart] = useState<BerechnungsartValue | ''>('');
  
  // Map of tooltip texts for each Berechnungsart
  const tooltipMap: Record<BerechnungsartValue | '', string> = {
    'pro Flaeche': 'Kosten werden anteilig nach Wohnungsfläche verteilt.',
    'pro Mieter': 'Kosten werden gleichmäßig auf alle Mieter aufgeteilt.',
    'pro Wohnung': 'Kosten werden gleichmäßig auf alle Wohnungen aufgeteilt.',
    'nach Rechnung': 'Beträge werden je Mieter manuell erfasst.',
    '': ''
  };
  const [hoveredItemRect, setHoveredItemRect] = useState<DOMRect | null>(null);
  const hoveredItemElRef = useRef<HTMLElement | null>(null);
  const selectContentRef = useRef<HTMLDivElement | null>(null);
  const [selectContentRect, setSelectContentRect] = useState<DOMRect | null>(null);

  const handleItemHover = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, value: BerechnungsartValue) => {
    setHoveredBerechnungsart(value);
    hoveredItemElRef.current = e.currentTarget as HTMLElement;
    setHoveredItemRect(e.currentTarget.getBoundingClientRect());
  };

  const handleItemLeave = () => {
    setHoveredBerechnungsart('');
    hoveredItemElRef.current = null;
    setHoveredItemRect(null);
  };

  useEffect(() => {
    if (!selectContentRef.current) {
      setSelectContentRect(null);
      return;
    }
    const update = () => {
      if (selectContentRef.current) {
        setSelectContentRect(selectContentRef.current.getBoundingClientRect());
      }
      if (hoveredItemElRef.current) {
        setHoveredItemRect(hoveredItemElRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      setSelectContentRect(null);
    };
  }, [hoveredBerechnungsart]);

  const houseOptions: ComboboxOption[] = (betriebskostenModalHaeuser || []).map(h => ({ value: h.id, label: h.name }));

  const generateId = () => Math.random().toString(36).substr(2, 9);

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
    closeBetriebskostenModal();
  };

  const handleCancelClick = () => {
    closeBetriebskostenModal({ force: true });
  };

  useEffect(() => {
    const resetAllStates = (forNewEntry: boolean = true) => {
      setJahr(forNewEntry ? new Date().getFullYear().toString() : "");
      setWasserkosten("");
      setHausId(forNewEntry && betriebskostenModalHaeuser && betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "");
      setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      setModalNebenkostenData(null);
      currentlyLoadedNebenkostenId.current = null;
      if (isBetriebskostenModalOpen) setBetriebskostenModalDirty(false);
    };

    if (isBetriebskostenModalOpen) {
      const editId = betriebskostenInitialData?.id;

      if (editId && editId !== currentlyLoadedNebenkostenId.current) {
        setIsLoadingDetails(true);
        resetAllStates(false);
        setModalNebenkostenData(null);
        setCostItems([]);
        setRechnungen({});

        getNebenkostenDetailsAction(editId)
          .then(response => {
            if (response.success && response.data) {
              const fetchedData = response.data;
              setModalNebenkostenData(fetchedData);
              setJahr(fetchedData.jahr || "");
              setHausId(fetchedData.haeuser_id || (betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : ""));
              setWasserkosten(fetchedData.wasserkosten?.toString() || "");

              const newCostItems: CostItem[] = (fetchedData.nebenkostenart || []).map((art, idx) => ({
                id: generateId(),
                art: art,
                betrag: fetchedData.berechnungsart?.[idx] === 'nach Rechnung' ? '' : fetchedData.betrag?.[idx]?.toString() || "",
                berechnungsart: normalizeBerechnungsart(fetchedData.berechnungsart?.[idx] || ''),
              }));
              setCostItems(newCostItems.length > 0 ? newCostItems : [{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
              setBetriebskostenModalDirty(false);
            } else {
              toast({ title: "Fehler beim Laden der Details", description: response.message || "Die Nebenkostendetails konnten nicht geladen werden.", variant: "destructive" });
              attemptClose();
            }
          })
          .catch(() => {
            toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist beim Laden der Nebenkostendetails aufgetreten.", variant: "destructive" });
            if (editId) attemptClose();
          })
          .finally(() => {
            setIsLoadingDetails(false);
            currentlyLoadedNebenkostenId.current = editId;
          });
      } else if (!editId) {
        resetAllStates(true);
        setIsLoadingDetails(false);
        currentlyLoadedNebenkostenId.current = null;
        setBetriebskostenModalDirty(false);
      }
    } else {
      resetAllStates(false);
    }
  }, [isBetriebskostenModalOpen, betriebskostenInitialData, betriebskostenModalHaeuser, toast, setBetriebskostenModalDirty]);

  useEffect(() => {
    if (isBetriebskostenModalOpen && hausId && jahr) {
      const fetchTenants = async () => {
        setIsFetchingTenants(true);
        try {
          const tenantResponse = await getMieterByHausIdAction(hausId, jahr);
          if (tenantResponse.success && tenantResponse.data) {
            setSelectedHausMieter(tenantResponse.data);
          } else {
            toast({ title: "Fehler beim Laden der Mieter", description: tenantResponse.error || "Unbekannter Fehler", variant: "destructive" });
            setSelectedHausMieter([]);
          }
        } catch (error: any) {
          toast({ title: "Systemfehler", description: "Daten für Mieter konnten nicht geladen werden.", variant: "destructive" });
          setSelectedHausMieter([]);
        } finally {
          setIsFetchingTenants(false);
        }
      };
      fetchTenants();
    } else if (!isBetriebskostenModalOpen || !hausId) {
      setSelectedHausMieter([]);
    }
  }, [isBetriebskostenModalOpen, hausId, jahr, toast]);

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
  };

  useEffect(() => {
    if (isBetriebskostenModalOpen && !isLoadingDetails) {
      syncRechnungenState(selectedHausMieter, costItems);
    }
  }, [selectedHausMieter, costItems, modalNebenkostenData, isBetriebskostenModalOpen, isLoadingDetails]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setBetriebskostenModalDirty(false);

    const currentEditId = modalNebenkostenData?.id || betriebskostenInitialData?.id;

    if (!jahr || !hausId) {
      toast({ title: "Fehlende Eingaben", description: "Jahr und Haus sind Pflichtfelder.", variant: "destructive" });
      setIsSaving(false); setBetriebskostenModalDirty(true);
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
        toast({ 
          title: "Validierungsfehler", 
          description: `Art der Kosten darf nicht leer sein. Bitte überprüfen Sie Posten ${costItems.indexOf(item) + 1}.`, 
          variant: "destructive" 
        });
        setIsSaving(false);
        setBetriebskostenModalDirty(true);
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
      haeuser_id: hausId,
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
            toast({ title: "Fehler beim Aktualisieren der Einzelrechnungen", description: deleteResponse.message, variant: "destructive" });
            setIsSaving(false); return;
          }
        }

        const rechnungenToSave: RechnungData[] = [];
        costItems.forEach(item => {
          if (item.berechnungsart === 'nach Rechnung') {
            (rechnungen[item.id] || []).forEach(rechnungEinzel => {
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
            toast({ 
              title: "Fehler beim Speichern der Einzelrechnungen", 
              description: rechnungenSaveResponse.message, 
              variant: "destructive" 
            });
            setIsSaving(false);
            setBetriebskostenModalDirty(true);
            return; // Stop execution if saving individual bills fails
          }
        }
        
      }
      
      // Only show success and close if everything was successful
      toast({ title: "Betriebskosten erfolgreich gespeichert" });
      if (betriebskostenModalOnSuccess) betriebskostenModalOnSuccess();
      closeBetriebskostenModal();
    } else {
      toast({ title: "Fehler beim Speichern", description: response.message, variant: "destructive" });
      setBetriebskostenModalDirty(true);
    }
    setIsSaving(false);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = costItems.findIndex(item => item.id === active.id);
      const newIndex = costItems.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCostItems = arrayMove(costItems, oldIndex, newIndex);
        setCostItems(newCostItems);
        setBetriebskostenModalDirty(true);
      }
    }
  };

  const handleJahrChange = (e: React.ChangeEvent<HTMLInputElement>) => { setJahr(e.target.value); setBetriebskostenModalDirty(true); };
  const handleWasserkostenChange = (e: React.ChangeEvent<HTMLInputElement>) => { setWasserkosten(e.target.value); setBetriebskostenModalDirty(true); };
  const handleHausChange = (newHausId: string | null) => { 
    setHausId(newHausId || ''); 
    setBetriebskostenModalDirty(true); 
  };

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
              {betriebskostenInitialData?.id ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              {isLoadingDetails ? "Lade Details..." : "Füllen Sie die Details für die Betriebskostenabrechnung aus."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[70vh] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="formJahr" infoText="Das Jahr, für das die Nebenkostenabrechnung gilt.">
                  Jahr *
                </LabelWithTooltip>
                {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                  <Input id="formJahr" value={jahr} onChange={handleJahrChange} placeholder="z.B. 2023" required disabled={isSaving} />
                )}
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="formHausId" infoText="Wählen Sie das Haus aus, für das die Nebenkostenabrechnung erstellt wird.">
                  Haus *
                </LabelWithTooltip>
                {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                  <CustomCombobox width="w-full" options={houseOptions} value={hausId} onChange={handleHausChange} placeholder="Haus auswählen..." searchPlaceholder="Haus suchen..." emptyText="Kein Haus gefunden." disabled={isSaving} />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <LabelWithTooltip htmlFor="formWasserkosten" infoText="Die gesamten Wasserkosten für das ausgewählte Haus in diesem Jahr.">
                Wasserkosten (€)
              </LabelWithTooltip>
              {isLoadingDetails ? <Skeleton className="h-10 w-full" /> : (
                <Input id="formWasserkosten" type="number" value={wasserkosten} onChange={handleWasserkostenChange} placeholder="z.B. 500.00" step="0.01" disabled={isSaving} />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Kostenaufstellung</h3>
              <div className="rounded-md border p-4 space-y-0 shadow-sm">
                {isLoadingDetails ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`skel-cost-${idx}`} className="flex flex-col gap-3 py-2 border-b last:border-b-0">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="flex items-center justify-center flex-none w-8 h-10">
                          <Skeleton className="h-6 w-6 rounded" />
                        </div>
                        <Skeleton className="h-10 w-full sm:flex-[4_1_0%]" />
                        <Skeleton className="h-10 w-full sm:flex-[3_1_0%]" />
                        <Skeleton className="h-10 w-full sm:flex-[4_1_0%]" />
                        <div className="flex items-center justify-center flex-none w-10 h-10">
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={costItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {costItems.map((item, index) => (
                        <SortableCostItem
                          key={item.id}
                          item={item}
                          index={index}
                          costItems={costItems}
                          selectedHausMieter={selectedHausMieter}
                          rechnungen={rechnungen}
                          isSaving={isSaving}
                          isLoadingDetails={isLoadingDetails}
                          isFetchingTenants={isFetchingTenants}
                          hausId={hausId}
                          onCostItemChange={handleCostItemChange}
                          onRemoveCostItem={removeCostItem}
                          onRechnungChange={handleRechnungChange}
                          hoveredBerechnungsart={hoveredBerechnungsart}
                          selectContentRect={selectContentRect}
                          hoveredItemRect={hoveredItemRect}
                          tooltipMap={tooltipMap}
                          onItemHover={handleItemHover}
                          onItemLeave={handleItemLeave}
                          selectContentRef={selectContentRef}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
                <Button type="button" onClick={addCostItem} variant="outline" size="sm" className="mt-2" disabled={isLoadingDetails || isSaving}>
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
            <Button type="submit" disabled={isSaving || isFetchingTenants}>
              {isSaving ? "Speichern..." : (isLoadingDetails || isFetchingTenants ? "Laden..." : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
