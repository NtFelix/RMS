/**
 * Enhanced calculation functions for Betriebskosten Abrechnung
 * 
 * This module provides comprehensive calculation utilities for operating cost settlements,
 * including tenant cost calculations, water cost distribution, prepayment calculations,
 * and data validation.
 */

import { Mieter, Nebenkosten, WasserZaehler, WasserAblesung } from "@/lib/data-fetching";
import { calculateTenantOccupancy, TenantOccupancy } from "./date-calculations";
import { roundToNearest5 } from "@/lib/utils";
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution,
  calculateNachRechnungDistribution,
  calculateWaterCostDistribution as calculateWaterDistribution
} from "./cost-calculations";
import {
  OperatingCostBreakdown,
  WaterCostBreakdown,
  PrepaymentBreakdown,
  OccupancyCalculation,
  TenantCalculationResult,
  CalculationValidationResult
} from "@/types/optimized-betriebskosten";
import {
  calculateTenantWaterCosts,
  getTenantWaterCost,
  type TenantWaterCost
} from "./water-cost-calculations";

/**
 * Calculate occupancy percentage for a tenant during the billing period
 */
export function calculateOccupancyPercentage(
  tenant: Mieter,
  startdatum: string,
  enddatum: string
): OccupancyCalculation {
  const occupancy = calculateTenantOccupancy(tenant, startdatum, enddatum);

  // Calculate total days in period
  const startDate = new Date(startdatum);
  const endDate = new Date(enddatum);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

  // Determine effective period dates
  const tenantStart = tenant.einzug ? new Date(tenant.einzug) : startDate;
  const tenantEnd = tenant.auszug ? new Date(tenant.auszug) : endDate;

  const effectiveStart = new Date(Math.max(startDate.getTime(), tenantStart.getTime()));
  const effectiveEnd = new Date(Math.min(endDate.getTime(), tenantEnd.getTime()));

  return {
    percentage: occupancy.occupancyRatio * 100,
    daysOccupied: occupancy.occupancyDays,
    daysInPeriod: totalDays,
    moveInDate: tenant.einzug || undefined,
    moveOutDate: tenant.auszug || undefined,
    effectivePeriodStart: effectiveStart.toISOString().split('T')[0],
    effectivePeriodEnd: effectiveEnd.toISOString().split('T')[0]
  };
}

/**
 * Calculate operating costs for a tenant (excluding water costs)
 */
export function calculateTenantCosts(
  tenant: Mieter,
  nebenkosten: Nebenkosten,
  occupancyData?: OccupancyCalculation
): OperatingCostBreakdown {
  const occupancy = occupancyData || calculateOccupancyPercentage(tenant, nebenkosten.startdatum, nebenkosten.enddatum);
  const tenants = [tenant]; // For distribution calculations

  const costItems: OperatingCostBreakdown['costItems'] = [];
  let totalCost = 0;

  // Process each cost item
  if (nebenkosten.nebenkostenart && nebenkosten.betrag && nebenkosten.berechnungsart) {
    for (let i = 0; i < nebenkosten.nebenkostenart.length; i++) {
      const costName = nebenkosten.nebenkostenart[i];
      const totalCostForItem = nebenkosten.betrag[i] || 0;
      const calculationType = nebenkosten.berechnungsart[i] || 'pro Fläche';

      let tenantShare = 0;
      let pricePerSqm: number | undefined;
      let distributionBasis: string | number | undefined;

      // Calculate tenant share based on calculation type
      switch (calculationType) {
        case 'pro Fläche':
          const flächeDistribution = calculateProFlächeDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum
          );
          tenantShare = flächeDistribution[tenant.id]?.amount || 0;
          pricePerSqm = tenant.Wohnungen?.groesse ? tenantShare / tenant.Wohnungen.groesse : undefined;
          distributionBasis = `${tenant.Wohnungen?.groesse || 0} m²`;
          break;

        case 'pro Mieter':
          const mieterDistribution = calculateProMieterDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum
          );
          tenantShare = mieterDistribution[tenant.id]?.amount || 0;
          distributionBasis = '1 Mieter';
          break;

        case 'pro Wohnung':
          const wohnungDistribution = calculateProWohnungDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum
          );
          tenantShare = wohnungDistribution[tenant.id]?.amount || 0;
          distributionBasis = '1 Wohnung';
          break;

        case 'nach Rechnung':
          // For individual amounts, we'd need additional data
          // For now, assume equal distribution
          tenantShare = totalCostForItem * (occupancy.percentage / 100);
          distributionBasis = 'Individuelle Rechnung';
          break;

        default:
          // Default to area-based distribution
          const defaultDistribution = calculateProFlächeDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum
          );
          tenantShare = defaultDistribution[tenant.id]?.amount || 0;
          distributionBasis = `${tenant.Wohnungen?.groesse || 0} m²`;
      }

      costItems.push({
        costName,
        totalCostForItem,
        calculationType,
        tenantShare,
        pricePerSqm,
        distributionBasis
      });

      totalCost += tenantShare;
    }
  }

  return {
    costItems,
    totalCost
  };
}

