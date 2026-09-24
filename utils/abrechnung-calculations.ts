/**
 * Enhanced calculation functions for Betriebskosten Abrechnung
 * 
 * This module provides comprehensive calculation utilities for operating cost settlements,
 * including tenant cost calculations, water cost distribution, prepayment calculations,
 * and data validation.
 */

import type { Mieter, Nebenkosten, Zaehler, ZaehlerAblesung, Finanzen, Rechnung } from "@/lib/types";

import { WATER_METER_TYPES } from "@/lib/zaehler-types";
import { sumZaehlerValues } from "@/lib/zaehler-utils";
import { calculateTenantOccupancy, calculateTotalDays, TenantOccupancy, getMonthDateRange, isDateInPeriod, maxIsoDate, minIsoDate, toIsoDateOnly } from "./date-calculations";
import { isSameCostName } from "./betriebskosten";
import { computeWgFactorsByTenant } from "./wg-cost-calculations";
import { roundToNearest5 } from "@/lib/utils";
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution,
  calculateWaterCostDistribution as calculateWaterDistribution,
  sumUniqueApartmentAreas
} from "./cost-calculations";
import {
  OperatingCostBreakdown,
  MeterCostBreakdown,
  PrepaymentBreakdown,
  OccupancyCalculation,
  TenantCalculationResult,
  CalculationValidationResult
} from "@/types/optimized-betriebskosten";
import {
  calculateTenantMeterCosts,
  getTenantMeterCost,
  type TenantMeterCost
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

  const totalDays = calculateTotalDays(toIsoDateOnly(startdatum), toIsoDateOnly(enddatum));

  return {
    percentage: occupancy.occupancyRatio * 100,
    daysOccupied: occupancy.occupancyDays,
    daysInPeriod: totalDays,
    moveInDate: tenant.einzug || undefined,
    moveOutDate: tenant.auszug || undefined,
    // Empty when the tenant does not occupy any part of the period (consistent with 0% occupancy)
    effectivePeriodStart: occupancy.overlapStartIso ?? '',
    effectivePeriodEnd: occupancy.overlapEndIso ?? ''
  };
}

/**
 * Calculate operating costs for a tenant (excluding water costs)
 */
export function calculateTenantCosts(
  tenant: Mieter,
  nebenkosten: Nebenkosten,
  allTenants?: Mieter[],
  occupancyData?: OccupancyCalculation,
  rechnungen?: Rechnung[],
  // Precomputed computeWgFactorsByTenant(allTenants, startdatum, enddatum), shared across tenants
  precomputedWgFactors?: Record<string, number>
): OperatingCostBreakdown {
  const occupancy = occupancyData || calculateOccupancyPercentage(tenant, nebenkosten.startdatum, nebenkosten.enddatum);
  const tenants = allTenants || [tenant]; // For distribution calculations

  const costItems: OperatingCostBreakdown['costItems'] = [];
  let totalCost = 0;

  // For the verteiler display in the PDF: show tenant area vs total physical house area.
  // gesamtFlaeche is the canonical value set by the server action (Haeuser.groesse),
  // consistent with what the overview modal shows. Never less than the occupied apartments'
  // area, so a stale house area can't overcharge (shares would sum to more than 100 %).
  const totalHouseArea = Math.max((nebenkosten as any).gesamtFlaeche || 0, sumUniqueApartmentAreas(tenants));

  // WG day-share factors depend only on the tenants and period, so compute them at most once
  // for all area- and apartment-based cost items instead of once per item.
  let wgFactors = precomputedWgFactors;
  const getWgFactors = () =>
    wgFactors ??= computeWgFactorsByTenant(tenants, nebenkosten.startdatum, nebenkosten.enddatum);

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
        case 'pro Flaeche':
        default: { // Unknown calculation types default to area-based distribution
          const flächeDistribution = calculateProFlächeDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum,
            totalHouseArea,
            getWgFactors()
          );
          tenantShare = flächeDistribution[tenant.id]?.amount || 0;
          // House-wide rate for this cost item (total cost ÷ total house area), not derived
          // back from tenantShare — that would divide the rate itself by the number of
          // co-tenants sharing an apartment, showing WG tenants a misleadingly low €/m²
          // even though the underlying rate is the same for every tenant in the house.
          // Not shown for tenants without occupied days (their share is 0).
          pricePerSqm = (totalHouseArea > 0 && occupancy.percentage > 0)
            ? Math.round((totalCostForItem / totalHouseArea) * 10000) / 10000
            : undefined;
          // Verteiler shows physical area vs total house area (for PDF column)
          distributionBasis = totalHouseArea > 0 ? `${totalHouseArea} m²` : '-';
          break;
        }

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
            nebenkosten.enddatum,
            nebenkosten.anzahlWohnungen,
            getWgFactors()
          );
          tenantShare = wohnungDistribution[tenant.id]?.amount || 0;
          distributionBasis = '1 Wohnung';
          break;

        case 'nach Rechnung': {
          // Look up the tenant's specific invoice from Rechnungen by cost name + mieter_id.
          // betrag[] in Nebenkosten holds the SUM of all tenants' amounts, so it must not be
          // used as a per-tenant fallback: a tenant without a Rechnungen row owes nothing.
          const matching = rechnungen?.find(
            r => isSameCostName(r.name, costName) && r.mieter_id === tenant.id
          );
          // Use occupancy.percentage (same basis as the other distributions) instead of
          // daysOccupied / daysInPeriod, whose day counts differ across DST boundaries.
          // Tenants without an Einzugsdatum have 0 occupancy; keep their entered amount in full.
          const occupancyRatio = tenant.einzug ? occupancy.percentage / 100 : 1;
          tenantShare = (matching?.betrag ?? 0) * occupancyRatio;
          distributionBasis = '-';
          break;
        }
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

