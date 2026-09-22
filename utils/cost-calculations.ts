/**
 * Enhanced cost calculation functions for date-based Betriebskosten system
 */

import type { Mieter } from "@/lib/types";
import { calculateTenantOccupancy, TenantOccupancy, parseAsUtc, calculateTotalDays } from "./date-calculations";

/**
 * Calculate cost distribution based on area (pro Flaeche) with day-based weighting
 */

export function calculateProFlächeDistribution(
  tenants: Mieter[],
  totalCost: number,
  startdatum: string,
  enddatum: string,
  totalHouseArea?: number
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};

  const periodStart = parseAsUtc(startdatum);
  const periodEnd = parseAsUtc(enddatum);
  const totalDays = calculateTotalDays(startdatum, enddatum);

  // Group tenants by wohnung_id so WG members sharing the same apartment
  // don't each add the full apartment area to totalWeightedArea (stacking bug).
  const apartmentGroups = new Map<string, { area: number; tenants: Mieter[] }>();
  tenants.forEach(tenant => {
    const wohnungId = tenant.wohnung_id || tenant.id;
    const area = tenant.Wohnungen?.groesse || 0;
    const existing = apartmentGroups.get(wohnungId);
    if (existing) {
      existing.tenants.push(tenant);
    } else {
      apartmentGroups.set(wohnungId, { area, tenants: [tenant] });
    }
  });

  // For each apartment, compute the union of occupied days across all co-tenants
  // and compute each tenant's day-weighted share (splitting each active day equally among active co-tenants).
  let totalWeightedArea = 0;
  const apartmentWeightedAreas = new Map<string, number>();
  const tenantApartmentFractions = new Map<string, number>();

  apartmentGroups.forEach((group, wohnungId) => {
    const tenantActiveDayShares = new Map<string, number>();
    group.tenants.forEach(t => tenantActiveDayShares.set(t.id, 0));

    let apartmentOccupiedDays = 0;

    const tenantsWithDates = group.tenants.map(tenant => {
      const einStart = tenant.einzug ? parseAsUtc(tenant.einzug) : periodStart;
      const auzEnd = tenant.auszug ? parseAsUtc(tenant.auszug) : periodEnd;
      return {
        tenant,
        effectiveStart: einStart > periodStart ? einStart : periodStart,
        effectiveEnd: auzEnd < periodEnd ? auzEnd : periodEnd
      };
    });

    const current = new Date(periodStart.getTime());
    while (current <= periodEnd) {
      const active = tenantsWithDates.filter(
        t => current >= t.effectiveStart && current <= t.effectiveEnd
      );
      if (active.length > 0) {
        apartmentOccupiedDays++;
        const shareEach = 1 / active.length;
        active.forEach(t => {
          tenantActiveDayShares.set(
            t.tenant.id,
            (tenantActiveDayShares.get(t.tenant.id) || 0) + shareEach
          );
        });
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const unionRatio = Math.min(apartmentOccupiedDays / totalDays, 1);
    const weightedArea = group.area * unionRatio;
    totalWeightedArea += weightedArea;
    apartmentWeightedAreas.set(wohnungId, weightedArea);

    // Fraction of the apartment's share that belongs to each tenant
    group.tenants.forEach(tenant => {
      const dayShare = tenantActiveDayShares.get(tenant.id) || 0;
      const fraction = apartmentOccupiedDays > 0 ? dayShare / apartmentOccupiedDays : 0;
      tenantApartmentFractions.set(tenant.id, fraction);
    });
  });

  const denominator = totalHouseArea !== undefined && totalHouseArea !== null
    ? (totalHouseArea > 0 ? totalHouseArea : totalWeightedArea)
    : totalWeightedArea;

  // Distribute the total cost to each apartment, then allocate by tenant's active day share.
  tenants.forEach(tenant => {
    const wohnungId = tenant.wohnung_id || tenant.id;
    const aptWeightedArea = apartmentWeightedAreas.get(wohnungId) || 0;
    const aptShare = denominator > 0 ? (aptWeightedArea / denominator) * totalCost : 0;
    const tenantFraction = tenantApartmentFractions.get(tenant.id) || 0;
    const tenantOccupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);

    distribution[tenant.id] = {
      amount: aptShare * tenantFraction,
      occupancyDays: tenantOccupancy.occupancyDays,
      totalDays
    };
  });

  return distribution;
}


/**
 * Calculate cost distribution per tenant (pro Mieter) with day-based weighting
 */
