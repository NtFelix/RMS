import {
  roundBoundaryToRechenpunkt,
  getRechentagePeriod,
  calculateTotalRechentage,
  calculateTenantRechentage,
  calculateTenantRechentageInMonth,
  isValid360Period,
  get360PeriodEnd,
  isRechenbasis360,
} from './rechentage';

// All expected values are worked out by hand from the rules in the feature spec (GH-21)
type Period = readonly [string, string];
const P2026: Period = ['2026-01-01', '2026-12-31'];
const P2028: Period = ['2028-01-01', '2028-12-31'];

const tenant = (einzug: string | null, auszug: string | null = null, id = 't') => ({ id, einzug, auszug });

const inMonth = (t: ReturnType<typeof tenant>, month: number, [start, end]: Period = P2026) =>
  calculateTenantRechentageInMonth(t, start, end, Number(start.slice(0, 4)), month);

describe('roundBoundaryToRechenpunkt', () => {
  it('rounds to the nearest of 0, 15 and the month end in a 31-day month', () => {
    expect(roundBoundaryToRechenpunkt(0, 31)).toBe(0);
    expect(roundBoundaryToRechenpunkt(7, 31)).toBe(0);
    expect(roundBoundaryToRechenpunkt(8, 31)).toBe(15);
    expect(roundBoundaryToRechenpunkt(15, 31)).toBe(15);
    expect(roundBoundaryToRechenpunkt(22, 31)).toBe(15);
    // Tie after the 23rd (8 to 15, 8 to 31): the earlier point wins
    expect(roundBoundaryToRechenpunkt(23, 31)).toBe(15);
    expect(roundBoundaryToRechenpunkt(24, 31)).toBe(30);
    expect(roundBoundaryToRechenpunkt(31, 31)).toBe(30);
  });

  it('has no tie in 30- and 28-day months', () => {
    expect(roundBoundaryToRechenpunkt(22, 30)).toBe(15);
    expect(roundBoundaryToRechenpunkt(23, 30)).toBe(30);
    expect(roundBoundaryToRechenpunkt(21, 28)).toBe(15);
    expect(roundBoundaryToRechenpunkt(22, 28)).toBe(30);
  });

  it('breaks the tie after the 22nd of a 29-day February to the earlier point', () => {
    expect(roundBoundaryToRechenpunkt(22, 29)).toBe(15);
    expect(roundBoundaryToRechenpunkt(23, 29)).toBe(30);
  });
});

describe('period', () => {
  it('counts exactly 360 Rechentage for 12 whole months, leap year or not', () => {
    expect(calculateTotalRechentage(...P2026)).toBe(360);
    expect(calculateTotalRechentage(...P2028)).toBe(360);
    expect(calculateTotalRechentage('2026-04-01', '2027-03-31')).toBe(360);
  });

  it('counts 30 per month for other whole-month windows, so the denominator is not hard-wired', () => {
    expect(calculateTotalRechentage('2026-01-01', '2026-06-30')).toBe(180);
    expect(calculateTotalRechentage('2026-01-01', '2027-12-31')).toBe(720);
  });

  it('rejects an invalid or reversed period', () => {
    expect(getRechentagePeriod('', '2026-12-31')).toBeNull();
    expect(getRechentagePeriod('2026-12-31', '2026-01-01')).toBeNull();
    expect(calculateTotalRechentage('2026-02-30', '2026-12-31')).toBe(0);
  });

  it('validates the 12-month window and derives its end', () => {
    expect(isValid360Period(...P2026)).toBe(true);
    expect(isValid360Period('2026-04-01', '2027-03-31')).toBe(true);
    expect(isValid360Period('2026-01-02', '2026-12-31')).toBe(false);
    expect(isValid360Period('2026-01-01', '2026-12-30')).toBe(false);
    expect(isValid360Period('2026-01-01', '2027-01-31')).toBe(false);
    expect(get360PeriodEnd('2026-03-01')).toBe('2027-02-28');
    expect(get360PeriodEnd('2027-03-01')).toBe('2028-02-29');
    expect(get360PeriodEnd('2026-01-15')).toBe('2026-12-31');
  });

  it('recognises the basis flag', () => {
    expect(isRechenbasis360({ rechenbasis: '360_tage' })).toBe(true);
    expect(isRechenbasis360({ rechenbasis: 'kalendertage' })).toBe(false);
    expect(isRechenbasis360({})).toBe(false);
    expect(isRechenbasis360(null)).toBe(false);
  });
});

