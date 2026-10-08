
import { getLatestNebenkostenAmount, getNebenkostenAmountAt, calculateMissedPayments, upsertNebenkostenScheduleEntry } from '@/utils/tenant-payment-calculations';
import { PAYMENT_KEYWORDS } from "@/utils/constants"

// Mock constants if needed, but they are imported directly.
// We can mock the module just to be safe or rely on real constants.
jest.mock('@/utils/constants', () => ({
    PAYMENT_KEYWORDS: {
        RENT: 'miete',
        NEBENKOSTEN: 'nebenkosten'
    }
}));

describe('Tenant Payment Calculations', () => {
    describe('getLatestNebenkostenAmount', () => {
        it('should return 0 for empty or invalid input', () => {
            expect(getLatestNebenkostenAmount(null)).toBe(0);
            expect(getLatestNebenkostenAmount([])).toBe(0);
        });

        it('should return the amount of the latest entry', () => {
            const entries = [
                { amount: 100, date: '2023-01-01' },
                { amount: 200, date: '2023-02-01' }, // Latest
                { amount: 150, date: '2023-01-15' }
            ];
            expect(getLatestNebenkostenAmount(entries)).toBe(200);
        });

        it('should handle entries without date (treat as oldest/unsorted)', () => {
            const entries = [
                { amount: 100 },
                { amount: 200, date: '2023-01-01' }
            ];
            expect(getLatestNebenkostenAmount(entries)).toBe(200);
        });

        it('should parse string amounts', () => {
            const entries = [
                { amount: "150", date: '2023-01-01' }
            ];
            expect(getLatestNebenkostenAmount(entries)).toBe(150);
        });

        it('ignores an announced increase that does not apply yet', () => {
            const entries = [
                { amount: 80, date: '2000-01-01' },
                { amount: 95, date: '2999-01-01' }
            ];
            expect(getLatestNebenkostenAmount(entries)).toBe(80);
        });
    });

    describe('getNebenkostenAmountAt', () => {
        const entries = [
            { amount: 80, date: '2025-01-01' },
            { amount: 95, date: '2026-01-01' }
        ];

        it('returns the entry that applies on the date', () => {
            expect(getNebenkostenAmountAt(entries, '2025-12-31')).toBe(80);
            expect(getNebenkostenAmountAt(entries, '2026-01-01')).toBe(95);
            expect(getNebenkostenAmountAt(entries, '2027-06-30')).toBe(95);
        });

        it('falls back to the earliest upcoming entry before the first one applies', () => {
            expect(getNebenkostenAmountAt(entries, '2024-06-30')).toBe(80);
        });

        it('compares German and timestamped dates by day', () => {
            expect(getNebenkostenAmountAt([{ amount: 70, date: '1.1.2025' }, { amount: 90, date: '2026-01-01T00:00:00Z' }], '2025-12-31')).toBe(70);
        });
    });

    describe('calculateMissedPayments', () => {
        const mockTenant = {
            name: 'Max Mustermann',
            wohnung_id: 'w1',
            einzug: '2023-01-01',
            Wohnungen: { id: 'w1', miete: 1000 },
            nebenkosten: [{ amount: 200, date: '2023-01-01' }]
        };

        const currentDate = new Date('2023-03-15');

        beforeEach(() => {
            // Freeze time for each test
            jest.useFakeTimers();
            jest.setSystemTime(currentDate);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should calculate missed payments correctly when no payments exist', () => {
            // Jan, Feb, Mar (current month included)
            // 3 months rent + 3 months nk
            // Rent: 1000 * 3 = 3000
            // NK: 200 * 3 = 600
            // Total: 3600

            const result = calculateMissedPayments(mockTenant, [], true);
            expect(result.rentMonths).toBe(3);
            expect(result.nebenkostenMonths).toBe(3);
            expect(result.totalAmount).toBe(3600);
            expect(result.details).toHaveLength(6); // 3 rent + 3 nk
        });

        it('should return 0 missed payments if fully paid', () => {
            const finances = [
                // Jan
                { wohnung_id: 'w1', betrag: 1000, name: 'Miete Jan', datum: '2023-01-05', notiz: 'Miete von Max Mustermann' },
                { wohnung_id: 'w1', betrag: 200, name: 'Nebenkosten Jan', datum: '2023-01-05', notiz: 'Nebenkosten-Vorauszahlung von Max Mustermann' },
                // Feb
                { wohnung_id: 'w1', betrag: 1000, name: 'Miete Feb', datum: '2023-02-01', notiz: 'Miete von Max Mustermann' },
                { wohnung_id: 'w1', betrag: 200, name: 'Nebenkosten Feb', datum: '2023-02-01', notiz: 'Nebenkosten-Vorauszahlung von Max Mustermann' },
                // Mar
                { wohnung_id: 'w1', betrag: 1000, name: 'Miete Mar', datum: '2023-03-01', notiz: 'Miete von Max Mustermann' },
                { wohnung_id: 'w1', betrag: 200, name: 'Nebenkosten Mar', datum: '2023-03-01', notiz: 'Nebenkosten-Vorauszahlung von Max Mustermann' },
            ];

            const result = calculateMissedPayments(mockTenant, finances);
            expect(result.totalAmount).toBe(0);
            expect(result.rentMonths).toBe(0);
        });

        it('should handle partial payments', () => {
            const finances = [
                // Jan partial rent
                { wohnung_id: 'w1', betrag: 500, name: 'Miete Jan', datum: '2023-01-05', notiz: 'Miete von Max Mustermann' },
                // Feb full
                { wohnung_id: 'w1', betrag: 1000, name: 'Miete Feb', datum: '2023-02-01', notiz: 'Miete von Max Mustermann' },
            ];

            // Jan: missed 500 rent, 200 nk
            // Feb: missed 200 nk
            // Mar: missed 1000 rent, 200 nk

            // Total missed rent: 500 (Jan) + 1000 (Mar) = 1500
            // Total missed nk: 200 * 3 = 600
            // Total amount: 2100

            const result = calculateMissedPayments(mockTenant, finances);
            // Jan partial counts as missed, plus Mar is fully missed
            expect(result.rentMonths).toBe(2); // Jan and Mar
            expect(result.nebenkostenMonths).toBe(3); // Jan, Feb, Mar
            expect(result.totalAmount).toBe(2100);
        });

        it('should handle pro-rated first month', () => {
            const tenant = {
                ...mockTenant,
                einzug: '2023-01-15' // Moved in mid-Jan
            };
            // Jan has 31 days. Moved in 15th. Occupied: 31 - 15 + 1 = 17 days.
            // Factor: 17 / 31 = 0.548...
            // Rent: 1000 * (17/31) = 548.39
            // NK: 200 * (17/31) = 109.68

            // Feb, Mar: Full amount (1000 + 200) * 2 = 2400

            // Total expected: 548.39 + 109.68 + 2400 = 3058.07

            const result = calculateMissedPayments(tenant, [], true);
            expect(result.totalAmount).toBeCloseTo(3058.07, 2);
        });

        it('should filter finances correctly by notiz', () => {
            const finances = [
                // Wrong name
                { wohnung_id: 'w1', betrag: 1000, name: 'Miete Jan', datum: '2023-01-05', notiz: 'Miete von Other Person' },
            ];

            const result = calculateMissedPayments(mockTenant, finances);
            // Should treat as not paid because name didn't match
            expect(result.rentMonths).toBe(3);
        });

        it('should handle missing move-in date', () => {
            const tenant = { ...mockTenant, einzug: null };
            const result = calculateMissedPayments(tenant, []);
            expect(result.totalAmount).toBe(0);
        });
    });
});

describe('upsertNebenkostenScheduleEntry', () => {
    it('appends a new dated entry', () => {
        expect(upsertNebenkostenScheduleEntry([{ id: 'a', amount: '80', date: '2025-01-01' }], { amount: 95, date: '2026-01-01' }, 'new'))
            .toEqual([{ id: 'a', amount: '80', date: '2025-01-01' }, { id: 'new', amount: '95', date: '2026-01-01' }])
    })

    it('replaces the amount of an entry with the same day', () => {
        expect(upsertNebenkostenScheduleEntry([{ id: 'a', amount: 80, date: '2026-01-01T00:00:00Z' }], { amount: 95, date: '2026-01-01' }, 'new'))
            .toEqual([{ id: 'a', amount: '95', date: '2026-01-01T00:00:00Z' }])
    })

    it('starts a schedule for a tenant without one', () => {
        expect(upsertNebenkostenScheduleEntry(null, { amount: 60, date: '2026-01-01' }, 'new'))
            .toEqual([{ id: 'new', amount: '60', date: '2026-01-01' }])
    })
})
