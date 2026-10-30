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
const WOHNUNG_ID = 'wohnung-1';
const MIETER_ID = 'mieter-1';
const SPERRE_TEXT =
  'Das Haus kann nicht gelöscht werden, solange Mieter mit einer Kaution mit Buchungen zugeordnet sind.';
/** So kommt die Meldung der Datenbank über PostgREST an (`<CODE>: <deutsche Meldung>`). */
const SPERRE_ROH = { message: `KAUT_GESPERRT: ${SPERRE_TEXT}`, code: 'KA009' };

type RpcError = { message: string; code?: string };

/** Minimaler Supabase-Client: protokolliert die RPC-Aufrufe, `from` darf nie benutzt werden (keine App-Kaskade mehr). */
function mockClient(rpcResult: { error: RpcError | null } = { error: null }) {
  const rpc = jest.fn().mockResolvedValue(rpcResult);
  const from = jest.fn();
  mockCreateClient.mockResolvedValue({ from, rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  return { rpc, from };
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

  describe('Haus und Wohnung: die eine atomare Kaskade der Datenbank', () => {
    it.each([
      ['Haeuser', HAUS_ID],
      ['Wohnungen', WOHNUNG_ID],
    ])('%s: genau ein Aufruf von soft_delete_mit_kautionen, ohne App-Kaskade', async (tabelle, id) => {
      const { rpc, from } = mockClient();

      await softDeleteEntryAction(tabelle, id);

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('soft_delete_mit_kautionen', { p_table_name: tabelle, p_record_id: id });
      // Keine Abfrage der Kinder und keine Einzel-Löschungen: Mieter, Wohnungen und Kautionen löscht die Datenbank atomar.
      expect(from).not.toHaveBeenCalled();
    });

    it('revalidiert nach dem Löschen eines Hauses Häuser, Wohnungen, Mieter und das Dashboard', async () => {
      mockClient();

      await softDeleteEntryAction('Haeuser', HAUS_ID);

      for (const pfad of ['/haeuser', '/wohnungen', '/mieter', '/dashboard']) {
        expect(mockRevalidatePath).toHaveBeenCalledWith(pfad);
      }
    });

    it('revalidiert nach dem Löschen einer Wohnung Wohnungen, Mieter und das Dashboard', async () => {
      mockClient();

      await softDeleteEntryAction('Wohnungen', WOHNUNG_ID);

      for (const pfad of ['/wohnungen', '/mieter', '/dashboard']) {
        expect(mockRevalidatePath).toHaveBeenCalledWith(pfad);
      }
    });

    it('wirft die Meldung der Löschsperre ohne technisches Präfix und mit dem Code KA009, ohne zu revalidieren', async () => {
      mockClient({ error: SPERRE_ROH });

      const fehler = await softDeleteEntryAction('Haeuser', HAUS_ID).catch((error: unknown) => error);

      expect(fehler).toBeInstanceOf(Error);
      expect((fehler as Error).message).toBe(SPERRE_TEXT);
      expect((fehler as Error).message).not.toContain('KAUT_GESPERRT');
      expect((fehler as Error & { code?: string }).code).toBe('KA009');
      // Nichts wurde gelöscht (eine Transaktion): keine Revalidierung nötig.
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it.each(['PGRST202', '42883'])('meldet eine fehlende Datenbankfunktion (%s) klar und auf Deutsch', async (code) => {
      mockClient({ error: { code, message: 'Could not find the function public.soft_delete_mit_kautionen in the schema cache' } });

      const fehler = await softDeleteEntryAction('Haeuser', HAUS_ID).catch((error: unknown) => error);

      expect((fehler as Error).message).toContain('Datenbankfunktion ist noch nicht eingespielt');
      expect((fehler as Error).message).not.toContain('schema cache');
      expect((fehler as Error & { code?: string }).code).toBe(code);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('setzt bei einem technischen Fehler keinen Löschsperren-Code', async () => {
      mockClient({ error: { message: 'connection reset' } });

      const fehler = await softDeleteEntryAction('Wohnungen', WOHNUNG_ID).catch((error: unknown) => error);

      expect((fehler as Error).message).toBe('connection reset');
      expect((fehler as Error & { code?: string }).code).toBeUndefined();
    });
  });

  describe('Mieter', () => {
    it('immer soft_delete_record (Löschsperre bei gebuchter Kaution bleibt wirksam) und revalidiert /mieter', async () => {
      const { rpc, from } = mockClient();

      await softDeleteEntryAction('Mieter', MIETER_ID);

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: MIETER_ID });
      expect(from).not.toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('entfernt das Präfix der Löschsperre und behält den SQLSTATE KA009 (die Routen antworten dann mit 409)', async () => {
      mockClient({ error: { message: 'KAUT_GESPERRT: Der Mieter hat eine Kaution mit Buchungen.', code: 'KA009' } });

      const fehler = await softDeleteEntryAction('Mieter', MIETER_ID).catch((error: unknown) => error);

      expect((fehler as Error).message).toBe('Der Mieter hat eine Kaution mit Buchungen.');
      expect((fehler as Error & { code?: string }).code).toBe('KA009');
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('Datensatz ohne Kaskade', () => {
    it('ruft nur soft_delete_record für den Datensatz selbst auf', async () => {
      const { rpc, from } = mockClient();

      await softDeleteEntryAction('Finanzen', 'finanz-1');

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Finanzen', p_record_id: 'finanz-1' });
      expect(from).not.toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('wirft die (deutsche) Meldung der Datenbank, wenn die Löschung scheitert', async () => {
      mockClient({ error: { message: 'Permission denied: loeschen not allowed for module finanzen' } });

      await expect(softDeleteEntryAction('Finanzen', 'finanz-1')).rejects.toThrow('Permission denied: loeschen not allowed for module finanzen');
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
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

  it.each([
    ['Haeuser', ['/haeuser', '/wohnungen', '/mieter', '/betriebskosten']],
    ['Wohnungen', ['/wohnungen', '/mieter']],
    ['Mieter', ['/mieter', '/wohnungen']],
    ['Kautionen', ['/mieter']],
    ['Finanzen', ['/finanzen']],
    ['Aufgaben', ['/todos']],
    ['Zaehler', ['/wohnungen', '/betriebskosten']],
    ['Zaehler_Ablesungen', ['/wohnungen', '/betriebskosten']],
    ['Nebenkosten', ['/betriebskosten']],
    ['Rechnungen', ['/finanzen', '/betriebskosten']],
  ])('%s: revalidiert die Seiten in fester Reihenfolge, danach das Dashboard', (tabelle, pfade) => {
    revalidatePathsForTable(tabelle);

    expect(mockRevalidatePath.mock.calls).toEqual([...pfade, '/dashboard'].map((pfad) => [pfad]));
  });

  it('Dokumente_Metadaten: revalidiert auch die Unterordner-Seiten der Catch-all-Route', () => {
    revalidatePathsForTable('Dokumente_Metadaten');

    expect(mockRevalidatePath.mock.calls).toEqual([
      ['/dateien'],
      ['/dateien/[...slug]', 'page'],
      ['/dashboard'],
    ]);
  });

  it.each(['Unbekannt', 'constructor', '__proto__'])('%s: revalidiert nur das Dashboard', (tabelle) => {
    revalidatePathsForTable(tabelle);

    expect(mockRevalidatePath.mock.calls).toEqual([['/dashboard']]);
  });
});