export function calculateMeterCostDistribution(
  tenant: Mieter,
  nebenkosten: Nebenkosten,
  allTenants: Mieter[],
  meters: Zaehler[],
  readings: ZaehlerAblesung[]
): MeterCostBreakdown {
  // Pass per-type costs and consumption to the calculation function
  // This ensures each meter type gets its own price per unit
  const zaehlerkosten = nebenkosten.zaehlerkosten || {};
  const zaehlerverbrauch = nebenkosten.zaehlerverbrauch || {};
  const totalBuildingMeterCost = sumZaehlerValues(nebenkosten.zaehlerkosten);
  const totalBuildingConsumption = sumZaehlerValues(nebenkosten.zaehlerverbrauch);

  // Use the new per-type calculation system
  const tenantMeterCost = getTenantMeterCost(
    tenant.id,
    allTenants,
    meters,
    readings,
    zaehlerkosten,
    zaehlerverbrauch,
    nebenkosten.startdatum,
    nebenkosten.enddatum
  );

  if (!tenantMeterCost) {
    // Tenant has no meter usage
    return {
      totalBuildingMeterCost,
      totalBuildingConsumption,
      pricePerUnit: 0,
      tenantConsumption: 0,
      totalCost: 0,
      meterReading: undefined
    };
  }

  // Get meter reading details if available
  let meterReading: MeterCostBreakdown['meterReading'];
  if (tenantMeterCost.consumption > 0 && readings.length > 0) {
    // Find the most recent reading for this tenant's apartment
    const apartmentMeters = meters.filter(m => m.wohnung_id === tenant.wohnung_id);
    const apartmentMeterIds = apartmentMeters.map(m => m.id);
    // Latest reading in the period (YYYY-MM-DD strings compare chronologically)
    const latestReading = readings
      .filter(r => apartmentMeterIds.includes(r.zaehler_id || ''))
      .filter(r => isDateInPeriod(r.ablese_datum, nebenkosten.startdatum, nebenkosten.enddatum))
      .reduce<ZaehlerAblesung | undefined>((latest, r) =>
        !latest || toIsoDateOnly(r.ablese_datum) > toIsoDateOnly(latest.ablese_datum) ? r : latest, undefined);

    if (latestReading) {
      meterReading = {
        previousReading: 0, // Would need historical data
        currentReading: latestReading.zaehlerstand || 0,
        consumptionPeriod: `${nebenkosten.startdatum} - ${nebenkosten.enddatum}`
      };
    }
  }

  return {
    totalBuildingMeterCost,
    totalBuildingConsumption,
    pricePerUnit: tenantMeterCost.pricePerUnit,
    tenantConsumption: tenantMeterCost.consumption,
    totalCost: tenantMeterCost.costShare,
    meterReading
  };
}

