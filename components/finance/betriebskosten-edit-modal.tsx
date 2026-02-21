"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { PlusCircle, Trash2, GripVertical, CalendarPlus, CalendarMinus, FileInput, BookDashed, Droplets, Thermometer, Flame, Gauge, Zap, Fuel, X, CalendarClock, Banknote, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
function ConfettiSideCannons() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[100]">
      <div className="absolute -left-10 bottom-0 rotate-[35deg]">🎊</div>
      <div className="absolute -right-10 bottom-0 -rotate-[35deg]">🎊</div>
    </div>
  );
}
import type { Mieter, Nebenkosten, RechnungSql } from "@/lib/types";
import { ZAEHLER_CONFIG, ZaehlerTyp } from "@/lib/zaehler-types";
import { convertZaehlerkostenToStrings } from "@/lib/zaehler-utils";
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
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten";
import { getMieterByHausIdAction } from "@/app/mieter-actions";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { SortableCostItem, type CostItem, type RechnungEinzel } from "./sortable-cost-item";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getDefaultDateRange, validateDateRange, germanToIsoDate, isoToGermanDate, formatPeriodDuration } from "@/utils/date-calculations";

const SuccessStep = ({ data, onClose, onOverview }: { data: Nebenkosten | null, onClose: () => void, onOverview: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
      <div className="relative">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shadow-xl shadow-green-500/10"
        >
          <Check className="w-10 h-10" strokeWidth={3} />
        </motion.div>
        <ConfettiSideCannons />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Abrechnung gespeichert!</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Die Betriebskosten für das Objekt <span className="font-semibold text-foreground">{data?.house_name || data?.Haeuser?.name || 'Unbekannt'}</span> im Zeitraum <span className="font-semibold text-foreground">{isoToGermanDate(data?.startdatum)} - {isoToGermanDate(data?.enddatum)}</span> wurden erfolgreich erfasst.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-4">
        <Button variant="outline" onClick={onClose} className="h-12 rounded-2xl border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all">
          Schließen
        </Button>
        <Button onClick={onOverview} className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 border-none transition-all active:scale-[0.98]">
          Zur Übersicht
        </Button>
      </div>
    </div>
  );
};

// Re-export for other components that might need it
export type { CostItem, RechnungEinzel };
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

