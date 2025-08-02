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
    
    // Fetch all financial data for the specified year with apartment information
    const { data, error } = await supabase
      .from('Finanzen')
      .select('id, betrag, ist_einnahmen, datum, name, wohnung_id, Wohnungen(name)')
      .gte('datum', startDate)
      .lte('datum', endDate)
      .order('datum', { ascending: false });
      
    if (error) {
      console.error('GET /api/finanzen/charts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process data for charts
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    
    // Initialize monthly data
    const monthlyData: Record<number, { income: number; expenses: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { income: 0, expenses: 0 };
    }
    
    // Initialize apartment income map
    const apartmentIncomeMap = new Map<string, number>();
    
    // Initialize expense categories map
    const expenseCategoriesMap = new Map<string, number>();
    
    // Process each transaction
    (data || []).forEach(item => {
      if (!item.datum) return;
      
      const itemDate = new Date(item.datum);
      const month = itemDate.getMonth();
      const amount = Number(item.betrag);
      
      // Update monthly data
      if (item.ist_einnahmen) {
        monthlyData[month].income += amount;
        
        // Update apartment income (only for income transactions)
        if (item.Wohnungen && Array.isArray(item.Wohnungen) && item.Wohnungen.length > 0) {
          const apartmentName = item.Wohnungen[0].name;
          if (apartmentName) {
            const currentValue = apartmentIncomeMap.get(apartmentName) || 0;
            apartmentIncomeMap.set(apartmentName, currentValue + amount);
          }
        } else if (item.Wohnungen && typeof item.Wohnungen === 'object' && 'name' in item.Wohnungen) {
          const apartmentName = (item.Wohnungen as any).name;
          if (apartmentName) {
            const currentValue = apartmentIncomeMap.get(apartmentName) || 0;
            apartmentIncomeMap.set(apartmentName, currentValue + amount);
          }
        }
      } else {
        monthlyData[month].expenses += amount;
        
        // Update expense categories (only for expense transactions)
        const category = item.name ? item.name.split(' ')[0] : 'Sonstiges';
        const currentValue = expenseCategoriesMap.get(category) || 0;
        expenseCategoriesMap.set(category, currentValue + amount);
      }
    });

    // Convert to chart format
    const monthlyIncome = monthNames.map((month, index) => ({
      month,
      einnahmen: monthlyData[index].income
    }));
    
    const incomeExpenseRatio = monthNames.map((month, index) => ({
      month,
      einnahmen: monthlyData[index].income,
      ausgaben: monthlyData[index].expenses
    }));
    
    const incomeByApartment = Array.from(apartmentIncomeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    const expenseCategories = Array.from(expenseCategoriesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Calculate summary statistics
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
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

    const monthsPassed = year === currentYear ? currentMonth + 1 : 12;
    const averageMonthlyIncome = monthsPassed > 0 ? incomeForPassedMonths / monthsPassed : 0;
    const averageMonthlyExpenses = monthsPassed > 0 ? expensesForPassedMonths / monthsPassed : 0;
    const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;
    const yearlyProjection = averageMonthlyCashflow * 12;

    const response = {
      year,
      summary: {
        totalIncome,
        totalExpenses,
        totalCashflow: totalIncome - totalExpenses,
        averageMonthlyIncome,
        averageMonthlyExpenses,
        averageMonthlyCashflow,
        yearlyProjection,
        monthsPassed
      },
      charts: {
        monthlyIncome,
        incomeExpenseRatio,
        incomeByApartment,
        expenseCategories
      },
      monthlyData
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/charts:', e);
    return NextResponse.json({ error: 'Serverfehler bei Chart-Daten.' }, { status: 500 });
  }
}