export function calculateProMieterDistribution(
  tenants: Mieter[],
  totalCost: number,
  startdatum: string,
  enddatum: string
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};

  // Calculate total occupancy days across all tenants
  let totalOccupancyDays = 0;
  const tenantOccupancies: Array<{
    tenant: Mieter;
    occupancy: TenantOccupancy;
  }> = [];

  tenants.forEach(tenant => {
    const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);
    totalOccupancyDays += occupancy.occupancyDays;
    tenantOccupancies.push({ tenant, occupancy });
  });

  const totalPeriodDays = calculateTotalDays(startdatum, enddatum);

  tenantOccupancies.forEach(({ tenant, occupancy }) => {
    const amount = totalOccupancyDays > 0 ? (occupancy.occupancyDays / totalOccupancyDays) * totalCost : 0;

    distribution[tenant.id] = {
      amount,
      occupancyDays: occupancy.occupancyDays,
      totalDays: totalPeriodDays
    };
  });

  return distribution;
}

/**
 * Calculate cost distribution per apartment (pro Wohnung) with day-based weighting
 */
export function calculateProWohnungDistribution(
  tenants: Mieter[],
  totalCost: number,
  startdatum: string,
  enddatum: string
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};

  // Group tenants by apartment and calculate total occupancy per apartment
  const apartmentOccupancy: Record<string, {
    tenants: Mieter[];
    totalOccupancyDays: number;
  }> = {};

  tenants.forEach(tenant => {
    const wohnungId = tenant.wohnung_id;
    if (!wohnungId) return;

    if (!apartmentOccupancy[wohnungId]) {
      apartmentOccupancy[wohnungId] = {
        tenants: [],
        totalOccupancyDays: 0
      };
    }

    const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);
    apartmentOccupancy[wohnungId].tenants.push(tenant);
    apartmentOccupancy[wohnungId].totalOccupancyDays += occupancy.occupancyDays;
  });

  // Calculate total weighted occupancy across all apartments
  let totalWeightedOccupancy = 0;
  Object.values(apartmentOccupancy).forEach(apt => {
    totalWeightedOccupancy += apt.totalOccupancyDays;
  });

  const totalPeriodDays = calculateTotalDays(startdatum, enddatum);

  Object.entries(apartmentOccupancy).forEach(([wohnungId, apt]) => {
    const apartmentShare = totalWeightedOccupancy > 0
      ? (apt.totalOccupancyDays / totalWeightedOccupancy) * totalCost
      : 0;

    // Split apartment share equally among tenants in the apartment
    const costPerTenant = apt.tenants.length > 0 ? apartmentShare / apt.tenants.length : 0;

    apt.tenants.forEach(tenant => {
      const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);

      distribution[tenant.id] = {
        amount: costPerTenant,
        occupancyDays: occupancy.occupancyDays,
        totalDays: totalPeriodDays
      };
    });
  });

  return distribution;
}

/**
 * Apply individual amounts (nach Rechnung) with occupancy-based weighting
 */
export function calculateNachRechnungDistribution(
  individualAmounts: Record<string, number>, // tenantId -> amount
  tenants: Mieter[],
  startdatum: string,
  enddatum: string
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};
  const totalPeriodDays = calculateTotalDays(startdatum, enddatum);

  tenants.forEach(tenant => {
    const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);
    const individualAmount = individualAmounts[tenant.id] || 0;

    // Apply the individual amount proportionally to occupancy
    const amount = individualAmount * occupancy.occupancyRatio;

    distribution[tenant.id] = {
      amount,
      occupancyDays: occupancy.occupancyDays,
      totalDays: totalPeriodDays
    };
  });

  return distribution;
}

/**
 * Calculate water consumption costs with day-based distribution
 */
export function calculateWaterCostDistribution(
  tenants: Mieter[],
  totalWaterCost: number,
  waterReadings: Record<string, number>, // tenantId -> consumption
  startdatum: string,
  enddatum: string
): Record<string, { amount: number; occupancyDays: number; totalDays: number; consumption?: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number; consumption?: number }> = {};

  // Calculate total weighted consumption (consumption * occupancy ratio)
  let totalWeightedConsumption = 0;
  const tenantData: Array<{
    tenant: Mieter;
    occupancy: TenantOccupancy;
    consumption: number;
    weightedConsumption: number;
  }> = [];

  tenants.forEach(tenant => {
    const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);
    const consumption = waterReadings[tenant.id] || 0;
    const weightedConsumption = consumption * occupancy.occupancyRatio;

    totalWeightedConsumption += weightedConsumption;
    tenantData.push({ tenant, occupancy, consumption, weightedConsumption });
  });

  const totalPeriodDays = calculateTotalDays(startdatum, enddatum);

  tenantData.forEach(({ tenant, occupancy, consumption, weightedConsumption }) => {
    const amount = totalWeightedConsumption > 0
      ? (weightedConsumption / totalWeightedConsumption) * totalWaterCost
      : 0;

    distribution[tenant.id] = {
      amount,
      occupancyDays: occupancy.occupancyDays,
      totalDays: totalPeriodDays,
      consumption
    };
  });

  return distribution;
}