export function calculateWaterCostDistribution(
  tenant: Mieter,
  nebenkosten: Nebenkosten,
  allTenants: Mieter[],
  waterMeters: WasserZaehler[],
  waterReadings: WasserAblesung[]
): WaterCostBreakdown {
  // Get water costs from zaehlerkosten JSONB (sum all water-related types)
  const waterTypes = ['kaltwasser', 'warmwasser'];
  const totalBuildingWaterCost = nebenkosten.zaehlerkosten
    ? waterTypes.reduce((sum, typ) => sum + (nebenkosten.zaehlerkosten?.[typ] || 0), 0)
    : 0;
  // Get water consumption from zaehlerverbrauch JSONB (sum all water-related types)
  const totalBuildingConsumption = nebenkosten.zaehlerverbrauch
    ? waterTypes.reduce((sum, typ) => sum + (nebenkosten.zaehlerverbrauch?.[typ] || 0), 0)
    : 0;

  // Use the new calculation system with official building consumption
  const tenantWaterCost = getTenantWaterCost(
    tenant.id,
    allTenants,
    waterMeters,
    waterReadings,
    totalBuildingWaterCost,
    totalBuildingConsumption,
    nebenkosten.startdatum,
    nebenkosten.enddatum
  );

  if (!tenantWaterCost) {
    // Tenant has no water consumption
    return {
      totalBuildingWaterCost,
      totalBuildingConsumption,
      pricePerCubicMeter: 0,
      tenantConsumption: 0,
      totalCost: 0,
      meterReading: undefined
    };
  }

  // Get meter reading details if available
  let meterReading: WaterCostBreakdown['meterReading'];
  if (tenantWaterCost.consumption > 0 && waterReadings.length > 0) {
    // Find the most recent reading for this tenant's apartment
    const apartmentMeters = waterMeters.filter(m => m.wohnung_id === tenant.wohnung_id);
    const apartmentMeterIds = apartmentMeters.map(m => m.id);
    const relevantReadings = waterReadings
      .filter(r => apartmentMeterIds.includes(r.zaehler_id || ''))
      .filter(r => r.ablese_datum >= nebenkosten.startdatum && r.ablese_datum <= nebenkosten.enddatum)
      .sort((a, b) => new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime());

    if (relevantReadings.length > 0) {
      const latestReading = relevantReadings[0];
      meterReading = {
        previousReading: 0, // Would need historical data
        currentReading: latestReading.zaehlerstand || 0,
        consumptionPeriod: `${nebenkosten.startdatum} - ${nebenkosten.enddatum}`
      };
    }
  }

  return {
    totalBuildingWaterCost,
    totalBuildingConsumption,
    pricePerCubicMeter: tenantWaterCost.pricePerCubicMeter,
    tenantConsumption: tenantWaterCost.consumption,
    totalCost: tenantWaterCost.costShare,
    meterReading
  };
}

