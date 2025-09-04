/**
 * Test suite for Vorauszahlung (advance payment) calculation logic
 * 
 * This test verifies that the advance payment calculation works correctly,
 * especially for edge cases like billing periods starting on the 1st of a month.
 */

describe('Vorauszahlung Calculation Logic', () => {
  const GERMAN_MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  function calculateVorauszahlungen(
    billingStart: Date,
    billingEnd: Date,
    prepaymentSchedule: Array<{ date: Date; amount: number }>,
    einzugDate?: Date,
    auszugDate?: Date
  ) {
    let totalVorauszahlungen = 0;
    const monthlyVorauszahlungenDetails: Array<{
      monthName: string;
      amount: number;
      isActiveMonth: boolean;
    }> = [];

    // Sort prepayment schedule by date
    prepaymentSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Generate months within the billing period
    const currentDate = new Date(billingStart.getFullYear(), billingStart.getMonth(), 1);

    while (currentDate <= billingEnd) {
      const currentMonthStart = new Date(currentDate);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const monthName = GERMAN_MONTHS[currentDate.getMonth()];

      let effectivePrepaymentForMonth = 0;
      const isActiveThisMonth = !!(
        (!einzugDate || einzugDate <= currentMonthEnd) &&
        (!auszugDate || auszugDate >= currentMonthStart)
      );

      if (isActiveThisMonth) {
        // Find the most recent prepayment that is effective during this month
        for (let i = prepaymentSchedule.length - 1; i >= 0; i--) {
          // Check if this prepayment entry's date is within or before the current month
          const prepaymentYear = prepaymentSchedule[i].date.getFullYear();
          const prepaymentMonth = prepaymentSchedule[i].date.getMonth();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();

          // Include prepayment if it's from the same month/year or earlier
          if (prepaymentYear < currentYear || 
              (prepaymentYear === currentYear && prepaymentMonth <= currentMonth)) {
            effectivePrepaymentForMonth = prepaymentSchedule[i].amount;
            break;
          }
        }
        totalVorauszahlungen += effectivePrepaymentForMonth;
      }

      monthlyVorauszahlungenDetails.push({
        monthName: `${monthName} ${currentDate.getFullYear()}`,
        amount: effectivePrepaymentForMonth,
        isActiveMonth: isActiveThisMonth,
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return { totalVorauszahlungen, monthlyVorauszahlungenDetails };
  }

  it('should include prepayment for January when billing starts on January 1st', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 500 }
    ];

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule);

    // Should include 500 EUR for all 12 months
    expect(result.totalVorauszahlungen).toBe(6000);
    
    // January should have 500 EUR
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(500);
    expect(januaryPayment?.isActiveMonth).toBe(true);
  });

  it('should handle prepayment changes mid-year correctly', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 500 },
      { date: new Date('2024-07-01'), amount: 600 }
    ];

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule);

    // Should be 500 * 6 months + 600 * 6 months = 6600
    expect(result.totalVorauszahlungen).toBe(6600);
    
    // January should have 500 EUR
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(500);
    
    // July should have 600 EUR
    const julyPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juli 2024');
    expect(julyPayment?.amount).toBe(600);
  });

  it('should handle tenant moving in mid-month', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 500 }
    ];
    const einzugDate = new Date('2024-03-15'); // Moves in March 15th

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, einzugDate);

    // Should be 500 * 10 months (March through December)
    expect(result.totalVorauszahlungen).toBe(5000);
    
    // January and February should have 0 EUR (not active)
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(0);
    expect(januaryPayment?.isActiveMonth).toBe(false);
    
    // March should have 500 EUR (active)
    const marchPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'März 2024');
    expect(marchPayment?.amount).toBe(500);
    expect(marchPayment?.isActiveMonth).toBe(true);
  });

  it('should handle tenant moving out mid-month', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 500 }
    ];
    const auszugDate = new Date('2024-10-15'); // Moves out October 15th

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, undefined, auszugDate);

    // Should be 500 * 10 months (January through October)
    expect(result.totalVorauszahlungen).toBe(5000);
    
    // October should have 500 EUR (still active)
    const octoberPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Oktober 2024');
    expect(octoberPayment?.amount).toBe(500);
    expect(octoberPayment?.isActiveMonth).toBe(true);
    
    // November should have 0 EUR (not active)
    const novemberPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'November 2024');
    expect(novemberPayment?.amount).toBe(0);
    expect(novemberPayment?.isActiveMonth).toBe(false);
  });

  it('should handle prepayment starting mid-month', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-03-15'), amount: 500 } // Prepayment starts March 15th
    ];

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule);

    // Should be 500 * 10 months (March through December)
    expect(result.totalVorauszahlungen).toBe(5000);
    
    // January and February should have 0 EUR (no prepayment yet)
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(0);
    
    // March should have 500 EUR (prepayment starts)
    const marchPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'März 2024');
    expect(marchPayment?.amount).toBe(500);
  });

  it('should handle billing period not starting on January 1st', () => {
    const billingStart = new Date('2024-07-01'); // Billing starts July 1st
    const billingEnd = new Date('2025-06-30');   // Billing ends June 30th next year
    const prepaymentSchedule = [
      { date: new Date('2024-07-01'), amount: 500 }
    ];

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule);

    // Should be 500 * 12 months
    expect(result.totalVorauszahlungen).toBe(6000);
    
    // July 2024 should have 500 EUR
    const julyPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juli 2024');
    expect(julyPayment?.amount).toBe(500);
    expect(julyPayment?.isActiveMonth).toBe(true);
    
    // Should have 12 months total
    expect(result.monthlyVorauszahlungenDetails.length).toBe(12);
  });
});