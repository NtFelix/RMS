/**
 * Enhanced cost calculation functions for date-based Betriebskosten system
 */

import type { Mieter } from "@/lib/types";
import { calculateTenantOccupancy, TenantOccupancy } from "./date-calculations";

/**
 * Calculate cost distribution based on area (pro Flaeche) with day-based weighting
 */
export function calculateProFlächeDistribution(
  tenants: Mieter[],
  totalCost: number,
  startdatum: string,
  enddatum: string
): Record<string, { amount: number; occupancyDays: number; totalDays: number }> {
  const distribution: Record<string, { amount: number; occupancyDays: number; totalDays: number }> = {};

  // Calculate total weighted area (area * occupancy ratio)
  let totalWeightedArea = 0;
  const tenantOccupancies: Array<{
    tenant: Mieter;
    occupancy: TenantOccupancy;
    weightedArea: number;
  }> = [];

  tenants.forEach(tenant => {
    const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);
    const apartmentArea = tenant.Wohnungen?.groesse || 0;
    const weightedArea = apartmentArea * occupancy.occupancyRatio;

    totalWeightedArea += weightedArea;
    tenantOccupancies.push({ tenant, occupancy, weightedArea });
  });

  // Distribute costs proportionally
  tenantOccupancies.forEach(({ tenant, occupancy, weightedArea }) => {
    const amount = totalWeightedArea > 0 ? (weightedArea / totalWeightedArea) * totalCost : 0;

    distribution[tenant.id] = {
      amount,
      occupancyDays: occupancy.occupancyDays,
      totalDays: Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1
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

  // Distribute costs based on occupancy days
  const totalPeriodDays = Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1;

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

  // Distribute costs to apartments, then split among tenants in each apartment
  const totalPeriodDays = Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1;

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
  const totalPeriodDays = Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1;

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

  // Distribute costs based on weighted consumption
  const totalPeriodDays = Math.ceil((new Date(enddatum).getTime() - new Date(startdatum).getTime()) / (1000 * 3600 * 24)) + 1;

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