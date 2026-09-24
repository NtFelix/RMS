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
import { isSameCostName, normalizeBerechnungsart } from "./betriebskosten";
import { computeWgFactorsByTenant } from "./wg-cost-calculations";
import { roundToNearest5 } from "@/lib/utils";
import { BERECHNUNGSART_OPTIONS } from "@/lib/constants";
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
 * Cost type used for billing: legacy spellings ('pro person', 'pro mieter', …) are mapped to
 * their canonical value. An empty or unrecognised value is returned as-is ('pro Fläche' when
 * empty) and billed by area; findUnrecognisedBerechnungsarten reports those items.
 */
const resolveBerechnungsart = (art: string | null | undefined): string =>
  normalizeBerechnungsart(art || '') || art || 'pro Fläche';

/** Whether a cost type is split by area: 'pro Fläche' and any empty or unknown type */
export const isAreaBasedBerechnungsart = (art: string): boolean => {
  const normalized = normalizeBerechnungsart(art || '');
  return !normalized || normalized === 'pro Flaeche';
};

/**
 * Cost items whose Berechnungsart is empty or not recognised even after normalising.
 * The calculation bills them by area, so callers should warn the user.
 */
export function findUnrecognisedBerechnungsarten(
  nebenkosten: Pick<Nebenkosten, 'nebenkostenart' | 'berechnungsart'>
): { costName: string; berechnungsart: string }[] {
  return (nebenkosten.nebenkostenart || [])
    .map((costName, i) => ({ costName, berechnungsart: nebenkosten.berechnungsart?.[i] || '' }))
    .filter(item => !normalizeBerechnungsart(item.berechnungsart));
}

/**
 * House area for 'pro Fläche': the stored area (gesamtFlaeche), but never less than the
 * occupied apartments' area, so a stale house area can't make shares sum to more than 100 %.
 */
