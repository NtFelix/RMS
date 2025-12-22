
import { getLatestNebenkostenAmount, calculateMissedPayments } from '@/utils/tenant-payment-calculations';
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

      beforeAll(() => {
          // Freeze time
          jest.useFakeTimers();
          jest.setSystemTime(currentDate);
      });

      afterAll(() => {
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
          expect(result.rentMonths).toBe(2); // Jan (partial counts as missed month count? implementation counts count increment)
          // Implementation: if (rentPaid < expectedRent - 0.01) missedRentMonths++

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
