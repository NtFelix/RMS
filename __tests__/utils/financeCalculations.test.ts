
import { calculateFinancialSummary, FinanceTransaction } from '@/utils/financeCalculations';

describe('calculateFinancialSummary', () => {
  const year = 2023;

  it('should return a zeroed summary for no transactions', () => {
    const transactions: FinanceTransaction[] = [];
    const summary = calculateFinancialSummary(transactions, year);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.totalCashflow).toBe(0);
  });

  it('should correctly calculate the summary for a single year', () => {
    const transactions: FinanceTransaction[] = [
      { betrag: 100, ist_einnahmen: true, datum: '2023-01-15' },
      { betrag: 50, ist_einnahmen: false, datum: '2023-01-20' },
      { betrag: 200, ist_einnahmen: true, datum: '2023-02-10' },
    ];
    const summary = calculateFinancialSummary(transactions, year);
    expect(summary.totalIncome).toBe(300);
    expect(summary.totalExpenses).toBe(50);
    expect(summary.totalCashflow).toBe(250);
  });

  it('should only include transactions for the specified year', () => {
    const transactions: FinanceTransaction[] = [
      { betrag: 100, ist_einnahmen: true, datum: '2023-01-15' },
      { betrag: 50, ist_einnahmen: false, datum: '2022-12-20' },
      { betrag: 200, ist_einnahmen: true, datum: '2024-02-10' },
    ];
    const summary = calculateFinancialSummary(transactions, year);
    expect(summary.totalIncome).toBe(100);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.totalCashflow).toBe(100);
  });

  it('should handle various dates and calculate monthly data correctly', () => {
    const transactions: FinanceTransaction[] = [
      { betrag: 100, ist_einnahmen: true, datum: '2023-01-01' },
      { betrag: 150, ist_einnahmen: true, datum: '2023-01-31' },
      { betrag: 75, ist_einnahmen: false, datum: '2023-03-15' },
    ];
    const summary = calculateFinancialSummary(transactions, year);
    expect(summary.monthlyData[0].income).toBe(250);
    expect(summary.monthlyData[2].expenses).toBe(75);
    expect(summary.monthlyData[1].income).toBe(0);
  });
});
