/**
 * Water Cost Calculation Utilities
 * 
 * This module handles complex water cost calculations including:
 * - Multiple water meters per apartment
 * - Tenant move-in/move-out date handling
 * - WG (shared apartment) cost splitting based on occupancy periods
 * - Prorated water usage for partial periods
 */

import { Mieter, WasserAblesung, WasserZaehler } from "@/lib/data-fetching";
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
 * Represents water consumption for a specific tenant during a period
 */
export interface TenantWaterConsumption {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  totalConsumption: number; // Total m³ consumed
  consumptionDetails: Array<{
    meterId: string;
    meterCustomId: string | null;
    consumption: number;
    readingDate: string;
    isPartialPeriod: boolean; // True if tenant moved in/out during period
    occupancyFactor: number; // 0-1, represents portion of period tenant was present
  }>;
}

/**
 * Represents water cost allocation for a tenant
 */
export interface TenantWaterCost {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  consumption: number; // m³
  costShare: number; // EUR
  pricePerCubicMeter: number; // EUR/m³
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
 * Calculate water consumption for each tenant based on meter readings
 * Handles complex scenarios:
 * - Multiple meters per apartment
 * - Tenant move-ins/move-outs during billing period
 * - WG cost splitting based on occupancy
 */
export function calculateTenantWaterConsumption(
  tenants: Mieter[],
  waterMeters: WasserZaehler[],
  waterReadings: WasserAblesung[],
  periodStart: string,
  periodEnd: string
): TenantWaterConsumption[] {
  const consumptionByTenant: Map<string, TenantWaterConsumption> = new Map();

  // Group meters by apartment
  const metersByApartment = new Map<string, WasserZaehler[]>();
  waterMeters.forEach(meter => {
    if (!meter.wohnung_id) return;

    const meters = metersByApartment.get(meter.wohnung_id) || [];
    meters.push(meter);
    metersByApartment.set(meter.wohnung_id, meters);
  });

  // Process each apartment
  metersByApartment.forEach((meters, apartmentId) => {
    // Get all tenants who lived in this apartment during the period
    const apartmentTenants = getApartmentTenantsInPeriod(tenants, apartmentId, periodStart, periodEnd);

    if (apartmentTenants.length === 0) return;

    // Calculate total consumption for this apartment from all meters
    let totalApartmentConsumption = 0;
    const meterConsumptions: Array<{
      meterId: string;
      meterCustomId: string | null;
      consumption: number;
      readingDate: string;
    }> = [];

    meters.forEach(meter => {
      // Find readings for this meter within the period
      const meterReadings = waterReadings.filter(reading =>
        reading.zaehler_id === meter.id &&
        reading.ablese_datum >= periodStart &&
        reading.ablese_datum <= periodEnd
      );

      // Debug logging for troubleshooting
      if (process.env.NODE_ENV === 'development' && waterReadings.length > 0) {
        console.log('[Water Calculation Debug]', {
          meterId: meter.id,
          meterCustomId: meter.custom_id,
          totalReadings: waterReadings.length,
          matchingReadings: meterReadings.length,
          periodStart,
          periodEnd,
          readingDates: waterReadings.map(r => r.ablese_datum)
        });
      }

      // Sum up consumption from all readings
      const meterConsumption = meterReadings.reduce((sum, reading) => sum + reading.verbrauch, 0);

      if (meterConsumption > 0) {
        totalApartmentConsumption += meterConsumption;

        // Use the last reading date for this meter
        const lastReading = meterReadings.sort((a, b) =>
          new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime()
        )[0];

        meterConsumptions.push({
          meterId: meter.id,
          meterCustomId: meter.custom_id,
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

      // Create consumption details for this tenant
      const consumptionDetails = meterConsumptions.map(mc => ({
        meterId: mc.meterId,
        meterCustomId: mc.meterCustomId,
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
        consumptionDetails
      });
    });
  });

  return Array.from(consumptionByTenant.values());
}

/**
 * Calculate water costs for each tenant
 * Includes WG splitting logic and detailed cost breakdown
 */
export function calculateTenantWaterCosts(
  tenants: Mieter[],
  waterMeters: WasserZaehler[],
  waterReadings: WasserAblesung[],
  totalBuildingWaterCost: number,
  totalBuildingConsumption: number,
  periodStart: string,
  periodEnd: string
): TenantWaterCost[] {
  // First, calculate consumption for each tenant
  const tenantConsumptions = calculateTenantWaterConsumption(
    tenants,
    waterMeters,
    waterReadings,
    periodStart,
    periodEnd
  );

  // Calculate price per cubic meter using the official building consumption from Nebenkosten
  // This ensures the price is based on the actual total, not the sum of individual readings
  const pricePerCubicMeter = totalBuildingConsumption > 0 ? totalBuildingWaterCost / totalBuildingConsumption : 0;

  // Group tenants by apartment to identify WGs
  const tenantsByApartment = new Map<string, TenantWaterConsumption[]>();
  tenantConsumptions.forEach(tc => {
    const apartmentTenants = tenantsByApartment.get(tc.apartmentId) || [];
    apartmentTenants.push(tc);
    tenantsByApartment.set(tc.apartmentId, apartmentTenants);
  });

  // Calculate costs for each tenant
  const tenantCosts: TenantWaterCost[] = tenantConsumptions.map(tc => {
    const costShare = tc.totalConsumption * pricePerCubicMeter;
    const apartmentTenants = tenantsByApartment.get(tc.apartmentId) || [];
    const isWGMember = apartmentTenants.length > 1;

    const cost: TenantWaterCost = {
      tenantId: tc.tenantId,
      tenantName: tc.tenantName,
      apartmentId: tc.apartmentId,
      consumption: tc.totalConsumption,
      costShare: costShare,
      pricePerCubicMeter: pricePerCubicMeter,
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
 * Get water consumption for a specific tenant
 * Helper function for modal display
 */
export function getTenantWaterCost(
  tenantId: string,
  tenants: Mieter[],
  waterMeters: WasserZaehler[],
  waterReadings: WasserAblesung[],
  totalBuildingWaterCost: number,
  totalBuildingConsumption: number,
  periodStart: string,
  periodEnd: string
): TenantWaterCost | null {
  const allCosts = calculateTenantWaterCosts(
    tenants,
    waterMeters,
    waterReadings,
    totalBuildingWaterCost,
    totalBuildingConsumption,
    periodStart,
    periodEnd
  );

  return allCosts.find(cost => cost.tenantId === tenantId) || null;
}