export function effectiveHouseArea(gesamtFlaeche: number | null | undefined, tenants: Mieter[]): number {
  return Math.max(gesamtFlaeche || 0, sumUniqueApartmentAreas(tenants));
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
  // gesamtFlaeche is the canonical value set by the server action (Haeuser.groesse).
  // Only area-based items need it, so compute it at most once and only when needed.
  let totalHouseArea: number | undefined;
  const getTotalHouseArea = () =>
    totalHouseArea ??= effectiveHouseArea((nebenkosten as any).gesamtFlaeche, tenants);

  // WG day-share factors depend only on the tenants and period, so compute them at most once
  // for all area- and apartment-based cost items instead of once per item.
  let wgFactors = precomputedWgFactors;
  const getWgFactors = () =>
    wgFactors ??= computeWgFactorsByTenant(tenants, nebenkosten.startdatum, nebenkosten.enddatum);

  // Process each cost item
  // A missing Berechnungsart is billed by area like an empty one (findUnrecognisedBerechnungsarten warns)
  if (nebenkosten.nebenkostenart && nebenkosten.betrag) {
    for (let i = 0; i < nebenkosten.nebenkostenart.length; i++) {
      const costName = nebenkosten.nebenkostenart[i];
      const totalCostForItem = nebenkosten.betrag[i] || 0;
      const calculationType = resolveBerechnungsart(nebenkosten.berechnungsart?.[i]);

      let tenantShare = 0;
      let pricePerSqm: number | undefined;
      let distributionBasis: string | number | undefined;

      // Calculate tenant share based on calculation type
      switch (calculationType) {
        case 'pro Fläche':
        case 'pro Flaeche':
        default: { // Unknown calculation types default to area-based distribution (validateCalculationData warns)
          const houseArea = getTotalHouseArea();
          const flächeDistribution = calculateProFlächeDistribution(
            tenants,
            totalCostForItem,
            nebenkosten.startdatum,
            nebenkosten.enddatum,
            houseArea,
            getWgFactors()
          );
          tenantShare = flächeDistribution[tenant.id]?.amount || 0;
          // House-wide rate for this cost item (total cost ÷ total house area), not derived
          // back from tenantShare — that would divide the rate itself by the number of
          // co-tenants sharing an apartment, showing WG tenants a misleadingly low €/m²
          // even though the underlying rate is the same for every tenant in the house.
          // Not shown for tenants without occupied days (their share is 0).
          pricePerSqm = (houseArea > 0 && occupancy.percentage > 0)
            ? Math.round((totalCostForItem / houseArea) * 10000) / 10000
            : undefined;
          // Verteiler shows physical area vs total house area (for PDF column)
          distributionBasis = houseArea > 0 ? `${houseArea} m²` : '-';
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
        // Shown to the user, so use the option label ('pro Fläche', not 'pro Flaeche')
        calculationType: BERECHNUNGSART_OPTIONS.find(opt => opt.value === calculationType)?.label ?? calculationType,
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

type PrepaymentSchedule = { iso: string; amount: number | string }[];

/** A tenant's prepayment schedule (Soll), newest entry first */
const getPrepaymentSchedule = (tenant: Mieter): PrepaymentSchedule =>
  (Array.isArray(tenant.nebenkosten) ? tenant.nebenkosten : [])
    .filter(n => n.date)
    .map(n => ({ iso: toIsoDateOnly(n.date), amount: n.amount }))
    .sort((a, b) => b.iso.localeCompare(a.iso));

/**
 * Soll prepayment for the billed part of a month: the newest schedule entry dated on or before
 * the end of that part, prorated by the days the tenant lived there in the calendar month.
 */
const scheduledMonthlyAmount = (
  schedule: PrepaymentSchedule,
  rangeEndIso: string,
  occupancyDays: number,
  daysInMonth: number
): number => {
  if (occupancyDays <= 0) return 0;
  const applicable = schedule.find(n => n.iso <= rangeEndIso);
  return applicable ? (Number(applicable.amount) || 0) * (occupancyDays / daysInMonth) : 0;
};

/**
 * Calculate prepayments for a tenant during the billing period
 */
export function calculatePrepayments(
  tenant: Mieter,
  startdatum: string,
  enddatum: string,
  actualPayments?: Finanzen[],
  mode: 'scheduled' | 'actual' = 'scheduled',
  // All tenants of the house/apartment, needed only in 'actual' mode to split a month's
  // apartment payment(s) between the tenants living there that month.
  // Falls back to treating the tenant as the sole occupant when omitted.
  allTenants?: Mieter[]
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
  const nebenkostenSchedule = getPrepaymentSchedule(tenant);

  // 'actual' mode: the tenant first, then everyone else in the same apartment, with their schedules
  const occupants = mode === 'actual'
    ? [
      { tenant, schedule: nebenkostenSchedule },
      ...(allTenants ?? [])
        .filter(t => t.id !== tenant.id && t.wohnung_id && t.wohnung_id === tenant.wohnung_id)
        .map(t => ({ tenant: t, schedule: getPrepaymentSchedule(t) }))
    ]
    : [];

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
      const monthTotal = monthPayments.reduce((sum, p) => sum + Number(p.betrag), 0);

      // A tenant who did not occupy the apartment during this month owes nothing from it,
      // mirroring the 'scheduled' branch's occupancyDays > 0 gate below.
      if (occupancyDays > 0 && monthTotal !== 0) {
        // Payments belong to the apartment, not to a tenant (Finanzen has no mieter_id). Split a
        // month's payments between the tenants living there that month (a WG, or a handover
        // within the month) in proportion to what each should have prepaid (Soll, prorated by
        // days); if none of them has a Soll that month, by occupied days.
        // Known limitation (accepted for now): a roommate without a Soll gets none of the payment
        // while others have one, even if they paid. Fixing it needs payments linked to a tenant.
        const shares = occupants.map(({ tenant: occupant, schedule }) => {
          const days = occupant.id === tenant.id
            ? occupancyDays
            : calculateTenantOccupancy(occupant, rangeStartIso, rangeEndIso).occupancyDays;
          return { days, soll: scheduledMonthlyAmount(schedule, rangeEndIso, days, daysInMonth) };
        });
        const totalSoll = shares.reduce((sum, share) => sum + share.soll, 0);
        const totalDays = shares.reduce((sum, share) => sum + share.days, 0);

        monthlyAmount = totalSoll > 0
          ? monthTotal * (shares[0].soll / totalSoll)
          : monthTotal * (occupancyDays / totalDays);
      }
    } else if (mode === 'scheduled') {
      monthlyAmount = scheduledMonthlyAmount(nebenkostenSchedule, rangeEndIso, occupancyDays, daysInMonth);

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

  // Unknown cost types are billed by area; say so instead of doing it silently
  findUnrecognisedBerechnungsarten(nebenkosten).forEach(({ costName, berechnungsart }) => {
    warnings.push(berechnungsart
      ? `Kostenart "${costName}": Unbekannte Berechnungsart "${berechnungsart}", wird pro Fläche verteilt`
      : `Kostenart "${costName}": Keine Berechnungsart angegeben, wird pro Fläche verteilt`);
  });

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

  // Pre-filter actual payments for this tenant if in actual mode.
  // This improves performance by avoiding repeated building-wide filtering inside the monthly loop.
  // A tenant without an apartment (no wohnung_id) gets an empty list, never the unfiltered
  // building-wide payments — apartment payments must never be assigned to a tenant with no
  // apartment to tie them to.
  const tenantActualPayments = (prepaymentMode === 'actual' && actualPayments)
    ? (tenant.wohnung_id ? actualPayments.filter(p => p.wohnung_id === tenant.wohnung_id) : [])
    : actualPayments;

  // Calculate prepayments
  const prepayments = calculatePrepayments(
    tenant,
    nebenkosten.startdatum,
    nebenkosten.enddatum,
    tenantActualPayments,
    prepaymentMode,
    allTenants
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