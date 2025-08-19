"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card imports
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { Nebenkosten, Mieter, Wohnung, Rechnung, Wasserzaehler } from "@/lib/data-fetching"; // Added Rechnung to import
import { useEffect, useState } from "react"; // Import useEffect and useState
import { useToast } from "@/hooks/use-toast";
import { FileDown, Droplet, Landmark, CheckCircle2, AlertCircle } from 'lucide-react'; // Added FileDown and other icon imports
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/utils/format"; // New import for number formatting
import { computeWgFactorsByTenant, getApartmentOccupants } from "@/utils/wg-cost-calculations";
// import jsPDF from 'jspdf'; // Removed for dynamic import
// import autoTable from 'jspdf-autotable'; // Removed for dynamic import

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

const calculateOccupancy = (einzug: string | null | undefined, auszug: string | null | undefined, abrechnungsjahr: number): { percentage: number, daysInYear: number, daysOccupied: number } => {
  const daysInBillingYear = 360; // Fixed for 30/360 convention

  if (!einzug) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  const actualBillingYearStartDate = new Date(Date.UTC(abrechnungsjahr, 0, 1));
  const actualBillingYearEndDate = new Date(Date.UTC(abrechnungsjahr, 11, 31, 23, 59, 59, 999));

  const moveInDate = new Date(einzug);
  if (isNaN(moveInDate.getTime()) || moveInDate > actualBillingYearEndDate) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  let moveOutDate: Date | null = null;
  if (auszug) {
    const parsedMoveOut = new Date(auszug);
    if (!isNaN(parsedMoveOut.getTime())) {
      moveOutDate = parsedMoveOut;
    }
  }

  if (moveOutDate && moveOutDate < actualBillingYearStartDate) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  const effectivePeriodStart = moveInDate < actualBillingYearStartDate ? actualBillingYearStartDate : moveInDate;
  const effectivePeriodEnd = (!moveOutDate || moveOutDate > actualBillingYearEndDate) ? actualBillingYearEndDate : moveOutDate;

  if (effectivePeriodStart > effectivePeriodEnd) {
    return { percentage: 0, daysInYear: daysInBillingYear, daysOccupied: 0 };
  }

  let y1 = effectivePeriodStart.getUTCFullYear();
  let m1 = effectivePeriodStart.getUTCMonth();
  let d1 = effectivePeriodStart.getUTCDate();

  let y2 = effectivePeriodEnd.getUTCFullYear();
  let m2 = effectivePeriodEnd.getUTCMonth();
  let d2 = effectivePeriodEnd.getUTCDate();

  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;

  let calculatedDaysOccupied = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1;

  calculatedDaysOccupied = Math.max(0, calculatedDaysOccupied);
  calculatedDaysOccupied = Math.min(calculatedDaysOccupied, daysInBillingYear);

  const percentage = (calculatedDaysOccupied / daysInBillingYear) * 100;

  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    daysInYear: daysInBillingYear,
    daysOccupied: calculatedDaysOccupied,
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
  daysInBillingYear: number;
  recommendedPrepayment?: number; // New field for recommended prepayment
}

interface AbrechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkostenItem: Nebenkosten | null;
  tenants: Mieter[];
  rechnungen: Rechnung[]; // Assumed new prop
  wasserzaehlerReadings?: Wasserzaehler[];
  ownerName: string;
  ownerAddress: string;
  // wohnungen prop is removed as Mieter type now includes Wohnungen directly with name and groesse
}

