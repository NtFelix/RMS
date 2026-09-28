import { formatPlzOrt, padPlz, parsePlz, PLZ_ERROR, PLZ_PATTERN } from './address';

describe('formatPlzOrt', () => {
  it('joins plz and ort', () => {
    expect(formatPlzOrt(10115, 'Berlin')).toBe('10115 Berlin');
  });

  it('left-pads numeric plz to 5 digits', () => {
    expect(formatPlzOrt(1067, 'Dresden')).toBe('01067 Dresden');
  });

  it('does not repeat a plz that legacy rows already stored inside ort', () => {
    expect(formatPlzOrt(10115, '10115 Berlin')).toBe('10115 Berlin');
    expect(formatPlzOrt(1067, '01067 Dresden')).toBe('01067 Dresden');
  });

  it('handles missing and blank parts', () => {
    expect(formatPlzOrt(null, 'Berlin')).toBe('Berlin');
    expect(formatPlzOrt(10115, '  ')).toBe('10115');
    expect(formatPlzOrt(undefined, null)).toBe('');
  });
});

describe('PLZ_PATTERN', () => {
  it('accepts exactly 5 digits including leading zeros', () => {
    expect(PLZ_PATTERN.test('01067')).toBe(true);
    expect(PLZ_PATTERN.test('10115abc')).toBe(false);
    expect(PLZ_PATTERN.test('12 345')).toBe(false);
    expect(PLZ_PATTERN.test('1234')).toBe(false);
  });
});

describe('parsePlz', () => {
  it('treats blank input as null', () => {
    expect(parsePlz('')).toEqual({ value: null });
    expect(parsePlz('  ')).toEqual({ value: null });
    expect(parsePlz(null)).toEqual({ value: null });
    expect(parsePlz(undefined)).toEqual({ value: null });
  });

  it('returns the numeric value for a valid plz, including leading zeros', () => {
    expect(parsePlz('10115')).toEqual({ value: 10115 });
    expect(parsePlz(' 01067 ')).toEqual({ value: 1067 });
    expect(parsePlz(10115)).toEqual({ value: 10115 });
    // numbers from the numeric DB column lost their leading zero
    expect(parsePlz(1067)).toEqual({ value: 1067 });
    expect(parsePlz('1067')).toEqual({ error: PLZ_ERROR });
  });

  it('rejects invalid input', () => {
    expect(parsePlz('10115abc')).toEqual({ error: PLZ_ERROR });
    expect(parsePlz('1234')).toEqual({ error: PLZ_ERROR });
    expect(parsePlz('12 345')).toEqual({ error: PLZ_ERROR });
  });
});

describe('padPlz', () => {
  it('left-pads numeric plz to 5 digits and leaves other input trimmed', () => {
    expect(padPlz(1067)).toBe('01067');
    expect(padPlz('1067')).toBe('01067');
    expect(padPlz(null)).toBe('');
    expect(padPlz(' abc ')).toBe('abc');
  });
});
