"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Combobox } from 'geist/components';
import { Nebenkosten, Mieter, Wohnung } from "@/lib/data-fetching";
import { useEffect, useState } from "react"; // Import useEffect and useState

// Defined in Step 1:
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
  // wohnungen prop is removed as Mieter type now includes Wohnungen directly with name and groesse
}

export function AbrechnungModal({
  isOpen,
  onClose,
  nebenkostenItem,
  tenants,
}: AbrechnungModalProps) {
  const [calculatedTenantData, setCalculatedTenantData] = useState<TenantCostDetails[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !nebenkostenItem || !tenants || tenants.length === 0) {
      setCalculatedTenantData([]);
      return;
    }

    if (!selectedTenantId) {
      setCalculatedTenantData([]);
      return;
    }

    const activeTenant = tenants.find(t => t.id === selectedTenantId);
    if (!activeTenant) {
      setCalculatedTenantData([]);
      return;
    }

    const {
      nebenkostenart, // array of cost names
      betrag,         // array of amounts for each cost name
      berechnungsart, // array of calculation methods for each cost name
      wasserkosten,   // total water costs for the house
      gesamtFlaeche,  // total area of the house (from Nebenkosten object)
    } = nebenkostenItem;

    // Calculate totalHouseArea and numberOfUnits based on ALL tenants, not just the selected one,
    // as these are used for 'pro qm' or 'pro einheit' calculations that depend on the whole building.
    const totalHouseArea = gesamtFlaeche && gesamtFlaeche > 0
      ? gesamtFlaeche
      : tenants.reduce((sum, t) => sum + (t.Wohnungen?.groesse || 0), 0);
    const numberOfUnits = tenants.length;

    // Perform calculation only for the selected tenant
    const tenant = activeTenant;
    const apartmentSize = tenant.Wohnungen?.groesse || 0;
    const apartmentName = tenant.Wohnungen?.name || 'Unbekannt';

    let tenantTotalForRegularItems = 0;
    const costItemsDetails: TenantCostDetails['costItems'] = [];

    if (nebenkostenart && betrag && berechnungsart) {
      nebenkostenart.forEach((costName, index) => {
        const totalCostForItem = betrag[index] || 0;
        const calcType = berechnungsart[index] || 'fix';
        let share = 0;

        switch (calcType.toLowerCase()) {
          case 'pro qm':
          case 'qm':
            share = totalHouseArea > 0 ? (totalCostForItem / totalHouseArea) * apartmentSize : 0;
            break;
          case 'pro person':
          case 'pro einheit':
          case 'fix':
          default:
            share = numberOfUnits > 0 ? totalCostForItem / numberOfUnits : 0;
            break;
        }
        costItemsDetails.push({
          costName: costName || `Kostenart ${index + 1}`,
          totalCostForItem,
          calculationType: calcType,
          tenantShare: share,
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

    const singleTenantCalculatedData: TenantCostDetails = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      apartmentId: tenant.wohnung_id || 'N/A',
      apartmentName: apartmentName,
      apartmentSize: apartmentSize,
      costItems: costItemsDetails,
      waterCost: tenantWaterCost,
      totalTenantCost: totalTenantCost,
    };

    setCalculatedTenantData([singleTenantCalculatedData]);

  }, [isOpen, nebenkostenItem, tenants, selectedTenantId]);

  if (!isOpen || !nebenkostenItem) {
    return null;
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
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
          <div className="mb-4"> {/* Added a wrapper for potential styling/spacing */}
            <label htmlFor="tenant-combobox-input" className="block text-sm font-medium text-gray-700 mb-1">
              Mieter auswählen
            </label>
            <Combobox
              placeholder="Mieter suchen..."
              width={300} // Adjusted width, can be fine-tuned
              onSelectionChange={(value) => {
                // The value from geist Combobox might be just the string value.
                // Ensure selectedTenantId is set correctly.
                // If value is null or undefined, it means deselection or empty.
                setSelectedTenantId(value ? String(value) : null);
              }}
              // It's good practice to control the component's value if possible,
              // though geist's Combobox might handle its state internally primarily.
              // If direct value control is needed and supported:
              // value={selectedTenantId || ''}
            >
              <Combobox.Input aria-label="Mieter auswählen" id="tenant-combobox-input" />
              <Combobox.List>
                {tenants.map((tenant) => (
                  <Combobox.Option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </Combobox.Option>
                ))}
              </Combobox.List>
            </Combobox>
          </div>
        )}

        <div className="mt-4 space-y-6"> {/* Ensure this div has appropriate top margin if the Combobox div no longer has mt-4 */}
          {/* Message display logic based on selection and data availability */}
          {!selectedTenantId && tenants && tenants.length > 0 && (
            <p className="text-muted-foreground">
              Bitte wählen Sie einen Mieter aus, um die Details anzuzeigen.
            </p>
          )}
          {selectedTenantId && calculatedTenantData.length === 0 && (
             <p className="text-muted-foreground">Berechne Daten für ausgewählten Mieter...</p>
          )}
          {(!tenants || tenants.length === 0) && (
             <p className="text-muted-foreground">Keine Mieterdaten für die Abrechnung vorhanden.</p>
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
                    <TableHead className="text-right text-gray-700">Anteil Mieter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantData.costItems.map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                      <TableCell className="py-2 px-3">{item.costName}</TableCell>
                      <TableCell className="text-right py-2 px-3">{formatCurrency(item.tenantShare)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={tenantData.costItems.length % 2 === 0 ? "bg-gray-50" : ""}>
                    <TableCell className="py-2 px-3">Wasserkosten</TableCell>
                    <TableCell className="text-right py-2 px-3">{formatCurrency(tenantData.waterCost.tenantShare)}</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold bg-blue-50">
                    <TableCell className="py-3 px-3 text-blue-700">Gesamtkosten Mieter</TableCell>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