export function AbrechnungModal({
  isOpen,
  onClose,
  nebenkostenItem,
  tenants,
  rechnungen, // Destructured assumed new prop
  wasserzaehlerReadings,
  ownerName,
  ownerAddress,
}: AbrechnungModalProps) {
  const { toast } = useToast();
  const [calculatedTenantData, setCalculatedTenantData] = useState<TenantCostDetails[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loadAllRelevantTenants, setLoadAllRelevantTenants] = useState<boolean>(false); // New state variable

  useEffect(() => {
    if (!isOpen || !nebenkostenItem || !tenants || tenants.length === 0) {
      setCalculatedTenantData([]);
      return;
    }

    const pricePerCubicMeter = (nebenkostenItem.wasserkosten && nebenkostenItem.wasserverbrauch && nebenkostenItem.wasserverbrauch > 0)
      ? nebenkostenItem.wasserkosten / nebenkostenItem.wasserverbrauch
      : 0;

    // Helper function for calculation logic (extracted to avoid repetition)
    const calculateCostsForTenant = (tenant: Mieter, pricePerCubicMeter: number): TenantCostDetails => {
      const {
        id: nebenkostenItemId,
        jahr,
        nebenkostenart,
        betrag,
        berechnungsart,
        wasserkosten, // Total building water cost
        gesamtFlaeche,
      } = nebenkostenItem!;

      const abrechnungsjahr = Number(jahr);
      // Precompute WG factors per tenant for this billing year (per apartment, monthly-weighted)
      const wgFactorsByTenant = computeWgFactorsByTenant(tenants, abrechnungsjahr);

      // 1. Call calculateOccupancy
      const { percentage: occupancyPercentage, daysOccupied, daysInYear: daysInBillingYear } = calculateOccupancy(tenant.einzug, tenant.auszug, abrechnungsjahr);

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

      for (let month = 0; month < 12; month++) {
        const currentMonthStart = new Date(Date.UTC(abrechnungsjahr, month, 1));
        const currentMonthEnd = new Date(Date.UTC(abrechnungsjahr, month + 1, 0));
        const monthName = GERMAN_MONTHS[month];
        let effectivePrepaymentForMonth = 0;
        const isActiveThisMonth = !!(
          einzugDate && !isNaN(einzugDate.getTime()) &&
          einzugDate <= currentMonthEnd &&
          (!auszugDate || isNaN(auszugDate.getTime()) || auszugDate >= currentMonthStart)
        );
        if (isActiveThisMonth) {
          for (let i = prepaymentSchedule.length - 1; i >= 0; i--) {
            if (prepaymentSchedule[i].date <= currentMonthStart) {
              effectivePrepaymentForMonth = prepaymentSchedule[i].amount;
              break;
            }
          }
          totalVorauszahlungen += effectivePrepaymentForMonth;
        }
        monthlyVorauszahlungenDetails.push({
          monthName,
          amount: effectivePrepaymentForMonth,
          isActiveMonth: isActiveThisMonth,
        });
      }
      // End Vorauszahlungen

      const totalHouseArea = gesamtFlaeche && gesamtFlaeche > 0
        ? gesamtFlaeche
        : tenants.reduce((sum, t) => sum + (t.Wohnungen?.groesse || 0), 0);
      const apartmentSize = tenant.Wohnungen?.groesse || 0;
      const apartmentName = tenant.Wohnungen?.name || 'Unbekannt';

      const costItemsDetails: TenantCostDetails['costItems'] = [];

      if (nebenkostenart && betrag && berechnungsart) {
        nebenkostenart.forEach((costName, index) => {
          const totalCostForItem = betrag[index] || 0;
          const calcType = berechnungsart[index] || 'fix';
          let share = 0;
          let itemPricePerSqm: number | undefined = undefined;

          switch (calcType.toLowerCase()) {
            case 'pro qm':
            case 'qm':
            case 'pro flaeche':
            case 'pro fläche':
              if (totalHouseArea > 0) {
                  itemPricePerSqm = totalCostForItem / totalHouseArea;
                  // Apartment annual share before tenant-level WG split
                  share = itemPricePerSqm * apartmentSize;
              } else {
                  share = 0;
              }
              break;
            case 'nach rechnung':
              if (rechnungen) {
                const relevantRechnung = rechnungen.find(
                  (r) => r.mieter_id === tenant.id && r.name === costName
                );
                share = relevantRechnung?.betrag || 0;
              } else {
                share = 0;
              }
              break;
            case 'pro mieter':
            case 'pro person':
              // Divide total cost by number of tenants for per-tenant calculation
              const activeTenantsCount = Math.max(1, tenants.length);
              share = totalCostForItem / activeTenantsCount;
              break;
            case 'pro wohnung':
              // For 'pro Wohnung', split total cost equally among all apartments first
              const uniqueAptIds = new Set(tenants.map(t => t.wohnung_id).filter(Boolean));
              const totalApartments = uniqueAptIds.size;
              const costPerApartment = totalApartments > 0 ? totalCostForItem / totalApartments : 0;
              share = costPerApartment; // This will be further split by WG factor
              break;
            case 'pro einheit':
            case 'fix':
            default:
              share = totalCostForItem;
              break;
          }

          // Apply tenant-level proration
          let tenantShareForItem = 0;
          const type = calcType.toLowerCase();
          if (type === 'pro qm' || type === 'qm' || type === 'pro flaeche' || type === 'pro fläche' || type === 'pro wohnung') {
            // For area-based and 'pro wohnung' items, split the apartment's share among roommates by WG factor
            const wgFactor = wgFactorsByTenant[tenant.id] ?? (occupancyPercentage / 100);
            tenantShareForItem = share * wgFactor;
          } else {
            // For all other types, keep occupancy-based proration
            tenantShareForItem = share * (occupancyPercentage / 100);
          }

          costItemsDetails.push({
            costName: costName || `Kostenart ${index + 1}`,
            totalCostForItem,
            calculationType: calcType,
            tenantShare: tenantShareForItem,
            pricePerSqm: itemPricePerSqm,
          });
        });
      }

      const tenantTotalForRegularItems = costItemsDetails.reduce((sum, item) => sum + item.tenantShare, 0);

      const tenantReading = wasserzaehlerReadings?.find(r => r.mieter_id === tenant.id && r.nebenkosten_id === nebenkostenItemId);
      const individualConsumption = tenantReading?.verbrauch || 0;
      const waterShare = individualConsumption * pricePerCubicMeter;
      const waterCalcType = "nach Verbrauch";

      const tenantWaterCost = {
        totalWaterCostOverall: wasserkosten || 0,
        calculationType: waterCalcType,
        tenantShare: waterShare,
        consumption: individualConsumption,
      };

      const totalTenantCost = tenantTotalForRegularItems + tenantWaterCost.tenantShare;
      const finalSettlement = totalTenantCost - totalVorauszahlungen;

      // Calculate recommended prepayment for next year based on current year's settlement
      const recommendedPrepayment = totalTenantCost > 0 
        ? totalTenantCost * PREPAYMENT_BUFFER_MULTIPLIER 
        : 0;

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
        daysInBillingYear,
        recommendedPrepayment: Math.round(recommendedPrepayment * 100) / 100, // Round to 2 decimal places
      };
    };

    if (loadAllRelevantTenants) {
      const allTenantsData = tenants.map(tenant => calculateCostsForTenant(tenant, pricePerCubicMeter));
      setCalculatedTenantData(allTenantsData);
    } else {
      if (!selectedTenantId) {
        setCalculatedTenantData([]); // Clear data if no tenant is selected
        return;
      }

      const activeTenant = tenants.find(t => t.id === selectedTenantId);
      if (!activeTenant) {
        setCalculatedTenantData([]); // Clear data if selected tenant not found
        return;
      }
      const singleTenantCalculatedData = calculateCostsForTenant(activeTenant, pricePerCubicMeter);
      setCalculatedTenantData([singleTenantCalculatedData]);
    }
  }, [isOpen, nebenkostenItem, tenants, rechnungen, selectedTenantId, loadAllRelevantTenants, wasserzaehlerReadings]); // Added rechnungen to dependency array

  const generateSettlementPDF = async ( // Changed to async
    tenantData: TenantCostDetails | TenantCostDetails[],
    nebenkostenItem: Nebenkosten,
    ownerName: string, // Now a required parameter
    ownerAddress: string // Now a required parameter
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

    const processTenant = (singleTenantData: TenantCostDetails) => {
      // Reset startY for each tenant if it's a new page
      // This check is important if processTenant is called multiple times for the same document instance.
      // However, if a new page is added *before* calling processTenant (e.g., in a loop for multiple tenants),
      // startY should be reset there. Let's assume startY is managed correctly before this call for new pages.
      if (startY > pageHeight - 50) { // Check if new page is needed (50 as buffer)
        doc.addPage();
        startY = 20;
      }

          // 1. Owner Information & Title
      doc.setFontSize(10);
      doc.text(ownerName, 20, startY);
      startY += 6;
      doc.text(ownerAddress, 20, startY);
      startY += 10;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Jahresabrechnung", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
      startY += 10;

      // 2. Settlement Period
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Zeitraum: 01.01.${Number(nebenkostenItem.jahr)} - 31.12.${Number(nebenkostenItem.jahr)}`, 20, startY);
      startY += 6;

      // 3. Property Details
      const propertyDetails = `Objekt: ${nebenkostenItem.Haeuser?.name || 'N/A'}, ${singleTenantData.apartmentName}, ${singleTenantData.apartmentSize} qm`;
      doc.text(propertyDetails, 20, startY);
      startY += 10;

      // 4. Costs Table
      const tableColumn = ["Leistungsart", "Gesamtkosten in €", "Verteiler Einheit /qm etc.", "Kosten Pro qm", "Kostenanteil In €"];
      const tableRows: any[][] = [];

      singleTenantData.costItems.forEach(item => {
        const row = [
          item.costName,
          formatCurrency(item.totalCostForItem), // Gesamtkosten in €
          item.calculationType, // Verteiler Einheit /qm etc.
          item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-', // Kosten Pro qm
          formatCurrency(item.tenantShare) // Kostenanteil In €
        ];
        tableRows.push(row);
      });

      // Note: The separate "Wasserkosten" row that was here has been removed.
      // If "Digitaler Wasserzähler" or similar is a cost item, it will be included above.
      // Specific tenant water consumption costs will be detailed separately below this table.

      // Calculate sums for the footer row
      const sumOfTotalCostForItem = singleTenantData.costItems.reduce((sum, item) => sum + item.totalCostForItem, 0);
      // This sum represents the tenant's share of the general operating costs listed in costItems.
      // It does NOT yet include their specific water consumption costs, which are handled by singleTenantData.waterCost.tenantShare
      const sumOfTenantSharesFromCostItems = singleTenantData.costItems.reduce((sum, item) => sum + item.tenantShare, 0);

      // "Betriebskosten gesamt" row is removed from here and will be drawn manually after the table.

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0] },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: 'right' }, // Gesamtkosten in €
          3: { halign: 'right' }, // Kosten Pro qm
          4: { halign: 'right' }  // Kostenanteil In €
        },
        margin: { left: 20 } // Set left margin for the table
      });

      let tableFinalY = (doc as any).lastAutoTable?.finalY;
      if (typeof tableFinalY === 'number') {
        startY = tableFinalY + 6; // Space after table
      } else {
        startY += 10; // Fallback spacing
        console.error("Error: doc.lastAutoTable.finalY was not available after autoTable call. Using default spacing.");
      }

      // Draw "Betriebskosten gesamt" sums manually below the table
      const lastTable = (doc as any).lastAutoTable;
      // Draw "Betriebskosten gesamt" sums manually below the table, aligned with columns
      let sumsDrawnSuccessfully = false;

      if (lastTable && Array.isArray(lastTable.columns) && lastTable.settings?.margin) {
        const col0 = lastTable.columns[0];
        const col1 = lastTable.columns[1];
        const col4 = lastTable.columns[4];

        if (col0 && typeof col0.x === 'number' &&
            col1 && typeof col1.x === 'number' && typeof col1.width === 'number' &&
            col4 && typeof col4.x === 'number' && typeof col4.width === 'number') {

          const leistungsartX = col0.x;
          const gesamtkostenX = col1.x;
          const gesamtkostenWidth = col1.width;
          const kostenanteilX = col4.x;
          const kostenanteilWidth = col4.width;

          doc.setFontSize(9); // Match table body font size
          doc.setFont("helvetica", "bold");

          const labelText = "Betriebskosten gesamt: ";
          const sum1Text = formatCurrency(sumOfTotalCostForItem);
          const labelX = col0.x; // Start of first column for the label

          // Draw label and first sum together
          doc.text(labelText + sum1Text, labelX, startY, { align: 'left' });

          // Draw sum for "Kostenanteil In €" column (sum2) aligned to its column
          doc.text(
            formatCurrency(sumOfTenantSharesFromCostItems),
            kostenanteilX + kostenanteilWidth,
            startY,
            { align: 'right' }
          );

          startY += 8; // Space after the sum line
          doc.setFont("helvetica", "normal");
          sumsDrawnSuccessfully = true;
        }
      }

      if (!sumsDrawnSuccessfully) {
        // Fallback if table column data isn't available or valid
        console.error("Could not retrieve valid column data to draw 'Betriebskosten gesamt' sums accurately. Using improved fallback.");
        doc.setFontSize(9); // Consistent font size with primary attempt
        doc.setFont("helvetica", "bold");

        // Fallback: Label and first sum together, second sum on far right
        const fallbackLabelX = 20;
        const fallbackSum2X = doc.internal.pageSize.getWidth() - 20; // Right margin

        const labelAndSum1Text = `Betriebskosten gesamt: ${formatCurrency(sumOfTotalCostForItem)}`;
        doc.text(labelAndSum1Text, fallbackLabelX, startY, {align: 'left'});

        doc.text(
          formatCurrency(sumOfTenantSharesFromCostItems),
          fallbackSum2X,
          startY,
          { align: 'right' }
        );

        startY += 8;
        doc.setFont("helvetica", "normal");
      }

      // Unused finalY block and vestigial font changes removed.
      // startY is now correctly managed by tableFinalY and the subsequent drawing of "Betriebskosten gesamt" sums.

      // 4.5. Wasserzähler Data Section
      // startY was updated after drawing "Betriebskosten gesamt" sums (startY += 8).
      // Add a consistent small space before this new section.
      startY += 5;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Wasserverbrauch", 20, startY);
      startY += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const totalBuildingWaterCost = nebenkostenItem.wasserkosten || 0;
      const totalBuildingWaterConsumption = nebenkostenItem.wasserverbrauch || 0;
      const pricePerCubicMeter = totalBuildingWaterConsumption > 0 ? totalBuildingWaterCost / totalBuildingWaterConsumption : 0;

      // Display tenant's water consumption details
      // TODO: For future enhancement, if data for old/new meters (Verbrauch alter WZ / neuer WZ) is available,
      // it should be presented here as per the user's original example image.
      // Current data provides total consumption for the period.
      doc.text(`Gesamter Wasserverbrauch Mieter:`, 20, startY);
      doc.text(`${singleTenantData.waterCost.consumption ? formatNumber(singleTenantData.waterCost.consumption) : '0,00'} m³`, 100, startY);
      startY += 6;

      doc.text(`Kosten pro m³:`, 20, startY);
      doc.text(formatCurrency(pricePerCubicMeter), 100, startY);
      startY += 6;

      doc.text(`Kostenanteil Wasserverbrauch Mieter:`, 20, startY);
      doc.text(formatCurrency(singleTenantData.waterCost.tenantShare), 100, startY, { align: "left" }); // Explicitly left, though default
      startY += 10;


      // 5. Final Summary
      doc.setFontSize(10);
      doc.text("Gesamtkosten:", 20, startY);
      doc.text(formatCurrency(singleTenantData.totalTenantCost), doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      startY += 6;

      doc.text("Vorauszahlungen:", 20, startY); // Changed from "bereits geleistete Zahlungen"
      doc.text(formatCurrency(singleTenantData.vorauszahlungen), doc.internal.pageSize.getWidth() - 20, startY, { align: "right" }); // Used singleTenantData.vorauszahlungen
      startY += 6;
      
      // Updated Nachzahlung/Guthaben display
      const settlementText = singleTenantData.finalSettlement >= 0 ? "Nachzahlung:" : "Guthaben:";
      doc.setFont("helvetica", "bold");
      doc.text(settlementText, 20, startY);
      doc.text(formatCurrency(singleTenantData.finalSettlement), doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      doc.setFont("helvetica", "normal");
      startY += 10;
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
      const currentJahr = Number(nebenkostenItem.jahr); // Ensure jahr is treated as number for filename
    if (dataForProcessing.length === 1) {
      const singleTenant = dataForProcessing[0];
      processTenant(singleTenant);
        filename = `Abrechnung_${currentJahr}_${singleTenant.tenantName.replace(/\s+/g, '_')}.pdf`;
    } else { // Multiple tenants
      dataForProcessing.forEach((td, index) => {
        processTenant(td);
        if (index < dataForProcessing.length - 1) {
          doc.addPage();
          startY = 20; // Reset Y for new page - This should be handled within processTenant or immediately after addPage if needed
        }
      });
        filename = `Abrechnung_${currentJahr}_Alle_Mieter.pdf`;
    }
    doc.save(filename);
  };

  if (!isOpen || !nebenkostenItem) {
    return null;
  }

  const tenantOptions: ComboboxOption[] = tenants.map(tenant => ({
    value: tenant.id,
    label: tenant.name,
  }));

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Betriebskostenabrechnung {Number(nebenkostenItem.jahr)} - Haus: {nebenkostenItem.Haeuser?.name || 'N/A'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detaillierte Betriebskostenabrechnung für das Jahr {Number(nebenkostenItem.jahr)} mit Aufschlüsselung nach Mietern.
          </DialogDescription>
        </DialogHeader>

        {tenants && tenants.length > 0 && (
          <div className="mt-4 mb-4"> {/* Adjusted margin for consistency */}
            <label htmlFor="tenant-combobox-trigger" className="block text-sm font-medium text-gray-700 mb-1">
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
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Mieter: <span className="font-bold">{tenantData.tenantName}</span>
              </h3>
              <p className="text-sm text-gray-600 mb-1">Wohnung: {tenantData.apartmentName}</p>
              <p className="text-sm text-gray-600 mb-3">Fläche: {tenantData.apartmentSize} qm</p>

              {/* WG Roommates Info */}
              {!loadAllRelevantTenants && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Wohngemeinschaft (WG) Aufteilung</h4>
                  <div className="space-y-2">
                    {(() => {
                      // Get all roommates in this apartment
                      const roommates = getApartmentOccupants(tenants, tenantData.apartmentId);
                      
                      if (roommates.length <= 1) {
                        return (
                          <p className="text-sm text-gray-600">
                            Keine Mitbewohner in dieser Wohnung gefunden.
                          </p>
                        );
                      }

                      // Get WG factors for this apartment
                      const wgFactors = computeWgFactorsByTenant(tenants, Number(nebenkostenItem?.jahr || new Date().getFullYear()));
                      
                      return (
                        <>
                          <p className="text-sm text-gray-600">
                            Diese Wohnung wird von {roommates.length} Personen bewohnt. 
                            Die Flächenkosten werden entsprechend der Anwesenheit aufgeteilt:
                          </p>
                          <div className="mt-2 space-y-1">
                            {roommates.map(rm => (
                              <div key={rm.id} className="flex justify-between items-center text-sm">
                                <span className={rm.id === tenantData.tenantId ? "font-medium text-blue-700" : "text-gray-600"}>
                                  {rm.name} {rm.id === tenantData.tenantId && "(Sie)"}
                                </span>
                                <span className="font-mono">
                                  {Math.round((wgFactors[rm.id] || 0) * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
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
                  <span className="text-sm font-medium text-gray-700">
                    Anwesenheit im Abrechnungsjahr ({tenantData.daysOccupied} / {tenantData.daysInBillingYear} Tage)
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {formatNumber(tenantData.occupancyPercentage)}%
                  </span>
                </div>
                <Progress value={tenantData.occupancyPercentage} className="w-full h-2" />
              </div>

              <hr className="my-3 border-gray-200" />
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
                        <div className="text-2xl font-semibold text-gray-800">
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
                        <div className="text-2xl font-semibold text-gray-800">
                          {formatCurrency(tenantData.vorauszahlungen)}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 text-sm">
                    <h4 className="font-semibold mb-2 text-center">Monatliche Vorauszahlungen</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-2 py-1 h-auto text-xs">Monat</TableHead>
                          <TableHead className="text-right px-2 py-1 h-auto text-xs">Zahlung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantData.monthlyVorauszahlungen.map((payment) => (
                          <TableRow key={payment.monthName}>
                            <TableCell className="px-2 py-1 text-xs">{payment.monthName}</TableCell>
                            <TableCell className="text-right px-2 py-1 text-xs">
                              {payment.isActiveMonth ? formatCurrency(payment.amount) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                      <HoverCardContent className="w-96 text-sm">
                        <h4 className="font-semibold mb-3">Abrechnungsdetails</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Gesamtkosten {Number(nebenkostenItem?.jahr)}:</span>
                            <span>{formatCurrency(tenantData.totalTenantCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Geleistete Vorauszahlungen:</span>
                            <span>{formatCurrency(tenantData.vorauszahlungen)}</span>
                          </div>
                          <div className="h-px bg-gray-200 my-2"></div>
                          <div className="flex justify-between font-semibold">
                            <span>{isNachzahlung ? "Nachzahlung" : "Guthaben"}:</span>
                            <span className={amountColor}>{formatCurrency(tenantData.finalSettlement)}</span>
                          </div>
                          
                          {tenantData.recommendedPrepayment !== undefined && (
                            <>
                              <div className="h-px bg-gray-200 my-2"></div>
                              <h4 className="font-semibold mt-3 mb-2">Empfehlung für {Number(nebenkostenItem?.jahr) + 1}</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Empfohlene Vorauszahlung:</span>
                                  <span className="font-semibold">{formatCurrency(tenantData.recommendedPrepayment)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                  <span>Monatliche Rate:</span>
                                  <span>{formatCurrency(tenantData.recommendedPrepayment / 12)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
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
                    <TableHead className="text-gray-700">Kostenart</TableHead>
                    <TableHead className="text-gray-700">Abrechnungsart</TableHead>
                    <TableHead className="text-gray-700">Preis/qm</TableHead> {/* New Header */}
                    <TableHead className="text-right text-gray-700">Anteil Mieter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantData.costItems.map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                      <TableCell className="py-2 px-3 align-top">{item.costName}</TableCell>
                      <TableCell className="py-2 px-3 align-top">{item.calculationType}</TableCell>
                      <TableCell className="py-2 px-3 align-top">{item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-'}</TableCell> {/* New Cell */}
                      <TableCell className="text-right py-2 px-3 align-top">{formatCurrency(item.tenantShare)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Wasserkosten row removed from here */}
                  <TableRow className="font-semibold bg-blue-50 border-t-2 border-gray-200">
                    <TableCell className="py-3 px-3 text-blue-700">Gesamtkosten Mieter</TableCell>
                    <TableCell className="py-3 px-3 text-blue-700"></TableCell> {/* For Abrechnungsart */}
                    <TableCell className="py-3 px-3 text-blue-700"></TableCell> {/* New empty cell for Preis/qm */}
                    <TableCell className="text-right py-3 px-3 text-blue-700">{formatCurrency(tenantData.totalTenantCost)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-8 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button variant="default" onClick={async () => { await generateSettlementPDF(calculatedTenantData, nebenkostenItem!, ownerName, ownerAddress); }}>
            <FileDown className="mr-2 h-4 w-4" />
            Als PDF exportieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
