/**
 * @jest-environment node
 */
import { ladeMietHistorien, ladeMietverhaeltnisIds } from '@/lib/mietverhaeltnis-mieten-laden';

/** Synthetic data only. Handmade Supabase mock: each `from(table)` call returns a chainable builder. */

type Result = { data: unknown; error: { message: string; code?: string } | null };

interface Call {
  table: string;
  select?: string;
  in?: [string, string[]];
  is?: [string, unknown];
}

function setup(resultFor: (table: string, call: Call) => Result | Error) {
  const calls: Call[] = [];
  const from = jest.fn((table: string) => {
    const call: Call = { table };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn((cols: string) => {
      call.select = cols;
      return builder;
    });
    builder.in = jest.fn((col: string, ids: string[]) => {
      call.in = [col, ids];
      return builder;
    });
    builder.is = jest.fn((col: string, val: unknown) => {
      call.is = [col, val];
      return builder;
    });
    builder.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) => {
      const r = resultFor(table, call);
      if (r instanceof Error) return Promise.reject(r).then(resolve, reject);
      return Promise.resolve(r).then(resolve, reject);
    };
    return builder;
  });
  const supabase = { from } as unknown as Parameters<typeof ladeMietHistorien>[0];
  return { supabase, from, calls };
}

const ids = (n: number, prefix = 'mv') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

