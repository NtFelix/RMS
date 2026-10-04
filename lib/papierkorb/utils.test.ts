/**
 * @jest-environment node
 */
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePathsForTable, softDeleteEntryAction } from './utils';

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

// Fiktive Kennungen und Meldungen (keine echten Daten)
const HAUS_ID = 'haus-1';
const WOHNUNG_A = 'wohnung-a';
const WOHNUNG_B = 'wohnung-b';
const MIETER_A = 'mieter-a';
const MIETER_B = 'mieter-b';
const KAUTION_FEHLER =
  'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden. Eine Kaution ohne Buchungen kann zuvor entfernt werden.';
/** So kommt die Meldung der Löschsperre über PostgREST an (M04: `<CODE>: <deutsche Meldung>`, SQLSTATE KA009). */
const KAUTION_FEHLER_ROH = `KAUT_GESPERRT: ${KAUTION_FEHLER}`;
const KAUTION_SPERRE = { message: KAUTION_FEHLER_ROH, code: 'KA009' };
const PRAEFIX = 'KAUT_GESPERRT';

type QueryResult = { data: { id: string }[] | null; error: { message: string } | null };
type RpcError = { message: string; code?: string };
type RpcResult = { error: RpcError | null };

interface FakeOptions {
  /** Ergebnis von `from(tabelle).select('id')...` je Tabelle */
  queries?: Record<string, QueryResult>;
  /** Fehler des RPC `soft_delete_record` je `${tabelle}:${id}` (fehlt der Eintrag, gelingt die Löschung) */
  rpcErrors?: Record<string, string | RpcError>;
}

