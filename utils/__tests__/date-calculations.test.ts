import { excelDateToJS } from '../date-calculations';

describe('excelDateToJS', () => {
  it('correctly converts Excel serial date for 1970-01-01', () => {
    // 25569 is the serial for 1970-01-01
    const result = excelDateToJS(25569);
    expect(result?.toISOString().split('T')[0]).toBe('1970-01-01');
  });

  it('correctly converts Excel serial date for recent dates', () => {
    // 44197 is 2021-01-01
    const result = excelDateToJS(44197);
    expect(result?.toISOString().split('T')[0]).toBe('2021-01-01');
  });

  it('correctly converts Excel serial date for pre-1970 dates', () => {
    // 21916 is 1960-01-01
    const result = excelDateToJS(21916);
    expect(result?.toISOString().split('T')[0]).toBe('1960-01-01');
  });

  it('handles fractional days (time)', () => {
    // 25569.5 is 1970-01-01 12:00:00
    const result = excelDateToJS(25569.5);
    expect(result?.toISOString()).toContain('12:00:00');
  });

  it('returns null for invalid inputs', () => {
    expect(excelDateToJS(NaN)).toBeNull();
    // @ts-ignore
    expect(excelDateToJS(null)).toBeNull();
    // @ts-ignore
    expect(excelDateToJS(undefined)).toBeNull();
  });
});
