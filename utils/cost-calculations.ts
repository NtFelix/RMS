/**
 * Enhanced cost calculation functions for date-based Betriebskosten system
 */

import type { Mieter } from "@/lib/types";
import { calculateTenantOccupancy, TenantOccupancy, calculateTotalDays } from "./date-calculations";
import { computeWgFactorsByTenant, groupTenantsByApartment } from "./wg-cost-calculations";

/**
 * Sum of physical apartment areas, counting each apartment once even when it has
 * several (WG or sequential) tenants. Fallback when the house area (gesamtFlaeche) is unknown.
 */
export function sumUniqueApartmentAreas(tenants: Mieter[]): number {
  let sum = 0;
  for (const group of groupTenantsByApartment(tenants).values()) {
    sum += group[0].Wohnungen?.groesse || 0;
  }
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
  totalHouseArea?: number,
  // Precomputed computeWgFactorsByTenant(tenants, startdatum, enddatum); pass it when
  // distributing several cost items over the same tenants to avoid recomputing it.
  wgFactors: Record<string, number> = computeWgFactorsByTenant(tenants, startdatum, enddatum)
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  // Each tenant's share of their apartment, splitting every day equally among the
  // co-tenants active that day (vacant days belong to no one). The factors of one
  // apartment sum to its occupied-day ratio (<= 1), so area × factor never stacks
  // the apartment's area for WG or sequential tenants.
  const areaOf = (tenant: Mieter) => tenant.Wohnungen?.groesse || 0;
  const totalWeightedArea = tenants.reduce((sum, t) => sum + areaOf(t) * (wgFactors[t.id] || 0), 0);

  const denominator = totalHouseArea !== undefined && totalHouseArea !== null
    ? (totalHouseArea > 0 ? totalHouseArea : totalWeightedArea)
    : totalWeightedArea;

  return distributeByApartmentWeight(tenants, totalCost, startdatum, enddatum, areaOf, denominator, wgFactors);
}

/**
 * Apartment cost (weight ÷ denominator × totalCost) allocated by each tenant's day share
 * (WG factor). Shared by the pro Fläche (weight = area) and pro Wohnung (weight = 1) keys.
 */
function distributeByApartmentWeight(
  tenants: Mieter[],
  totalCost: number,
  startdatum: string,
  enddatum: string,
  weightOf: (tenant: Mieter) => number,
  denominator: number,
  wgFactors: Record<string, number>
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};
  const totalDays = calculateTotalDays(startdatum, enddatum);

  tenants.forEach(tenant => {
    const tenantOccupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);

    distribution[tenant.id] = {
      amount: denominator > 0 ? (weightOf(tenant) / denominator) * totalCost * (wgFactors[tenant.id] || 0) : 0,
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
  enddatum: string,
  // Apartments in the house, including ones vacant all period (like totalHouseArea for pro Fläche)
  totalApartmentCount?: number,
  // Precomputed computeWgFactorsByTenant(tenants, startdatum, enddatum); pass it when
  // distributing several cost items over the same tenants to avoid recomputing it.
  wgFactors: Record<string, number> = computeWgFactorsByTenant(tenants, startdatum, enddatum)
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  // Tenants without an apartment can't be billed per apartment
  const apartmentTenants = tenants.filter(tenant => tenant.wohnung_id);
  // Never fewer than the apartments the tenants live in, so a stale house count can't over-bill
  const apartmentCount = Math.max(
    totalApartmentCount || 0,
    new Set(apartmentTenants.map(tenant => tenant.wohnung_id)).size
  );

  // Every apartment gets the same share, split by day among the co-tenants active that day
  // (WG or sequential tenants). The factors of one apartment sum to its occupied-day ratio,
  // so a WG never counts as several apartments and the landlord bears vacant days.
  return distributeByApartmentWeight(apartmentTenants, totalCost, startdatum, enddatum, () => 1, apartmentCount, wgFactors);
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