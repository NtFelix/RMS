/**
 * Comprehensive tests for Zaehler (Meter) calculations
 * 
 * These tests verify:
 * 1. sumZaehlerValues - sums specific meter types (water only by default)
 * 2. sumAllZaehlerValues - sums ALL meter types
 * 3. Water cost distribution calculations
 * 4. Grouping by zaehler_typ (kaltwasser, warmwasser, gas, etc.)
 */

import { sumZaehlerValues, sumAllZaehlerValues, convertZaehlerkostenToStrings } from '@/lib/zaehler-utils';
import { WATER_METER_TYPES, ZAEHLER_CONFIG, ZaehlerTyp } from '@/lib/zaehler-types';

describe('zaehler-utils', () => {
    describe('sumZaehlerValues', () => {
        describe('with default WATER_METER_TYPES filter', () => {
            it('returns 0 for null input', () => {
                expect(sumZaehlerValues(null)).toBe(0);
            });

            it('returns 0 for undefined input', () => {
                expect(sumZaehlerValues(undefined)).toBe(0);
            });

            it('returns 0 for empty object', () => {
                expect(sumZaehlerValues({})).toBe(0);
            });

            it('sums only kaltwasser and warmwasser by default', () => {
                const values = {
                    kaltwasser: 100,
                    warmwasser: 50,
                    gas: 200,
                    strom: 300,
                };
                // Default only sums kaltwasser + warmwasser
                expect(sumZaehlerValues(values)).toBe(150);
            });

            it('handles missing water types gracefully', () => {
                const values = {
                    gas: 200,
                    strom: 300,
                };
                expect(sumZaehlerValues(values)).toBe(0);
            });

            it('handles partial water types', () => {
                const values = {
                    kaltwasser: 75,
                    gas: 200,
                };
                expect(sumZaehlerValues(values)).toBe(75);
            });

            it('handles decimal values correctly', () => {
                const values = {
                    kaltwasser: 10.5,
                    warmwasser: 20.75,
                };
                expect(sumZaehlerValues(values)).toBeCloseTo(31.25, 2);
            });

            it('handles zero values', () => {
                const values = {
                    kaltwasser: 0,
                    warmwasser: 0,
                };
                expect(sumZaehlerValues(values)).toBe(0);
            });
        });

        describe('with custom meter types filter', () => {
            it('sums only specified types', () => {
                const values = {
                    kaltwasser: 100,
                    warmwasser: 50,
                    gas: 200,
                    strom: 300,
                };

                // Sum only gas
                expect(sumZaehlerValues(values, ['gas'])).toBe(200);

                // Sum gas and strom
                expect(sumZaehlerValues(values, ['gas', 'strom'])).toBe(500);

                // Sum all types
                expect(sumZaehlerValues(values, ['kaltwasser', 'warmwasser', 'gas', 'strom'])).toBe(650);
            });

            it('handles non-existent types in filter', () => {
                const values = {
                    kaltwasser: 100,
                };
                expect(sumZaehlerValues(values, ['nonexistent'])).toBe(0);
            });

            it('handles empty types array', () => {
                const values = {
                    kaltwasser: 100,
                    warmwasser: 50,
                };
                expect(sumZaehlerValues(values, [])).toBe(0);
            });
        });
    });

    describe('sumAllZaehlerValues', () => {
        it('returns 0 for null input', () => {
            expect(sumAllZaehlerValues(null)).toBe(0);
        });

        it('returns 0 for undefined input', () => {
            expect(sumAllZaehlerValues(undefined)).toBe(0);
        });

        it('returns 0 for empty object', () => {
            expect(sumAllZaehlerValues({})).toBe(0);
        });

        it('sums ALL meter types', () => {
            const values = {
                kaltwasser: 100,
                warmwasser: 50,
                gas: 200,
                strom: 300,
                waermemenge: 150,
                heizkostenverteiler: 75,
            };
            expect(sumAllZaehlerValues(values)).toBe(875);
        });

        it('handles single value', () => {
            const values = {
                gas: 500,
            };
            expect(sumAllZaehlerValues(values)).toBe(500);
        });

        it('handles decimal values', () => {
            const values = {
                kaltwasser: 10.33,
                warmwasser: 20.67,
                gas: 5.5,
            };
            expect(sumAllZaehlerValues(values)).toBeCloseTo(36.5, 2);
        });
    });

    describe('convertZaehlerkostenToStrings', () => {
        it('converts numbers to strings', () => {
            const values = {
                kaltwasser: 100,
                warmwasser: 50.5,
            };
            const result = convertZaehlerkostenToStrings(values);
            expect(result.kaltwasser).toBe('100');
            expect(result.warmwasser).toBe('50.5');
        });

        it('handles empty object', () => {
            const result = convertZaehlerkostenToStrings({});
            expect(result).toEqual({});
        });

        it('preserves all keys', () => {
            const values = {
                kaltwasser: 100,
                warmwasser: 50,
                gas: 200,
            };
            const result = convertZaehlerkostenToStrings(values);
            expect(Object.keys(result)).toEqual(['kaltwasser', 'warmwasser', 'gas']);
        });
    });
});

