/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/wohnungen: Wohnungsnamen (und die eingebetteten Mieterdaten) nur mit wohnungen:ansehen.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string } | null };

/** Verkettbarer Query-Builder; `then` liefert das Ergebnis (wie PostgREST). */
function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

describe('GET /api/wohnungen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkPermission as jest.Mock).mockResolvedValue('allowed');
  });

  it('liefert mit wohnungen:ansehen die Wohnungen', async () => {
    const wohnungen = createBuilder({ data: [{ id: 'a1', name: 'Wohnung 1', haus_id: 'h1' }], error: null });
    const mieter = createBuilder({ data: [], error: null });
    const from = jest.fn((table: string) => (table === 'Wohnungen' ? wohnungen : mieter));
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('wohnungen', 'ansehen');
    expect(await res.json()).toEqual([expect.objectContaining({ id: 'a1', name: 'Wohnung 1', status: 'frei' })]);
  });

  it('antwortet ohne wohnungen:ansehen mit 403 und fragt weder Wohnungen noch Mieter ab', async () => {
    (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'wohnungen' ? 'denied' : 'allowed'));
    const from = jest.fn();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET();

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(from).not.toHaveBeenCalled();
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED statt 403, wenn die Rechtepruefung selbst fehlschlaegt, und fragt nichts ab', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    (checkPermission as jest.Mock).mockResolvedValue('error');
    const from = jest.fn();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
  });

  it('faengt eine unerwartete Ausnahme ab (500 statt unbehandelter Fehler)', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    (createSupabaseServerClient as jest.Mock).mockRejectedValue(new Error('Verbindung zu 10.0.0.5 abgebrochen'));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Serverfehler bei Wohnungs-Abfrage.' });
  });

  it('nutzt requireApiPermission: 500 statt 403, wenn die Rechtepruefung selbst eine Ausnahme wirft', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    (checkPermission as jest.Mock).mockRejectedValue(new Error('boom'));

    const res = await GET();

    expect(res.status).toBe(500);
  });

  describe('Mieterdaten nur mit mieter:ansehen', () => {
    const wohnungenRows = [
      { id: 'a1', name: 'Wohnung 1', haus_id: 'h1' },
      { id: 'a2', name: 'Wohnung 2', haus_id: 'h1' },
    ];
    // a1: aktueller Mieter (kein Auszug), a2: Mieter ist ausgezogen (Auszug in der Vergangenheit) -> frei
    const mieterRows = [
      { id: 'm1', wohnung_id: 'a1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null },
      { id: 'm2', wohnung_id: 'a2', name: 'Max Muster', einzug: '2015-01-01', auszug: '2016-01-01' },
    ];

    /** Der Mieter-Builder liefert nur die Spalten, die tatsaechlich selektiert wurden (wie PostgREST). */
    function setup() {
      const wohnungen = createBuilder({ data: wohnungenRows, error: null });
      const mieter = createBuilder({ data: [], error: null });
      mieter.select.mockImplementation((columns: string) => {
        const wanted = columns.split(',').map(c => c.trim());
        const rows = mieterRows.map(row =>
          Object.fromEntries(Object.entries(row).filter(([key]) => wanted.includes(key)))
        );
        (mieter as unknown as { then: unknown }).then = (resolve: (v: Result) => unknown) =>
          Promise.resolve({ data: rows, error: null } as Result).then(resolve);
        return mieter;
      });
      const from = jest.fn((table: string) => (table === 'Wohnungen' ? wohnungen : mieter));
      (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
      return { mieter, from };
    }

    function mockRights(mieterAnsehen: 'allowed' | 'denied' | 'error', wohnungenAnsehen: 'allowed' | 'denied' | 'error' = 'allowed') {
      (checkPermission as jest.Mock).mockImplementation(async (modul: string, aktion: string) => {
        if (modul === 'wohnungen' && aktion === 'ansehen') return wohnungenAnsehen;
        if (modul === 'mieter' && aktion === 'ansehen') return mieterAnsehen;
        return 'denied';
      });
    }

    it('liefert mit mieter:ansehen den Mieter (id, name, einzug, auszug) wie bisher', async () => {
      mockRights('allowed');
      const { mieter } = setup();

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mieter.select).toHaveBeenCalledWith('id, wohnung_id, auszug, einzug, name');
      expect(body[0]).toEqual(expect.objectContaining({
        id: 'a1',
        status: 'vermietet',
        tenant: { id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null },
      }));
      expect(body[1]).toEqual(expect.objectContaining({ id: 'a2', status: 'frei' }));
      expect(body[1].tenant).toEqual(expect.objectContaining({ name: 'Max Muster' }));
      expect(body.every((apt: Record<string, unknown>) => !('tenantAccess' in apt))).toBe(true);
    });

    it('liefert ohne mieter:ansehen keinen Mieter (weder geladen noch ausgeliefert), aber den korrekten Status', async () => {
      mockRights('denied');
      const { mieter } = setup();

      const res = await GET();
      const body = await res.json();
      const text = JSON.stringify(body);

      expect(res.status).toBe(200);
      // serverseitig gar nicht erst selektiert: keine id, kein Name
      expect(mieter.select).toHaveBeenCalledWith('wohnung_id, auszug, einzug');
      expect(body).toEqual([
        expect.objectContaining({ id: 'a1', status: 'vermietet', tenantAccess: false }),
        expect.objectContaining({ id: 'a2', status: 'frei', tenantAccess: false }),
      ]);
      for (const apt of body) {
        expect(apt).not.toHaveProperty('tenant');
      }
      expect(text).not.toContain('Erika Beispiel');
      expect(text).not.toContain('Max Muster');
      expect(text).not.toContain('m1');
      expect(text).not.toContain('2020-01-01');
    });

    it('fragt wohnungen:ansehen und mieter:ansehen ab', async () => {
      mockRights('allowed');
      setup();

      await GET();

      expect(checkPermission).toHaveBeenCalledWith('wohnungen', 'ansehen');
      expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    });

    /** mieter:ansehen answers the given results one after the other (first check, then the retry); the last one repeats. */
    function mockMieterSequence(...results: Array<'allowed' | 'denied' | 'error'>) {
      let call = 0;
      (checkPermission as jest.Mock).mockImplementation(async (modul: string, aktion: string) => {
        if (modul === 'wohnungen' && aktion === 'ansehen') return 'allowed';
        if (modul === 'mieter' && aktion === 'ansehen') return results[Math.min(call++, results.length - 1)];
        return 'denied';
      });
      return () => call;
    }

    const mieterChecks = () =>
      (checkPermission as jest.Mock).mock.calls.filter(([modul, aktion]) => modul === 'mieter' && aktion === 'ansehen');

    it('wiederholt eine fehlgeschlagene mieter:ansehen-Pruefung einmal; klappt der Retry, kommen die Mieter wie bisher', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockMieterSequence('error', 'allowed');
      const { mieter } = setup();

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mieterChecks()).toHaveLength(2);
      expect(mieter.select).toHaveBeenCalledWith('id, wohnung_id, auszug, einzug, name');
      expect(body[0].tenant).toEqual({ id: 'm1', name: 'Erika Beispiel', einzug: '2020-01-01', auszug: null });
      for (const apt of body) {
        expect(apt).not.toHaveProperty('tenantAccess');
        expect(apt).not.toHaveProperty('permissionCheckFailed');
      }
    });

    it('Retry schlaegt ebenfalls fehl: 200 mit den Wohnungen, aber ohne Mieter (fail-closed) und mit permissionCheckFailed', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockMieterSequence('error');
      const { mieter } = setup();

      const res = await GET();
      const body = await res.json();
      const text = JSON.stringify(body);

      expect(res.status).toBe(200);
      expect(mieterChecks()).toHaveLength(2); // genau ein Retry, keine Schleife
      // wie bei fehlendem Recht: nur Daten fuer den Status gelesen, nichts Personenbezogenes
      expect(mieter.select).toHaveBeenCalledWith('wohnung_id, auszug, einzug');
      expect(mieter.select).not.toHaveBeenCalledWith(expect.stringContaining('name'));
      expect(body).toEqual([
        expect.objectContaining({ id: 'a1', status: 'vermietet', tenantAccess: false, permissionCheckFailed: true }),
        expect.objectContaining({ id: 'a2', status: 'frei', tenantAccess: false, permissionCheckFailed: true }),
      ]);
      for (const apt of body) {
        expect(apt).not.toHaveProperty('tenant');
      }
      for (const forbidden of ['Erika Beispiel', 'Max Muster', 'm1', '2020-01-01']) {
        expect(text).not.toContain(forbidden);
      }
    });

    it('echtes denied: kein Retry und kein permissionCheckFailed-Signal', async () => {
      mockMieterSequence('denied');
      setup();

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(mieterChecks()).toHaveLength(1);
      for (const apt of body) {
        expect(apt.tenantAccess).toBe(false);
        expect(apt).not.toHaveProperty('permissionCheckFailed');
      }
    });

    it('error, dann denied: das Recht fehlt, also ohne permissionCheckFailed-Signal', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockMieterSequence('error', 'denied');
      setup();

      const body = await (await GET()).json();

      expect(mieterChecks()).toHaveLength(2);
      for (const apt of body) {
        expect(apt.tenantAccess).toBe(false);
        expect(apt).not.toHaveProperty('permissionCheckFailed');
        expect(apt).not.toHaveProperty('tenant');
      }
    });

    it('wohnungen:ansehen bleibt Voraussetzung: fehlt es, 403 ohne Datenabruf, auch wenn mieter:ansehen gewaehrt ist', async () => {
      mockRights('allowed', 'denied');
      const { from } = setup();

      const res = await GET();

      expect(res.status).toBe(403);
      expect(from).not.toHaveBeenCalled();
    });

    it('wohnungen:ansehen-Pruefung faellt aus: weiter 503 PERMISSION_CHECK_FAILED, kein Datenabruf (kein Retry dort)', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockRights('allowed', 'error');
      const { from } = setup();

      const res = await GET();

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
      expect(from).not.toHaveBeenCalled();
      expect((checkPermission as jest.Mock).mock.calls.filter(([m, a]) => m === 'wohnungen' && a === 'ansehen')).toHaveLength(1);
    });

    it('fehlendes wohnungen:ansehen (403) hat Vorrang vor einem fehlgeschlagenen mieter:ansehen-Check', async () => {
      mockRights('error', 'denied');
      const { from } = setup();

      const res = await GET();

      expect(res.status).toBe(403);
      expect(from).not.toHaveBeenCalled();
    });
  });
});