/**
 * Calculate prepayments for a tenant during the billing period
 */
export function calculatePrepayments(
  tenant: Mieter,
  startdatum: string,
  enddatum: string,
  actualPayments?: Finanzen[],
  mode: 'scheduled' | 'actual' = 'scheduled'
): PrepaymentBreakdown {
  const monthlyPayments: PrepaymentBreakdown['monthlyPayments'] = [];
  let totalPrepayments = 0;
  let missingScheduleMonths = 0;
  // Number of billed months, counting partial first/last months by their share
  let totalMonthShare = 0;

  // Generate monthly breakdown
  const periodStartIso = toIsoDateOnly(startdatum);
  const periodEndIso = toIsoDateOnly(enddatum);
  const [startYear, startMonth] = periodStartIso.split('-').map(Number);
  const [endYear, endMonth] = periodEndIso.split('-').map(Number);

  if ([startYear, startMonth, endYear, endMonth].some(n => !n) || periodEndIso < periodStartIso) {
    return {
      monthlyPayments: [],
      totalPrepayments: 0,
      averageMonthlyPayment: 0
    };
  }

  // Prepayment schedule normalized once, newest entry first
  const nebenkostenSchedule = (Array.isArray(tenant.nebenkosten) ? tenant.nebenkosten : [])
    .filter(n => n.date)
    .map(n => ({ iso: toIsoDateOnly(n.date), amount: n.amount }))
    .sort((a, b) => b.iso.localeCompare(a.iso));

  const lastMonthIndex = endYear * 12 + endMonth - 1;
  for (let monthIndex = startYear * 12 + startMonth - 1; monthIndex <= lastMonthIndex; monthIndex++) {
    const { startIso: monthStartIso, endIso: monthEndIso, daysInMonth } = getMonthDateRange(Math.floor(monthIndex / 12), monthIndex % 12 + 1);

    // Clip the first/last month to the billing period so partial months are prorated, not charged in full
    const rangeStartIso = maxIsoDate(periodStartIso, monthStartIso);
    const rangeEndIso = minIsoDate(periodEndIso, monthEndIso);
    totalMonthShare += calculateTotalDays(rangeStartIso, rangeEndIso) / daysInMonth;

    // Occupancy for the part of this month inside the billing period, relative to the full calendar month
    const { occupancyDays } = calculateTenantOccupancy(tenant, rangeStartIso, rangeEndIso);
    const occupancyRatio = occupancyDays / daysInMonth;

    // Use tenant's actual Nebenkosten prepayment data
    let monthlyAmount = 0;

    if (mode === 'actual' && actualPayments) {
      const monthPayments = actualPayments.filter(p => isDateInPeriod(p.datum, rangeStartIso, rangeEndIso));
      monthlyAmount = monthPayments.reduce((sum, p) => sum + Number(p.betrag), 0);
    } else if (mode === 'scheduled') {
      if (occupancyDays > 0) {
        // Find applicable prepayment for this month.
        // We look for the latest prepayment entry that is valid before or during the billed part of this month.
        const applicableNK = nebenkostenSchedule.find(n => n.iso <= rangeEndIso);

        if (applicableNK) {
          monthlyAmount = (Number(applicableNK.amount) || 0) * occupancyRatio;
        }
      }

      // Track months where the tenant was occupied but no schedule entry exists.
      // We do NOT inject a fallback value — missing data should be surfaced explicitly.
      if (monthlyAmount === 0 && occupancyDays > 0) {
        missingScheduleMonths++;
      }
    }

    monthlyPayments.push({
      month: monthStartIso.slice(0, 7),
      amount: monthlyAmount,
      isActiveMonth: occupancyDays > 0,
      occupancyPercentage: occupancyRatio * 100
    });

    totalPrepayments += monthlyAmount;
  }

  const averageMonthlyPayment = totalMonthShare > 0
    ? totalPrepayments / totalMonthShare
    : 0;

  return {
    monthlyPayments,
    totalPrepayments,
    averageMonthlyPayment,
    ...(mode === 'scheduled' && missingScheduleMonths > 0 ? { missingScheduleMonths } : {})
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
  waterMeters?: Zaehler[],
  waterReadings?: ZaehlerAblesung[]
): CalculationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Nebenkosten data
  if (!nebenkosten.startdatum || !nebenkosten.enddatum) {
    errors.push('Start- und Enddatum sind erforderlich');
  } else if (toIsoDateOnly(nebenkosten.enddatum) <= toIsoDateOnly(nebenkosten.startdatum)) {
    // Compared as YYYY-MM-DD so German dates are validated too (parseISO rejects them)
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
  const hasWaterCosts = nebenkosten.zaehlerkosten && WATER_METER_TYPES.some(typ => (nebenkosten.zaehlerkosten?.[typ] || 0) > 0);
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
          isDateInPeriod(r.ablese_datum, nebenkosten.startdatum, nebenkosten.enddatum)
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
  meters: Zaehler[],
  readings: ZaehlerAblesung[],
  actualPayments?: Finanzen[],
  prepaymentMode: 'scheduled' | 'actual' = 'scheduled',
  rechnungen?: Rechnung[],
  // Precomputed computeWgFactorsByTenant(allTenants, startdatum, enddatum); compute it once
  // per billing run instead of once per tenant
  wgFactors?: Record<string, number>
): TenantCalculationResult {
  // Calculate occupancy
  const occupancy = calculateOccupancyPercentage(tenant, nebenkosten.startdatum, nebenkosten.enddatum);

  // Calculate operating costs
  const operatingCosts = calculateTenantCosts(tenant, nebenkosten, allTenants, occupancy, rechnungen, wgFactors);


  // Calculate meter costs using new system
  const meterCosts = calculateMeterCostDistribution(
    tenant,
    nebenkosten,
    allTenants,
    meters,
    readings
  );

  // Pre-filter actual payments for this tenant if in actual mode
  // This improves performance by avoiding repeated building-wide filtering inside the monthly loop
  const tenantActualPayments = (prepaymentMode === 'actual' && actualPayments && tenant.wohnung_id)
    ? actualPayments.filter(p => p.wohnung_id === tenant.wohnung_id)
    : actualPayments;

  // Calculate prepayments
  const prepayments = calculatePrepayments(
    tenant,
    nebenkosten.startdatum,
    nebenkosten.enddatum,
    tenantActualPayments,
    prepaymentMode
  );

  // Calculate totals
  const totalCosts = operatingCosts.totalCost + meterCosts.totalCost;
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
    meterCosts,
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
    meterCosts,
    totalCosts,
    prepayments,
    finalSettlement,
    recommendedPrepayment
  };
}

