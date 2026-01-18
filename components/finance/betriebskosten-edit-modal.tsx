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

import { normalizeBerechnungsart } from "@/utils/betriebskosten";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, Trash2, GripVertical, CalendarPlus, CalendarMinus, FileInput, BookDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Mieter, Nebenkosten, RechnungSql } from "@/lib/data-fetching";
import { ZAEHLER_CONFIG, ZaehlerTyp } from "@/lib/zaehler-types";
import { BerechnungsartValue, BERECHNUNGSART_OPTIONS } from "@/lib/constants";
import { DEFAULT_COST_ITEMS } from "@/lib/constants/betriebskosten";
import { generateId } from "@/lib/utils/generate-id";
import {
  getNebenkostenDetailsAction,
  createNebenkosten,
  updateNebenkosten,
  createRechnungenBatch,
  RechnungData,
  deleteRechnungenByNebenkostenId,
  getLatestBetriebskostenByHausId,
} from "@/app/betriebskosten-actions";
import { getMieterByHausIdAction } from "@/app/mieter-actions";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { SortableCostItem, type CostItem, type RechnungEinzel } from "./sortable-cost-item";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getDefaultDateRange, validateDateRange, germanToIsoDate, isoToGermanDate, formatPeriodDuration } from "@/utils/date-calculations";

// Re-export for other components that might need it
export type { CostItem, RechnungEinzel };
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

interface BetriebskostenEditModalPropsRefactored { }

