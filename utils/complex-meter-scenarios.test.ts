import {
    calculateTenantMeterCosts,
    getTenantMeterCost,
} from '@/utils/water-cost-calculations';
import { Mieter, WasserZaehler, WasserAblesung } from '@/lib/data-fetching';

/**
 * EXTENSIVE INTEGRATION SCENARIOS
 * 
 * This file contains complex, real-world scenarios to validate the robustness
 * of the meter cost calculation logic. It specifically targets edge cases,
 * mixed meter types, and complex move-in/move-out situations.
 */

describe('Complex Meter Cost Scenarios', () => {
    const periodStart = '2025-01-01';
    const periodEnd = '2025-12-31';

    // Helper to create basic tenant
    const createTenant = (id: string, name: string, wohnungId: string, einzug = periodStart, auszug: string | null = null): Mieter => ({
        id, name, wohnung_id: wohnungId, einzug, auszug,
        email: null, telefonnummer: null, notiz: null, nebenkosten: null, user_id: 'user-1',
        Wohnungen: { name: `Apt ${wohnungId}`, groesse: 50 },
    });

    // Helper to create meter
    const createMeter = (id: string, type: 'kaltwasser' | 'warmwasser' | 'gas', wohnungId: string): WasserZaehler => ({
        id, custom_id: `M-${id}`, wohnung_id: wohnungId, zaehler_typ: type,
        erstellungsdatum: '2024-01-01', eichungsdatum: null, user_id: 'user-1', einheit: 'm³', ist_aktiv: true,
    });

    // Helper to create reading
    const createReading = (meterId: string, val: number, date = periodEnd, prevVal = 0): WasserAblesung => ({
        id: `R-${meterId}`, zaehler_id: meterId, ablese_datum: date,
        zaehlerstand: prevVal + val, verbrauch: val, user_id: 'user-1',
    });

    describe('Scenario 1: The "Discrepancy" Case (Mixed Meter Types)', () => {
        it('should correctly allocate costs when tenants have drastically different usage habits', () => {
            // Setup: 
            // Tenant A uses mostly Gas (heating) but little Water.
            // Tenant B uses little Gas but lots of Water.
            // Old Bug: Blended price would overcharge Tenant B for gas (expensive) and undercharge Tenant A.

            const tenantA = createTenant('t-A', 'Tenant A', 'apt-1');
            const tenantB = createTenant('t-B', 'Tenant B', 'apt-2');

            const meters = [
                createMeter('m-gas-A', 'gas', 'apt-1'),
                createMeter('m-water-A', 'kaltwasser', 'apt-1'),
                createMeter('m-gas-B', 'gas', 'apt-2'),
                createMeter('m-water-B', 'kaltwasser', 'apt-2'),
            ];

            // Usage
            // Gas Price: High (~3.00/m³)
            // Water Price: Low (~2.00/m³)
            const readings = [
                createReading('m-gas-A', 30),   // High Gas
                createReading('m-water-A', 10), // Low Water
                createReading('m-gas-B', 5),    // Low Gas
                createReading('m-water-B', 100),// High Water
            ];

            // Costs
            // Gas Total: 35 m³ * €3.00 = €105.00
            // Water Total: 110 m³ * €2.00 = €220.00
            const zaehlerkosten = { gas: 105, kaltwasser: 220 };
            const zaehlerverbrauch = { gas: 35, kaltwasser: 110 };

            const result = calculateTenantMeterCosts(
                [tenantA, tenantB], meters, readings, zaehlerkosten, zaehlerverbrauch, periodStart, periodEnd
            );

            const resA = result.find(r => r.tenantId === 't-A')!;
            const resB = result.find(r => r.tenantId === 't-B')!;

            // Expected Calculations
            // Tenant A: (30 * 3.00) + (10 * 2.00) = 90 + 20 = 110.00
            // Tenant B: (5 * 3.00) + (100 * 2.00) = 15 + 200 = 215.00

            expect(resA.costShare).toBeCloseTo(110.00, 2);
            expect(resB.costShare).toBeCloseTo(215.00, 2);

            // Verify Total is correct
            expect(resA.costShare + resB.costShare).toBeCloseTo(105 + 220, 2);

            // Verify Breakdown
            expect(resA.costByType['gas']).toBeCloseTo(90.00, 2);
            expect(resA.costByType['kaltwasser']).toBeCloseTo(20.00, 2);
        });
    });

    describe('Scenario 2: Moving Out + Mixed Meters + Interpolation', () => {
        it('should handle a tenant moving out mid-year with partial readings', () => {
            // Scenario:
            // Tenant A moves out June 30th (exactly half year).
            // Tenant B moves in July 1st.
            // Readings are only taken at end of year (Dec 31).
            // System must interpolate consumption based on occupancy days.

            const moveOutDate = '2025-06-30'; // Approx 181 days
            const moveInDate = '2025-07-01';

            const tenantA = createTenant('t-A', 'Mover Out', 'apt-1', periodStart, moveOutDate);
            const tenantB = createTenant('t-B', 'Mover In', 'apt-1', moveInDate, periodEnd);

            const meters = [
                createMeter('m-gas', 'gas', 'apt-1'),
                createMeter('m-water', 'kaltwasser', 'apt-1'),
            ];

            // End of year readings shows usage calculated for the WHOLE year
            const readings = [
                createReading('m-gas', 1000, periodEnd), // 1000 total
                createReading('m-water', 200, periodEnd), // 200 total
            ];

            const zaehlerkosten = { gas: 1000, kaltwasser: 400 };
            const zaehlerverbrauch = { gas: 1000, kaltwasser: 200 };

            const result = calculateTenantMeterCosts(
                [tenantA, tenantB], meters, readings, zaehlerkosten, zaehlerverbrauch, periodStart, periodEnd
            );

            const resA = result.find(t => t.tenantId === 't-A')!;
            const resB = result.find(t => t.tenantId === 't-B')!;

            // Occupancy: Each roughly 50%
            // Expected Gas: 1000 * 0.5 = 500

            expect(resA.consumptionByType['gas']).toBeLessThan(510);
            expect(resA.consumptionByType['gas']).toBeGreaterThan(490);

            expect(resB.consumptionByType['gas']).toBeLessThan(510);
            expect(resB.consumptionByType['gas']).toBeGreaterThan(490);

            expect(resA.consumptionByType['kaltwasser']).toBeLessThan(105);
            expect(resA.consumptionByType['kaltwasser']).toBeGreaterThan(95);

            // Cost should follow suit
            expect(resA.costByType['gas']).toBeCloseTo(resA.consumptionByType['gas'] * 1.0, 2);
            expect(resA.costByType['kaltwasser']).toBeCloseTo(resA.consumptionByType['kaltwasser'] * 2.0, 2);
        });
    });

    describe('Scenario 3: Zero Usage of One Type', () => {
        it('should correctly handle a tenant utilizing only one of the available meter types', () => {
            // Building has Gas and Water.
            // Tenant C only uses Water (Gas meter shows 0 consumption).

            const tenantC = createTenant('t-C', 'Water Only', 'apt-3');
            const meters = [
                createMeter('m-gas-C', 'gas', 'apt-3'),
                createMeter('m-water-C', 'kaltwasser', 'apt-3'),
            ];

            const readings = [
                createReading('m-gas-C', 0),    // 0 Gas
                createReading('m-water-C', 50), // 50 Water
            ];

            const zaehlerkosten = { gas: 500, kaltwasser: 100 };
            const zaehlerverbrauch = { gas: 1000, kaltwasser: 100 }; // Other tenants used gas

            const result = calculateTenantMeterCosts(
                [tenantC], meters, readings, zaehlerkosten, zaehlerverbrauch, periodStart, periodEnd
            );

            const resC = result[0];

            expect(resC.consumptionByType['gas'] || 0).toBe(0);
            expect(resC.costByType['gas'] || 0).toBe(0);

            expect(resC.consumptionByType['kaltwasser']).toBe(50);
            expect(resC.costByType['kaltwasser']).toBe(50); // 50 * (100/100) = 50

            expect(resC.costShare).toBe(50);
        });
    });

    describe('Scenario 4: High Price Disparity', () => {
        it('should maintain precision with extremely different unit prices', () => {
            // Type A: Cheap (0.01 €/unit) - e.g. some industrial water
            // Type B: Expensive (100.00 €/unit) - e.g. specialized gas

            const tenant = createTenant('t-X', 'X', 'apt-X');
            const meters = [
                createMeter('m-cheap', 'kaltwasser', 'apt-X'),
                createMeter('m-expensive', 'gas', 'apt-X'),
            ];

            const readings = [
                createReading('m-cheap', 10000), // huge volume
                createReading('m-expensive', 1), // tiny volume
            ];

            const zaehlerkosten = { kaltwasser: 100, gas: 100 };
            const zaehlerverbrauch = { kaltwasser: 10000, gas: 1 };

            // Prices:
            // Kaltwasser: 100 / 10000 = 0.01
            // Gas: 100 / 1 = 100.00

            const result = calculateTenantMeterCosts(
                [tenant], meters, readings, zaehlerkosten, zaehlerverbrauch, periodStart, periodEnd
            );

            const res = result[0];

            expect(res.pricePerUnitByType['kaltwasser']).toBeCloseTo(0.01, 5);
            expect(res.pricePerUnitByType['gas']).toBeCloseTo(100.00, 5);

            expect(res.costByType['kaltwasser']).toBeCloseTo(100.00, 2);
            expect(res.costByType['gas']).toBeCloseTo(100.00, 2);

            expect(res.costShare).toBeCloseTo(200.00, 2);
        });
    });
});