/**
 * Calculate summary totals across all tenants for the operating cost overview
 */
export function calculateAbrechnungSummary(
  tenants: Mieter[],
  nebenkosten: Nebenkosten,
  meters: Zaehler[],
  readings: ZaehlerAblesung[],
  actualPayments?: Finanzen[],
  prepaymentMode: 'scheduled' | 'actual' = 'scheduled',
  rechnungen?: Rechnung[]
) {
  let totalAbrechnungVolumen = 0;
  let totalVorauszahlungen = 0;
  const wgFactors = nebenkosten.startdatum && nebenkosten.enddatum
    ? computeWgFactorsByTenant(tenants, nebenkosten.startdatum, nebenkosten.enddatum)
    : undefined;

  tenants.forEach(tenant => {
    // We can reuse the complete tenant result calculation which encapsulates all logic
    // (occupancy, operating costs, meter costs, prepayments)
    const result = calculateCompleteTenantResult(
      tenant,
      nebenkosten,
      tenants,
      meters,
      readings,
      actualPayments,
      prepaymentMode,
      rechnungen,
      wgFactors
    );

    totalAbrechnungVolumen += result.totalCosts;
    totalVorauszahlungen += result.prepayments.totalPrepayments;
  });

  return {
    totalAbrechnungVolumen,
    totalVorauszahlungen,
    totalBalance: totalAbrechnungVolumen - totalVorauszahlungen
  };
}