const METER_ICON_MAP = {
  droplet: Droplets,
  thermometer: Thermometer,
  flame: Flame,
  gauge: Gauge,
  zap: Zap,
  fuel: Fuel,
};

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
    openOperatingCostsOverviewModal,
  } = useModalStore();

  const [startdatum, setStartdatum] = useState("");
  const [enddatum, setEnddatum] = useState("");
  const [zaehlerkosten, setZaehlerkosten] = useState<Record<string, string>>({});
  const [hausId, setHausId] = useState("");
  const [vorauszahlungsArt, setVorauszahlungsArt] = useState<'soll' | 'ist'>('soll');
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedHausMieter, setSelectedHausMieter] = useState<Mieter[]>([]);
  const [rechnungen, setRechnungen] = useState<Record<string, RechnungEinzel[]>>({});
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [modalNebenkostenData, setModalNebenkostenData] = useState<Nebenkosten | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [savedItemData, setSavedItemData] = useState<Nebenkosten | null>(null);
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
    setCurrentStep(1);
    closeBetriebskostenModal();
  };

  const handleCancelClick = () => {
    setCurrentStep(1);
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

        // Set zaehlerkosten if available
        if (latest.zaehlerkosten) {
          setZaehlerkosten(convertZaehlerkostenToStrings(latest.zaehlerkosten));
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
      setVorauszahlungsArt('soll');
      const initialHausId = forNewEntry && betriebskostenModalHaeuser && betriebskostenModalHaeuser.length > 0 ? betriebskostenModalHaeuser[0].id : "";
      setHausId(initialHausId);
      setCurrentStep(1);

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
              setVorauszahlungsArt(fetchedData.vorauszahlungs_art === 'ist' ? 'ist' : 'soll');
              // Load zaehlerkosten
              if (fetchedData.zaehlerkosten) {
                setZaehlerkosten(convertZaehlerkostenToStrings(fetchedData.zaehlerkosten));
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

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!hausId) {
        toast({ title: "Haus erforderlich", description: "Bitte wählen Sie ein Haus aus.", variant: "destructive" });
        return;
      }
      const validation = validateDateRange(startdatum, enddatum);
      if (!validation.isValid) {
        toast({
          title: "Ungültiger Zeitraum",
          description: validation.errors.range || "Bitte überprüfen Sie den Abrechnungszeitraum.",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

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

    // Parse and validate zaehlerkosten values
    const nonEmptyEntries = Object.entries(zaehlerkosten).filter(([, value]) => value?.trim());
    const hasInvalidZaehlerkosten = nonEmptyEntries.some(([, value]) => isNaN(parseFloat(value)));

    if (hasInvalidZaehlerkosten) {
      toast({ title: "Ungültige Eingabe", description: "Zählerkosten müssen gültige Zahlen sein.", variant: "destructive" });
      setIsSaving(false); setBetriebskostenModalDirty(true);
      return;
    }

    const parsedZaehlerkosten = Object.fromEntries(
      nonEmptyEntries.map(([key, value]) => [key, parseFloat(value)])
    );

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
      vorauszahlungs_art: vorauszahlungsArt,
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

      // Only show success and move to step 3 if everything was successful
      toast({
        title: "Erfolg",
        description: "Betriebskosten erfolgreich gespeichert",
        variant: "success"
      });
      setBetriebskostenModalDirty(false); // Clear dirty state before closing

      // Store the result for step 3 overview
      if (response.data) {
        setSavedItemData(response.data);
      } else {
        // Fallback for updates where response data might be partial
        setSavedItemData({
          ...(modalNebenkostenData || {}),
          startdatum: germanToIsoDate(startdatum),
          enddatum: germanToIsoDate(enddatum),
          haeuser_id: hausId,
          vorauszahlungs_art: vorauszahlungsArt,
          nebenkostenart: costItems.map(i => i.art),
          betrag: costItems.map(i => parseFloat(i.betrag) || 0),
          berechnungsart: costItems.map(i => i.berechnungsart),
          zaehlerkosten: Object.fromEntries(
            Object.entries(zaehlerkosten).map(([k, v]) => [k, parseFloat(v) || 0])
          )
        } as Nebenkosten);
      }

      setCurrentStep(3);

      if (betriebskostenModalOnSuccess) {
        betriebskostenModalOnSuccess();
      }
      useOnboardingStore.getState().completeStep('create-bill-form');
      // No longer close modal immediately - wait for Step 3
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

  const handleRemoveZaehlerkosten = (zaehlerTyp: string) => {
    setZaehlerkosten(prev => {
      const next = { ...prev };
      delete next[zaehlerTyp];
      return next;
    });
    setBetriebskostenModalDirty(true);
  };

  const handleHausChange = (newHausId: string | null) => {
    setHausId(newHausId || '');
    setBetriebskostenModalDirty(true);
  };

  const addMeterCostSelect = useMemo(() => {
    const availableTypes = (Object.keys(ZAEHLER_CONFIG) as ZaehlerTyp[])
      .filter(typ => zaehlerkosten[typ] === undefined);

    if (availableTypes.length === 0) return null;

    return (
      <div className="flex justify-start">
        <Select
          value=""
          onValueChange={(value) => handleZaehlerkostenChange(value as ZaehlerTyp, "")}
        >
          <SelectTrigger className="w-full sm:w-[280px] h-10 rounded-full border-dashed border-2 bg-transparent hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-all text-muted-foreground">
            <PlusCircle className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Zähler-Kostenstelle hinzufügen" />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((typ) => {
              const config = ZAEHLER_CONFIG[typ];
              const Icon = METER_ICON_MAP[config.icon as keyof typeof METER_ICON_MAP];
              return (
                <SelectItem key={typ} value={typ} className="group">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground group-focus:text-white transition-colors" />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  }, [zaehlerkosten, handleZaehlerkostenChange]);

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
        className="sm:max-w-4xl md:max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2rem] border-none shadow-2xl"
        onAttemptClose={attemptClose}
        isDirty={isBetriebskostenModalDirty}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar Stepper - Y-Axis Timeline */}
            <div className="hidden sm:flex w-64 flex-col bg-transparent p-8 space-y-10 shrink-0">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">Nebenkosten</h2>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">Abrechnungs-Assistent</p>
              </div>

              <div className="flex flex-col gap-0">
                {[
                  { id: 1, label: 'Basis-Daten', desc: 'Haus & Zeitraum' },
                  { id: 2, label: 'Kostenstellen', desc: 'Zähler & Positionen' },
                  { id: 3, label: 'Bestätigung', desc: 'Fertigstellung' }
                ].map((step, idx, arr) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  const isLast = idx === arr.length - 1;

                  return (
                    <div key={step.id} className="relative flex gap-5 pb-10 last:pb-0">
                      {!isLast && (
                        <div className={`absolute left-[17px] top-10 w-[2px] h-[calc(100%-40px)] transition-colors duration-500 ${isCompleted ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'}`} />
                      )}

                      <div className="relative flex-none">
                        <motion.div
                          initial={false}
                          animate={{
                            backgroundColor: isCompleted || isActive ? '#0F172A' : 'transparent', // Darker navy for maximum contrast in light mode
                            borderColor: isCompleted || isActive ? '#0F172A' : 'rgba(156, 163, 175, 0.4)',
                          }}
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-300 ${isCompleted || isActive ? 'text-white' : 'text-slate-400'}`}
                        >
                          {isCompleted ? <Check className="w-5 h-5" strokeWidth={3} /> : step.id}
                        </motion.div>
                      </div>

                      <div className="flex flex-col pt-1">
                        <span className={`text-sm font-bold transition-colors duration-300 ${isActive ? 'text-primary' : isCompleted ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 font-medium leading-tight mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 sm:border-none">
                <div className="space-y-0.5">
                  <h2 className="text-2xl font-black tracking-tight text-foreground/90">
                    {currentStep === 1 ? 'Objekt & Zeitraum' : currentStep === 2 ? 'Kostenaufstellung' : 'Erfolg'}
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto relative min-h-0 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="space-y-6 p-6"
                    >
                      <div className="p-6 space-y-8 bg-gray-50/30 dark:bg-gray-900/10 border border-gray-200/60 dark:border-gray-800/60 rounded-[2rem]">
                        {/* House Selection */}
                        <div className="space-y-2.5">
                          <LabelWithTooltip htmlFor="formHausId" infoText="Wählen Sie das Haus aus, für das die Nebenkostenabrechnung erstellt wird.">
                            <span className="text-sm font-semibold tracking-tight">Immobilie auswählen *</span>
                          </LabelWithTooltip>
                          {isFormLoading ? <Skeleton className="h-11 w-full rounded-xl" /> : (
                            <CustomCombobox width="w-full" options={houseOptions} value={hausId} onChange={handleHausIdChange} placeholder="Haus auswählen..." searchPlaceholder="Haus suchen..." emptyText="Kein Haus gefunden." disabled={isSaving || isFormLoading} />
                          )}
                        </div>

                        {/* Date Range Selection */}
                        <div className="space-y-4 pt-2">
                          <LabelWithTooltip htmlFor="formDates" infoText="Legen Sie den Abrechnungszeitraum fest.">
                            <span className="text-sm font-semibold tracking-tight">Abrechnungszeitraum *</span>
                          </LabelWithTooltip>
                          {isFormLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Skeleton className="h-11 w-full rounded-xl" />
                              <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <DateRangePicker
                                startDate={startdatum}
                                endDate={enddatum}
                                onStartDateChange={handleStartdatumChange}
                                onEndDateChange={handleEnddatumChange}
                                disabled={isSaving || isFormLoading}
                                showPeriodInfo={false}
                              />

                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-11 w-full rounded-2xl border-gray-200/60 dark:border-gray-800/60 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm"
                                  onClick={() => {
                                    const currentStartYear = startdatum ? parseInt(startdatum.split('.')[2]) : new Date().getFullYear();
                                    const newYear = currentStartYear - 1;
                                    setStartdatum(`01.01.${newYear}`);
                                    setEnddatum(`31.12.${newYear}`);
                                    setBetriebskostenModalDirty(true);
                                  }}
                                  disabled={isSaving || isFormLoading}
                                >
                                  <CalendarMinus className="w-4 h-4 mr-2 text-muted-foreground" />
                                  <span className="font-medium">-1 Jahr</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-11 w-full rounded-2xl border-gray-200/60 dark:border-gray-800/60 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm"
                                  onClick={() => {
                                    const currentStartYear = startdatum ? parseInt(startdatum.split('.')[2]) : new Date().getFullYear();
                                    const newYear = currentStartYear + 1;
                                    setStartdatum(`01.01.${newYear}`);
                                    setEnddatum(`31.12.${newYear}`);
                                    setBetriebskostenModalDirty(true);
                                  }}
                                  disabled={isSaving || isFormLoading}
                                >
                                  <CalendarPlus className="w-4 h-4 mr-2 text-primary" />
                                  <span className="font-medium">+1 Jahr</span>
                                </Button>
                              </div>

                              {(() => {
                                const validation = validateDateRange(startdatum, enddatum);
                                return validation.isValid && validation.periodDays && (
                                  <div className="text-sm text-blue-700 dark:text-blue-300 p-0 rounded-none animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                      <span className="font-medium">Abrechnungszeitraum:</span> {formatPeriodDuration(startdatum, enddatum)}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Vorauszahlungsmethode */}
                        <div className="space-y-4 pt-2">
                          <LabelWithTooltip htmlFor="formVorauszahlungsArt" infoText="Soll: Verwendet den vereinbarten Vorauszahlungsbetrag aus dem Mieterprofil. Ist: Verwendet die tatsächlich gebuchten Zahlungen.">
                            <span className="text-sm font-semibold tracking-tight">Zahlungsmethode</span>
                          </LabelWithTooltip>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => { setVorauszahlungsArt('soll'); setBetriebskostenModalDirty(true); }}
                              disabled={isSaving || isFormLoading}
                              className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all disabled:opacity-50 ${vorauszahlungsArt === 'soll' ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10' : 'bg-white dark:bg-white/5 border-gray-200/60 dark:border-gray-800/60 hover:border-primary/30'}`}
                            >
                              <div className={`p-2.5 rounded-xl transition-colors ${vorauszahlungsArt === 'soll' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground group-hover:text-primary'} shadow-sm`}>
                                <CalendarClock className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <p className={`font-bold transition-colors ${vorauszahlungsArt === 'soll' ? 'text-primary' : 'text-foreground'}`}>Soll-Verfahren</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Geplante Vorauszahlungen</p>
                              </div>
                              {vorauszahlungsArt === 'soll' && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-300">
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setVorauszahlungsArt('ist'); setBetriebskostenModalDirty(true); }}
                              disabled={isSaving || isFormLoading}
                              className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all disabled:opacity-50 ${vorauszahlungsArt === 'ist' ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10' : 'bg-white dark:bg-white/5 border-gray-200/60 dark:border-gray-800/60 hover:border-primary/30'}`}
                            >
                              <div className={`p-2.5 rounded-xl transition-colors ${vorauszahlungsArt === 'ist' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground group-hover:text-primary'} shadow-sm`}>
                                <Banknote className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <p className={`font-bold transition-colors ${vorauszahlungsArt === 'ist' ? 'text-primary' : 'text-foreground'}`}>Ist-Verfahren</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Reale Bankeingänge</p>
                              </div>
                              {vorauszahlungsArt === 'ist' && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-300">
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="space-y-8 p-6"
                    >
                      {/* Meter Costs Section */}
                      <div className="space-y-4 p-6 bg-gray-50/30 dark:bg-gray-900/10 border border-gray-200/60 dark:border-gray-800/60 rounded-[2rem]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                            <Gauge className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold tracking-tight">Verbrauchskosten</h3>
                            <p className="text-xs text-muted-foreground">Hausweite Gesamtkosten für Zähler</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AnimatePresence mode="popLayout">
                            {(Object.keys(ZAEHLER_CONFIG) as ZaehlerTyp[])
                              .filter(typ => zaehlerkosten[typ] !== undefined)
                              .map((typ) => {
                                const config = ZAEHLER_CONFIG[typ];
                                const Icon = METER_ICON_MAP[config.icon as keyof typeof METER_ICON_MAP];

                                return (
                                  <motion.div
                                    key={typ}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="group flex flex-col gap-3 p-4 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-[2rem]"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-[1rem] bg-primary text-primary-foreground transition-all duration-300 shadow-sm border border-primary/20">
                                          <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold">{config.label}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                        onClick={() => handleRemoveZaehlerkosten(typ)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    <div className="relative mt-auto">
                                      <NumberInput
                                        id={`zaehlerkosten-${typ}`}
                                        value={zaehlerkosten[typ] || ''}
                                        onChange={(e) => handleZaehlerkostenChange(typ, e.target.value)}
                                        placeholder="0,00"
                                        step="0.01"
                                        disabled={isSaving || isFormLoading}
                                        className="h-11 pl-4 pr-10 rounded-2xl bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800/80 focus:ring-primary/20 transition-all font-medium text-lg"
                                      />
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                          </AnimatePresence>
                        </div>

                        {addMeterCostSelect && (
                          <motion.div layout>
                            {addMeterCostSelect}
                          </motion.div>
                        )}
                      </div>

                      {/* Kostenaufstellung Section */}
                      <div className="space-y-4 p-6 bg-gray-50/30 dark:bg-gray-900/10 border border-gray-200/60 dark:border-gray-800/60 rounded-[2rem]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                              <PlusCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold tracking-tight">Betriebskosten</h3>
                              <p className="text-xs text-muted-foreground">Alle weiteren umlagefähigen Positionen</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-0 space-y-3">
                          {isFormLoading ? (
                            Array.from({ length: 3 }).map((_, idx) => (
                              <div key={`skel-cost-${idx}`} className="flex flex-col gap-2 py-2">
                                <Skeleton className="h-14 w-full rounded-2xl" />
                              </div>
                            ))
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="space-y-3">
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
                              </div>
                            </DndContext>
                          )}

                          <Button
                            type="button"
                            onClick={addCostItem}
                            variant="ghost"
                            className="w-full h-11 rounded-[2rem] border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary font-semibold mt-4"
                            disabled={isFormLoading || isSaving}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Weitere Kostenposition hinzufügen
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, type: "spring" }}
                    >
                      <SuccessStep
                        data={savedItemData}
                        onClose={closeBetriebskostenModal}
                        onOverview={() => {
                          if (savedItemData) {
                            closeBetriebskostenModal();
                            const selectedHaus = betriebskostenModalHaeuser?.find(h => h.id === hausId);
                            // Provide default values for mandatory OptimizedNebenkosten fields
                            // The modal will fetch the real values using the id anyway
                            const enrichedData: OptimizedNebenkosten = {
                              ...(savedItemData as any),
                              haus_name: selectedHaus?.name || 'Unbekanntes Haus',
                              gesamt_flaeche: (savedItemData as any).gesamt_flaeche || 0,
                              anzahl_wohnungen: (savedItemData as any).anzahl_wohnungen || 0,
                              anzahl_mieter: (savedItemData as any).anzahl_mieter || 0,
                              user_id: savedItemData.user_id || '',
                            };
                            openOperatingCostsOverviewModal(enrichedData);
                          }
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <DialogFooter className="px-8 py-6 bg-transparent border-none gap-3 mt-auto">
                {currentStep === 1 ? (
                  <>
                    <Button type="button" variant="ghost" onClick={handleCancelClick} disabled={isSaving || isFormLoading} className="rounded-2xl h-11 px-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800">
                      Abbrechen
                    </Button>
                    <Button type="button" onClick={handleNextStep} disabled={isSaving || isFormLoading} className="rounded-2xl h-11 px-8 font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
                      Weiter
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </>
                ) : currentStep === 2 ? (
                  <>
                    <Button type="button" variant="ghost" onClick={handlePrevStep} disabled={isSaving || isFormLoading} className="rounded-2xl h-11 px-6 font-semibold flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Zurück
                    </Button>
                    <div className="flex-1" />
                    <Button type="submit" disabled={isSaving || isFetchingTenants || isFormLoading} className="rounded-2xl h-11 px-10 font-bold shadow-lg shadow-primary/25 border-none transition-all active:scale-[0.98]">
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Wird gespeichert...
                        </div>
                      ) : (isFormLoading || isFetchingTenants ? "Laden..." : "Speichern & Abschließen")}
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