describe('move-in and move-out (spec table)', () => {
  it.each([
    ['2026-03-03', 30],
    ['2026-03-10', 15],
    ['2026-03-24', 15], // tie, earlier point
    ['2026-03-28', 0],
    ['2026-04-09', 15],
  ])('move-in on %s counts %i Rechentage in that month', (einzug, expected) => {
    expect(inMonth(tenant(einzug), Number(einzug.slice(5, 7)))).toBe(expected);
  });

  it.each([
    ['2026-05-10', 15],
    ['2026-05-20', 15],
    ['2026-05-23', 15], // tie, earlier point
    ['2026-05-25', 30],
    ['2026-04-23', 30],
    ['2026-02-21', 15],
  ])('move-out on %s counts %i Rechentage in that month', (auszug, expected) => {
    expect(inMonth(tenant('2025-01-01', auszug), Number(auszug.slice(5, 7)))).toBe(expected);
  });

  it('move-out on 22.02.2028 counts 15 (tie in a leap-year February)', () => {
    expect(inMonth(tenant('2027-01-01', '2028-02-22'), 2, P2028)).toBe(15);
  });

  it('counts only months inside the tenancy', () => {
    const t = tenant('2026-03-10', '2026-05-20');
    expect([1, 2, 3, 4, 5, 6].map(m => inMonth(t, m))).toEqual([0, 0, 15, 30, 15, 0]);
  });
});

