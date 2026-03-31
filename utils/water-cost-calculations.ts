/**
 * Water Cost Calculation Utilities
 * 
 * This module handles complex water cost calculations including:
 * - Multiple water meters per apartment
 * - Tenant move-in/move-out date handling
 * - WG (shared apartment) cost splitting based on occupancy periods
 * - Prorated water usage for partial periods
 */

import type { Mieter, WasserAblesung, WasserZaehler } from "@/lib/types";
import { calculateTenantOccupancy } from "./date-calculations";

/**
 * Represents a water reading with associated tenant and period information
 */
export interface WaterReadingWithContext {
  reading: WasserAblesung;
  meter: WasserZaehler;
  tenant: Mieter;
  apartmentId: string;
}

/**
 * Represents meter consumption for a specific tenant during a period
 */
export interface TenantMeterConsumption {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  totalConsumption: number; // Total units consumed (m³, kWh, etc.)
  consumptionByType: Record<string, number>; // Consumption broken down by meter type (e.g., { gas: 68, kaltwasser: 382.25 })
  consumptionDetails: Array<{
    meterId: string;
    meterCustomId: string | null;
    meterType: string; // zaehler_typ of the meter
    consumption: number;
    readingDate: string;
    isPartialPeriod: boolean; // True if tenant moved in/out during period
    occupancyFactor: number; // 0-1, represents portion of period tenant was present
  }>;
}

/**
 * Represents meter cost allocation for a tenant
 */
export interface TenantMeterCost {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  consumption: number; // Total units consumed across all meter types
  costShare: number; // Total EUR across all meter types
  pricePerUnit: number; // Weighted average EUR/unit (for display only)
  consumptionByType: Record<string, number>; // Per-type consumption (e.g., { gas: 68, kaltwasser: 382.25 })
  costByType: Record<string, number>; // Per-type costs (e.g., { gas: 10, kaltwasser: 100 })
  pricePerUnitByType: Record<string, number>; // Per-type price per unit
  isWGMember: boolean; // True if apartment has multiple tenants
  wgSplitDetails?: {
    totalApartmentConsumption: number;
    tenantShare: number; // Percentage (0-100)
    coTenants: Array<{
      tenantId: string;
      tenantName: string;
      share: number; // Percentage
    }>;
  };
}

/**
 * Calculate if a date falls within a tenant's occupancy period
 */
function isTenantActiveOnDate(
  tenant: Mieter,
  date: string
): boolean {
  const checkDate = new Date(date);
  const moveInDate = tenant.einzug ? new Date(tenant.einzug) : null;
  const moveOutDate = tenant.auszug ? new Date(tenant.auszug) : null;

  // If no move-in date, tenant is not active
  if (!moveInDate) return false;

  // Check if date is after move-in
  if (checkDate < moveInDate) return false;

  // Check if date is before move-out (if move-out exists)
  if (moveOutDate && checkDate > moveOutDate) return false;

  return true;
}

/**
 * Calculate occupancy factor for a tenant during a specific period
 * Returns a value between 0 and 1 representing the portion of the period the tenant was present
 * 
 * This is a wrapper around calculateTenantOccupancy from date-calculations.ts
 */
function calculateOccupancyFactor(
  tenant: Mieter,
  periodStart: string,
  periodEnd: string
): number {
  const occupancy = calculateTenantOccupancy(tenant, periodStart, periodEnd);
  return occupancy.occupancyRatio;
}

/**
 * Get all tenants who lived in an apartment during the billing period
 */
function getApartmentTenantsInPeriod(
  allTenants: Mieter[],
  apartmentId: string,
  periodStart: string,
  periodEnd: string
): Mieter[] {
  return allTenants.filter(tenant => {
    if (tenant.wohnung_id !== apartmentId) return false;

    const occupancyFactor = calculateOccupancyFactor(tenant, periodStart, periodEnd);
    return occupancyFactor > 0;
  });
}

/**
 * Calculate meter consumption for each tenant based on meter readings
 * Handles complex scenarios:
 * - Multiple meters per apartment
 * - Tenant move-ins/move-outs during billing period
 * - WG cost splitting based on occupancy
 */