export function BetriebskostenEditModal({ }: BetriebskostenEditModalPropsRefactored) {
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
  const [zaehlerkosten, setZaehlerkosten] = useState<Record<string, string>>({});
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

  const isFormLoading = isLoadingDetails || isLoadingTemplate;


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

        // Initialize rechnungen for this cost item with empty values for all tenants
        setRechnungen(prevRechnungen => {
          // If we already have rechnungen for this cost item, keep them
          if (prevRechnungen[costItemId]) {
            return prevRechnungen;
          }

          // Otherwise, initialize with empty values for all selected tenants
          return {
            ...prevRechnungen,
            [costItemId]: selectedHausMieter.map(mieter => ({
              mieterId: mieter.id,
              betrag: ''
            }))
          };
        });
      } else if (oldBerechnungsart === 'nach Rechnung' && value !== 'nach Rechnung') {
        // Only remove the rechnungen if we're changing away from 'nach Rechnung'
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
    // Calculate scrollbar width and set it as a CSS variable
    const calculateScrollbarWidth = () => {
      const scrollDiv = document.createElement('div');
      scrollDiv.style.overflow = 'scroll';
      scrollDiv.style.visibility = 'hidden';
      scrollDiv.style.position = 'absolute';
      document.body.appendChild(scrollDiv);
      const width = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return width;
    };

    // Set the scrollbar width as a CSS variable
    const scrollbarWidth = calculateScrollbarWidth();
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);

    // Handle body class and styles
    const handleBodyStyles = (isOpen: boolean) => {
      if (isOpen) {
        // Add class to body to prevent scrolling
        document.body.classList.add('modal-open');

        // Calculate and set padding to prevent layout shift
        const scrollY = window.scrollY;
        document.body.style.setProperty('--scroll-y', `${scrollY}px`);
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
      } else {
        // Remove modal-open class and reset styles
        document.body.classList.remove('modal-open');

        // Restore scroll position
        const scrollY = document.body.style.getPropertyValue('--scroll-y');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY, 10));
        }
      }
    };

    // Apply initial styles
    handleBodyStyles(isBetriebskostenModalOpen);

    // Cleanup function
    return () => {
      // Ensure we clean up in case the component unmounts while modal is open
      if (isBetriebskostenModalOpen) {
        handleBodyStyles(false);
      }
    };
  }, [isBetriebskostenModalOpen]);

  // Set up default cost items for a new Betriebskostenabrechnung
  const setupDefaultCostItems = () => {
    // Create a deep copy of the default items to avoid reference issues
    const defaultItems = JSON.parse(JSON.stringify(DEFAULT_COST_ITEMS)) as CostItem[];

    // Set the cost items first
    setCostItems(defaultItems);

    // Initialize empty rechnungen entries for all items that might use 'nach Rechnung'
    const initialRechnungen: Record<string, RechnungEinzel[]> = {};

    // If we have selected tenants, initialize empty entries for them
    if (selectedHausMieter.length > 0) {
      defaultItems.forEach((item: CostItem) => {
        initialRechnungen[item.id] = selectedHausMieter.map(mieter => ({
          mieterId: mieter.id,
          betrag: ''
        }));
      });
    }

    setRechnungen(initialRechnungen);
    setIsLoadingTemplate(false);

    toast({
      title: "Standard-Vorlage geladen",
      description: "Die Standard-Betriebskostenarten wurden geladen. Bitte tragen Sie die entsprechenden Beträge ein.",
      variant: "default",
    });
  };

  // Helper function to merge rechnungen while preserving existing values
  const mergeRechnungen = (
    existing: Record<string, RechnungEinzel[]>,
    newItems: Record<string, RechnungEinzel[]>
  ): Record<string, RechnungEinzel[]> => {
    const merged = { ...existing };

    // For each cost item in new items
    Object.entries(newItems).forEach(([costItemId, rechnungen]) => {
      // If we don't have this cost item yet, just add it
      if (!merged[costItemId]) {
        merged[costItemId] = [...rechnungen];
        return;
      }

      // Otherwise, merge the rechnungen, preserving existing values when possible
      const existingRechnungen = merged[costItemId] || [];
      const existingByMieter = new Map(
        existingRechnungen.map(r => [r.mieterId, r.betrag])
      );

      // Update with new rechnungen, but keep existing values when available
      merged[costItemId] = rechnungen.map(r => ({
        mieterId: r.mieterId,
        betrag: existingByMieter.has(r.mieterId) ? existingByMieter.get(r.mieterId)! : r.betrag
      }));
    });

    return merged;
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

      // First, ensure we have the latest tenant data
      const tenantsResponse = await getMieterByHausIdAction(hausId);
      const currentTenants = tenantsResponse.success ? tenantsResponse.data || [] : [];

      // Update selectedHausMieter state
      setSelectedHausMieter(currentTenants);

      // Save current rechnungen to preserve values when switching between periods
      const currentRechnungen = { ...rechnungen };

      // Then fetch the latest Betriebskosten
      const response = await getLatestBetriebskostenByHausId(hausId);
      if (response.success && response.data) {
        const latest = response.data;

        // Process cost items and rechnungen together
        const processCostItems = async () => {
          if (!latest.nebenkostenart?.length) return;

          // First, create all the cost items
          const items = latest.nebenkostenart.map((art: string, idx: number) => ({
            id: generateId(),
            art,
            betrag: latest.berechnungsart?.[idx] === 'nach Rechnung' ? '' : (latest.betrag?.[idx]?.toString() || ''),
            berechnungsart: normalizeBerechnungsart(latest.berechnungsart?.[idx] || '')
          }));

          // Set the cost items first
          setCostItems(items);

          // Then set up the rechnungen for 'nach Rechnung' items
          const newRechnungen: Record<string, RechnungEinzel[]> = {};
          const rechnungenFromApi = latest.Rechnungen || [];

          // Create a map of cost item names to their new IDs for easier lookup
          const costItemMap = new Map<string, string>();
          items.forEach((item: CostItem) => {
            costItemMap.set(item.art, item.id);
          });

          // Process all 'nach Rechnung' items from the latest entry
          latest.berechnungsart?.forEach((berechnungsart: string, idx: number) => {
            if (berechnungsart === 'nach Rechnung') {
              const costItemArt = latest.nebenkostenart?.[idx];
              const costItemId = costItemArt ? costItemMap.get(costItemArt) : null;

              if (costItemId && costItemArt) {
                // Filter rechnungen for this cost item by name
                const itemRechnungen = rechnungenFromApi
                  .filter((r: RechnungSql) => r.name === costItemArt)
                  .map((r: RechnungSql) => ({
                    mieterId: r.mieter_id,
                    betrag: r.betrag !== null ? r.betrag.toString() : ''
                  }));

                // Initialize with existing values or empty strings
                const tenantRechnungen = currentTenants.map(mieter => {
                  // Try to find existing value for this tenant
                  // Only look for existing values in the current cost item's rechnungen
                  const existing = currentRechnungen[costItemId]?.find(
                    r => r.mieterId === mieter.id && r.betrag && r.betrag.trim() !== ''
                  );

                  // If we have an existing value, use it, otherwise use the value from API or empty string
                  const existingValue = existing ? existing.betrag :
                    (itemRechnungen.find((r: { mieterId: string }) => r.mieterId === mieter.id)?.betrag || '');

                  return {
                    mieterId: mieter.id,
                    betrag: existingValue
                  };
                });

                newRechnungen[costItemId] = tenantRechnungen;
              }
            }
          });

          // Ensure all 'nach Rechnung' items have entries in rechnungen
          items.forEach((item: CostItem) => {
            if (item.berechnungsart === 'nach Rechnung' && !newRechnungen[item.id] && currentTenants.length > 0) {
              newRechnungen[item.id] = currentTenants.map(mieter => {
                // Try to find existing value for this tenant in any cost item
                const existing = Object.values(currentRechnungen)
                  .flat()
                  .find(r => r.mieterId === mieter.id && r.betrag && r.betrag.trim() !== '');

                return {
                  mieterId: mieter.id,
                  betrag: existing ? existing.betrag : ''
                };
              });
            }
          });

          // Merge with existing rechnungen to preserve values
          const mergedRechnungen = mergeRechnungen(currentRechnungen, newRechnungen);

          // Update the rechnungen state
          setRechnungen(mergedRechnungen);

          return items;
        };

        // Process cost items and rechnungen
        await processCostItems();

        // Set zaehlerkosten if available (from legacy wasserkosten or new zaehlerkosten)
        if (latest.zaehlerkosten) {
          const kostenStrings = Object.fromEntries(
            Object.entries(latest.zaehlerkosten).map(([key, value]) => [key, String(value)])
          );
          setZaehlerkosten(kostenStrings);
        } else if (latest.wasserkosten) {
          // Fallback to legacy wasserkosten
          setZaehlerkosten({ wasser: latest.wasserkosten.toString() });
        }

        // Set the date range if available
        if (latest.startdatum || latest.enddatum) {
          // Format the date to DD.MM.YYYY if it's in a different format
          const formatDate = (dateString: string | Date | null) => {
            if (!dateString) return '';

            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return '';

              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();

              return `${day}.${month}.${year}`;
            } catch (e) {
              console.error('Error formatting date:', e);
              return '';
            }
          };

          setStartdatum(formatDate(latest.startdatum) || '');
          setEnddatum(formatDate(latest.enddatum) || '');
        }

        toast({
          title: "Letzte Nebenkosten übernommen",
          description: "Die Nebenkostenarten der letzten Abrechnung wurden übernommen. Bitte überprüfen Sie die Werte.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching latest Betriebskosten:", error);
      toast({
        title: "Fehler",
        description: "Beim Laden der letzten Nebenkosten ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Handle house selection change
  const handleHausIdChange = (newHausId: string | null) => {
    if (newHausId === null) {
      setHausId('');
      return;
    }
    setHausId(newHausId);
    if (!betriebskostenInitialData?.id) {
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
      setZaehlerkosten({});
      const initialHausId = forNewEntry && betriebskostenModalHaeuser && betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "";
      setHausId(initialHausId);

      // Always start with a single empty cost item for new entries
      if (forNewEntry) {
        setCostItems([{
          id: generateId(),
          art: '',
          betrag: '',
          berechnungsart: BERECHNUNGSART_OPTIONS[0]?.value || 'pro Flaeche'
        }]);
      } else {
        setCostItems([]);
      }

      setSelectedHausMieter([]);
      setRechnungen({});
      setIsSaving(false);
      setIsFetchingTenants(false);
      setModalNebenkostenData(null);
      currentlyLoadedNebenkostenId.current = null;
      if (isBetriebskostenModalOpen) setBetriebskostenModalDirty(false);

      // Only fetch latest data if this is a new entry with a default house and using a template
      if (forNewEntry && initialHausId && betriebskostenInitialData?.useTemplate) {
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
              // Load zaehlerkosten (prefer new format, fallback to legacy)
              if (fetchedData.zaehlerkosten) {
                const kostenStrings: Record<string, string> = {};
                Object.entries(fetchedData.zaehlerkosten).forEach(([key, value]) => {
                  kostenStrings[key] = String(value);
                });
                setZaehlerkosten(kostenStrings);
              } else {
                setZaehlerkosten({});
              }

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

    // Parse all zaehlerkosten values
    const parsedZaehlerkosten: Record<string, number> = {};
    let hasInvalidZaehlerkosten = false;
    Object.entries(zaehlerkosten).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          hasInvalidZaehlerkosten = true;
        } else {
          parsedZaehlerkosten[key] = parsed;
        }
      }
    });
    if (hasInvalidZaehlerkosten) {
      toast({ title: "Ungültige Eingabe", description: "Zählerkosten müssen gültige Zahlen sein.", variant: "destructive" });
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
      zaehlerkosten: Object.keys(parsedZaehlerkosten).length > 0 ? parsedZaehlerkosten : null,
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
      setBetriebskostenModalDirty(false); // Clear dirty state before closing
      if (betriebskostenModalOnSuccess) {
        betriebskostenModalOnSuccess();
      }
      useOnboardingStore.getState().completeStep('create-bill-form');
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

  const handleZaehlerkostenChange = (zaehlerTyp: string, value: string) => {
    setZaehlerkosten(prev => ({ ...prev, [zaehlerTyp]: value }));
    setBetriebskostenModalDirty(true);
  };

  const handleHausChange = (newHausId: string | null) => {
    setHausId(newHausId || '');
    setBetriebskostenModalDirty(true);
  };

  if (!isBetriebskostenModalOpen) {
    return null;
  }

  // Handle dialog state changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      attemptClose();
    }
  };

  return (
    <Dialog open={isBetriebskostenModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        id="utility-bill-form-container"
        className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onAttemptClose={attemptClose}
        isDirty={isBetriebskostenModalDirty}
      >  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
                  <CustomCombobox width="w-full" options={houseOptions} value={hausId} onChange={handleHausIdChange} placeholder="Haus auswählen..." searchPlaceholder="Haus suchen..." emptyText="Kein Haus gefunden." disabled={isSaving || isFormLoading} />
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

              {/* Meter Costs / Zählerkosten */}
              <div className="space-y-3">
                <LabelWithTooltip htmlFor="formZaehlerkosten" infoText="Die Kosten je Zählertyp für das ausgewählte Haus in diesem Abrechnungszeitraum.">
                  Zählerkosten (€)
                </LabelWithTooltip>
                {isFormLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Skeleton key={`skel-zaehler-${idx}`} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(ZAEHLER_CONFIG) as ZaehlerTyp[]).map((typ) => (
                      <div key={typ} className="flex items-center gap-2">
                        <Label htmlFor={`zaehlerkosten-${typ}`} className="min-w-[120px] text-sm">
                          {ZAEHLER_CONFIG[typ].label}
                        </Label>
                        <NumberInput
                          id={`zaehlerkosten-${typ}`}
                          value={zaehlerkosten[typ] || ''}
                          onChange={(e) => handleZaehlerkostenChange(typ, e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          disabled={isSaving || isFormLoading}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
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