describe('tenant change within a month', () => {
  const totalInMonth = (auszug: string, einzug: string, month: number, period: Period = P2026) =>
    inMonth(tenant('2020-01-01', auszug, 'a'), month, period) + inMonth(tenant(einzug, null, 'b'), month, period);

  it('21. to 22.02. in a non-leap year gives 15 + 15, not 45', () => {
    expect(inMonth(tenant('2020-01-01', '2026-02-21'), 2)).toBe(15);
    expect(inMonth(tenant('2026-02-22'), 2)).toBe(15);
    expect(totalInMonth('2026-02-21', '2026-02-22', 2)).toBe(30);
  });

  it('23. to 24.05. gives 15 + 15 and no vacancy although the dates differ', () => {
    expect(inMonth(tenant('2020-01-01', '2026-05-23'), 5)).toBe(15);
    expect(inMonth(tenant('2026-05-24'), 5)).toBe(15);
  });

  it('hands out exactly 30 Rechentage for every seamless change date of the year', () => {
    for (const period of [P2026, P2028]) {
      const year = Number(period[0].slice(0, 4));
      for (let month = 1; month <= 12; month++) {
        const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
        for (let day = 1; day < days; day++) {
          const auszug = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const einzug = `${year}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
          expect(totalInMonth(auszug, einzug, month, period)).toBe(30);
        }
      }
    }
  });
});

describe('short stays', () => {
  it('counts 0 when both boundaries round to the same point', () => {
    expect(calculateTenantRechentage(tenant('2026-03-10', '2026-03-20'), ...P2026).rechentage).toBe(0);
    expect(calculateTenantRechentage(tenant('2026-03-09', '2026-03-23'), ...P2026).rechentage).toBe(0);
    expect(calculateTenantRechentage(tenant('2026-03-03', '2026-03-06'), ...P2026).rechentage).toBe(0);
  });

  it('is not tied to a half of the month', () => {
    expect(calculateTenantRechentage(tenant('2026-03-05', '2026-03-12'), ...P2026).rechentage).toBe(15);
    expect(calculateTenantRechentage(tenant('2026-03-08', '2026-03-24'), ...P2026).rechentage).toBe(30);
  });
});

describe('calculateTenantRechentage', () => {
  it('gives a full-year tenant 360 of 360', () => {
    const result = calculateTenantRechentage(tenant('2020-05-17'), ...P2026);
    expect(result.rechentage).toBe(360);
    expect(result.totalRechentage).toBe(360);
    expect(result.ratio).toBe(1);
    expect(result.billedFromIso).toBe('2026-01-01');
    expect(result.billedToIso).toBe('2026-12-31');
    expect(result.einzugGerundet).toBe(false);
    expect(result.auszugGerundet).toBe(false);
  });

  it('matches the spec example 07.03. to 20.05. with 75 of 360', () => {
    const result = calculateTenantRechentage(tenant('2026-03-07', '2026-05-20'), ...P2026);
    expect(result.rechentage).toBe(75);
    expect(result.ratio).toBeCloseTo(75 / 360, 12);
    expect(result.billedFromIso).toBe('2026-03-01');
    expect(result.billedToIso).toBe('2026-05-15');
    expect(result.einzugGerundetIso).toBe('2026-03-01');
    expect(result.auszugGerundetIso).toBe('2026-05-15');
    expect(result.einzugGerundet).toBe(true);
    expect(result.auszugGerundet).toBe(true);
  });

  it('bills from the 16th or the next month start after rounding', () => {
    expect(calculateTenantRechentage(tenant('2026-03-10'), ...P2026).billedFromIso).toBe('2026-03-16');
    const late = calculateTenantRechentage(tenant('2026-03-28'), ...P2026);
    expect(late.billedFromIso).toBe('2026-04-01');
    expect(late.rechentage).toBe(270);
  });

  it('does not flag dates that already sit on a Rechenpunkt', () => {
    const result = calculateTenantRechentage(tenant('2026-03-16', '2026-05-31'), ...P2026);
    expect(result.einzugGerundet).toBe(false);
    expect(result.auszugGerundet).toBe(false);
    expect(result.rechentage).toBe(15 + 30 + 30);
  });

  it('flags a move-in rounded onto the period start', () => {
    const result = calculateTenantRechentage(tenant('2026-01-03'), ...P2026);
    expect(result.rechentage).toBe(360);
    expect(result.einzugGerundet).toBe(true);
    expect(result.einzugGerundetIso).toBe('2026-01-01');
  });

  it('keeps the rounding note when the tenant ends with 0 Rechentage', () => {
    const result = calculateTenantRechentage(tenant('2026-12-28'), ...P2026);
    expect(result.rechentage).toBe(0);
    expect(result.einzugGerundet).toBe(true);
    expect(result.einzugGerundetIso).toBe('2027-01-01');
  });

  it('clips tenancies to the period', () => {
    expect(calculateTenantRechentage(tenant('2025-06-10', '2026-02-10'), ...P2026).rechentage).toBe(45);
    expect(calculateTenantRechentage(tenant('2025-01-01', '2025-12-31'), ...P2026).rechentage).toBe(0);
    expect(calculateTenantRechentage(tenant('2027-01-01'), ...P2026).rechentage).toBe(0);
  });

  it('counts a tenant without a move-in date as 0, as on the calendar basis', () => {
    const result = calculateTenantRechentage(tenant(null), ...P2026);
    expect(result.rechentage).toBe(0);
    expect(result.totalRechentage).toBe(360);
    expect(result.ratio).toBe(0);
  });

  it('accepts German dates and timestamps', () => {
    expect(calculateTenantRechentage(tenant('10.03.2026', '2026-05-20T12:00:00Z'), '01.01.2026', '31.12.2026').rechentage).toBe(15 + 30 + 15);
  });

  it('treats a move-out before the move-in as no occupancy', () => {
    expect(calculateTenantRechentage(tenant('2026-05-01', '2026-03-01'), ...P2026).rechentage).toBe(0);
  });
});