export function calculateTenantMeterConsumption(
  tenants: Mieter[],
  meters: WasserZaehler[],
  readings: WasserAblesung[],
  periodStart: string,
  periodEnd: string
): TenantMeterConsumption[] {
  const consumptionByTenant: Map<string, TenantMeterConsumption> = new Map();

  // Group meters by apartment
  const metersByApartment = new Map<string, WasserZaehler[]>();
  meters.forEach(meter => {
    if (!meter.wohnung_id) return;

    const meters = metersByApartment.get(meter.wohnung_id) || [];
    meters.push(meter);
    metersByApartment.set(meter.wohnung_id, meters);
  });

  // Process each apartment
  metersByApartment.forEach((aptMeters, apartmentId) => {
    // Get all tenants who lived in this apartment during the period
    const apartmentTenants = getApartmentTenantsInPeriod(tenants, apartmentId, periodStart, periodEnd);

    if (apartmentTenants.length === 0) return;

    // Calculate total consumption for this apartment from all meters, tracking by type
    let totalApartmentConsumption = 0;
    const consumptionByMeterType: Record<string, number> = {};
    const meterConsumptions: Array<{
      meterId: string;
      meterCustomId: string | null;
      meterType: string;
      consumption: number;
      readingDate: string;
    }> = [];

    aptMeters.forEach(meter => {
      // Find readings for this meter within the period
      const meterReadings = readings.filter(reading =>
        reading.zaehler_id === meter.id &&
        reading.ablese_datum >= periodStart &&
        reading.ablese_datum <= periodEnd
      );

      // Debug logging for troubleshooting
      if (process.env.NODE_ENV === 'development' && readings.length > 0) {
        console.log('[Meter Calculation Debug]', {
          meterId: meter.id,
          meterCustomId: meter.custom_id,
          meterType: meter.zaehler_typ,
          totalReadings: readings.length,
          matchingReadings: meterReadings.length,
          periodStart,
          periodEnd,
          readingDates: readings.map(r => r.ablese_datum)
        });
      }

      // Sum up consumption from all readings
      const meterConsumption = meterReadings.reduce((sum, reading) => sum + reading.verbrauch, 0);

      if (meterConsumption > 0) {
        totalApartmentConsumption += meterConsumption;

        // Track consumption by meter type
        const meterType = meter.zaehler_typ || 'unknown';
        consumptionByMeterType[meterType] = (consumptionByMeterType[meterType] || 0) + meterConsumption;

        // Use the last reading date for this meter
        const lastReading = meterReadings.sort((a, b) =>
          new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime()
        )[0];

        meterConsumptions.push({
          meterId: meter.id,
          meterCustomId: meter.custom_id,
          meterType: meterType,
          consumption: meterConsumption,
          readingDate: lastReading?.ablese_datum || periodEnd
        });
      }
    });

    // Calculate occupancy factors for all tenants in this apartment
    const tenantOccupancyFactors = apartmentTenants.map(tenant => ({
      tenant,
      occupancyFactor: calculateOccupancyFactor(tenant, periodStart, periodEnd)
    }));

    const totalOccupancyFactor = tenantOccupancyFactors.reduce((sum, t) => sum + t.occupancyFactor, 0);

    // Distribute consumption among tenants based on occupancy
    tenantOccupancyFactors.forEach(({ tenant, occupancyFactor }) => {
      const tenantShare = totalOccupancyFactor > 0
        ? (occupancyFactor / totalOccupancyFactor)
        : (1 / apartmentTenants.length);

      const tenantConsumption = totalApartmentConsumption * tenantShare;

      // Calculate per-type consumption for this tenant
      const tenantConsumptionByType: Record<string, number> = {};
      for (const [meterType, typeConsumption] of Object.entries(consumptionByMeterType)) {
        tenantConsumptionByType[meterType] = typeConsumption * tenantShare;
      }

      // Create consumption details for this tenant
      const consumptionDetails = meterConsumptions.map(mc => ({
        meterId: mc.meterId,
        meterCustomId: mc.meterCustomId,
        meterType: mc.meterType,
        consumption: mc.consumption * tenantShare,
        readingDate: mc.readingDate,
        isPartialPeriod: occupancyFactor < 1,
        occupancyFactor: occupancyFactor
      }));

      consumptionByTenant.set(tenant.id, {
        tenantId: tenant.id,
        tenantName: tenant.name,
        apartmentId: apartmentId,
        totalConsumption: tenantConsumption,
        consumptionByType: tenantConsumptionByType,
        consumptionDetails
      });
    });
  });

  return Array.from(consumptionByTenant.values());
}

/**
 * Calculate meter costs for each tenant
 * Calculates costs PER METER TYPE to avoid blending different unit prices.
 * E.g., gas (€/m³), cold water (€/m³), warm water (€/m³) each get their own price.
 * 
 * @param zaehlerkosten - Building-level costs by meter type (e.g., { gas: 10, kaltwasser: 100, warmwasser: 100 })
 * @param zaehlerverbrauch - Building-level consumption by meter type (e.g., { gas: 68, kaltwasser: 382.25, warmwasser: 428 })
 */
