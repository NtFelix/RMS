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
import { PlusCircle, Trash2, GripVertical, CalendarPlus, CalendarMinus, FileInput, BookDashed } from "lucide-react";
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
  getLatestBetriebskostenByHausId,
} from "../app/betriebskosten-actions";
import { getMieterByHausIdAction } from "../app/mieter-actions"; 
import { useToast } from "../hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { LabelWithTooltip } from "./ui/label-with-tooltip";
import { CustomCombobox, type ComboboxOption } from "./ui/custom-combobox";
import { SortableCostItem, type CostItem, type RechnungEinzel } from "./sortable-cost-item";
import { DateRangePicker } from "./ui/date-range-picker";
import { getDefaultDateRange, validateDateRange, germanToIsoDate, isoToGermanDate, formatPeriodDuration } from "@/utils/date-calculations";

// Re-export for other components that might need it
export type { CostItem, RechnungEinzel };

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

  const [startdatum, setStartdatum] = useState("");
  const [enddatum, setEnddatum] = useState("");
  const [wasserkosten, setWasserkosten] = useState("");
  const [hausId, setHausId] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
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
  const templateLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFormLoading = isLoadingDetails || isLoadingTemplate;

  useEffect(() => {
    return () => {
      if (templateLoadingTimeoutRef.current) {
        clearTimeout(templateLoadingTimeoutRef.current);
        templateLoadingTimeoutRef.current = null;
      }
    };
  }, []);

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

  // Set up default cost items for a new Betriebskostenabrechnung
  const setupDefaultCostItems = () => {
    const defaultItems: CostItem[] = [
      {
        id: generateId(),
        art: 'Grundsteuer',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Wasserkosten',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Heizkosten',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Warmwasser',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Müllabfuhr',
        betrag: '',
        berechnungsart: 'pro Wohnung'
      },
      {
        id: generateId(),
        art: 'Gebäudereinigung',
        betrag: '',
        berechnungsart: 'pro Wohnung'
      },
      {
        id: generateId(),
        art: 'Gartenpflege',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Hausversicherung',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      },
      {
        id: generateId(),
        art: 'Aufzugskosten',
        betrag: '',
        berechnungsart: 'pro Wohnung'
      },
      {
        id: generateId(),
        art: 'Sonstige Betriebskosten',
        betrag: '',
        berechnungsart: 'pro Flaeche'
      }
    ];

    setIsLoadingTemplate(true);

    if (templateLoadingTimeoutRef.current) {
      clearTimeout(templateLoadingTimeoutRef.current);
      templateLoadingTimeoutRef.current = null;
    }

    setCostItems(defaultItems);
    setWasserkosten('');

    toast({
      title: "Standard-Vorlage geladen",
      description: "Die Standard-Betriebskostenarten wurden geladen. Bitte tragen Sie die entsprechenden Beträge ein.",
      variant: "default",
    });

    templateLoadingTimeoutRef.current = setTimeout(() => {
      setIsLoadingTemplate(false);
      templateLoadingTimeoutRef.current = null;
    }, 300);
  };

  // Fetch latest Betriebskosten for a house and update the form
  const fetchAndApplyLatestBetriebskosten = async (hausId: string) => {
    if (!hausId || betriebskostenInitialData?.id) return; // Skip if editing existing

    // Check if we should use default template
    if (betriebskostenInitialData?.useTemplate === 'default') {
      setupDefaultCostItems();
      return;
    }

    try {
      setIsLoadingTemplate(true);
      if (templateLoadingTimeoutRef.current) {
        clearTimeout(templateLoadingTimeoutRef.current);
        templateLoadingTimeoutRef.current = null;
      }
      const response = await getLatestBetriebskostenByHausId(hausId);
      if (response.success && response.data) {
        const latest = response.data;
        
        // Set the cost items from the latest entry
        if (latest.nebenkostenart?.length) {
          const items = latest.nebenkostenart.map((art: string, idx: number) => ({
            id: generateId(),
            art,
            betrag: latest.berechnungsart?.[idx] === 'nach Rechnung' ? '' : (latest.betrag?.[idx]?.toString() || ''),
            berechnungsart: normalizeBerechnungsart(latest.berechnungsart?.[idx] || '')
          }));
          setCostItems(items);
          
          // If there are any 'nach Rechnung' items, set up their rechnungen
          latest.berechnungsart?.forEach((berechnungsart: string, idx: number) => {
            if (berechnungsart === 'nach Rechnung' && latest.rechnungen) {
              const costItemId = items[idx]?.id;
              if (costItemId) {
                const itemRechnungen = latest.rechnungen
                  .filter((r: any) => r.nebenkostenart_index === idx)
                  .map((r: any) => ({
                    mieterId: r.mieter_id,
                    betrag: r.betrag?.toString() || ''
                  }));
                if (itemRechnungen.length > 0) {
                  setRechnungen(prev => ({
                    ...prev,
                    [costItemId]: itemRechnungen
                  }));
                }
              }
            }
          });
        }
        
        // Set wasserkosten if available
        if (latest.wasserkosten) {
          setWasserkosten(latest.wasserkosten.toString());
        }
        
        toast({
          title: "Letzte Nebenkosten übernommen",
          description: "Die Nebenkostenarten der letzten Abrechnung wurden übernommen. Bitte überprüfen Sie die Werte.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching latest Betriebskosten:", error);
    } finally {
      templateLoadingTimeoutRef.current = setTimeout(() => {
        setIsLoadingTemplate(false);
        templateLoadingTimeoutRef.current = null;
      }, 300);
    }
  };

  // Handle house selection change
  const handleHausIdChange = (newHausId: string) => {
    setHausId(newHausId);
    if (newHausId && !betriebskostenInitialData?.id) {
      fetchAndApplyLatestBetriebskosten(newHausId);
    }
  };

  useEffect(() => {
    const resetAllStates = (forNewEntry: boolean = true) => {
      if (forNewEntry) {
        const defaultRange = getDefaultDateRange();
        setStartdatum(defaultRange.startdatum);
        setEnddatum(defaultRange.enddatum);
      } else {
        setStartdatum("");
        setEnddatum("");
      }
      setWasserkosten("");
      const initialHausId = forNewEntry && betriebskostenModalHaeuser && betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "";
      setHausId(initialHausId);
      setCostItems([{ id: generateId(), art: '', betrag: '', berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || '' }]);
      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      setModalNebenkostenData(null);
      currentlyLoadedNebenkostenId.current = null;
      if (isBetriebskostenModalOpen) setBetriebskostenModalDirty(false);
      
      // If this is a new entry and we have a default house, fetch its latest data
      if (forNewEntry && initialHausId) {
        fetchAndApplyLatestBetriebskosten(initialHausId);
      }
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
              // Convert ISO dates from database to German format for display
              setStartdatum(fetchedData.startdatum ? isoToGermanDate(fetchedData.startdatum) : "");
              setEnddatum(fetchedData.enddatum ? isoToGermanDate(fetchedData.enddatum) : "");
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
    if (isBetriebskostenModalOpen && hausId && startdatum && enddatum) {
      const fetchTenants = async () => {
        setIsFetchingTenants(true);
        try {
          // Convert German dates to ISO format for API call
          const startIso = germanToIsoDate(startdatum);
          const endIso = germanToIsoDate(enddatum);
          
          if (!startIso || !endIso) {
            setSelectedHausMieter([]);
            setIsFetchingTenants(false);
            return;
          }
          
          const tenantResponse = await getMieterByHausIdAction(hausId, startIso, endIso);
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
  }, [isBetriebskostenModalOpen, hausId, startdatum, enddatum, toast]);

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
    if (isBetriebskostenModalOpen && !isFormLoading) {
      syncRechnungenState(selectedHausMieter, costItems);
    }
  }, [selectedHausMieter, costItems, modalNebenkostenData, isBetriebskostenModalOpen, isFormLoading]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setBetriebskostenModalDirty(false);

    const currentEditId = modalNebenkostenData?.id || betriebskostenInitialData?.id;

    // Validate date range
    const dateValidation = validateDateRange(startdatum, enddatum);
    if (!dateValidation.isValid) {
      const errorMessages = Object.values(dateValidation.errors).filter(Boolean);
      toast({ 
        title: "Ungültige Datumsangaben", 
        description: errorMessages.join('. '), 
        variant: "destructive" 
      });
      setIsSaving(false); setBetriebskostenModalDirty(true);
      return;
    }

    if (!startdatum || !enddatum || !hausId) {
      toast({ title: "Fehlende Eingaben", description: "Startdatum, Enddatum und Haus sind Pflichtfelder.", variant: "destructive" });
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

    // Convert German dates to ISO format for database
    const startIso = germanToIsoDate(startdatum.trim());
    const endIso = germanToIsoDate(enddatum.trim());
    
    if (!startIso || !endIso) {
      toast({ title: "Ungültige Datumsangaben", description: "Bitte überprüfen Sie die Datumsformate.", variant: "destructive" });
      setIsSaving(false); setBetriebskostenModalDirty(true);
      return;
    }

    const submissionData = {
      startdatum: startIso,
      enddatum: endIso,
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
      toast({ 
        title: "Erfolg",
        description: "Betriebskosten erfolgreich gespeichert",
        variant: "success" 
      });
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

  const handleStartdatumChange = (date: string) => { 
    setStartdatum(date); 
    setBetriebskostenModalDirty(true); 
  };
  
  const handleEnddatumChange = (date: string) => { 
    setEnddatum(date); 
    setBetriebskostenModalDirty(true); 
  };
  
  const handleWasserkostenChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    setWasserkosten(e.target.value); 
    setBetriebskostenModalDirty(true); 
  };
  
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
          <DialogHeader className="px-4">
            <DialogTitle>
              {betriebskostenInitialData?.id ? "Betriebskosten bearbeiten" : "Neue Betriebskostenabrechnung"}
            </DialogTitle>
            <DialogDescription>
              {isFormLoading ? "Daten werden vorbereitet..." : "Füllen Sie die Details für die Betriebskostenabrechnung aus."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[70vh] p-4">
            {/* Property & Period Selection Section */}
            <div className="bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
              {/* House Selection */}
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="formHausId" infoText="Wählen Sie das Haus aus, für das die Nebenkostenabrechnung erstellt wird.">
                  Haus *
                </LabelWithTooltip>
                {isFormLoading ? <Skeleton className="h-10 w-full" /> : (
                  <CustomCombobox width="w-full" options={houseOptions} value={hausId} onChange={handleHausChange} placeholder="Haus auswählen..." searchPlaceholder="Haus suchen..." emptyText="Kein Haus gefunden." disabled={isSaving || isFormLoading} />
                )}
              </div>

              {/* Date Range Selection */}
              <div className="space-y-3">
                {isFormLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <DateRangePicker
                      startDate={startdatum}
                      endDate={enddatum}
                      onStartDateChange={handleStartdatumChange}
                      onEndDateChange={handleEnddatumChange}
                      disabled={isSaving || isFormLoading}
                      showPeriodInfo={false}
                    />
                    
                    {/* Year Navigation Buttons - positioned directly below date inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full rounded-full"
                        onClick={() => {
                          // Extract year from current startdatum and subtract 1
                          const currentStartYear = startdatum ? parseInt(startdatum.split('.')[2]) : new Date().getFullYear();
                          const newYear = currentStartYear - 1;
                          setStartdatum(`01.01.${newYear}`);
                          setEnddatum(`31.12.${newYear}`);
                          setBetriebskostenModalDirty(true);
                        }}
                        disabled={isSaving || isFormLoading}
                        title="Ein Jahr zurück"
                      >
                        <CalendarMinus className="w-4 h-4 mr-2" />
                        -1 Jahr
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full rounded-full"
                        onClick={() => {
                          // Extract year from current startdatum and add 1
                          const currentStartYear = startdatum ? parseInt(startdatum.split('.')[2]) : new Date().getFullYear();
                          const newYear = currentStartYear + 1;
                          setStartdatum(`01.01.${newYear}`);
                          setEnddatum(`31.12.${newYear}`);
                          setBetriebskostenModalDirty(true);
                        }}
                        disabled={isSaving || isFormLoading}
                        title="Ein Jahr vor"
                      >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        +1 Jahr
                      </Button>
                    </div>
                    
                    {/* Period information - moved below the year buttons */}
                    {(() => {
                      const validation = validateDateRange(startdatum, enddatum);
                      return (
                        <div className="space-y-2">
                          {validation.isValid && validation.periodDays && (
                            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl">
                              <strong>Abrechnungszeitraum:</strong> {formatPeriodDuration(startdatum, enddatum)}
                            </div>
                          )}
                          
                          {validation.errors.range && (
                            <p className={`text-sm ${validation.errors.range.startsWith('Warnung') ? 'text-yellow-600' : 'text-red-600'}`}>
                              {validation.errors.range}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Water Costs */}
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="formWasserkosten" infoText="Die gesamten Wasserkosten für das ausgewählte Haus in diesem Abrechnungszeitraum.">
                  Wasserkosten (€)
                </LabelWithTooltip>
                {isFormLoading ? <Skeleton className="h-10 w-full" /> : (
                  <Input id="formWasserkosten" type="number" value={wasserkosten} onChange={handleWasserkostenChange} placeholder="z.B. 500.00" step="0.01" disabled={isSaving || isFormLoading} />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Kostenaufstellung</h3>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 p-3 space-y-3">
                {isFormLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`skel-cost-${idx}`} className="flex flex-col gap-2 py-2 border-b last:border-b-0">
                      <div className="flex flex-col sm:flex-row items-start gap-2">
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
                          isLoadingDetails={isFormLoading}
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
                <Button type="button" onClick={addCostItem} variant="outline" size="sm" className="mt-2" disabled={isFormLoading || isSaving}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Kostenposition hinzufügen
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-4">
            <Button type="button" variant="outline" onClick={handleCancelClick} disabled={isSaving || isFormLoading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving || isFetchingTenants || isFormLoading}>
              {isSaving ? "Speichern..." : (isFormLoading || isFetchingTenants ? "Laden..." : "Speichern")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
