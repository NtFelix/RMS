"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox";
import { Nebenkosten, Mieter, Wohnung, Rechnung } from "@/lib/data-fetching"; // Added Rechnung to import
import { useEffect, useState } from "react"; // Import useEffect and useState
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Explicitly register autoTable plugin
(jsPDF.API as any).autoTable = autoTable;

// Defined in Step 1:

// Local Rechnung interface removed

// Helper function for currency formatting
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

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
}

interface AbrechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  nebenkostenItem: Nebenkosten | null;
  tenants: Mieter[];
  rechnungen: Rechnung[]; // Assumed new prop
  // wohnungen prop is removed as Mieter type now includes Wohnungen directly with name and groesse
}

export function AbrechnungModal({
  isOpen,
  onClose,
  nebenkostenItem,
  tenants,
  rechnungen, // Destructured assumed new prop
}: AbrechnungModalProps) {
  const [calculatedTenantData, setCalculatedTenantData] = useState<TenantCostDetails[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loadAllRelevantTenants, setLoadAllRelevantTenants] = useState<boolean>(false); // New state variable

  useEffect(() => {
    if (!isOpen || !nebenkostenItem || !tenants || tenants.length === 0) {
      setCalculatedTenantData([]);
      return;
    }

    // Helper function for calculation logic (extracted to avoid repetition)
    const calculateCostsForTenant = (tenant: Mieter): TenantCostDetails => {
      const {
        nebenkostenart,
        betrag,
        berechnungsart,
        wasserkosten,
        gesamtFlaeche,
      } = nebenkostenItem!; // nebenkostenItem is checked in the outer scope

      const totalHouseArea = gesamtFlaeche && gesamtFlaeche > 0
        ? gesamtFlaeche
        : tenants.reduce((sum, t) => sum + (t.Wohnungen?.groesse || 0), 0);
      const numberOfUnits = tenants.length;
      const apartmentSize = tenant.Wohnungen?.groesse || 0;
      const apartmentName = tenant.Wohnungen?.name || 'Unbekannt';

      let tenantTotalForRegularItems = 0;
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
            case 'pro flaeche': // As seen in logs "pro Flaeche".toLowerCase()
            case 'pro fläche':  // To be safe with umlauts
              if (totalHouseArea > 0) {
                  itemPricePerSqm = totalCostForItem / totalHouseArea;
                  share = itemPricePerSqm * apartmentSize;
              } else {
                  share = 0;
                  // itemPricePerSqm remains undefined
              }
              break;
            case 'nach rechnung': // New case for individual invoice calculation
              // Ensure rechnungen is available and not undefined.
              // The problem states rechnungen is pre-filtered for nebenkostenItem.id
              if (rechnungen) {
                const relevantRechnung = rechnungen.find(
                  (r) => r.mieter_id === tenant.id && r.name === costName
                );
                share = relevantRechnung?.betrag || 0;
              } else {
                // Fallback or error handling if rechnungen is not provided as expected
                console.warn(`Rechnungen array not available for costName: ${costName} and tenant: ${tenant.id}`);
                share = 0; // Default to 0 if rechnungen is missing
              }
              break;
            case 'pro person':
            case 'pro einheit':
            case 'fix':
            default:
              share = totalCostForItem; // Changed calculation for these types
              break;
          }
          costItemsDetails.push({
            costName: costName || `Kostenart ${index + 1}`,
            totalCostForItem,
            calculationType: calcType,
            tenantShare: share,
            pricePerSqm: itemPricePerSqm, // Add this line
          });
          tenantTotalForRegularItems += share;
        });
      }

      let waterShare = 0;
      const waterCalcType = totalHouseArea > 0 ? 'pro qm' : 'pro einheit';
      if (wasserkosten && wasserkosten > 0) {
        if (waterCalcType === 'pro qm') {
          waterShare = totalHouseArea > 0 ? (wasserkosten / totalHouseArea) * apartmentSize : 0;
        } else {
          waterShare = numberOfUnits > 0 ? wasserkosten / numberOfUnits : 0;
        }
      }

      const tenantWaterCost = {
        totalWaterCostOverall: wasserkosten || 0,
        calculationType: waterCalcType,
        tenantShare: waterShare,
      };

      const totalTenantCost = tenantTotalForRegularItems + waterShare;

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        apartmentId: tenant.wohnung_id || 'N/A',
        apartmentName: apartmentName,
        apartmentSize: apartmentSize,
        costItems: costItemsDetails,
        waterCost: tenantWaterCost,
        totalTenantCost: totalTenantCost,
      };
    };

    if (loadAllRelevantTenants) {
      const allTenantsData = tenants.map(tenant => calculateCostsForTenant(tenant));
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
      const singleTenantCalculatedData = calculateCostsForTenant(activeTenant);
      setCalculatedTenantData([singleTenantCalculatedData]);
    }
  }, [isOpen, nebenkostenItem, tenants, rechnungen, selectedTenantId, loadAllRelevantTenants]); // Added rechnungen to dependency array

  const generateSettlementPDF = (
    tenantData: TenantCostDetails | TenantCostDetails[],
    nebenkostenItem: Nebenkosten,
    ownerName: string = "[Name Owner]",
    ownerAddress: string = "[Adresse Owner]"
  ) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let startY = 20; // Initial Y position for content

    const processTenant = (singleTenantData: TenantCostDetails) => {
      // Reset startY for each tenant if it's a new page
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
      doc.text(`Zeitraum: 01.01.${nebenkostenItem.jahr} - 31.12.${nebenkostenItem.jahr}`, 20, startY);
      startY += 6;

      // 3. Property Details
      const propertyDetails = `Objekt: ${nebenkostenItem.Haeuser?.name || 'N/A'}, ${singleTenantData.apartmentName}, ${singleTenantData.apartmentSize} qm`;
      doc.text(propertyDetails, 20, startY);
      startY += 10;

      // 4. Costs Table
      const tableColumn = ["Leistungsart", "Verteiler", "Kosten Pro qm", "Kostenanteil In €"];
      const tableRows: any[][] = [];

      singleTenantData.costItems.forEach(item => {
        const row = [
          item.costName,
          item.calculationType,
          item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-',
          formatCurrency(item.tenantShare)
        ];
        tableRows.push(row);
      });

      // Add water cost row
      tableRows.push([
        "Wasserkosten",
        singleTenantData.waterCost.calculationType,
        "-",
        formatCurrency(singleTenantData.waterCost.tenantShare)
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0] },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          3: { halign: 'right' } // Align "Kostenanteil In €" to the right
        }
      });

      if (doc.lastAutoTable && typeof doc.lastAutoTable.finalY === 'number') {
        startY = doc.lastAutoTable.finalY + 10;
      } else {
        // Fallback logic: if finalY is not available (which shouldn't happen after a successful autoTable call),
        // increment startY by a default value to prevent overlap and log an error.
        startY += 10; // Default spacing
        console.error("Error: doc.lastAutoTable.finalY was not available after autoTable call. Using default spacing.");
      }

      // Table Footer (Betriebskosten gesamt) - displayed as a line of text for simplicity
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Betriebskosten gesamt:", 20, startY);
      doc.text(formatCurrency(singleTenantData.totalTenantCost), doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      startY += 8;
      doc.setFont("helvetica", "normal");


      // 5. Final Summary
      doc.setFontSize(10);
      doc.text("Gesamtkosten:", 20, startY);
      doc.text(formatCurrency(singleTenantData.totalTenantCost), doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      startY += 6;

      doc.text("bereits geleistete Zahlungen:", 20, startY);
      doc.text("[Betrag]", doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      startY += 6;
      
      // For Nachzahlung, let's display it as text for now
      doc.text("Nachzahlung:", 20, startY);
      doc.text(`${formatCurrency(singleTenantData.totalTenantCost)} - [Betrag]`, doc.internal.pageSize.getWidth() - 20, startY, { align: "right" });
      startY += 10;
    };

    if (Array.isArray(tenantData)) {
      tenantData.forEach((td, index) => {
        processTenant(td);
        if (index < tenantData.length - 1) {
          doc.addPage();
          startY = 20; // Reset Y for new page
        }
      });
      const filename = `Abrechnung_${nebenkostenItem.jahr}_Alle_Mieter.pdf`;
      doc.save(filename);
    } else if (tenantData) {
      processTenant(tenantData);
      const filename = `Abrechnung_${nebenkostenItem.jahr}_${tenantData.tenantName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } else {
      console.error("No tenant data available to generate PDF.");
      // Optionally, show a toast or alert to the user
      return;
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Betriebskostenabrechnung {nebenkostenItem.jahr} - Haus: {nebenkostenItem.Haeuser?.name || 'N/A'}
          </DialogTitle>
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
                      <TableCell className="py-2 px-3">{item.costName}</TableCell>
                      <TableCell className="py-2 px-3">{item.calculationType}</TableCell>
                      <TableCell className="py-2 px-3">{item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-'}</TableCell> {/* New Cell */}
                      <TableCell className="text-right py-2 px-3">{formatCurrency(item.tenantShare)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={tenantData.costItems.length % 2 === 0 ? "bg-gray-50" : ""}>
                    <TableCell className="py-2 px-3">Wasserkosten</TableCell>
                    <TableCell className="py-2 px-3">{tenantData.waterCost.calculationType}</TableCell>
                    <TableCell className="py-2 px-3">-</TableCell> {/* Empty cell for alignment */}
                    <TableCell className="text-right py-2 px-3">{formatCurrency(tenantData.waterCost.tenantShare)}</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold bg-blue-50">
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
          <Button variant="default" onClick={() => generateSettlementPDF(calculatedTenantData, nebenkostenItem!)}>
            Als PDF exportieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
