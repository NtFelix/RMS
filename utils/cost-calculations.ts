/**
 * Enhanced cost calculation functions for date-based Betriebskosten system
 */

import type { Mieter } from "@/lib/types";
import { calculateTenantOccupancy, TenantOccupancy, calculateTotalDays } from "./date-calculations";
import { computeWgFactorsByTenant } from "./wg-cost-calculations";

// Day-share factors depend only on the tenant list and period, not on the cost amount,
// so compute them once per tenant list instead of once per cost item and tenant.
const wgFactorCache = new WeakMap<Mieter[], Map<string, Record<string, number>>>();

function getCachedWgFactors(tenants: Mieter[], startdatum: string, enddatum: string): Record<string, number> {
  let byPeriod = wgFactorCache.get(tenants);
  if (!byPeriod) {
    byPeriod = new Map();
    wgFactorCache.set(tenants, byPeriod);
  }
  const key = `${startdatum}|${enddatum}`;
  let factors = byPeriod.get(key);
  if (!factors) {
    factors = computeWgFactorsByTenant(tenants, startdatum, enddatum);
    byPeriod.set(key, factors);
  }
  return factors;
}

/**
 * Sum of physical apartment areas, counting each apartment once even when it has
 * several (WG or sequential) tenants. Fallback when the house area (gesamtFlaeche) is unknown.
 */
export function sumUniqueApartmentAreas(tenants: Mieter[]): number {
  const areas = new Map<string, number>();
  tenants.forEach(t => {
    const wohnungId = t.wohnung_id || t.id;
    if (!areas.has(wohnungId)) areas.set(wohnungId, t.Wohnungen?.groesse || 0);
  });
  let sum = 0;
  areas.forEach(area => { sum += area; });
  return sum;
}

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

  // Each tenant's share of their apartment, splitting every day equally among the
  // co-tenants active that day (vacant days belong to no one).
  const wgFactors = getCachedWgFactors(tenants, startdatum, enddatum);

  // An apartment's occupied-day ratio is the sum of its tenants' factors (each occupied
  // day contributes exactly 1). Only needed when no total house area is given.
  let totalWeightedArea = 0;
  apartmentGroups.forEach(group => {
    const unionRatio = Math.min(group.tenants.reduce((sum, t) => sum + (wgFactors[t.id] || 0), 0), 1);
    totalWeightedArea += group.area * unionRatio;
  });

  const denominator = totalHouseArea !== undefined && totalHouseArea !== null
    ? (totalHouseArea > 0 ? totalHouseArea : totalWeightedArea)
    : totalWeightedArea;

  // Apartment cost (area ÷ denominator × totalCost) allocated by the tenant's day share.
  tenants.forEach(tenant => {
    const area = apartmentGroups.get(tenant.wohnung_id || tenant.id)!.area;
    const tenantOccupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);

    distribution[tenant.id] = {
      amount: denominator > 0 ? (area / denominator) * totalCost * (wgFactors[tenant.id] || 0) : 0,
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