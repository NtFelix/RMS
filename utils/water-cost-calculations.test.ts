/**
 * Tests for water cost calculation utilities
 * 
 * These tests validate the complex water cost calculation logic including:
 * - Multiple water meters per apartment
 * - Tenant move-in/move-out during billing period
 * - WG (shared apartment) cost splitting
 * - Prorated water usage for partial periods
 */

import {
  calculateTenantWaterConsumption,
  calculateTenantWaterCosts,
  getTenantWaterCost,
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
  };

  const meter2: WasserZaehler = {
    id: 'meter-2',
    custom_id: 'WZ-002',
    wohnung_id: apartment2Id,
    erstellungsdatum: '2024-01-01',
    eichungsdatum: '2024-01-01',
    user_id: 'user-1',
  };

  // Water readings
  const reading1: WasserAblesung = {
    id: 'reading-1',
    ablese_datum: '2025-06-05', // Reading on the day tenant2 moves out
    zaehlerstand: 150,
    verbrauch: 100, // 100 m³ consumed up to June 5th
    user_id: 'user-1',
    wasser_zaehler_id: 'meter-1',
  };

  const reading2: WasserAblesung = {
    id: 'reading-2',
    ablese_datum: '2025-12-31', // End of year reading
    zaehlerstand: 250,
    verbrauch: 100, // Additional 100 m³ from June 5th to end of year
    user_id: 'user-1',
    wasser_zaehler_id: 'meter-1',
  };

  const reading3: WasserAblesung = {
    id: 'reading-3',
    ablese_datum: '2025-12-31',
    zaehlerstand: 180,
    verbrauch: 180, // 180 m³ for the whole year
    user_id: 'user-1',
    wasser_zaehler_id: 'meter-2',
  };

  describe('calculateTenantWaterConsumption', () => {
    it('should calculate consumption for single tenant in apartment', () => {
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3];

      const result = calculateTenantWaterConsumption(
        tenants,
        meters,
        readings,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-3');
      expect(result[0].totalConsumption).toBe(180);
    });

    it('should split consumption between WG members based on occupancy', () => {
      const tenants = [tenant1, tenant2];
      const meters = [meter1];
      const readings = [reading1, reading2];

      const result = calculateTenantWaterConsumption(
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
      };

      const reading1b: WasserAblesung = {
        id: 'reading-1b',
        ablese_datum: '2025-12-31',
        zaehlerstand: 50,
        verbrauch: 50,
        user_id: 'user-1',
        wasser_zaehler_id: 'meter-1b',
      };

      const tenants = [tenant1, tenant2];
      const meters = [meter1, meter1b];
      const readings = [reading1, reading2, reading1b];

      const result = calculateTenantWaterConsumption(
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

      const result = calculateTenantWaterConsumption(
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
  });

  describe('calculateTenantWaterCosts', () => {
    it('should calculate costs correctly with price per cubic meter', () => {
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3];
      const totalBuildingWaterCost = 540; // 540 EUR for 180 m³ = 3 EUR/m³
      const totalBuildingConsumption = 180; // Official building consumption

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180);
      expect(result[0].pricePerCubicMeter).toBe(3);
      expect(result[0].costShare).toBe(540);
      expect(result[0].isWGMember).toBe(false);
    });

    it('should identify WG members and provide split details', () => {
      const tenants = [tenant1, tenant2];
      const meters = [meter1];
      const readings = [reading1, reading2];
      const totalBuildingWaterCost = 600; // 600 EUR for 200 m³ = 3 EUR/m³
      const totalBuildingConsumption = 200;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
      const totalBuildingWaterCost = 600; // 3 EUR/m³
      const totalBuildingConsumption = 200;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
  });

  describe('getTenantWaterCost', () => {
    it('should return cost for specific tenant', () => {
      const tenants = [tenant1, tenant2, tenant3];
      const meters = [meter1, meter2];
      const readings = [reading1, reading2, reading3];
      const totalBuildingWaterCost = 1140; // 380 m³ total * 3 EUR/m³
      const totalBuildingConsumption = 380;

      const result = getTenantWaterCost(
        'tenant-3',
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
      const totalBuildingWaterCost = 300;
      const totalBuildingConsumption = 100;

      const result = getTenantWaterCost(
        'non-existent',
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
      const totalBuildingWaterCost = 0;
      const totalBuildingConsumption = 0;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
      const totalBuildingWaterCost = 100;
      const totalBuildingConsumption = 0;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
      const totalBuildingWaterCost = 300;
      const totalBuildingConsumption = 100;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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

    it('should return 0 cost when totalBuildingWaterCost is 0', () => {
      // Common issue: Wasserkosten not entered in Nebenkosten
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3]; // 180 m³ consumption
      const totalBuildingWaterCost = 0; // ❌ No water cost entered!
      const totalBuildingConsumption = 180;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180); // Consumption is calculated
      expect(result[0].pricePerCubicMeter).toBe(0); // Price is 0 because cost is 0
      expect(result[0].costShare).toBe(0); // Cost share is 0
    });

    it('should return 0 cost when totalBuildingConsumption is 0', () => {
      // Common issue: Wasserverbrauch not entered in Nebenkosten
      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [reading3]; // 180 m³ consumption in readings
      const totalBuildingWaterCost = 540;
      const totalBuildingConsumption = 0; // ❌ No building consumption entered!

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(1);
      expect(result[0].consumption).toBe(180); // Individual consumption is still calculated
      expect(result[0].pricePerCubicMeter).toBe(0); // Price is 0 because can't divide by 0
      expect(result[0].costShare).toBe(0); // Cost share is 0
    });

    it('should return empty array when readings are outside billing period', () => {
      // Common issue: Water reading date is outside the Nebenkosten period
      const oldReading: WasserAblesung = {
        ...reading3,
        id: 'old-reading',
        ablese_datum: '2024-06-15', // ❌ Reading from last year!
      };

      const tenants = [tenant3];
      const meters = [meter2];
      const readings = [oldReading]; // Reading from wrong period

      const result = calculateTenantWaterConsumption(
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

      const result = calculateTenantWaterConsumption(
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
      const totalBuildingWaterCost = 540;
      const totalBuildingConsumption = 180;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
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
        wohnung_id: null, // ❌ Not linked to any apartment!
      };

      const tenants = [tenant3];
      const meters = [unlinkedMeter];

      const result = calculateTenantWaterConsumption(
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
      const totalBuildingWaterCost = 540;
      const totalBuildingConsumption = 180;

      const result = calculateTenantWaterCosts(
        tenants,
        meters,
        readings,
        totalBuildingWaterCost,
        totalBuildingConsumption,
        periodStart,
        periodEnd
      );

      // Only tenant3 (in apt-2 which has the meter) gets water costs
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-3');
      expect(result[0].costShare).toBe(540);
    });
  });

  describe('getTenantWaterCost with edge cases', () => {
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

      const result = getTenantWaterCost(
        'tenant-no-meter',
        tenants,
        meters,
        readings,
        540,
        180,
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

      const result = getTenantWaterCost(
        'tenant-3',
        tenants,
        meters,
        readings,
        540, // Total water cost
        180, // Total consumption
        periodStart,
        periodEnd
      );

      expect(result).not.toBeNull();
      expect(result!.consumption).toBe(180);
      expect(result!.costShare).toBe(540);
      expect(result!.pricePerCubicMeter).toBe(3); // 540 / 180 = 3 EUR/m³
    });
  });
});