describe('WATER_METER_TYPES constant', () => {
    it('includes only kaltwasser and warmwasser', () => {
        expect(WATER_METER_TYPES).toEqual(['kaltwasser', 'warmwasser']);
    });

    it('does NOT include gas, strom, or heat meters', () => {
        expect(WATER_METER_TYPES).not.toContain('gas');
        expect(WATER_METER_TYPES).not.toContain('strom');
        expect(WATER_METER_TYPES).not.toContain('waermemenge');
        expect(WATER_METER_TYPES).not.toContain('heizkostenverteiler');
    });
});

describe('ZAEHLER_CONFIG', () => {
    const allMeterTypes: ZaehlerTyp[] = Object.keys(ZAEHLER_CONFIG) as ZaehlerTyp[];

    it('has configuration for all meter types', () => {
        allMeterTypes.forEach(typ => {
            expect(ZAEHLER_CONFIG[typ]).toBeDefined();
            expect(ZAEHLER_CONFIG[typ].label).toBeTruthy();
            expect(ZAEHLER_CONFIG[typ].einheit).toBeTruthy();
        });
    });

    it('water meters use m³ as unit', () => {
        expect(ZAEHLER_CONFIG.kaltwasser.einheit).toBe('m³');
        expect(ZAEHLER_CONFIG.warmwasser.einheit).toBe('m³');
    });

    it('gas uses m³ as unit', () => {
        expect(ZAEHLER_CONFIG.gas.einheit).toBe('m³');
    });

    it('electricity uses kWh as unit', () => {
        expect(ZAEHLER_CONFIG.strom.einheit).toBe('kWh');
    });
});

describe('Meter value grouping scenarios', () => {
    /**
     * Scenario: House with 1 apartment, 3 meters (kaltwasser, warmwasser, gas)
     * This simulates the user's described scenario
     */
    describe('Single apartment with 3 meters', () => {
        const zaehlerverbrauch = {
            kaltwasser: 45.5,  // m³
            warmwasser: 22.3,  // m³
            gas: 150.0,        // m³
        };

        const zaehlerkosten = {
            kaltwasser: 180.00,  // EUR
            warmwasser: 120.50,  // EUR
            gas: 225.00,         // EUR
        };

        it('calculates total water consumption correctly', () => {
            const waterConsumption = sumZaehlerValues(zaehlerverbrauch);
            expect(waterConsumption).toBeCloseTo(67.8, 1); // 45.5 + 22.3
        });

        it('calculates total water cost correctly', () => {
            const waterCost = sumZaehlerValues(zaehlerkosten);
            expect(waterCost).toBeCloseTo(300.5, 1); // 180 + 120.5
        });

        it('calculates ALL consumption correctly', () => {
            const totalConsumption = sumAllZaehlerValues(zaehlerverbrauch);
            expect(totalConsumption).toBeCloseTo(217.8, 1); // 45.5 + 22.3 + 150
        });

        it('calculates ALL costs correctly', () => {
            const totalCost = sumAllZaehlerValues(zaehlerkosten);
            expect(totalCost).toBeCloseTo(525.5, 1); // 180 + 120.5 + 225
        });

        it('gas is NOT included in water calculations', () => {
            const waterOnly = sumZaehlerValues(zaehlerverbrauch);
            const waterPlusGas = sumZaehlerValues(zaehlerverbrauch, ['kaltwasser', 'warmwasser', 'gas']);
            expect(waterPlusGas - waterOnly).toBeCloseTo(150, 1); // Gas difference
        });
    });

    /**
     * Scenario: Multiple meter readings in a period
     * The database trigger sums readings by type, not by individual meter
     */
    describe('Multiple readings per meter type', () => {
        // Simulate what the database trigger would produce after summing
        const triggerResult = {
            // Sum of all kaltwasser readings in period
            kaltwasser: 10 + 12 + 15,  // 37 m³
            warmwasser: 5 + 6 + 7,     // 18 m³
            gas: 50 + 60 + 70,         // 180 m³
        };

        it('trigger result should match expected sums', () => {
            expect(triggerResult.kaltwasser).toBe(37);
            expect(triggerResult.warmwasser).toBe(18);
            expect(triggerResult.gas).toBe(180);
        });

        it('water sum calculation is correct', () => {
            expect(sumZaehlerValues(triggerResult)).toBe(55); // 37 + 18
        });

        it('total sum calculation is correct', () => {
            expect(sumAllZaehlerValues(triggerResult)).toBe(235); // 37 + 18 + 180
        });
    });
});

describe('Edge cases for meter calculations', () => {
    it('handles negative values by ignoring them', () => {
        const values = {
            kaltwasser: -10,
            warmwasser: 20,
        };
        expect(sumZaehlerValues(values)).toBe(20);
        expect(sumAllZaehlerValues(values)).toBe(20);
    });

    it('handles very large values', () => {
        const values = {
            kaltwasser: 999999.99,
            warmwasser: 888888.88,
        };
        expect(sumZaehlerValues(values)).toBeCloseTo(1888888.87, 2);
    });

    it('handles very small decimal values', () => {
        const values = {
            kaltwasser: 0.001,
            warmwasser: 0.002,
        };
        expect(sumZaehlerValues(values)).toBeCloseTo(0.003, 3);
    });
});
