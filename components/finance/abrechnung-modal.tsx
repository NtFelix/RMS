"use client"

/**
 * AbrechnungModal - Optimized for performance
 * 
 * This modal has been optimized to use pre-loaded data from the get_abrechnung_modal_data
 * database function, eliminating individual data fetching calls within the modal.
 * 
 * Key optimizations:
 * - Uses pre-structured data passed via props (tenants, rechnungen, wasserzaehlerReadings)
 * - Eliminates redundant API calls during modal initialization
 * - Processes data efficiently using memoized calculations
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 8
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExportAbrechnungDropdown } from "@/components/abrechnung/export-abrechnung-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card imports
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import type { Nebenkosten, Mieter, Wohnung, Rechnung, WasserZaehler, WasserAblesung } from "@/lib/types"; // Updated imports for new water system
import { WATER_METER_TYPES } from "@/lib/zaehler-types";
import { sumZaehlerValues } from "@/lib/zaehler-utils";
import { useEffect, useState, useMemo, useRef } from "react"; // Import useEffect, useState, useMemo, and useRef
import { useToast } from "@/hooks/use-toast";
import { FileDown, Droplet, Landmark, CheckCircle2, AlertCircle, ChevronDown, Archive } from 'lucide-react'; // Added FileDown and other icon imports
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { usePostHog } from "posthog-js/react";

// Function to fetch customer billing address
const fetchCustomerBillingAddress = async () => {
  try {
    const response = await fetch('/api/stripe/customer');
    if (!response.ok) {
      throw new Error('Failed to fetch customer data');
    }
    const data = await response.json();
    return data.customer?.address || null;
  } catch (error) {
    console.error('Error fetching billing address:', error);
    return null;
  }
};
import { isoToGermanDate } from "@/utils/date-calculations"; // New import for number formatting
import type { jsPDF } from 'jspdf'; // Type import for better type safety
import type { CellHookData } from 'jspdf-autotable'; // Type import for autoTable hook data
import { computeWgFactorsByTenant, getApartmentOccupants } from "@/utils/wg-cost-calculations";
import { formatNumber } from "@/utils/format"; // New import for number formatting
import { roundToNearest5 } from "@/lib/utils";
import { calculateRecommendedPrepayment } from "@/utils/abrechnung-calculations";
import type { TenantCalculationResult } from "@/types/optimized-betriebskosten";
// import jsPDF from 'jspdf'; // Removed for dynamic import
// import autoTable from 'jspdf-autotable'; // Removed for dynamic import
// import JSZip from 'jszip'; // Removed for dynamic import

// Explicitly register autoTable plugin // Removed as autoTable will be imported dynamically
// (jsPDF.API as any).autoTable = autoTable;

// Defined in Step 1:

// Local Rechnung interface removed

// Helper function for currency formatting
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

// Financial calculation constants
const PREPAYMENT_BUFFER_MULTIPLIER = 1.1; // 10% buffer for prepayment calculation

const calculateOccupancy = (
  einzug: string | null | undefined,
  auszug: string | null | undefined,
  startdatum: string,
  enddatum: string
): { percentage: number, daysInPeriod: number, daysOccupied: number } => {
  if (!einzug) {
    const totalDays = Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1;
    return { percentage: 0, daysInPeriod: totalDays, daysOccupied: 0 };
  }

  const billingStartDate = new Date(startdatum);
  const billingEndDate = new Date(enddatum);
  const totalDaysInPeriod = Math.ceil((billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 3600 * 24)) + 1;

  const moveInDate = new Date(einzug);
  if (isNaN(moveInDate.getTime()) || moveInDate > billingEndDate) {
    return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
  }

  let moveOutDate: Date | null = null;
  if (auszug) {
    const parsedMoveOut = new Date(auszug);
    if (!isNaN(parsedMoveOut.getTime())) {
      moveOutDate = parsedMoveOut;
    }
  }

  if (moveOutDate && moveOutDate < billingStartDate) {
    return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
  }

  const effectivePeriodStart = moveInDate < billingStartDate ? billingStartDate : moveInDate;
  const effectivePeriodEnd = (!moveOutDate || moveOutDate > billingEndDate) ? billingEndDate : moveOutDate;

  if (effectivePeriodStart > effectivePeriodEnd) {
    return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
  }

  // Calculate actual days occupied (simple day difference)
  const calculatedDaysOccupied = Math.ceil((effectivePeriodEnd.getTime() - effectivePeriodStart.getTime()) / (1000 * 3600 * 24)) + 1;

  const clampedDaysOccupied = Math.max(0, Math.min(calculatedDaysOccupied, totalDaysInPeriod));
  const percentage = totalDaysInPeriod > 0 ? (clampedDaysOccupied / totalDaysInPeriod) * 100 : 0;

  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    daysInPeriod: totalDaysInPeriod,
    daysOccupied: clampedDaysOccupied,
  };
};

interface MonthlyVorauszahlung {
  monthName: string;
  amount: number;
  isActiveMonth: boolean;
}

interface TenantCostDetails {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  apartmentName: string;
  apartmentSize: number;
  costItems: Array<{
    costName: string;
    totalCostForItem: number; // Renamed from totalCost for clarity
    calculationType: string;
    tenantShare: number;
    pricePerSqm?: number; // New field added here
    verteiler?: string | number; // Added for distribution basis display
  }>;
  waterCost: {
    totalWaterCostOverall: number; // Renamed for clarity
    calculationType: string;
    tenantShare: number;
    consumption?: number;
  };
  totalTenantCost: number;
  vorauszahlungen: number; // Added for advance payments
  monthlyVorauszahlungen: MonthlyVorauszahlung[]; // New field for monthly breakdown
  finalSettlement: number; // Added for the final settlement amount
  // Add these new fields:
  occupancyPercentage: number;
  daysOccupied: number;
  daysInBillingPeriod: number;
  recommendedPrepayment?: number; // New field for recommended prepayment
}

interface AbrechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkostenItem: Nebenkosten | null;
  tenants: Mieter[];
  rechnungen: Rechnung[];
  meters?: WasserZaehler[]; // Updated to use new generic meter type
  readings?: WasserAblesung[]; // Updated to use new generic reading type
  ownerName: string;
  ownerAddress: string;
}

export function AbrechnungModal({
  isOpen,
  onClose,
  nebenkostenItem,
  tenants,
  rechnungen,
  meters = [], // Default to empty array
  readings = [], // Default to empty array
  ownerName,
  ownerAddress,
}: AbrechnungModalProps) {
  const posthog = usePostHog();
  const { toast } = useToast();
  const [calculatedTenantData, setCalculatedTenantData] = useState<TenantCostDetails[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Ref for dropdown trigger
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

  // Shared hover effect functions
  const applyDropdownHoverEffect = (isHovering: boolean, isDirectHover: boolean = true) => {
    const trigger = dropdownTriggerRef.current;
    if (!trigger || trigger.disabled) return;

    const intensity = isDirectHover ? 1 : 0.5; // Reduce intensity for indirect hover

    if (isHovering) {
      // Use the same accent color as other dropdown menus
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const accentOpacity = 0.5 + (0.2 * intensity); // 50% to 70% opacity
      trigger.style.backgroundColor = `hsl(${accentColor} / ${accentOpacity})`;
      trigger.style.borderColor = `hsl(${accentColor} / ${accentOpacity + 0.1})`;
    } else {
      // Reset to default - use primary color for consistency
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      trigger.style.backgroundColor = `hsl(${primaryColor})`;
      trigger.style.borderColor = `hsl(${primaryColor})`;
    }
  };

  const applyMainButtonHoverEffect = (isHovering: boolean, isDirectHover: boolean = true, buttonElement?: HTMLButtonElement) => {
    // Find the button element if not provided
    const button = buttonElement || (dropdownTriggerRef.current?.parentElement?.querySelector('button[class*="pr-12"]') as HTMLButtonElement);
    if (!button || button.disabled) return;

    const intensity = isDirectHover ? 1 : 0.3; // Reduce intensity for indirect hover

    if (isHovering) {
      // Apply subtle brightness increase
      button.style.filter = `brightness(${1 + (0.1 * intensity)})`;
      button.style.transform = `scale(${1 + (0.02 * intensity)})`;
    } else {
      // Reset to default
      button.style.filter = 'brightness(1)';
      button.style.transform = 'scale(1)';
    }
  };

  // Higher-order wrapper function to handle export operations with loading state and error handling
  const handleExportOperation = async (
    exportFunction: () => Promise<void>,
    errorTitle: string,
    errorDescription: string
  ) => {
    setIsGeneratingPDF(true);
    try {
      await exportFunction();
    } catch (error) {
      console.error(`Export error:`, error);
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Guard: ensure we always work with an array for tenants
  const safeTenants = Array.isArray(tenants) ? tenants : [];

  // Performance monitoring - log when modal opens with pre-loaded data
  useEffect(() => {
    if (isOpen && nebenkostenItem && tenants?.length > 0) {
      console.log(`[AbrechnungModal] Opened with pre-loaded data: ${tenants?.length || 0} tenants, ${rechnungen?.length || 0} rechnungen, ${meters?.length || 0} meters, ${readings?.length || 0} readings`);
    }
  }, [isOpen, nebenkostenItem, tenants, rechnungen, meters, readings]);

  // Debug: Log tenants whenever they change
  useEffect(() => {
    if (!isOpen) return;
    console.debug('[AbrechnungModal] tenants prop changed', {
      isOpen,
      nebenkostenId: nebenkostenItem?.id,
      tenantsCount: Array.isArray(tenants) ? tenants.length : 'n/a',
      firstTenant: Array.isArray(tenants) && tenants.length > 0 ? {
        id: (tenants[0] as any).id,
        name: (tenants[0] as any).name,
        wohnung_id: (tenants[0] as any).wohnung_id,
      } : null,
    });
  }, [isOpen, nebenkostenItem?.id, tenants]);

  // Calculate WG factors for all tenants (memoized to prevent unnecessary recalculations)
  const wgFactors = useMemo(() => {
    if (!tenants || tenants.length === 0) return {};

    if (!nebenkostenItem?.startdatum || !nebenkostenItem?.enddatum) {
      // Fallback to current year if date range is not available
      return computeWgFactorsByTenant(tenants, new Date().getFullYear());
    }
    return computeWgFactorsByTenant(tenants, nebenkostenItem.startdatum, nebenkostenItem.enddatum);
  }, [tenants, nebenkostenItem?.startdatum, nebenkostenItem?.enddatum]);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loadAllRelevantTenants, setLoadAllRelevantTenants] = useState<boolean>(false); // New state variable

  // Auto-select first tenant when modal opens
  useEffect(() => {
    if (isOpen && safeTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(safeTenants[0].id);
    }
  }, [isOpen, safeTenants, selectedTenantId]);

  // Memoize the price per cubic meter calculation (using water types from zaehlerkosten/zaehlerverbrauch)
  const pricePerCubicMeter = useMemo(() => {
    if (!nebenkostenItem?.zaehlerkosten || !nebenkostenItem?.zaehlerverbrauch) {
      return 0;
    }
    const totalCost = sumZaehlerValues(nebenkostenItem.zaehlerkosten);
    const totalUsage = sumZaehlerValues(nebenkostenItem.zaehlerverbrauch);
    if (totalUsage <= 0) return 0;
    return totalCost / totalUsage;
  }, [nebenkostenItem?.zaehlerkosten, nebenkostenItem?.zaehlerverbrauch]);

  // Use the correct house size from database (gesamtFlaeche) with fallback calculation
  const totalHouseArea = useMemo(() => {
    // First try to use the gesamtFlaeche from nebenkostenItem (from database)
    if (nebenkostenItem?.gesamtFlaeche && nebenkostenItem.gesamtFlaeche > 0) {
      return nebenkostenItem.gesamtFlaeche;
    }

    // Fallback: calculate from tenants data if gesamtFlaeche is not available
    if (!tenants || !Array.isArray(tenants) || tenants.length === 0) return 0;
    return tenants.reduce((sum, tenant) => sum + (tenant?.Wohnungen?.groesse || 0), 0);
  }, [nebenkostenItem?.gesamtFlaeche, tenants]);

  // Import meter calculation utilities at the top level
  // Note: Using require here as this might be refactored to proper import later
  const { getTenantMeterCost } = require('@/utils/water-cost-calculations');

  // Memoize the calculation function to avoid recreating it on every render
  const calculateCostsForTenant = useMemo(() => {
    if (!nebenkostenItem) return null;

    const startdatum = nebenkostenItem.startdatum || '';
    const enddatum = nebenkostenItem.enddatum || '';

    return (tenant: Mieter, pricePerCubicMeter: number): TenantCostDetails => {
      const {
        id: nebenkostenItemId,
        startdatum: itemStartdatum,
        enddatum: itemEnddatum,
        nebenkostenart,
        betrag,
        berechnungsart,
        zaehlerkosten, // JSONB: meter costs by type
        zaehlerverbrauch, // JSONB: meter usage by type
        gesamtFlaeche,
      } = nebenkostenItem!;

      // 1. Call calculateOccupancy
      const { percentage: occupancyPercentage, daysOccupied, daysInPeriod: daysInBillingPeriod } = calculateOccupancy(
        tenant.einzug,
        tenant.auszug,
        itemStartdatum || startdatum,
        itemEnddatum || enddatum
      );

      // (Vorauszahlungen logic remains here - no changes needed for it based on current plan)
      let totalVorauszahlungen = 0;
      const monthlyVorauszahlungenDetails: MonthlyVorauszahlung[] = [];
      const prepaymentSchedule: Array<{ date: Date; amount: number }> = [];
      if (Array.isArray(tenant.nebenkosten)) {
        tenant.nebenkosten.forEach((entry) => {
          if (typeof entry.date === 'string' && typeof entry.amount === 'string') {
            const amountNum = parseFloat(entry.amount);
            const dateObj = new Date(entry.date);
            if (!isNaN(dateObj.getTime()) && !isNaN(amountNum)) {
              prepaymentSchedule.push({ date: dateObj, amount: amountNum });
            }
          }
        });
        prepaymentSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());
      }

      const einzugDate = tenant.einzug ? new Date(tenant.einzug) : null;
      const auszugDate = tenant.auszug ? new Date(tenant.auszug) : null;

      // Calculate prepayments for the actual billing period
      const billingStart = new Date(itemStartdatum || startdatum);
      const billingEnd = new Date(itemEnddatum || enddatum);

      // Generate months within the billing period
      const currentDate = new Date(Date.UTC(billingStart.getUTCFullYear(), billingStart.getUTCMonth(), 1));

      while (currentDate <= billingEnd) {
        const currentMonthStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
        const currentMonthEnd = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0));
        const monthName = GERMAN_MONTHS[currentDate.getUTCMonth()];

        let effectivePrepaymentForMonth = 0;
        const isActiveThisMonth = !!(
          einzugDate && !isNaN(einzugDate.getTime()) &&
          einzugDate <= currentMonthEnd &&
          (!auszugDate || isNaN(auszugDate.getTime()) || auszugDate >= currentMonthStart)
        );

        if (isActiveThisMonth) {
          // Find the base prepayment amount for this month
          let basePrepaymentAmount = 0;
          for (let i = prepaymentSchedule.length - 1; i >= 0; i--) {
            // Check if this prepayment entry's date is within or before the current month
            const prepaymentYear = prepaymentSchedule[i].date.getUTCFullYear();
            const prepaymentMonth = prepaymentSchedule[i].date.getUTCMonth();
            const currentYear = currentDate.getUTCFullYear();
            const currentMonth = currentDate.getUTCMonth();

            // Include prepayment if it's from the same month/year or earlier
            if (prepaymentYear < currentYear ||
              (prepaymentYear === currentYear && prepaymentMonth <= currentMonth)) {
              basePrepaymentAmount = prepaymentSchedule[i].amount;
              break;
            }
          }

          // Calculate occupancy percentage for this specific month
          const monthOccupancy = calculateOccupancy(
            tenant.einzug,
            tenant.auszug,
            currentMonthStart.toISOString().split('T')[0],
            currentMonthEnd.toISOString().split('T')[0]
          );

          // Apply occupancy proration to the prepayment
          effectivePrepaymentForMonth = basePrepaymentAmount * (monthOccupancy.percentage / 100);
          totalVorauszahlungen += effectivePrepaymentForMonth;
        }

        monthlyVorauszahlungenDetails.push({
          monthName: `${monthName} ${currentDate.getUTCFullYear()}`,
          amount: effectivePrepaymentForMonth,
          isActiveMonth: isActiveThisMonth,
        });

        // Move to next month
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      }

      const apartmentSize = tenant.Wohnungen?.groesse || 0;
      const apartmentName = tenant.Wohnungen?.name || 'Unbekannt';

      const costItemsDetails: TenantCostDetails['costItems'] = [];

      if (nebenkostenart && betrag && berechnungsart) {
        const uniqueAptIds = new Set(safeTenants.map(t => t.wohnung_id).filter(Boolean));
        const activeTenantsCount = Math.max(1, safeTenants.length);

        nebenkostenart.forEach((costName, index) => {
          const totalCostForItem = betrag[index] || 0;
          const calcType = (berechnungsart[index] || 'fix').toLowerCase();
          let share = 0;
          let itemPricePerSqm: number | undefined = undefined;
          let verteiler: string | number = '-';

          switch (calcType) {
            case 'pro qm':
            case 'qm':
            case 'pro flaeche':
            case 'pro fläche':
              verteiler = formatNumber(totalHouseArea);
              if (totalHouseArea > 0) {
                itemPricePerSqm = totalCostForItem / totalHouseArea;
                share = itemPricePerSqm * apartmentSize;
              }
              break;
            case 'nach rechnung':
              if (rechnungen) {
                const relevantRechnung = rechnungen.find(
                  (r) => r.mieter_id === tenant.id && r.name === costName
                );
                share = relevantRechnung?.betrag || 0;
                verteiler = '-';
              } else {
                share = 0;
              }
              break;
            case 'pro mieter':
            case 'pro person':
              verteiler = String(activeTenantsCount);
              share = totalCostForItem / activeTenantsCount;
              break;
            case 'pro wohnung':
              verteiler = String(uniqueAptIds.size);
              const totalApartments = uniqueAptIds.size;
              const costPerApartment = totalApartments > 0 ? totalCostForItem / totalApartments : 0;
              share = costPerApartment;
              break;
            case 'pro einheit':
            case 'fix':
              verteiler = '1';
              share = totalCostForItem;
              break;
            default:
              verteiler = '-';
              share = 0;
              break;
          }

          // Apply tenant-level proration
          let tenantShareForItem = 0;
          const type = calcType.toLowerCase();
          // Define all calculation types that use area/WG factor split
          const areaBasedCalcTypes = ['pro qm', 'qm', 'pro flaeche', 'pro fläche', 'pro wohnung'];
          if (areaBasedCalcTypes.includes(type)) {
            // Use the precomputed WG factor for area-based and 'pro wohnung' calculations
            const wgFactor = wgFactors[tenant.id] ?? (occupancyPercentage / 100);
            tenantShareForItem = share * wgFactor;
          } else {
            // For all other types, use occupancy proration
            tenantShareForItem = share * (occupancyPercentage / 100);
          }

          costItemsDetails.push({
            costName: costName || `Kostenart ${index + 1}`,
            totalCostForItem,
            calculationType: calcType,
            tenantShare: tenantShareForItem,
            pricePerSqm: itemPricePerSqm,
            verteiler,
          });
        });
      }

      const tenantTotalForRegularItems = costItemsDetails.reduce((sum, item) => sum + item.tenantShare, 0);

      // Calculate total meter costs from zaehlerkosten JSONB (sum all types)
      const totalMeterCost = sumZaehlerValues(zaehlerkosten);
      const totalMeterConsumption = sumZaehlerValues(zaehlerverbrauch);

      // Use the new generic meter calculation system
      const tenantMeterCostData = getTenantMeterCost(
        tenant.id,
        safeTenants,
        meters,
        readings,
        totalMeterCost,
        totalMeterConsumption, // Total building consumption from Nebenkosten
        itemStartdatum || startdatum,
        itemEnddatum || enddatum
      );

      const tenantWaterCost = {
        totalWaterCostOverall: totalMeterCost, // Keeping property name for now to avoid breaking TenantCostDetails
        calculationType: "nach Verbrauch (Zähler)",
        tenantShare: tenantMeterCostData?.costShare || 0,
        consumption: tenantMeterCostData?.totalConsumption || 0, // Updated property name
      };

      const totalTenantCost = tenantTotalForRegularItems + tenantWaterCost.tenantShare;
      const finalSettlement = totalTenantCost - totalVorauszahlungen;

      // Calculate recommended prepayment for next year based on current year's settlement
      let recommendedPrepayment = 0;
      if (totalTenantCost > 0) {
        // Use the centralized function to ensure consistency
        const mockTenantCalculation = { totalCosts: totalTenantCost } as TenantCalculationResult;
        recommendedPrepayment = calculateRecommendedPrepayment(mockTenantCalculation);
      }

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        apartmentId: tenant.wohnung_id || 'N/A',
        apartmentName: apartmentName,
        apartmentSize: apartmentSize,
        costItems: costItemsDetails,
        waterCost: tenantWaterCost,
        totalTenantCost: totalTenantCost,
        vorauszahlungen: totalVorauszahlungen,
        monthlyVorauszahlungen: monthlyVorauszahlungenDetails,
        finalSettlement: finalSettlement,
        occupancyPercentage,
        daysOccupied,
        daysInBillingPeriod,
        recommendedPrepayment: Math.round(recommendedPrepayment * 100) / 100, // Round to 2 decimal places
      };
    };
  }, [nebenkostenItem, wgFactors, rechnungen, meters, readings, totalHouseArea, safeTenants, getTenantMeterCost]);

  // Optimized useEffect that uses pre-loaded data and memoized calculations
  useEffect(() => {
    if (!isOpen || !nebenkostenItem || !tenants || tenants.length === 0 || !calculateCostsForTenant) {
      setCalculatedTenantData([]);
      return;
    }

    if (loadAllRelevantTenants) {
      const allTenantsData = safeTenants.map(tenant => calculateCostsForTenant(tenant, pricePerCubicMeter));
      setCalculatedTenantData(allTenantsData);
    } else {
      if (!selectedTenantId) {
        setCalculatedTenantData([]); // Clear data if no tenant is selected
        return;
      }

      const activeTenant = safeTenants.find(t => t.id === selectedTenantId);
      if (!activeTenant) {
        setCalculatedTenantData([]); // Clear data if selected tenant not found
        return;
      }
      const singleTenantCalculatedData = calculateCostsForTenant(activeTenant, pricePerCubicMeter);
      setCalculatedTenantData([singleTenantCalculatedData]);
    }
  }, [isOpen, tenants, selectedTenantId, loadAllRelevantTenants, calculateCostsForTenant, pricePerCubicMeter]);

  // Optimized PDF generation function with better error handling
  const generateSettlementPDF = async (
    tenantData: TenantCostDetails | TenantCostDetails[],
    nebenkostenItem: Nebenkosten,
    ownerName: string,
    ownerAddress: string
  ) => {
    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    // console.log('jspdf-autotable module:', autoTableModule); // Keep for now

    if (autoTableModule && typeof autoTableModule.applyPlugin === 'function') {
      autoTableModule.applyPlugin(jsPDF);
    } else {
      // Fallback or error if applyPlugin is not found
      console.error("jspdf-autotable module does not have applyPlugin function!", autoTableModule);
      // As a deeper fallback, try to attach the default export if it's the autoTable function
      if (autoTableModule && typeof autoTableModule.default === 'function') {
        console.log("Attempting to attach autoTableModule.default to jsPDF.API.autoTable");
        (jsPDF.API as any).autoTable = autoTableModule.default;
      } else {
        // If neither works, the PDF generation will likely fail, but this provides some diagnostic.
        toast({
          title: "Fehler bei PDF-Initialisierung",
          description: "Das PDF AutoTable-Plugin konnte nicht initialisiert werden. Die PDF-Generierung schlägt möglicherweise fehl.",
          variant: "destructive",
        });
        return; // Stop further execution if plugin can't be initialized
      }
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let startY = 20; // Initial Y position for content

    // Fetch billing address for the PDF
    const billingAddress = await fetchCustomerBillingAddress();

    const processTenant = (singleTenantData: TenantCostDetails) => {
      // Check if new page is needed for multiple tenants
      if (startY > pageHeight - 50) {
        doc.addPage();
        startY = 20;
      }

      // Use the reusable PDF generation function and update startY with the returned position
      startY = generateSingleTenantPDF(doc, singleTenantData, nebenkostenItem, ownerName, ownerAddress, startY, billingAddress);
    };

    // Ensure dataForProcessing is definitely an array.
    const dataForProcessing: TenantCostDetails[] = Array.isArray(tenantData) ? tenantData : [tenantData];

    if (dataForProcessing.length === 0) {
      console.error("No tenant data available to generate PDF.");
      toast({
        title: "Fehler bei PDF-Generierung",
        description: "Keine Mieterdaten für den Export vorhanden.",
        variant: "destructive",
      });
      return;
    }

    let filename = "";
    const currentPeriod = `${nebenkostenItem.startdatum}_${nebenkostenItem.enddatum}`; // Use date range for filename
    if (dataForProcessing.length === 1) {
      const singleTenant = dataForProcessing[0];
      processTenant(singleTenant);
      filename = `Abrechnung_${currentPeriod}_${singleTenant.tenantName.replace(/\s+/g, '_')}.pdf`;
    } else { // Multiple tenants
      dataForProcessing.forEach((td, index) => {
        processTenant(td);
        // Add a new page for the next tenant (except for the last one)
        if (index < dataForProcessing.length - 1) {
          doc.addPage();
          startY = 20; // Reset Y position for the new page
        }
      });
      filename = `Abrechnung_${currentPeriod}_Alle_Mieter.pdf`;
    }
    doc.save(filename);

    posthog?.capture('pdf_exported', {
      type: 'settlement',
      tenant_count: dataForProcessing.length,
      period: currentPeriod
    });
  };

  // Reusable function to generate PDF content for a single tenant
  const generateSingleTenantPDF = (
    doc: jsPDF, // jsPDF instance
    tenantData: TenantCostDetails,
    nebenkostenItem: Nebenkosten,
    ownerName: string,
    ownerAddress: string,
    initialStartY: number = 20,
    billingAddress?: any // Optional billing address from Stripe
  ): number => {
    let startY = initialStartY;

    // Owner Information & Title
    doc.setFontSize(10);
    doc.text(ownerName, 20, startY);
    startY += 6;
    doc.text(ownerAddress, 20, startY);
    startY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Jahresabrechnung", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
    startY += 10;

    // Settlement Period
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: ${isoToGermanDate(nebenkostenItem.startdatum)} - ${isoToGermanDate(nebenkostenItem.enddatum)}`, 20, startY);
    startY += 6;

    // Property Details
    const propertyDetails = `Objekt: ${nebenkostenItem.Haeuser?.name || 'N/A'}, ${tenantData.apartmentName}, ${tenantData.apartmentSize} qm`;
    doc.text(propertyDetails, 20, startY);
    startY += 6;

    // Tenant Details
    const tenantDetails = `Mieter: ${tenantData.tenantName}`;
    doc.text(tenantDetails, 20, startY);
    startY += 10;

    // Costs Table
    const tableColumn = ["Leistungsart", "Gesamtkosten\nin €", "Verteiler\nEinheit/ qm", "Kosten\nPro qm", "Kostenanteil\nIn €"];
    const tableRows: any[][] = [];

    tenantData.costItems.forEach(item => {
      const row = [
        item.costName,
        formatCurrency(item.totalCostForItem),
        item.verteiler || '-',
        item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-',
        formatCurrency(item.tenantShare)
      ];
      tableRows.push(row);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: { bottom: 0.3 },
        lineColor: [0, 0, 0]
      },
      styles: {
        fontSize: 9,
        cellPadding: 1.5,
        lineWidth: 0
      },
      bodyStyles: {
        lineWidth: { bottom: 0.1 },
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { halign: 'left' }, // Leistungsart - left aligned
        1: { halign: 'right' }, // Gesamtkosten in € - right aligned
        2: { halign: 'right' }, // Verteiler - right aligned
        3: { halign: 'right' }, // Kosten Pro qm - right aligned
        4: { halign: 'right' }  // Kostenanteil In € - right aligned
      },
      willDrawCell: function (data: CellHookData) {
        // Right-align header text for columns 1-4
        if (data.section === 'head' && data.column.index >= 1) {
          data.cell.styles.halign = 'right';
        }
      },
      tableWidth: (doc as any).internal.pageSize.getWidth() - 40,
      margin: { left: 20, right: 20 }
    });

    let tableFinalY = (doc as any).lastAutoTable?.finalY;
    if (typeof tableFinalY === 'number') {
      startY = tableFinalY + 6;
    } else {
      startY += 10;
    }

    // Draw "Betriebskosten gesamt" summary text aligned with table columns
    const sumOfTotalCostForItem = tenantData.costItems.reduce((sum, item) => sum + item.totalCostForItem, 0);
    const sumOfTenantSharesFromCostItems = tenantData.costItems.reduce((sum, item) => sum + item.tenantShare, 0);

    // Add spacing before summary text
    startY += 8;

    // Draw "Betriebskosten gesamt" summary - simplified approach
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    // Use fixed positions based on table width and margins to ensure alignment
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - 40; // Same as table margin
    const leftMargin = 20;

    // Calculate column positions based on typical table layout
    const col1Start = leftMargin; // Leistungsart
    const col2Start = leftMargin + (tableWidth * 0.25); // Gesamtkosten (25% of table width)
    const col3Start = leftMargin + (tableWidth * 0.45); // Verteiler (45% of table width)  
    const col4Start = leftMargin + (tableWidth * 0.65); // Kosten Pro qm (65% of table width)
    const col5Start = leftMargin + (tableWidth * 0.85); // Kostenanteil (85% of table width)
    const col5End = leftMargin + tableWidth; // Right edge of Kostenanteil column

    // No background or borders - just plain text with proper alignment

    // Add the text with proper alignment
    doc.setTextColor(0, 0, 0);

    // Label in first column
    doc.text("Betriebskosten gesamt:", col1Start, startY, { align: 'left' });

    // Total cost in Gesamtkosten column (right-aligned within column)
    doc.text(formatCurrency(sumOfTotalCostForItem), col3Start + 15.65, startY, { align: 'right' });

    // Tenant share in Kostenanteil column (right-aligned within column)
    doc.text(formatCurrency(sumOfTenantSharesFromCostItems), col5End, startY, { align: 'right' });

    doc.setFont("helvetica", "normal");

    startY += 12;

    // Add water cost summary paragraph
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    // Get water cost data for this tenant
    const tenantWaterShare = tenantData.waterCost.tenantShare;
    const tenantWaterConsumption = tenantData.waterCost.consumption || 0;
    // Get building water totals from zaehlerkosten/zaehlerverbrauch JSONB
    const buildingWaterCost = sumZaehlerValues(nebenkostenItem.zaehlerkosten);
    const buildingWaterConsumption = sumZaehlerValues(nebenkostenItem.zaehlerverbrauch);
    const pricePerCubicMeterCalc = buildingWaterConsumption > 0 ? buildingWaterCost / buildingWaterConsumption : 0;

    // Water cost summary with aligned columns
    doc.text("Wasserkosten:", col1Start, startY, { align: 'left' });
    doc.text(`${tenantWaterConsumption} m³`, col3Start + 15.65, startY, { align: 'right' });
    doc.text(`${formatCurrency(pricePerCubicMeterCalc)} / m3`, col4Start + 15, startY, { align: 'right' });
    doc.text(formatCurrency(tenantWaterShare), col5End, startY, { align: 'right' });

    startY += 16;

    // Total line - sum of operating costs and water costs
    const totalTenantCosts = sumOfTenantSharesFromCostItems + tenantWaterShare;
    doc.text("Gesamt:", col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(totalTenantCosts), col5End, startY, { align: 'right' });

    startY += 8;

    // Advance payments line
    doc.text("Vorauszahlungen:", col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(tenantData.vorauszahlungen), col5End, startY, { align: 'right' });

    startY += 8;

    // Final settlement line (Nachzahlung or Guthaben)
    const isPositiveSettlement = tenantData.finalSettlement >= 0;
    const settlementLabel = isPositiveSettlement ? "Nachzahlung:" : "Guthaben:";
    const settlementAmount = Math.abs(tenantData.finalSettlement);
    doc.text(settlementLabel, col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(settlementAmount), col5End, startY, { align: 'right' });

    startY += 8;

    // Suggested monthly Vorauszahlung line (rounded to nearest 5)
    const suggestedVorauszahlung = tenantData.recommendedPrepayment ? roundToNearest5(tenantData.recommendedPrepayment) : 0;
    const monthlyVorauszahlung = suggestedVorauszahlung / 12; // Convert annual to monthly

    // Calculate next month start date (at least 14 days from now)
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const formattedDate = format(nextMonth, 'dd.MM.yy');

    doc.setFont("helvetica", "bold");
    const label = `Vorauszahlung ab ${formattedDate}`;
    doc.text(label, col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(monthlyVorauszahlung), col5End, startY, { align: 'right' });

    doc.setFont("helvetica", "normal");

    startY += 10;

    // Add date and location row at the end
    startY += 15; // Add some space before the final row
    const currentDate = new Date();
    const formattedToday = format(currentDate, 'dd.MM.yyyy');

    // Format location from billing address
    let location = '';
    if (billingAddress) {
      const parts = [];
      if (billingAddress.city) parts.push(billingAddress.city);
      location = parts.join(' ');
    }

    if (location) {
      doc.setFont("helvetica", "normal");
      doc.text(`${location}, den ${formattedToday}`, col1Start, startY, { align: 'left' });
    } else {
      doc.setFont("helvetica", "normal");
      doc.text(`den ${formattedToday}`, col1Start, startY, { align: 'left' });
    }

    return startY; // Return the final Y position
  };

  // ZIP generation function for multiple PDFs
  const generateSettlementZIP = async (
    tenantDataArray: TenantCostDetails[],
    nebenkostenItem: Nebenkosten,
    ownerName: string,
    ownerAddress: string
  ) => {
    const JSZip = (await import('jszip')).default;
    const { default: jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');

    if (autoTableModule && typeof autoTableModule.applyPlugin === 'function') {
      autoTableModule.applyPlugin(jsPDF);
    } else if (autoTableModule && typeof autoTableModule.default === 'function') {
      (jsPDF.API as any).autoTable = autoTableModule.default;
    }

    const zip = new JSZip();
    const currentPeriod = `${nebenkostenItem.startdatum}_${nebenkostenItem.enddatum}`;

    // Generate individual PDFs for each tenant
    const billingAddress = await fetchCustomerBillingAddress();

    for (const tenantData of tenantDataArray) {
      const doc = new jsPDF();

      // Use the reusable PDF generation function
      generateSingleTenantPDF(doc, tenantData, nebenkostenItem, ownerName, ownerAddress, 20, billingAddress);

      const pdfBlob = doc.output('blob');
      const filename = `Abrechnung_${currentPeriod}_${tenantData.tenantName.replace(/\s+/g, '_')}.pdf`;
      zip.file(filename, pdfBlob);
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `Abrechnung_${currentPeriod}_Alle_Mieter.zip`;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Memoize tenant options to avoid recreating on every render
  const tenantOptions: ComboboxOption[] = useMemo(() =>
    (Array.isArray(tenants) ? tenants : []).map(tenant => ({
      value: tenant.id,
      label: tenant.name,
    })), [tenants]
  );

  if (!isOpen || !nebenkostenItem) {
    return null;
  }

  const handleLoadAllTenants = () => {
    setLoadAllRelevantTenants(true);
    setSelectedTenantId(null); // Clear single tenant selection
  };

  const handleTenantSelect = (value: string | null) => {
    setLoadAllRelevantTenants(false); // Disable "load all" mode
    setSelectedTenantId(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Betriebskostenabrechnung {isoToGermanDate(nebenkostenItem.startdatum)} bis {isoToGermanDate(nebenkostenItem.enddatum)} - Haus: {nebenkostenItem.Haeuser?.name || 'N/A'}
          </DialogTitle>
          <DialogDescription>
            Detaillierte Betriebskostenabrechnung für den Zeitraum {isoToGermanDate(nebenkostenItem.startdatum)} bis {isoToGermanDate(nebenkostenItem.enddatum)} mit Aufschlüsselung nach Mietern.
            {tenants.length > 0 && (
              <span className="block text-sm text-green-600 mt-1">
                ✓ Daten für {tenants.length} Mieter erfolgreich geladen
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {tenants && tenants.length > 0 && (
          <div className="mt-4 mb-4"> {/* Adjusted margin for consistency */}
            <label htmlFor="tenant-combobox-trigger" className="block text-sm font-medium text-foreground mb-1">
              Mieter auswählen
            </label>
            <div className="flex items-center space-x-2">
              <CustomCombobox
                options={tenantOptions}
                value={selectedTenantId}
                onChange={handleTenantSelect} // Updated onChange handler
                placeholder="Mieter auswählen..."
                searchPlaceholder="Mieter suchen..."
                emptyText="Kein Mieter gefunden."
                width="w-full"
              />
              <Button variant="default" onClick={handleLoadAllTenants}> {/* Added onClick handler */}
                Alle relevanten Mieter laden
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-6">
          {/* Message display logic updated */}
          {(!tenants || tenants.length === 0) && nebenkostenItem && (
            <p className="text-muted-foreground">Keine Mieter für diese Abrechnung vorhanden.</p>
          )}
          {(!tenants || tenants.length === 0) && !nebenkostenItem && (
            <p className="text-muted-foreground">Keine Nebenkostenabrechnungsdaten oder Mieter vorhanden.</p>
          )}
          {tenants && tenants.length > 0 && !selectedTenantId && !loadAllRelevantTenants && (
            <p className="text-muted-foreground">
              Bitte wählen Sie einen Mieter aus oder laden Sie alle relevanten Mieter, um die Details anzuzeigen.
            </p>
          )}
          {tenants && tenants.length > 0 && selectedTenantId && calculatedTenantData.length === 0 && !loadAllRelevantTenants && (
            <p className="text-muted-foreground">Berechne Daten für ausgewählten Mieter...</p>
          )}
          {tenants && tenants.length > 0 && loadAllRelevantTenants && calculatedTenantData.length === 0 && (
            <p className="text-muted-foreground">Alle relevanten Mieter werden geladen...</p>
          )}

          {calculatedTenantData.map((tenantData) => (
            <div key={tenantData.tenantId} className="mb-6 p-4 border rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Mieter: <span className="font-bold">{tenantData.tenantName}</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-1">Wohnung: {tenantData.apartmentName}</p>
              <p className="text-sm text-muted-foreground mb-3">Fläche: {tenantData.apartmentSize} qm</p>

              {/* WG Roommates Info */}
              {!loadAllRelevantTenants && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">Wohngemeinschaft (WG) Aufteilung</h4>
                  <div className="space-y-2">
                    {(() => {
                      // Get all roommates in this apartment
                      const roommates = getApartmentOccupants(tenants, tenantData.apartmentId);

                      if (roommates.length <= 1) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Keine Mitbewohner in dieser Wohnung gefunden.
                          </p>
                        );
                      }

                      // Use the pre-computed wgFactors

                      return (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Diese Wohnung wird von {roommates.length} Personen bewohnt.
                            Die Flächenkosten werden entsprechend der Anwesenheit aufgeteilt:
                          </p>
                          <div className="mt-2 space-y-1">
                            {roommates.map(rm => (
                              <div key={rm.id} className="flex justify-between items-center text-sm">
                                <span className={rm.id === tenantData.tenantId ? "font-medium text-primary" : "text-muted-foreground"}>
                                  {rm.name} {rm.id === tenantData.tenantId && "(Sie)"}
                                </span>
                                <span className="font-mono">
                                  {Math.round((wgFactors[rm.id] || 0) * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">Hinweis:</span> Die Prozentsätze ergeben zusammen 100% der Wohnungskosten.
                            Die Aufteilung basiert auf der Anwesenheit im Abrechnungszeitraum.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Occupancy Progress Bar and Text */}
              <div className="my-3">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">
                    Anwesenheit im Abrechnungszeitraum ({tenantData.daysOccupied} / {tenantData.daysInBillingPeriod} Tage)
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {formatNumber(tenantData.occupancyPercentage)}%
                  </span>
                </div>
                <Progress value={tenantData.occupancyPercentage} className="w-full h-2" />
              </div>

              <hr className="my-3 border-border" />
              {/* Container for Info Cards */}
              <div className="flex flex-wrap justify-start gap-4 my-4">
                {/* Wasserkosten Info Card */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Card className="flex-grow min-w-[220px] sm:min-w-[250px]">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wasserkosten</CardTitle>
                        <Droplet className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-semibold text-foreground">
                          {formatCurrency(tenantData.waterCost.tenantShare)}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-sm">
                    <div className="space-y-1">
                      <div>
                        <strong>Berechnungsmethode:</strong> {tenantData.waterCost.calculationType}
                      </div>
                      <div>
                        <strong>Gesamte Wasserkosten:</strong> {formatCurrency(tenantData.waterCost.totalWaterCostOverall)}
                      </div>
                      <div>
                        <strong>Anteil Mieter:</strong> {formatCurrency(tenantData.waterCost.tenantShare)}
                      </div>
                      {tenantData.waterCost.consumption != null && ( // Check for null or undefined
                        <div>
                          <strong>Verbrauch:</strong> {tenantData.waterCost.consumption} m³
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {/* Vorauszahlungen Info Card */}
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Card className="flex-grow min-w-[220px] sm:min-w-[250px]">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vorauszahlungen</CardTitle>
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-semibold text-foreground">
                          {formatCurrency(tenantData.vorauszahlungen)}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 text-sm p-3">
                    <h4 className="font-semibold mb-2 text-center text-sm">Monatliche Vorauszahlungen</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between border-b border-gray-200 pb-1">
                        <span className="text-xs font-medium">Monat</span>
                        <span className="text-xs font-medium">Zahlung</span>
                      </div>
                      {tenantData.monthlyVorauszahlungen.map((payment) => (
                        <div key={payment.monthName} className="flex justify-between py-0.5">
                          <span className="text-xs">{payment.monthName}</span>
                          <span className="text-xs font-medium">
                            {payment.isActiveMonth ? formatCurrency(payment.amount) : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {/* Final Settlement Info Card */}
                {(() => {
                  const isNachzahlung = tenantData.finalSettlement >= 0;
                  const SettlementIcon = isNachzahlung ? AlertCircle : CheckCircle2;
                  const titleColor = isNachzahlung ? "text-red-700" : "text-green-700";
                  const amountColor = isNachzahlung ? "text-red-700" : "text-green-700";
                  const iconColor = isNachzahlung ? "text-red-500" : "text-green-500";

                  return (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Card className="flex-grow min-w-[220px] sm:min-w-[250px] cursor-pointer">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className={`text-sm font-medium ${titleColor}`}>
                              {isNachzahlung ? "Nachzahlung" : "Guthaben"}
                            </CardTitle>
                            <SettlementIcon className={`h-5 w-5 ${iconColor}`} />
                          </CardHeader>
                          <CardContent>
                            <div className={`text-2xl font-semibold ${amountColor}`}>
                              {formatCurrency(tenantData.finalSettlement)}
                            </div>
                          </CardContent>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-96 text-sm p-3">
                        <h4 className="font-semibold mb-1">Abrechnungsdetails</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Gesamtkosten {isoToGermanDate(nebenkostenItem?.startdatum)} bis {isoToGermanDate(nebenkostenItem?.enddatum)}:</span>
                            <span>{formatCurrency(tenantData.totalTenantCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Geleistete Vorauszahlungen:</span>
                            <span>{formatCurrency(tenantData.vorauszahlungen)}</span>
                          </div>
                          <div className="h-px bg-border my-1"></div>
                          <div className="flex justify-between font-semibold">
                            <span>{isNachzahlung ? "Nachzahlung" : "Guthaben"}:</span>
                            <span className={amountColor}>{formatCurrency(tenantData.finalSettlement)}</span>
                          </div>

                          {tenantData.recommendedPrepayment !== undefined && (
                            <>
                              <div className="h-px bg-border my-1"></div>
                              <h4 className="font-semibold mt-1 mb-1">Empfehlung für nächsten Zeitraum</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span>Empfohlene Vorauszahlung:</span>
                                  <span className="font-semibold">{formatCurrency(tenantData.recommendedPrepayment)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Monatliche Rate:</span>
                                  <span>{formatCurrency(tenantData.recommendedPrepayment / 12)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  (basierend auf {formatCurrency(tenantData.totalTenantCost)} + {Math.round((PREPAYMENT_BUFFER_MULTIPLIER - 1) * 100)}% Puffer)
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })()}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Kostenart</TableHead>
                    <TableHead className="text-foreground">Abrechnungsart</TableHead>
                    <TableHead className="text-foreground">Preis/qm</TableHead> {/* New Header */}
                    <TableHead className="text-right text-foreground">Anteil Mieter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantData.costItems.map((item, index) => (
                    <TableRow key={index} className={`${index % 2 === 0 ? "bg-muted/30" : ""} h-8`}>
                      <TableCell className="py-0.5 px-3 align-top h-8">{item.costName}</TableCell>
                      <TableCell className="py-0.5 px-3 align-top h-8">{item.calculationType}</TableCell>
                      <TableCell className="py-0.5 px-3 align-top h-8">{item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-'}</TableCell> {/* New Cell */}
                      <TableCell className="text-right py-0.5 px-3 align-top h-8">{formatCurrency(item.tenantShare)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Wasserkosten row removed from here */}
                  <TableRow className="font-semibold bg-primary/10 border-t-2 border-border h-10">
                    <TableCell className="py-0.5 px-3 text-primary h-10">Gesamtkosten Mieter</TableCell>
                    <TableCell className="py-0.5 px-3 text-primary h-10"></TableCell> {/* For Abrechnungsart */}
                    <TableCell className="py-0.5 px-3 text-primary h-10"></TableCell> {/* New empty cell for Preis/qm */}
                    <TableCell className="text-right py-0.5 px-3 text-primary h-10">{formatCurrency(tenantData.totalTenantCost)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-8 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPDF}>
            Schließen
          </Button>

          {/* Export Button with Dropdown - Matches Create New button style */}
          <ExportAbrechnungDropdown
            onPdfClick={() => handleExportOperation(
              () => generateSettlementPDF(calculatedTenantData, nebenkostenItem!, ownerName, ownerAddress),
              "Fehler bei PDF-Generierung",
              "Ein Fehler ist beim Erstellen der PDF aufgetreten."
            )}
            onZipClick={async () => {
              try {
                if (!calculateCostsForTenant) {
                  toast({
                    title: "Fehler",
                    description: "Kostenberechnung konnte nicht initialisiert werden.",
                    variant: "destructive",
                  });
                  return;
                }

                // Always use all tenants for ZIP export, not just the filtered/selected ones
                const allTenants = tenants || [];

                // Calculate costs for all tenants using the memoized function
                const tenantCosts = allTenants.map(tenant =>
                  calculateCostsForTenant(tenant, pricePerCubicMeter)
                );

                await handleExportOperation(
                  () => generateSettlementZIP(tenantCosts, nebenkostenItem!, ownerName, ownerAddress),
                  "Fehler bei ZIP-Generierung",
                  "Ein Fehler ist beim Erstellen der ZIP-Datei aufgetreten."
                );
              } catch (error) {
                console.error('Error during ZIP export:', error);
                toast({
                  title: "Fehler",
                  description: "Bei der Vorbereitung des Exports ist ein Fehler aufgetreten.",
                  variant: "destructive",
                });
              }
            }}
            isGeneratingPDF={isGeneratingPDF}
            hasMultipleTenants={tenants?.length > 1}
            disabled={!tenants?.length}
            buttonText={isGeneratingPDF ? "Wird exportiert..." : "Exportieren"}
            buttonVariant="default"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
