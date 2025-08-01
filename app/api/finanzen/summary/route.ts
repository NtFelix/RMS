export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const currentYear = new Date().getFullYear();

    const { data: financesForCurrentYear, error } = await supabase
      .from('Finanzen')
      .select('datum, betrag, ist_einnahmen')
      .gte('datum', `${currentYear}-01-01`)
      .lte('datum', `${currentYear}-12-31`);

    if (error) throw error;

    const monthlyData = financesForCurrentYear.reduce((acc, item) => {
      const month = new Date(item.datum!).getMonth();
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0 };
      }
      if (item.ist_einnahmen) {
        acc[month].income += Number(item.betrag);
      } else {
        acc[month].expenses += Number(item.betrag);
      }
      return acc;
    }, {} as Record<number, { income: number; expenses: number }>);

    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const monthsPassed = currentMonthIndex + 1;

    const totalsForPassedMonths = Object.entries(monthlyData).reduce(
      (acc, [monthKey, data]) => {
        const monthIndex = Number(monthKey);
        if (monthIndex <= currentMonthIndex) {
          acc.income += data.income;
          acc.expenses += data.expenses;
        }
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    const averageMonthlyIncome = monthsPassed > 0 ? totalsForPassedMonths.income / monthsPassed : 0;
    const averageMonthlyExpenses = monthsPassed > 0 ? totalsForPassedMonths.expenses / monthsPassed : 0;
    const averageMonthlyCashflow = averageMonthlyIncome - averageMonthlyExpenses;
    const yearlyProjection = averageMonthlyCashflow * 12;

    return NextResponse.json({
      averageMonthlyIncome,
      averageMonthlyExpenses,
      averageMonthlyCashflow,
      yearlyProjection,
    });

  } catch (e: any) {
    console.error('Server error GET /api/finanzen/summary:', e);
    return NextResponse.json({ error: 'Serverfehler bei der Finanzzusammenfassung.', details: e.message }, { status: 500 });
  }
}