/**
 * Calculate prepayments for a tenant during the billing period
 */
export function calculatePrepayments(
  tenant: Mieter,
  startdatum: string,
  enddatum: string
): PrepaymentBreakdown {
  const monthlyPayments: PrepaymentBreakdown['monthlyPayments'] = [];
  let totalPrepayments = 0;

  // Generate monthly breakdown
  const startDate = new Date(startdatum);
  const endDate = new Date(enddatum);

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Calculate occupancy for this month
    const monthOccupancy = calculateTenantOccupancy(
      tenant,
      monthStart.toISOString().split('T')[0],
      monthEnd.toISOString().split('T')[0]
    );

    // Use tenant's current Nebenkosten prepayment amount
    // For now, use a default monthly amount since nebenkosten is an array of entries
    const defaultMonthlyPrepayment = 100; // Default monthly prepayment in EUR
    const monthlyAmount = defaultMonthlyPrepayment * monthOccupancy.occupancyRatio;

    monthlyPayments.push({
      month: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
      amount: monthlyAmount,
      isActiveMonth: monthOccupancy.occupancyDays > 0,
      occupancyPercentage: monthOccupancy.occupancyRatio * 100
    });

    totalPrepayments += monthlyAmount;

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  const averageMonthlyPayment = monthlyPayments.length > 0
    ? totalPrepayments / monthlyPayments.length
    : 0;

  return {
    monthlyPayments,
    totalPrepayments,
    averageMonthlyPayment
  };
}



/**
 * Calculate recommended prepayment for next period
 */
export function calculateRecommendedPrepayment(
  tenantCalculation: TenantCalculationResult
): number {
  const totalAnnualCosts = tenantCalculation.totalCosts;

  if (totalAnnualCosts <= 0) return 0;

  // Add 10% buffer and calculate monthly amount
  const monthlyWithBuffer = (totalAnnualCosts * 1.1) / 12;

  // Round to nearest 5 euros for the monthly amount
  const roundedMonthly = roundToNearest5(monthlyWithBuffer);

  // Return the annual amount (monthly * 12)
  return roundedMonthly * 12;
}

/**
 * Format currency values for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Validate calculation input data
 */
