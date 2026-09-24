
import {
  calculateOccupancyPercentage,
  calculateTenantCosts,
  calculatePrepayments,
  validateCalculationData,
  calculateMeterCostDistribution,
  calculateRecommendedPrepayment,
  formatCurrency,
  calculateCompleteTenantResult,
  isAreaBasedBerechnungsart
} from './abrechnung-calculations';
import type { Finanzen } from '@/lib/types';
import { calculateTenantOccupancy, calculateTotalDays } from './date-calculations';
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution
} from './cost-calculations';
import { getTenantMeterCost } from './water-cost-calculations';

// Mock dependencies
jest.mock('./date-calculations', () => {
  const actual = jest.requireActual('./date-calculations');
  return {
    ...actual,
    calculateTenantOccupancy: jest.fn()
  };
});

jest.mock('./cost-calculations', () => ({
  calculateProFlächeDistribution: jest.fn(),
  calculateProMieterDistribution: jest.fn(),
  calculateProWohnungDistribution: jest.fn(),
  calculateMeterCostDistribution: jest.fn(),
  sumUniqueApartmentAreas: jest.requireActual('./cost-calculations').sumUniqueApartmentAreas
}));

jest.mock('./water-cost-calculations', () => ({
  getTenantMeterCost: jest.fn()
}));