describe('ladeMietHistorien', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('lädt aktive Einträge mit einem Query und liest numerische Strings', async () => {
    const { supabase, from, calls } = setup(() => ({
      data: [
        { mietverhaeltnis_id: 'mv-1', gueltig_ab: '2024-01-01', betrag: '500.00' },
        { mietverhaeltnis_id: 'mv-1', gueltig_ab: '2025-06-01', betrag: 550 },
      ],
      error: null,
    }));

    const result = await ladeMietHistorien(supabase, ['mv-1']);

    expect(from).toHaveBeenCalledTimes(1);
    expect(calls[0].table).toBe('Mieter_Mietverhaeltnisse_Mieten');
    expect(calls[0].select).toBe('mietverhaeltnis_id, gueltig_ab, betrag');
    expect(calls[0].in).toEqual(['mietverhaeltnis_id', ['mv-1']]);
    expect(calls[0].is).toEqual(['geloescht_am', null]);
    expect(result.get('mv-1')).toEqual([
      { gueltig_ab: '2024-01-01', betrag: 500 },
      { gueltig_ab: '2025-06-01', betrag: 550 },
    ]);
  });

  it('gruppiert die Einträge je Mietverhältnis und verwirft unbrauchbare Zeilen', async () => {
    const { supabase } = setup(() => ({
      data: [
        { mietverhaeltnis_id: 'mv-1', gueltig_ab: '2024-01-01', betrag: 500 },
        { mietverhaeltnis_id: 'mv-2', gueltig_ab: '2024-02-01', betrag: 800 },
        { mietverhaeltnis_id: 'mv-1', gueltig_ab: '2024-03-01', betrag: null },
        { mietverhaeltnis_id: 'mv-2', gueltig_ab: '2024-04-01', betrag: 'kaputt' },
        { mietverhaeltnis_id: null, gueltig_ab: '2024-05-01', betrag: 900 },
      ],
      error: null,
    }));

    const result = await ladeMietHistorien(supabase, ['mv-1', 'mv-2']);

    expect(result.size).toBe(2);
    expect(result.get('mv-1')).toEqual([{ gueltig_ab: '2024-01-01', betrag: 500 }]);
    expect(result.get('mv-2')).toEqual([{ gueltig_ab: '2024-02-01', betrag: 800 }]);
  });

  it('führt bei leerer ID-Liste keinen Query aus', async () => {
    const { supabase, from } = setup(() => ({ data: [], error: null }));

    const result = await ladeMietHistorien(supabase, []);

    expect(from).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('dedupliziert IDs und fragt in Blöcken von höchstens 200 ab', async () => {
    const { supabase, calls } = setup(() => ({ data: [], error: null }));
    const eingabe = [...ids(450), 'mv-0', '']; // duplicate and empty entry

    await ladeMietHistorien(supabase, eingabe);

    expect(calls).toHaveLength(3);
    const abgefragt = calls.flatMap((c) => c.in?.[1] ?? []);
    expect(abgefragt).toHaveLength(450);
    expect(new Set(abgefragt).size).toBe(450);
    expect(calls.every((c) => (c.in?.[1].length ?? 0) <= 200)).toBe(true);
  });

  it('liefert bei einem Fehler eine leere Map und meldet nur den Code ohne Daten', async () => {
    const { supabase } = setup(() => ({
      data: null,
      error: { message: 'column "geloescht_am" does not exist for mv-secret-123 with 1234.56', code: '42703' },
    }));

    const result = await ladeMietHistorien(supabase, ['mv-secret-123']);

    expect(result.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    const meldung = JSON.stringify(warn.mock.calls[0]);
    expect(meldung).not.toContain('mv-secret-123');
    expect(meldung).not.toContain('1234.56');
    expect(meldung).toContain('42703');
  });

  it('liefert eine leere Map, wenn der Query wirft', async () => {
    const { supabase } = setup(() => new Error('network down'));

    const result = await ladeMietHistorien(supabase, ['mv-1']);

    expect(result.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('liefert eine leere Map, wenn der Client kaputt ist (z. B. fehlende Methode)', async () => {
    const supabase = { from: () => ({}) } as unknown as Parameters<typeof ladeMietHistorien>[0];

    const result = await ladeMietHistorien(supabase, ['mv-1']);

    expect(result.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('ladeMietverhaeltnisIds', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('ordnet Mieter-IDs ihren Mietverhältnissen zu und überspringt Mieter ohne Mietverhältnis', async () => {
    const { supabase, from, calls } = setup(() => ({
      data: [
        { id: 'mieter-1', mietverhaeltnis_id: 'mv-1' },
        { id: 'mieter-2', mietverhaeltnis_id: null },
        { id: 'mieter-3', mietverhaeltnis_id: 'mv-3' },
      ],
      error: null,
    }));

    const result = await ladeMietverhaeltnisIds(supabase, ['mieter-1', 'mieter-2', 'mieter-3']);

    expect(from).toHaveBeenCalledTimes(1);
    expect(calls[0].table).toBe('Mieter');
    expect(calls[0].select).toBe('id, mietverhaeltnis_id');
    expect(calls[0].in).toEqual(['id', ['mieter-1', 'mieter-2', 'mieter-3']]);
    expect(result.get('mieter-1')).toBe('mv-1');
    expect(result.has('mieter-2')).toBe(false);
    expect(result.get('mieter-3')).toBe('mv-3');
  });

  it('führt bei leerer Liste keinen Query aus', async () => {
    const { supabase, from } = setup(() => ({ data: [], error: null }));

    const result = await ladeMietverhaeltnisIds(supabase, []);

    expect(from).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('fragt in Blöcken von höchstens 200 ab', async () => {
    const { supabase, calls } = setup(() => ({ data: [], error: null }));

    await ladeMietverhaeltnisIds(supabase, ids(401, 'mieter'));

    expect(calls).toHaveLength(3);
    expect(calls.every((c) => (c.in?.[1].length ?? 0) <= 200)).toBe(true);
  });

  it('liefert bei einem Fehler eine leere Map ohne Daten in der Meldung', async () => {
    const { supabase } = setup(() => ({
      data: null,
      error: { message: 'boom for mieter-secret-9', code: 'PGRST000' },
    }));

    const result = await ladeMietverhaeltnisIds(supabase, ['mieter-secret-9']);

    expect(result.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls[0])).not.toContain('mieter-secret-9');
  });

  it('liefert eine leere Map, wenn der Query wirft', async () => {
    const { supabase } = setup(() => new Error('timeout'));

    const result = await ladeMietverhaeltnisIds(supabase, ['mieter-1']);

    expect(result.size).toBe(0);
  });
});
