/**
 * Water Cost Calculation Utilities
 * 
 * This module handles complex water cost calculations including:
 * - Multiple water meters per apartment
 * - Tenant move-in/move-out date handling
 * - WG (shared apartment) cost splitting based on occupancy periods
 * - Prorated water usage for partial periods
 */

import type { Mieter, ZaehlerAblesung, Zaehler } from "@/lib/types";
import { calculateTenantOccupancy, parseAsUtc } from "./date-calculations";

/**
 * Represents a water reading with associated tenant and period information
 */
export interface WaterReadingWithContext {
  reading: ZaehlerAblesung;
  meter: Zaehler;
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
// Helper to add days to a Date object in a UTC-safe way
const addDaysUtc = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export function calculateTenantMeterConsumption(
  tenants: Mieter[],
  meters: Zaehler[],
  readings: ZaehlerAblesung[],
  periodStart: string,
  periodEnd: string
): TenantMeterConsumption[] {
  const consumptionByTenant: Map<string, TenantMeterConsumption> = new Map();

  // Group meters by apartment
  const metersByApartment = new Map<string, Zaehler[]>();
  meters.forEach(meter => {
    if (!meter.wohnung_id) return;

    const meters = metersByApartment.get(meter.wohnung_id) || [];
    meters.push(meter);
    metersByApartment.set(meter.wohnung_id, meters);
  });

  // Helper references for parsing
  const startPeriodUtc = parseAsUtc(periodStart);
  const endPeriodUtc = parseAsUtc(periodEnd);

  // Process each apartment
  metersByApartment.forEach((aptMeters, apartmentId) => {
    // Get all tenants who lived in this apartment during the period
    const apartmentTenants = getApartmentTenantsInPeriod(tenants, apartmentId, periodStart, periodEnd);

    if (apartmentTenants.length === 0) return;

    // Precalculate UTC dates and effective occupancy limits for each tenant in this apartment once
    const tenantsWithDates = apartmentTenants.map(tenant => {
      const einStart = tenant.einzug ? parseAsUtc(tenant.einzug) : startPeriodUtc;
      const auzEnd = tenant.auszug ? parseAsUtc(tenant.auszug) : endPeriodUtc;
      return {
        tenant,
        effectiveStart: einStart > startPeriodUtc ? einStart : startPeriodUtc,
        effectiveEnd: auzEnd < endPeriodUtc ? auzEnd : endPeriodUtc
      };
    });

    // Initialize map of consumption fields for each tenant in this apartment
    const tenantAllocations = new Map<string, {
      total: number;
      byType: Record<string, number>;
      details: Map<string, {
        meterId: string;
        meterCustomId: string | null;
        meterType: string;
        consumption: number;
        readingDate: string;
      }>;
    }>();

    apartmentTenants.forEach(tenant => {
      tenantAllocations.set(tenant.id, {
        total: 0,
        byType: {},
        details: new Map()
      });
    });

    aptMeters.forEach(meter => {
      // Find readings for this meter within the period
      const meterReadings = readings.filter(reading =>
        reading.zaehler_id === meter.id &&
        reading.ablese_datum >= periodStart &&
        reading.ablese_datum <= periodEnd
      );

      if (meterReadings.length === 0) return;

      // Sort readings chronologically
      const sortedReadings = [...meterReadings].sort((a, b) =>
        new Date(a.ablese_datum).getTime() - new Date(b.ablese_datum).getTime()
      );

      const meterType = meter.zaehler_typ || 'unknown';

      // Allocate each reading's consumption to the tenants active during that reading's specific interval
      sortedReadings.forEach((reading, index) => {
        const endReadingUtc = parseAsUtc(reading.ablese_datum);
        let startReadingUtc = (index === 0)
          ? startPeriodUtc
          : addDaysUtc(parseAsUtc(sortedReadings[index - 1].ablese_datum), 1);

        // Clamp: if start is after end (e.g., same-date readings), run a single-day interval
        if (startReadingUtc > endReadingUtc) {
          startReadingUtc = new Date(endReadingUtc.getTime());
        }

        let totalIntervalDays = Math.round((endReadingUtc.getTime() - startReadingUtc.getTime()) / (1000 * 3600 * 24)) + 1;
        if (totalIntervalDays <= 0) {
          totalIntervalDays = 1;
        }

        const consumptionPerDay = reading.verbrauch / totalIntervalDays;
        const readingDateUtc = endReadingUtc;

        // Iterate day-by-day in UTC to allocate consumption exactly to the active tenants of each day
        const current = new Date(startReadingUtc.getTime());
        const maxDays = 366 * 3;
        let dayCount = 0;
        while (current <= endReadingUtc && dayCount < maxDays) {
          // Find all tenants active on this specific day
          const activeTenants = tenantsWithDates
            .filter(t => current >= t.effectiveStart && current <= t.effectiveEnd)
            .map(t => t.tenant);

          if (activeTenants.length > 0) {
            const dailyShare = consumptionPerDay / activeTenants.length;
            activeTenants.forEach(tenant => {
              const allocation = tenantAllocations.get(tenant.id)!;
              allocation.total += dailyShare;
              allocation.byType[meterType] = (allocation.byType[meterType] || 0) + dailyShare;

              const existingDetail = allocation.details.get(meter.id);
              if (existingDetail) {
                existingDetail.consumption += dailyShare;
                if (readingDateUtc > parseAsUtc(existingDetail.readingDate)) {
                  existingDetail.readingDate = reading.ablese_datum;
                }
              } else {
                allocation.details.set(meter.id, {
                  meterId: meter.id,
                  meterCustomId: meter.custom_id,
                  meterType: meterType,
                  consumption: dailyShare,
                  readingDate: reading.ablese_datum
                });
              }
            });
          }

          current.setUTCDate(current.getUTCDate() + 1);
          dayCount++;
        }
      });
    });

    // Save calculation result for each active tenant in this apartment
    apartmentTenants.forEach(tenant => {
      const allocation = tenantAllocations.get(tenant.id)!;
      const occupancyFactor = calculateOccupancyFactor(tenant, periodStart, periodEnd);

      // Clean up floating point errors in total and byType
      const cleanTotal = Math.round(allocation.total * 100000) / 100000;
      const cleanByType: Record<string, number> = {};
      for (const [type, val] of Object.entries(allocation.byType)) {
        cleanByType[type] = Math.round(val * 100000) / 100000;
      }

      // Map details format and clean detail consumption
      const consumptionDetails = Array.from(allocation.details.values()).map(detail => ({
        ...detail,
        consumption: Math.round(detail.consumption * 100000) / 100000,
        isPartialPeriod: occupancyFactor < 1,
        occupancyFactor: occupancyFactor
      }));

      consumptionByTenant.set(tenant.id, {
        tenantId: tenant.id,
        tenantName: tenant.name,
        apartmentId: apartmentId,
        totalConsumption: cleanTotal,
        consumptionByType: cleanByType,
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
  meters: Zaehler[],
  readings: ZaehlerAblesung[],
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
  meters: Zaehler[],
  readings: ZaehlerAblesung[],
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
