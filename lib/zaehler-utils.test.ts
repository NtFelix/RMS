import {
  sumZaehlerValues,
  sumAllZaehlerValues,
  convertZaehlerkostenToStrings,
} from './zaehler-utils';
import { WATER_METER_TYPES, ZaehlerTyp } from '@/lib/zaehler-types';

// One value per meter type. Typed as Record<ZaehlerTyp, number> so the
// compiler flags any missing or renamed meter type.
const ALL_TYPES_VALUES: Record<ZaehlerTyp, number> = {
  kaltwasser: 1,
  warmwasser: 2,
  waermemenge: 4,
  heizkostenverteiler: 8,
  strom: 16,
  gas: 32,
};

describe('sumZaehlerValues', () => {
  it('should sum only water meter types by default and ignore other meter types', () => {
    const values = { kaltwasser: 10, warmwasser: 5, strom: 100, gas: 200, waermemenge: 300 };

    const result = sumZaehlerValues(values);

    expect(result).toBe(15);
    expect(result).not.toBe(Object.values(values).reduce((a, b) => a + b, 0));
  });

  it('should use WATER_METER_TYPES as default types', () => {
    const values = { kaltwasser: 3, warmwasser: 7, strom: 50 };

    expect(sumZaehlerValues(values)).toBe(sumZaehlerValues(values, WATER_METER_TYPES));
    expect(sumZaehlerValues(values)).toBe(10);
  });

  it('should sum only the explicitly given types', () => {
    const values = { kaltwasser: 10, warmwasser: 5, strom: 100, gas: 200 };

    expect(sumZaehlerValues(values, ['strom'])).toBe(100);
    expect(sumZaehlerValues(values, ['strom', 'gas'])).toBe(300);
  });

  it('should not depend on the order of the given types', () => {
    const values = { kaltwasser: 10, strom: 100, gas: 200 };

    expect(sumZaehlerValues(values, ['gas', 'strom', 'kaltwasser']))
      .toBe(sumZaehlerValues(values, ['kaltwasser', 'strom', 'gas']));
  });

  it('should return 0 when the types list is empty', () => {
    expect(sumZaehlerValues({ kaltwasser: 10, strom: 100 }, [])).toBe(0);
  });

  it('should return 0 for null or undefined values, also with explicit types', () => {
    expect(sumZaehlerValues(null)).toBe(0);
    expect(sumZaehlerValues(undefined)).toBe(0);
    expect(sumZaehlerValues(null, ['strom'])).toBe(0);
    expect(sumZaehlerValues(undefined, ['strom'])).toBe(0);
  });

  it('should count a requested type that is missing from the object as 0', () => {
    expect(sumZaehlerValues({ kaltwasser: 10 })).toBe(10);
    expect(sumZaehlerValues({ strom: 40 }, ['strom', 'gas'])).toBe(40);
  });

  it('should count a requested type with value 0 as 0', () => {
    expect(sumZaehlerValues({ kaltwasser: 0, warmwasser: 6 })).toBe(6);
  });

  it('should sum decimal values exactly', () => {
    expect(sumZaehlerValues({ kaltwasser: 1.5, warmwasser: 2.25 })).toBe(3.75);
  });

  it('should exclude a type that is present in the object but not in the given types, even with a large value', () => {
    expect(sumZaehlerValues({ kaltwasser: 1, strom: 1_000_000 }, ['kaltwasser'])).toBe(1);
  });
});

describe('sumAllZaehlerValues', () => {
  it('should sum the values of all six meter types', () => {
    // 1 + 2 + 4 + 8 + 16 + 32 = 63; dropping any single key would change the result
    expect(sumAllZaehlerValues(ALL_TYPES_VALUES)).toBe(63);
  });

  it('should return 0 for an empty object', () => {
    expect(sumAllZaehlerValues({})).toBe(0);
  });

  it('should return 0 for null or undefined', () => {
    expect(sumAllZaehlerValues(null)).toBe(0);
    expect(sumAllZaehlerValues(undefined)).toBe(0);
  });

  it('should include negative values (credits) in the sum', () => {
    expect(sumAllZaehlerValues({ strom: -20, gas: 50 })).toBe(30);
  });

  it('should sum decimal values exactly', () => {
    expect(sumAllZaehlerValues({ kaltwasser: 10.5, gas: -0.25, strom: 0.75 })).toBe(11);
  });

  it('should return a larger total than sumZaehlerValues with default types when non-water meters are present', () => {
    const values = { kaltwasser: 10, strom: 100 };

    expect(sumAllZaehlerValues(values)).toBeGreaterThan(sumZaehlerValues(values));
    expect(sumAllZaehlerValues(values)).toBe(110);
    expect(sumZaehlerValues(values)).toBe(10);
  });
});

describe('convertZaehlerkostenToStrings', () => {
  it('should convert numeric values to strings and keep the keys identical', () => {
    const result = convertZaehlerkostenToStrings({ kaltwasser: 12, strom: 3.5 });

    expect(result).toEqual({ kaltwasser: '12', strom: '3.5' });
    for (const value of Object.values(result)) {
      expect(typeof value).toBe('string');
    }
  });

  it('should format integers, decimals, zero and negatives as plain strings', () => {
    const result = convertZaehlerkostenToStrings({
      kaltwasser: 42,
      warmwasser: 12.5,
      gas: 0,
      strom: -3,
    });

    expect(result).toEqual({ kaltwasser: '42', warmwasser: '12.5', gas: '0', strom: '-3' });
  });

  it('should return an empty object for an empty input', () => {
    expect(convertZaehlerkostenToStrings({})).toEqual({});
  });

  it('should not mutate the input and return a new object', () => {
    const input: Record<string, number> = { kaltwasser: 7, strom: 8 };
    const snapshot = { ...input };

    const result = convertZaehlerkostenToStrings(input);

    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
    expect(typeof input.kaltwasser).toBe('number');
  });
});

// Open product question: sumAllZaehlerValues currently concatenates strings
// instead of adding them (values are typed as number, but JSONB may deliver
// strings). Decide the expected behavior before adding a test.
it.todo('decide expected behavior for non-numeric values in sumAllZaehlerValues');