export function calculateTenantMeterCosts(
  tenants: Mieter[],
  meters: WasserZaehler[],
  readings: WasserAblesung[],
  zaehlerkosten: Record<string, number>,
  zaehlerverbrauch: Record<string, number>,
  periodStart: string,
  periodEnd: string
): TenantMeterCost[] {
  // First, calculate consumption for each tenant (now includes consumptionByType)
  const tenantConsumptions = calculateTenantMeterConsumption(
    tenants,
    meters,
    readings,
    periodStart,
    periodEnd
  );

  // Calculate price per unit for EACH meter type independently
  const pricePerUnitByType: Record<string, number> = {};
  for (const [meterType, buildingCost] of Object.entries(zaehlerkosten)) {
    const buildingConsumption = zaehlerverbrauch[meterType] || 0;
    pricePerUnitByType[meterType] = buildingConsumption > 0 ? buildingCost / buildingConsumption : 0;
  }

  // Group tenants by apartment to identify WGs
  const tenantsByApartment = new Map<string, TenantMeterConsumption[]>();
  tenantConsumptions.forEach(tc => {
    const apartmentTenants = tenantsByApartment.get(tc.apartmentId) || [];
    apartmentTenants.push(tc);
    tenantsByApartment.set(tc.apartmentId, apartmentTenants);
  });

  // Calculate costs for each tenant using per-type pricing
  const tenantCosts: TenantMeterCost[] = tenantConsumptions.map(tc => {
    // Calculate cost per meter type
    const costByType: Record<string, number> = {};
    let totalCostShare = 0;

    for (const [meterType, tenantTypeConsumption] of Object.entries(tc.consumptionByType)) {
      const typePrice = pricePerUnitByType[meterType] || 0;
      const typeCost = tenantTypeConsumption * typePrice;
      costByType[meterType] = typeCost;
      totalCostShare += typeCost;
    }

    // Calculate weighted average price per unit (for display purposes only)
    const weightedAvgPricePerUnit = tc.totalConsumption > 0 ? totalCostShare / tc.totalConsumption : 0;

    const apartmentTenants = tenantsByApartment.get(tc.apartmentId) || [];
    const isWGMember = apartmentTenants.length > 1;

    const cost: TenantMeterCost = {
      tenantId: tc.tenantId,
      tenantName: tc.tenantName,
      apartmentId: tc.apartmentId,
      consumption: tc.totalConsumption,
      costShare: totalCostShare,
      pricePerUnit: weightedAvgPricePerUnit,
      consumptionByType: tc.consumptionByType,
      costByType: costByType,
      pricePerUnitByType: pricePerUnitByType,
      isWGMember: isWGMember
    };

    // Add WG split details if applicable
    if (isWGMember) {
      const totalApartmentConsumption = apartmentTenants.reduce((sum, t) => sum + t.totalConsumption, 0);
      const tenantSharePercentage = totalApartmentConsumption > 0
        ? (tc.totalConsumption / totalApartmentConsumption) * 100
        : 0;

      cost.wgSplitDetails = {
        totalApartmentConsumption: totalApartmentConsumption,
        tenantShare: tenantSharePercentage,
        coTenants: apartmentTenants
          .filter(t => t.tenantId !== tc.tenantId)
          .map(t => ({
            tenantId: t.tenantId,
            tenantName: t.tenantName,
            share: totalApartmentConsumption > 0
              ? (t.totalConsumption / totalApartmentConsumption) * 100
              : 0
          }))
      };
    }

    return cost;
  });

  return tenantCosts;
}

/**
 * Get meter cost for a specific tenant
 * Helper function for modal display.
 * Uses per-type pricing to avoid blending different meter type costs.
 */
export function getTenantMeterCost(
  tenantId: string,
  tenants: Mieter[],
  meters: WasserZaehler[],
  readings: WasserAblesung[],
  zaehlerkosten: Record<string, number>,
  zaehlerverbrauch: Record<string, number>,
  periodStart: string,
  periodEnd: string
): TenantMeterCost | null {
  const allCosts = calculateTenantMeterCosts(
    tenants,
    meters,
    readings,
    zaehlerkosten,
    zaehlerverbrauch,
    periodStart,
    periodEnd
  );

  return allCosts.find(cost => cost.tenantId === tenantId) || null;
}