export function validateCalculationData(
  nebenkosten: Nebenkosten,
  tenants: Mieter[],
  waterMeters?: WasserZaehler[],
  waterReadings?: WasserAblesung[]
): CalculationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Nebenkosten data
  if (!nebenkosten.startdatum || !nebenkosten.enddatum) {
    errors.push('Start- und Enddatum sind erforderlich');
  }

  if (new Date(nebenkosten.enddatum) <= new Date(nebenkosten.startdatum)) {
    errors.push('Enddatum muss nach dem Startdatum liegen');
  }

  if (!nebenkosten.nebenkostenart || nebenkosten.nebenkostenart.length === 0) {
    errors.push('Mindestens eine Nebenkostenart ist erforderlich');
  }

  if (!nebenkosten.betrag || nebenkosten.betrag.length === 0) {
    errors.push('Beträge sind erforderlich');
  }

  if (nebenkosten.nebenkostenart && nebenkosten.betrag &&
    nebenkosten.nebenkostenart.length !== nebenkosten.betrag.length) {
    errors.push('Anzahl der Nebenkostenarten muss mit Anzahl der Beträge übereinstimmen');
  }

  // Validate tenants
  if (!tenants || tenants.length === 0) {
    errors.push('Mindestens ein Mieter ist erforderlich');
  }

  tenants.forEach((tenant, index) => {
    if (!tenant.einzug) {
      warnings.push(`Mieter ${tenant.name || index + 1}: Kein Einzugsdatum angegeben`);
    }

    if (!tenant.Wohnungen?.groesse || tenant.Wohnungen.groesse <= 0) {
      warnings.push(`Mieter ${tenant.name || index + 1}: Keine gültige Wohnungsgröße angegeben`);
    }
  });

  // Validate water readings if water/meter costs are included
  const waterTypes = ['kaltwasser', 'warmwasser'];
  const hasWaterCosts = nebenkosten.zaehlerkosten && waterTypes.some(typ => (nebenkosten.zaehlerkosten?.[typ] || 0) > 0);
  if (hasWaterCosts) {
    if (!waterMeters || waterMeters.length === 0) {
      warnings.push('Wasserkosten sind angegeben, aber keine Wasserzähler vorhanden');
    } else if (!waterReadings || waterReadings.length === 0) {
      warnings.push('Wasserzähler vorhanden, aber keine Ablesungen für den Abrechnungszeitraum');
    } else {
      // Check if all apartments with tenants have water meters
      const apartmentsWithTenants = new Set(tenants.map(t => t.wohnung_id).filter((id): id is string => id != null));
      const apartmentsWithMeters = new Set(waterMeters.map(m => m.wohnung_id).filter((id): id is string => id != null));

      apartmentsWithTenants.forEach(aptId => {
        if (!apartmentsWithMeters.has(aptId)) {
          warnings.push(`Wohnung ${aptId}: Keine Wasserzähler vorhanden`);
        }
      });

      // Check if all meters have readings in the period
      waterMeters.forEach(meter => {
        const meterReadings = waterReadings.filter(r =>
          r.zaehler_id === meter.id &&
          r.ablese_datum >= nebenkosten.startdatum &&
          r.ablese_datum <= nebenkosten.enddatum
        );

        if (meterReadings.length === 0) {
          warnings.push(`Wasserzähler ${meter.custom_id || meter.id}: Keine Ablesungen im Abrechnungszeitraum`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate complete tenant result with all cost breakdowns
 */
export function calculateCompleteTenantResult(
  tenant: Mieter,
  nebenkosten: Nebenkosten,
  allTenants: Mieter[],
  waterMeters: WasserZaehler[],
  waterReadings: WasserAblesung[]
): TenantCalculationResult {
  // Calculate occupancy
  const occupancy = calculateOccupancyPercentage(tenant, nebenkosten.startdatum, nebenkosten.enddatum);

  // Calculate operating costs
  const operatingCosts = calculateTenantCosts(tenant, nebenkosten, occupancy);

  // Calculate water costs using new system
  const waterCosts = calculateWaterCostDistribution(
    tenant,
    nebenkosten,
    allTenants,
    waterMeters,
    waterReadings
  );

  // Calculate prepayments
  const prepayments = calculatePrepayments(tenant, nebenkosten.startdatum, nebenkosten.enddatum);

  // Calculate totals
  const totalCosts = operatingCosts.totalCost + waterCosts.totalCost;
  const finalSettlement = totalCosts - prepayments.totalPrepayments;

  // Calculate recommended prepayment
  const recommendedPrepayment = calculateRecommendedPrepayment({
    tenantId: tenant.id,
    tenantName: tenant.name || '',
    apartmentName: tenant.Wohnungen?.name || '',
    apartmentSize: tenant.Wohnungen?.groesse || 0,
    occupancyPercentage: occupancy.percentage,
    daysOccupied: occupancy.daysOccupied,
    daysInPeriod: occupancy.daysInPeriod,
    operatingCosts,
    waterCosts,
    totalCosts,
    prepayments,
    finalSettlement
  });

  return {
    tenantId: tenant.id,
    tenantName: tenant.name || '',
    apartmentName: tenant.Wohnungen?.name || '',
    apartmentSize: tenant.Wohnungen?.groesse || 0,
    occupancyPercentage: occupancy.percentage,
    daysOccupied: occupancy.daysOccupied,
    daysInPeriod: occupancy.daysInPeriod,
    operatingCosts,
    waterCosts,
    totalCosts,
    prepayments,
    finalSettlement,
    recommendedPrepayment
  };
}