describe('abrechnung-calculations', () => {
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';
  const mockTenant = {
    id: 't1',
    name: 'Max',
    Wohnungen: { groesse: 50, name: 'Apt 1' },
    einzug: '2023-01-01',
    auszug: null,
    wohnung_id: 'w1'
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Full occupancy of whatever range is requested (days consistent with the range)
    (calculateTenantOccupancy as jest.Mock).mockImplementation((_tenant, start: string, end: string) => ({
      occupancyRatio: 1,
      occupancyDays: calculateTotalDays(start, end),
      tenantId: 't1'
    }));
  });

  describe('calculateOccupancyPercentage', () => {
    it('returns correct occupancy calculation', () => {
      const result = calculateOccupancyPercentage(mockTenant, startdatum, enddatum);

      expect(result.percentage).toBe(100);
      expect(result.daysOccupied).toBe(365);
      expect(result.daysInPeriod).toBe(365);
    });
  });

  describe('calculateTenantCosts', () => {
    it('calculates costs for different calculation types', () => {
      const nebenkosten = {
        nebenkostenart: ['Hausmeister', 'Müll', 'Lift'],
        betrag: [1000, 2000, 3000],
        berechnungsart: ['pro Fläche', 'pro Mieter', 'pro Wohnung'],
        startdatum,
        enddatum
      } as any;

      // Mock the distributions
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 500 } });
      (calculateProMieterDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 1000 } });
      (calculateProWohnungDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 1500 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(result.totalCost).toBe(500 + 1000 + 1500);
      expect(result.costItems).toHaveLength(3);
      expect(result.costItems[0].tenantShare).toBe(500);
      expect(result.costItems[1].tenantShare).toBe(1000);
      expect(result.costItems[2].tenantShare).toBe(1500);
    });

    it('passes the house apartment count to the pro Wohnung distribution', () => {
      const nebenkosten = {
        nebenkostenart: ['Lift'],
        betrag: [3000],
        berechnungsart: ['pro Wohnung'],
        startdatum,
        enddatum,
        anzahlWohnungen: 4
      } as any;

      (calculateProWohnungDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 750 } });

      calculateTenantCosts(mockTenant, nebenkosten);

      expect(calculateProWohnungDistribution).toHaveBeenCalledWith(
        [mockTenant], 3000, startdatum, enddatum, 4, expect.any(Object)
      );
    });

    it.each([
      // Stale house area (40 m²) below the tenant's apartment (50 m²): still used (the modal warns)
      ['keeps a stored house area below the occupied apartments area', 40, 40],
      ['keeps a house area above the occupied apartments area', 200, 200]
    ])('%s for pro Fläche', (_name, gesamtFlaeche, expectedArea) => {
      const nebenkosten = {
        nebenkostenart: ['Hausmeister'],
        betrag: [1000],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum,
        gesamtFlaeche
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 250 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(calculateProFlächeDistribution).toHaveBeenCalledWith(
        [mockTenant], 1000, startdatum, enddatum, expectedArea, expect.any(Object)
      );
      expect(result.costItems[0].distributionBasis).toBe(`${expectedArea} m²`);
    });

    it('defaults to pro Fläche for unknown type', () => {
      const nebenkosten = {
        nebenkostenart: ['Unknown'],
        betrag: [100],
        berechnungsart: ['unknown'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 50 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);
      expect(result.costItems[0].calculationType).toBe('unknown');
      expect(calculateProFlächeDistribution).toHaveBeenCalled();
    });

    it.each([
      ['pro person'],
      ['pro mieter'],
      ['Pro Mieter '],
    ])('bills legacy value "%s" per tenant, not by area', (berechnungsart) => {
      const nebenkosten = {
        nebenkostenart: ['Müll'],
        betrag: [2000],
        berechnungsart: [berechnungsart],
        startdatum,
        enddatum
      } as any;

      (calculateProMieterDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 1000 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(calculateProMieterDistribution).toHaveBeenCalledWith([mockTenant], 2000, startdatum, enddatum);
      expect(calculateProFlächeDistribution).not.toHaveBeenCalled();
      expect(result.costItems[0].calculationType).toBe('pro Mieter');
      expect(result.costItems[0].tenantShare).toBe(1000);
    });

    it('bills items by area when the Berechnungsart array is missing', () => {
      const nebenkosten = {
        nebenkostenart: ['Grundsteuer'],
        betrag: [1000],
        berechnungsart: null,
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 250 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(result.costItems).toHaveLength(1);
      expect(result.costItems[0].tenantShare).toBe(250);
      expect(result.costItems[0].calculationType).toBe('pro Fläche');
    });

    it('shows the option label for the stored value pro Flaeche', () => {
      const nebenkosten = {
        nebenkostenart: ['Grundsteuer'],
        betrag: [1000],
        berechnungsart: ['pro Flaeche'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 250 } });

      expect(calculateTenantCosts(mockTenant, nebenkosten).costItems[0].calculationType).toBe('pro Fläche');
    });

    it('bills legacy lowercase "pro wohnung" per apartment', () => {
      const nebenkosten = {
        nebenkostenart: ['Lift'],
        betrag: [3000],
        berechnungsart: ['pro wohnung'],
        startdatum,
        enddatum
      } as any;

      (calculateProWohnungDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 750 } });

      const result = calculateTenantCosts(mockTenant, nebenkosten);

      expect(calculateProFlächeDistribution).not.toHaveBeenCalled();
      expect(result.costItems[0].tenantShare).toBe(750);
    });

    it('handles nach Rechnung type from rechnungen array', () => {
      const nebenkosten = {
        nebenkostenart: ['Special', 'Not Invoiced'],
        betrag: [450, 0], // sum of all tenants' Einzelbeträge
        berechnungsart: ['nach Rechnung', 'nach Rechnung'],
        startdatum,
        enddatum
      } as any;

      const rechnungen = [
        { name: 'Special', mieter_id: 't1', betrag: 150 },
        { name: 'Special', mieter_id: 'other', betrag: 300 }
      ] as any[];

      const result = calculateTenantCosts(mockTenant, nebenkosten, undefined, undefined, rechnungen);

      expect(result.costItems[0].calculationType).toBe('nach Rechnung');
      expect(result.costItems[0].costName).toBe('Special');
      expect(result.costItems[0].tenantShare).toBe(150); // Exact invoice amount
      // totalCostForItem stays the building total (sum of all tenants' Einzelbeträge)
      expect(result.costItems[0].totalCostForItem).toBe(450);
      expect(result.costItems[0].distributionBasis).toBe('-');

      // For 'Not Invoiced' there is no row for this tenant, so the share is 0
      expect(result.costItems[1].calculationType).toBe('nach Rechnung');
      expect(result.costItems[1].costName).toBe('Not Invoiced');
      expect(result.costItems[1].tenantShare).toBe(0);
      expect(result.costItems[1].totalCostForItem).toBe(0);
      expect(result.costItems[1].distributionBasis).toBe('-');
    });

    const nachRechnungItem = (betrag: number) => ({
      nebenkostenart: ['Special Invoice'],
      betrag: [betrag], // sum of all tenants' Einzelbeträge
      berechnungsart: ['nach Rechnung'],
      startdatum,
      enddatum
    } as any);

    // The 364-day case guards against a days-based ratio: calculateOccupancyPercentage
    // derives daysInPeriod (365) separately, which can differ by a day across DST.
    it.each([
      ['partial occupancy (50%)', { occupancyRatio: 0.5, occupancyDays: 182 }, mockTenant, 50, 25],
      ['full period with mismatched day counts (DST)', { occupancyRatio: 1, occupancyDays: 364 }, mockTenant, 100, 100],
      ['tenant without Einzugsdatum', { occupancyRatio: 0, occupancyDays: 0 }, { ...mockTenant, einzug: null }, 80, 80]
    ])('prorates the nach Rechnung amount by occupancy: %s', (_label, occupancy, tenant, amount, expected) => {
      (calculateTenantOccupancy as jest.Mock).mockReturnValue({ ...occupancy, tenantId: 't1' });
      const rechnungen = [{ name: 'Special Invoice', mieter_id: 't1', betrag: amount }] as any[];

      const result = calculateTenantCosts(tenant, nachRechnungItem(amount), undefined, undefined, rechnungen);

      expect(result.costItems[0].calculationType).toBe('nach Rechnung');
      expect(result.costItems[0].tenantShare).toBe(expected);
      expect(result.costItems[0].totalCostForItem).toBe(amount);
      expect(result.totalCost).toBe(expected);
    });

    it('matches Rechnungen rows saved with surrounding whitespace in the name', () => {
      const rechnungen = [{ name: 'Special Invoice ', mieter_id: 't1', betrag: 70 }] as any[];

      const result = calculateTenantCosts(mockTenant, nachRechnungItem(70), undefined, undefined, rechnungen);

      expect(result.costItems[0].tenantShare).toBe(70);
    });

    it('does not fall back to the betrag[] sum when the tenant has no rechnungen row', () => {
      const rechnungen = [{ name: 'Special Invoice', mieter_id: 'other', betrag: 150 }] as any[];

      const result = calculateTenantCosts(mockTenant, nachRechnungItem(150), undefined, undefined, rechnungen);

      expect(result.costItems[0].tenantShare).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('uses nebenkosten.gesamtFlaeche as canonical house area for verteiler', () => {
      const nebenkosten = {
        nebenkostenart: ['General'],
        betrag: [1000],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum,
        gesamtFlaeche: 2313 // canonical house size from server action
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      const occupancy = {
        percentage: 100,
        occupancyDays: 365,
        tenantId: 't1',
        occupancyRatio: 1,
        daysOccupied: 365,
        daysInPeriod: 365,
        effectivePeriodStart: startdatum,
        effectivePeriodEnd: enddatum
      };

      const result = calculateTenantCosts(mockTenant, nebenkosten, [mockTenant], occupancy as any);

      // totalHouseArea used for verteiler should be 2313 m²
      expect(result.costItems[0].distributionBasis).toBe('2313 m²');

      // pricePerSqm is the house-wide rate for this cost item: totalCostForItem / totalHouseArea
      // = 1000 / 2313 = 0.4323 (rounded to 4 decimals)
      expect(result.costItems[0].pricePerSqm).toBeCloseTo(1000 / 2313, 4);
    });

    it('shows the same pricePerSqm for a WG tenant as for a solo tenant in an identical apartment', () => {
      // A WG tenant's tenantShare is already divided among co-tenants by calculateProFlächeDistribution.
      // pricePerSqm must NOT be re-derived from that reduced share — it should reflect the
      // undivided, house-wide rate for this cost item, so every tenant in the house sees the
      // same €/m² for the same cost item regardless of how many people share their apartment.
      const nebenkosten = {
        nebenkostenart: ['Heizung'],
        betrag: [1000],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum,
        gesamtFlaeche: 2313
      } as any;

      const wgTenant = { ...mockTenant, id: 'wg1', Wohnungen: { groesse: 125, name: 'WG Apt' } };
      // Simulate a WG co-tenant's share: only 1/3 of the apartment's cost share, due to 2 co-tenants.
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ wg1: { amount: 369.42 } });

      const result = calculateTenantCosts(wgTenant, nebenkosten, [wgTenant]);

      // Same rate as the solo-tenant test above: totalCostForItem / totalHouseArea = 1000 / 2313,
      // independent of the tenant's own area, occupancy, or co-tenant count.
      expect(result.costItems[0].pricePerSqm).toBeCloseTo(1000 / 2313, 4);
    });
  });

  describe('calculatePrepayments — scheduled mode', () => {
    it('returns 0 and reports missingScheduleMonths when no nebenkosten schedule exists', () => {
      // mockTenant has no nebenkosten array — all occupied months should be flagged
      const result = calculatePrepayments(mockTenant, startdatum, enddatum);

      expect(result.monthlyPayments).toHaveLength(12);
      expect(result.totalPrepayments).toBe(0);
      expect(result.averageMonthlyPayment).toBe(0);
      expect(result.missingScheduleMonths).toBe(12);
    });

    it('does NOT set missingScheduleMonths when schedule data is present for all months', () => {
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '150' }]
      } as any;

      const result = calculatePrepayments(tenantWithSchedule, startdatum, enddatum);

      expect(result.totalPrepayments).toBe(12 * 150); // 150/month * 12 months * ratio 1
      expect(result.missingScheduleMonths).toBeUndefined();
    });

    it('prorates prepayment by occupancy ratio', () => {
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '200' }]
      } as any;

      // Mock half-month occupancy
      (calculateTenantOccupancy as jest.Mock).mockImplementation((_tenant, start: string, end: string) => ({
        occupancyRatio: 0.5,
        occupancyDays: calculateTotalDays(start, end) / 2,
        tenantId: 't1'
      }));

      const result = calculatePrepayments(tenantWithSchedule, startdatum, enddatum);

      // Each month should be 200 * 0.5 = 100
      expect(result.monthlyPayments[0].amount).toBe(100);
    });

    it('does not set missingScheduleMonths when tenant is not occupying in a month', () => {
      // Zero occupancy days — not occupied, so no missing data expected
      (calculateTenantOccupancy as jest.Mock).mockReturnValue({
        occupancyRatio: 0,
        occupancyDays: 0,
        tenantId: 't1'
      });

      const result = calculatePrepayments(mockTenant, startdatum, enddatum);

      expect(result.totalPrepayments).toBe(0);
      // Not occupied, so no "missing" data — missingScheduleMonths should be 0 or undefined
      expect(result.missingScheduleMonths ?? 0).toBe(0);
    });

    // Relies on jest.config.mjs pinning TZ=Europe/Berlin: the UTC-shift bug only shows up east of UTC
    describe('with real occupancy', () => {
      beforeEach(() => {
        const { calculateTenantOccupancy: actualCalculateTenantOccupancy } = jest.requireActual('./date-calculations');
        (calculateTenantOccupancy as jest.Mock).mockImplementation(actualCalculateTenantOccupancy);
      });

      it('does not charge prepayment for month after move-out date (e.g. moved out 2025-07-31, august prepayment is 0)', () => {
        const tenantIbald = {
          id: 'ibald-1',
          name: 'Ibald',
          einzug: '2024-01-01',
          auszug: '2025-07-31',
          nebenkosten: [
            { date: '2024-01-01', amount: '40' },
            { date: '2024-08-01', amount: '65' }
          ]
        } as any;

        const result = calculatePrepayments(tenantIbald, '2025-01-01', '2025-12-31');

        // July 2025 (month 7) should be fully active with 65 EUR
        const july = result.monthlyPayments.find(m => m.month === '2025-07');
        expect(july).toBeDefined();
        expect(july?.isActiveMonth).toBe(true);
        expect(july?.amount).toBe(65);

        // August 2025 (month 8) should have 0 amount and NOT be active
        const august = result.monthlyPayments.find(m => m.month === '2025-08');
        expect(august).toBeDefined();
        expect(august?.isActiveMonth).toBe(false);
        expect(august?.amount).toBe(0);

        // Subsequent months (September - December) should also be inactive with 0
        const sept = result.monthlyPayments.find(m => m.month === '2025-09');
        expect(sept?.isActiveMonth).toBe(false);
        expect(sept?.amount).toBe(0);

        // Total prepayments should be 7 months (Jan - Jul) * 65 = 455
        expect(result.totalPrepayments).toBe(7 * 65);
      });

      it('prorates partial first/last months of a billing period that does not start on the 1st', () => {
        const tenant = {
          id: 't-mid',
          einzug: '2024-01-01',
          auszug: null,
          nebenkosten: [{ date: '2024-01-01', amount: '62' }]
        } as any;

        const result = calculatePrepayments(tenant, '2025-01-15', '2026-01-14');

        expect(result.monthlyPayments).toHaveLength(13);
        // 2025-01-15..31 = 17/31 of January, 2026-01-01..14 = 14/31 of January
        expect(result.monthlyPayments[0].amount).toBeCloseTo(62 * 17 / 31);
        expect(result.monthlyPayments[12].amount).toBeCloseTo(62 * 14 / 31);
        // Together exactly 12 months of prepayment, not 13
        expect(result.totalPrepayments).toBeCloseTo(12 * 62);
        // Average counts the partial months by their share, not as whole months
        expect(result.averageMonthlyPayment).toBeCloseTo(62);
      });

      it('ignores schedule entries dated after the billing period end in a partial last month', () => {
        const tenant = {
          id: 't-late',
          einzug: '2024-01-01',
          auszug: null,
          nebenkosten: [
            { date: '2024-01-01', amount: '100' },
            { date: '2024-12-20', amount: '200' } // starts after the period ends on 2024-12-15
          ]
        } as any;

        const result = calculatePrepayments(tenant, '2024-01-01', '2024-12-15');

        const december = result.monthlyPayments.find(m => m.month === '2024-12');
        expect(december?.amount).toBeCloseTo(100 * 15 / 31);
      });

      it('returns no months for a reversed period within one month', () => {
        const tenant = { id: 't-rev', einzug: '2024-01-01', auszug: null, nebenkosten: [{ date: '2024-01-01', amount: '62' }] } as any;

        const result = calculatePrepayments(tenant, '2025-01-20', '2025-01-10');

        expect(result.monthlyPayments).toHaveLength(0);
        expect(result.totalPrepayments).toBe(0);
      });

      it('returns empty prepayments instead of throwing for a missing period date', () => {
        const tenant = { id: 't-null', einzug: '2024-01-01', auszug: null } as any;

        expect(calculatePrepayments(tenant, null as any, '2025-12-31').totalPrepayments).toBe(0);
      });

      it('only counts actual payments made inside the billing period', () => {
        const tenant = { id: 't-mid', einzug: '2024-01-01', auszug: null } as any;
        const payments = [
          { datum: '2025-01-03', betrag: 62 }, // before period start
          { datum: '2025-02-03', betrag: 62 },
          { datum: '2026-01-03', betrag: 62 },
          { datum: '2026-01-20', betrag: 62 } // after period end
        ] as any[];

        const result = calculatePrepayments(tenant, '2025-01-15', '2026-01-14', payments, 'actual');

        expect(result.totalPrepayments).toBe(2 * 62);
      });
    });
  });

  describe('calculatePrepayments — actual mode', () => {
    const makePayment = (datum: string, betrag: number, wohnungId = 'w1'): Finanzen =>
    ({
      id: `pay-${datum}`,
      wohnung_id: wohnungId,
      datum,
      betrag,
      ist_einnahmen: true,
      name: 'Nebenkosten',
      notiz: null,
      erstellt_von: 'u1',
      dokument_id: null,
      tags: ['Nebenkosten']
    } as Finanzen);

    it('sums actual payments within each month', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-10', 150),
        makePayment('2023-02-10', 150),
        makePayment('2023-03-10', 150),
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-03-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(450);
      expect(result.monthlyPayments[0].amount).toBe(150);
      expect(result.monthlyPayments[1].amount).toBe(150);
      expect(result.monthlyPayments[2].amount).toBe(150);
    });

    it('returns 0 for months with no actual payment entries — does NOT set missingScheduleMonths', () => {
      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-03-31', [], 'actual');

      expect(result.totalPrepayments).toBe(0);
      // missingScheduleMonths only applies to 'scheduled' mode
      expect(result.missingScheduleMonths).toBeUndefined();
    });

    it('sums multiple payments in the same month', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-05', 100),
        makePayment('2023-01-20', 75),
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(175);
      expect(result.monthlyPayments[0].amount).toBe(175);
    });

    it('ignores payments outside the billing period', () => {
      const actualPayments: Finanzen[] = [
        makePayment('2022-12-31', 200), // Before billing period
        makePayment('2023-01-15', 150), // Inside
        makePayment('2024-01-01', 200), // After billing period
      ];

      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', actualPayments, 'actual');

      expect(result.totalPrepayments).toBe(150); // Only the in-period payment
    });

    it('handles actualPayments being undefined gracefully', () => {
      const result = calculatePrepayments(mockTenant, '2023-01-01', '2023-01-31', undefined, 'actual');

      expect(result.totalPrepayments).toBe(0);
    });

    // Uses real occupancy instead of the full-occupancy mock above, since these tests depend on
    // a tenant's occupancy actually varying (a move-out, or two tenants overlapping unequally).
    describe('with real occupancy', () => {
      beforeEach(() => {
        const { calculateTenantOccupancy: actualCalculateTenantOccupancy } = jest.requireActual('./date-calculations');
        (calculateTenantOccupancy as jest.Mock).mockImplementation(actualCalculateTenantOccupancy);
      });

      it('credits nothing for a month the tenant no longer occupied, even though the apartment has a payment that month', () => {
        // Moved out at the end of January; the payment below is dated in February.
        const tenant = { id: 't-out', wohnung_id: 'w1', einzug: '2023-01-01', auszug: '2023-01-31' } as any;
        const payments = [makePayment('2023-02-10', 100)];

        const result = calculatePrepayments(tenant, '2023-01-01', '2023-02-28', payments, 'actual');

        expect(result.totalPrepayments).toBe(0);
      });

      it('splits a shared month\'s apartment payment by each tenant\'s Soll when allTenants is given', () => {
        // January 2023 has 31 days. X: 100 €/month, whole month → Soll 100 €. Y: 62 €/month,
        // moves in on the 21st (11 days) → Soll 62 × 11/31 = 22 €. Together 122 €.
        const tenantX = { id: 'x', wohnung_id: 'w1', einzug: '2023-01-01', auszug: null, nebenkosten: [{ date: '2023-01-01', amount: '100' }] } as any;
        const tenantY = { id: 'y', wohnung_id: 'w1', einzug: '2023-01-21', auszug: null, nebenkosten: [{ date: '2023-01-21', amount: '62' }] } as any;
        const payments = [makePayment('2023-01-15', 244)];
        const allTenants = [tenantX, tenantY];

        const resultX = calculatePrepayments(tenantX, '2023-01-01', '2023-01-31', payments, 'actual', allTenants);
        const resultY = calculatePrepayments(tenantY, '2023-01-01', '2023-01-31', payments, 'actual', allTenants);

        // X: 244 € × 100/122 = 200 €, Y: 244 € × 22/122 = 44 €
        expect(resultX.totalPrepayments).toBeCloseTo(200, 5);
        expect(resultY.totalPrepayments).toBeCloseTo(44, 5);
      });

      it('splits by occupied days when none of the tenants has a Soll that month', () => {
        // January 2023 has 31 days. X occupies the whole month (31 days); Y moves in on the
        // 21st and occupies the last 11 days (21..31 inclusive) — 42 occupied days combined.
        const tenantX = { id: 'x', wohnung_id: 'w1', einzug: '2023-01-01', auszug: null } as any;
        const tenantY = { id: 'y', wohnung_id: 'w1', einzug: '2023-01-21', auszug: null } as any;
        const payments = [makePayment('2023-01-15', 420)];
        const allTenants = [tenantX, tenantY];

        const resultX = calculatePrepayments(tenantX, '2023-01-01', '2023-01-31', payments, 'actual', allTenants);
        const resultY = calculatePrepayments(tenantY, '2023-01-01', '2023-01-31', payments, 'actual', allTenants);

        // X: 420 € × 31/42 = 310 €, Y: 420 € × 11/42 = 110 € — together the full 420 €
        expect(resultX.totalPrepayments).toBeCloseTo(310, 5);
        expect(resultY.totalPrepayments).toBeCloseTo(110, 5);
        expect(resultX.totalPrepayments + resultY.totalPrepayments).toBeCloseTo(420, 5);
      });

      it('without allTenants, treats the tenant as the sole occupant (back-compat: full payment credited)', () => {
        const tenant = { id: 'solo', wohnung_id: 'w1', einzug: '2023-01-01', auszug: null } as any;
        const payments = [makePayment('2023-01-15', 200)];

        const result = calculatePrepayments(tenant, '2023-01-01', '2023-01-31', payments, 'actual');

        expect(result.totalPrepayments).toBe(200);
      });
    });
  });

  describe('calculateCompleteTenantResult — prepaymentMode', () => {
    const makePayment = (datum: string, betrag: number, wohnungId = 'w1'): Finanzen =>
    ({
      id: `pay-${datum}`,
      wohnung_id: wohnungId,
      datum,
      betrag,
      ist_einnahmen: true,
      name: 'Nebenkosten',
      notiz: null,
      erstellt_von: 'u1',
      dokument_id: null,
      tags: ['Nebenkosten']
    } as Finanzen);

    beforeEach(() => {
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);
    });

    it('uses actual payments when prepaymentMode is actual', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;

      const actualPayments: Finanzen[] = [makePayment('2023-01-10', 80)];

      const result = calculateCompleteTenantResult(
        mockTenant,
        nebenkosten,
        [mockTenant],
        [],
        [],
        actualPayments,
        'actual'
      );

      expect(result.prepayments.totalPrepayments).toBe(80);
      // finalSettlement = totalCosts - prepayments = 100 - 80 = 20
      expect(result.finalSettlement).toBe(20);
    });

    it('defaults to scheduled mode when no prepaymentMode passed', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;

      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '120' }]
      } as any;

      const result = calculateCompleteTenantResult(tenantWithSchedule, nebenkosten, [tenantWithSchedule], [], []);

      expect(result.prepayments.totalPrepayments).toBe(120);
    });

    it('pre-filters actualPayments by wohnung_id before passing to calculatePrepayments', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [0],
        berechnungsart: ['pro Fläche'],
        startdatum: '2023-01-01',
        enddatum: '2023-01-31'
      } as any;
      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 0 } });

      // Mix of payments for different apartments
      const actualPayments: Finanzen[] = [
        makePayment('2023-01-10', 100, 'w1'), // belongs to mockTenant
        makePayment('2023-01-10', 200, 'w2'), // different apartment
        makePayment('2023-01-15', 50, 'w1'),  // belongs to mockTenant
      ];

      const result = calculateCompleteTenantResult(
        mockTenant,
        nebenkosten,
        [mockTenant],
        [],
        [],
        actualPayments,
        'actual'
      );

      // Only payments for w1 should be counted: 100 + 50 = 150
      expect(result.prepayments.totalPrepayments).toBe(150);
    });
  });

  describe('calculateCompleteTenantResult — nach Rechnung', () => {
    it('uses the tenant\'s rechnungen row instead of the betrag[] sum', () => {
      const nebenkosten = {
        nebenkostenart: ['Special'],
        betrag: [450], // sum of all tenants' Einzelbeträge
        berechnungsart: ['nach Rechnung'],
        startdatum,
        enddatum
      } as any;

      const rechnungen = [
        { name: 'Special', mieter_id: 't1', betrag: 150 },
        { name: 'Special', mieter_id: 'other', betrag: 300 }
      ] as any[];

      const result = calculateCompleteTenantResult(
        mockTenant,
        nebenkosten,
        [mockTenant],
        [],
        [],
        undefined,
        'scheduled',
        rechnungen
      );

      expect(result.operatingCosts.costItems[0].tenantShare).toBe(150);
    });
  });

  describe('isAreaBasedBerechnungsart', () => {
    it.each([
      ['pro Fläche', true],
      ['pro Flaeche', true],
      ['pro qm', true],
      ['fix', true], // unknown: billed by area
      ['', true],
      ['pro Mieter', false],
      ['pro person', false],
      ['pro mieter', false],
      ['pro wohnung', false],
      ['nach rechnung', false],
    ])('"%s" → %s', (art, expected) => {
      expect(isAreaBasedBerechnungsart(art)).toBe(expected);
    });
  });

  describe('validateCalculationData', () => {
    it('warns about unknown or missing Berechnungsart, which is billed by area', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Grundsteuer', 'Müll', 'Wartung', 'Strom'],
        betrag: [100, 200, 300, 400],
        berechnungsart: ['pro Flaeche', 'pro person', 'fix', '']
      } as any;

      const result = validateCalculationData(nebenkosten, [mockTenant]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([
        'Kostenart "Wartung": Unbekannte Berechnungsart "fix", wird pro Fläche verteilt',
        'Kostenart "Strom": Keine Berechnungsart angegeben, wird pro Fläche verteilt'
      ]));
      expect(result.warnings.some(w => w.includes('Grundsteuer') || w.includes('Müll'))).toBe(false);
    });

    it('returns valid for correct data', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100]
      } as any;

      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(true);
    });

    it('detects missing dates', () => {
      const nebenkosten = { nebenkostenart: ['Test'], betrag: [100] } as any;
      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start- und Enddatum sind erforderlich');
    });

    it('detects mismatched arrays', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [] // Empty
      } as any;

      const result = validateCalculationData(nebenkosten, [mockTenant]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Anzahl der Nebenkostenarten muss mit Anzahl der Beträge übereinstimmen');
    });

    it('warns about missing tenant data', () => {
      const badTenant = { ...mockTenant, einzug: null, Wohnungen: { groesse: 0 } };
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100]
      } as any;

      const result = validateCalculationData(nebenkosten, [badTenant]);
      expect(result.warnings.some(w => w.includes('Einzugsdatum'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Wohnungsgröße'))).toBe(true);
    });

    it('validates water meter data when water costs present', () => {
      const nebenkosten = {
        startdatum,
        enddatum,
        nebenkostenart: ['Test'],
        betrag: [100],
        zaehlerkosten: { kaltwasser: 100 }
      } as any;

      // Case 1: No meters
      let result = validateCalculationData(nebenkosten, [mockTenant], [], []);
      expect(result.warnings).toContain('Wasserkosten sind angegeben, aber keine Wasserzähler vorhanden');

      // Case 2: Meters but no readings
      const mockMeter = { id: 'm1', wohnung_id: 'w1' } as any;
      result = validateCalculationData(nebenkosten, [mockTenant], [mockMeter], []);
      expect(result.warnings).toContain('Wasserzähler vorhanden, aber keine Ablesungen für den Abrechnungszeitraum');

      // Case 3: Missing meter for apartment
      const tenantWithoutMeter = { ...mockTenant, wohnung_id: 'w2' };
      result = validateCalculationData(nebenkosten, [tenantWithoutMeter], [mockMeter], [{ zaehler_id: 'm1', ablese_datum: '2023-06-01' }] as any);
      expect(result.warnings.some(w => w.includes('Wohnung w2: Keine Wasserzähler'))).toBe(true);
    });
  });

  describe('calculateMeterCostDistribution', () => {
    it('returns zero cost if no tenant meter cost calculated', () => {
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);
      const result = calculateMeterCostDistribution(mockTenant, {} as any, [], [], []);
      expect(result.totalCost).toBe(0);
    });

    it('returns calculated cost with meter reading', () => {
      (getTenantMeterCost as jest.Mock).mockReturnValue({
        consumption: 10,
        costShare: 50,
        pricePerUnit: 5
      });

      const waterMeters = [{ id: 'm1', wohnung_id: 'w1' }] as any;
      const waterReadings = [{ zaehler_id: 'm1', zaehlerstand: 100, ablese_datum: '2023-06-01' }] as any;
      const nebenkosten = { startdatum, enddatum, zaehlerkosten: { kaltwasser: 100 }, zaehlerverbrauch: { kaltwasser: 20 } } as any;

      const result = calculateMeterCostDistribution(mockTenant, nebenkosten, [], waterMeters, waterReadings);

      expect(result.totalCost).toBe(50);
      expect(result.meterReading?.currentReading).toBe(100);
    });
  });

  describe('calculateRecommendedPrepayment', () => {
    it('calculates with buffer and rounding', () => {
      const tenantCalc = { totalCosts: 1200 } as any;
      const result = calculateRecommendedPrepayment(tenantCalc);
      // 1200 * 1.1 = 1320
      // 1320 / 12 = 110
      // Round to nearest 5 -> 110
      // 110 * 12 = 1320
      expect(result).toBe(1320);
    });

    it('returns 0 for zero costs', () => {
      expect(calculateRecommendedPrepayment({ totalCosts: 0 } as any)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('formats correctly', () => {
      const formatted = formatCurrency(123.45);
      expect(formatted).toMatch(/123(,|.)45/);
      expect(formatted).toContain('€');
    });
  });

  describe('calculateCompleteTenantResult', () => {
    it('aggregates all calculations', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);

      // Provide a prepayment schedule so the result is deterministic
      const tenantWithSchedule = {
        ...mockTenant,
        nebenkosten: [{ date: '2023-01-01', amount: '50' }]
      } as any;

      const result = calculateCompleteTenantResult(tenantWithSchedule, nebenkosten, [], [], []);

      expect(result.operatingCosts.totalCost).toBe(100);
      expect(result.meterCosts.totalCost).toBe(0);
      // 12 months * 50€ schedule
      expect(result.prepayments.totalPrepayments).toBe(600);
      expect(result.finalSettlement).toBe(100 - 600); // costs − prepayments
      expect(result.prepayments.missingScheduleMonths).toBeUndefined();
    });

    it('surfaces missingScheduleMonths when tenant has no prepayment schedule', () => {
      const nebenkosten = {
        nebenkostenart: ['Test'],
        betrag: [100],
        berechnungsart: ['pro Fläche'],
        startdatum,
        enddatum
      } as any;

      (calculateProFlächeDistribution as jest.Mock).mockReturnValue({ 't1': { amount: 100 } });
      (getTenantMeterCost as jest.Mock).mockReturnValue(null);

      const result = calculateCompleteTenantResult(mockTenant, nebenkosten, [], [], []);

      expect(result.operatingCosts.totalCost).toBe(100);
      expect(result.prepayments.totalPrepayments).toBe(0);
      expect(result.prepayments.missingScheduleMonths).toBe(12);
    });
  });
});