/** Baut einen minimalen Supabase-Client; protokolliert RPC-Aufrufe in Reihenfolge. */
function createFakeSupabase({ queries = {}, rpcErrors = {} }: FakeOptions = {}) {
  const rpcCalls: { table: string; id: string }[] = [];

  const from = jest.fn((table: string) => {
    const result: QueryResult = queries[table] ?? { data: [], error: null };
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn(() => builder);
    builder.in = jest.fn(() => builder);
    builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
  });

  const rpc = jest.fn(async (name: string, args: { p_table_name: string; p_record_id: string }): Promise<RpcResult> => {
    expect(name).toBe('soft_delete_record');
    rpcCalls.push({ table: args.p_table_name, id: args.p_record_id });
    const fehler = rpcErrors[`${args.p_table_name}:${args.p_record_id}`];
    if (!fehler) return { error: null };
    return { error: typeof fehler === 'string' ? { message: fehler } : fehler };
  });

  mockCreateClient.mockResolvedValue({ from, rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  return { from, rpc, rpcCalls };
}

describe('softDeleteEntryAction', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Wohnung -> Mieter', () => {
    it('löscht zuerst die Mieter und danach die Wohnung', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }, { id: MIETER_B }], error: null } },
      });

      await softDeleteEntryAction('Wohnungen', WOHNUNG_A);

      expect(rpcCalls).toEqual([
        { table: 'Mieter', id: MIETER_A },
        { table: 'Mieter', id: MIETER_B },
        { table: 'Wohnungen', id: WOHNUNG_A },
      ]);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/wohnungen');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('propagiert den Löschfehler eines Mieters und löscht die Wohnung dann NICHT', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE },
      });

      await expect(softDeleteEntryAction('Wohnungen', WOHNUNG_A)).rejects.toThrow(KAUTION_FEHLER);

      expect(rpcCalls).toEqual([{ table: 'Mieter', id: MIETER_A }]);
      expect(rpcCalls.some((c) => c.table === 'Wohnungen')).toBe(false);
      // Nichts wurde gelöscht: keine Revalidierung nötig
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('nennt im Fehler, dass die Wohnung nicht gelöscht wurde', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE },
      });

      await expect(softDeleteEntryAction('Wohnungen', WOHNUNG_A)).rejects.toThrow('Die Wohnung wurde nicht gelöscht.');
    });

    it('fasst gleiche Meldungen mehrerer Mieter zusammen und versucht trotzdem alle Mieter zu löschen', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }, { id: MIETER_B }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE, [`Mieter:${MIETER_B}`]: KAUTION_SPERRE },
      });

      const error = await softDeleteEntryAction('Wohnungen', WOHNUNG_A).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message.split(KAUTION_FEHLER).length - 1).toBe(1);
      expect(rpcCalls.filter((c) => c.table === 'Mieter')).toHaveLength(2);
      expect(rpcCalls.some((c) => c.table === 'Wohnungen')).toBe(false);
    });

    it('revalidiert die Mieterseiten, wenn ein Teil der Mieter bereits gelöscht wurde', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }, { id: MIETER_B }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_B}`]: KAUTION_SPERRE },
      });

      await expect(softDeleteEntryAction('Wohnungen', WOHNUNG_A)).rejects.toThrow(KAUTION_FEHLER);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('löscht die Wohnung ohne Mieter direkt', async () => {
      const { rpcCalls } = createFakeSupabase();

      await softDeleteEntryAction('Wohnungen', WOHNUNG_A);

      expect(rpcCalls).toEqual([{ table: 'Wohnungen', id: WOHNUNG_A }]);
    });

    it('bricht ab, wenn die Mieter nicht ermittelt werden können (kein stilles Überspringen)', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries: { Mieter: { data: null, error: { message: 'technischer Fehler' } } },
      });

      await expect(softDeleteEntryAction('Wohnungen', WOHNUNG_A)).rejects.toThrow('konnten nicht ermittelt werden');
      expect(rpcCalls).toEqual([]);
    });
  });

  describe('Haus -> Wohnungen -> Mieter', () => {
    const queries: Record<string, QueryResult> = {
      Wohnungen: { data: [{ id: WOHNUNG_A }, { id: WOHNUNG_B }], error: null },
      Mieter: { data: [{ id: MIETER_A }], error: null },
    };

    it('löscht Mieter, dann Wohnungen, zuletzt das Haus', async () => {
      const { rpcCalls } = createFakeSupabase({ queries });

      await softDeleteEntryAction('Haeuser', HAUS_ID);

      expect(rpcCalls).toEqual([
        { table: 'Mieter', id: MIETER_A },
        { table: 'Wohnungen', id: WOHNUNG_A },
        { table: 'Wohnungen', id: WOHNUNG_B },
        { table: 'Haeuser', id: HAUS_ID },
      ]);
    });

    it('löscht weder Wohnungen noch Haus, wenn ein Mieter nicht gelöscht werden kann', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries,
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE },
      });

      await expect(softDeleteEntryAction('Haeuser', HAUS_ID)).rejects.toThrow(KAUTION_FEHLER);

      expect(rpcCalls).toEqual([{ table: 'Mieter', id: MIETER_A }]);
    });

    it('löscht das Haus nicht, wenn eine Wohnung nicht gelöscht werden kann', async () => {
      const { rpcCalls } = createFakeSupabase({
        queries,
        rpcErrors: { [`Wohnungen:${WOHNUNG_B}`]: 'Zugriff verweigert.' },
      });

      await expect(softDeleteEntryAction('Haeuser', HAUS_ID)).rejects.toThrow('Das Haus wurde nicht gelöscht.');

      expect(rpcCalls.some((c) => c.table === 'Haeuser')).toBe(false);
    });

    it('löscht ein Haus ohne Wohnungen direkt', async () => {
      const { rpcCalls } = createFakeSupabase({ queries: { Wohnungen: { data: [], error: null } } });

      await softDeleteEntryAction('Haeuser', HAUS_ID);

      expect(rpcCalls).toEqual([{ table: 'Haeuser', id: HAUS_ID }]);
    });
  });

  describe('Datensatz ohne Kaskade', () => {
    it('ruft nur soft_delete_record für den Datensatz selbst auf', async () => {
      const { rpcCalls, from } = createFakeSupabase();

      await softDeleteEntryAction('Finanzen', 'finanz-1');

      expect(rpcCalls).toEqual([{ table: 'Finanzen', id: 'finanz-1' }]);
      expect(from).not.toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('wirft die (deutsche) Meldung der Datenbank, wenn die Löschung des Datensatzes selbst scheitert', async () => {
      createFakeSupabase({ rpcErrors: { 'Mieter:mieter-x': KAUTION_SPERRE } });

      await expect(softDeleteEntryAction('Mieter', 'mieter-x')).rejects.toThrow(KAUTION_FEHLER);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  // Die Datenbank liefert die Löschsperre als "<CODE>: <deutsche Meldung>" (KAUT_GESPERRT, SQLSTATE KA009). Die Tests
  // oben nutzen genau diese Rohmeldung; hier steht, was die Nutzer davon sehen dürfen: nur den deutschen Text.
  describe('Meldung der Löschsperre ohne technisches Präfix', () => {
    async function fange(aufruf: () => Promise<void>): Promise<Error & { code?: string }> {
      const ergebnis = await aufruf().then(() => null, (e: unknown) => e);
      expect(ergebnis).toBeInstanceOf(Error);
      return ergebnis as Error & { code?: string };
    }

    it('entfernt das Präfix in der Kaskade Wohnung -> Mieter und behält Text und Hinweis', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE },
      });

      const error = await fange(() => softDeleteEntryAction('Wohnungen', WOHNUNG_A));

      expect(error.message).not.toContain(PRAEFIX);
      expect(error.message).toBe(`${KAUTION_FEHLER} Die Wohnung wurde nicht gelöscht.`);
    });

    it('entfernt das Präfix in der Kaskade Haus -> Wohnungen -> Mieter', async () => {
      createFakeSupabase({
        queries: {
          Wohnungen: { data: [{ id: WOHNUNG_A }], error: null },
          Mieter: { data: [{ id: MIETER_A }], error: null },
        },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE },
      });

      const error = await fange(() => softDeleteEntryAction('Haeuser', HAUS_ID));

      expect(error.message).not.toContain(PRAEFIX);
      expect(error.message).toBe(`${KAUTION_FEHLER} Das Haus wurde nicht gelöscht.`);
    });

    it('entfernt das Präfix, wenn die Löschung des Datensatzes selbst abgelehnt wird (Mieter direkt)', async () => {
      createFakeSupabase({ rpcErrors: { 'Mieter:mieter-x': KAUTION_SPERRE } });

      const error = await fange(() => softDeleteEntryAction('Mieter', 'mieter-x'));

      expect(error.message).toBe(KAUTION_FEHLER);
    });

    it('fasst mehrere abgelehnte Mieter mit gleichem Grund zu einer Meldung ohne Präfix zusammen', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }, { id: MIETER_B }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE, [`Mieter:${MIETER_B}`]: KAUTION_SPERRE },
      });

      const error = await fange(() => softDeleteEntryAction('Wohnungen', WOHNUNG_A));

      expect(error.message).toBe(`${KAUTION_FEHLER} Die Wohnung wurde nicht gelöscht.`);
    });

    it('bereinigt jede Meldung einzeln, wenn die Gründe verschieden sind', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }, { id: MIETER_B }], error: null } },
        rpcErrors: {
          [`Mieter:${MIETER_A}`]: KAUTION_SPERRE,
          [`Mieter:${MIETER_B}`]: { message: 'ANDERE_SPERRE: Der Mieter hat einen offenen Beleg.', code: 'KA009' },
        },
      });

      const error = await fange(() => softDeleteEntryAction('Wohnungen', WOHNUNG_A));

      expect(error.message).not.toMatch(/[A-Z]{2,}_[A-Z]+:/);
      expect(error.message).toContain(KAUTION_FEHLER);
      expect(error.message).toContain('Der Mieter hat einen offenen Beleg.');
    });

    it('behält den SQLSTATE KA009 der Löschsperre am Fehler (die Routen antworten dann mit 409)', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: KAUTION_SPERRE, 'Mieter:mieter-x': KAUTION_SPERRE },
      });

      expect((await fange(() => softDeleteEntryAction('Wohnungen', WOHNUNG_A))).code).toBe('KA009');
      expect((await fange(() => softDeleteEntryAction('Mieter', 'mieter-x'))).code).toBe('KA009');
    });

    it('setzt bei einem technischen Fehler keinen Löschsperren-Code', async () => {
      createFakeSupabase({
        queries: { Mieter: { data: [{ id: MIETER_A }], error: null } },
        rpcErrors: { [`Mieter:${MIETER_A}`]: { message: 'connection reset', code: '08006' } },
      });

      const error = await fange(() => softDeleteEntryAction('Wohnungen', WOHNUNG_A));

      expect(error.code).toBeUndefined();
      expect(error.message).toContain('connection reset');
    });
  });
});

describe('softDeleteEntryAction mit bestätigter Auswirkung (soft_delete_mit_kautionen)', () => {
  const PRUEFSUMME = '0123456789abcdef0123456789abcdef';
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function mockClient(rpcResult: { error: RpcError | null }) {
    const rpc = jest.fn().mockResolvedValue(rpcResult);
    const from = jest.fn();
    mockCreateClient.mockResolvedValue({ from, rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
    return { rpc, from };
  }

  it.each(['Haeuser', 'Wohnungen', 'Mieter'])('%s: ruft die Datenbankfunktion mit der Prüfsumme auf, ohne App-Kaskade', async (tabelle) => {
    const { rpc, from } = mockClient({ error: null });

    await softDeleteEntryAction(tabelle, HAUS_ID, { pruefsumme: PRUEFSUMME });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('soft_delete_mit_kautionen', {
      p_table_name: tabelle,
      p_record_id: HAUS_ID,
      p_pruefsumme: PRUEFSUMME,
    });
    // Die Kaskade läuft atomar in der Datenbank: keine Abfrage der Kinder, keine Einzel-Löschungen.
    expect(from).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('reicht die Meldung der Datenbank ohne Präfix mit dem Code KA016 weiter (veraltete Prüfsumme) und revalidiert nicht', async () => {
    mockClient({
      error: { code: 'KA016', message: 'KAUT_BESTAETIGUNG: Die Auswirkung hat sich inzwischen geändert. Bitte erneut bestätigen.' },
    });

    const fehler = await softDeleteEntryAction('Haeuser', HAUS_ID, { pruefsumme: PRUEFSUMME }).catch((error: unknown) => error);

    expect(fehler).toBeInstanceOf(Error);
    expect((fehler as Error).message).toBe('Die Auswirkung hat sich inzwischen geändert. Bitte erneut bestätigen.');
    expect((fehler as Error & { code?: string }).code).toBe('KA016');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ['ohne Prüfsumme (undefined)', { pruefsumme: undefined }],
    ['ohne Prüfsumme (null)', { pruefsumme: null }],
    ['mit leerer Prüfsumme', { pruefsumme: '' }],
    ['ohne Optionen', undefined],
  ])('%s: bleibt beim Standardweg soft_delete_record (Löschsperre KA009 bleibt wirksam)', async (_name, options) => {
    const { rpc, rpcCalls } = createFakeSupabase();

    await softDeleteEntryAction('Mieter', MIETER_A, options);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpcCalls).toEqual([{ table: 'Mieter', id: MIETER_A }]);
  });

  it('ignoriert die Prüfsumme für andere Tabellen', async () => {
    const { rpc, rpcCalls } = createFakeSupabase();

    await softDeleteEntryAction('Finanzen', 'finanz-1', { pruefsumme: PRUEFSUMME });

    expect(rpcCalls).toEqual([{ table: 'Finanzen', id: 'finanz-1' }]);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe('revalidatePathsForTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revalidiert für Kautionen die Mieterseite und das Dashboard', () => {
    revalidatePathsForTable('Kautionen');

    expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });
});
