import { pickCurrentTenantPerApartment } from './tenant-access';

const today = '2026-11-04';

describe('pickCurrentTenantPerApartment', () => {
  it('nimmt den aktiven Mieter, auch wenn die Zeile eines ausgezogenen Mieters zuerst kommt', () => {
    const rows = [
      { id: 'alt', wohnung_id: 'a1', auszug: '2020-01-31' },
      { id: 'neu', wohnung_id: 'a1', auszug: null },
    ];

    expect(pickCurrentTenantPerApartment(rows, today).get('a1')?.id).toBe('neu');
  });

  it('behaelt den ersten aktiven Mieter, wenn mehrere aktiv sind', () => {
    const rows = [
      { id: 'erst', wohnung_id: 'a1', auszug: null },
      { id: 'zweit', wohnung_id: 'a1', auszug: '2027-01-01' },
    ];

    expect(pickCurrentTenantPerApartment(rows, today).get('a1')?.id).toBe('erst');
  });

  it('nimmt ohne aktiven Mieter die erste Zeile (Wohnung bleibt frei)', () => {
    const rows = [
      { id: 'alt1', wohnung_id: 'a1', auszug: '2019-01-31' },
      { id: 'alt2', wohnung_id: 'a1', auszug: '2020-01-31' },
    ];

    expect(pickCurrentTenantPerApartment(rows, today).get('a1')?.id).toBe('alt1');
  });

  it('ignoriert Zeilen ohne Wohnung und trennt Wohnungen voneinander', () => {
    const rows = [
      { id: 'x', wohnung_id: null, auszug: null },
      { id: 'a', wohnung_id: 'a1', auszug: null },
      { id: 'b', wohnung_id: 'a2', auszug: '2020-01-31' },
    ];
    const result = pickCurrentTenantPerApartment(rows, today);

    expect([...result.keys()].sort()).toEqual(['a1', 'a2']);
    expect(result.get('a2')?.id).toBe('b');
  });
});
