import {
  calculateFinancialSummary,
  processRpcFinancialSummary,
  MonthlyData,
  FinanceTransaction,
  FinancialSummary,
} from '../../utils/financeCalculations';

describe('Finance Calculations', () => {
  describe('calculateFinancialSummary', () => {
    it('calculates summary correctly for empty transactions', () => {
      const year = 2024;
      const transactions: FinanceTransaction[] = [];
      const result = calculateFinancialSummary(transactions, year);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.totalCashflow).toBe(0);
      expect(result.year).toBe(year);
    });

    it('aggregates income and expenses correctly', () => {
      const year = 2024;
      const transactions: FinanceTransaction[] = [
        { betrag: 1000, ist_einnahmen: true, datum: '2024-01-15' },
        { betrag: 500, ist_einnahmen: false, datum: '2024-01-20' },
        { betrag: 200, ist_einnahmen: true, datum: '2024-02-10' },
      ];

      // Fix the currentDate to ensure monthsPassed calculation is consistent
      const currentDate = new Date('2024-06-30');
      const result = calculateFinancialSummary(transactions, year, currentDate);

      // Total
      expect(result.totalIncome).toBe(1200);
      expect(result.totalExpenses).toBe(500);
      expect(result.totalCashflow).toBe(700);

      // Monthly breakdown
      expect(result.monthlyData[0].income).toBe(1000); // January (0)
      expect(result.monthlyData[0].expenses).toBe(500);
      expect(result.monthlyData[0].cashflow).toBe(500);

      expect(result.monthlyData[1].income).toBe(200); // February (1)
      expect(result.monthlyData[1].expenses).toBe(0);

      // Averages (6 months passed: Jan-Jun)
      // Income: (1000 + 200) / 6 = 200
      expect(result.averageMonthlyIncome).toBe(1200 / 6);

      // Expenses: 500 / 6
      expect(result.averageMonthlyExpenses).toBe(500 / 6);
    });

    it('calculates averages based on full year for past years', () => {
      const year = 2023;
      const transactions: FinanceTransaction[] = [
        { betrag: 1200, ist_einnahmen: true, datum: '2023-01-01' },
      ];

      const currentDate = new Date('2024-06-30');
      const result = calculateFinancialSummary(transactions, year, currentDate);

      expect(result.monthsPassed).toBe(12);
      expect(result.averageMonthlyIncome).toBe(100); // 1200 / 12
    });

    it('ignores transactions without datum', () => {
       const year = 2024;
       const transactions: any[] = [
           { betrag: 100, ist_einnahmen: true, datum: null }
       ];
       const result = calculateFinancialSummary(transactions, year);
       expect(result.totalIncome).toBe(0);
    });
  });

  describe('processRpcFinancialSummary', () => {
    it('processes RPC response correctly', () => {
      const year = 2024;
      const rpcData = {
        total_income: 12000,
        total_expenses: 6000,
        total_cashflow: 6000,
        monthly_data: {
          '0': { income: 1000, expenses: 500, cashflow: 500 },
          '1': { income: 1000, expenses: 500, cashflow: 500 },
        }
      };

      const result = processRpcFinancialSummary(rpcData, year);

      expect(result.year).toBe(year);
      expect(result.totalIncome).toBe(12000);
      expect(result.totalExpenses).toBe(6000);
      expect(result.monthlyData[0].income).toBe(1000);
      expect(result.monthlyData[0].expenses).toBe(500);
    });

    it('handles missing monthly data gracefully', () => {
      const year = 2024;
      const rpcData = {
        total_income: 0,
        total_expenses: 0,
        total_cashflow: 0,
        monthly_data: null
      };

      const result = processRpcFinancialSummary(rpcData, year);
      expect(result.monthlyData[0]).toBeDefined();
      expect(result.monthlyData[0].income).toBe(0);
    });
  });
});
