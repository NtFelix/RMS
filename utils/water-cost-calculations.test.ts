/**
 * Tests for water cost calculation utilities
 * 
 * These tests validate the complex water cost calculation logic including:
 * - Multiple water meters per apartment
 * - Tenant move-in/move-out during billing period
 * - WG (shared apartment) cost splitting
 * - Prorated water usage for partial periods
 * - Per-type pricing (different prices for gas, cold water, warm water)
 */

import {
  calculateTenantMeterConsumption,
  calculateTenantMeterCosts,
  getTenantMeterCost,
} from '@/utils/water-cost-calculations';
import { Mieter, WasserZaehler, WasserAblesung } from '@/lib/data-fetching';

describe('Water Cost Calculations', () => {
  // Test data setup
  const periodStart = '2025-01-01';
  const periodEnd = '2025-12-31';

  const apartment1Id = 'apt-1';
  const apartment2Id = 'apt-2';

  // Tenants
  const tenant1: Mieter = {
    id: 'tenant-1',
    name: 'Max Mustermann',
    wohnung_id: apartment1Id,
    einzug: '2025-01-01',
    auszug: null,
    email: null,
    telefonnummer: null,
    notiz: null,
    nebenkosten: null,
    user_id: 'user-1',
    Wohnungen: {
      name: 'Wohnung 1',
      groesse: 50,
    },
  };

  const tenant2: Mieter = {
    id: 'tenant-2',
    name: 'Maria Schmidt',
    wohnung_id: apartment1Id, // Same apartment as tenant1 (WG)
    einzug: '2025-01-01',
    auszug: '2025-06-05', // Moves out on June 5th
    email: null,
    telefonnummer: null,
    notiz: null,
    nebenkosten: null,
    user_id: 'user-1',
    Wohnungen: {
      name: 'Wohnung 1',
      groesse: 50,
    },
  };

  const tenant3: Mieter = {
    id: 'tenant-3',
    name: 'Hans Müller',
    wohnung_id: apartment2Id,
    einzug: '2025-01-01',
    auszug: null,
    email: null,
    telefonnummer: null,
    notiz: null,
    nebenkosten: null,
    user_id: 'user-1',
    Wohnungen: {
      name: 'Wohnung 2',
      groesse: 60,
    },
  };

  // Water meters
  const meter1: WasserZaehler = {
    id: 'meter-1',
    custom_id: 'WZ-001',
    wohnung_id: apartment1Id,
    erstellungsdatum: '2024-01-01',
    eichungsdatum: '2024-01-01',
    user_id: 'user-1',
    zaehler_typ: 'kaltwasser',
    einheit: 'm³',
    ist_aktiv: true,
  };

  const meter2: WasserZaehler = {
    id: 'meter-2',
    custom_id: 'WZ-002',
    wohnung_id: apartment2Id,
    erstellungsdatum: '2024-01-01',
    eichungsdatum: '2024-01-01',
    user_id: 'user-1',
    zaehler_typ: 'kaltwasser',
    einheit: 'm³',
    ist_aktiv: true,
  };

  // Water readings
  const reading1: WasserAblesung = {
    id: 'reading-1',
    ablese_datum: '2025-06-05', // Reading on the day tenant2 moves out
    zaehlerstand: 150,
    verbrauch: 100, // 100 m³ consumed up to June 5th
    user_id: 'user-1',
    zaehler_id: 'meter-1',
  };

  const reading2: WasserAblesung = {
    id: 'reading-2',
    ablese_datum: '2025-12-31', // End of year reading
    zaehlerstand: 250,
    verbrauch: 100, // Additional 100 m³ from June 5th to end of year
    user_id: 'user-1',
    zaehler_id: 'meter-1',
  };

  const reading3: WasserAblesung = {
    id: 'reading-3',
    ablese_datum: '2025-12-31',
    zaehlerstand: 180,
    verbrauch: 180, // 180 m³ for the whole year
    user_id: 'user-1',
    zaehler_id: 'meter-2',
  };

  describe('calculateTenantMeterConsumption', () => {
    it('should calculate consumption for single tenant in apartment', () => {
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3];

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-3');
      expect(result[0].totalConsumption).toBe(180);
      // Should track consumption by type
      expect(result[0].consumptionByType).toEqual({ kaltwasser: 180 });
    });

    it('should split consumption between WG members based on occupancy', () => {
      const tenants = [tenant1, tenant2];
      const meters = [meter1];
      const readings = [reading1, reading2];

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(2);

      // Total consumption for apartment is 200 m³ (100 + 100)
      const totalConsumption = result.reduce((sum, t) => sum + t.totalConsumption, 0);
      expect(totalConsumption).toBeCloseTo(200, 1);

      // Tenant2 moved out on June 5th (approximately 156 days out of 365)
      // Tenant1 stayed the whole year (365 days)
      // The 100 m³ up to June 5th should be split between both
      // The 100 m³ after June 5th should go entirely to tenant1

      const tenant1Result = result.find(r => r.tenantId === 'tenant-1');
      const tenant2Result = result.find(r => r.tenantId === 'tenant-2');

      expect(tenant1Result).toBeDefined();
      expect(tenant2Result).toBeDefined();

      // Tenant1 should have more consumption since they stayed longer
      expect(tenant1Result!.totalConsumption).toBeGreaterThan(tenant2Result!.totalConsumption);

      // Both should have consumptionByType tracking
      expect(tenant1Result!.consumptionByType).toBeDefined();
      expect(tenant1Result!.consumptionByType['kaltwasser']).toBeGreaterThan(0);
    });

    it('should handle multiple meters in same apartment', () => {
      // Add a second meter to apartment 1
      const meter1b: WasserZaehler = {
        id: 'meter-1b',
        custom_id: 'WZ-001B',
        wohnung_id: apartment1Id,
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2024-01-01',
        user_id: 'user-1',
        zaehler_typ: 'kaltwasser',
        einheit: 'm³',
        ist_aktiv: true,
      };

      const reading1b: WasserAblesung = {
        id: 'reading-1b',
        ablese_datum: '2025-12-31',
        zaehlerstand: 50,
        verbrauch: 50,
        user_id: 'user-1',
        zaehler_id: 'meter-1b',
      };

      const tenants = [tenant1, tenant2];
      const meters = [meter1, meter1b];
      const readings = [reading1, reading2, reading1b];

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      // Total consumption should include all meters (200 + 50 = 250)
      const totalConsumption = result.reduce((sum, t) => sum + t.totalConsumption, 0);
      expect(totalConsumption).toBeCloseTo(250, 1);
    });

    it('should handle tenant with no consumption (moved out before period)', () => {
      const earlyTenant: Mieter = {
        ...tenant2,
        id: 'early-tenant',
        einzug: '2024-01-01',
        auszug: '2024-12-31', // Moved out before billing period
      };

      const tenants = [tenant1, earlyTenant];
      const meters = [meter1];
      const readings = [reading1, reading2];

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      // Should only have tenant1 in results
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-1');
    });

    it('should track consumption by meter type when apartment has mixed meter types', () => {
      // Add a warm water meter to apartment 2
      const warmMeter: WasserZaehler = {
        id: 'meter-warm-2',
        custom_id: 'WW-002',
        wohnung_id: apartment2Id,
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2024-01-01',
        user_id: 'user-1',
        zaehler_typ: 'warmwasser',
        einheit: 'm³',
        ist_aktiv: true,
      };

      const warmReading: WasserAblesung = {
        id: 'reading-warm-2',
        ablese_datum: '2025-12-31',
        zaehlerstand: 90,
        verbrauch: 90, // 90 m³ warm water
        user_id: 'user-1',
        zaehler_id: 'meter-warm-2',
      };

      const tenants = [tenant3];
      const meters = [meter2, warmMeter]; // cold + warm
      const readings = [reading3, warmReading]; // 180 m³ cold + 90 m³ warm

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].totalConsumption).toBe(270); // 180 + 90
      expect(result[0].consumptionByType).toEqual({
        kaltwasser: 180,
        warmwasser: 90,
      });
    });
  });

  describe('calculateTenantMeterCosts', () => {
    it('should calculate costs correctly with price per cubic meter', () => {
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3];
      // Per-type costs: 540 EUR for 180 m³ kaltwasser = 3 EUR/m³
      const zaehlerkosten = { kaltwasser: 540 };
      const zaehlerverbrauch = { kaltwasser: 180 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180);
      expect(result[0].pricePerUnit).toBe(3);
      expect(result[0].costShare).toBe(540);
      expect(result[0].isWGMember).toBe(false);
      // New per-type fields
      expect(result[0].costByType).toEqual({ kaltwasser: 540 });
      expect(result[0].consumptionByType).toEqual({ kaltwasser: 180 });
      expect(result[0].pricePerUnitByType).toEqual({ kaltwasser: 3 });
    });

    it('should identify WG members and provide split details', () => {
      const tenants = [tenant1, tenant2];
      const meters = [meter1];
      const readings = [reading1, reading2];
      const zaehlerkosten = { kaltwasser: 600 }; // 600 EUR for 200 m³ = 3 EUR/m³
      const zaehlerverbrauch = { kaltwasser: 200 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(2);

      result.forEach(tenantCost => {
        expect(tenantCost.isWGMember).toBe(true);
        expect(tenantCost.wgSplitDetails).toBeDefined();
        expect(tenantCost.wgSplitDetails!.coTenants).toHaveLength(1);
      });

      // Total costs should equal building water cost
      const totalCosts = result.reduce((sum, t) => sum + t.costShare, 0);
      expect(totalCosts).toBeCloseTo(600, 1);
    });

    it('should handle the specific scenario: tenant leaving on reading date', () => {
      // Scenario: Tenant2 leaves on 05.06.2025, reading on that day shows 100 m³
      // Both tenants should pay for this 100 m³ proportionally
      // Remaining consumption after 05.06.2025 should only be for tenant1

      const tenants = [tenant1, tenant2];
      const meters = [meter1];
      const readings = [reading1, reading2]; // 100 m³ on 05.06, 100 m³ on 31.12
      const zaehlerkosten = { kaltwasser: 600 }; // 3 EUR/m³
      const zaehlerverbrauch = { kaltwasser: 200 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      const tenant1Cost = result.find(r => r.tenantId === 'tenant-1');
      const tenant2Cost = result.find(r => r.tenantId === 'tenant-2');

      expect(tenant1Cost).toBeDefined();
      expect(tenant2Cost).toBeDefined();

      // Tenant2 should have consumed approximately 50 m³ (half of first 100 m³)
      // Tenant1 should have consumed approximately 150 m³ (half of first 100 m³ + all of second 100 m³)
      expect(tenant2Cost!.consumption).toBeLessThan(tenant1Cost!.consumption);
      expect(tenant1Cost!.consumption + tenant2Cost!.consumption).toBeCloseTo(200, 1);

      // Cost should be proportional to consumption
      expect(tenant1Cost!.costShare).toBeGreaterThan(tenant2Cost!.costShare);
      expect(tenant1Cost!.costShare + tenant2Cost!.costShare).toBeCloseTo(600, 1);
    });

    it('should calculate per-type costs independently for mixed meter types', () => {
      // This is the KEY test: mixed meter types should NOT blend prices
      // Gas: 10 EUR for 68 m³ = 0.147 EUR/m³
      // Kaltwasser: 100 EUR for 382.25 m³ = 0.262 EUR/m³
      // Warmwasser: 100 EUR for 428 m³ = 0.234 EUR/m³

      const gasMeter: WasserZaehler = {
        id: 'gas-meter',
        custom_id: 'GZ-001',
        wohnung_id: apartment2Id,
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2024-01-01',
        user_id: 'user-1',
        zaehler_typ: 'gas',
        einheit: 'm³',
        ist_aktiv: true,
      };

      const warmMeter: WasserZaehler = {
        id: 'warm-meter',
        custom_id: 'WW-001',
        wohnung_id: apartment2Id,
        erstellungsdatum: '2024-01-01',
        eichungsdatum: '2024-01-01',
        user_id: 'user-1',
        zaehler_typ: 'warmwasser',
        einheit: 'm³',
        ist_aktiv: true,
      };

      const gasReading: WasserAblesung = {
        id: 'gas-reading',
        ablese_datum: '2025-12-31',
        zaehlerstand: 68,
        verbrauch: 68,
        user_id: 'user-1',
        zaehler_id: 'gas-meter',
      };

      const coldReading: WasserAblesung = {
        ...reading3,
        verbrauch: 382.25,
        zaehlerstand: 382.25,
      };

      const warmReading: WasserAblesung = {
        id: 'warm-reading',
        ablese_datum: '2025-12-31',
        zaehlerstand: 428,
        verbrauch: 428,
        user_id: 'user-1',
        zaehler_id: 'warm-meter',
      };

      const zaehlerkosten = { gas: 10, kaltwasser: 100, warmwasser: 100 };
      const zaehlerverbrauch = { gas: 68, kaltwasser: 382.25, warmwasser: 428 };

      const tenants = [tenant3];
      const meters = [meter2, gasMeter, warmMeter]; // cold, gas, warm
      const readings = [coldReading, gasReading, warmReading];

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      const tenantCost = result[0];

      // Total cost should be exactly 210 EUR (10 + 100 + 100)
      expect(tenantCost.costShare).toBeCloseTo(210, 2);

      // Per-type costs should be correct
      expect(tenantCost.costByType['gas']).toBeCloseTo(10, 2);
      expect(tenantCost.costByType['kaltwasser']).toBeCloseTo(100, 2);
      expect(tenantCost.costByType['warmwasser']).toBeCloseTo(100, 2);

      // Per-type prices should each be independent
      expect(tenantCost.pricePerUnitByType['gas']).toBeCloseTo(10 / 68, 4);
      expect(tenantCost.pricePerUnitByType['kaltwasser']).toBeCloseTo(100 / 382.25, 4);
      expect(tenantCost.pricePerUnitByType['warmwasser']).toBeCloseTo(100 / 428, 4);

      // Weighted average price per unit should NOT equal any individual type price
      const totalConsumption = 68 + 382.25 + 428;
      expect(tenantCost.consumption).toBeCloseTo(totalConsumption, 2);
      expect(tenantCost.pricePerUnit).toBeCloseTo(210 / totalConsumption, 4);
    });

    it('should correctly distribute multi-type costs in multi-tenant building', () => {
      // Two tenants in different apartments, each with gas + cold water meters
      // Tenant A (apt-1): gas=30m³, cold=100m³ → heavy gas user
      // Tenant B (apt-2): gas=10m³, cold=200m³ → heavy water user
      // Building totals: gas=40m³ @ €120 (3€/m³), cold=300m³ @ €600 (2€/m³)

      const gasMeterA: WasserZaehler = {
        id: 'gas-a', custom_id: 'G-A', wohnung_id: apartment1Id,
        erstellungsdatum: '2024-01-01', eichungsdatum: null,
        user_id: 'user-1', zaehler_typ: 'gas', einheit: 'm³', ist_aktiv: true,
      };
      const coldMeterA: WasserZaehler = {
        ...meter1, // already apt-1 kaltwasser
      };
      const gasMeterB: WasserZaehler = {
        id: 'gas-b', custom_id: 'G-B', wohnung_id: apartment2Id,
        erstellungsdatum: '2024-01-01', eichungsdatum: null,
        user_id: 'user-1', zaehler_typ: 'gas', einheit: 'm³', ist_aktiv: true,
      };
      const coldMeterB: WasserZaehler = {
        ...meter2, // already apt-2 kaltwasser
      };

      const gasReadingA: WasserAblesung = {
        id: 'gr-a', ablese_datum: '2025-12-31', zaehlerstand: 30, verbrauch: 30,
        user_id: 'user-1', zaehler_id: 'gas-a',
      };
      const coldReadingA: WasserAblesung = {
        id: 'cr-a', ablese_datum: '2025-12-31', zaehlerstand: 100, verbrauch: 100,
        user_id: 'user-1', zaehler_id: 'meter-1',
      };
      const gasReadingB: WasserAblesung = {
        id: 'gr-b', ablese_datum: '2025-12-31', zaehlerstand: 10, verbrauch: 10,
        user_id: 'user-1', zaehler_id: 'gas-b',
      };
      const coldReadingB: WasserAblesung = {
        id: 'cr-b', ablese_datum: '2025-12-31', zaehlerstand: 200, verbrauch: 200,
        user_id: 'user-1', zaehler_id: 'meter-2',
      };

      const zaehlerkosten = { gas: 120, kaltwasser: 600 }; // 3€/m³ gas, 2€/m³ water
      const zaehlerverbrauch = { gas: 40, kaltwasser: 300 };

      const tenants = [tenant1, tenant3]; // tenant1 in apt-1, tenant3 in apt-2
      const meters = [gasMeterA, coldMeterA, gasMeterB, coldMeterB];
      const readings = [gasReadingA, coldReadingA, gasReadingB, coldReadingB];

      const result = calculateTenantMeterCosts(
        tenants, meters, readings,
        zaehlerkosten, zaehlerverbrauch,
        periodStart, periodEnd
      );

      expect(result).toHaveLength(2);

      const tenantACost = result.find(r => r.tenantId === 'tenant-1')!;
      const tenantBCost = result.find(r => r.tenantId === 'tenant-3')!;

      // Tenant A: gas=30m³×3€=90€, cold=100m³×2€=200€ → Total=290€
      expect(tenantACost.costByType['gas']).toBeCloseTo(90, 2);
      expect(tenantACost.costByType['kaltwasser']).toBeCloseTo(200, 2);
      expect(tenantACost.costShare).toBeCloseTo(290, 2);

      // Tenant B: gas=10m³×3€=30€, cold=200m³×2€=400€ → Total=430€
      expect(tenantBCost.costByType['gas']).toBeCloseTo(30, 2);
      expect(tenantBCost.costByType['kaltwasser']).toBeCloseTo(400, 2);
      expect(tenantBCost.costShare).toBeCloseTo(430, 2);

      // Total should equal building total: 120 + 600 = 720
      expect(tenantACost.costShare + tenantBCost.costShare).toBeCloseTo(720, 2);

      // NOTE: With the OLD blended approach, both tenants would have gotten
      // the same price: 720/340 = 2.118€/m³. That would give:
      // Tenant A: 130m³ × 2.118 = 275.29€ (WRONG! 14.71€ too low)
      // Tenant B: 210m³ × 2.118 = 444.71€ (WRONG! 14.71€ too high)
      // This test proves the per-type approach gives correct results.
    });
  });

  describe('getTenantMeterCost', () => {
    it('should return cost for specific tenant', () => {
      const tenants = [tenant1, tenant2, tenant3];
      const meters = [meter1, meter2];
      const readings = [reading1, reading2, reading3];
      const zaehlerkosten = { kaltwasser: 1140 }; // 380 m³ total × 3 EUR/m³
      const zaehlerverbrauch = { kaltwasser: 380 };

      const result = getTenantMeterCost(
        'tenant-3',
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant-3');
      expect(result!.consumption).toBe(180);
      expect(result!.isWGMember).toBe(false);
    });

    it('should return null for non-existent tenant', () => {
      const tenants = [tenant1];
      const meters = [meter1];
      const readings = [reading1];
      const zaehlerkosten = { kaltwasser: 300 };
      const zaehlerverbrauch = { kaltwasser: 100 };

      const result = getTenantMeterCost(
        'non-existent',
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero consumption', () => {
      const tenants = [tenant1];
      const meters = [meter1];
      const readings: WasserAblesung[] = []; // No readings
      const zaehlerkosten = {};
      const zaehlerverbrauch = {};

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      // With no readings, consumption should be 0 but tenant still appears in results
      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(0);
      expect(result[0].costShare).toBe(0);
    });

    it('should handle apartment with no meters', () => {
      const tenants = [tenant1];
      const meters: WasserZaehler[] = []; // No meters
      const readings: WasserAblesung[] = [];
      const zaehlerkosten = { kaltwasser: 100 };
      const zaehlerverbrauch = {};

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(0);
    });

    it('should handle tenant moving in mid-period with WG scenario', () => {
      // Create a scenario where one tenant moves in mid-year
      // and another tenant was there the whole time (WG)
      const fullYearTenant: Mieter = {
        ...tenant1,
        id: 'full-year-tenant',
        einzug: '2025-01-01',
        auszug: null,
      };

      const midYearTenant: Mieter = {
        ...tenant1,
        id: 'mid-year-tenant',
        einzug: '2025-07-01', // Moves in July 1st
        auszug: null,
      };

      const tenants = [fullYearTenant, midYearTenant];
      const meters = [meter1];
      const readings = [reading2]; // 100 m³ for whole year
      const zaehlerkosten = { kaltwasser: 300 };
      const zaehlerverbrauch = { kaltwasser: 100 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(2);

      const fullYearResult = result.find(r => r.tenantId === 'full-year-tenant');
      const midYearResult = result.find(r => r.tenantId === 'mid-year-tenant');

      expect(fullYearResult).toBeDefined();
      expect(midYearResult).toBeDefined();

      // Full year tenant should have more consumption
      expect(fullYearResult!.consumption).toBeGreaterThan(midYearResult!.consumption);

      // Total should equal 100 m³
      expect(fullYearResult!.consumption + midYearResult!.consumption).toBeCloseTo(100, 1);

      // Both should be marked as WG members
      expect(fullYearResult!.isWGMember).toBe(true);
      expect(midYearResult!.isWGMember).toBe(true);
    });
  });

  describe('Water Cost Configuration Issues (Common "Bug" Scenarios)', () => {
    /**
     * These tests document common scenarios where water costs appear to be "missing"
     * but are actually working as expected based on the input data.
     */

    it('should return 0 cost when zaehlerkosten is empty', () => {
      // Common issue: Wasserkosten not entered in Nebenkosten
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3]; // 180 m³ consumption
      const zaehlerkosten = {}; // ❌ No water cost entered!
      const zaehlerverbrauch = { kaltwasser: 180 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180); // Consumption is calculated
      expect(result[0].costShare).toBe(0); // Cost share is 0 because no costs defined
    });

    it('should return 0 cost when zaehlerverbrauch is empty', () => {
      // Common issue: Wasserverbrauch not entered in Nebenkosten
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3]; // 180 m³ consumption in readings
      const zaehlerkosten = { kaltwasser: 540 };
      const zaehlerverbrauch = {}; // ❌ No building consumption entered!

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180); // Individual consumption is still calculated
      expect(result[0].costShare).toBe(0); // Cost share is 0 because price per unit is 0
    });

    it('should return 0 consumption when readings are outside billing period', () => {
      // Common issue: Water reading date is outside the Nebenkosten period
      const oldReading: WasserAblesung = {
        ...reading3,
        id: 'old-reading',
        ablese_datum: '2024-06-15', // ❌ Reading from last year!
      };

      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [oldReading]; // Reading from wrong period

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        readings,
        periodStart, // 2025-01-01
        periodEnd    // 2025-12-31
      );
      // Tenant appears in results but with 0 consumption because reading date is outside period
      expect(result).toHaveLength(1);
      expect(result[0].totalConsumption).toBe(0);
    });

    it('should return empty array when meter wohnung_id does not match any tenant', () => {
      // Common issue: Water meter linked to wrong apartment
      const wrongMeter: WasserZaehler = {
        ...meter2,
        wohnung_id: 'non-existent-apt', // ❌ Wrong apartment ID!
      };

      const tenants = [tenant3]; // tenant3 is in apartment2Id
      const meters = [wrongMeter]; // meter is linked to non-existent apartment

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        [reading3],
        periodStart,
        periodEnd
      );

      // No consumption because meter isn't linked to tenant's apartment
      expect(result).toHaveLength(0);
    });

    it('should return 0 consumption when verbrauch in reading is 0', () => {
      // Common issue: Reading entered with zaehlerstand but no verbrauch calculated
      const zeroVerbrauchReading: WasserAblesung = {
        ...reading3,
        id: 'zero-reading',
        verbrauch: 0, // ❌ Zero consumption!
        zaehlerstand: 180,
      };

      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [zeroVerbrauchReading];
      const zaehlerkosten = { kaltwasser: 540 };
      const zaehlerverbrauch = { kaltwasser: 180 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );
      // Tenant appears in results but with 0 consumption because verbrauch is 0
      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(0);
      expect(result[0].costShare).toBe(0);
    });

    it('should handle meter without wohnung_id gracefully', () => {
      // Edge case: Meter exists but isn't linked to any apartment
      const unlinkedMeter: WasserZaehler = {
        ...meter2,
        wohnung_id: '', // Empty string instead of null to satisfy type
      };

      const tenants = [tenant3];
      const meters = [unlinkedMeter];

      const result = calculateTenantMeterConsumption(
        tenants,
        meters,
        [reading3],
        periodStart,
        periodEnd
      );

      // No consumption because meter isn't linked to any apartment
      expect(result).toHaveLength(0);
    });

    it('should only calculate costs for apartments with water meters', () => {
      // Scenario: Building has 5 apartments but only 1 has water meters
      // Only tenants in apartment with meter get water costs
      const tenant4: Mieter = {
        ...tenant1,
        id: 'tenant-4',
        name: 'Anna Weber',
        wohnung_id: 'apt-3', // Different apartment, no water meter
      };

      const tenant5: Mieter = {
        ...tenant1,
        id: 'tenant-5',
        name: 'Peter Klein',
        wohnung_id: 'apt-4', // Different apartment, no water meter
      };

      const tenants = [tenant3, tenant4, tenant5]; // 3 tenants in different apartments
      const meters = [meter2]; // Only apartment2 has a meter
      const readings = [reading3];
      const zaehlerkosten = { kaltwasser: 540 };
      const zaehlerverbrauch = { kaltwasser: 180 };

      const result = calculateTenantMeterCosts(
        tenants,
        meters,
        readings,
        zaehlerkosten,
        zaehlerverbrauch,
        periodStart,
        periodEnd
      );

      // Only tenant3 (in apt-2 which has the meter) gets water costs
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-3');
      expect(result[0].costShare).toBe(540);
    });
  });

  describe('getTenantMeterCost with edge cases', () => {
    it('should return null when tenant has no water meter in their apartment', () => {
      // Tenant exists but their apartment has no water meter
      const tenantWithoutMeter: Mieter = {
        ...tenant1,
        id: 'tenant-no-meter',
        wohnung_id: 'apt-no-meter',
      };

      const tenants = [tenantWithoutMeter, tenant3];
      const meters = [meter2]; // Only meter for tenant3's apartment
      const readings = [reading3];

      const result = getTenantMeterCost(
        'tenant-no-meter',
        tenants,
        meters,
        readings,
        { kaltwasser: 540 },
        { kaltwasser: 180 },
        periodStart,
        periodEnd
      );

      // Tenant has no water cost because their apartment has no meter
      expect(result).toBeNull();
    });

    it('should calculate correct cost for tenant in apartment with meter', () => {
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3];

      const result = getTenantMeterCost(
        'tenant-3',
        tenants,
        meters,
        readings,
        { kaltwasser: 540 }, // Total water cost
        { kaltwasser: 180 }, // Total consumption
        periodStart,
        periodEnd
      );

      expect(result).not.toBeNull();
      expect(result!.consumption).toBe(180);
      expect(result!.costShare).toBe(540);
      expect(result!.pricePerUnit).toBe(3); // 540 / 180 = 3 EUR/m³
    });
  });

  describe('Enhanced Meter Reading Aggregation', () => {
    it('should aggregate consumption across multiple meter types (kaltwasser, warmwasser, gas)', () => {
      // Test 1: Multi-meter type grouping
      const gasMeter: WasserZaehler = {
        ...meter2,
        id: 'meter-gas',
        zaehler_typ: 'gas',
        einheit: 'm³',
      };
      const gasReading: WasserAblesung = {
        id: 'reading-gas',
        ablese_datum: '2025-12-31',
        zaehlerstand: 500,
        verbrauch: 500,
        user_id: 'user-1',
        zaehler_id: 'meter-gas',
      };

      const result = calculateTenantMeterConsumption(
        [tenant3],
        [meter2, gasMeter], // meter2 is kaltwasser
        [reading3, gasReading],
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      // Total consumption should be 180 (kaltwasser) + 500 (gas) = 680
      expect(result[0].totalConsumption).toBe(680);
      expect(result[0].consumptionDetails).toHaveLength(2);
    });

    it('should provide consumption details grouped by individual meter', () => {
      // Test 2: Consumption details grouped by meter
      const result = calculateTenantMeterConsumption(
        [tenant3],
        [meter2],
        [reading3],
        periodStart,
        periodEnd
      );

      expect(result[0].consumptionDetails).toHaveLength(1);
      expect(result[0].consumptionDetails[0].meterId).toBe('meter-2');
      expect(result[0].consumptionDetails[0].consumption).toBe(180);
    });

    it('should match reading sums with zaehlerverbrauch JSONB structure', () => {
      // Test 3: Reading sums matching zaehlerverbrauch JSONB
      // This verifies that the logic used to calculate consumption for tenants
      // can be reconciled with the building-level JSONB data
      const results = calculateTenantMeterConsumption(
        [tenant1, tenant2, tenant3],
        [meter1, meter2],
        [reading1, reading2, reading3],
        periodStart,
        periodEnd
      );

      const totalConsumption = results.reduce((sum, r) => sum + r.totalConsumption, 0);
      // Apartment 1: 200 (reading1+2), Apartment 2: 180 (reading3)
      // Total: 380
      expect(totalConsumption).toBe(380);

      const zaehlerverbrauch = {
        kaltwasser: 380
      };

      const summedFromJSONB = Object.values(zaehlerverbrauch).reduce((sum, v) => sum + v, 0);
      expect(totalConsumption).toBe(summedFromJSONB);
    });

    it('should strictly validate date period filtering for readings', () => {
      // Test 4: Date period filtering validation
      const midYearReading: WasserAblesung = {
        id: 'mid-reading',
        ablese_datum: '2025-06-01',
        zaehlerstand: 50,
        verbrauch: 50,
        user_id: 'user-1',
        zaehler_id: 'meter-2',
      };
      const lateReading: WasserAblesung = {
        id: 'late-reading',
        ablese_datum: '2026-01-05', // Outside period (2025)
        zaehlerstand: 300,
        verbrauch: 100,
        user_id: 'user-1',
        zaehler_id: 'meter-2',
      };

      const result = calculateTenantMeterConsumption(
        [tenant3],
        [meter2],
        [midYearReading, lateReading],
        '2025-01-01',
        '2025-12-31'
      );

      // Should only include midYearReading (50)
      expect(result[0].totalConsumption).toBe(50);
    });

    it('should handle partial periods with multi-tenant occupancy correctly', () => {
      // Test 5: Re-verifying complex splitting for safety
      const midYear = '2025-07-01';
      const tenantA: Mieter = { ...tenant1, id: 'tenant-A', einzug: '2025-01-01', auszug: midYear };
      const tenantB: Mieter = { ...tenant1, id: 'tenant-B', einzug: midYear, auszug: null };

      const reading: WasserAblesung = {
        id: 'one-reading',
        ablese_datum: '2025-12-31',
        zaehlerstand: 100,
        verbrauch: 100,
        user_id: 'user-1',
        zaehler_id: 'meter-1',
      };

      const results = calculateTenantMeterConsumption(
        [tenantA, tenantB],
        [meter1],
        [reading],
        '2025-01-01',
        '2025-12-31'
      );

      expect(results).toHaveLength(2);
      const resA = results.find(r => r.tenantId === 'tenant-A');
      const resB = results.find(r => r.tenantId === 'tenant-B');

      // Since mid-year is almost halfway (July 1st), it should be roughly 50/50
      // 2025 is not a leap year. 
      // Tenant A (Jan 1 - Jul 1 inclusive): 182 days
      // Tenant B (Jul 1 - Dec 31 inclusive): 184 days
      // Total person-days: 366 (overlapping on Jul 1).
      // Costs are distributed proportionally: 182/366 and 184/366.
      expect(resA!.totalConsumption).toBeCloseTo(100 * 182 / 366);
      expect(resB!.totalConsumption).toBeCloseTo(100 * 184 / 366);
      expect(resA!.totalConsumption + resB!.totalConsumption).toBeCloseTo(100);
    });
  });
});
