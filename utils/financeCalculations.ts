import { Finanzen } from "../types/finanzen";

export interface MonthlyData {
  income: number;
  expenses: number;
}

export interface FinancialSummary {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalCashflow: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyCashflow: number;
  yearlyProjection: number;
  monthsPassed: number;
  monthlyData: Record<number, MonthlyData>;
}

export function calculateFinancialSummary(
  transactions: Finanzen[],
  year: number,
  currentDate: Date = new Date()
): FinancialSummary {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Group data by month
  const monthlyData: Record<number, MonthlyData> = {};
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { income: 0, expenses: 0 };
  }
  
  // Process each transaction
  (transactions || []).forEach(item => {
    if (!item.datum) return;
    
    const itemDate = new Date(item.datum);
    const month = itemDate.getMonth();
    
    const amount = Number(item.betrag);
    if (item.ist_einnahmen) {
      monthlyData[month].income += amount;
    } else {
      monthlyData[month].expenses += amount;
    }
  });

  // Calculate summary statistics
  const monthsPassed = year === currentYear ? currentMonth + 1 : 12;
  
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeForPassedMonths = 0;
  let expensesForPassedMonths = 0;

  Object.entries(monthlyData).forEach(([monthKey, data]) => {
    const monthIndex = Number(monthKey);
    totalIncome += data.income;
    totalExpenses += data.expenses;
    
    // Only count months that have passed for average calculation
    if (year < currentYear || (year === currentYear && monthIndex <= currentMonth)) {
      incomeForPassedMonths += data.income;
      expensesForPassedMonths += data.expenses;
    }
  });

  const averageMonthlyIncome = monthsPassed > 0 ? incomeForPassedMonths / monthsPassed : 0;
  const averageMonthlyExpenses = monthsPassed > 0 ? expensesForPassedMonths / monthsPassed : 0;
  const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;
  const yearlyProjection = averageMonthlyCashflow * 12;

  return {
    year,
    totalIncome,
    totalExpenses,
    totalCashflow: totalIncome - totalExpenses,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlyCashflow,
    yearlyProjection,
    monthsPassed,
    monthlyData
  };
}
