
import {
  calculateProFlächeDistribution,
  calculateProMieterDistribution,
  calculateProWohnungDistribution,
  sumUniqueApartmentAreas
} from './cost-calculations';
import { calculateTenantOccupancy } from './date-calculations';

// Mock the date calculation to control the output
jest.mock('./date-calculations', () => {
  const actual = jest.requireActual('./date-calculations');
  return {
    ...actual,
    calculateTenantOccupancy: jest.fn()
  };
});

describe('cost-calculations', () => {
  const mockTenant1 = { id: 't1', wohnung_id: 'w1', einzug: '2020-01-01', Wohnungen: { groesse: 50 } } as any;
  const mockTenant2 = { id: 't2', wohnung_id: 'w2', einzug: '2020-01-01', Wohnungen: { groesse: 50 } } as any;
  const mockTenants = [mockTenant1, mockTenant2];
  const startdatum = '2023-01-01';
  const enddatum = '2023-12-31';

  beforeEach(() => {
    jest.clearAllMocks();
    (calculateTenantOccupancy as jest.Mock).mockReturnValue({
      occupancyRatio: 1,
      occupancyDays: 365,
      effectivePeriodStart: startdatum,
      effectivePeriodEnd: enddatum
    });
  });

  describe('sumUniqueApartmentAreas', () => {
    it('counts each apartment once for WG and sequential tenants', () => {
      const tenants = [
        { id: 'a', wohnung_id: 'wg', Wohnungen: { groesse: 125 } },
        { id: 'b', wohnung_id: 'wg', Wohnungen: { groesse: 125 } },
        { id: 'c', wohnung_id: 'flat', Wohnungen: { groesse: 34.5 } },
        { id: 'd', wohnung_id: 'flat', Wohnungen: { groesse: 34.5 } }
      ] as any;
      expect(sumUniqueApartmentAreas(tenants)).toBe(159.5);
    });
  });

  describe('calculateProFlächeDistribution', () => {
    it('distributes costs equally for equal size and full occupancy', () => {
      const result = calculateProFlächeDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(500);
      expect(result['t2'].amount).toBe(500);
    });

    it('distributes based on size', () => {
      const smallTenant = { ...mockTenant1, id: 't3', Wohnungen: { groesse: 30 } };
      const largeTenant = { ...mockTenant2, id: 't4', Wohnungen: { groesse: 70 } };

      const result = calculateProFlächeDistribution([smallTenant, largeTenant], 1000, startdatum, enddatum);
      expect(result['t3'].amount).toBeCloseTo(300);
      expect(result['t4'].amount).toBeCloseTo(700);
    });

    it('handles zero total area', () => {
      const zeroTenant = { ...mockTenant1, Wohnungen: { groesse: 0 } };
      const result = calculateProFlächeDistribution([zeroTenant], 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(0);
    });

    it('distributes based on totalHouseArea when provided (vacancies case)', () => {
      const smallTenant = { ...mockTenant1, id: 't3', Wohnungen: { groesse: 30 } };
      const largeTenant = { ...mockTenant2, id: 't4', Wohnungen: { groesse: 70 } };

      // Total house area is 150 (there is a 50 sqm vacant apartment)
      // Use a short period in January to avoid DST timezone issues
      const result = calculateProFlächeDistribution([smallTenant, largeTenant], 1500, '2023-01-01', '2023-01-10', 150);
      // smallTenant gets 30/150 * 1500 = 300
      expect(result['t3'].amount).toBeCloseTo(300);
      // largeTenant gets 70/150 * 1500 = 700
      expect(result['t4'].amount).toBeCloseTo(700);
    });

    it('correctly handles shared apartments (WGs) by using union of occupancy', () => {
      // 2 tenants in same apartment, same dates. Total house area = 50. Total cost = 1000.
      // Apartment weight should be 50 * 1 = 50. Both tenants share 50. Cost is 1000. Each pays 500.
      // With the old bug, weight was 100, cost 1000, each pays 500 but calculation was wrong mechanically in house context.

      const wgTenant1 = { id: 'wg1', wohnung_id: 'w_shared', einzug: '2020-01-01', Wohnungen: { groesse: 80 } } as any;
      const wgTenant2 = { id: 'wg2', wohnung_id: 'w_shared', einzug: '2020-01-01', Wohnungen: { groesse: 80 } } as any;
      const singleTenant = { id: 's1', wohnung_id: 'w_single', einzug: '2020-01-01', Wohnungen: { groesse: 20 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          return {
            occupancyRatio: 1,
            occupancyDays: 365,
            effectivePeriodStart: startdatum,
            effectivePeriodEnd: enddatum
          };
        });

      // Total house area = 80 (w_shared) + 20 (w_single) = 100. Total cost = 1000.
      // w_shared portion = 800. w_single portion = 200.
      // wg1 and wg2 should each pay 400. s1 pays 200.
      const result = calculateProFlächeDistribution([wgTenant1, wgTenant2, singleTenant], 1000, startdatum, enddatum);

      expect(result['s1'].amount).toBe(200);
      expect(result['wg1'].amount).toBe(400);
      expect(result['wg2'].amount).toBe(400);
    });

    it('handles sequential tenants in the same apartment without overbilling', () => {
      const t1 = { id: 't1', wohnung_id: 'w1', einzug: '2023-01-01', auszug: '2023-06-30', Wohnungen: { groesse: 100 } } as any;
      const t2 = { id: 't2', wohnung_id: 'w1', einzug: '2023-07-01', auszug: '2023-12-31', Wohnungen: { groesse: 100 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          if (t.id === 't1') return { occupancyDays: 181, occupancyRatio: 181 / 365, effectivePeriodStart: '2023-01-01', effectivePeriodEnd: '2023-06-30' };
          if (t.id === 't2') return { occupancyDays: 184, occupancyRatio: 184 / 365, effectivePeriodStart: '2023-07-01', effectivePeriodEnd: '2023-12-31' };
        });

      const result = calculateProFlächeDistribution([t1, t2], 1000, '2023-01-01', '2023-12-31', 100);

      // Union occupancy is 365 days. 
      // t1 has 181 days, t2 has 184 days.
      expect(result['t1'].amount).toBeCloseTo((181 / 365) * 1000, 2);
      expect(result['t2'].amount).toBeCloseTo((184 / 365) * 1000, 2);
      expect(result['t1'].amount + result['t2'].amount).toBeCloseTo(1000, 2);
    });

    it('distributes costs proportionally for unequal sequential stays (e.g. 212 days vs 153 days)', () => {
      const t1 = { id: 'ibald', wohnung_id: 'apt1', einzug: '2025-01-01', auszug: '2025-07-31', Wohnungen: { groesse: 34.5 } } as any;
      const t2 = { id: 'scheffler', wohnung_id: 'apt1', einzug: '2025-08-01', Wohnungen: { groesse: 34.5 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          if (t.id === 'ibald') return { occupancyDays: 212, occupancyRatio: 212 / 365 };
          if (t.id === 'scheffler') return { occupancyDays: 153, occupancyRatio: 153 / 365 };
        });

      // Total house area = 2313, total cost = 30551.87
      const result = calculateProFlächeDistribution([t1, t2], 30551.87, '2025-01-01', '2025-12-31', 2313);

      const aptTotal = (34.5 / 2313) * 30551.87; // 455.7023
      expect(result['ibald'].amount).toBeCloseTo(aptTotal * (212 / 365), 2); // 264.68
      expect(result['scheffler'].amount).toBeCloseTo(aptTotal * (153 / 365), 2); // 191.02
      expect(result['ibald'].amount + result['scheffler'].amount).toBeCloseTo(aptTotal, 2);
    });

    it('accurately divides costs for shared apartments (WGs) with staggered move-in dates', () => {
      // Apartment size 125 sqm, house area 2313 sqm, total cost 30551.87
      // Kastenhuber moves in on 2025-04-15 (16 days solo)
      // Summer & Hofschild move in on 2025-05-01 (245 days all 3 together)
      const t1 = { id: 'kasten', wohnung_id: 'apt_wg', einzug: '2025-04-15', auszug: '2025-12-31', Wohnungen: { groesse: 125 } } as any;
      const t2 = { id: 'summer', wohnung_id: 'apt_wg', einzug: '2025-05-01', auszug: '2025-12-31', Wohnungen: { groesse: 125 } } as any;
      const t3 = { id: 'hofschild', wohnung_id: 'apt_wg', einzug: '2025-05-01', auszug: '2025-12-31', Wohnungen: { groesse: 125 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          if (t.id === 'kasten') return { occupancyDays: 261, occupancyRatio: 261 / 365 };
          return { occupancyDays: 245, occupancyRatio: 245 / 365 };
        });

      const result = calculateProFlächeDistribution([t1, t2, t3], 30551.87, '2025-01-01', '2025-12-31', 2313);

      const dailyRate = (125 / 2313) * (30551.87 / 365); // 4.52356 €/day
      const solo16Cost = 16 * dailyRate; // 72.38 €
      const wg245Each = (245 * dailyRate) / 3; // 369.42 €

      expect(result['kasten'].amount).toBeCloseTo(solo16Cost + wg245Each, 2); // 441.80 €
      expect(result['summer'].amount).toBeCloseTo(wg245Each, 2); // 369.42 €
      expect(result['hofschild'].amount).toBeCloseTo(wg245Each, 2); // 369.42 €
      expect(result['summer'].amount).toBeCloseTo(result['hofschild'].amount, 2);
    });

    it('correctly handles intermediate vacancy between sequential tenants', () => {
      // 36 sqm apartment, 2313 sqm house, 30551.87 € cost
      // Tenant 1 leaves May 15 (135 days)
      // 16 days vacant (May 16 - May 31)
      // Tenant 2 moves in June 1 (214 days)
      const t1 = { id: 'kasten_sf', wohnung_id: 'apt_36', einzug: '2021-01-01', auszug: '2025-05-15', Wohnungen: { groesse: 36 } } as any;
      const t2 = { id: 'kalvelage', wohnung_id: 'apt_36', einzug: '2025-06-01', auszug: '2025-12-31', Wohnungen: { groesse: 36 } } as any;

      (calculateTenantOccupancy as jest.Mock)
        .mockImplementation((t) => {
          if (t.id === 'kasten_sf') return { occupancyDays: 135, occupancyRatio: 135 / 365 };
          return { occupancyDays: 214, occupancyRatio: 214 / 365 };
        });

      const result = calculateProFlächeDistribution([t1, t2], 30551.87, '2025-01-01', '2025-12-31', 2313);

      const dailyRate = (36 / 2313) * (30551.87 / 365); // 1.30278 €/day
      expect(result['kasten_sf'].amount).toBeCloseTo(135 * dailyRate, 2); // 175.88 €
      expect(result['kalvelage'].amount).toBeCloseTo(214 * dailyRate, 2); // 278.80 €
    });
  });

  describe('calculateProMieterDistribution', () => {
    it('distributes equally for full occupancy', () => {
      const result = calculateProMieterDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBe(500);
      expect(result['t2'].amount).toBe(500);
    });

    it('distributes based on occupancy days', () => {
      (calculateTenantOccupancy as jest.Mock)
        .mockReturnValueOnce({ occupancyDays: 100, occupancyRatio: 100 / 365 })
        .mockReturnValueOnce({ occupancyDays: 300, occupancyRatio: 300 / 365 });

      const result = calculateProMieterDistribution(mockTenants, 1000, startdatum, enddatum);
      expect(result['t1'].amount).toBeCloseTo(250);
      expect(result['t2'].amount).toBeCloseTo(750);
    });
  });

  describe('calculateProWohnungDistribution', () => {
    const tenant = (id: string, wohnung_id: string | null, einzug: string | null = '2020-01-01', auszug: string | null = null) =>
      ({ id, wohnung_id, einzug, auszug }) as any;

    it('gives every apartment the same share and splits a WG share among its flatmates', () => {
      // Two flatmates in w1, one tenant in w2: each apartment pays 600, not 2/3 vs 1/3
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w1'), tenant('t3', 'w2')], 1200, startdatum, enddatum
      );

      expect(result['t1'].amount).toBeCloseTo(300);
      expect(result['t2'].amount).toBeCloseTo(300);
      expect(result['t3'].amount).toBeCloseTo(600);
    });

    it('splits the apartment share of sequential tenants by their days', () => {
      // 2023: t1 Jan-Mar (90 days), t2 Apr-Dec (275 days) in w1
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1', '2020-01-01', '2023-03-31'), tenant('t2', 'w1', '2023-04-01'), tenant('t3', 'w2')],
        1000, startdatum, enddatum
      );

      expect(result['t1'].amount).toBeCloseTo(500 * 90 / 365);
      expect(result['t2'].amount).toBeCloseTo(500 * 275 / 365);
      expect(result['t1'].amount + result['t2'].amount).toBeCloseTo(500);
      expect(result['t3'].amount).toBeCloseTo(500);
    });

    it('splits the shared days of a staggered WG equally', () => {
      // t1 all year; t2 joins on 2023-07-01: t1 alone for 181 days, both share 184 days
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w1', '2023-07-01'), tenant('t3', 'w2')], 1000, startdatum, enddatum
      );

      expect(result['t1'].amount).toBeCloseTo(500 * (181 + 92) / 365);
      expect(result['t2'].amount).toBeCloseTo(500 * 92 / 365);
      expect(result['t3'].amount).toBeCloseTo(500);
    });

    it('leaves the vacant days of an apartment with the landlord', () => {
      // w1 is vacant until 2023-07-01 (184 occupied days); w2 still pays only its own share
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1', '2023-07-01'), tenant('t3', 'w2')], 1000, startdatum, enddatum
      );

      expect(result['t1'].amount).toBeCloseTo(500 * 184 / 365);
      expect(result['t3'].amount).toBeCloseTo(500);
    });

    it('leaves an apartment vacant all period with the landlord when the house count is given', () => {
      // House has 3 apartments, w3 has no tenant: w1 and w2 pay a third each, not half
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w2')], 900, startdatum, enddatum, 3
      );

      expect(result['t1'].amount).toBeCloseTo(300);
      expect(result['t2'].amount).toBeCloseTo(300);
    });

    it('never uses a house count below the apartments the tenants live in', () => {
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w2')], 900, startdatum, enddatum, 1
      );

      expect(result['t1'].amount).toBeCloseTo(450);
      expect(result['t2'].amount).toBeCloseTo(450);
    });

    it('bills nothing to a tenant without a move-in date and does not dilute flatmates', () => {
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w1', null), tenant('t3', 'w2', null)], 1000, startdatum, enddatum
      );

      expect(result['t1'].amount).toBeCloseTo(500);
      expect(result['t2'].amount).toBe(0);
      expect(result['t3'].amount).toBe(0);
    });

    it('skips tenants without an apartment', () => {
      const result = calculateProWohnungDistribution([tenant('t1', 'w1'), tenant('t2', null)], 1000, startdatum, enddatum);

      expect(result['t1'].amount).toBeCloseTo(1000);
      expect(result['t2']).toBeUndefined();
    });

    it('uses precomputed WG factors when given', () => {
      const result = calculateProWohnungDistribution(
        [tenant('t1', 'w1'), tenant('t2', 'w2')], 1000, startdatum, enddatum, undefined, { t1: 0.25, t2: 1 }
      );

      expect(result['t1'].amount).toBeCloseTo(125);
      expect(result['t2'].amount).toBeCloseTo(500);
    });
  });
});
