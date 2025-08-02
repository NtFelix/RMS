export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString(), 10);
    
    // Calculate date range for the specified year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = await createClient();
    
    // Fetch all financial data for the specified year
    const { data, error } = await supabase
      .from('Finanzen')
      .select('id, betrag, ist_einnahmen, datum')
      .gte('datum', startDate)
      .lte('datum', endDate)
      .order('datum', { ascending: false });
      
    if (error) {
      console.error('GET /api/finanzen/summary error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate summary statistics
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-based
    
    // Group data by month
    const monthlyData: Record<number, { income: number; expenses: number }> = {};
    
    (data || []).forEach(item => {
      if (!item.datum) return;
      
      const itemDate = new Date(item.datum);
      const month = itemDate.getMonth();
      
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }
      
      const amount = Number(item.betrag);
      if (item.ist_einnahmen) {
        monthlyData[month].income += amount;
      } else {
        monthlyData[month].expenses += amount;
      }
    });

    // Calculate totals and averages
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

    const summary = {
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

    return NextResponse.json(summary, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/summary:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Zusammenfassung.' }, { status: 500 });
  }
}