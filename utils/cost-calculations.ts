/**
 * Enhanced cost calculation functions for date-based Betriebskosten system
 */

import type { Mieter } from "@/lib/types";
import { calculateTenantOccupancy } from "./date-calculations";
import { computeWgFactorsByTenant, groupTenantsByApartment } from "./wg-cost-calculations";
import { isRechenbasis360, calculateTenantRechentage, type Rechenbasis } from "./rechentage";

type AmountDistribution = Record<string, { amount: number }>;

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
 * Apartments for 'pro Wohnung': the house's count (vacant ones included), but never fewer than
 * the apartments the tenants live in, so a stale house count can't over-bill.
 */
export function effectiveApartmentCount(totalApartmentCount: number | null | undefined, tenants: Mieter[]): number {
  const tenantApartments = new Set(tenants.filter(tenant => tenant.wohnung_id).map(tenant => tenant.wohnung_id));
  return Math.max(totalApartmentCount || 0, tenantApartments.size);
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
  // Precomputed computeWgFactorsByTenant(tenants, startdatum, enddatum, rechenbasis); pass it when
  // distributing several cost items over the same tenants to avoid recomputing it.
  wgFactors?: Record<string, number>,
  rechenbasis?: Rechenbasis
): AmountDistribution {
  const factors = wgFactors ?? computeWgFactorsByTenant(tenants, startdatum, enddatum, rechenbasis);

  // Each tenant's share of their apartment, splitting every day equally among the
  // co-tenants active that day (vacant days belong to no one). The factors of one
  // apartment sum to its occupied-day ratio (<= 1), so area × factor never stacks
  // the apartment's area for WG or sequential tenants.
  const areaOf = (tenant: Mieter) => tenant.Wohnungen?.groesse || 0;
  const totalWeightedArea = tenants.reduce((sum, t) => sum + areaOf(t) * (factors[t.id] || 0), 0);

  const denominator = totalHouseArea !== undefined && totalHouseArea !== null
    ? (totalHouseArea > 0 ? totalHouseArea : totalWeightedArea)
    : totalWeightedArea;

  return distributeByApartmentWeight(tenants, totalCost, areaOf, denominator, factors);
}

/**
 * Apartment cost (weight ÷ denominator × totalCost) allocated by each tenant's day share
 * (WG factor). Shared by the pro Fläche (weight = area) and pro Wohnung (weight = 1) keys.
 */
function distributeByApartmentWeight(
  tenants: Mieter[],
  totalCost: number,
  weightOf: (tenant: Mieter) => number,
  denominator: number,
  wgFactors: Record<string, number>
): AmountDistribution {
  const distribution: AmountDistribution = {};

  tenants.forEach(tenant => {
    distribution[tenant.id] = {
      amount: denominator > 0 ? (weightOf(tenant) / denominator) * totalCost * (wgFactors[tenant.id] || 0) : 0
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
  enddatum: string,
  rechenbasis?: Rechenbasis
): AmountDistribution {
  const distribution: AmountDistribution = {};
  const is360 = isRechenbasis360({ rechenbasis });

  // Calculate total occupancy days (Rechentage on the 360-day basis) across all tenants
  let totalOccupancyDays = 0;
  const tenantOccupancies: Array<{
    tenant: Mieter;
    occupancyDays: number;
  }> = [];

  tenants.forEach(tenant => {
    const occupancyDays = is360
      ? calculateTenantRechentage(tenant, startdatum, enddatum).rechentage
      : calculateTenantOccupancy(tenant, startdatum, enddatum).occupancyDays;
    totalOccupancyDays += occupancyDays;
    tenantOccupancies.push({ tenant, occupancyDays });
  });

  tenantOccupancies.forEach(({ tenant, occupancyDays }) => {
    const amount = totalOccupancyDays > 0 ? (occupancyDays / totalOccupancyDays) * totalCost : 0;

    distribution[tenant.id] = { amount };
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
  // Precomputed computeWgFactorsByTenant(tenants, startdatum, enddatum, rechenbasis); pass it when
  // distributing several cost items over the same tenants to avoid recomputing it.
  wgFactors?: Record<string, number>,
  rechenbasis?: Rechenbasis
): AmountDistribution {
  // Tenants without an apartment can't be billed per apartment
  const apartmentTenants = tenants.filter(tenant => tenant.wohnung_id);
  const apartmentCount = effectiveApartmentCount(totalApartmentCount, apartmentTenants);
  const factors = wgFactors ?? computeWgFactorsByTenant(tenants, startdatum, enddatum, rechenbasis);

  // Every apartment gets the same share, split by day among the co-tenants active that day
  // (WG or sequential tenants). The factors of one apartment sum to its occupied-day ratio,
  // so a WG never counts as several apartments and the landlord bears vacant days.
  return distributeByApartmentWeight(apartmentTenants, totalCost, () => 1, apartmentCount, factors);
}