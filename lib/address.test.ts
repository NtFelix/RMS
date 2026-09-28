import { formatPlzOrt, PLZ_PATTERN } from './address';

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
