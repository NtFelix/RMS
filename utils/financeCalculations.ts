import { Finanzen } from "../types/finanzen";

export interface MonthlyData {
  income: number;
  expenses: number;
  cashflow: number;
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

// Minimal interface for what the calculation function actually needs
export interface FinanceTransaction {
  betrag: number;
  ist_einnahmen: boolean;
  datum: string;
}

/**
 * Processes the aggregated RPC response from get_financial_year_summary into a standardized format
 * @param rpcSummary - Raw response from get_financial_year_summary RPC function
 * @param year - The target year for the summary
 * @returns FinancialSummary - Processed financial summary object
 */
export function processRpcFinancialSummary(rpcSummary: any, year: number): FinancialSummary {
  const summary = rpcSummary;
  
  // Convert the database result to our expected format
  const monthlyData: Record<number, MonthlyData> = {};
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { income: 0, expenses: 0, cashflow: 0 };
  }
  
  // Populate with actual data from the database
  if (summary.monthly_data) {
    Object.entries(summary.monthly_data as Record<string, any>).forEach(([month, data]) => {
      const monthIndex = parseInt(month);
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyData[monthIndex] = {
          income: Number(data.income || 0),
          expenses: Number(data.expenses || 0),
          cashflow: Number(data.cashflow || 0)
        };
      }
    });
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const monthsPassed = year === currentYear ? currentDate.getMonth() + 1 : 12;
  
  // Calculate averages based on passed months
  let incomeForPassedMonths = 0;
  let expensesForPassedMonths = 0;
  
  for (let i = 0; i < (year === currentYear ? currentDate.getMonth() + 1 : 12); i++) {
    incomeForPassedMonths += monthlyData[i].income;
    expensesForPassedMonths += monthlyData[i].expenses;
  }
  
  const averageMonthlyIncome = monthsPassed > 0 ? incomeForPassedMonths / monthsPassed : 0;
  const averageMonthlyExpenses = monthsPassed > 0 ? expensesForPassedMonths / monthsPassed : 0;
  const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;

  return {
    year,
    totalIncome: Number(summary.total_income || 0),
    totalExpenses: Number(summary.total_expenses || 0),
    totalCashflow: Number(summary.total_cashflow || 0),
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlyCashflow,
    yearlyProjection: averageMonthlyCashflow * 12,
    monthsPassed,
    monthlyData
  };
}

/**
 * Fetches all available years from financial transactions with pagination support
 * @param supabase - Supabase client instance
 * @returns Promise<number[]> - Array of years sorted in descending order
 */
export async function fetchAvailableFinanceYears(supabase: any): Promise<number[]> {
  const currentYear = new Date().getFullYear();
  
  // Try to use the optimized database function first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_finance_years');
    
    if (!rpcError && rpcData) {
      return rpcData.map((item: any) => item.year).sort((a: number, b: number) => b - a);
    }
  } catch (error) {
    console.log('fetchAvailableFinanceYears: RPC function not available, using fallback with pagination');
  }

  // Fallback to regular query with pagination
  const years = new Set<number>();
  
  // Add current year by default
  years.add(currentYear);
  
  try {
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('Finanzen')
        .select('datum')
        .not('datum', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('fetchAvailableFinanceYears pagination error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Process dates to extract years
      data.forEach((item: { datum: string | null }) => {
        if (!item.datum) return;
        
        try {
          const date = new Date(item.datum);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            if (year <= currentYear + 1) {
              years.add(year);
            }
          }
        } catch (e) {
          console.warn('Invalid date format:', item.datum);
        }
      });

      // If we got fewer records than the page size, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  } catch (error) {
    console.error('fetchAvailableFinanceYears error:', error);
    throw error;
  }

  // Convert to sorted array in descending order
  return Array.from(years).sort((a, b) => b - a);
}

export function calculateFinancialSummary(
  transactions: FinanceTransaction[],
  year: number,
  currentDate: Date = new Date()
): FinancialSummary {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Group data by month
  const monthlyData: Record<number, MonthlyData> = {};
  
  // Initialize all months
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { income: 0, expenses: 0, cashflow: 0 };
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

  // Calculate cashflow for each month
  Object.keys(monthlyData).forEach(monthKey => {
    const month = Number(monthKey);
    monthlyData[month].cashflow = monthlyData[month].income - monthlyData[month].expenses;
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
