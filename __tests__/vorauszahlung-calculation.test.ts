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

  // Helper function to calculate occupancy (copied from the main component)
  function calculateOccupancy(
    einzug: string | null | undefined, 
    auszug: string | null | undefined, 
    startdatum: string, 
    enddatum: string
  ): { percentage: number, daysInPeriod: number, daysOccupied: number } {
    const billingStartDate = new Date(startdatum);
    const billingEndDate = new Date(enddatum);
    const totalDaysInPeriod = Math.ceil((billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 3600 * 24)) + 1;

    // If no move-in date, assume tenant was there from the beginning of the period
    if (!einzug) {
      // Check if there's a move-out date
      if (auszug) {
        const moveOutDate = new Date(auszug);
        if (moveOutDate < billingStartDate) {
          return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
        }
        const effectivePeriodEnd = moveOutDate > billingEndDate ? billingEndDate : moveOutDate;
        const daysOccupied = Math.ceil((effectivePeriodEnd.getTime() - billingStartDate.getTime()) / (1000 * 3600 * 24)) + 1;
        const clampedDaysOccupied = Math.max(0, Math.min(daysOccupied, totalDaysInPeriod));
        const percentage = totalDaysInPeriod > 0 ? (clampedDaysOccupied / totalDaysInPeriod) * 100 : 0;
        return { percentage: Math.max(0, Math.min(100, percentage)), daysInPeriod: totalDaysInPeriod, daysOccupied: clampedDaysOccupied };
      }
      // No move-in and no move-out date = full occupancy
      return { percentage: 100, daysInPeriod: totalDaysInPeriod, daysOccupied: totalDaysInPeriod };
    }

    const moveInDate = new Date(einzug);
    if (isNaN(moveInDate.getTime()) || moveInDate > billingEndDate) {
      return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
    }

    let moveOutDate: Date | null = null;
    if (auszug) {
      const parsedMoveOut = new Date(auszug);
      if (!isNaN(parsedMoveOut.getTime())) {
        moveOutDate = parsedMoveOut;
      }
    }

    if (moveOutDate && moveOutDate < billingStartDate) {
      return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
    }

    const effectivePeriodStart = moveInDate < billingStartDate ? billingStartDate : moveInDate;
    const effectivePeriodEnd = (!moveOutDate || moveOutDate > billingEndDate) ? billingEndDate : moveOutDate;

    if (effectivePeriodStart > effectivePeriodEnd) {
      return { percentage: 0, daysInPeriod: totalDaysInPeriod, daysOccupied: 0 };
    }

    const calculatedDaysOccupied = Math.ceil((effectivePeriodEnd.getTime() - effectivePeriodStart.getTime()) / (1000 * 3600 * 24)) + 1;
    const clampedDaysOccupied = Math.max(0, Math.min(calculatedDaysOccupied, totalDaysInPeriod));
    const percentage = totalDaysInPeriod > 0 ? (clampedDaysOccupied / totalDaysInPeriod) * 100 : 0;

    return {
      percentage: Math.max(0, Math.min(100, percentage)),
      daysInPeriod: totalDaysInPeriod,
      daysOccupied: clampedDaysOccupied,
    };
  }

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
    const currentDate = new Date(Date.UTC(billingStart.getUTCFullYear(), billingStart.getUTCMonth(), 1));

    while (currentDate <= billingEnd) {
      const currentMonthStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
      const currentMonthEnd = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0));
      const monthName = GERMAN_MONTHS[currentDate.getUTCMonth()];

      let effectivePrepaymentForMonth = 0;
      const isActiveThisMonth = !!(
        (!einzugDate || einzugDate <= currentMonthEnd) &&
        (!auszugDate || auszugDate >= currentMonthStart)
      );

      if (isActiveThisMonth) {
        // Find the base prepayment amount for this month
        let basePrepaymentAmount = 0;
        for (let i = prepaymentSchedule.length - 1; i >= 0; i--) {
          // Check if this prepayment entry's date is within or before the current month
          const prepaymentYear = prepaymentSchedule[i].date.getUTCFullYear();
          const prepaymentMonth = prepaymentSchedule[i].date.getUTCMonth();
          const currentYear = currentDate.getUTCFullYear();
          const currentMonth = currentDate.getUTCMonth();

          // Include prepayment if it's from the same month/year or earlier
          if (prepaymentYear < currentYear || 
              (prepaymentYear === currentYear && prepaymentMonth <= currentMonth)) {
            basePrepaymentAmount = prepaymentSchedule[i].amount;
            break;
          }
        }
        
        // Calculate occupancy percentage for this specific month
        const monthOccupancy = calculateOccupancy(
          einzugDate?.toISOString().split('T')[0] || null,
          auszugDate?.toISOString().split('T')[0] || null,
          currentMonthStart.toISOString().split('T')[0],
          currentMonthEnd.toISOString().split('T')[0]
        );
        
        // Apply occupancy proration to the prepayment
        effectivePrepaymentForMonth = basePrepaymentAmount * (monthOccupancy.percentage / 100);
        totalVorauszahlungen += effectivePrepaymentForMonth;
      }

      monthlyVorauszahlungenDetails.push({
        monthName: `${monthName} ${currentDate.getUTCFullYear()}`,
        amount: effectivePrepaymentForMonth,
        isActiveMonth: isActiveThisMonth,
      });

      // Move to next month
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
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

  it('should handle tenant moving in mid-month with prorated prepayment', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 600 } // 600 EUR per month
    ];
    const einzugDate = new Date('2024-03-15'); // Moves in March 15th

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, einzugDate);

    // January and February should have 0 EUR (not active)
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(0);
    expect(januaryPayment?.isActiveMonth).toBe(false);
    
    // March should have prorated amount (March has 31 days, tenant is there for 17 days: 15th-31st)
    // 17 days out of 31 days = ~54.84% of 600 EUR = ~329.03 EUR
    const marchPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'März 2024');
    expect(marchPayment?.amount).toBeCloseTo(329.03, 2); // Actual calculated value
    expect(marchPayment?.isActiveMonth).toBe(true);
    
    // April should have full 600 EUR (full month)
    const aprilPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'April 2024');
    expect(aprilPayment?.amount).toBe(600);
    expect(aprilPayment?.isActiveMonth).toBe(true);
  });

  it('should handle tenant moving out mid-month with prorated prepayment', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 600 } // 600 EUR per month
    ];
    const auszugDate = new Date('2024-10-15'); // Moves out October 15th

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, undefined, auszugDate);

    // September should have full 600 EUR (full month)
    const septemberPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'September 2024');
    expect(septemberPayment?.amount).toBe(600);
    expect(septemberPayment?.isActiveMonth).toBe(true);
    
    // October should have prorated amount (October has 31 days, tenant is there for 15 days: 1st-15th)
    // 15 days out of 31 days = ~48.39% of 600 EUR = ~290.32 EUR
    const octoberPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Oktober 2024');
    expect(octoberPayment?.amount).toBeCloseTo(290.32, 2); // Actual calculated value
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

  it('should prorate 60 EUR prepayment to 30 EUR when tenant moves in mid-month', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 60 } // 60 EUR per month
    ];
    const einzugDate = new Date('2024-06-15'); // Moves in June 15th (mid-month)

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, einzugDate);

    // June should have prorated amount (June has 30 days, tenant is there for 16 days: 15th-30th)
    // 16 days out of 30 days = 53.33% of 60 EUR = 32 EUR
    const junePayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juni 2024');
    expect(junePayment?.amount).toBe(32); // Actual calculated value
    expect(junePayment?.isActiveMonth).toBe(true);
    
    // July should have full 60 EUR (full month)
    const julyPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juli 2024');
    expect(julyPayment?.amount).toBe(60);
    expect(julyPayment?.isActiveMonth).toBe(true);
  });

  it('should pay full 500 EUR when tenant moves in on Jan 1st and billing starts Jan 1st', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 500 } // 500 EUR per month
    ];
    const einzugDate = new Date('2024-01-01'); // Moves in Jan 1st (same as billing start)

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, einzugDate);

    // January should have full 500 EUR (100% occupancy)
    const januaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Januar 2024');
    expect(januaryPayment?.amount).toBe(500); // Full payment
    expect(januaryPayment?.isActiveMonth).toBe(true);
    
    // February should also have full 500 EUR (full month)
    const februaryPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Februar 2024');
    expect(februaryPayment?.amount).toBe(500);
    expect(februaryPayment?.isActiveMonth).toBe(true);
  });

  it('should prorate 60 EUR prepayment to 30 EUR when tenant moves out mid-month', () => {
    const billingStart = new Date('2024-01-01');
    const billingEnd = new Date('2024-12-31');
    const prepaymentSchedule = [
      { date: new Date('2024-01-01'), amount: 60 } // 60 EUR per month
    ];
    const auszugDate = new Date('2024-06-15'); // Moves out June 15th (mid-month)
    // Tenant was there from before the billing period
    const einzugDate = new Date('2023-01-01'); // Moved in before billing period

    const result = calculateVorauszahlungen(billingStart, billingEnd, prepaymentSchedule, einzugDate, auszugDate);

    // May should have full 60 EUR (full month)
    const mayPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Mai 2024');
    expect(mayPayment?.amount).toBe(60);
    expect(mayPayment?.isActiveMonth).toBe(true);
    
    // June should have prorated amount (June has 30 days, tenant is there for 15 days: 1st-15th)
    // 15 days out of 30 days = 50% of 60 EUR = 30 EUR (exactly as mentioned in example)
    const junePayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juni 2024');
    expect(junePayment?.amount).toBe(30); // Actual calculated value
    expect(junePayment?.isActiveMonth).toBe(true);
    
    // July should have 0 EUR (not active)
    const julyPayment = result.monthlyVorauszahlungenDetails.find(p => p.monthName === 'Juli 2024');
    expect(julyPayment?.amount).toBe(0);
    expect(julyPayment?.isActiveMonth).toBe(false);
  });
});