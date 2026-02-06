/**
 * Tests for meter calculation utilities
 */

import {
    sumZaehlerValues,
    sumAllZaehlerValues,
    convertZaehlerkostenToStrings
} from "@/lib/zaehler-utils";
import { WATER_METER_TYPES, ZAEHLER_CONFIG } from "@/lib/zaehler-types";

describe("zaehler-calculations", () => {
    describe("sumZaehlerValues (water-only filtering by default)", () => {
        it("1. should return 0 if values is null", () => {
            expect(sumZaehlerValues(null)).toBe(0);
        });

        it("2. should return 0 if values is undefined", () => {
            expect(sumZaehlerValues(undefined)).toBe(0);
        });

        it("3. should return 0 for an empty object", () => {
            expect(sumZaehlerValues({})).toBe(0);
        });

        it("4. should sum only water meter types by default", () => {
            const values = {
                kaltwasser: 100,
                warmwasser: 50,
                strom: 200,
                gas: 300,
            };
            // Only kaltwasser (100) + warmwasser (50) = 150
            expect(sumZaehlerValues(values)).toBe(150);
        });

        it("5. should handle missing water meter types", () => {
            const values = {
                kaltwasser: 100,
                strom: 200,
            };
            expect(sumZaehlerValues(values)).toBe(100);
        });

        it("6. should return 0 if no water meter types are present", () => {
            const values = {
                strom: 200,
                gas: 300,
            };
            expect(sumZaehlerValues(values)).toBe(0);
        });

        it("7. should sum custom types if provided", () => {
            const values = {
                kaltwasser: 100,
                strom: 200,
                gas: 300,
            };
            const types = ["strom", "gas"];
            expect(sumZaehlerValues(values, types)).toBe(500);
        });

        it("8. should handle decimal values correctly", () => {
            const values = {
                kaltwasser: 10.5,
                warmwasser: 5.25,
            };
            expect(sumZaehlerValues(values)).toBeCloseTo(15.75);
        });

        it("9. should handle negative values (though rare in reality)", () => {
            const values = {
                kaltwasser: 100,
                warmwasser: -20,
            };
            expect(sumZaehlerValues(values)).toBe(80);
        });

        it("10. should handle very large values", () => {
            const values = {
                kaltwasser: 1000000,
                warmwasser: 500000,
            };
            expect(sumZaehlerValues(values)).toBe(1500000);
        });

        it("11. should handle null or undefined values within the record", () => {
            const values = {
                kaltwasser: 100,
                warmwasser: undefined as unknown as number,
            };
            expect(sumZaehlerValues(values)).toBe(100);
        });
    });

    describe("sumAllZaehlerValues (all meter types)", () => {
        it("12. should return 0 if values is null", () => {
            expect(sumAllZaehlerValues(null)).toBe(0);
        });

        it("13. should return 0 if values is undefined", () => {
            expect(sumAllZaehlerValues(undefined)).toBe(0);
        });

        it("14. should sum all numeric values in the object", () => {
            const values = {
                kaltwasser: 10,
                warmwasser: 20,
                strom: 30,
                gas: 40,
            };
            expect(sumAllZaehlerValues(values)).toBe(100);
        });

        it("15. should handle empty object", () => {
            expect(sumAllZaehlerValues({})).toBe(0);
        });

        it("16. should handle decimal values", () => {
            const values = {
                kaltwasser: 1.1,
                warmwasser: 2.2,
            };
            expect(sumAllZaehlerValues(values)).toBeCloseTo(3.3);
        });

        it("17. should handle negative values", () => {
            const values = {
                kaltwasser: 10,
                warmwasser: -5,
            };
            expect(sumAllZaehlerValues(values)).toBe(5);
        });

        it("18. should handle mixed types and values", () => {
            const values = {
                waermemenge: 500.5,
                heizkostenverteiler: 120,
            };
            expect(sumAllZaehlerValues(values)).toBe(620.5);
        });

        it("19. should handle single value", () => {
            expect(sumAllZaehlerValues({ strom: 42 })).toBe(42);
        });

        it("20. should handle zero values", () => {
            expect(sumAllZaehlerValues({ kaltwasser: 0, warmwasser: 0 })).toBe(0);
        });

        it("21. should handle many small decimals", () => {
            const values = {
                v1: 0.1,
                v2: 0.2,
                v3: 0.3,
            };
            expect(sumAllZaehlerValues(values)).toBeCloseTo(0.6);
        });
    });

    describe("convertZaehlerkostenToStrings", () => {
        it("22. should convert numeric values to strings", () => {
            const kosten = {
                kaltwasser: 100,
                warmwasser: 50.5,
            };
            const result = convertZaehlerkostenToStrings(kosten);
            expect(result).toEqual({
                kaltwasser: "100",
                warmwasser: "50.5",
            });
        });

        it("23. should handle empty object", () => {
            expect(convertZaehlerkostenToStrings({})).toEqual({});
        });

        it("24. should handle zero value", () => {
            expect(convertZaehlerkostenToStrings({ strom: 0 })).toEqual({
                strom: "0",
            });
        });

        it("25. should handle negative value", () => {
            expect(convertZaehlerkostenToStrings({ gas: -10 })).toEqual({
                gas: "-10",
            });
        });

        it("26. should handle large integers", () => {
            expect(convertZaehlerkostenToStrings({ waermemenge: 123456789 })).toEqual({
                waermemenge: "123456789",
            });
        });
    });

    describe("Constants and Configuration", () => {
        it("27. WATER_METER_TYPES should contain exactly kaltwasser and warmwasser", () => {
            expect(WATER_METER_TYPES).toContain("kaltwasser");
            expect(WATER_METER_TYPES).toContain("warmwasser");
            expect(WATER_METER_TYPES.length).toBe(2);
        });

        it("28. ZAEHLER_CONFIG should have entries for all ZaehlerTyp values", () => {
            const types = [
                'kaltwasser',
                'warmwasser',
                'waermemenge',
                'heizkostenverteiler',
                'strom',
                'gas'
            ];
            types.forEach(typ => {
                expect(ZAEHLER_CONFIG).toHaveProperty(typ);
                expect(ZAEHLER_CONFIG[typ as keyof typeof ZAEHLER_CONFIG]).toHaveProperty('label');
                expect(ZAEHLER_CONFIG[typ as keyof typeof ZAEHLER_CONFIG]).toHaveProperty('einheit');
            });
        });
    });

    describe("Real-world Scenarios", () => {
        it("29. Scenario: 1 house, 1 apt, 3 meters (mixed types)", () => {
            const values = {
                kaltwasser: 120.4,
                warmwasser: 45.2,
                strom: 3500,
            };
            const waterSum = sumZaehlerValues(values);
            const allSum = sumAllZaehlerValues(values);

            expect(waterSum).toBeCloseTo(165.6);
            expect(allSum).toBeCloseTo(3665.6);
        });

        it("30. Scenario: Multi-apt building with shared water cost", () => {
            const buildingValues = {
                kaltwasser: 1000,
                warmwasser: 500,
                waermemenge: 2000,
            };
            expect(sumZaehlerValues(buildingValues)).toBe(1500);
        });

        it("31. Scenario: Apartment with multiple cold water meters", () => {
            // sumZaehlerValues doesn't support multiple same-type keys (JS objects don't)
            // but the Record<string, number> usually represents sums per type
            const values = {
                kaltwasser: 150, // sum of all KW meters
                warmwasser: 75,
            };
            expect(sumZaehlerValues(values)).toBe(225);
        });

        it("32. Scenario: Zero consumption for a period", () => {
            const values = {
                kaltwasser: 0,
                warmwasser: 0,
                strom: 0,
            };
            expect(sumZaehlerValues(values)).toBe(0);
            expect(sumAllZaehlerValues(values)).toBe(0);
        });

        it("33. Scenario: Only non-water meters present", () => {
            const values = {
                strom: 450,
                gas: 200,
            };
            expect(sumZaehlerValues(values)).toBe(0);
            expect(sumAllZaehlerValues(values)).toBe(650);
        });

        it("34. Scenario: Missing property in values object", () => {
            const values = {
                kaltwasser: 100,
            };
            expect(values.hasOwnProperty('warmwasser')).toBe(false);
            expect(sumZaehlerValues(values)).toBe(100);
        });

        it("35. Scenario: High precision decimals", () => {
            const values = {
                kaltwasser: 100.0001,
                warmwasser: 50.0002,
            };
            expect(sumZaehlerValues(values)).toBeCloseTo(150.0003, 4);
        });

        it("36. Scenario: Extreme values comparison", () => {
            const values = {
                kaltwasser: Number.MAX_SAFE_INTEGER,
                warmwasser: 1,
            };
            // Result is actually MAX_SAFE_INTEGER + 1 which is not safe, 
            // but for this range it usually works for simple additions
            expect(sumZaehlerValues(values)).toBe(Number.MAX_SAFE_INTEGER + 1);
        });

        it("37. Scenario: Record with extra metadata keys (ignored by sumZaehlerValues)", () => {
            const values = {
                kaltwasser: 100,
                warmwasser: 50,
                comment: "Estimated values" as any,
                lastUpdate: "2024-01-01" as any,
            };
            // sumZaehlerValues only looks at types provided in WATER_METER_TYPES
            expect(sumZaehlerValues(values)).toBe(150);
            // sumAllZaehlerValues might fail if types are not numbers, 
            // but the implementation uses reduce((sum, v) => sum + v, 0).
            // JS handles string addition by concatenation.
            // Let's see if we should test robustness.
            // In lib/zaehler-utils.ts: return Object.values(values).reduce((sum, v) => sum + v, 0);
            // If v is a string, it will concatenate.
            // However, the type is Record<string, number>.
        });
    });
});
