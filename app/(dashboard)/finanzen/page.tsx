export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";
import { createClient } from "@/utils/supabase/server";


import { PAGINATION } from "@/constants";

async function getSummaryData(year: number) {
  const supabase = await createClient();
  
  try {
    // Use the optimized Supabase function that handles pagination internally
    const { data, error } = await supabase.rpc('get_financial_year_summary', {
      target_year: year
    });
    
    if (error) {
      console.error('Error fetching summary data with RPC:', error);
      // Fallback to the function that returns raw data for client-side calculation
      return await getSummaryDataFallback(year);
    }

    if (!data || data.length === 0) {
      // Return empty summary for the year
      const { calculateFinancialSummary } = await import("@/utils/financeCalculations");
      return calculateFinancialSummary([], year, new Date());
    }

    const summary = data[0];
    
    // Convert the database result to our expected format
    const monthlyData: Record<number, { income: number; expenses: number; cashflow: number }> = {};
    
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
  } catch (error) {
    console.error('Error in getSummaryData:', error);
    return await getSummaryDataFallback(year);
  }
}

async function getSummaryDataFallback(year: number) {
  const supabase = await createClient();
  
  try {
    // Fallback: Use the function that returns all transactions for the year
    const { data, error } = await supabase.rpc('get_financial_summary_data', {
      target_year: year
    });
    
    if (error) {
      console.error('Error fetching summary data with fallback RPC:', error);
      return null;
    }

    // Calculate summary using the utility function
    const { calculateFinancialSummary } = await import("@/utils/financeCalculations");
    return calculateFinancialSummary(data || [], year, new Date());
  } catch (error) {
    console.error('Error in getSummaryDataFallback:', error);
    return null;
  }
}

async function getAvailableYears() {
  const supabase = await createClient();
  const { fetchAvailableFinanceYears } = await import("@/utils/financeCalculations");
  return await fetchAvailableFinanceYears(supabase);
}

export default async function FinanzenPage() {
  const supabase = await createClient();
  
  // Wohnungen laden
  const { data: wohnungenData } = await supabase.from('Wohnungen').select('id,name');
  const wohnungen = wohnungenData ?? [];
  
  // Initial Finanzen laden (nur die erste Seite für die Transaktionsliste)
  const { data: finanzenData } = await supabase
    .from('Finanzen')
    .select('*, Wohnungen(name)')
    .order('datum', { ascending: false })
    .range(0, PAGINATION.DEFAULT_PAGE_SIZE - 1);
  const finances = finanzenData ?? [];

  // Summary-Daten für das aktuelle Jahr laden
  const currentYear = new Date().getFullYear();
  const summaryData = await getSummaryData(currentYear);
  
  // Available years laden
  const availableYears = await getAvailableYears();

  return <FinanzenClientWrapper 
    finances={finances} 
    wohnungen={wohnungen} 
    summaryData={summaryData}
    initialAvailableYears={availableYears}
  />;
}
