import {
  processRpcFinancialSummary,
  calculateFinancialSummary,
  fetchAvailableFinanceYears,
  MonthlyData,
  FinancialSummary,
  FinanceTransaction,
} from './financeCalculations';

describe('Finance Calculations', () => {
  describe('calculateFinancialSummary', () => {
    it('calculates summary correctly for empty transactions', () => {
      const result = calculateFinancialSummary([], 2024);
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.totalCashflow).toBe(0);
    });

    it('calculates summary correctly for mixed transactions', () => {
      const transactions: FinanceTransaction[] = [
        { betrag: 1000, ist_einnahmen: true, datum: '2024-01-15' },
        { betrag: 500, ist_einnahmen: false, datum: '2024-01-20' },
        { betrag: 2000, ist_einnahmen: true, datum: '2024-02-15' },
      ];

      const result = calculateFinancialSummary(transactions, 2024, new Date('2024-12-31'));
      expect(result.totalIncome).toBe(3000);
      expect(result.totalExpenses).toBe(500);
      expect(result.totalCashflow).toBe(2500);
      expect(result.monthlyData[0].income).toBe(1000);
      expect(result.monthlyData[0].expenses).toBe(500);
      expect(result.monthlyData[1].income).toBe(2000);
    });

    it('handles different years correctly (past year)', () => {
      // For a past year, monthsPassed should be 12
      const result = calculateFinancialSummary([], 2023, new Date('2024-01-01'));
      expect(result.monthsPassed).toBe(12);
    });

    it('handles current year correctly', () => {
      // If today is March 1st 2024, and year is 2024, passed months is 3 (Jan, Feb, Mar)
      const mockDate = new Date('2024-03-01');
      const result = calculateFinancialSummary([], 2024, mockDate);
      expect(result.monthsPassed).toBe(3);
    });

    it('calculates averages based on passed months', () => {
      // 2 months passed, total income 2000 -> avg 1000
      const transactions: FinanceTransaction[] = [
        { betrag: 1000, ist_einnahmen: true, datum: '2024-01-15' },
        { betrag: 1000, ist_einnahmen: true, datum: '2024-02-15' },
      ];
      const mockDate = new Date('2024-02-28'); // 2 months passed
      const result = calculateFinancialSummary(transactions, 2024, mockDate);

      expect(result.monthsPassed).toBe(2);
      expect(result.averageMonthlyIncome).toBe(1000);
      expect(result.yearlyProjection).toBe(1000 * 12); // Projected
    });

    it('ignores transactions without datum', () => {
       const transactions: any[] = [
        { betrag: 1000, ist_einnahmen: true, datum: null },
      ];
      const result = calculateFinancialSummary(transactions, 2024);
      expect(result.totalIncome).toBe(0);
    });
  });

  describe('processRpcFinancialSummary', () => {
    it('converts RPC response correctly', () => {
      const mockRpcResponse = {
        total_income: 5000,
        total_expenses: 2000,
        total_cashflow: 3000,
        monthly_data: {
          '0': { income: 1000, expenses: 500, cashflow: 500 }, // Jan
          '1': { income: 4000, expenses: 1500, cashflow: 2500 } // Feb
        }
      };

      const result = processRpcFinancialSummary(mockRpcResponse, 2024);

      expect(result.year).toBe(2024);
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(2000);
      expect(result.monthlyData[0].income).toBe(1000);
      expect(result.monthlyData[1].income).toBe(4000);
      expect(result.monthlyData[2].income).toBe(0); // March empty
    });

    it('handles missing monthly_data safely', () => {
      const result = processRpcFinancialSummary({}, 2024);
      expect(result.monthlyData[0]).toBeDefined();
      expect(result.monthlyData[0].income).toBe(0);
    });
  });

  describe('fetchAvailableFinanceYears', () => {
    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = {
            rpc: jest.fn(),
            from: jest.fn()
        };
    });

    it('uses RPC function if successful', async () => {
        mockSupabase.rpc.mockResolvedValue({
            data: [{ year: 2024 }, { year: 2023 }],
            error: null
        });

        const years = await fetchAvailableFinanceYears(mockSupabase);
        expect(years).toEqual([2024, 2023]);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_available_finance_years');
    });

    it('falls back to pagination if RPC fails', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: 'RPC Error' });

        const mockSelect = jest.fn().mockReturnThis();
        const mockNot = jest.fn().mockReturnThis();
        const mockRange = jest.fn()
            .mockResolvedValueOnce({
                data: [{ datum: '2024-01-01' }, { datum: '2023-05-12' }],
                error: null
            })
            .mockResolvedValueOnce({
                data: [], // End of pagination
                error: null
            });

        mockSupabase.from.mockReturnValue({
            select: mockSelect,
        });
        mockSelect.mockReturnValue({ not: mockNot });
        mockNot.mockReturnValue({ range: mockRange });

        const years = await fetchAvailableFinanceYears(mockSupabase);

        // Should contain current year (mocked by Date) + extracted years
        const currentYear = new Date().getFullYear();
        expect(years).toContain(currentYear);
        expect(years).toContain(2024);
        expect(years).toContain(2023);
    });

    it('handles pagination errors gracefully', async () => {
         mockSupabase.rpc.mockResolvedValue({ data: null, error: 'RPC Error' });

         const mockSelect = jest.fn().mockReturnThis();
         const mockNot = jest.fn().mockReturnThis();
         const mockRange = jest.fn().mockResolvedValue({ data: null, error: 'DB Error' });

         mockSupabase.from.mockReturnValue({ select: mockSelect });
         mockSelect.mockReturnValue({ not: mockNot });
         mockNot.mockReturnValue({ range: mockRange });

         await expect(fetchAvailableFinanceYears(mockSupabase)).rejects.toEqual('DB Error');
    });

    it('handles invalid dates gracefully in fallback', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: 'RPC Error' });

        const mockSelect = jest.fn().mockReturnThis();
        const mockNot = jest.fn().mockReturnThis();
        const mockRange = jest.fn().mockResolvedValue({
            data: [{ datum: 'invalid-date' }],
            error: null
        });

        mockSupabase.from.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ not: mockNot });
        mockNot.mockReturnValue({ range: mockRange });

        // Shouldn't crash
        const years = await fetchAvailableFinanceYears(mockSupabase);
        expect(years).toBeDefined();
    });
  });
});
