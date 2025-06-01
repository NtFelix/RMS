"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!isOpen || !nebenkostenItem || !tenants || tenants.length === 0) {
      setCalculatedTenantData([]);
      return;
    }

    const {
      nebenkostenart, // array of cost names
      betrag,         // array of amounts for each cost name
      berechnungsart, // array of calculation methods for each cost name
      wasserkosten,   // total water costs for the house
      gesamtFlaeche,  // total area of the house (from Nebenkosten object)
      // anzahlWohnungen, // number of apartments in the house (from Nebenkosten object)
      // We will use tenants.length for per-unit calculations if anzahlWohnungen is not reliable or granular enough
    } = nebenkostenItem;

    const totalHouseArea = gesamtFlaeche && gesamtFlaeche > 0 ? gesamtFlaeche : tenants.reduce((sum, t) => sum + (t.Wohnungen?.groesse || 0), 0);
    const numberOfUnits = tenants.length; // Assuming one tenant per unit for 'fix' or 'pro Person' if no specific person count

    const newCalculatedData: TenantCostDetails[] = tenants.map(tenant => {
      // Ensure tenant.Wohnungen exists and has groesse, default to 0 if not
      const apartmentSize = tenant.Wohnungen?.groesse || 0;
      const apartmentName = tenant.Wohnungen?.name || 'Unbekannt';

      let tenantTotalForRegularItems = 0;
      const costItemsDetails: TenantCostDetails['costItems'] = [];

      if (nebenkostenart && betrag && berechnungsart) {
        nebenkostenart.forEach((costName, index) => {
          const totalCostForItem = betrag[index] || 0;
          const calcType = berechnungsart[index] || 'fix'; // Default to 'fix' if not specified
          let share = 0;

          switch (calcType.toLowerCase()) {
            case 'pro qm':
            case 'qm':
              share = totalHouseArea > 0 ? (totalCostForItem / totalHouseArea) * apartmentSize : 0;
              break;
            case 'pro person': // Assuming 'pro Person' means per tenant/unit for now
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

      // Water cost calculation
      // For now, distribute water costs by qm if totalHouseArea > 0, otherwise per unit.
      // This can be refined later if individual meter readings (Wasserzaehler) are integrated.
      let waterShare = 0;
      const waterCalcType = totalHouseArea > 0 ? 'pro qm' : 'pro einheit';
      if (wasserkosten && wasserkosten > 0) {
        if (waterCalcType === 'pro qm') {
          waterShare = totalHouseArea > 0 ? (wasserkosten / totalHouseArea) * apartmentSize : 0;
        } else { // pro einheit
          waterShare = numberOfUnits > 0 ? wasserkosten / numberOfUnits : 0;
        }
      }

      const tenantWaterCost = {
        totalWaterCostOverall: wasserkosten || 0,
        calculationType: waterCalcType, // Placeholder, can be made more dynamic
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
    });

    setCalculatedTenantData(newCalculatedData);

  }, [isOpen, nebenkostenItem, tenants]);

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

        <div className="mt-4 space-y-6">
          {calculatedTenantData.length === 0 && (
            <p className="text-muted-foreground">
              {tenants && tenants.length > 0 ? "Berechne Daten..." : "Keine Mieterdaten für die Abrechnung vorhanden oder Nebenkosten nicht vollständig konfiguriert."}
            </p>
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
